from __future__ import annotations

from pathlib import Path
from typing import Any

try:
    import tensorflow as tf
except ImportError:  # pragma: no cover - depends on runtime environment
    tf = None

from app.core.config import get_settings

settings = get_settings()


class ModelLoader:
    """Loads TensorFlow models once and keeps them cached in memory."""

    def __init__(self) -> None:
        self.model_dir = Path(settings.model_dir).expanduser().resolve()
        self._models: dict[str, Any] = {}
        self.supported_models = ["MobileNet", "VGG19", "InceptionV3"]

    def _candidate_paths(self, model_name: str) -> list[Path]:
        return [
            self.model_dir / f"{model_name}.keras",
            self.model_dir / f"{model_name}.h5",
            Path(__file__).resolve().parent.parent / "models" / f"{model_name}.keras",
            Path(__file__).resolve().parent.parent / "models" / f"{model_name}.h5",
        ]

    def resolve_model_path(self, model_name: str) -> Path:
        for candidate in self._candidate_paths(model_name):
            if candidate.exists():
                return candidate
        raise FileNotFoundError(
            f"Model file not found for {model_name}. Checked: {', '.join(str(path) for path in self._candidate_paths(model_name))}"
        )

    def load_model(self, model_name: str) -> Any:
        if tf is None:
            raise RuntimeError("TensorFlow is not installed in the current environment")
        if model_name not in self.supported_models:
            raise ValueError(f"Unsupported model: {model_name}")
        model_path = self.resolve_model_path(model_name)
        return tf.keras.models.load_model(str(model_path), compile=False)

    def get_model(self, model_name: str) -> Any:
        if model_name not in self._models:
            self._models[model_name] = self.load_model(model_name)
        return self._models[model_name]

    def load_all_models(self) -> dict[str, Any]:
        for model_name in self.supported_models:
            self.get_model(model_name)
        return self._models
