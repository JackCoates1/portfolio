import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Fingerprint,
  Globe,
  MonitorSmartphone,
  Network,
  ShieldAlert,
  Wifi,
} from "lucide-react";

// --- Data-collection helpers -------------------------------------------------
// Local diagnostics read information the browser already exposes to any site.
// External IP lookups and the WebRTC/STUN diagnostic are started only after an
// explicit consent action so merely opening this route makes no third-party
// requests.

interface GeoInfo {
  ip: string;
  city?: string;
  region?: string;
  country_name?: string;
  org?: string;
  timezone?: string;
}

const fetchWithTimeout = (url: string, ms: number) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(id));
};

// ipapi.co's free tier occasionally rate-limits or times out — fall back to a
// second keyless provider so a single flaky lookup doesn't blank the whole card.
const fetchGeo = async (): Promise<GeoInfo> => {
  try {
    const res = await fetchWithTimeout("https://ipapi.co/json/", 5000);
    if (!res.ok) throw new Error("primary geo lookup failed");
    const data = await res.json();
    if (data.error) throw new Error("primary geo lookup errored");
    return data;
  } catch {
    const res = await fetchWithTimeout("https://ipwho.is/", 5000);
    if (!res.ok) throw new Error("fallback geo lookup failed");
    const data = await res.json();
    if (!data.success) throw new Error("fallback geo lookup errored");
    return {
      ip: data.ip,
      city: data.city,
      region: data.region,
      country_name: data.country,
      org: data.connection?.isp,
      timezone: data.timezone?.id,
    };
  }
};

// Many mobile/ISP connections are IPv6-only or dual-stack, so a single "public
// IP" lookup can silently return an IPv6 address with no IPv4 in sight. Query
// the IPv4-only and IPv6-only endpoints separately so both (or "not on this
// network") are always shown explicitly instead of one address looking like
// a missing field.
const fetchStackIp = async (version: 4 | 6): Promise<string | null> => {
  try {
    const res = await fetchWithTimeout(`https://api${version}.ipify.org?format=json`, 3000);
    if (!res.ok) return null;
    const data = await res.json();
    return data.ip ?? null;
  } catch {
    return null;
  }
};

const parseUserAgent = (ua: string) => {
  const browser =
    /Edg\//.test(ua) ? "Edge" :
    /OPR\//.test(ua) ? "Opera" :
    /Chrome\//.test(ua) && !/Chromium/.test(ua) ? "Chrome" :
    /Firefox\//.test(ua) ? "Firefox" :
    /Safari\//.test(ua) && !/Chrome/.test(ua) ? "Safari" :
    "Unknown";

  const os =
    /Windows NT/.test(ua) ? "Windows" :
    /Mac OS X/.test(ua) ? "macOS" :
    /Android/.test(ua) ? "Android" :
    /iPhone|iPad|iPod/.test(ua) ? "iOS" :
    /Linux/.test(ua) ? "Linux" :
    "Unknown";

  const deviceType = /Mobi|Android|iPhone/.test(ua) ? "Mobile" : /iPad|Tablet/.test(ua) ? "Tablet" : "Desktop";

  return { browser, os, deviceType };
};

// Classic WebRTC local-IP leak: STUN candidates can reveal a device's LAN IP
// even behind a VPN, because the browser negotiates media candidates outside
// the tunnel unless the VPN/browser specifically blocks it.
const getWebRTCLeak = (): Promise<string[]> =>
  new Promise((resolve) => {
    const ips = new Set<string>();
    let settled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const finish = (pc?: RTCPeerConnection) => {
      if (settled) return;
      settled = true;
      if (timeout) clearTimeout(timeout);
      pc?.close();
      resolve(Array.from(ips));
    };

    try {
      const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
      pc.createDataChannel("");
      pc.onicecandidate = (event) => {
        if (!event.candidate) {
          finish(pc);
          return;
        }
        const match = event.candidate.candidate.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
        if (match) ips.add(match[1]);
      };
      void pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .catch(() => finish(pc));
      timeout = setTimeout(() => finish(pc), 2000);
    } catch {
      finish();
    }
  });

// A simple canvas fingerprint: render the same text/shapes on every visitor's
// browser and hash the pixel output. Differences in GPU, font rendering, and
// anti-aliasing make the result surprisingly unique per device — the same
// technique real tracking scripts use, just shown here instead of hidden.
const getCanvasFingerprint = (): string => {
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return "unavailable";
    canvas.width = 220;
    canvas.height = 40;
    ctx.textBaseline = "top";
    ctx.font = "16px 'Arial'";
    ctx.fillStyle = "#f60";
    ctx.fillRect(0, 0, 100, 20);
    ctx.fillStyle = "#069";
    ctx.fillText("jackcoates.co.uk 🔒", 2, 10);
    ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
    ctx.fillText("jackcoates.co.uk 🔒", 4, 12);
    const dataUrl = canvas.toDataURL();
    let hash = 0;
    for (let i = 0; i < dataUrl.length; i++) {
      hash = (hash << 5) - hash + dataUrl.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16).padStart(8, "0");
  } catch {
    return "unavailable";
  }
};

const StatRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-center justify-between gap-4 py-2 border-b border-border/50 last:border-0">
    <span className="text-sm text-muted-foreground font-mono">{label}</span>
    <span className="text-sm font-mono text-right break-all text-foreground">{value}</span>
  </div>
);

const SectionCard = ({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) => (
  <Card className="group relative border-primary/20 bg-card/40 backdrop-blur-sm overflow-hidden transition-all duration-300 hover:border-primary/50 hover:shadow-[0_0_30px_-5px_hsl(var(--primary)/0.35)]">
    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
    <CardHeader className="pb-3">
      <CardTitle className="flex items-center gap-2 text-base font-mono">
        <Icon className="w-4 h-4 text-primary" />
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);

const CyberLab = () => {
  const [geo, setGeo] = useState<GeoInfo | null>(null);
  const [geoError, setGeoError] = useState(false);
  const [geoAttempt, setGeoAttempt] = useState(0);
  const [externalTestsConsented, setExternalTestsConsented] = useState(false);
  const [ipv4, setIpv4] = useState<string | null | undefined>(undefined);
  const [ipv6, setIpv6] = useState<string | null | undefined>(undefined);
  const [webrtcIps, setWebrtcIps] = useState<string[] | null>(null);
  const [canvasHash] = useState(() => getCanvasFingerprint());
  const [typed, setTyped] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setTyped(true), 300);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!externalTestsConsented) return;

    setGeo(null);
    setGeoError(false);

    fetchGeo()
      .then(setGeo)
      .catch(() => setGeoError(true));

    fetchStackIp(4).then(setIpv4);
    fetchStackIp(6).then(setIpv6);
  }, [externalTestsConsented, geoAttempt]);

  useEffect(() => {
    if (!externalTestsConsented) return;
    getWebRTCLeak().then(setWebrtcIps);
  }, [externalTestsConsented]);

  const startExternalTests = () => {
    setIpv4(undefined);
    setIpv6(undefined);
    setExternalTestsConsented(true);
  };

  const ua = navigator.userAgent;
  const { browser, os, deviceType } = parseUserAgent(ua);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Ambient background: subtle scanning grid + glow, hacker-terminal feel */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div className="pointer-events-none fixed -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/10 blur-[120px]" />

      <div className="container mx-auto px-6 py-10 max-w-4xl relative">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors font-mono mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back home
        </Link>

        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <div className="relative">
              <Fingerprint className="w-9 h-9 text-primary" />
              <span className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
            </div>
            <h1 className="text-3xl md:text-5xl font-bold font-mono tracking-tight bg-gradient-to-r from-primary via-primary to-primary/60 bg-clip-text text-transparent">
              Cyber Lab
            </h1>
            <Badge variant="outline" className="border-primary/40 text-primary font-mono text-xs animate-pulse">
              ● live demo
            </Badge>
          </div>
          <p className="text-muted-foreground max-w-2xl leading-relaxed font-mono text-sm">
            <span className="text-primary">$</span>{" "}
            {typed ? (
              "whoami --verbose"
            ) : (
              <span className="opacity-0">whoami --verbose</span>
            )}
          </p>
          <p className="text-muted-foreground max-w-2xl leading-relaxed mt-2">
            Every site you visit can read some or all of what's shown below, usually silently.
            This page collects it openly instead. Browser-derived details stay in your browser;
            every external network diagnostic waits for your explicit consent below.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {!externalTestsConsented && (
            <Card className="md:col-span-2 border-primary/30 bg-primary/5">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-mono">
                  <ShieldAlert className="w-4 h-4 text-primary" />
                  External network test consent
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Running the tests sends your public IP address and request metadata to ipapi.co,
                  ipwho.is, and ipify.org. The WebRTC diagnostic also contacts Google's public STUN
                  service to gather connection candidates. Those providers handle the requests
                  under their own privacy practices. Nothing is stored by this site.
                </p>
                <button
                  type="button"
                  onClick={startExternalTests}
                  className="rounded-md bg-primary px-3 py-2 text-xs font-mono font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  I consent — run external network tests
                </button>
              </CardContent>
            </Card>
          )}

          <SectionCard icon={Globe} title="Network & Location">
            {!externalTestsConsented ? (
              <p className="text-sm text-muted-foreground">
                Waiting for consent. No network or location request has been sent.
              </p>
            ) : geoError ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Geolocation lookup unavailable right now (provider rate-limited or unreachable
                  from this network).
                </p>
                <button
                  type="button"
                  onClick={() => setGeoAttempt((n) => n + 1)}
                  className="text-xs font-mono text-primary hover:underline"
                >
                  retry lookup →
                </button>
              </div>
            ) : !geo ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : (
              <>
                <StatRow
                  label="IPv4"
                  value={ipv4 === undefined ? <Skeleton className="h-4 w-24 inline-block" /> : ipv4 ?? "Not on this network"}
                />
                <StatRow
                  label="IPv6"
                  value={ipv6 === undefined ? <Skeleton className="h-4 w-24 inline-block" /> : ipv6 ?? "Not on this network"}
                />
                <StatRow label="City" value={geo.city || "Unknown"} />
                <StatRow label="Region" value={geo.region || "Unknown"} />
                <StatRow label="Country" value={geo.country_name || "Unknown"} />
                <StatRow label="ISP / Org" value={geo.org || "Unknown"} />
                <StatRow label="Timezone" value={geo.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone} />
              </>
            )}
          </SectionCard>

          <SectionCard icon={MonitorSmartphone} title="Browser & Device">
            <StatRow label="Browser" value={browser} />
            <StatRow label="Operating System" value={os} />
            <StatRow label="Device Type" value={deviceType} />
            <StatRow label="Platform" value={navigator.platform || "n/a"} />
            <StatRow label="Language" value={navigator.language} />
            <StatRow label="CPU Cores" value={navigator.hardwareConcurrency ?? "n/a"} />
          </SectionCard>

          <SectionCard icon={MonitorSmartphone} title="Screen & Viewport">
            <StatRow label="Screen Resolution" value={`${window.screen.width} × ${window.screen.height}`} />
            <StatRow label="Viewport Size" value={`${window.innerWidth} × ${window.innerHeight}`} />
            <StatRow label="Color Depth" value={`${window.screen.colorDepth}-bit`} />
            <StatRow label="Pixel Ratio" value={window.devicePixelRatio} />
            <StatRow label="Touch Support" value={navigator.maxTouchPoints > 0 ? "Yes" : "No"} />
          </SectionCard>

          <SectionCard icon={Wifi} title="WebRTC Leak Test">
            {!externalTestsConsented ? (
              <p className="text-sm text-muted-foreground">
                Waiting for consent. No STUN service has been contacted.
              </p>
            ) : webrtcIps === null ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ) : webrtcIps.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No local network addresses leaked via WebRTC — your browser or network
                configuration is blocking this.
              </p>
            ) : (
              <>
                <p className="text-xs text-muted-foreground mb-2">
                  Your local network address{webrtcIps.length > 1 ? "es" : ""}, revealed via
                  WebRTC even if you're behind a VPN:
                </p>
                {webrtcIps.map((ip) => (
                  <StatRow key={ip} label="Local IP" value={ip} />
                ))}
              </>
            )}
          </SectionCard>

          <Card className="md:col-span-2 relative border-primary/20 bg-card/40 backdrop-blur-sm overflow-hidden transition-all duration-300 hover:border-primary/50 hover:shadow-[0_0_30px_-5px_hsl(var(--primary)/0.35)]">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-mono">
                <Fingerprint className="w-4 h-4 text-primary" />
                Your Canvas Fingerprint
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-3">
                Your GPU, installed fonts, and rendering engine combine to draw the same shapes
                very slightly differently on almost every device. Hashing that output gives a
                fingerprint that can identify your browser even with cookies disabled.
              </p>
              <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
                <Fingerprint className="w-5 h-5 text-primary shrink-0" />
                <code className="text-primary font-mono text-base tracking-[0.2em]">{canvasHash}</code>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6 border-primary/30 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <ShieldAlert className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm leading-relaxed">
                  <strong>None of this is unusual — that's the point.</strong> Every site you visit
                  can access most of the above without asking. IP geolocation, browser/OS
                  fingerprinting, screen metrics, and canvas hashing are all standard tools used by
                  analytics platforms and, less legitimately, by trackers trying to identify you
                  across sites without cookies. Understanding your own exposure is the first step
                  in evaluating it.
                </p>
                <p className="text-xs text-muted-foreground mt-3 font-mono flex items-center gap-2">
                  <Network className="w-3.5 h-3.5" />
                  Nothing on this page is stored. External requests—including the WebRTC STUN
                  request—are sent only after you explicitly consent to run the network tests.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CyberLab;
