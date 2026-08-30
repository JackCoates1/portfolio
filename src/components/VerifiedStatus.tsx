import { useEffect, useState } from "react";
import {
  BadgeCheck,
  ExternalLink,
  GitCommitHorizontal,
  Github,
  PackageCheck,
  ShieldCheck,
} from "lucide-react";

interface DependencySeverity {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

interface VerifiedStatusData {
  generated_at: string;
  repo_url: string;
  repo_public: boolean;
  dependency_alerts: {
    open_total: number;
    by_severity: DependencySeverity;
  };
  latest_commit: {
    sha: string;
    gpg_verified: boolean;
    verification_reason: string;
  };
  latest_build: {
    run_url: string;
    conclusion: string;
    has_attestation: boolean;
  };
}

// server regenerates this every 15m, so polling faster than this is pointless
const POLL_MS = 180_000;
const REPOSITORY_SECURITY_URL = "https://github.com/JackCoates1/portfolio/security";

const timeAgo = (iso: string) => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.round(mins / 60)}h ago`;
};

// github.com/owner/repo reads nicer in the footer than the full https URL
const stripScheme = (url: string) => url.replace(/^https?:\/\//, "");

const safeHttpsUrl = (value: string | undefined) => {
  try {
    const url = new URL(value ?? "");
    return url.protocol === "https:" ? url.href : undefined;
  } catch {
    return undefined;
  }
};

const VerifiedStatus = () => {
  const [status, setStatus] = useState<VerifiedStatusData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = () => {
      fetch("/verified-status.json", { cache: "no-store" })
        .then((res) => {
          if (!res.ok) throw new Error("bad response");
          return res.json();
        })
        .then((data: VerifiedStatusData) => {
          if (!cancelled) {
            setStatus(data);
            setError(false);
          }
        })
        .catch(() => {
          if (!cancelled) setError(true);
        });
    };

    load();
    const interval = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const commitOk = status?.latest_commit.gpg_verified === true;
  const buildVerified =
    status?.latest_build.has_attestation === true &&
    status?.latest_build.conclusion === "success";
  const sev = status?.dependency_alerts.by_severity;
  const repositoryUrl = safeHttpsUrl(status?.repo_url);
  const commitUrl = repositoryUrl && status
    ? new URL(`commit/${encodeURIComponent(status.latest_commit.sha)}`, repositoryUrl.endsWith("/") ? repositoryUrl : `${repositoryUrl}/`).href
    : "#";
  const buildUrl = safeHttpsUrl(status?.latest_build.run_url) ?? "#";

  return (
    <div className="mt-6 bg-card border border-border rounded-lg overflow-hidden card-glow">
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-border">
        <BadgeCheck className="h-3.5 w-3.5 text-primary" />
        <span className="label-micro">Verified</span>
        <span className="font-data text-[10px] text-muted-foreground">
          trust signals for the repo behind this site
        </span>
        <span className="ml-auto font-data text-[10px] text-muted-foreground">
          {error
            ? "OFFLINE"
            : status
              ? `SYNCED ${timeAgo(status.generated_at)}`
              : "CONNECTING…"}
        </span>
      </div>

      <p className="px-4 pt-3 text-xs text-muted-foreground max-w-3xl">
        Proof the code running this site is actually what's in the repo, and
        hasn't been swapped or tampered with between commit and deploy.
      </p>

          <div className="grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border">
            {/* latest commit */}
            <div className="p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <GitCommitHorizontal className="h-3.5 w-3.5 text-primary" />
                <span className="label-micro">Latest commit</span>
              </div>
              {status ? (
                <a
                  href={commitUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 font-data text-xs text-foreground hover:text-primary transition-colors"
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{
                      backgroundColor: commitOk
                        ? "hsl(var(--status-info))"
                        : "hsl(var(--status-warning))",
                    }}
                  />
                  <span className="text-muted-foreground">gpg</span>
                  <span
                    style={{
                      color: commitOk
                        ? "hsl(var(--status-info))"
                        : "hsl(var(--status-warning))",
                    }}
                  >
                    {commitOk ? "signed" : "unsigned"}
                  </span>
                  <span className="text-muted-foreground">·</span>
                  <span>{status.latest_commit.sha}</span>
                </a>
              ) : (
                <p className="font-data text-xs text-muted-foreground">
                  awaiting data…
                </p>
              )}
            </div>

            {/* build provenance */}
            <div className="p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <PackageCheck className="h-3.5 w-3.5 text-primary" />
                <span className="label-micro">Build provenance</span>
              </div>
              {status ? (
                buildVerified ? (
                  <a
                    href={buildUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border bg-secondary/30 px-2.5 py-1 font-data text-[10px] uppercase tracking-wider transition-colors hover:bg-secondary/60"
                    style={{
                      color: "hsl(var(--status-info))",
                      borderColor: "hsl(var(--status-info) / 0.35)",
                    }}
                  >
                    <BadgeCheck className="h-3 w-3" />
                    Verified build
                  </a>
                ) : (
                  <a
                    href={buildUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 font-data text-xs text-foreground hover:text-primary transition-colors"
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{
                        backgroundColor:
                          status.latest_build.conclusion === "success"
                            ? "hsl(var(--status-warning))"
                            : "hsl(var(--status-critical))",
                      }}
                    />
                    <span className="text-muted-foreground">build</span>
                    <span
                      style={{
                        color:
                          status.latest_build.conclusion === "success"
                            ? "hsl(var(--status-warning))"
                            : "hsl(var(--status-critical))",
                      }}
                    >
                      {status.latest_build.conclusion === "success"
                        ? "passing, not attested"
                        : status.latest_build.conclusion || "no run"}
                    </span>
                  </a>
                )
              ) : (
                <p className="font-data text-xs text-muted-foreground">
                  awaiting data…
                </p>
              )}
            </div>

            {/* dependency health */}
            <div className="p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                <span className="label-micro">Dependency health</span>
              </div>
              {status ? (
                <a
                  href={REPOSITORY_SECURITY_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex flex-wrap items-center gap-x-2 font-data text-xs text-foreground hover:text-primary transition-colors"
                >
                  <span>
                    {status.dependency_alerts.open_total}
                    <span className="text-muted-foreground"> open</span>
                  </span>
                  {status.dependency_alerts.open_total > 0 && sev && (
                    <span className="text-muted-foreground">
                      <span style={{ color: "hsl(var(--status-critical))" }}>
                        {sev.critical} critical
                      </span>
                      {" · "}
                      <span style={{ color: "hsl(var(--status-warning))" }}>
                        {sev.high} high
                      </span>
                      {" · "}
                      {sev.medium} medium
                      {" · "}
                      {sev.low} low
                    </span>
                  )}
                </a>
              ) : (
                <p className="font-data text-xs text-muted-foreground">
                  awaiting data…
                </p>
              )}
            </div>
          </div>

          <a
            href={repositoryUrl ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 border-t border-border px-4 py-2.5 font-data text-[10px] text-muted-foreground hover:text-primary transition-colors"
          >
            <Github className="h-3 w-3" />
            <span>{repositoryUrl ? stripScheme(repositoryUrl) : "source repository"}</span>
            {status?.repo_public && (
              <span
                className="rounded-full border bg-secondary/30 px-2 py-0.5 uppercase tracking-wider"
                style={{
                  color: "hsl(var(--status-info))",
                  borderColor: "hsl(var(--status-info) / 0.35)",
                }}
              >
                public
              </span>
            )}
            <ExternalLink className="h-3 w-3 ml-auto" />
          </a>
    </div>
  );
};

export default VerifiedStatus;
