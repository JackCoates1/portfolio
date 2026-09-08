/** Receiving HTTP 200 does not establish freshness. Future/invalid times fail closed. */
export function securityFreshness(stamp, now = Date.now()) {
  const time = typeof stamp === "string" ? Date.parse(stamp) : NaN;
  if (!Number.isFinite(time) || time > now + 60_000) return "UNVERIFIED";
  return now - time <= 5 * 60_000 ? "RECENT" : "STALE";
}
