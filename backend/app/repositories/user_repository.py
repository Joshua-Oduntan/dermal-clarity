from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.user import User
from app.utils.security import hash_password


class UserRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_email(self, email: str) -> User | None:
        return self.db.query(User).filter(User.email == email).first()

    def create(self, email: str, password: str, full_name: str | None = None) -> User:
        user = User(email=email, full_name=full_name, hashed_password=hash_password(password))
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user
