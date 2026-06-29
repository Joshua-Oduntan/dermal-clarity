export type ModelName = "MobileNet" | "VGG19" | "InceptionV3" | "Ensemble";

export type PredictionApiResponse = {
  predicted_class: string;
  confidence: number;
  risk_level: string;
  recommendation: string;
  top_predictions: Array<{ class_name: string; confidence: number }>;
  probabilities: Record<string, number>;
  model_used: string;
  inference_time_ms: number;
  gradcam_url?: string;
  prediction_id?: string;
  gradcam_available?: boolean;
  gradcam_error?: string;
  created_at?: string;
  image_resolution?: string;
  image_filename?: string;
  status?: string;
  backend_version?: string;
  api_version?: string;
  user_id?: number;
  user_name?: string;
};

export type ModelMetricsResponse = {
  model_name: string;
  accuracy: number;
  sensitivity: number;
  specificity: number;
  auc: number;
  inference_time_ms: number;
  input_size: string;
  parameter_count: string;
  architecture: string;
  training_dataset: string;
  advantages: string;
  disadvantages: string;
  speed: string;
  recommended_use: string;
  backend_version: string;
  api_version: string;
};

export type CompareModelResult = {
  name: string;
  predicted_class: string;
  confidence: number;
  inference_time_ms: number;
  top_predictions: Array<{ class_name: string; confidence: number }>;
};

export type CompareResponse = {
  models: CompareModelResult[];
  summary: {
    agreement: boolean;
    majority_prediction: string;
    highest_confidence_model: string;
    fastest_model: string;
  };
};

export type HistoryItem = {
  id: number;
  predicted_class: string;
  confidence: number;
  risk_level: string;
  recommendation: string;
  model_used: string;
  created_at: string;
  gradcam_url?: string;
};

const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  return data as T;
}

export async function predictImage(file: File, modelName: ModelName = "MobileNet") {
  const formData = new FormData();
  formData.append("file", file);

  const url = `${API_BASE_URL}/api/predict?model_name=${encodeURIComponent(modelName)}`;
  const response = await fetch(url, {
    method: "POST",
    body: formData,
  });

  return parseJsonResponse<PredictionApiResponse>(response);
}

export async function fetchModelMetrics(modelName: ModelName) {
  const url = `${API_BASE_URL}/api/model-metrics?model_name=${encodeURIComponent(modelName)}`;
  const response = await fetch(url);
  return parseJsonResponse<ModelMetricsResponse>(response);
}

export async function compareModels(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/api/compare`, {
    method: "POST",
    body: formData,
  });

  return parseJsonResponse<CompareResponse>(response);
}


export async function fetchPredictionHistory() {
  const response = await fetch(`${API_BASE_URL}/api/history`);
  return parseJsonResponse<HistoryItem[]>(response);
}
