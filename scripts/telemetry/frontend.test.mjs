import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseSnapshot, coverage } from "../../src/lib/telemetry.mjs";
const fresh = () =>
  JSON.parse(
    readFileSync(
      new URL("../../public/data/security-snapshot.json", import.meta.url),
    ),
  );
test("real public snapshot validates and all counts reconcile", () => {
  const s = parseSnapshot(fresh());
  assert.equal(s.feeds.length, 2);
  assert.ok(s.feeds[0].count > 0);
  assert.match(coverage(s.feeds[0].nodes), /UTC/);
});
test("rejects missing, duplicate and misclassified sources", () => {
  for (const mutate of [
    (s) => s.feeds.pop(),
    (s) => (s.feeds[1] = s.feeds[0]),
    (s) => (s.feeds[1].kind = "detections"),
    (s) => (s.feeds[0] = null),
  ]) {
    const s = fresh();
    mutate(s);
    assert.throws(() => parseSnapshot(s));
  }
});
test("rejects invented totals, invalid coordinates and timestamps", () => {
  for (const mutate of [
    (s) => s.feeds[0].count++,
    (s) => (s.feeds[0].nodes[0].latitude = 91),
    (s) => (s.feeds[0].nodes[0].longitude = NaN),
    (s) => (s.feeds[0].nodes[0].lastSeen = "not a date"),
    (s) => (s.feeds[0].nodes[0].lastSeen = "2099-01-01T00:00:00Z"),
    (s) => (s.feeds[0].nodes[0].firstSeen = "2026-01-01T00:00:00"),
    (s) => s.feeds[0].nodes[0].categories[0].count++,
  ]) {
    const s = fresh();
    mutate(s);
    assert.throws(() => parseSnapshot(s));
  }
});
test("empty observations are valid and never filled with example data", () => {
  const s = fresh();
  s.feeds[1].nodes = [];
  s.feeds[1].count = 0;
  assert.equal(parseSnapshot(s).feeds[1].nodes.length, 0);
  assert.equal(coverage([]), "No qualifying observations");
});
test("published aggregate has no raw address, host or arbitrary log fields", () => {
  for (const f of fresh().feeds)
    for (const n of f.nodes) {
      assert.deepEqual(Object.keys(n).sort(), [
        "categories",
        "count",
        "country",
        "firstSeen",
        "id",
        "lastSeen",
        "latitude",
        "longitude",
      ]);
      assert.ok(!JSON.stringify(n).match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/));
    }
});
