import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  FileImage,
  Loader2,
  Moon,
  ScanLine,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Sun,
  Upload,
  X,
  Zap,
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
  differentials: { name: string; p: number }[];
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
    urgencyLabel: "Moderate Urgency",
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
    differentials: [
      { name: "Benign Nevus", p: 0.95 },
      { name: "Dermatofibroma", p: 0.03 },
      { name: "Lentigo", p: 0.02 },
    ],
  },
];

function Index() {
  const [dark, setDark] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  useEffect(() => {
    if (!loading) return;
    setProgress(0);
    const id = window.setInterval(() => {
      setProgress((p) => Math.min(p + Math.random() * 14, 96));
    }, 220);
    return () => window.clearInterval(id);
  }, [loading]);

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
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      {/* Ambient backdrop */}
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-60" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[920px] -translate-x-1/2 rounded-full bg-frost-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 right-0 h-[420px] w-[620px] rounded-full bg-frost-300/30 blur-3xl" />

      {/* Header */}
      <header className="relative z-20 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-deep text-primary-foreground shadow-soft">
              <Stethoscope className="h-5 w-5" />
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-success ring-2 ring-background" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-display text-lg font-semibold tracking-tight">
                Dermal<span className="text-primary">AI</span>
              </span>
              <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Clinical Decision Support · v3.2
              </span>
            </div>
          </div>

          <nav className="hidden items-center gap-1 rounded-full border border-border/60 bg-card/60 p-1 text-sm text-muted-foreground backdrop-blur md:flex">
            <NavLink active>Scan</NavLink>
            <NavLink>Patients</NavLink>
            <NavLink>Reports</NavLink>
            <NavLink>Guidelines</NavLink>
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setDark((v) => !v)}
              className="group inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/70 px-3 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur transition-all hover:border-primary/40 hover:text-foreground"
            >
              <span className="relative flex h-4 w-7 items-center rounded-full bg-secondary px-0.5">
                <span
                  className={cn(
                    "h-3 w-3 rounded-full bg-primary transition-transform",
                    dark ? "translate-x-3" : "translate-x-0",
                  )}
                />
              </span>
              {dark ? (
                <span className="flex items-center gap-1"><Moon className="h-3 w-3" />Clinic</span>
              ) : (
                <span className="flex items-center gap-1"><Sun className="h-3 w-3" />Daylight</span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-6 py-10">
        {/* Hero */}
        <div className="mb-10 flex flex-col items-start gap-4">
          <span className="inline-flex items-center gap-2 rounded-full border border-frost-200 bg-frost-100/60 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-frost-500 backdrop-blur">
            <Sparkles className="h-3 w-3" /> Deep learning · DermNet-v3.2
          </span>
          <h1 className="max-w-3xl font-display text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
            Classify lesions with
            <span className="relative inline-block px-2">
              <span className="absolute inset-x-1 bottom-1 h-3 rounded bg-frost-200/80" />
              <span className="relative text-frost-500">clinical certainty</span>
            </span>
            in seconds.
          </h1>
          <p className="max-w-2xl text-base text-muted-foreground">
            A second pair of eyes for the frontline. Upload a smartphone or dermoscopy image and
            receive an instant probability distribution, urgency triage, and the next clinical step.
          </p>
        </div>

        {/* Bento grid */}
        <div className="grid grid-cols-12 gap-4">
          {/* Upload — large */}
          <div className="col-span-12 lg:col-span-7">
            <Bento className="h-full overflow-hidden p-0">
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-frost-100 text-primary">
                      <ScanLine className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">Patient Image Capture</div>
                      <div className="text-[11px] text-muted-foreground">JPG / PNG · de-identified</div>
                    </div>
                  </div>
                  {file && (
                    <button
                      onClick={reset}
                      className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground transition-colors hover:bg-accent"
                    >
                      <X className="h-3 w-3" /> Clear
                    </button>
                  )}
                </div>

                <div className="flex-1 p-6">
                  {!preview ? (
                    <label
                      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                      onDragLeave={() => setDragging(false)}
                      onDrop={onDrop}
                      className={cn(
                        "group relative flex min-h-[380px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed transition-all",
                        dragging
                          ? "border-primary bg-frost-100/70 scale-[0.995]"
                          : "border-frost-200 bg-gradient-to-br from-frost-50 to-card hover:border-primary/50",
                      )}
                    >
                      <input
                        ref={inputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFile(e.target.files?.[0])}
                      />
                      <div className="pointer-events-none absolute inset-0 bg-grid opacity-40" />
                      <div className="relative flex flex-col items-center">
                        <div className="relative mb-6">
                          <div className="absolute inset-0 animate-pulse-ring rounded-2xl" />
                          <div className={cn(
                            "flex h-18 w-18 items-center justify-center rounded-2xl bg-gradient-deep text-primary-foreground shadow-lift transition-transform",
                            dragging && "scale-110 rotate-3",
                          )}
                          style={{ width: 72, height: 72 }}>
                            <Upload className="h-7 w-7" />
                          </div>
                        </div>
                        <p className="font-display text-xl font-semibold tracking-tight">
                          Drop a lesion image
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          or <span className="font-medium text-primary underline-offset-4 hover:underline">browse files</span> from your device
                        </p>

                        <div className="mt-8 flex flex-wrap items-center justify-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                          <span className="rounded-full border border-border/60 bg-card/80 px-2.5 py-1">HIPAA aware</span>
                          <span className="rounded-full border border-border/60 bg-card/80 px-2.5 py-1">Edge inference</span>
                          <span className="rounded-full border border-border/60 bg-card/80 px-2.5 py-1">Audit logged</span>
                        </div>
                      </div>
                    </label>
                  ) : (
                    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-muted">
                      <img src={preview} alt="Uploaded lesion" className="h-[380px] w-full object-cover" />
                      {loading && (
                        <>
                          <div className="absolute inset-0 bg-gradient-to-t from-frost-900/85 via-frost-900/40 to-transparent" />
                          {/* Scanning line */}
                          <div
                            className="absolute left-0 right-0 h-0.5 bg-frost-200 shadow-[0_0_24px_4px_rgba(184,212,232,0.7)] transition-all duration-300"
                            style={{ top: `${progress}%` }}
                          />
                          <div className="absolute inset-x-0 bottom-0 p-6 text-frost-100">
                            <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider">
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              Running Deep Learning Inference
                            </div>
                            <div className="mb-3 font-display text-lg font-semibold">
                              Analyzing 14 dermatoscopic features…
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/15">
                              <div
                                className="h-full rounded-full bg-frost-200 transition-all duration-200"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <div className="mt-1.5 text-[10px] uppercase tracking-wider text-frost-200/80">
                              {Math.round(progress)}% · ensemble of 4 CNNs
                            </div>
                          </div>
                        </>
                      )}
                      {file && !loading && (
                        <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full bg-background/95 px-3 py-1.5 text-xs shadow-soft backdrop-blur">
                          <FileImage className="h-3.5 w-3.5 text-primary" />
                          <span className="font-medium">{file.name}</span>
                          <span className="text-muted-foreground">· {(file.size / 1024).toFixed(0)} KB</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Bento>
          </div>

          {/* Triage banner — wide top right */}
          <div className="col-span-12 lg:col-span-5">
            <TriageBanner result={result} loading={loading} />
          </div>

          {/* Prediction + confidence */}
          <div className="col-span-12 md:col-span-7 lg:col-span-5">
            <PredictionCard result={result} loading={loading} />
          </div>

          {/* Differentials */}
          <div className="col-span-12 md:col-span-5 lg:col-span-3">
            <DifferentialsCard result={result} loading={loading} />
          </div>

          {/* Stats strip */}
          <div className="col-span-12 lg:col-span-4">
            <Bento className="h-full">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-sm font-semibold">Model Telemetry</h4>
                <span className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-success">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" /> Live
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Stat label="AUROC" value="0.946" trend="+0.02" />
                <Stat label="Avg latency" value="1.8s" trend="−0.3s" />
                <Stat label="Sensitivity" value="93.4%" trend="+1.1" />
                <Stat label="Specificity" value="91.2%" trend="+0.4" />
              </div>
            </Bento>
          </div>

          {/* Actions */}
          <div className="col-span-12 md:col-span-7 lg:col-span-5">
            <ActionsCard result={result} loading={loading} />
          </div>

          {/* Hallmarks */}
          <div className="col-span-12 md:col-span-5 lg:col-span-3">
            <HallmarksCard result={result} loading={loading} />
          </div>
        </div>

        <p className="mt-12 text-center text-xs text-muted-foreground">
          DermalAI is a clinical decision support tool. It does not replace professional medical
          judgement. Always correlate with patient history and physical examination.
        </p>
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
        active ? "bg-primary text-primary-foreground shadow-soft" : "hover:text-foreground",
      )}
    >
      {children}
    </a>
  );
}

function Bento({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "relative rounded-2xl border border-border/70 bg-card p-5 shadow-soft transition-shadow hover:shadow-lift",
        className,
      )}
    >
      {children}
    </div>
  );
}

function Stat({ label, value, trend }: { label: string; value: string; trend: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/40 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-xl font-semibold tabular-nums">{value}</div>
      <div className="text-[10px] font-medium text-success">{trend}</div>
    </div>
  );
}

const URGENCY: Record<
  Urgency,
  {
    label: string;
    icon: typeof ShieldAlert;
    bg: string;
    fg: string;
    ring: string;
    bar: string;
  }
> = {
  critical: {
    label: "CRITICAL",
    icon: ShieldAlert,
    bg: "bg-[color:var(--critical)]/10",
    fg: "text-[color:var(--critical)]",
    ring: "ring-[color:var(--critical)]/30",
    bar: "bg-[color:var(--critical)]",
  },
  warning: {
    label: "MODERATE",
    icon: AlertTriangle,
    bg: "bg-[color:var(--warning)]/12",
    fg: "text-[color:var(--warning)]",
    ring: "ring-[color:var(--warning)]/35",
    bar: "bg-[color:var(--warning)]",
  },
  safe: {
    label: "ROUTINE",
    icon: ShieldCheck,
    bg: "bg-[color:var(--success)]/12",
    fg: "text-[color:var(--success)]",
    ring: "ring-[color:var(--success)]/30",
    bar: "bg-[color:var(--success)]",
  },
};

function TriageBanner({ result, loading }: { result: Result | null; loading: boolean }) {
  if (!result) {
    return (
      <Bento className="h-full">
        <div className="flex h-full items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-frost-100 text-primary">
            <Activity className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Triage Status
            </div>
            <div className="font-display text-xl font-semibold">
              {loading ? "Awaiting model output…" : "Awaiting image"}
            </div>
            <p className="text-xs text-muted-foreground">
              Upload a lesion image to receive urgency guidance.
            </p>
          </div>
        </div>
      </Bento>
    );
  }

  const u = URGENCY[result.urgency];
  const Icon = u.icon;

  return (
    <div className={cn("relative h-full overflow-hidden rounded-2xl ring-1 shadow-soft", u.bg, u.ring)}>
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-30" />
      <div className="relative flex h-full items-center gap-4 p-5">
        <div className={cn("flex h-14 w-14 items-center justify-center rounded-2xl bg-background/70 shadow-soft", u.fg)}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <div className={cn("flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em]", u.fg)}>
            <Zap className="h-3 w-3" /> {u.label} URGENCY
          </div>
          <div className="font-display text-2xl font-semibold tracking-tight">
            {result.urgencyLabel}
          </div>
          <p className="text-xs text-muted-foreground">{result.summary}</p>
        </div>
      </div>
    </div>
  );
}

function PredictionCard({ result, loading }: { result: Result | null; loading: boolean }) {
  return (
    <Bento className="h-full">
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        Primary Classification
      </div>
      {loading || !result ? (
        <Skeleton lines={2} />
      ) : (
        <>
          <h3 className="font-display text-3xl font-semibold tracking-tight">{result.label}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Highest-probability class across the ensemble.
          </p>
          <div className="mt-5">
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Confidence
              </span>
              <span className="font-display text-3xl font-semibold tabular-nums">
                {Math.round(result.confidence * 100)}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full transition-all duration-700", URGENCY[result.urgency].bar)}
                style={{ width: `${Math.round(result.confidence * 100)}%` }}
              />
            </div>
            <div className="mt-1.5 flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
              <span>Low</span><span>Moderate</span><span>High</span>
            </div>
          </div>
        </>
      )}
    </Bento>
  );
}

function DifferentialsCard({ result, loading }: { result: Result | null; loading: boolean }) {
  return (
    <Bento className="h-full">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-semibold">Differentials</h4>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Top 3</span>
      </div>
      {loading || !result ? (
        <Skeleton lines={3} />
      ) : (
        <ul className="space-y-3">
          {result.differentials.map((d, i) => (
            <li key={d.name}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className={cn("font-medium", i === 0 && "text-foreground", i > 0 && "text-muted-foreground")}>
                  {d.name}
                </span>
                <span className="tabular-nums text-muted-foreground">{Math.round(d.p * 100)}%</span>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full", i === 0 ? URGENCY[result.urgency].bar : "bg-frost-300/60")}
                  style={{ width: `${Math.round(d.p * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Bento>
  );
}

function HallmarksCard({ result, loading }: { result: Result | null; loading: boolean }) {
  return (
    <Bento className="h-full">
      <h4 className="mb-3 text-sm font-semibold">Hallmark Symptoms</h4>
      {loading || !result ? (
        <Skeleton lines={3} />
      ) : (
        <ul className="space-y-2.5">
          {result.hallmarks.map((h) => (
            <li key={h} className="flex gap-2.5 text-xs leading-relaxed">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="text-foreground/85">{h}</span>
            </li>
          ))}
        </ul>
      )}
    </Bento>
  );
}

function ActionsCard({ result, loading }: { result: Result | null; loading: boolean }) {
  return (
    <Bento className="h-full">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-semibold">Recommended Actions</h4>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Guideline-aligned
        </span>
      </div>
      {loading || !result ? (
        <Skeleton lines={3} />
      ) : (
        <>
          <ol className="space-y-2.5">
            {result.actions.map((a, i) => (
              <li key={a} className="flex gap-3 text-sm">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-deep text-[11px] font-semibold text-primary-foreground">
                  {i + 1}
                </span>
                <span className="pt-0.5 text-foreground/85">{a}</span>
              </li>
            ))}
          </ol>
          <div className="mt-5 flex gap-2">
            <Button className="flex-1">Generate Report</Button>
            <Button variant="outline" className="flex-1">Refer Specialist</Button>
          </div>
        </>
      )}
    </Bento>
  );
}

function Skeleton({ lines }: { lines: number }) {
  return (
    <div className="space-y-2.5">
      <div className="h-7 w-3/5 animate-shimmer rounded-md bg-muted" />
      {[...Array(lines)].map((_, i) => (
        <div key={i} className="h-3 w-full animate-shimmer rounded bg-muted" />
      ))}
    </div>
  );
}
