from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.routers.dependencies import get_current_user
from app.database.session import get_db
from app.schemas.auth import TokenResponse, UserLogin, UserProfile, UserRegister
from app.services.auth_service import AuthService

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse)
def register(payload: UserRegister, db: Session = Depends(get_db)) -> TokenResponse:
    service = AuthService(db)
    _, token = service.register(payload.email, payload.password, payload.full_name)
    return TokenResponse(access_token=token)


@router.post("/login", response_model=TokenResponse)
def login(payload: UserLogin, db: Session = Depends(get_db)) -> TokenResponse:
    service = AuthService(db)
    _, token = service.login(payload.email, payload.password)
    return TokenResponse(access_token=token)


@router.get("/profile", response_model=UserProfile)
def profile(current_user=Depends(get_current_user)) -> UserProfile:
    return UserProfile(id=current_user.id, email=current_user.email, full_name=current_user.full_name)
