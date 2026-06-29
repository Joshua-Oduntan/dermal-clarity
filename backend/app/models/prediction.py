from __future__ import annotations

from datetime import datetime, UTC
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Float, ForeignKey, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base

if TYPE_CHECKING:
    from app.models.user import User


class Prediction(Base):
    __tablename__ = "predictions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    predicted_class: Mapped[str] = mapped_column(String(255), nullable=False)
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    risk_level: Mapped[str] = mapped_column(String(50), nullable=False)
    recommendation: Mapped[str] = mapped_column(String(500), nullable=False)
    model_used: Mapped[str] = mapped_column(String(100), nullable=False)
    top_predictions: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    probabilities: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    inference_time_ms: Mapped[float] = mapped_column(Float, nullable=False)
    uploaded_image_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    gradcam_image_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))

    user: Mapped["User | None"] = relationship(back_populates="predictions")
