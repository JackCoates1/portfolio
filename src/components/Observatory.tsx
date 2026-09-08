import { lazy, Suspense, useState } from "react";
import type { Snapshot } from "@/data/telemetry";
import { countryName, dateLabel, coverage } from "@/lib/telemetry.mjs";
const AttackGlobe = lazy(() => import("./AttackGlobe"));
export default function Observatory({
  paused,
  snapshot,
  error,
}: {
  paused: boolean;
  snapshot: Snapshot | null;
  error: boolean;
}) {
  const [source, setSource] = useState("vps"),
    [selected, setSelected] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0),
    [zoom, setZoom] = useState(0),
    [reset, setReset] = useState(0);
  const feed = snapshot?.feeds.find((f) => f.id === source);
  const node = feed?.nodes.find((n) => n.id === selected);
  return (
    <section className="observatory" aria-labelledby="observatory-title">
      <div className="instrument-heading">
        <span className="eyebrow" id="observatory-title">
          Network observatory
        </span>
        <span className="snapshot-tag">Historical snapshot</span>
      </div>
      <div className="source-switch" aria-label="Security data source">
        {["vps", "homelab"].map((id) => (
          <button
            key={id}
            aria-pressed={source === id}
            onClick={() => {
              setSource(id);
              setSelected(null);
            }}
          >
            {id === "vps" ? "VPS / CrowdSec" : "Homelab / OPNsense"}
          </button>
        ))}
      </div>
      <div className="globe-window">
        <span className="globe-coordinate" aria-hidden="true">
          53.8° N<br />
          001.8° W
        </span>
        {feed ? (
          <Suspense
            fallback={
              <p className="globe-loading" role="status">
                Preparing the globe…
              </p>
            }
          >
            <AttackGlobe
              nodes={feed.nodes}
              paused={paused}
              selected={selected}
              onSelect={setSelected}
              rotation={rotation}
              zoom={zoom}
              reset={reset}
            />
          </Suspense>
        ) : (
          <p className="globe-loading" role="status">
            {error
              ? "Snapshot unavailable. No data has been substituted."
              : "Reading the security snapshot…"}
          </p>
        )}
        <div className="globe-controls" aria-label="Globe controls">
          <button
            aria-label="Rotate globe left"
            onClick={() => setRotation((r) => r - 1)}
          >
            ←
          </button>
          <button
            aria-label="Rotate globe right"
            onClick={() => setRotation((r) => r + 1)}
          >
            →
          </button>
          <span />
          <button
            aria-label="Zoom out"
            disabled={zoom === -1}
            onClick={() => setZoom((z) => Math.max(-1, z - 1))}
          >
            −
          </button>
          <button
            aria-label="Zoom in"
            disabled={zoom === 3}
            onClick={() => setZoom((z) => Math.min(3, z + 1))}
          >
            +
          </button>
          <button
            onClick={() => {
              setZoom(0);
              setReset((r) => r + 1);
            }}
          >
            Reset
          </button>
        </div>
      </div>
      <p className="globe-touch-hint">Drag the globe in any direction. Scroll outside it to move down the page.</p>
      {feed && snapshot && (
        <>
          <div className="telemetry-readout">
            <div>
              <strong>{feed.count}</strong>
              <span>
                {feed.kind === "blocks"
                  ? "firewall blocks"
                  : "local detections"}
              </span>
            </div>
            <div>
              <strong>{new Set(feed.nodes.map((n) => n.country)).size}</strong>
              <span>source countries</span>
            </div>
            <p>
              Captured {dateLabel(snapshot.capturedAt)}
              <br />
              <span>No live connection</span>
            </p>
          </div>
          <div className="origin-picker">
            <label htmlFor="origin">Inspect an origin</label>
            <select
              id="origin"
              value={selected ?? ""}
              onChange={(e) => setSelected(e.target.value || null)}
            >
              <option value="">
                All {feed.nodes.length} geographic groups
              </option>
              {feed.nodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {countryName(n.country)} · {n.latitude}°, {n.longitude}° ·{" "}
                  {n.count} records
                </option>
              ))}
            </select>
          </div>
          {node && (
            <div className="origin-detail" role="status">
              <strong>
                {countryName(node.country)} · {node.count} records
              </strong>
              <p>
                {node.categories
                  .map((c) => `${c.count} ${c.label.toLowerCase()}`)
                  .join(" · ")}
              </p>
              <p>
                {dateLabel(node.firstSeen)} — {dateLabel(node.lastSeen)}
              </p>
            </div>
          )}
          <p className="observation-coverage">{coverage(feed.nodes)}</p>
          <p className="telemetry-caption">
            {feed.description} <a href="#data-notes">Read the data notes ↗</a>
          </p>
        </>
      )}
    </section>
  );
}
