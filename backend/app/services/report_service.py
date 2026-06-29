from __future__ import annotations

import io
import uuid
from datetime import datetime, UTC
from pathlib import Path

from PIL import Image

from app.core.config import get_settings
from app.ml.gradcam import GradCAMGenerator
from app.ml.predictor import Predictor

try:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.lib.utils import ImageReader
    from reportlab.pdfgen import canvas
except ImportError:  # pragma: no cover
    colors = None
    letter = None
    ParagraphStyle = None
    inch = None
    ImageReader = None
    canvas = None

settings = get_settings()


class ReportService:
    def __init__(self) -> None:
        self.predictor = Predictor()
        self.gradcam_generator = GradCAMGenerator(output_dir=settings.heatmap_dir)
        self.report_dir = Path(settings.report_dir)
        self.report_dir.mkdir(parents=True, exist_ok=True)

    def generate_report(self, image_bytes: bytes, original_filename: str, model_name: str) -> dict[str, str]:
        if canvas is None:
            raise RuntimeError("Report generation requires reportlab dependencies to be installed.")

        prediction_result = self.predictor.predict(image_bytes, model_name)
        gradcam_assets = self.gradcam_generator.generate(image_bytes, model_name)

        if not gradcam_assets.get("heatmap_path") or not gradcam_assets.get("overlay_path"):
            raise RuntimeError("Grad-CAM assets are unavailable; the report cannot be generated.")

        file_id = uuid.uuid4().hex
        report_filename = f"dermavision_report_{file_id}.pdf"
        report_path = self.report_dir / report_filename

        self._render_pdf(
            report_path=report_path,
            image_bytes=image_bytes,
            original_filename=original_filename,
            model_name=model_name,
            prediction_result=prediction_result,
            gradcam_assets=gradcam_assets,
        )

        return {"report_url": f"/reports/{report_filename}", "report_filename": report_filename}

    def _render_pdf(
        self,
        report_path: Path,
        image_bytes: bytes,
        original_filename: str,
        model_name: str,
        prediction_result: dict[str, object],
        gradcam_assets: dict[str, str],
    ) -> None:
        width, height = letter
        margin = 40
        section_gap = 16
        current_y = height - margin

        doc = canvas.Canvas(str(report_path), pagesize=letter)
        doc.setTitle("DermaVision AI Clinical Report")

        self._draw_header(doc, width, current_y)
        current_y -= 80

        self._draw_metadata(doc, margin, current_y, width - margin * 2, prediction_result, original_filename, model_name)
        current_y -= 120

        self._draw_image_panel(doc, margin, current_y, width - margin * 2, image_bytes, gradcam_assets)
        current_y -= 230

        self._draw_prediction_summary(doc, margin, current_y, width - margin * 2, prediction_result)
        current_y -= 200

        self._draw_disclaimer(doc, margin, current_y)

        doc.save()

    def _draw_header(self, doc: canvas.Canvas, width: float, current_y: float) -> None:
        logo_size = 40
        doc.setFillColor(colors.HexColor("#0F9AAD"))
        doc.roundRect(40, current_y - logo_size, logo_size, logo_size, 8, fill=True, stroke=False)
        doc.setFillColor(colors.white)
        doc.setFont("Helvetica-Bold", 16)
        doc.drawString(48, current_y - logo_size + 10, "D")

        doc.setFillColor(colors.HexColor("#0F9AAD"))
        doc.setFont("Helvetica-Bold", 22)
        doc.drawString(100, current_y - 8, "DermaVision AI Clinical Report")

        doc.setStrokeColor(colors.HexColor("#0F9AAD"))
        doc.setLineWidth(1)
        doc.line(40, current_y - 50, width - 40, current_y - 50)

    def _draw_metadata(
        self,
        doc: canvas.Canvas,
        x: float,
        y: float,
        width: float,
        prediction_result: dict[str, object],
        original_filename: str,
        model_name: str,
    ) -> None:
        doc.setFont("Helvetica-Bold", 12)
        doc.setFillColor(colors.black)
        doc.drawString(x, y, "Patient Case Summary")

        doc.setFont("Helvetica", 9)
        doc.setFillColor(colors.HexColor("#333333"))

        metadata = [
            ("Report generated", datetime.now(UTC).strftime("%Y-%m-%d %H:%M UTC")),
            ("Original file", original_filename),
            ("AI model", model_name),
            ("Predicted disease", str(prediction_result["predicted_class"])),
            ("Confidence", f"{float(prediction_result['confidence']) * 100:.1f}%"),
            ("Risk level", str(prediction_result["risk_level"]).title()),
        ]

        row_y = y - 20
        label_x = x
        value_x = x + 140
        for label, value in metadata:
            doc.drawString(label_x, row_y, f"{label}:")
            doc.drawString(value_x, row_y, value)
            row_y -= 16

        doc.setFillColor(colors.HexColor("#0F9AAD"))
        doc.rect(x + width - 120, y - 10, 100, 30, fill=True, stroke=False)
        doc.setFillColor(colors.white)
        doc.setFont("Helvetica-Bold", 10)
        doc.drawCentredString(x + width - 70, y + 2, "DermaVision AI")

    def _draw_image_panel(
        self,
        doc: canvas.Canvas,
        x: float,
        y: float,
        width: float,
        image_bytes: bytes,
        gradcam_assets: dict[str, str],
    ) -> None:
        thumb_width = (width - 32) / 3
        thumb_height = 150
        labels = ["Original Image", "Grad-CAM Heatmap", "Overlay Image"]
        sources = [
            Image.open(io.BytesIO(image_bytes)).convert("RGB"),
            Image.open(gradcam_assets["heatmap_path"]).convert("RGB"),
            Image.open(gradcam_assets["overlay_path"]).convert("RGB"),
        ]

        x_pos = x
        for label, source in zip(labels, sources):
            image_reader = ImageReader(source)
            doc.drawImage(image_reader, x_pos, y - thumb_height, thumb_width, thumb_height, preserveAspectRatio=True, anchor="c")
            doc.setFont("Helvetica-Bold", 9)
            doc.setFillColor(colors.HexColor("#0F9AAD"))
            doc.drawCentredString(x_pos + thumb_width / 2, y - thumb_height - 14, label)
            x_pos += thumb_width + 16

    def _draw_prediction_summary(
        self,
        doc: canvas.Canvas,
        x: float,
        y: float,
        width: float,
        prediction_result: dict[str, object],
    ) -> None:
        doc.setFont("Helvetica-Bold", 12)
        doc.setFillColor(colors.black)
        doc.drawString(x, y, "Clinical Findings")

        bullet_x = x + 8
        text_x = x + 16
        row_y = y - 24

        doc.setFont("Helvetica-Bold", 10)
        doc.setFillColor(colors.HexColor("#0F9AAD"))
        doc.drawString(x, row_y, "Top 5 model predictions")
        row_y -= 16

        doc.setFont("Helvetica", 9)
        doc.setFillColor(colors.HexColor("#333333"))
        top_predictions = prediction_result.get("top_predictions", [])
        for entry in top_predictions[:5]:
            doc.drawString(bullet_x, row_y, "•")
            doc.drawString(text_x, row_y, f"{entry.get('class_name')} — {float(entry.get('confidence')) * 100:.1f}%")
            row_y -= 14

        row_y -= 8
        doc.setFont("Helvetica-Bold", 10)
        doc.setFillColor(colors.HexColor("#0F9AAD"))
        doc.drawString(x, row_y, "Clinical recommendation")
        row_y -= 16

        paragraph_style = ParagraphStyle(
            name="Recommendation",
            fontName="Helvetica",
            fontSize=9,
            leading=12,
            textColor=colors.HexColor("#333333"),
        )
        recommendation_text = str(prediction_result.get("recommendation", ""))
        self._draw_wrapped_text(doc, recommendation_text, x, row_y, width, paragraph_style)

    def _draw_wrapped_text(self, doc: canvas.Canvas, text: str, x: float, y: float, max_width: float, style: ParagraphStyle) -> None:
        from reportlab.platypus import Paragraph

        paragraph = Paragraph(text, style)
        paragraph_width, paragraph_height = paragraph.wrap(max_width, 200)
        paragraph.drawOn(doc, x, y - paragraph_height)

    def _draw_disclaimer(self, doc: canvas.Canvas, x: float, y: float) -> None:
        disclaimer_text = (
            "This report is a clinical decision-support document generated by DermaVision AI. "
            "It is not a substitute for medical diagnosis. Final diagnosis and patient care decisions "
            "should be made by a qualified healthcare professional in the context of the full clinical picture."
        )
        style = ParagraphStyle(
            name="Disclaimer",
            fontName="Helvetica-Oblique",
            fontSize=8,
            leading=10,
            textColor=colors.HexColor("#555555"),
        )
        doc.setFillColor(colors.HexColor("#999999"))
        self._draw_wrapped_text(doc, disclaimer_text, x, y, 520, style)
