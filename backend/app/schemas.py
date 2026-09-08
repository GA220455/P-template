from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator

from .models import AccountType, TransactionKind


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=1, max_length=120)
    password: str = Field(min_length=8, max_length=128)
    base_currency: str = Field(default="EUR", pattern=r"^[A-Z]{3}$")


class UserUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=120)
    base_currency: str | None = Field(default=None, pattern=r"^[A-Z]{3}$")


class UserOut(ORMModel):
    id: uuid.UUID
    email: EmailStr
    full_name: str
    base_currency: str
    created_at: datetime


class AccountCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    type: AccountType = AccountType.checking
    currency: str = Field(default="EUR", pattern=r"^[A-Z]{3}$")
    opening_balance: Decimal = Field(default=Decimal("0"), max_digits=14, decimal_places=2)


class AccountUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=80)
    type: AccountType | None = None
    currency: str | None = Field(default=None, pattern=r"^[A-Z]{3}$")
    opening_balance: Decimal | None = Field(
        default=None, max_digits=14, decimal_places=2
    )


class AccountOut(ORMModel):
    id: uuid.UUID
    name: str
    type: AccountType
    currency: str
    opening_balance: Decimal


class AccountWithBalance(AccountOut):
    current_balance: Decimal
    income_total: Decimal
    expense_total: Decimal


class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    kind: TransactionKind
    color: str = Field(default="#6366f1", pattern=r"^#[0-9a-fA-F]{6}$")


class CategoryUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=60)
    color: str | None = Field(default=None, pattern=r"^#[0-9a-fA-F]{6}$")


class CategoryOut(ORMModel):
    id: uuid.UUID
    name: str
    kind: TransactionKind
    color: str


class TransactionCreate(BaseModel):
    account_id: uuid.UUID
    category_id: uuid.UUID
    amount: Decimal = Field(gt=0, max_digits=14, decimal_places=2)
    description: str = Field(default="", max_length=200)
    occurred_on: date

    @model_validator(mode="after")
    def _strip_description(self) -> TransactionCreate:
        self.description = self.description.strip()
        return self


class TransactionUpdate(BaseModel):
    account_id: uuid.UUID | None = None
    category_id: uuid.UUID | None = None
    amount: Decimal | None = Field(default=None, gt=0, max_digits=14, decimal_places=2)
    description: str | None = Field(default=None, max_length=200)
    occurred_on: date | None = None


class TransactionOut(ORMModel):
    id: uuid.UUID
    account_id: uuid.UUID
    category_id: uuid.UUID
    kind: TransactionKind
    amount: Decimal
    currency: str
    description: str
    occurred_on: date
    created_at: datetime
    category_name: str = ""
    category_color: str = "#6366f1"
    account_name: str = ""


class TransactionPage(BaseModel):
    items: list[TransactionOut]
    total: int


class CategoryTotal(BaseModel):
    category_id: uuid.UUID
    category_name: str
    color: str
    total: Decimal


class MonthlyPoint(BaseModel):
    month: str
    income: Decimal
    expense: Decimal


class Summary(BaseModel):
    base_currency: str
    income: Decimal
    expense: Decimal
    net: Decimal
    balance: Decimal
    transaction_count: int


class DashboardResponse(BaseModel):
    summary: Summary
    by_category: list[CategoryTotal]
    by_month: list[MonthlyPoint]


class FxQuote(BaseModel):
    base: str
    quote: str
    rate: Decimal
    observed_on: date
    source: str


class FxConvertRequest(BaseModel):
    amount: Decimal = Field(max_digits=14, decimal_places=2)
    base: str = Field(pattern=r"^[A-Z]{3}$")
    quote: str = Field(pattern=r"^[A-Z]{3}$")


class FxConvertResponse(BaseModel):
    amount: Decimal
    converted: Decimal
    quote: FxQuote
