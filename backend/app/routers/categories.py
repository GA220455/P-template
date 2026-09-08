from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..deps import CurrentUserId, DbSession
from ..models import Category, Transaction
from ..schemas import CategoryCreate, CategoryOut, CategoryUpdate

router = APIRouter(prefix="/api/categories", tags=["categories"])


def _get_owned(db: Session, user_id: uuid.UUID, category_id: uuid.UUID) -> Category:
    category = db.scalar(
        select(Category).where(Category.id == category_id, Category.user_id == user_id)
    )
    if category is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Categoría no encontrada"
        )
    return category


@router.get("", response_model=list[CategoryOut])
def list_categories(user_id: CurrentUserId, db: DbSession) -> list[Category]:
    return list(
        db.scalars(
            select(Category)
            .where(Category.user_id == user_id)
            .order_by(Category.kind, Category.name)
        )
    )


@router.post("", response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
def create_category(
    payload: CategoryCreate, user_id: CurrentUserId, db: DbSession
) -> Category:
    duplicate = db.scalar(
        select(Category).where(
            Category.user_id == user_id,
            Category.name == payload.name.strip(),
            Category.kind == payload.kind,
        )
    )
    if duplicate is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya tienes una categoría con ese nombre para este tipo",
        )
    category = Category(
        user_id=user_id,
        name=payload.name.strip(),
        kind=payload.kind,
        color=payload.color,
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@router.patch("/{category_id}", response_model=CategoryOut)
def update_category(
    category_id: uuid.UUID, payload: CategoryUpdate, user_id: CurrentUserId, db: DbSession
) -> Category:
    category = _get_owned(db, user_id, category_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(category, field, value.strip() if field == "name" else value)
    db.commit()
    db.refresh(category)
    return category


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: uuid.UUID, user_id: CurrentUserId, db: DbSession
) -> None:
    category = _get_owned(db, user_id, category_id)
    in_use = db.scalar(
        select(func.count())
        .select_from(Transaction)
        .where(Transaction.category_id == category.id)
    )
    if in_use:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No puedes borrar una categoría con transacciones asociadas",
        )
    db.delete(category)
    db.commit()
