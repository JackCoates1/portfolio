import { useEffect, useRef, useState } from "react";
import { History, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Shape of the `notable_replay` object in /security-stats.json. It is a single
// real, historical alert CrowdSec caught and blocked on this server — never
// fabricated client-side. The field itself can be null when no qualifying
// alert has been captured yet.
export interface NotableReplay {
  alert_id: number;
  timestamp: string;
  source_ip: string;
  country: string;
  asn: string;
  scenario: string;
  scenario_label: string;
  method: string;
  path: string;
  http_status: string;
  user_agent: string;
  decision_type: string;
}

interface AttackReplayProps {
  replay: NotableReplay | null;
}

type StageAccent = "info" | "warning" | "blocked";
type StepState = "active" | "done" | "pending";

interface StageRow {
  label: string;
  value: string;
}

interface StageDefinition {
  id: "request" | "enriched" | "matched" | "blocked";
  step: number;
  shortTitle: string;
  title: string;
  note: string;
  accent: StageAccent;
  rows: StageRow[];
}

// ~1s per stage — enough to read each step without dragging.
const STAGE_MS = 1000;

const STATUS_TOKEN: Record<StageAccent, string> = {
  info: "hsl(var(--status-info))",
  warning: "hsl(var(--status-warning))",
  blocked: "hsl(var(--status-blocked))",
};

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

// Absolute, UTC so it reads identically for every visitor.
const formatCapturedAt = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()} · ${hh}:${mm} UTC`;
};

const buildStages = (replay: NotableReplay): StageDefinition[] => [
  {
    id: "request",
    step: 1,
    shortTitle: "Request",
    title: "Request received",
    accent: "info",
    note: "This is what hit the server — the raw request CrowdSec parsed from the access log.",
    rows: [
      { label: "Method", value: replay.method },
      { label: "Path", value: replay.path },
      { label: "Source IP", value: replay.source_ip },
      { label: "Country", value: replay.country },
      { label: "ASN", value: replay.asn },
      { label: "User agent", value: replay.user_agent },
    ],
  },
  {
    id: "enriched",
    step: 2,
    shortTitle: "Enriched",
    title: "Parsed & enriched",
    accent: "info",
    note: "CrowdSec parsed the request and matched it against its scenario database.",
    rows: [
      { label: "Matched pattern", value: replay.scenario_label },
      { label: "HTTP status", value: replay.http_status },
    ],
  },
  {
    id: "matched",
    step: 3,
    shortTitle: "Matched",
    title: "Scenario matched",
    accent: "warning",
    note: "CrowdSec identified this as a known attack pattern.",
    rows: [{ label: "Scenario", value: replay.scenario }],
  },
  {
    id: "blocked",
    step: 4,
    shortTitle: "Blocked",
    title: "Blocked",
    accent: "blocked",
    note: "Resolved — the decision was applied and the attacker's IP is now blocked at the firewall.",
    rows: [
      { label: "Decision", value: replay.decision_type.toUpperCase() },
      { label: "Attacker IP", value: replay.source_ip },
    ],
  },
];

const AttackReplay = ({ replay }: AttackReplayProps) => {
  const [activeStage, setActiveStage] = useState<number>(-1);
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  if (!replay) {
    return (
      <div className="mt-6 bg-card border border-border rounded-lg card-glow overflow-hidden">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <History className="h-3.5 w-3.5 text-primary" />
            <span className="label-micro">Notable Attack Replay</span>
          </div>
          <p className="text-sm text-muted-foreground">
            No notable attack captured recently. CrowdSec is still watching the
            traffic behind this site — when a qualifying alert fires, it will
            appear here.
          </p>
        </div>
      </div>
    );
  }

  const stages = buildStages(replay);
  const isComplete = activeStage === stages.length;
  const currentStage =
    activeStage === -1 ? null : stages[Math.min(activeStage, stages.length - 1)];

  const stepState = (index: number): StepState => {
    if (activeStage === index) return "active";
    if (activeStage > index) return "done";
    return "pending";
  };

  const stepDotColor = (index: number): string => {
    const state = stepState(index);
    if (state === "active") return "hsl(var(--status-warning))";
    if (state === "done") {
      return index === stages.length - 1
        ? "hsl(var(--status-blocked))"
        : "hsl(var(--status-info))";
    }
    return "hsl(var(--muted-foreground))";
  };

  // Purely client-side: no requests are fired. Re-clicking mid-run simply
  // clears the pending timers and restarts the sequence, so there is no
  // cooldown and no rate-limit to manage.
  const startReplay = () => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
    setActiveStage(0);

    stages.forEach((_, index) => {
      if (index < stages.length - 1) {
        const id = window.setTimeout(
          () => setActiveStage(index + 1),
          (index + 1) * STAGE_MS,
        );
        timersRef.current.push(id);
      }
    });

    const doneId = window.setTimeout(
      () => setActiveStage(stages.length),
      stages.length * STAGE_MS,
    );
    timersRef.current.push(doneId);
  };

  return (
    <div className="mt-6 bg-card border border-border rounded-lg card-glow overflow-hidden">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-3">
          <History className="h-3.5 w-3.5 text-primary" />
          <span className="label-micro">Notable Attack Replay</span>
        </div>

        <p className="font-data text-[11px] text-muted-foreground mb-3">
          CAPTURED {formatCapturedAt(replay.timestamp)} · ALERT #{replay.alert_id}
        </p>

        <p className="text-sm text-muted-foreground mb-4 max-w-3xl">
          A real request CrowdSec caught and blocked on this server, replayed from
          the captured data. This is a client-side animation of an already-resolved
          event — no requests are sent.
        </p>

        <Button onClick={startReplay} variant="outline" size="sm">
          <RotateCcw className="h-4 w-4" />
          Replay this attack
        </Button>

        <ol className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {stages.map((stage, index) => {
            const state = stepState(index);
            return (
              <li
                key={stage.id}
                className={cn(
                  "flex items-center gap-2 rounded-md border border-border bg-secondary/30 px-2.5 py-2 min-w-0",
                  state === "pending" && "opacity-60",
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 shrink-0 rounded-full",
                    state === "active" && "animate-pulse",
                  )}
                  style={{ backgroundColor: stepDotColor(index) }}
                />
                <span
                  className={cn(
                    "font-data text-[10px] uppercase tracking-wider truncate",
                    state === "active" ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {String(stage.step).padStart(2, "0")} {stage.shortTitle}
                </span>
              </li>
            );
          })}
        </ol>

        <div className="mt-4 min-h-[260px]" aria-live="polite">
          {currentStage === null ? (
            <p className="text-sm text-muted-foreground font-data">
              Press “Replay this attack” to step through the sequence.
            </p>
          ) : (
            <div
              key={activeStage}
              className="animate-fade-in-up rounded-md border border-border bg-secondary/20 p-4"
            >
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="label-micro"
                  style={{ color: STATUS_TOKEN[currentStage.accent] }}
                >
                  {String(currentStage.step).padStart(2, "0")} /{" "}
                  {String(stages.length).padStart(2, "0")} · {currentStage.title}
                </span>
                {isComplete && (
                  <span className="font-data text-[10px] uppercase tracking-wider text-muted-foreground">
                    resolved
                  </span>
                )}
              </div>

              <p className="text-sm text-muted-foreground mb-3">{currentStage.note}</p>

              <dl className="space-y-2">
                {currentStage.rows.map((row) => (
                  <div key={row.label} className="flex items-baseline gap-3">
                    <dt className="font-data text-[10px] uppercase tracking-wider text-muted-foreground w-24 sm:w-36 shrink-0">
                      {row.label}
                    </dt>
                    <dd className="font-data text-xs text-foreground break-all">
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttackReplay;
