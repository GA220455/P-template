from __future__ import annotations

import uuid
from decimal import Decimal

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from ..deps import CurrentUserId, DbSession
from ..models import Account, Transaction, TransactionKind
from ..schemas import AccountCreate, AccountOut, AccountUpdate, AccountWithBalance

router = APIRouter(prefix="/api/accounts", tags=["accounts"])


def _get_owned(db: Session, user_id: uuid.UUID, account_id: uuid.UUID) -> Account:
    account = db.scalar(
        select(Account).where(Account.id == account_id, Account.user_id == user_id)
    )
    if account is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Cuenta no encontrada"
        )
    return account


def _balances(db: Session, account_ids: list[uuid.UUID]) -> dict[uuid.UUID, tuple[Decimal, Decimal]]:
    if not account_ids:
        return {}
    income_sum = func.coalesce(
        func.sum(
            case((Transaction.kind == TransactionKind.income, Transaction.amount), else_=0)
        ),
        0,
    )
    expense_sum = func.coalesce(
        func.sum(
            case((Transaction.kind == TransactionKind.expense, Transaction.amount), else_=0)
        ),
        0,
    )
    rows = db.execute(
        select(Transaction.account_id, income_sum, expense_sum)
        .where(Transaction.account_id.in_(account_ids))
        .group_by(Transaction.account_id)
    ).all()
    return {row[0]: (Decimal(row[1]), Decimal(row[2])) for row in rows}


@router.get("", response_model=list[AccountWithBalance])
def list_accounts(user_id: CurrentUserId, db: DbSession) -> list[AccountWithBalance]:
    accounts = list(
        db.scalars(select(Account).where(Account.user_id == user_id).order_by(Account.name))
    )
    totals = _balances(db, [a.id for a in accounts])
    zero = (Decimal(0), Decimal(0))
    result: list[AccountWithBalance] = []
    for account in accounts:
        income, expense = totals.get(account.id, zero)
        result.append(
            AccountWithBalance(
                id=account.id,
                name=account.name,
                type=account.type,
                currency=account.currency,
                opening_balance=account.opening_balance,
                income_total=income,
                expense_total=expense,
                current_balance=account.opening_balance + income - expense,
            )
        )
    return result


@router.post("", response_model=AccountOut, status_code=status.HTTP_201_CREATED)
def create_account(payload: AccountCreate, user_id: CurrentUserId, db: DbSession) -> Account:
    duplicate = db.scalar(
        select(Account).where(Account.user_id == user_id, Account.name == payload.name)
    )
    if duplicate is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Ya tienes una cuenta con ese nombre"
        )
    account = Account(
        user_id=user_id,
        name=payload.name.strip(),
        type=payload.type,
        currency=payload.currency.upper(),
        opening_balance=payload.opening_balance,
    )
    db.add(account)
    db.commit()
    db.refresh(account)
    return account


@router.get("/{account_id}", response_model=AccountWithBalance)
def get_account(account_id: uuid.UUID, user_id: CurrentUserId, db: DbSession) -> AccountWithBalance:
    account = _get_owned(db, user_id, account_id)
    income, expense = _balances(db, [account.id]).get(account.id, (Decimal(0), Decimal(0)))
    return AccountWithBalance(
        id=account.id,
        name=account.name,
        type=account.type,
        currency=account.currency,
        opening_balance=account.opening_balance,
        income_total=income,
        expense_total=expense,
        current_balance=account.opening_balance + income - expense,
    )


@router.patch("/{account_id}", response_model=AccountOut)
def update_account(
    account_id: uuid.UUID, payload: AccountUpdate, user_id: CurrentUserId, db: DbSession
) -> Account:
    account = _get_owned(db, user_id, account_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(account, field, value.upper() if field == "currency" else value)
    db.commit()
    db.refresh(account)
    return account


@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(account_id: uuid.UUID, user_id: CurrentUserId, db: DbSession) -> None:
    account = _get_owned(db, user_id, account_id)
    has_transactions = db.scalar(
        select(func.count())
        .select_from(Transaction)
        .where(Transaction.account_id == account.id)
    )
    if has_transactions:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No puedes borrar una cuenta con transacciones asociadas",
        )
    db.delete(account)
    db.commit()
