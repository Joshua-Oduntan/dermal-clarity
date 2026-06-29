from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.routers.auth import router as auth_router
from app.api.routers.predictions import router as predictions_router
from app.core.config import get_settings
from app.database.session import init_db
from app.ml.model_loader import ModelLoader

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
settings = get_settings()
model_loader = ModelLoader()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    try:
        model_loader.load_all_models()
    except Exception:
        logging.exception("Failed to preload models during startup. Models will be loaded on demand.")
    yield


heatmap_dir = Path(settings.heatmap_dir)
heatmap_dir.mkdir(parents=True, exist_ok=True)
report_dir = Path(settings.report_dir)
report_dir.mkdir(parents=True, exist_ok=True)

app = FastAPI(title=settings.app_name, version=settings.app_version, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/heatmaps", StaticFiles(directory=str(heatmap_dir)), name="heatmaps")
app.mount("/reports", StaticFiles(directory=str(report_dir)), name="reports")

app.include_router(auth_router)
app.include_router(predictions_router)


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "DermalAI backend is running"}


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
