from __future__ import annotations

from datetime import date
from decimal import Decimal

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import get_settings
from ..models import FxRate

settings = get_settings()

SUPPORTED_CURRENCIES: set[str] = set()


class FxServiceError(RuntimeError):
    pass


async def fetch_supported_currencies(client: httpx.AsyncClient) -> set[str]:
    global SUPPORTED_CURRENCIES
    if SUPPORTED_CURRENCIES:
        return SUPPORTED_CURRENCIES
    response = await client.get(f"{settings.frankfurter_base_url}/currencies")
    response.raise_for_status()
    SUPPORTED_CURRENCIES = set(response.json().keys())
    return SUPPORTED_CURRENCIES


def _normalize_pair(base: str, quote: str) -> tuple[str, str]:
    return base.upper(), quote.upper()


async def get_rate(db: Session, base: str, quote: str, on: date | None = None) -> tuple[Decimal, date]:
    """Return (rate, observed_on) for one unit of `base` expressed in `quote`.

    Reads through to the Frankfurter API on a cache miss and persists the
    result, so the same reference date is only fetched once.
    """
    base, quote = _normalize_pair(base, quote)
    if base == quote:
        return Decimal(1), on or date.today()

    if on is None:
        cached = db.scalar(
            select(FxRate)
            .where(FxRate.base == base, FxRate.quote == quote)
            .order_by(FxRate.observed_on.desc())
            .limit(1)
        )
        if cached is not None:
            return cached.rate, cached.observed_on

    async with httpx.AsyncClient(timeout=settings.fx_request_timeout) as client:
        await _ensure_supported(client, base, quote)
        observed_on = await _fetch_and_store(db, client, base, quote, on)

    stored = db.scalar(
        select(FxRate).where(
            FxRate.base == base, FxRate.quote == quote, FxRate.observed_on == observed_on
        )
    )
    if stored is None:
        raise FxServiceError(f"No rate available for {base}/{quote}")
    return stored.rate, stored.observed_on


async def _ensure_supported(client: httpx.AsyncClient, *codes: str) -> None:
    supported = await fetch_supported_currencies(client)
    unknown = [code for code in codes if code not in supported]
    if unknown:
        raise FxServiceError(
            "Divisa no soportada por Frankfurter: " + ", ".join(sorted(set(unknown)))
        )


async def _fetch_and_store(
    db: Session,
    client: httpx.AsyncClient,
    base: str,
    quote: str,
    on: date | None,
) -> date:
    url = (
        f"{settings.frankfurter_base_url}/{on.isoformat()}"
        if on
        else f"{settings.frankfurter_base_url}/latest"
    )
    try:
        response = await client.get(url, params={"base": base, "symbols": quote})
        response.raise_for_status()
        payload = response.json()
    except (httpx.HTTPError, ValueError) as exc:
        raise FxServiceError("No se pudo consultar la API de divisas") from exc

    rate_value = payload.get("rates", {}).get(quote)
    if rate_value is None:
        raise FxServiceError(f"La API no devolvió tasa para {base}/{quote}")

    observed_on = date.fromisoformat(payload["date"])
    rate = Decimal(str(rate_value))

    existing = db.scalar(
        select(FxRate).where(
            FxRate.base == base, FxRate.quote == quote, FxRate.observed_on == observed_on
        )
    )
    if existing is None:
        db.add(
            FxRate(base=base, quote=quote, rate=rate, observed_on=observed_on)
        )
    else:
        existing.rate = rate
    db.commit()
    return observed_on


def convert(amount: Decimal, rate: Decimal) -> Decimal:
    return (amount * rate).quantize(Decimal("0.01"))
