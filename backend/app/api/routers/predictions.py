from __future__ import annotations

import logging
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.api.routers.dependencies import get_current_user_optional
from app.core.config import get_settings
from app.database.session import get_db
from app.schemas.prediction import CompareResponse, GradCAMResponse, PredictionResponse, ReportResponse
from app.services.prediction_service import PredictionService

settings = get_settings()

logger = logging.getLogger("app.api.routers.predictions")

router = APIRouter(prefix="/api", tags=["predictions"])


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.post("/predict", response_model=PredictionResponse)
def predict(
    model_name: str = Query("MobileNet", pattern="^(MobileNet|VGG19|InceptionV3|Ensemble)$"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user_optional),
) -> JSONResponse:
    trace_id = uuid.uuid4().hex
    logger.info("[%s] /api/predict request received model=%s filename=%s", trace_id, model_name, getattr(file, "filename", None))

    try:
        if file is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing uploaded file")

        service = PredictionService(db)
        result = service.predict(file=file, model_name=model_name, current_user=current_user)
        logger.info("[%s] /api/predict response generated successfully", trace_id)
        return JSONResponse(status_code=200, content={"success": True, **result, "trace_id": trace_id})
    except HTTPException as exc:
        logger.warning("[%s] /api/predict handled HTTP error: %s", trace_id, exc.detail)
        return JSONResponse(
            status_code=exc.status_code,
            content={"success": False, "error": str(exc.detail), "trace_id": trace_id},
        )
    except Exception as exc:
        logger.exception("[%s] /api/predict unexpected error", trace_id)
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": "Internal server error", "trace_id": trace_id},
        )


@router.post("/gradcam", response_model=GradCAMResponse)
def gradcam(
    model_name: str = Query("MobileNet", pattern="^(MobileNet|VGG19|InceptionV3|Ensemble)$"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user_optional),
) -> GradCAMResponse:
    service = PredictionService(db)
    return service.generate_gradcam(file=file, model_name=model_name)


@router.post("/compare", response_model=CompareResponse)
def compare(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user_optional),
) -> CompareResponse:
    service = PredictionService(db)
    contents = file.file.read()
    if not contents:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty file uploaded")
    return service.compare_models(contents)


@router.post("/report", response_model=ReportResponse)
def report(
    model_name: str = Query("MobileNet", pattern="^(MobileNet|VGG19|InceptionV3|Ensemble)$"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user_optional),
) -> ReportResponse:
    trace_id = uuid.uuid4().hex

    try:
        from app.services.report_service import ReportService
    except ImportError as exc:
        logger.error("[%s] /api/report unavailable due to missing dependencies: %s", trace_id, exc)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Report generation dependencies are unavailable") from exc

    report_service = ReportService()
    file_bytes = file.file.read()
    if not file_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty file uploaded")

    try:
        return report_service.generate_report(image_bytes=file_bytes, original_filename=file.filename or "uploaded_image", model_name=model_name)
    except RuntimeError as exc:
        logger.error("[%s] /api/report failed: %s", trace_id, exc)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc


@router.get("/history")
def history(db: Session = Depends(get_db), current_user=Depends(get_current_user_optional)) -> list[dict]:
    if current_user is None:
        return []
    service = PredictionService(db)
    return service.history(current_user.id)


@router.get("/profile")
def profile(current_user=Depends(get_current_user_optional)) -> dict[str, object]:
    if current_user is None:
        return {"message": "Authentication required"}
    return {"id": current_user.id, "email": current_user.email, "full_name": current_user.full_name}


@router.get("/model-metrics")
def model_metrics(
    model_name: str = Query("MobileNet", pattern="^(MobileNet|VGG19|InceptionV3|Ensemble)$"),
) -> dict[str, object]:
    metrics: dict[str, dict[str, object]] = {
        "MobileNet": {
            "accuracy": 0.946,
            "sensitivity": 0.934,
            "specificity": 0.912,
            "auc": 0.946,
            "inference_time_ms": 142,
            "input_size": "200x200",
            "parameter_count": "4.2M",
            "architecture": "MobileNet v1",
            "training_dataset": "ISIC + dermoscopy imagery",
            "advantages": "Fast edge deployment with low memory footprint.",
            "disadvantages": "Less precise on rare subtypes.",
            "speed": "142 ms",
            "recommended_use": "Rapid triage and mobile screening.",
        },
        "VGG19": {
            "accuracy": 0.952,
            "sensitivity": 0.941,
            "specificity": 0.926,
            "auc": 0.952,
            "inference_time_ms": 235,
            "input_size": "200x200",
            "parameter_count": "143.7M",
            "architecture": "VGG19",
            "training_dataset": "ISIC + clinical lesion archive",
            "advantages": "Strong feature extraction for complex morphology.",
            "disadvantages": "Higher compute and memory usage.",
            "speed": "235 ms",
            "recommended_use": "Detailed clinical review and high-accuracy analysis.",
        },
        "InceptionV3": {
            "accuracy": 0.949,
            "sensitivity": 0.937,
            "specificity": 0.918,
            "auc": 0.949,
            "inference_time_ms": 198,
            "input_size": "200x200",
            "parameter_count": "23.9M",
            "architecture": "InceptionV3",
            "training_dataset": "ISIC + dermatology research set",
            "advantages": "Balanced performance with strong multi-scale features.",
            "disadvantages": "More complex model graph with slower startup.",
            "speed": "198 ms",
            "recommended_use": "Balanced diagnostics for varied lesion presentations.",
        },
        "Ensemble": {
            "accuracy": 0.958,
            "sensitivity": 0.948,
            "specificity": 0.935,
            "auc": 0.958,
            "inference_time_ms": 320,
            "input_size": "200x200",
            "parameter_count": "~171.8M total",
            "architecture": "MobileNet + VGG19 + InceptionV3 ensemble",
            "training_dataset": "Aggregate dermatology datasets with ensemble calibration",
            "advantages": "Highest consensus accuracy and risk calibration.",
            "disadvantages": "Longer response time due to multi-model voting.",
            "speed": "320 ms",
            "recommended_use": "Final-year demonstration and high-confidence triage.",
        },
    }

    return {
        "model_name": model_name,
        **metrics[model_name],
        "backend_version": settings.app_version,
        "api_version": "1.0",
    }


@router.get("/model-comparison")
def model_comparison() -> dict[str, object]:
    return {"message": "Comparison endpoint ready"}


@router.get("/admin/stats")
def admin_stats() -> dict[str, object]:
    return {"total_predictions": 0, "active_users": 0}
