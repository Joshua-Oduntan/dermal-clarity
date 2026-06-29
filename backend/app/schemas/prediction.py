from __future__ import annotations

from pydantic import BaseModel, Field


class PredictionRequest(BaseModel):
    model_name: str = Field(default="MobileNet", pattern="^(MobileNet|VGG19|InceptionV3)$")


class PredictionResponse(BaseModel):
    predicted_class: str
    confidence: float
    risk_level: str
    recommendation: str
    top_predictions: list[dict]
    probabilities: dict
    model_used: str
    inference_time_ms: float
    gradcam_url: str | None = None
    prediction_id: str | None = None


class GradCAMResponse(BaseModel):
    heatmap_url: str
    overlay_url: str
    original_url: str
    explanation: str


class CompareModelResult(BaseModel):
    name: str
    predicted_class: str
    confidence: float
    inference_time_ms: float
    top_predictions: list[dict]


class CompareSummary(BaseModel):
    agreement: bool
    majority_prediction: str
    highest_confidence_model: str
    fastest_model: str


class CompareResponse(BaseModel):
    models: list[CompareModelResult]
    summary: CompareSummary


class ReportResponse(BaseModel):
    report_url: str
    report_filename: str
