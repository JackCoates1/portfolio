import { useEffect, useState } from "react";
import { parseSnapshot } from "@/lib/telemetry.mjs";
export interface Origin {
  id: string;
  country: string;
  latitude: number;
  longitude: number;
  count: number;
  firstSeen: string;
  lastSeen: string;
  categories: { label: string; count: number }[];
}
export interface Feed {
  id: string;
  label: string;
  description: string;
  kind: string;
  count: number;
  inputRecords: number;
  nodes: Origin[];
  geoSource: string;
  excluded: Record<string, number>;
}
export interface Snapshot {
  capturedAt: string;
  feeds: Feed[];
}
export function useSecuritySnapshot() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null),
    [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/data/security-snapshot.json", { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then((data) => setSnapshot(parseSnapshot(data)))
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => controller.abort();
  }, []);
  return { snapshot, error };
}
