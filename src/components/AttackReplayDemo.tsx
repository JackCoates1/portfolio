import { useEffect, useRef, useState } from "react";
import { Play, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

const COOLDOWN_MS = 60_000;
const FIRE_INTERVAL_MS = 350;
const STORAGE_KEY = "attack-replay-last-run";

// Fixed list of well-known scanner-bait paths. None of these exist on this
// site (they all 404), which is exactly the point: CrowdSec flags the
// *pattern* of probing them in the nginx access log, not the HTTP response.
const DEMO_PATHS = [
  "/wp-login.php",
  "/.env",
  "/admin/config.php",
  "/xmlrpc.php",
  "/.git/config",
] as const;

type DemoPath = (typeof DEMO_PATHS)[number];

type SimulationPhase =
  | { status: "idle" }
  | { status: "firing"; activeIndex: number }
  | { status: "done" };

type PathStatus = "sent" | "active" | "pending";

const readCooldownUntil = (): number | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    const lastRun = Number.parseInt(raw, 10);
    if (!Number.isFinite(lastRun)) return null;
    const until = lastRun + COOLDOWN_MS;
    return until > Date.now() ? until : null;
  } catch {
    // Storage can throw in private browsing / blocked-storage contexts.
    // Fall back to a session-only cooldown.
    return null;
  }
};

const persistLastRun = (): void => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, String(Date.now()));
  } catch {
    // Storage unavailable — the cooldown still applies for this session,
    // it just won't survive a page refresh.
  }
};

const fireDecoyRequest = (path: DemoPath): void => {
  // The response status is deliberately ignored: these paths 404, and that is
  // the expected result. CrowdSec reacts to the access-log pattern, not the
  // HTTP status code. No retries, no polling — one request per path, period.
  void fetch(path, { method: "GET" }).catch(() => {
    // A network-level failure is equally irrelevant to the simulation.
  });
};

const AttackReplayDemo = () => {
  const [phase, setPhase] = useState<SimulationPhase>({ status: "idle" });
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(
    readCooldownUntil,
  );
  const [now, setNow] = useState<number>(() => Date.now());

  const timersRef = useRef<number[]>([]);
  // Synchronous re-entry guard: state updates are async, so a fast double
  // click must not be able to schedule a second batch of requests.
  const isRunningRef = useRef(false);

  // Cancel any pending simulation timers on unmount.
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  // Tick the countdown while a cooldown is active.
  useEffect(() => {
    if (cooldownUntil === null) return;

    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= cooldownUntil) {
        setCooldownUntil(null);
      }
    }, 500);

    return () => window.clearInterval(id);
  }, [cooldownUntil]);

  const startSimulation = () => {
    if (isRunningRef.current || cooldownUntil !== null || phase.status === "firing") {
      return;
    }
    isRunningRef.current = true;

    persistLastRun();
    const nowMs = Date.now();
    setCooldownUntil(nowMs + COOLDOWN_MS);
    setNow(nowMs);
    setPhase({ status: "firing", activeIndex: 0 });

    // Exactly five requests, in order, ~350ms apart. The last one gets a
    // brief in-flight state before we flip to done.
    DEMO_PATHS.forEach((path, index) => {
      const fireId = window.setTimeout(() => {
        fireDecoyRequest(path);
        setPhase({ status: "firing", activeIndex: index });
      }, index * FIRE_INTERVAL_MS);
      timersRef.current.push(fireId);
    });

    const doneId = window.setTimeout(() => {
      isRunningRef.current = false;
      setPhase({ status: "done" });
    }, DEMO_PATHS.length * FIRE_INTERVAL_MS);
    timersRef.current.push(doneId);
  };

  const remainingSeconds =
    cooldownUntil === null
      ? 0
      : Math.max(0, Math.ceil((cooldownUntil - now) / 1000));

  const pathStatus = (index: number): PathStatus => {
    if (phase.status !== "firing") return "pending";
    if (index < phase.activeIndex) return "sent";
    if (index === phase.activeIndex) return "active";
    return "pending";
  };

  const buttonLabel =
    phase.status === "firing"
      ? "Simulation running…"
      : cooldownUntil !== null
        ? `Next run in ${remainingSeconds}s`
        : "Run Safe Attack Simulation";

  return (
    <div className="mt-6 bg-card border border-border rounded-lg card-glow overflow-hidden">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-3.5 w-3.5 text-primary" />
          <span className="label-micro">Safe Attack Simulation</span>
        </div>

        <p className="text-sm text-muted-foreground mb-4 max-w-3xl">
          A harmless, same-origin demo. It issues five GET requests to known
          scanner-bait paths on this site. Those paths don&apos;t exist here —
          each returns 404 — but CrowdSec reads the access log and flags the
          probing pattern exactly as it would for a real attacker.
        </p>

        <Button onClick={startSimulation} disabled={cooldownUntil !== null}>
          <Play className="h-4 w-4" />
          {buttonLabel}
        </Button>

        <div className="mt-4" aria-live="polite">
          {phase.status === "firing" && (
            <div className="font-data text-xs space-y-1.5">
              {DEMO_PATHS.map((path, index) => {
                const status = pathStatus(index);
                return (
                  <div key={path} className="flex items-center gap-2">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        status === "active" ? "animate-pulse" : ""
                      }`}
                      style={{
                        backgroundColor:
                          status === "active"
                            ? "hsl(var(--status-warning))"
                            : status === "sent"
                              ? "hsl(var(--status-info))"
                              : "hsl(var(--muted-foreground))",
                      }}
                    />
                    <span
                      className={
                        status === "pending"
                          ? "text-muted-foreground"
                          : "text-foreground"
                      }
                    >
                      {path}
                    </span>
                    <span className="ml-auto text-muted-foreground">
                      {status === "active"
                        ? "requesting"
                        : status === "sent"
                          ? "sent"
                          : "queued"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {phase.status === "done" && (
            <p className="text-sm text-muted-foreground font-data">
              Requests sent — check the live feed above. CrowdSec logs and
              blocks these within moments; the feed refreshes every 60s.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttackReplayDemo;
