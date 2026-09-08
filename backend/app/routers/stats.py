from __future__ import annotations

import uuid
from datetime import date
from decimal import Decimal

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, select

from ..deps import CurrentUser, DbSession
from ..models import Account, Category, Transaction, TransactionKind
from ..schemas import CategoryTotal, DashboardResponse, MonthlyPoint, Summary
from ..services.fx import FxServiceError, convert, get_rate

router = APIRouter(prefix="/api/stats", tags=["stats"])


async def _rate_map(db, base: str, currencies: set[str]) -> dict[str, Decimal]:
    """Resolve every distinct currency once, so the dashboard never issues
    one external call per row."""
    rates: dict[str, Decimal] = {base: Decimal(1)}
    for currency in currencies - {base}:
        try:
            rate, _ = await get_rate(db, currency, base)
        except FxServiceError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)
            ) from exc
        rates[currency] = rate
    return rates


def _sum_in_base(pairs: list[tuple[str, Decimal]], rates: dict[str, Decimal]) -> Decimal:
    return sum((convert(total, rates[currency]) for currency, total in pairs), Decimal(0))


def _month_sequence(months: int) -> list[str]:
    year, month = date.today().year, date.today().month
    sequence: list[str] = []
    for _ in range(months):
        sequence.append(f"{year:04d}-{month:02d}")
        month -= 1
        if month == 0:
            year, month = year - 1, 12
    return list(reversed(sequence))


@router.get("/dashboard", response_model=DashboardResponse)
async def dashboard(
    user: CurrentUser,
    db: DbSession,
    months: int = Query(default=6, ge=1, le=24),
    date_from: date | None = None,
    date_to: date | None = None,
) -> DashboardResponse:
    base = user.base_currency
    filters = [Transaction.user_id == user.id]
    if date_from:
        filters.append(Transaction.occurred_on >= date_from)
    if date_to:
        filters.append(Transaction.occurred_on <= date_to)

    kind_rows = db.execute(
        select(Transaction.currency, Transaction.kind, func.sum(Transaction.amount))
        .where(*filters)
        .group_by(Transaction.currency, Transaction.kind)
    ).all()

    account_rows = db.execute(
        select(Account.currency, func.sum(Account.opening_balance))
        .where(Account.user_id == user.id)
        .group_by(Account.currency)
    ).all()

    category_rows = db.execute(
        select(
            Category.id,
            Category.name,
            Category.color,
            Transaction.currency,
            func.sum(Transaction.amount),
        )
        .join(Transaction, Transaction.category_id == Category.id)
        .where(*filters, Transaction.kind == TransactionKind.expense)
        .group_by(Category.id, Category.name, Category.color, Transaction.currency)
    ).all()

    month_label = func.to_char(func.date_trunc("month", Transaction.occurred_on), "YYYY-MM")
    month_rows = db.execute(
        select(
            month_label,
            Transaction.kind,
            Transaction.currency,
            func.sum(Transaction.amount),
        )
        .where(*filters)
        .group_by(month_label, Transaction.kind, Transaction.currency)
    ).all()

    currencies = {
        code
        for rows, index in (
            (kind_rows, 0),
            (account_rows, 0),
            (category_rows, 3),
            (month_rows, 2),
        )
        for code in (row[index] for row in rows)
        if code
    }
    rates = await _rate_map(db, base, currencies)

    income = _sum_in_base(
        [(c, Decimal(t)) for c, k, t in kind_rows if k == TransactionKind.income], rates
    )
    expense = _sum_in_base(
        [(c, Decimal(t)) for c, k, t in kind_rows if k == TransactionKind.expense], rates
    )
    opening = _sum_in_base([(c, Decimal(t)) for c, t in account_rows], rates)

    per_category: dict[uuid.UUID, CategoryTotal] = {}
    for category_id, name, color, currency, total in category_rows:
        entry = per_category.setdefault(
            category_id,
            CategoryTotal(
                category_id=category_id,
                category_name=name,
                color=color,
                total=Decimal(0),
            ),
        )
        entry.total += convert(Decimal(total), rates[currency])
    by_category = sorted(per_category.values(), key=lambda item: item.total, reverse=True)

    monthly: dict[str, dict[str, Decimal]] = {}
    for month, kind, currency, total in month_rows:
        slot = monthly.setdefault(month, {"income": Decimal(0), "expense": Decimal(0)})
        key = "income" if kind == TransactionKind.income else "expense"
        slot[key] += convert(Decimal(total), rates[currency])

    zero = {"income": Decimal(0), "expense": Decimal(0)}
    by_month = [
        MonthlyPoint(month=month, **monthly.get(month, zero))
        for month in _month_sequence(months)
    ]

    transaction_count = db.scalar(
        select(func.count()).select_from(Transaction).where(*filters)
    ) or 0

    return DashboardResponse(
        summary=Summary(
            base_currency=base,
            income=income,
            expense=expense,
            net=income - expense,
            balance=opening + income - expense,
            transaction_count=transaction_count,
        ),
        by_category=by_category,
        by_month=by_month,
    )
