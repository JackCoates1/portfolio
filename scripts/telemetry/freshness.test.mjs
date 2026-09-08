import { test } from "node:test";
import assert from "node:assert/strict";
import { securityFreshness } from "../../src/lib/security-freshness.mjs";
const now = Date.parse("2026-09-08T03:00:00Z");
test("freshness depends on source generation time, not successful fetch", () => {
  assert.equal(securityFreshness("2026-09-08T02:59:00Z", now), "RECENT");
  assert.equal(securityFreshness("2026-09-07T02:59:00Z", now), "STALE");
});
test("missing, invalid and implausible future times never imply fresh data", () => {
  for (const stamp of [undefined, "bad", "2099-01-01T00:00:00Z"])
    assert.equal(securityFreshness(stamp, now), "UNVERIFIED");
});
