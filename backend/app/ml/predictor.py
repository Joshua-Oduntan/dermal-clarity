from __future__ import annotations

import logging
import time
from typing import Any

import numpy as np

from app.ml.model_loader import ModelLoader
from app.ml.preprocessing import ImagePreprocessor

CLASS_NAMES = [
    "Actinic Keratoses",
    "Basal Cell Carcinoma",
    "Benign Keratosis-like Lesions",
    "Chickenpox",
    "Cowpox",
    "Dermatofibroma",
    "Healthy",
    "HFMD",
    "Measles",
    "Melanocytic Nevi",
    "Melanoma",
    "Monkeypox",
    "Squamous Cell Carcinoma",
    "Vascular Lesions",
]

logger = logging.getLogger("app.ml.predictor")


class Predictor:
    def __init__(self) -> None:
        self.model_loader = ModelLoader()
        self.preprocessor = ImagePreprocessor()

    def predict(self, image_bytes: bytes, model_name: str) -> dict[str, Any]:
        trace_id = f"predictor-{time.time_ns()}"
        logger.info("[%s] starting prediction for model %s", trace_id, model_name)
        start = time.perf_counter()

        tensor = self.preprocessor.preprocess(image_bytes, model_name)
        logger.info("[%s] preprocessing complete shape=%s", trace_id, tensor.shape)

        model = self.model_loader.get_model(model_name)
        logger.info("[%s] model loaded: %s", trace_id, model_name)

        probabilities = np.asarray(model.predict(tensor, verbose=0)).squeeze(axis=0).astype(np.float32)
        logger.info("[%s] raw model output received size=%s", trace_id, probabilities.shape)

        if probabilities.ndim != 1:
            probabilities = probabilities.reshape(-1)
        if probabilities.size > len(CLASS_NAMES):
            probabilities = probabilities[: len(CLASS_NAMES)]
        if probabilities.size != len(CLASS_NAMES):
            raise ValueError(
                f"Model output size mismatch: expected {len(CLASS_NAMES)} classes, got {probabilities.size}"
            )

        top_indices = np.argsort(probabilities)[::-1][:5]
        top_predictions = [
            {"class_name": CLASS_NAMES[idx], "confidence": float(probabilities[idx])} for idx in top_indices
        ]
        predicted_index = int(np.argmax(probabilities))
        predicted_class = CLASS_NAMES[predicted_index]
        confidence = float(probabilities[predicted_index])
        risk_level, recommendation = self._risk_and_recommendation(predicted_class, confidence)
        inference_time_ms = round((time.perf_counter() - start) * 1000, 2)
        return {
            "predicted_class": predicted_class,
            "confidence": confidence,
            "risk_level": risk_level,
            "recommendation": recommendation,
            "top_predictions": top_predictions,
            "probabilities": {CLASS_NAMES[i]: float(probabilities[i]) for i in range(len(CLASS_NAMES))},
            "model_used": model_name,
            "inference_time_ms": inference_time_ms,
        }

    def _risk_and_recommendation(self, predicted_class: str, confidence: float) -> tuple[str, str]:
        if predicted_class in {"Melanoma", "Basal Cell Carcinoma", "Squamous Cell Carcinoma"}:
            return "critical", "Urgent dermatology review is recommended. Please seek medical evaluation promptly."
        if predicted_class in {"Actinic Keratoses", "Chickenpox", "Cowpox", "Monkeypox", "Measles", "HFMD"}:
            return "warning", "Please consult a qualified clinician for confirmation and appropriate care."
        if confidence >= 0.85:
            return "safe", "The lesion appears benign, but routine monitoring is still advised."
        return "safe", "No immediate concern detected, though follow-up with a clinician is recommended if symptoms change."
