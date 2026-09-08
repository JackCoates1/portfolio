const finite = (n, min, max) =>
  typeof n === "number" && Number.isFinite(n) && n >= min && n <= max;
const date = (s) =>
  typeof s === "string" &&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
    s,
  ) &&
  Number.isFinite(Date.parse(s));
const integer = (n) => Number.isSafeInteger(n) && n >= 0;
const text = (s) => typeof s === "string" && s.length > 0 && s.length <= 600;
export function parseSnapshot(input) {
  if (
    !input ||
    input.version !== 1 ||
    input.mode !== "snapshot" ||
    !date(input.capturedAt) ||
    !Array.isArray(input.feeds) ||
    input.feeds.length !== 2
  )
    throw new Error("Unrecognized telemetry snapshot");
  const ids = new Set();
  for (const feed of input.feeds) {
    if (
      !feed ||
      !["vps", "homelab"].includes(feed.id) ||
      ids.has(feed.id) ||
      feed.kind !== (feed.id === "vps" ? "detections" : "blocks") ||
      !text(feed.label) ||
      !text(feed.description) ||
      !text(feed.geoSource) ||
      !integer(feed.inputRecords) ||
      !integer(feed.count) ||
      feed.count > feed.inputRecords ||
      !Array.isArray(feed.nodes) ||
      feed.nodes.length > 256
    )
      throw new Error("Invalid source");
    ids.add(feed.id);
    const nodes = new Set();
    for (const n of feed.nodes) {
      if (
        !n ||
        typeof n.id !== "string" ||
        !/^[a-f\d]{12}$/.test(n.id) ||
        nodes.has(n.id) ||
        typeof n.country !== "string" ||
        !/^[A-Z]{2}$/.test(n.country) ||
        !finite(n.latitude, -90, 90) ||
        !finite(n.longitude, -180, 180) ||
        !integer(n.count) ||
        n.count < 1 ||
        !date(n.firstSeen) ||
        !date(n.lastSeen) ||
        Date.parse(n.firstSeen) > Date.parse(n.lastSeen) ||
        Date.parse(n.lastSeen) > Date.parse(input.capturedAt)
      )
        throw new Error("Invalid origin");
      nodes.add(n.id);
      if (
        !Array.isArray(n.categories) ||
        n.categories.some(
          (c) => !c || !text(c.label) || !integer(c.count) || c.count < 1,
        ) ||
        n.categories.reduce((s, c) => s + c.count, 0) !== n.count
      )
        throw new Error("Invalid classifications");
    }
    if (feed.count !== feed.nodes.reduce((s, n) => s + n.count, 0))
      throw new Error("Count mismatch");
  }
  return input;
}
const countries = new Intl.DisplayNames(["en"], { type: "region" });
export const countryName = (code) => countries.of(code) || code;
export const dateLabel = (stamp) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(stamp));
export function coverage(nodes) {
  if (!nodes.length) return "No qualifying observations";
  const first = nodes.reduce(
    (a, n) => (Date.parse(n.firstSeen) < Date.parse(a) ? n.firstSeen : a),
    nodes[0].firstSeen,
  );
  const last = nodes.reduce(
    (a, n) => (Date.parse(n.lastSeen) > Date.parse(a) ? n.lastSeen : a),
    nodes[0].lastSeen,
  );
  return `${dateLabel(first)} — ${dateLabel(last)} (UTC)`;
}
