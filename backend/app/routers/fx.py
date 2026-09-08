from __future__ import annotations

from datetime import date

import httpx
from fastapi import APIRouter, HTTPException, Query, status

from ..config import get_settings
from ..deps import DbSession
from ..schemas import FxConvertRequest, FxConvertResponse, FxQuote
from ..services.fx import (
    FxServiceError,
    convert,
    fetch_supported_currencies,
    get_rate,
)

router = APIRouter(prefix="/api/fx", tags=["fx"])
settings = get_settings()


@router.get("/currencies", response_model=dict[str, str])
async def currencies() -> dict[str, str]:
    try:
        async with httpx.AsyncClient(timeout=settings.fx_request_timeout) as client:
            response = await client.get(f"{settings.frankfurter_base_url}/currencies")
            response.raise_for_status()
            return response.json()
    except (httpx.HTTPError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No se pudo obtener el listado de divisas",
        ) from exc


@router.get("/rates", response_model=list[FxQuote])
async def rates(
    db: DbSession,
    base: str = Query(description="Divisa de origen en formato ISO 4217, p.ej. EUR"),
    quotes: str = Query(description="Divisas destino separadas por comas, p.ej. USD,GBP,MXN"),
    on: date | None = Query(default=None, description="Fecha histórica; por defecto la última disponible"),
) -> list[FxQuote]:
    base_code = base.upper()
    symbols = {code.strip().upper() for code in quotes.split(",") if code.strip()}
    if not symbols:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Indica al menos una divisa destino"
        )

    quotes_out: list[FxQuote] = []
    for quote_code in sorted(symbols):
        try:
            rate, observed_on = await get_rate(db, base_code, quote_code, on)
        except FxServiceError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)
            ) from exc
        quotes_out.append(
            FxQuote(
                base=base_code,
                quote=quote_code,
                rate=rate,
                observed_on=observed_on,
                source="frankfurter.dev",
            )
        )
    return quotes_out


@router.post("/convert", response_model=FxConvertResponse)
async def convert_amount(payload: FxConvertRequest, db: DbSession) -> FxConvertResponse:
    try:
        rate, observed_on = await get_rate(db, payload.base, payload.quote)
    except FxServiceError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)
        ) from exc

    return FxConvertResponse(
        amount=payload.amount,
        converted=convert(payload.amount, rate),
        quote=FxQuote(
            base=payload.base.upper(),
            quote=payload.quote.upper(),
            rate=rate,
            observed_on=observed_on,
            source="frankfurter.dev",
        ),
    )
