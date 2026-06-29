from __future__ import annotations

import io
import logging
import os
import uuid
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image, ImageOps

try:
    import tensorflow as tf
except ImportError:  # pragma: no cover - depends on runtime environment
    tf = None

from app.ml.model_loader import ModelLoader
from app.ml.preprocessing import ImagePreprocessor
from app.ml.predictor import CLASS_NAMES

logger = logging.getLogger("app.ml.gradcam")


class GradCAMGenerator:
    """Generates Grad-CAM overlays and persists the resulting images."""

    def __init__(self, output_dir: str | None = None) -> None:
        self.output_dir = Path(output_dir or os.path.join(os.getcwd(), "heatmaps"))
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.model_loader = ModelLoader()
        self.preprocessor = ImagePreprocessor()

    def generate(self, image_bytes: bytes, model_name: str) -> dict[str, str | None]:
        if tf is None:
            logger.warning("TensorFlow is not available, skipping Grad-CAM generation")
            return {
                "heatmap_path": None,
                "overlay_path": None,
                "original_path": None,
                "explanation": "Grad-CAM unavailable because TensorFlow is not installed.",
            }

        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        image = ImageOps.exif_transpose(image)

        model = self.model_loader.get_model(model_name)
        target_layer = self._find_target_layer(model)
        if target_layer is None:
            logger.warning("Grad-CAM target layer not found for model %s", model_name)
            return {
                "heatmap_path": None,
                "overlay_path": None,
                "original_path": None,
                "explanation": "Grad-CAM unavailable for this model architecture.",
            }

        try:
            input_tensor = self.preprocessor.preprocess(image_bytes, model_name)
            heatmap, predicted_index = self._build_gradcam(model, input_tensor, target_layer)
        except Exception:
            logger.exception("Failed to build Grad-CAM for model %s", model_name)
            return {
                "heatmap_path": None,
                "overlay_path": None,
                "original_path": None,
                "explanation": "Grad-CAM generation failed due to an internal error.",
            }

        file_id = uuid.uuid4().hex
        original_filename = f"{model_name.lower()}_{file_id}_original.png"
        heatmap_filename = f"{model_name.lower()}_{file_id}_heatmap.png"
        overlay_filename = f"{model_name.lower()}_{file_id}_overlay.png"

        original_path = self.output_dir / original_filename
        heatmap_path = self.output_dir / heatmap_filename
        overlay_path = self.output_dir / overlay_filename

        image.save(original_path)
        self._save_heatmap(heatmap, original_path.size, heatmap_path)
        self._save_overlay(image, heatmap_path, overlay_path)

        class_name = CLASS_NAMES[predicted_index] if 0 <= predicted_index < len(CLASS_NAMES) else "prediction"
        explanation = (
            f"This Grad-CAM output highlights the regions of the image that most influenced the "
            f"{model_name} model's prediction for {class_name}. The overlay is generated from the final "
            f"convolutional layer ({target_layer.name})."
        )

        return {
            "heatmap_path": str(heatmap_path),
            "overlay_path": str(overlay_path),
            "original_path": str(original_path),
            "explanation": explanation,
        }

    def _find_target_layer(self, model: Any) -> Any | None:
        return self._find_final_conv_layer(model)

    def _find_final_conv_layer(self, model: Any) -> Any | None:
        if hasattr(model, "layers"):
            for layer in reversed(getattr(model, "layers", [])):
                if self._is_conv_layer(layer):
                    return layer
                nested = self._find_final_conv_layer(layer)
                if nested is not None:
                    return nested

        if hasattr(model, "layer"):
            return self._find_final_conv_layer(getattr(model, "layer"))

        return None

    def _resolve_target_tensor(self, model: Any, target_layer: Any) -> Any:
        parent_model = self._find_parent_model(model, target_layer)
        if parent_model is None or parent_model is model:
            return target_layer.output

        nested = parent_model
        try:
            nested_model = tf.keras.models.Model(inputs=nested.inputs, outputs=target_layer.output)
        except Exception as exc:
            raise RuntimeError(f"Unable to build connected Grad-CAM tensor for layer {target_layer.name}") from exc

        if len(model.inputs) == len(nested.inputs):
            if len(model.inputs) == 1:
                return nested_model(model.inputs[0])
            return nested_model(model.inputs)

        if len(nested.inputs) == 1 and len(model.inputs) >= 1:
            return nested_model(model.inputs[0])

        return nested_model(nested.inputs)

    def _find_parent_model(self, model: Any, target_layer: Any) -> Any | None:
        if hasattr(model, "layers"):
            for layer in getattr(model, "layers", []):
                if layer is target_layer:
                    return model
                parent = self._find_parent_model(layer, target_layer)
                if parent is not None:
                    return parent
        return None

    def _is_conv_layer(self, layer: Any) -> bool:
        if hasattr(layer, "__class__"):
            layer_name = layer.__class__.__name__.lower()
            if "conv" in layer_name:
                return True

        if hasattr(layer, "kernel_size") and hasattr(layer, "filters"):
            return True

        return False

    def _build_gradcam(self, model: Any, tensor: np.ndarray, target_layer: Any) -> tuple[np.ndarray, int]:
        target_tensor = self._resolve_target_tensor(model, target_layer)
        grad_model = tf.keras.models.Model(
            inputs=model.inputs,
            outputs=[target_tensor, model.output],
        )

        with tf.GradientTape() as tape:
            conv_outputs, predictions = grad_model(tf.convert_to_tensor(tensor))
            predicted_index = int(tf.argmax(predictions[0]))
            loss = predictions[:, predicted_index]

        grads = tape.gradient(loss, conv_outputs)
        if grads is None:
            raise RuntimeError("Failed to compute Grad-CAM gradients")

        pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))
        conv_outputs = conv_outputs[0]
        heatmap = tf.reduce_sum(tf.multiply(conv_outputs, pooled_grads), axis=-1)
        heatmap = tf.maximum(heatmap, 0.0)

        max_val = tf.reduce_max(heatmap)
        if max_val == 0:
            heatmap = tf.zeros_like(heatmap)
        else:
            heatmap /= max_val

        return heatmap.numpy(), predicted_index

    def _save_heatmap(self, heatmap: np.ndarray, size: tuple[int, int], output_path: Path) -> None:
        heatmap_image = Image.fromarray(np.uint8(heatmap * 255), mode="L")
        heatmap_image = heatmap_image.resize(size, Image.Resampling.BILINEAR)

        array = np.asarray(heatmap_image, dtype=np.uint8)
        red = array
        green = np.clip(array * 0.35 + 30, 0, 255).astype(np.uint8)
        blue = np.clip(array * 0.05, 0, 255).astype(np.uint8)
        heatmap_rgb = np.stack([red, green, blue], axis=-1)

        Image.fromarray(heatmap_rgb, mode="RGB").save(output_path)

    def _save_overlay(self, original: Image.Image, heatmap_path: Path, output_path: Path) -> None:
        heatmap_image = Image.open(heatmap_path).convert("RGB")
        overlay = Image.blend(original.convert("RGB"), heatmap_image, alpha=0.45)
        overlay.save(output_path)
