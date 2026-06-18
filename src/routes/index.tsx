import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Camera,
  CameraOff,
  CheckCircle2,
  FileImage,
  Loader2,
  Moon,
  RefreshCw,
  ScanLine,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Sun,
  Upload,
  X,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DermalAI — Neural Diagnostic Interface" },
      {
        name: "description",
        content:
          "Clinical-grade AI for skin lesion classification. Upload a dermoscopic image and receive instant triage, differentials, and recommended next steps.",
      },
      { property: "og:title", content: "DermalAI — Neural Diagnostic Interface" },
      {
        property: "og:description",
        content: "Clinical-grade AI for skin lesion classification with urgency triage.",
      },
    ],
  }),
  component: Index,
});

type Urgency = "critical" | "warning" | "safe";

type Result = {
  label: string;
  confidence: number;
  urgency: Urgency;
  urgencyLabel: string;
  summary: string;
  hallmarks: string[];
  actions: string[];
  differentials: { name: string; p: number }[];
};

const MOCK_RESULTS: Result[] = [
  {
    label: "Melanoma",
    confidence: 0.92,
    urgency: "critical",
    urgencyLabel: "Critical · Refer 48h",
    summary: "Features consistent with malignant melanoma detected.",
    hallmarks: [
      "Asymmetric border with irregular pigmentation",
      "Diameter exceeding 6 mm with recent growth",
      "Multiple color tones (brown, black, red)",
    ],
    actions: [
      "Refer to dermatology within 48 hours",
      "Order excisional biopsy for histopathology",
      "Document lesion with calibrated dermoscopy",
    ],
    differentials: [
      { name: "Melanoma", p: 0.92 },
      { name: "Dysplastic nevus", p: 0.05 },
      { name: "Seborrheic keratosis", p: 0.03 },
    ],
  },
  {
    label: "Actinic Keratosis",
    confidence: 0.78,
    urgency: "warning",
    urgencyLabel: "Moderate · Follow-up 4w",
    summary: "Pre-cancerous lesion likely. Monitoring required.",
    hallmarks: [
      "Rough, scaly patch on sun-exposed skin",
      "Erythematous base with hyperkeratosis",
      "Chronic UV exposure indicated",
    ],
    actions: [
      "Schedule dermatology follow-up within 4 weeks",
      "Consider cryotherapy or topical 5-FU",
      "Counsel on broad-spectrum sun protection",
    ],
    differentials: [
      { name: "Actinic Keratosis", p: 0.78 },
      { name: "Squamous cell carcinoma", p: 0.14 },
      { name: "Seborrheic keratosis", p: 0.08 },
    ],
  },
  {
    label: "Melanocytic Nevus",
    confidence: 0.95,
    urgency: "safe",
    urgencyLabel: "Routine · Monitor",
    summary: "No malignant features detected. Lesion appears benign.",
    hallmarks: [
      "Symmetric round shape with uniform color",
      "Stable size under 6 mm",
      "Smooth, well-defined border",
    ],
    actions: [
      "Routine self-examination every 3 months",
      "Re-image if any change in size or color",
      "Annual skin check recommended",
    ],
    differentials: [
      { name: "Melanocytic Nevus", p: 0.95 },
      { name: "Dermatofibroma", p: 0.03 },
      { name: "Lentigo", p: 0.02 },
    ],
  },
];

function Index() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [mode, setMode] = useState<"upload" | "camera">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const saved = (typeof window !== "undefined" && localStorage.getItem("dermalai-theme")) as
      | "dark"
      | "light"
      | null;
    if (saved) setTheme(saved);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("light", theme === "light");
    root.classList.toggle("dark", theme === "dark");
    localStorage.setItem("dermalai-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!loading) return;
    setProgress(0);
    const id = window.setInterval(() => {
      setProgress((p) => Math.min(p + Math.random() * 12, 96));
    }, 200);
    return () => window.clearInterval(id);
  }, [loading]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCameraOn(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Camera unavailable";
      setCameraError(msg);
      setCameraOn(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (mode === "camera" && !cameraOn && !preview) {
      void startCamera();
    }
    if (mode === "upload") {
      stopCamera();
    }
  }, [mode, cameraOn, preview, startCamera, stopCamera]);

  const handleFile = useCallback((f: File | undefined | null) => {
    if (!f) return;
    setFile(f);
    setResult(null);
    const url = URL.createObjectURL(f);
    setPreview(url);
    setLoading(true);
    window.setTimeout(() => {
      const pick = MOCK_RESULTS[Math.floor(Math.random() * MOCK_RESULTS.length)];
      setResult(pick);
      setProgress(100);
      setLoading(false);
    }, 2400);
  }, []);

  const snapPhoto = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const f = new File([blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" });
      stopCamera();
      handleFile(f);
    }, "image/jpeg", 0.92);
  }, [handleFile, stopCamera]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setLoading(false);
    setProgress(0);
    if (inputRef.current) inputRef.current.value = "";
    if (mode === "camera") void startCamera();
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      {/* Ambient atmosphere */}
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-50" />
      <div className="pointer-events-none absolute top-[-200px] left-[15%] h-[600px] w-[600px] rounded-full bg-cyan-500/10 blur-[140px] animate-float-glow" />
      <div className="pointer-events-none absolute bottom-[-200px] right-[10%] h-[700px] w-[700px] rounded-full bg-blue-600/10 blur-[160px] animate-float-glow" style={{ animationDelay: "4s" }} />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/80" />

      {/* Header */}
      <header className="relative z-20 border-b border-white/5 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-cyan/20 bg-cyan/10">
              <span className="h-2 w-2 rounded-full bg-cyan animate-pulse-dot drop-shadow-cyan" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-display text-lg font-bold tracking-tight">
                Dermal<span className="text-cyan/80 font-normal">AI</span>{" "}
                <span className="text-cyan/70 font-normal">v3.2</span>
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                Neural Diagnostic Interface
              </span>
            </div>
          </div>

          <nav className="hidden items-center gap-1 rounded-full glass p-1 text-sm text-slate-400 md:flex">
            <NavLink active>Scan</NavLink>
            <NavLink>Patients</NavLink>
            <NavLink>Reports</NavLink>
            <NavLink>Models</NavLink>
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
              aria-label="Toggle theme"
              className="group relative flex h-9 w-16 items-center rounded-full glass p-1 transition-colors hover:border-cyan/30"
            >
              <span
                className={cn(
                  "absolute flex h-7 w-7 items-center justify-center rounded-full bg-cyan text-slate-950 transition-transform duration-300 ease-out",
                  theme === "dark" ? "translate-x-0" : "translate-x-7",
                )}
                style={{ boxShadow: "0 0 12px rgba(34,211,238,0.5)" }}
              >
                {theme === "dark" ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
              </span>
              <Sun className={cn("ml-1 h-3.5 w-3.5 transition-opacity", theme === "dark" ? "opacity-30 text-slate-400" : "opacity-0")} />
              <Moon className={cn("ml-auto mr-1 h-3.5 w-3.5 transition-opacity", theme === "light" ? "opacity-30 text-slate-400" : "opacity-0")} />
            </button>
            <div className="hidden md:flex items-center gap-2 rounded-full glass px-4 py-2">
              <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse-dot" style={{ boxShadow: "0 0 8px rgba(74,222,128,0.8)" }} />
              <span className="text-xs font-medium text-slate-300">Cloud Engine · Active</span>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-6 py-10">
        {/* Hero */}
        <div className="mb-10 flex flex-col items-start gap-4 animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan/90">
            <Sparkles className="h-3 w-3" /> Ensemble · DermNet-v3.2
          </span>
          <h1 className="max-w-3xl font-display text-4xl font-bold leading-[1.05] tracking-tight md:text-6xl">
            Clinical certainty,
            <br />
            <span className="bg-gradient-to-r from-cyan via-cyan-soft to-foreground bg-clip-text text-transparent">
              rendered in milliseconds.
            </span>
          </h1>
          <p className="max-w-2xl text-base text-slate-400">
            A second pair of eyes for the frontline. Drop a dermoscopic image and receive an
            instant probability distribution, urgency triage, and the next clinical step.
          </p>
        </div>

        {/* Bento grid */}
        <div className="grid grid-cols-12 gap-4 lg:gap-5">
          {/* Hero analysis core */}
          <Card className="col-span-12 lg:col-span-8 lg:row-span-2 flex flex-col p-0 animate-fade-up" style={{ animationDelay: "60ms" }}>
            <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-md border border-cyan/20 bg-cyan/10 text-cyan">
                  <ScanLine className="h-3.5 w-3.5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-100">Patient Image Capture</div>
                  <div className="text-[11px] text-slate-500">JPG / PNG / DICOM · de-identified</div>
                </div>
              </div>
              {file && (
                <button
                  onClick={reset}
                  className="inline-flex items-center gap-1.5 rounded-full glass px-3 py-1 text-[11px] font-medium text-slate-300 transition-colors hover:text-white"
                >
                  <X className="h-3 w-3" /> Clear
                </button>
              )}
            </div>

            {!preview && (
              <div className="flex items-center gap-1 border-b border-white/5 px-6 py-3">
                <div className="inline-flex items-center gap-1 rounded-full glass p-1 text-xs">
                  <button
                    onClick={() => setMode("upload")}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium transition-colors",
                      mode === "upload"
                        ? "bg-cyan text-slate-950"
                        : "text-slate-400 hover:text-white",
                    )}
                  >
                    <Upload className="h-3.5 w-3.5" /> Upload
                  </button>
                  <button
                    onClick={() => setMode("camera")}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium transition-colors",
                      mode === "camera"
                        ? "bg-cyan text-slate-950"
                        : "text-slate-400 hover:text-white",
                    )}
                  >
                    <Camera className="h-3.5 w-3.5" /> Webcam
                  </button>
                </div>
              </div>
            )}

            <div className="flex-1 p-6">
              {!preview && mode === "upload" && (
                <label
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={onDrop}
                  className={cn(
                    "group relative flex min-h-[420px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed transition-all",
                    dragging
                      ? "border-cyan bg-cyan/5 scale-[0.99]"
                      : "border-white/10 bg-slate-900/40 hover:border-cyan/40 hover:bg-cyan/[0.03]",
                  )}
                >
                  <input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFile(e.target.files?.[0])}
                  />
                  {/* corner brackets */}
                  <div className="pointer-events-none absolute top-6 left-6 h-8 w-8 border-t-2 border-l-2 border-cyan/40" />
                  <div className="pointer-events-none absolute top-6 right-6 h-8 w-8 border-t-2 border-r-2 border-cyan/40" />
                  <div className="pointer-events-none absolute bottom-6 left-6 h-8 w-8 border-b-2 border-l-2 border-cyan/40" />
                  <div className="pointer-events-none absolute bottom-6 right-6 h-8 w-8 border-b-2 border-r-2 border-cyan/40" />
                  <div className="pointer-events-none absolute inset-0 bg-dot opacity-40" />

                  <div className="relative flex flex-col items-center">
                    <div className="relative mb-6">
                      <div className="absolute inset-0 rounded-2xl bg-cyan/20 blur-2xl" />
                      <div className={cn(
                        "relative flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan/30 bg-cyan/10 text-cyan transition-transform",
                        dragging && "scale-110 rotate-3",
                      )}>
                        <Upload className="h-6 w-6" />
                      </div>
                    </div>
                    <p className="font-display text-2xl font-bold tracking-tight text-white">
                      Drop a lesion image
                    </p>
                    <p className="mt-1.5 text-sm text-slate-400">
                      or <span className="font-medium text-cyan underline-offset-4 hover:underline">browse files</span> from your device
                    </p>

                    <div className="mt-8 flex flex-wrap items-center justify-center gap-1.5">
                      {["HIPAA aware", "Edge inference", "Audit logged"].map((t) => (
                        <span key={t} className="rounded-full glass px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </label>
              )}

              {!preview && mode === "camera" && (
                <div className="relative flex min-h-[420px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950">
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    autoPlay
                    className="h-[420px] w-full object-cover"
                  />
                  {/* corner brackets */}
                  <div className="pointer-events-none absolute top-6 left-6 h-10 w-10 border-t-2 border-l-2 border-cyan/60" />
                  <div className="pointer-events-none absolute top-6 right-6 h-10 w-10 border-t-2 border-r-2 border-cyan/60" />
                  <div className="pointer-events-none absolute bottom-6 left-6 h-10 w-10 border-b-2 border-l-2 border-cyan/60" />
                  <div className="pointer-events-none absolute bottom-6 right-6 h-10 w-10 border-b-2 border-r-2 border-cyan/60" />

                  {/* focus reticle */}
                  {cameraOn && (
                    <div className="pointer-events-none absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan/40 shadow-[inset_0_0_40px_rgba(34,211,238,0.15)]" />
                  )}

                  {/* status pill */}
                  <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full glass-strong px-3 py-1.5 text-[11px]">
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full",
                        cameraOn ? "bg-green-400 animate-pulse-dot" : "bg-slate-500",
                      )}
                      style={cameraOn ? { boxShadow: "0 0 8px rgba(74,222,128,0.8)" } : undefined}
                    />
                    <span className="font-medium text-slate-100">
                      {cameraOn ? "Live feed" : "Camera idle"}
                    </span>
                  </div>

                  {!cameraOn && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 p-6 text-center">
                      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan/30 bg-cyan/10 text-cyan">
                        <CameraOff className="h-6 w-6" />
                      </div>
                      <p className="font-display text-lg font-semibold text-white">
                        {cameraError ? "Camera blocked" : "Camera ready"}
                      </p>
                      <p className="mt-1 max-w-xs text-sm text-slate-400">
                        {cameraError ?? "Grant permission to start streaming."}
                      </p>
                      <button
                        onClick={() => void startCamera()}
                        className="mt-4 inline-flex items-center gap-2 rounded-full bg-cyan px-4 py-2 text-xs font-semibold text-slate-950 transition-transform hover:scale-[1.02]"
                      >
                        <Camera className="h-3.5 w-3.5" /> Start camera
                      </button>
                    </div>
                  )}

                  {/* capture controls */}
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-3 bg-gradient-to-t from-slate-950/90 to-transparent p-5">
                    <button
                      onClick={snapPhoto}
                      disabled={!cameraOn}
                      className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-cyan text-slate-950 shadow-[0_0_24px_rgba(34,211,238,0.6)] transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
                      aria-label="Capture photo"
                    >
                      <span className="absolute inset-1 rounded-full border-2 border-slate-950" />
                      <Camera className="relative h-5 w-5" />
                    </button>
                    <button
                      onClick={() => void startCamera()}
                      disabled={!cameraOn}
                      className="inline-flex h-10 items-center gap-1.5 rounded-full glass-strong px-3 text-[11px] font-medium text-slate-200 transition-colors hover:text-white disabled:opacity-40"
                      aria-label="Restart camera"
                    >
                      <RefreshCw className="h-3.5 w-3.5" /> Reset
                    </button>
                  </div>
                </div>
              )}

              {preview && (
                <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950">
                  <img src={preview} alt="Uploaded lesion" className="h-[420px] w-full object-cover" />
                  {/* always-on dermascope overlay */}
                  <div className="pointer-events-none absolute top-6 left-6 h-10 w-10 border-t-2 border-l-2 border-cyan/60" />
                  <div className="pointer-events-none absolute top-6 right-6 h-10 w-10 border-t-2 border-r-2 border-cyan/60" />
                  <div className="pointer-events-none absolute bottom-6 left-6 h-10 w-10 border-b-2 border-l-2 border-cyan/60" />
                  <div className="pointer-events-none absolute bottom-6 right-6 h-10 w-10 border-b-2 border-r-2 border-cyan/60" />

                  {loading && (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-slate-950/20" />
                      <div className="absolute inset-0 overflow-hidden">
                        <div className="absolute left-0 right-0 h-px bg-cyan shadow-[0_0_24px_4px_rgba(34,211,238,0.8)] animate-scan" />
                      </div>
                      <div className="absolute inset-x-0 bottom-0 p-6 text-slate-100">
                        <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-cyan">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Neural inference running
                        </div>
                        <div className="mb-3 font-display text-lg font-semibold">
                          Analyzing 14 dermatoscopic features…
                        </div>
                        <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-cyan transition-all duration-200"
                            style={{ width: `${progress}%`, boxShadow: "0 0 12px rgba(34,211,238,0.7)" }}
                          />
                        </div>
                        <div className="mt-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-400">
                          {Math.round(progress).toString().padStart(2, "0")}% · ensemble of 4 CNNs · 142 ms/inference
                        </div>
                      </div>
                    </>
                  )}
                  {file && !loading && (
                    <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full glass-strong px-3 py-1.5 text-xs">
                      <FileImage className="h-3.5 w-3.5 text-cyan" />
                      <span className="font-medium text-slate-100">{file.name}</span>
                      <span className="text-slate-500">· {(file.size / 1024).toFixed(0)} KB</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>

          {/* Triage banner */}
          <div className="col-span-12 lg:col-span-4 animate-fade-up" style={{ animationDelay: "120ms" }}>
            <TriageBanner result={result} loading={loading} />
          </div>

          {/* Confidence gauge */}
          <div className="col-span-12 md:col-span-6 lg:col-span-4 animate-fade-up" style={{ animationDelay: "180ms" }}>
            <ConfidenceGauge result={result} loading={loading} />
          </div>

          {/* Stats strip */}
          <Card className="col-span-12 md:col-span-6 lg:col-span-4 animate-fade-up" style={{ animationDelay: "220ms" }}>
            <div className="mb-4 flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Model Telemetry</h4>
              <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-green-400">
                <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse-dot" /> Live
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Stat label="AUROC" value="0.946" trend="+0.02" />
              <Stat label="Latency" value="142ms" trend="−18ms" />
              <Stat label="Sensitivity" value="93.4%" trend="+1.1" />
              <Stat label="Specificity" value="91.2%" trend="+0.4" />
            </div>
          </Card>

          {/* Prediction */}
          <div className="col-span-12 md:col-span-6 lg:col-span-4 animate-fade-up" style={{ animationDelay: "260ms" }}>
            <PredictionCard result={result} loading={loading} />
          </div>

          {/* Differentials */}
          <Card className="col-span-12 md:col-span-6 lg:col-span-4 animate-fade-up" style={{ animationDelay: "300ms" }}>
            <div className="mb-4 flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Differentials</h4>
              <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">Top 3</span>
            </div>
            {loading || !result ? (
              <Skeleton lines={3} />
            ) : (
              <ul className="space-y-3.5">
                {result.differentials.map((d, i) => (
                  <li key={d.name}>
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className={cn("font-medium", i === 0 ? "text-white" : "text-slate-400")}>
                        {d.name}
                      </span>
                      <span className="font-mono tabular-nums text-slate-300">{(d.p * 100).toFixed(1)}%</span>
                    </div>
                    <div className="h-1 w-full overflow-hidden rounded-full bg-white/5">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-700",
                          i === 0 ? "bg-cyan" : "bg-white/15",
                        )}
                        style={{
                          width: `${Math.round(d.p * 100)}%`,
                          boxShadow: i === 0 ? "0 0 10px rgba(34,211,238,0.5)" : undefined,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Hallmarks */}
          <Card className="col-span-12 md:col-span-6 lg:col-span-4 animate-fade-up" style={{ animationDelay: "340ms" }}>
            <h4 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Visual Hallmarks</h4>
            {loading || !result ? (
              <Skeleton lines={3} />
            ) : (
              <ul className="space-y-3">
                {result.hallmarks.map((h) => (
                  <li key={h} className="flex gap-3 text-sm leading-relaxed">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan drop-shadow-cyan" />
                    <span className="text-slate-300">{h}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Actions — wide */}
          <Card className="col-span-12 lg:col-span-8 animate-fade-up" style={{ animationDelay: "380ms" }}>
            <div className="mb-4 flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Recommended Actions</h4>
              <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">Guideline-aligned</span>
            </div>
            {loading || !result ? (
              <Skeleton lines={3} />
            ) : (
              <>
                <ol className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  {result.actions.map((a, i) => (
                    <li key={a} className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-cyan/30 bg-cyan/10 font-mono text-[11px] font-bold text-cyan">
                          0{i + 1}
                        </span>
                        <span className="font-mono text-[9px] uppercase tracking-wider text-slate-500">
                          Step
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed text-slate-200">{a}</p>
                    </li>
                  ))}
                </ol>
                <div className="mt-5 flex flex-wrap gap-2">
                  <button className="group inline-flex items-center gap-2 rounded-full bg-cyan px-5 py-2.5 font-display text-sm font-bold tracking-wide text-slate-950 transition-all hover:bg-cyan-soft hover:scale-[1.02]" style={{ boxShadow: "0 0 30px rgba(34,211,238,0.35)" }}>
                    Generate Report
                    <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </button>
                  <button className="inline-flex items-center gap-2 rounded-full glass px-5 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:text-white">
                    Refer Specialist
                  </button>
                </div>
              </>
            )}
          </Card>

          {/* Audit / signature */}
          <Card className="col-span-12 lg:col-span-4 animate-fade-up" style={{ animationDelay: "420ms" }}>
            <h4 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Audit Trail</h4>
            <div className="space-y-3 font-mono text-[11px] text-slate-400">
              <Row k="Session" v="DRM-8842-X0" />
              <Row k="Model" v="DermNet v3.2.1" />
              <Row k="Region" v="us-east-1 · edge" />
              <Row k="Signed" v="✓ Ed25519" />
              <Row k="Timestamp" v="2026-06-17T12:00:00Z" />
            </div>
            <div className="mt-5 rounded-xl border border-cyan/15 bg-cyan/[0.04] p-3">
              <p className="text-[11px] leading-relaxed text-slate-400">
                Clinical decision support. Always correlate with patient history.
              </p>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}

function NavLink({ children, active }: { children: React.ReactNode; active?: boolean }) {
  return (
    <a
      href="#"
      className={cn(
        "rounded-full px-3.5 py-1.5 text-sm transition-colors",
        active ? "bg-cyan/15 text-cyan" : "hover:text-white",
      )}
    >
      {children}
    </a>
  );
}

function Card({
  children,
  className,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={style}
      className={cn(
        "relative rounded-[2rem] glass shadow-card p-6 transition-all hover:border-white/15",
        className,
      )}
    >
      {children}
    </div>
  );
}

function Stat({ label, value, trend }: { label: string; value: string; trend: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
      <div className="font-mono text-[9px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-1 font-display text-xl font-bold tabular-nums text-white">{value}</div>
      <div className="font-mono text-[10px] font-medium text-green-400">{trend}</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between border-b border-white/5 pb-1.5 last:border-0">
      <span className="uppercase tracking-wider text-slate-500">{k}</span>
      <span className="text-slate-200">{v}</span>
    </div>
  );
}

const URGENCY: Record<
  Urgency,
  { label: string; icon: typeof ShieldAlert; tint: string; ring: string; glow: string; chip: string }
> = {
  critical: {
    label: "CRITICAL",
    icon: ShieldAlert,
    tint: "text-red-400",
    ring: "border-red-400/30",
    glow: "rgba(248,113,113,0.4)",
    chip: "bg-red-400/15 text-red-300 border-red-400/30",
  },
  warning: {
    label: "MODERATE",
    icon: AlertTriangle,
    tint: "text-amber-300",
    ring: "border-amber-400/30",
    glow: "rgba(251,191,36,0.35)",
    chip: "bg-amber-400/15 text-amber-200 border-amber-400/30",
  },
  safe: {
    label: "ROUTINE",
    icon: ShieldCheck,
    tint: "text-green-400",
    ring: "border-green-400/30",
    glow: "rgba(74,222,128,0.35)",
    chip: "bg-green-400/15 text-green-300 border-green-400/30",
  },
};

function TriageBanner({ result, loading }: { result: Result | null; loading: boolean }) {
  if (!result) {
    return (
      <Card className="h-full">
        <div className="flex h-full items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-cyan/20 bg-cyan/10 text-cyan">
            <Activity className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
              Triage Status
            </div>
            <div className="font-display text-xl font-semibold text-white">
              {loading ? "Awaiting model output…" : "Awaiting image"}
            </div>
            <p className="text-xs text-slate-400">
              Upload a lesion image to receive urgency guidance.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  const u = URGENCY[result.urgency];
  const Icon = u.icon;

  return (
    <div
      className={cn("relative h-full overflow-hidden rounded-[2rem] glass shadow-card border", u.ring)}
      style={{ boxShadow: `0 0 40px -10px ${u.glow}, var(--shadow-card)` }}
    >
      <div className="pointer-events-none absolute -top-20 -right-20 h-48 w-48 rounded-full blur-3xl" style={{ background: u.glow }} />
      <div className="relative flex h-full items-center gap-4 p-6">
        <div className={cn("flex h-14 w-14 items-center justify-center rounded-2xl border bg-white/5", u.ring, u.tint)}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <div className={cn("flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em]", u.tint)}>
            <Zap className="h-3 w-3" /> {u.label} URGENCY
          </div>
          <div className="font-display text-2xl font-bold tracking-tight text-white">
            {result.urgencyLabel}
          </div>
          <p className="mt-0.5 text-xs text-slate-400">{result.summary}</p>
        </div>
      </div>
    </div>
  );
}

function ConfidenceGauge({ result, loading }: { result: Result | null; loading: boolean }) {
  const pct = result ? Math.round(result.confidence * 100) : 0;
  const r = 80;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;

  return (
    <Card className="h-full">
      <div className="mb-2 flex items-start justify-between">
        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Confidence Matrix</h3>
        <div className="rounded-lg border border-cyan/20 bg-cyan/10 p-1.5 text-cyan">
          <CheckCircle2 className="h-4 w-4" />
        </div>
      </div>

      <div className="flex flex-col items-center py-2">
        <div className="relative flex items-center justify-center">
          <svg className="h-44 w-44 -rotate-90" viewBox="0 0 192 192">
            <circle cx="96" cy="96" r={r} stroke="currentColor" strokeWidth="6" fill="transparent" className="text-white/5" />
            <circle
              cx="96"
              cy="96"
              r={r}
              stroke="currentColor"
              strokeWidth="8"
              strokeLinecap="round"
              fill="transparent"
              strokeDasharray={c}
              strokeDashoffset={loading || !result ? c : offset}
              className="text-cyan drop-shadow-cyan transition-all duration-1000 ease-out"
              style={{ filter: "drop-shadow(0 0 10px rgba(34,211,238,0.5))" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-5xl font-bold tabular-nums text-white">
              {loading ? "—" : pct}
              <span className="text-xl text-slate-400">%</span>
            </span>
            <span className="mt-1 font-mono text-[10px] font-bold uppercase tracking-widest text-cyan/70">
              Reliability
            </span>
          </div>
        </div>
      </div>

      <div className="mt-2 space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-slate-400">Inference latency</span>
          <span className="font-mono text-white">142ms</span>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-white/5">
          <div className="h-full w-[72%] bg-cyan" style={{ boxShadow: "0 0 8px rgba(34,211,238,0.6)" }} />
        </div>
      </div>
    </Card>
  );
}

function PredictionCard({ result, loading }: { result: Result | null; loading: boolean }) {
  return (
    <Card className="h-full relative overflow-hidden">
      <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-cyan/10 blur-3xl" />
      <div className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
        Primary Classification
      </div>
      {loading || !result ? (
        <div className="mt-3"><Skeleton lines={2} /></div>
      ) : (
        <>
          <h3 className="mt-1 font-display text-3xl font-bold tracking-tight text-white">
            {result.label}
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            Highest-probability class across the ensemble.
          </p>
          <div className="mt-5 flex flex-wrap gap-1.5">
            <span className={cn("rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider", URGENCY[result.urgency].chip)}>
              {URGENCY[result.urgency].label}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Dermoscopic
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              ICD · L82
            </span>
          </div>
        </>
      )}
    </Card>
  );
}

function Skeleton({ lines }: { lines: number }) {
  return (
    <div className="space-y-2.5">
      <div className="h-7 w-3/5 animate-shimmer rounded-md bg-white/5" />
      {[...Array(lines)].map((_, i) => (
        <div key={i} className="h-3 w-full animate-shimmer rounded bg-white/5" />
      ))}
    </div>
  );
}
