from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from .database import get_db
from .models import User
from .security import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciales inválidas o expiradas",
        headers={"WWW-Authenticate": "Bearer"},
    )

    user_id = decode_access_token(token)
    if user_id is None:
        raise credentials_error

    user = db.scalar(select(User).where(User.id == user_id))
    if user is None:
        raise credentials_error
    return user


def get_current_user_id(
    user: Annotated[User, Depends(get_current_user)],
) -> uuid.UUID:
    return user.id


CurrentUser = Annotated[User, Depends(get_current_user)]
CurrentUserId = Annotated[uuid.UUID, Depends(get_current_user_id)]
DbSession = Annotated[Session, Depends(get_db)]
