from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.utils.security import create_access_token, verify_password


class AuthService:
    def __init__(self, db: Session) -> None:
        self.user_repository = UserRepository(db)

    def register(self, email: str, password: str, full_name: str | None = None) -> tuple[User, str]:
        if self.user_repository.get_by_email(email):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
        user = self.user_repository.create(email=email, password=password, full_name=full_name)
        token = create_access_token(user.id)
        return user, token

    def login(self, email: str, password: str) -> tuple[User, str]:
        user = self.user_repository.get_by_email(email)
        if not user or not verify_password(password, user.hashed_password):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
        token = create_access_token(user.id)
        return user, token
