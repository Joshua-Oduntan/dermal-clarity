from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.prediction import Prediction


class PredictionRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, *, user_id: int | None, payload: dict) -> Prediction:
        prediction = Prediction(user_id=user_id, **payload)
        self.db.add(prediction)
        self.db.commit()
        self.db.refresh(prediction)
        return prediction

    def list_for_user(self, user_id: int) -> list[Prediction]:
        return self.db.query(Prediction).filter(Prediction.user_id == user_id).order_by(Prediction.created_at.desc()).all()
