import { useEffect, useRef, useState } from "react";
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
// Everything here reads information the browser already exposes to any site
// you visit — nothing is transmitted anywhere except the one IP-geolocation
// lookup (a public, keyless API, over HTTPS). The point of this page is to
// make that normally-invisible exposure visible.

interface GeoInfo {
  ip: string;
  city?: string;
  region?: string;
  country_name?: string;
  org?: string;
  timezone?: string;
}

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
    try {
      const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
      pc.createDataChannel("");
      pc.onicecandidate = (event) => {
        if (!event.candidate) {
          pc.close();
          resolve(Array.from(ips));
          return;
        }
        const match = event.candidate.candidate.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
        if (match) ips.add(match[1]);
      };
      pc.createOffer().then((offer) => pc.setLocalDescription(offer));
      setTimeout(() => {
        pc.close();
        resolve(Array.from(ips));
      }, 2000);
    } catch {
      resolve([]);
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
    <span className="text-sm font-mono text-right break-all">{value}</span>
  </div>
);

const CyberLab = () => {
  const [geo, setGeo] = useState<GeoInfo | null>(null);
  const [geoError, setGeoError] = useState(false);
  const [webrtcIps, setWebrtcIps] = useState<string[] | null>(null);
  const [canvasHash] = useState(() => getCanvasFingerprint());
  const startTime = useRef(performance.now());

  useEffect(() => {
    fetch("https://ipapi.co/json/")
      .then((res) => {
        if (!res.ok) throw new Error("lookup failed");
        return res.json();
      })
      .then((data) => setGeo(data))
      .catch(() => setGeoError(true));

    getWebRTCLeak().then(setWebrtcIps);
  }, []);

  const ua = navigator.userAgent;
  const { browser, os, deviceType } = parseUserAgent(ua);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-10 max-w-4xl">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors font-mono mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back home
        </Link>

        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <Fingerprint className="w-8 h-8 text-primary" />
            <h1 className="text-3xl md:text-4xl font-bold font-mono tracking-tight">Cyber Lab</h1>
            <Badge variant="outline" className="border-primary/40 text-primary font-mono text-xs">
              live demo
            </Badge>
          </div>
          <p className="text-muted-foreground max-w-2xl leading-relaxed">
            Every site you visit can read some or all of what's shown below, usually silently.
            This page collects it openly instead — everything here comes straight from your own
            browser, plus one IP-geolocation lookup, so you can see exactly what a typical
            fingerprinting or analytics script has access to.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-border bg-card/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-mono">
                <Globe className="w-4 h-4 text-primary" />
                Network &amp; Location
              </CardTitle>
            </CardHeader>
            <CardContent>
              {geoError ? (
                <p className="text-sm text-muted-foreground">Lookup unavailable right now.</p>
              ) : !geo ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ) : (
                <>
                  <StatRow label="Public IP" value={geo.ip} />
                  <StatRow label="City" value={geo.city || "Unknown"} />
                  <StatRow label="Region" value={geo.region || "Unknown"} />
                  <StatRow label="Country" value={geo.country_name || "Unknown"} />
                  <StatRow label="ISP / Org" value={geo.org || "Unknown"} />
                  <StatRow label="Timezone" value={geo.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone} />
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-border bg-card/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-mono">
                <MonitorSmartphone className="w-4 h-4 text-primary" />
                Browser &amp; Device
              </CardTitle>
            </CardHeader>
            <CardContent>
              <StatRow label="Browser" value={browser} />
              <StatRow label="Operating System" value={os} />
              <StatRow label="Device Type" value={deviceType} />
              <StatRow label="Platform" value={navigator.platform || "n/a"} />
              <StatRow label="Language" value={navigator.language} />
              <StatRow label="CPU Cores" value={navigator.hardwareConcurrency ?? "n/a"} />
            </CardContent>
          </Card>

          <Card className="border-border bg-card/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-mono">
                <MonitorSmartphone className="w-4 h-4 text-primary" />
                Screen &amp; Viewport
              </CardTitle>
            </CardHeader>
            <CardContent>
              <StatRow label="Screen Resolution" value={`${window.screen.width} × ${window.screen.height}`} />
              <StatRow label="Viewport Size" value={`${window.innerWidth} × ${window.innerHeight}`} />
              <StatRow label="Color Depth" value={`${window.screen.colorDepth}-bit`} />
              <StatRow label="Pixel Ratio" value={window.devicePixelRatio} />
              <StatRow label="Touch Support" value={navigator.maxTouchPoints > 0 ? "Yes" : "No"} />
            </CardContent>
          </Card>

          <Card className="border-border bg-card/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-mono">
                <Wifi className="w-4 h-4 text-primary" />
                WebRTC Leak Test
              </CardTitle>
            </CardHeader>
            <CardContent>
              {webrtcIps === null ? (
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
            </CardContent>
          </Card>

          <Card className="border-border bg-card/50 md:col-span-2">
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
                <code className="text-primary font-mono text-sm tracking-wider">{canvasHash}</code>
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
                  Nothing on this page is stored or sent anywhere beyond the one geolocation
                  lookup — view source if you don't believe me.
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
