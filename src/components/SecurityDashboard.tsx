import { useEffect, useState } from "react";
import { Shield, ShieldAlert, Globe2, Activity, Radio } from "lucide-react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

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
}

const STATUS_COLORS = ["blocked", "info", "warning", "critical"] as const;

const scenarioColor = (index: number) =>
  `hsl(var(--status-${STATUS_COLORS[index % STATUS_COLORS.length]}))`;

// Axis ticks: day + hour, since the window spans several days and
// hour-only labels repeat every 24 points and read as scrambled.
const formatHour = (iso: string) => {
  const d = new Date(iso);
  const day = d.toLocaleDateString(undefined, { weekday: "short" });
  const hour = d.toLocaleTimeString(undefined, { hour: "2-digit", hour12: false });
  return `${day} ${hour}`;
};

// Tooltip gets the fuller date, axis ticks stay short.
const formatHourFull = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
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

    const load = () => {
      fetch("/security-stats.json", { cache: "no-store" })
        .then((res) => {
          if (!res.ok) throw new Error("bad response");
          return res.json();
        })
        .then((data: SecurityStats) => {
          if (!cancelled) {
            setStats(data);
            setError(false);
          }
        })
        .catch(() => {
          if (!cancelled) setError(true);
        });
    };

    load();
    const interval = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
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
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats?.timeline ?? []} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="timelineFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--status-info))" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="hsl(var(--status-info))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="hour"
                      tickFormatter={formatHour}
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      minTickGap={60}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      width={24}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 6,
                        fontSize: 12,
                        fontFamily: "ui-monospace, monospace",
                      }}
                      labelFormatter={(v) => formatHourFull(v as string)}
                      formatter={(v: number) => [v, "blocked"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="hsl(var(--status-info))"
                      strokeWidth={1.5}
                      fill="url(#timelineFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
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
      </div>
    </section>
  );
};

export default SecurityDashboard;
