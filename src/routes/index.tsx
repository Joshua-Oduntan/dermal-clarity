import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  FileImage,
  Loader2,
  Moon,
  ShieldAlert,
  Stethoscope,
  Sun,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DermalAI — Clinical Skin Lesion Classification" },
      {
        name: "description",
        content:
          "AI-assisted triage for skin lesions. Upload a clinical image and receive instant deep learning analysis with urgency guidance.",
      },
      { property: "og:title", content: "DermalAI — Skin Lesion Classification" },
      {
        property: "og:description",
        content: "AI-assisted triage for skin lesions with urgency guidance.",
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
};

const MOCK_RESULTS: Result[] = [
  {
    label: "Melanoma",
    confidence: 0.92,
    urgency: "critical",
    urgencyLabel: "Critical Urgency",
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
  },
  {
    label: "Actinic Keratosis",
    confidence: 0.78,
    urgency: "warning",
    urgencyLabel: "Moderate Urgency",
    summary: "Pre-cancerous lesion likely. Monitoring required.",
    hallmarks: [
      "Rough, scaly patch on sun-exposed skin",
      "Erythematous base with hyperkeratosis",
      "Patient over 50 with chronic UV exposure",
    ],
    actions: [
      "Schedule dermatology follow-up within 4 weeks",
      "Consider cryotherapy or topical 5-FU",
      "Counsel on broad-spectrum sun protection",
    ],
  },
  {
    label: "Benign Nevus",
    confidence: 0.95,
    urgency: "safe",
    urgencyLabel: "Routine Monitoring",
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
  },
];

function Index() {
  const [dark, setDark] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const handleFile = useCallback((f: File | undefined | null) => {
    if (!f) return;
    setFile(f);
    setResult(null);
    const url = URL.createObjectURL(f);
    setPreview(url);
    setLoading(true);
    // Simulated inference
    window.setTimeout(() => {
      const pick = MOCK_RESULTS[Math.floor(Math.random() * MOCK_RESULTS.length)];
      setResult(pick);
      setLoading(false);
    }, 2200);
  }, []);

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
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-lg font-semibold tracking-tight">
                Dermal<span className="text-primary">AI</span>
              </span>
              <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Clinical Decision Support
              </span>
            </div>
          </div>

          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a className="hover:text-foreground" href="#">Dashboard</a>
            <a className="hover:text-foreground" href="#">Patients</a>
            <a className="hover:text-foreground" href="#">Reports</a>
            <a className="hover:text-foreground" href="#">Guidelines</a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setDark((v) => !v)}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Toggle clinic view"
            >
              {dark ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
              {dark ? "Clinic View" : "Daylight View"}
            </button>
            <div className="hidden h-9 items-center gap-2 rounded-full bg-secondary px-3 text-xs font-medium text-secondary-foreground sm:flex">
              <div className="h-2 w-2 rounded-full bg-success" />
              Model v3.2 · Online
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        {/* Page intro */}
        <div className="mb-8 flex flex-col gap-2">
          <p className="text-xs uppercase tracking-[0.2em] text-primary">New Examination</p>
          <h1 className="font-display text-4xl tracking-tight md:text-5xl">
            Capture, classify and triage skin lesions in seconds.
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Upload a smartphone or dermoscopy image. Our deep learning model returns a probability
            distribution and recommends a triage pathway aligned to clinical guidelines.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Upload area */}
          <section className="lg:col-span-3">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold">Patient Image</h2>
                  <p className="text-xs text-muted-foreground">
                    JPG or PNG · max 10 MB · de-identified images only
                  </p>
                </div>
                {file && (
                  <button
                    onClick={reset}
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" /> Clear
                  </button>
                )}
              </div>

              {!preview ? (
                <label
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={onDrop}
                  className={cn(
                    "group flex min-h-[360px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed bg-muted/40 text-center transition-all",
                    dragging
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50 hover:bg-muted/70",
                  )}
                >
                  <input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFile(e.target.files?.[0])}
                  />
                  <div
                    className={cn(
                      "mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform",
                      dragging && "scale-110",
                    )}
                  >
                    <Upload className="h-7 w-7" />
                  </div>
                  <p className="text-base font-medium">
                    Drop a lesion image here, or <span className="text-primary">browse</span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Capture from at least 10 cm with even lighting for best accuracy.
                  </p>

                  <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <span className="rounded-full bg-secondary px-3 py-1">HIPAA aware</span>
                    <span className="rounded-full bg-secondary px-3 py-1">Edge inference</span>
                    <span className="rounded-full bg-secondary px-3 py-1">Audit logged</span>
                  </div>
                </label>
              ) : (
                <div className="relative overflow-hidden rounded-xl border border-border bg-muted">
                  <img
                    src={preview}
                    alt="Uploaded lesion"
                    className="h-[360px] w-full object-cover"
                  />
                  {loading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-sm">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-sm font-medium">Running Deep Learning Inference…</p>
                      <p className="text-xs text-muted-foreground">
                        Analyzing 14 dermatoscopic features
                      </p>
                    </div>
                  )}
                  {file && !loading && (
                    <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full bg-background/90 px-3 py-1.5 text-xs shadow">
                      <FileImage className="h-3.5 w-3.5 text-primary" />
                      <span className="font-medium">{file.name}</span>
                      <span className="text-muted-foreground">
                        · {(file.size / 1024).toFixed(0)} KB
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-4 grid grid-cols-3 gap-3 text-center text-xs">
                <Metric label="Model" value="DermNet-v3.2" />
                <Metric label="Avg latency" value="1.8s" />
                <Metric label="AUROC" value="0.946" />
              </div>
            </div>
          </section>

          {/* Results */}
          <section className="lg:col-span-2">
            <div className="sticky top-24">
              {!result && !loading && <EmptyResults />}
              {loading && <LoadingResults />}
              {result && !loading && <ResultsPanel result={result} />}
            </div>
          </section>
        </div>

        <p className="mt-10 text-center text-xs text-muted-foreground">
          DermalAI is a clinical decision support tool. It does not replace professional medical
          judgement. Always correlate with patient history and physical examination.
        </p>
      </main>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/50 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}

function EmptyResults() {
  return (
    <div className="flex min-h-[440px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/60 p-8 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-primary">
        <Activity className="h-6 w-6" />
      </div>
      <h3 className="text-base font-semibold">Awaiting image</h3>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">
        Once you upload a lesion image, classification, confidence and triage guidance will
        appear here.
      </p>
    </div>
  );
}

function LoadingResults() {
  return (
    <div className="min-h-[440px] rounded-2xl border border-border bg-card p-6">
      <div className="mb-6 h-4 w-32 animate-pulse rounded bg-muted" />
      <div className="mb-3 h-8 w-56 animate-pulse rounded bg-muted" />
      <div className="mb-8 h-3 w-full animate-pulse rounded bg-muted" />
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-3 w-full animate-pulse rounded bg-muted" />
        ))}
      </div>
    </div>
  );
}

const URGENCY_STYLES: Record<Urgency, { bg: string; text: string; ring: string; icon: typeof ShieldAlert }> = {
  critical: {
    bg: "bg-critical/10",
    text: "text-critical",
    ring: "ring-critical/30",
    icon: ShieldAlert,
  },
  warning: {
    bg: "bg-warning/15",
    text: "text-warning-foreground",
    ring: "ring-warning/40",
    icon: AlertTriangle,
  },
  safe: {
    bg: "bg-success/15",
    text: "text-success-foreground",
    ring: "ring-success/40",
    icon: CheckCircle2,
  },
};

function ResultsPanel({ result }: { result: Result }) {
  const u = URGENCY_STYLES[result.urgency];
  const Icon = u.icon;
  const pct = Math.round(result.confidence * 100);

  return (
    <div className="space-y-4">
      {/* Triage banner */}
      <div
        className={cn(
          "flex items-center gap-3 rounded-2xl px-5 py-4 ring-1",
          u.bg,
          u.ring,
        )}
      >
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl bg-background/60", u.text)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className={cn("text-[10px] font-bold uppercase tracking-[0.18em]", u.text)}>
            Triage
          </div>
          <div className="text-base font-semibold">{result.urgencyLabel}</div>
        </div>
      </div>

      {/* Prediction card */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Primary Classification
        </p>
        <h3 className="mt-1 font-display text-3xl tracking-tight">{result.label}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{result.summary}</p>

        {/* Confidence gauge */}
        <div className="mt-5">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-xs font-medium text-muted-foreground">Confidence</span>
            <span className="text-2xl font-semibold tabular-nums">{pct}%</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-700",
                result.urgency === "critical" && "bg-critical",
                result.urgency === "warning" && "bg-warning",
                result.urgency === "safe" && "bg-success",
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-1.5 flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
            <span>Low</span>
            <span>Moderate</span>
            <span>High</span>
          </div>
        </div>
      </div>

      {/* Hallmarks + actions */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h4 className="text-sm font-semibold">Hallmark Symptoms</h4>
        <ul className="mt-3 space-y-2">
          {result.hallmarks.map((h) => (
            <li key={h} className="flex gap-2.5 text-sm">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span className="text-foreground/80">{h}</span>
            </li>
          ))}
        </ul>

        <div className="my-5 h-px bg-border" />

        <h4 className="text-sm font-semibold">Recommended Actions</h4>
        <ol className="mt-3 space-y-2.5">
          {result.actions.map((a, i) => (
            <li key={a} className="flex gap-3 text-sm">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                {i + 1}
              </span>
              <span className="text-foreground/80">{a}</span>
            </li>
          ))}
        </ol>

        <div className="mt-5 flex gap-2">
          <Button className="flex-1">Generate Report</Button>
          <Button variant="outline" className="flex-1">
            Refer Specialist
          </Button>
        </div>
      </div>
    </div>
  );
}
