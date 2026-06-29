export type ModelName = "MobileNet" | "VGG19" | "InceptionV3";

export type PredictionApiResponse = {
  predicted_class: string;
  confidence: number;
  risk_level: string;
  recommendation: string;
  top_predictions: Array<{ class_name: string; confidence: number }>;
  probabilities: Record<string, number>;
  model_used: string;
  inference_time_ms: number;
};

const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

export async function predictImage(file: File, modelName: ModelName = "MobileNet") {
  const formData = new FormData();
  formData.append("file", file);

  const url = `${API_BASE_URL}/api/predict?model_name=${encodeURIComponent(modelName)}`;
  const response = await fetch(url, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Prediction request failed (${response.status})`);
  }

  return (await response.json()) as PredictionApiResponse;
}
