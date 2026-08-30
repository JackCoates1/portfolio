import { useEffect, useId, useState } from "react";
import { Shield, ShieldAlert, Globe2, Activity, Radio } from "lucide-react";
import AttackReplay, { type NotableReplay } from "@/components/AttackReplay";
import VerifiedStatus from "@/components/VerifiedStatus";


interface ScenarioCount {
  scenario: string;
  count: number;
}

interface CountryCount {
  country: string;
  count: number;
}

interface TimelinePoint {
  hour: string;
  count: number;
}

interface SecurityStats {
  generated_at: string;
  window: string;
  total_blocked: number;
  alert_count: number;
  by_scenario: ScenarioCount[];
  by_country: CountryCount[];
  timeline: TimelinePoint[];
  notable_replay: NotableReplay | null;
}

const STATUS_COLORS = ["blocked", "info", "warning", "critical"] as const;

const scenarioColor = (index: number) =>
  `hsl(var(--status-${STATUS_COLORS[index % STATUS_COLORS.length]}))`;

// window spans days, so hour-only ticks would repeat every 24 and look scrambled
const formatHour = (iso: string) => {
  const d = new Date(iso);
  const day = d.toLocaleDateString(undefined, { weekday: "short" });
  const hour = d.toLocaleTimeString(undefined, { hour: "2-digit", hour12: false });
  return `${day} ${hour}`;
};

// tooltip gets the full date, ticks stay short
const formatHourFull = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

const TimelineChart = ({ data }: { data: TimelinePoint[] }) => {
  const gradientId = `timeline-fill-${useId().replace(/:/g, "")}`;
  if (data.length === 0) {
    return <p className="flex h-full items-center justify-center font-data text-xs text-muted-foreground">awaiting data…</p>;
  }

  const width = 640;
  const height = 208;
  const padding = { top: 12, right: 10, bottom: 30, left: 34 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const max = Math.max(1, ...data.map(({ count }) => count));
  const x = (index: number) => padding.left + (data.length === 1 ? chartWidth / 2 : (index / (data.length - 1)) * chartWidth);
  const y = (count: number) => padding.top + chartHeight - (count / max) * chartHeight;
  const points = data.map((point, index) => `${x(index)},${y(point.count)}`).join(" ");
  const areaPoints = `${padding.left},${padding.top + chartHeight} ${points} ${padding.left + chartWidth},${padding.top + chartHeight}`;
  const labelIndexes = [...new Set([0, Math.floor((data.length - 1) / 2), data.length - 1])];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full" role="img" aria-label="Blocked requests over time">
      <title>Threat timeline. Hover or focus a point for its value.</title>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--status-info))" stopOpacity="0.35" />
          <stop offset="100%" stopColor="hsl(var(--status-info))" stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + chartHeight} stroke="hsl(var(--border))" />
      <line x1={padding.left} y1={padding.top + chartHeight} x2={padding.left + chartWidth} y2={padding.top + chartHeight} stroke="hsl(var(--border))" />
      <text x={padding.left - 8} y={padding.top + 4} textAnchor="end" className="fill-muted-foreground text-[10px]">{max}</text>
      <text x={padding.left - 8} y={padding.top + chartHeight + 4} textAnchor="end" className="fill-muted-foreground text-[10px]">0</text>
      <polygon points={areaPoints} fill={`url(#${gradientId})`} />
      <polyline points={points} fill="none" stroke="hsl(var(--status-info))" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      {data.map((point, index) => (
        <circle key={point.hour} cx={x(index)} cy={y(point.count)} r="4" fill="hsl(var(--status-info))" tabIndex={0} className="opacity-0 focus:opacity-100 hover:opacity-100">
          <title>{`${formatHourFull(point.hour)}: ${point.count} blocked`}</title>
        </circle>
      ))}
      {labelIndexes.map((index) => (
        <text key={data[index].hour} x={x(index)} y={height - 8} textAnchor={index === 0 ? "start" : index === data.length - 1 ? "end" : "middle"} className="fill-muted-foreground text-[10px]">
          {formatHour(data[index].hour)}
        </text>
      ))}
    </svg>
  );
};

const timeAgo = (iso: string) => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.round(mins / 60)}h ago`;
};

const SecurityDashboard = () => {
  const [stats, setStats] = useState<SecurityStats | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | undefined;
    let request: AbortController | undefined;

    const load = () => {
      request?.abort();
      const controller = new AbortController();
      request = controller;
      fetch("/security-stats.json", { cache: "no-store", signal: controller.signal })
        .then((res) => {
          if (!res.ok) throw new Error("bad response");
          return res.json();
        })
        .then((data: SecurityStats) => {
          if (!cancelled && !controller.signal.aborted) {
            setStats(data);
            setError(false);
          }
        })
        .catch((cause: unknown) => {
          if (!cancelled && (!(cause instanceof DOMException) || cause.name !== "AbortError")) setError(true);
        });
    };

    const updatePolling = () => {
      if (interval) clearInterval(interval);
      interval = undefined;
      if (document.visibilityState === "visible") {
        load();
        interval = setInterval(load, 60_000);
      } else {
        request?.abort();
      }
    };

    document.addEventListener("visibilitychange", updatePolling);
    updatePolling();
    return () => {
      cancelled = true;
      request?.abort();
      if (interval) clearInterval(interval);
      document.removeEventListener("visibilitychange", updatePolling);
    };
  }, []);

  const maxScenario = stats?.by_scenario[0]?.count ?? 1;
  const maxCountry = stats?.by_country[0]?.count ?? 1;

  return (
    <section id="security" className="py-20 px-4">
      <div className="container mx-auto max-w-6xl">
        <h2 className="text-4xl md:text-5xl font-bold mb-4 text-center">
          Live <span className="text-gradient">Security</span>
        </h2>
        <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-10">
          CrowdSec runs on the server behind this site, parsing real traffic and
          blocking malicious requests at the firewall. This is that data, live —
          not a mockup.
        </p>

        <div className="bg-card border border-border rounded-lg overflow-hidden card-glow">
          {/* telemetry strip */}
          <div className="flex flex-wrap items-center divide-x divide-border border-b border-border font-data text-xs">
            <div className="flex items-center gap-2 px-4 py-3">
              <span
                className={`h-1.5 w-1.5 rounded-full ${error ? "" : "animate-pulse"}`}
                style={{
                  backgroundColor: error
                    ? "hsl(var(--status-critical))"
                    : "hsl(var(--status-info))",
                }}
              />
              <span className="text-muted-foreground">
                {error ? "OFFLINE" : "LIVE"}
              </span>
            </div>
            <div className="px-4 py-3">
              <span className="text-muted-foreground">BLOCKED ({stats?.window ?? "7d"}) </span>
              <span className="text-foreground">{stats?.total_blocked ?? "—"}</span>
            </div>
            <div className="px-4 py-3">
              <span className="text-muted-foreground">ALERTS </span>
              <span className="text-foreground">{stats?.alert_count ?? "—"}</span>
            </div>
            <div className="px-4 py-3">
              <span className="text-muted-foreground">TOP SCENARIO </span>
              <span className="text-foreground">
                {stats?.by_scenario[0]?.scenario ?? "—"}
              </span>
            </div>
            <div className="px-4 py-3 ml-auto text-muted-foreground">
              {stats ? `SYNCED ${timeAgo(stats.generated_at)}` : "CONNECTING…"}
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-px bg-border">
            {/* timeline */}
            <div className="lg:col-span-2 bg-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="h-3.5 w-3.5 text-primary" />
                <span className="label-micro">Threat Timeline</span>
              </div>
              <div className="h-52">
                <TimelineChart data={stats?.timeline ?? []} />
              </div>
            </div>

            {/* scenario breakdown */}
            <div className="bg-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <ShieldAlert className="h-3.5 w-3.5 text-primary" />
                <span className="label-micro">Attack Scenarios</span>
              </div>
              <div className="space-y-3">
                {(stats?.by_scenario ?? []).slice(0, 6).map((s, i) => (
                  <div key={s.scenario}>
                    <div className="flex justify-between font-data text-xs mb-1">
                      <span className="text-muted-foreground truncate pr-2">{s.scenario}</span>
                      <span className="text-foreground">{s.count}</span>
                    </div>
                    <div className="h-1 rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.max(4, (s.count / maxScenario) * 100)}%`,
                          backgroundColor: scenarioColor(i),
                        }}
                      />
                    </div>
                  </div>
                ))}
                {!stats && (
                  <p className="text-xs text-muted-foreground font-data">awaiting data…</p>
                )}
              </div>
            </div>
          </div>

          {/* country breakdown */}
          <div className="border-t border-border bg-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Globe2 className="h-3.5 w-3.5 text-primary" />
              <span className="label-micro">Attack Origins</span>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-3">
              {(stats?.by_country ?? []).map((c) => (
                <div key={c.country} className="flex items-center gap-2 font-data text-xs">
                  <span className="w-8 text-muted-foreground">{c.country}</span>
                  <div className="flex-1 h-1 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(4, (c.count / maxCountry) * 100)}%`,
                        backgroundColor: "hsl(var(--status-blocked))",
                      }}
                    />
                  </div>
                  <span className="text-foreground w-8 text-right">{c.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-border px-6 py-3 flex items-center gap-2 text-[10px] font-data text-muted-foreground">
            <Shield className="h-3 w-3" />
            <span>Aggregate CrowdSec data only — no visitor IPs are ever exposed.</span>
            <Radio className="h-3 w-3 ml-auto" />
            <span>refreshes every 60s</span>
          </div>
        </div>

        {stats && <AttackReplay replay={stats.notable_replay} />}
        <VerifiedStatus />
      </div>
    </section>
  );
};

export default SecurityDashboard;
