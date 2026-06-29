from __future__ import annotations

import io
import logging
import uuid
from collections import Counter
from datetime import datetime, UTC
from pathlib import Path
from typing import Any

from PIL import Image, ImageOps
from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.ml.gradcam import GradCAMGenerator
from app.ml.predictor import Predictor
from app.repositories.prediction_repository import PredictionRepository

logger = logging.getLogger("app.services.prediction_service")
settings = get_settings()


class PredictionService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.prediction_repository = PredictionRepository(db)
        self.predictor = Predictor()
        self.gradcam_generator = GradCAMGenerator(output_dir=settings.heatmap_dir)

    def predict(self, file: UploadFile, model_name: str, current_user: Any | None = None) -> dict[str, Any]:
        trace_id = uuid.uuid4().hex
        logger.info("[%s] prediction service started model=%s filename=%s", trace_id, model_name, getattr(file, "filename", None))

        contents = file.file.read()
        logger.info("[%s] uploaded file read (%s bytes)", trace_id, len(contents))
        if not contents:
            logger.warning("[%s] uploaded file is empty", trace_id)
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty file uploaded")

        image = Image.open(io.BytesIO(contents)).convert("RGB")
        image = ImageOps.exif_transpose(image)
        image_resolution = f"{image.width}x{image.height}"
        timestamp = datetime.now(UTC).isoformat()

        file_ext = Path(file.filename or "image.jpg").suffix.lower().lstrip(".")
        logger.info("[%s] uploaded file extension=%s", trace_id, file_ext)
        if file_ext not in settings.allowed_extensions:
            logger.warning("[%s] unsupported file extension: %s", trace_id, file_ext)
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported image format")

        upload_dir = Path(settings.upload_dir)
        upload_dir.mkdir(parents=True, exist_ok=True)
        stored_path = upload_dir / f"{uuid.uuid4().hex}.{file_ext}"
        stored_path.write_bytes(contents)
        logger.info("[%s] uploaded file stored at %s", trace_id, stored_path)

        try:
            prediction_result = self.predictor.predict(contents, model_name)
        except FileNotFoundError as exc:
            logger.error("[%s] model file not found for %s", trace_id, model_name, exc_info=True)
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Model is not available yet") from exc
        except (ValueError, RuntimeError) as exc:
            logger.error("[%s] prediction failed for %s: %s", trace_id, model_name, exc, exc_info=True)
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc

        logger.info("[%s] prediction completed with class=%s confidence=%s", trace_id, prediction_result["predicted_class"], prediction_result["confidence"])

        gradcam_available = False
        gradcam_error = ""
        gradcam_path = None

        try:
            gradcam_result = self.gradcam_generator.generate(contents, model_name)
            heatmap_path = gradcam_result.get("heatmap_path")
            overlay_path = gradcam_result.get("overlay_path")
            original_path = gradcam_result.get("original_path")
            gradcam_error = gradcam_result.get("explanation", "")

            if heatmap_path and overlay_path and original_path:
                gradcam_available = True
                gradcam_path = heatmap_path
                logger.info("[%s] Grad-CAM generated successfully for model=%s", trace_id, model_name)
            else:
                logger.warning("[%s] Grad-CAM unavailable for model=%s: %s", trace_id, model_name, gradcam_error)
        except Exception:
            logger.exception("[%s] unexpected error during Grad-CAM generation", trace_id)
            gradcam_available = False
            gradcam_error = "Grad-CAM generation failed; prediction returned without explanation."

        user_id = getattr(current_user, "id", None)
        user_name = getattr(current_user, "full_name", None) or getattr(current_user, "email", None)

        payload = {
            "predicted_class": prediction_result["predicted_class"],
            "confidence": prediction_result["confidence"],
            "risk_level": prediction_result["risk_level"],
            "recommendation": prediction_result["recommendation"],
            "model_used": prediction_result["model_used"],
            "top_predictions": prediction_result["top_predictions"],
            "probabilities": prediction_result["probabilities"],
            "inference_time_ms": prediction_result["inference_time_ms"],
            "uploaded_image_path": str(stored_path),
            "gradcam_image_path": gradcam_path,
        }
        prediction = None
        try:
            prediction = self.prediction_repository.create(user_id=user_id, payload=payload)
        except Exception:
            logger.exception("[%s] failed to persist prediction to the database", trace_id)

        created_at = prediction.created_at.isoformat() if prediction is not None else timestamp
        gradcam_url = f"/heatmaps/{Path(gradcam_path).name}" if gradcam_path else None

        response = {
            **prediction_result,
            "gradcam_url": gradcam_url,
            "prediction_id": str(prediction.id) if prediction is not None else None,
            "gradcam_available": gradcam_available,
            "gradcam_error": gradcam_error,
            "created_at": created_at,
            "image_resolution": image_resolution,
            "image_filename": Path(file.filename or "image").name,
            "status": "completed",
            "backend_version": settings.app_version,
            "api_version": "1.0",
            "user_id": user_id,
            "user_name": user_name,
        }

        logger.info("[%s] prediction service response prepared prediction_id=%s gradcam_available=%s", trace_id, response["prediction_id"], gradcam_available)
        return response

    def generate_gradcam(self, file: UploadFile, model_name: str) -> dict[str, str]:
        contents = file.file.read()
        if not contents:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty file uploaded")

        file_ext = Path(file.filename or "image.jpg").suffix.lower().lstrip(".")
        if file_ext not in settings.allowed_extensions:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported image format")

        try:
            generated = self.gradcam_generator.generate(contents, model_name)
        except FileNotFoundError as exc:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Model is not available yet") from exc
        except (ValueError, RuntimeError) as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

        heatmap_name = Path(generated["heatmap_path"]).name
        overlay_name = Path(generated["overlay_path"]).name
        original_name = Path(generated["original_path"]).name

        return {
            "heatmap_url": f"/heatmaps/{heatmap_name}",
            "overlay_url": f"/heatmaps/{overlay_name}",
            "original_url": f"/heatmaps/{original_name}",
            "explanation": generated["explanation"],
        }

    def compare_models(self, image_bytes: bytes) -> dict[str, Any]:
        model_names = ["MobileNet", "VGG19", "InceptionV3"]
        results: list[dict[str, Any]] = []

        for model_name in model_names:
            prediction_result = self.predictor.predict(image_bytes, model_name)
            results.append(
                {
                    "name": model_name,
                    "predicted_class": prediction_result["predicted_class"],
                    "confidence": prediction_result["confidence"],
                    "inference_time_ms": prediction_result["inference_time_ms"],
                    "top_predictions": prediction_result["top_predictions"],
                }
            )

        predicted_classes = [entry["predicted_class"] for entry in results]
        counts = Counter(predicted_classes)
        majority_prediction = ""
        if counts:
            most_common = counts.most_common()
            if len(most_common) == 1 or most_common[0][1] > most_common[1][1]:
                majority_prediction = most_common[0][0]

        highest_confidence_model = max(results, key=lambda entry: entry["confidence"])["name"]
        fastest_model = min(results, key=lambda entry: entry["inference_time_ms"])["name"]
        agreement = len(counts) == 1

        return {
            "models": results,
            "summary": {
                "agreement": agreement,
                "majority_prediction": majority_prediction,
                "highest_confidence_model": highest_confidence_model,
                "fastest_model": fastest_model,
            },
        }

    def history(self, user_id: int) -> list[dict[str, Any]]:
        predictions = self.prediction_repository.list_for_user(user_id)
        history: list[dict[str, Any]] = []

        for p in predictions:
            gradcam_url = None
            if p.gradcam_image_path:
                gradcam_url = f"/heatmaps/{Path(p.gradcam_image_path).name}"
            history.append(
                {
                    "id": p.id,
                    "predicted_class": p.predicted_class,
                    "confidence": p.confidence,
                    "risk_level": p.risk_level,
                    "recommendation": p.recommendation,
                    "model_used": p.model_used,
                    "created_at": p.created_at.isoformat(),
                    "gradcam_url": gradcam_url,
                }
            )

        return history
