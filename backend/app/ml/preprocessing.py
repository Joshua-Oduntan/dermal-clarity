from __future__ import annotations

import io
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image, ImageOps


class ImagePreprocessor:
    """Preprocesses uploaded images for the supported transfer-learning models."""

    def __init__(self) -> None:
        self.target_sizes = {
            "MobileNet": (200, 200),
            "VGG19": (200, 200),
            "InceptionV3": (200, 200),
        }

    def preprocess(self, image_bytes: bytes, model_name: str) -> np.ndarray:
        if model_name not in self.target_sizes:
            raise ValueError(f"Unsupported model for preprocessing: {model_name}")

        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        image = ImageOps.exif_transpose(image)
        image = image.resize(self.target_sizes[model_name], resample=Image.Resampling.BILINEAR)

        array = np.asarray(image, dtype=np.float32)
        array = np.expand_dims(array, axis=0)

        if model_name == "MobileNet":
            from tensorflow.keras.applications.mobilenet import preprocess_input
        elif model_name == "VGG19":
            from tensorflow.keras.applications.vgg19 import preprocess_input
        else:
            from tensorflow.keras.applications.inception_v3 import preprocess_input

        return preprocess_input(array)

    def preprocess_file(self, file_path: str | Path, model_name: str) -> np.ndarray:
        return self.preprocess(Path(file_path).read_bytes(), model_name)
