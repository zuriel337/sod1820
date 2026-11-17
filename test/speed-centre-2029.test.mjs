import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SPEED_MIN_SAMPLES, speedAttention, speedBuildLabel, speedFixState, speedMetricRows, speedRating, speedReadTimes } from "../src/lib/speedCentre2029.js";

// The speed centre's projection (ZURIEL 17.11.2026): ratings from Google's thresholds, honest states, attention that never calls a gap "ok".
test("ratings: good up to the good threshold, poor above the poor one, few below the sample floor, unknown without a value", () => {
  assert.equal(speedRating(2500, 2500, 4000), "good"); assert.equal(speedRating(2501, 2500, 4000), "needs"); assert.equal(speedRating(4001, 2500, 4000), "poor");
  assert.equal(speedRating(null, 2500, 4000), "unknown");
  const rows = speedMetricRows({ samples: 50, p75: { lcp_ms: 2000, cls: 0.3 }, sample_counts: { lcp: 50, cls: SPEED_MIN_SAMPLES - 1 }, thresholds: { lcp_good_max_ms: 2500 } });
  assert.equal(rows.find(r => r.key === "lcp").rating, "good");
  assert.equal(rows.find(r => r.key === "cls").rating, "few", "a metric with fewer samples than the floor is only an observation");
  assert.deepEqual(rows.map(r => r.key), ["lcp", "inp", "cls", "fcp", "ttfb"]);
  assert.equal(rows.find(r => r.key === "ttfb").good, 800, "Google's TTFB good threshold as the fallback");
});

test("a build is named only by verified evidence; everything else stays unknown", () => {
  const evidence = [{ build: "2029-AAAA", sha: "2011226fe58eff", deployment: "dpl_x" }];
  assert.deepEqual(speedBuildLabel("2029-AAAA", evidence).known, true);
  assert.match(speedBuildLabel("2029-AAAA", evidence).label, /2011226fe · dpl_x/);
  assert.equal(speedBuildLabel("2029-BBBB", evidence).known, false);
  assert.equal(speedBuildLabel("unknown", evidence).known, false);
  assert.equal(speedBuildLabel(null, evidence).known, false);
});

test("fix states keep merged, deployed, verified and measured apart", () => {
  assert.equal(speedFixState({ merged: false }).group, "open");
  assert.equal(speedFixState({ merged: true, deployed: false }).group, "merged");
  assert.equal(speedFixState({ merged: true, deployed: "unknown" }).group, "merged", "an unknown deployment is not on the site");
  assert.equal(speedFixState({ merged: true, deployed: true, measurement: { kind: "lab" } }).group, "awaiting", "lab evidence is not a field measurement");
  assert.equal(speedFixState({ merged: true, deployed: true, measurement: { kind: "field" } }).group, "measured");
  assert.equal(speedFixState({ merged: true, deployed: true, live_verified: "yes" }).live, true);
});

test("attention: a failed read, no samples, a stale sample, a stopped or missing watch and open findings are all attention, most serious first", () => {
  const now = Date.parse("2026-11-17T12:00:00Z");
  const keys = list => list.map(i => i.key);
  assert.deepEqual(keys(speedAttention({ read: { error: true }, now })), ["source"]);
  assert.ok(keys(speedAttention({ read: { data: { web_vitals: { samples: 0, latest_sample_at: null, watch: null } } }, now })).includes("no-samples"));
  const stale = speedAttention({ read: { data: { web_vitals: { samples: 100, latest_sample_at: "2026-11-17T04:00:00Z", watch: { computed_at: "2026-11-17T08:00:00Z" },
    watch_open: [{ id: 1, detector: "web_vitals_measurement_gap", title: "מדידת המהירות הפסיקה" }] } } }, now });
  assert.deepEqual(keys(stale).slice(0, 1), ["finding-1"], "a measurement gap is the most serious");
  assert.ok(keys(stale).includes("stale-sample") && keys(stale).includes("watch-stale"));
  assert.ok(keys(speedAttention({ read: { data: { web_vitals: { samples: 100, latest_sample_at: "2026-11-17T11:59:00Z" } } }, now })).includes("watch-missing"));
  assert.ok(keys(speedAttention({ read: { data: {} }, now })).includes("no-vitals"));
  assert.ok(keys(speedAttention({ read: { data: { web_vitals: { samples: 5 } } }, now, fixes: [{ merged: true, deployed: true, measurement: { kind: "lab" } }] })).includes("awaiting"));
});

test("read time and measurement time are separate", () => {
  const t = speedReadTimes({ readAt: "2026-11-17T12:00:00Z", data: { meta: { hours: 24, from: "a", to: "b" }, web_vitals: { samples: 3, latest_sample_at: "2026-11-17T10:00:00Z", context_coverage: { build: 1 } } } }, Date.parse("2026-11-17T12:00:00Z"));
  assert.equal(t.readAt, "2026-11-17T12:00:00Z"); assert.equal(t.latestSampleAt, "2026-11-17T10:00:00Z"); assert.equal(t.latestSampleHours, 2); assert.equal(t.withContext, 1);
});

test("the centre stays an admin-only lazy part of /2029/control and reads only the existing sources", () => {
  const page = readFileSync(new URL("../src/pages/ControlPlane2029Page.jsx", import.meta.url), "utf8");
  assert.match(page, /const OperationalMetrics2029 = React\.lazy\(\(\) => import\("\.\.\/components\/experience2029\/OperationalMetrics2029\.jsx"\)\)/);
  assert.match(page, /<OperationalMetrics2029 principal=\{principal\} refreshToken=\{refreshToken\} providersOpen=\{metricsOpen\}\/>/);
  const app = readFileSync(new URL("../src/App2029.jsx", import.meta.url), "utf8");
  assert.match(app, /const ControlPlane2029Page = lazy\(\(\) => import\("\.\/pages\/ControlPlane2029Page\.jsx"\)\)/, "the control page itself is a lazy route");
  const component = readFileSync(new URL("../src/components/experience2029/OperationalMetrics2029.jsx", import.meta.url), "utf8");
  assert.ok(!/supabase\.rpc|from\("/.test(component), "no reader of its own");
  const map = JSON.parse(readFileSync(new URL("../docs/reviews/unified-performance-consolidation-20261031.json", import.meta.url), "utf8"));
  assert.ok(map.groups.length === 34 && map.baseline === "d2dd882f960a329394f4a23d7b6e4a7d4c4c6fd5", "the historical baseline is kept");
  assert.ok(Array.isArray(map.current_state_20261117.build_evidence) && map.current_state_20261117.build_evidence.every(b => b.build && b.sha && b.deployment && b.evidence));
});

test("post document freshness: a failed purge is urgent, a missing or stopped watch is attention, nothing is listed twice, an inactive layer is no attention", () => {
  const now = Date.parse("2026-11-17T12:00:00Z");
  const keys = list => list.map(i => i.key);
  const base = { samples: 100, latest_sample_at: "2026-11-17T11:59:00Z", watch: { computed_at: "2026-11-17T11:30:00Z" } };
  const fresh = extra => ({ status: "ok", computed_at: "2026-11-17T11:50:00Z", purge_configured: true, changes_24h: 3, purges_ok: 3, purges_failed: 0, purges_pending: 0, ...extra });
  const at = w => speedAttention({ read: { data: { web_vitals: { ...base, ...w } } }, now });
  assert.deepEqual(keys(at({})), [], "the reader does not report it (not active in the database): no attention, no invented state");
  assert.deepEqual(keys(at({ post_document_freshness: fresh() })), [], "a confirmed purge on a fresh watch is no attention");
  assert.deepEqual(keys(at({ post_document_freshness: null })), ["freshness-missing"]);
  assert.deepEqual(keys(at({ post_document_freshness: fresh({ computed_at: "2026-11-17T10:00:00Z" }) })), ["freshness-stale"]);
  const failed = at({ post_document_freshness: fresh({ status: "purge_failed", purges_failed: 2 }) });
  assert.deepEqual(keys(failed), ["freshness-failed"]); assert.equal(failed[0].level, "critical");
  const open = at({ post_document_freshness: fresh({ status: "purge_failed", purges_failed: 2 }),
    watch_open: [{ id: 7, detector: "post_document_purge_failed", title: "ניקוי ה־CDN נכשל" }] });
  assert.deepEqual(keys(open), ["finding-7"], "the open suggestion is the one item"); assert.equal(open[0].level, "critical");
  const unset = at({ post_document_freshness: fresh({ status: "not_configured", purge_configured: false, purges_ok: 0 }) });
  assert.deepEqual(keys(unset), ["freshness-not-configured"]); assert.equal(unset[0].level, "warn");
  assert.deepEqual(keys(at({ post_document_freshness: fresh({ status: "idle", purge_configured: false, changes_24h: 0 }) })), [], "no change, nothing to purge");
});

test("the freshness block reads only the speed source's own field and says when the layer is not active", () => {
  const component = readFileSync(new URL("../src/components/experience2029/OperationalMetrics2029.jsx", import.meta.url), "utf8");
  assert.match(component, /<FreshnessBlock fresh=\{w\.post_document_freshness\} \/>/);
  assert.match(component, /לא פעילה במסד \(המקור לא מחזיר אותה\)/);
  assert.match(component, /data-post-freshness=\{state\}/);
});
