// Analytics / Google / SEO / maintenance closure (ZURIEL 18.11.2026; docs/reviews/analytics-google-seo-closure-20261118/README.md).
// Each case pins one verified gap closed inside the existing owners — no new collector, store, contract or control plane.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PUBLIC_HISTORICAL_LECTURE_PATHS } from "../src/lib/publicReadingRelease2029.js";
import { groupSuggestions, maintenanceSummary, meaningKey, operationalTime, STALE_DAYS } from "../src/lib/maintenanceAttention2029.js";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("sitemap: the historical lecture pages are listed as escaped URLs, like every other family (live 18.11: 3 raw Hebrew <loc>)", () => {
  const source = read("api/sitemap.js");
  assert.match(source, /for \(const loc of PUBLIC_HISTORICAL_LECTURE_PATHS\) urls\.push\(\{loc:encodeURI\(loc\)/);
  for (const path of PUBLIC_HISTORICAL_LECTURE_PATHS) {
    const loc = encodeURI(path);
    assert.match(loc, /^[\x21-\x7e]+$/, `${path} becomes ASCII`);
    assert.equal(decodeURI(loc), path, "the same address, only escaped");
  }
});

test("Search Console sync: search type is part of the metric identity; web keeps its historical rows", () => {
  const source = read("supabase/functions/gsc-sync/index.ts");
  const block = /const SEARCH_TYPES = \[([\s\S]*?)\] as const;/.exec(source)?.[1] || "";
  assert.match(block, /type: "web",\s+prefix: "",\s+dims: \["total", \.\.\.DIMS\]/, "web: same dimension names as before (total/query/page/country/device)");
  for (const type of ["discover", "googleNews", "news", "image", "video"]) assert.match(block, new RegExp(`type: "${type}",\\s+prefix: "${type}:"`), `${type} is stored under its own prefix`);
  for (const type of ["discover", "googleNews"]) assert.doesNotMatch(new RegExp(`type: "${type}"[^\\n]*`).exec(block)[0], /DIMS|"query"/, `${type} has no query dimension`);
  assert.match(source, /JSON\.stringify\(\{ startDate, endDate, dimensions, type, rowLimit, startRow \}\)/, "the search type is sent to Google");
  assert.match(source, /onConflict: "site,date,dimension,key"/, "same upsert key: no schema change");
  assert.match(source, /if \(searchType\.type === "web"\) throw e;/, "a web failure still fails the run");
  assert.match(source, /state: "unavailable"/, "another type Google does not serve is recorded, never written as zero");
  assert.match(source, /return json\(\{ ok: false, error: String\(e\) \}, 502\)/, "a failed run is visible in the recorded response");
});

test("Meta Conversions API: the source URL carries origin and path only (no query, no fragment)", () => {
  const source = read("src/lib/marketing.js");
  assert.match(source, /event_source_url: typeof location !== "undefined" \? location\.origin \+ location\.pathname : undefined/);
  assert.doesNotMatch(source, /location\.href/);
});

test("Vercel reader: an empty answer is 'not collecting', never zero visitors", async () => {
  const original = { fetch: globalThis.fetch, token: process.env.VERCEL_API_TOKEN };
  process.env.VERCEL_API_TOKEN = "test-token";
  const empty = { data: [] };
  globalThis.fetch = async url => {
    const href = String(url);
    if (href.includes("/auth/v1/user")) return new Response(JSON.stringify({ id: "admin-id" }), { status: 200 });
    if (href.includes("/rest/v1/users")) return new Response(JSON.stringify([{ role: "admin" }]), { status: 200 });
    return new Response(JSON.stringify(href.includes("/count") ? { data: {} } : empty), { status: 200 });
  };
  try {
    const { default: handler } = await import("../api/vercel-insights.js");
    let body = null;
    const res = { setHeader() {}, status() { return this; }, json(value) { body = value; } };
    await handler({ headers: { authorization: "Bearer x" }, query: {} }, res);
    assert.equal(body.configured, true);
    assert.equal(body.collecting, false);
    assert.equal("totals" in body, false, "no zero totals are reported");
  } finally {
    globalThis.fetch = original.fetch;
    if (original.token === undefined) delete process.env.VERCEL_API_TOKEN; else process.env.VERCEL_API_TOKEN = original.token;
  }
});

test("control plane: provider cards show the data window and the time each provider was read", () => {
  const source = read("src/components/experience2029/OperationalMetrics2029.jsx");
  assert.match(source, /\[key\]: \{ loading: false, data, readAt: new Date\(\)\.toISOString\(\) \}/);
  for (const text of ["נקרא מ־Google", "נקרא מ־Vercel", "providerWindow(d.daily", "providerWindow(d.timeline", "חיפוש באינטרנט (Web) בלבד", "state.data?.collecting === false"])
    assert.ok(source.includes(text), text);
  const control = read("src/pages/ControlPlane2029Page.jsx");
  assert.match(control, /const MaintenanceAttention2029 = React\.lazy\(\(\) => import\("\.\.\/components\/experience2029\/MaintenanceAttention2029\.jsx"\)\);/, "maintenance view is loaded on demand");
});

test("maintenance: repeated recommendations with the same meaning are one item; nothing is closed automatically", () => {
  const now = Date.parse("2026-11-18T14:00:00Z");
  const rows = [
    ...Array.from({ length: 36 }, (_, i) => ({ id: `w${i}`, status: "pending", detector: "capacity_growth_guard", category: "performance", title: "Capacity/Growth CAPACITY_WARNING", created_at: new Date(now - i * 86400000).toISOString() })),
    { id: "a1", status: "pending", detector: "capacity_growth_guard", category: "performance", title: "Capacity/Growth ALERT", created_at: "2026-11-17T06:00:00Z" },
    { id: "r5", status: "pending", detector: "runtime_error_incident", category: "performance", title: "תקרית-ריצה חוזרת (5 sessions): Uncaught Error: WebSocket", created_at: "2026-10-05T07:15:00Z" },
    { id: "r6", status: "pending", detector: "runtime_error_incident", category: "performance", title: "תקרית-ריצה חוזרת (6 sessions): Uncaught Error: WebSocket", created_at: "2026-10-31T03:45:00Z" },
    { id: "d1", status: "later", detector: "dependency_upgrade_radar", category: "performance", title: "vite 8.3.0 → 8.3.8", created_at: "2026-11-15T08:00:00Z" },
    { id: "x1", status: "accepted", detector: "dependency_upgrade_radar", category: "performance", title: "done", created_at: "2026-11-15T08:00:00Z" },
  ];
  assert.equal(meaningKey(rows[37]), meaningKey(rows[38]), "counts in the title do not split one issue");
  const groups = groupSuggestions(rows, now);
  assert.equal(groups.length, 4, "36 warnings + 1 alert + 2 runtime + 1 upgrade (accepted excluded)");
  const warning = groups.find(group => group.title === "Capacity/Growth CAPACITY_WARNING");
  assert.equal(warning.count, 36);
  assert.equal(warning.owner, "foundation_closure_protocol_law · קיבולת");
  const runtime = groups.find(group => group.detector === "runtime_error_incident");
  assert.equal(runtime.count, 2);
  assert.equal(runtime.possiblyStale, true, `no recurrence for more than ${STALE_DAYS} days is marked, not closed`);
  assert.equal(groups.at(-1).detector, "runtime_error_incident", "stale groups sort after live ones");
  assert.ok(groups.indexOf(groups.find(group => group.title === "Capacity/Growth ALERT")) < groups.indexOf(warning), "an alert ranks above a warning");
  const summary = maintenanceSummary(groups);
  assert.deepEqual([summary.rows, summary.groups, summary.recurring, summary.possiblyStale], [40, 4, 2, 1]);
  assert.match(operationalTime("2026-11-18T12:00:00Z"), /14:00/, "Israel time");
  assert.equal(operationalTime("not a date"), "—");
  const ui = read("src/components/experience2029/MaintenanceAttention2029.jsx");
  assert.doesNotMatch(ui, /adminSuggestionDecide|admin_suggestion_decide/, "the view never decides or dismisses");
});
