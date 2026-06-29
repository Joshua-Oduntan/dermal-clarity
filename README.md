# DermalAI — Neural Diagnostic Interface

A clinical-grade AI system for skin lesion classification using ensemble deep learning models. Upload a dermoscopic image and receive instant triage, differentials, and recommended next steps.

---

## Overview

**DermalAI** consists of:

- **Backend**: FastAPI server with TensorFlow/Keras ensemble models, Grad-CAM visualization, and SQLAlchemy ORM
- **Frontend**: React 19 + TypeScript with TanStack Router, Vite, and Tailwind CSS

The system provides:
- Multi-model ensemble predictions (MobileNet, VGG19, InceptionV3)
- Risk stratification and urgency triage
- Grad-CAM heatmap generation
- Model comparison
- RESTful API endpoints

---

## Prerequisites

### System Requirements

- **Python 3.10+**
- **Node.js 18+** and npm 9+
- **4GB RAM minimum** (8GB+ recommended for ML models)
- **Disk space**: ~2GB for TensorFlow models

### Optional

- Virtual environment tool (venv, conda, or similar)
- Git for version control

---

## Quick Start

### 1. Clone & Navigate

```bash
cd /path/to/dermal-clarity
```

### 2. Backend Setup

#### Install Python Dependencies

```bash
cd backend

# Create a virtual environment
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

#### Configure Environment (Optional)

Create a `.env` file in the `backend/` directory if you need custom settings:

```env
DATABASE_URL=sqlite:///./dermalai.db
API_PORT=8000
API_HOST=0.0.0.0
DEBUG=false
```

#### Run Backend Server

```bash
# Ensure you're in the backend/ directory with .venv activated
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The backend will start at: **http://localhost:8000**

API docs available at: **http://localhost:8000/docs**

### 3. Frontend Setup

In a new terminal, navigate to the frontend:

```bash
cd frontend

# Install dependencies
npm install
```

#### Configure Environment (Optional)

The frontend connects to the backend via the `VITE_API_URL` environment variable. By default it uses `http://127.0.0.1:8000`. To customize:

```bash
export VITE_API_URL=http://localhost:8000
```

Or set it in a `.env` file:

```env
VITE_API_URL=http://localhost:8000
```

#### Run Frontend Development Server

```bash
# Ensure you're in the frontend/ directory
npm run dev
```

The frontend will start at: **http://localhost:5173** (or next available port)

---

## Accessing the Application

Once both servers are running:

1. Open your browser to **http://localhost:5173** (or the port shown in the terminal)
2. Upload a dermoscopic image (JPG, PNG)
3. Select a model from the dropdown
4. View the prediction results, triage, and recommendations

### Backend API

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Key Endpoints

- `POST /api/predict` — Submit an image for prediction
- `POST /api/compare` — Compare predictions across models
- `GET /api/history` — Fetch prediction history
- `GET /api/model-metrics` — Get model performance metrics

---

## Development Commands

### Backend

```bash
cd backend

# Run server with auto-reload
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Run tests
pytest tests/

# Format code
black .

# Lint
flake8 .
```

### Frontend

```bash
cd frontend

# Development server with hot module replacement
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint and format
npm run lint
npm run format
```

---

## Project Structure

```
dermal-clarity/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── routers/       # API endpoints
│   │   ├── ml/
│   │   │   ├── predictor.py   # Ensemble prediction logic
│   │   │   └── model_loader.py # Model initialization
│   │   ├── schemas/           # Pydantic request/response models
│   │   ├── services/          # Business logic
│   │   └── database/          # SQLAlchemy setup
│   ├── main.py                # FastAPI app entry point
│   ├── requirements.txt        # Python dependencies
│   └── uploads/               # Temporary image storage
│
├── frontend/
│   ├── src/
│   │   ├── routes/
│   │   │   └── index.tsx      # Main dashboard page
│   │   ├── components/
│   │   │   └── ui/            # shadcn/ui components
│   │   ├── lib/
│   │   │   ├── api.ts         # Backend API wrapper
│   │   │   └── utils.ts       # Utility functions
│   │   └── styles.css         # Global styles
│   ├── package.json           # JavaScript dependencies
│   ├── vite.config.ts         # Vite configuration
│   └── tsconfig.json          # TypeScript configuration
│
└── README.md (this file)
```

---

## Troubleshooting

### Backend Issues

#### Models Not Loading

```
Error: Failed to preload models during startup
```

**Solution**: Models are loaded on-demand if not available at startup. The first prediction may take 30-60 seconds.

#### Port Already in Use

```
Address already in use: ('0.0.0.0', 8000)
```

**Solution**: Use a different port:

```bash
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

Then update `VITE_API_URL` in the frontend to match.

#### Database Connection Error

**Solution**: Ensure the `database/` directory exists and is writable. The system creates a local SQLite database by default.

### Frontend Issues

#### Port Already in Use

```
Port 5173 is in use. Try another one? (y/n)
```

Press `y` or specify a custom port:

```bash
npm run dev -- --port 3000
```

#### Cannot Connect to Backend

```
Failed to fetch from http://localhost:8000
```

**Solution**:
1. Verify the backend is running
2. Check `VITE_API_URL` matches the backend port
3. Ensure CORS is enabled on the backend (it is by default)

#### Module Not Found

```
Cannot find module '@/lib/utils'
```

**Solution**: This indicates TypeScript path resolution issue. Ensure `tsconfig.json` is correctly configured and dependencies are installed:

```bash
npm install
npm run build
```

### General

#### Slow Predictions

First prediction is slow (30-60s) while models load. Subsequent predictions are faster (~100-200ms).

#### Out of Memory

If running on limited hardware, consider:
- Reducing model ensemble size (backend config)
- Running on a machine with 8GB+ RAM
- Closing other applications

---

## API Response Example

### Prediction Response

```json
{
  "predicted_class": "benign_nevus",
  "confidence": 0.94,
  "risk_level": "Low",
  "recommendation": "Routine monitoring recommended. No urgent action required.",
  "top_predictions": [
    { "class_name": "benign_nevus", "confidence": 0.94 },
    { "class_name": "melanoma", "confidence": 0.04 },
    { "class_name": "basal_cell_carcinoma", "confidence": 0.02 }
  ],
  "model_used": "Ensemble",
  "inference_time_ms": 142,
  "created_at": "2026-06-29T10:15:30Z"
}
```

---

## Contributing

For development:

1. Create a feature branch
2. Make changes in both backend and/or frontend as needed
3. Test thoroughly with `npm run build` (frontend) and `pytest` (backend)
4. Ensure linting passes (`eslint` / `flake8`)
5. Commit with clear messages

---

## License

Proprietary — DermalAI Clinical System

---

## Support

For issues or questions:
- Check the troubleshooting section above
- Review API docs at http://localhost:8000/docs
- Inspect browser console for frontend errors

---

**Version**: 3.2  
**Last Updated**: 2026-06-29
