// M0-D round 3 (12.11.2026): public candidates come from a NEW view, world_contributor_research_v2; v1 never changes.
// Proves (1) the new site reads v2 and falls back to v1 only when v2 does not exist, (2) a real error never falls back,
// (3) the code that is LIVE now (146f2f0e7, then ed30dc05b) and every reader that keeps its own status gate read v1 only, so a tab left
// open after the site deploy never receives a candidate, (4) the SQL creates v2 without touching v1 and the rollback drops v2 only.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { CONTRIBUTOR_RESEARCH_VIEW, CONTRIBUTOR_RESEARCH_VIEW_FALLBACK, isMissingRelationError, readContributorResearchView }
  from "../src/lib/research/contributorResearchView.js";
import { fetchContributorFindingsProjection, CONTRIBUTOR_LOAD_PROFILE } from "../src/lib/research/contributorFindingsProjection.js";
import { fetchWorldPublicFindingsPage } from "../src/lib/research/worldPublicFindingReader.js";

const root = new URL("..", import.meta.url).pathname;
const read = (p) => readFileSync(root + p, "utf8");
// The code live in Production on 12.11.2026: 146f2f0e7 until about 14:38 UTC, then ed30dc05b (#1323). Each is checked.
const LIVE_COMMITS = ["146f2f0e7e5e6dcd17f49af33e70808e7549ea1f", "ed30dc05bab6f079b771669de6206a99413dd5de"];
const has = (rev) => { try { execFileSync("git", ["-C", root, "cat-file", "-e", `${rev}^{commit}`], { stdio: "ignore" }); return true; } catch { return false; } };
const MISSING = { code: "PGRST205", message: "Could not find the table 'public.world_contributor_research_v2' in the schema cache" };

test("the shared helper: v2 when present; v1 only when v2 is missing; a real error is never hidden", async () => {
  assert.equal(CONTRIBUTOR_RESEARCH_VIEW, "world_contributor_research_v2");
  assert.equal(CONTRIBUTOR_RESEARCH_VIEW_FALLBACK, "world_contributor_research_v1");
  const seen = [];
  const ok = await readContributorResearchView(async (v) => { seen.push(v); return { data: [v], error: null }; });
  assert.deepEqual([ok.data, seen], [["world_contributor_research_v2"], ["world_contributor_research_v2"]]);
  for (const missing of [MISSING, { code: "42P01", message: "relation \"public.world_contributor_research_v2\" does not exist" }]) {
    const order = [];
    const returned = await readContributorResearchView(async (v) => { order.push(v); return v.endsWith("v2") ? { data: null, error: missing } : { data: ["v1"], error: null }; });
    assert.deepEqual([returned.data, order], [["v1"], ["world_contributor_research_v2", "world_contributor_research_v1"]]);
    const thrownOrder = [];
    const thrown = await readContributorResearchView(async (v) => { thrownOrder.push(v); if (v.endsWith("v2")) throw missing; return { data: ["v1"] }; });
    assert.deepEqual([thrown.data, thrownOrder.length], [["v1"], 2]);
  }
  const denied = { code: "42501", message: "permission denied for view world_contributor_research_v2" };
  assert.equal(isMissingRelationError(denied), false);
  const order = [];
  const out = await readContributorResearchView(async (v) => { order.push(v); return { data: null, error: denied }; });
  assert.deepEqual([out.error, order], [denied, ["world_contributor_research_v2"]], "a permission error is returned, not replaced by v1");
  await assert.rejects(readContributorResearchView(async () => { throw new TypeError("network down"); }), /network down/);
});

function client(tables, calls) {
  return {
    rpc: () => Promise.resolve({ data: [] }),
    from(table) {
      const call = { table, filters: [] }; calls.push(call);
      const result = tables[table] ?? { data: [] };
      const b = {
        select: () => b, in: (c, v) => { call.filters.push(["in", c, v]); return b; }, or: () => b,
        eq: (c, v) => { call.filters.push(["eq", c, v]); return b; }, like: () => b, not: () => b, is: () => b, order: () => b, contains: () => b,
        ilike: () => b, limit: () => b, range: () => Promise.resolve(result), maybeSingle: () => Promise.resolve(result),
        then: (res, rej) => Promise.resolve(result).then(res, rej),
      };
      return b;
    },
  };
}
const CONTRIBUTOR = { id: "c1", slug: "yaniv", display_name: "יניב", wa_names: [], role: "researcher" };
const SOURCE = { id: 11, created_at: "2026-10-01T10:00:00Z", text: "שלום עולם — דברי המקור בעברית", credit: "יניב", channel: "wa", status: "approved" };
const ROW = (id, status) => ({ id, created_at: "2026-10-02T10:00:00Z", kind: "equality", statement: `ממצא ${id}`, terms: ["אור"], value: 207,
  source_ref: "channel_updates:11", contributor: "יניב", status, privacy_scope: "public", meta: {} });

test("contributor source pages: candidates come from v2; with v2 missing the page still loads from v1, without candidates", async () => {
  const base = { contributors: { data: CONTRIBUTOR }, channel_updates: { data: [SOURCE], count: 1 }, research_contributions: { data: [], count: 0 } };
  const callsV2 = [];
  const withV2 = await fetchContributorFindingsProjection("yaniv", { publicClient: () => client({ ...base,
    world_contributor_research_v2: { data: [ROW("a", "approved"), ROW("b", "candidate")], count: 2 } }, callsV2), topicsReader: async () => [],
  loadProfile: CONTRIBUTOR_LOAD_PROFILE.FULL });
  assert.equal(withV2.availability.research, "ok");
  assert.equal(withV2.counts.researchObjects, 2);
  assert.ok(callsV2.some((c) => c.table === "world_contributor_research_v2"));
  assert.equal(callsV2.some((c) => c.table === "world_contributor_research_v1"), false);

  const callsV1 = [];
  const fallback = await fetchContributorFindingsProjection("yaniv", { publicClient: () => client({ ...base,
    world_contributor_research_v2: { data: null, error: MISSING },
    world_contributor_research_v1: { data: [ROW("a", "approved")], count: 1 } }, callsV1), topicsReader: async () => [],
  loadProfile: CONTRIBUTOR_LOAD_PROFILE.FULL });
  assert.equal(fallback.availability.research, "ok", "site deployed before the SQL: the page does not break");
  assert.equal(fallback.counts.researchObjects, 1);
  assert.deepEqual(callsV1.filter((c) => c.table.startsWith("world_contributor_research")).map((c) => c.table),
    ["world_contributor_research_v2", "world_contributor_research_v1"]);
});

test("World finding reader: the verified tier stays on v1; a contributor's candidate tier reads v2 and is empty while v2 is missing", async () => {
  const UUID = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
  const row = (n, status) => ({ id: UUID(n), created_at: `2026-10-0${n}T10:00:00Z`, kind: "fact", statement: `ממצא ${n} על הערך`, value: 207,
    status, privacy_scope: "public", source_ref: null, meta: {}, source_contributor_id: UUID(99) });
  const calls = [];
  const c = client({ world_contributor_research_v1: { data: [row(1, "approved")], error: null },
    world_contributor_research_v2: { data: [row(2, "candidate")], error: null } }, calls);
  await fetchWorldPublicFindingsPage({ client: c, contributorId: UUID(99), pageSize: 5 }).catch(() => null);
  const views = calls.filter((x) => x.table.startsWith("world_contributor_research")).map((x) => [x.table, x.filters.find((f) => f[1] === "status")?.[0]]);
  assert.ok(views.some(([t, op]) => t === "world_contributor_research_v1" && op === "in"), "verified tier on v1");
  assert.ok(views.some(([t, op]) => t === "world_contributor_research_v2" && op === "eq"), "candidate tier on v2");
  assert.equal(views.some(([t, op]) => t === "world_contributor_research_v1" && op === "eq"), false, "v2 present: no fallback read");
});

test("readers that keep their own status gate stay on v1 (Zvi lists, number cards, admin review)", () => {
  for (const f of ["src/lib/research/worldZviApprovedFindings2029.js", "src/lib/research/zviMultiValueWorldProjection.js", "api/world-finding-review.js"]) {
    const src = read(f);
    assert.match(src, /world_contributor_research_v1/, f);
    assert.doesNotMatch(src, /world_contributor_research_v2/, f);
  }
});

for (const LIVE of LIVE_COMMITS) {
  test(`a tab still running the LIVE code (${LIVE.slice(0, 9)}) reads v1 only, so it can never receive a candidate`, { skip: has(LIVE) ? false : "live commit not in this clone" }, () => {
    const files = execFileSync("git", ["-C", root, "grep", "-l", "world_contributor_research_v", LIVE, "--", "src", "api"]).toString().trim().split("\n");
    assert.ok(files.length >= 3);
    for (const entry of files) {
      const [, path] = entry.split(":");
      const src = execFileSync("git", ["-C", root, "show", `${LIVE}:${path}`], { maxBuffer: 16 << 20 }).toString();
      assert.doesNotMatch(src, /world_contributor_research_v2/, path);
    }
  });
}

test("the SQL creates v2 and leaves v1 byte for byte; the rollback drops v2 only; old and new readers never share a changed relation", () => {
  const sql = read("supabase/proposed/20261112134000_m0d_world_contributor_research_candidates.sql");
  const rb = read("supabase/proposed/ROLLBACK_20261112134000_m0d_world_contributor_research_candidates.sql");
  assert.match(sql, /create view public\.world_contributor_research_v2 with \(security_invoker = true, security_barrier = true\)/);
  assert.doesNotMatch(sql, /create or replace view public\.world_contributor_research_v1/i);
  assert.match(sql, /world_contributor_research_v1 changed; stop/);
  assert.match(sql, /v2 privileges differ from v1/);
  assert.match(rb, /drop view public\.world_contributor_research_v2;/);
  assert.doesNotMatch(rb, /create or replace view/i);
});

// Round 4 (browser check test/m0d-contributor-stale-client.browser.mjs found it): the public contributor page rendered a v2
// candidate WITHOUT its "טרם אומת" label. The page now carries the stored status on each finding item and labels it; verified
// findings stay first. Static and model checks here so CI holds it without the old build the browser check needs.
test("contributor page: a public candidate keeps its stored status, is labelled 'טרם אומת', and verified findings come first", async () => {
  const { buildPublicContributorView, selectContributorItems } = await import("../src/components/contributor2029/publicContributor2029Model.js");
  const { fixtureIdentity, fixtureProjection } = await import("../src/components/contributor2029/publicContributor2029Fixtures.js");
  const { researchPublicStatusPresentation } = await import("../src/lib/research/researchObjectPresentation.js");
  const view = buildPublicContributorView(fixtureProjection(), fixtureIdentity);
  const finding = view.items.find((item) => item.type === "findings");
  assert.equal(finding.publicStatus, "candidate", "the stored status, unchanged");
  assert.equal(researchPublicStatusPresentation(finding.publicStatus).label, "טרם אומת");
  const items = [
    { id: "finding:new-candidate", type: "findings", date: "2026-11-12T10:00:00Z", publicStatus: "candidate" },
    { id: "finding:old-approved", type: "findings", date: "2026-11-01T10:00:00Z", publicStatus: "approved" },
    { id: "source:middle", type: "sources", date: "2026-11-05T10:00:00Z" },
  ];
  assert.deepEqual(selectContributorItems({ items }, "all", "newest").rows.map((item) => item.id),
    ["source:middle", "finding:old-approved", "finding:new-candidate"], "verified tier first, each tier keeps the requested order");
  const page = read("src/pages/PublicContributor2029Page.jsx");
  assert.match(page, /data-public-research-status=\{item\.publicStatus\}/);
  assert.match(page, /researchPublicStatusPresentation\(item\.publicStatus\)\.label/);
  const surface = read("src/components/research/FindingSurface.jsx");
  assert.match(surface, /data-public-research-status=\{publicStatus\.status\}/);
  assert.match(read("src/components/research/ContributorFindingsLens.jsx"), /orderResearchByPublicStatusTier\(group\.universalFindings/);
});
