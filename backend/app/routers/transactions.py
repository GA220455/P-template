from __future__ import annotations

import uuid
from datetime import date

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import Select, func, or_, select
from sqlalchemy.orm import Session

from ..deps import CurrentUserId, DbSession
from ..models import Account, Category, Transaction, TransactionKind
from ..schemas import (
    TransactionCreate,
    TransactionOut,
    TransactionPage,
    TransactionUpdate,
)

router = APIRouter(prefix="/api/transactions", tags=["transactions"])


def _rows_to_out(rows) -> list[TransactionOut]:
    return [
        TransactionOut(
            id=tx.id,
            account_id=tx.account_id,
            category_id=tx.category_id,
            kind=tx.kind,
            amount=tx.amount,
            currency=tx.currency,
            description=tx.description,
            occurred_on=tx.occurred_on,
            created_at=tx.created_at,
            category_name=category_name,
            category_color=category_color,
            account_name=account_name,
        )
        for tx, category_name, category_color, account_name in rows
    ]


def _base_select() -> Select:
    return (
        select(Transaction, Category.name, Category.color, Account.name)
        .join(Category, Category.id == Transaction.category_id)
        .join(Account, Account.id == Transaction.account_id)
    )


def _get_owned(db: Session, user_id: uuid.UUID, transaction_id: uuid.UUID) -> Transaction:
    transaction = db.scalar(
        select(Transaction).where(
            Transaction.id == transaction_id, Transaction.user_id == user_id
        )
    )
    if transaction is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Transacción no encontrada"
        )
    return transaction


def _resolve_account(db: Session, user_id: uuid.UUID, account_id: uuid.UUID) -> Account:
    account = db.scalar(
        select(Account).where(Account.id == account_id, Account.user_id == user_id)
    )
    if account is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La cuenta indicada no existe o no es tuya",
        )
    return account


def _resolve_category(db: Session, user_id: uuid.UUID, category_id: uuid.UUID) -> Category:
    category = db.scalar(
        select(Category).where(Category.id == category_id, Category.user_id == user_id)
    )
    if category is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La categoría indicada no existe o no es tuya",
        )
    return category


@router.get("", response_model=TransactionPage)
def list_transactions(
    user_id: CurrentUserId,
    db: DbSession,
    kind: TransactionKind | None = None,
    account_id: uuid.UUID | None = None,
    category_id: uuid.UUID | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    search: str | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> TransactionPage:
    conditions = [Transaction.user_id == user_id]
    if kind is not None:
        conditions.append(Transaction.kind == kind)
    if account_id is not None:
        conditions.append(Transaction.account_id == account_id)
    if category_id is not None:
        conditions.append(Transaction.category_id == category_id)
    if date_from is not None:
        conditions.append(Transaction.occurred_on >= date_from)
    if date_to is not None:
        conditions.append(Transaction.occurred_on <= date_to)
    if search:
        pattern = f"%{search.strip()}%"
        conditions.append(
            or_(Transaction.description.ilike(pattern), Category.name.ilike(pattern))
        )

    total = db.scalar(
        select(func.count())
        .select_from(Transaction)
        .join(Category, Category.id == Transaction.category_id)
        .where(*conditions)
    ) or 0

    rows = db.execute(
        _base_select()
        .where(*conditions)
        .order_by(Transaction.occurred_on.desc(), Transaction.created_at.desc())
        .limit(limit)
        .offset(offset)
    ).all()

    return TransactionPage(items=_rows_to_out(rows), total=total)


@router.post("", response_model=TransactionOut, status_code=status.HTTP_201_CREATED)
def create_transaction(
    payload: TransactionCreate, user_id: CurrentUserId, db: DbSession
) -> TransactionOut:
    account = _resolve_account(db, user_id, payload.account_id)
    category = _resolve_category(db, user_id, payload.category_id)

    transaction = Transaction(
        user_id=user_id,
        account_id=account.id,
        category_id=category.id,
        kind=category.kind,
        amount=payload.amount,
        currency=account.currency,
        description=payload.description,
        occurred_on=payload.occurred_on,
    )
    db.add(transaction)
    db.commit()

    row = db.execute(
        _base_select().where(Transaction.id == transaction.id)
    ).one()
    return _rows_to_out([row])[0]


@router.patch("/{transaction_id}", response_model=TransactionOut)
def update_transaction(
    transaction_id: uuid.UUID,
    payload: TransactionUpdate,
    user_id: CurrentUserId,
    db: DbSession,
) -> TransactionOut:
    transaction = _get_owned(db, user_id, transaction_id)
    changes = payload.model_dump(exclude_unset=True)

    if "account_id" in changes and changes["account_id"] is not None:
        account = _resolve_account(db, user_id, changes["account_id"])
        transaction.account_id = account.id
        transaction.currency = account.currency
    if "category_id" in changes and changes["category_id"] is not None:
        category = _resolve_category(db, user_id, changes["category_id"])
        transaction.category_id = category.id
        transaction.kind = category.kind
    for field in ("amount", "occurred_on"):
        if changes.get(field) is not None:
            setattr(transaction, field, changes[field])
    if changes.get("description") is not None:
        transaction.description = changes["description"].strip()

    db.commit()
    row = db.execute(
        _base_select().where(Transaction.id == transaction.id)
    ).one()
    return _rows_to_out([row])[0]


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(
    transaction_id: uuid.UUID, user_id: CurrentUserId, db: DbSession
) -> None:
    transaction = _get_owned(db, user_id, transaction_id)
    db.delete(transaction)
    db.commit()
