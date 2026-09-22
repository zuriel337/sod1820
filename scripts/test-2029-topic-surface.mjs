import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { topicConvergenceToUniversalFinding } from "../src/lib/research/topicConvergence.js";
import { buildTopic2029Projection, topic2029SearchAudit } from "../src/lib/research/topic2029Projection.js";
import {
  TOPIC_CANONICAL_SLUG_MIGRATIONS,
  canonicalTopicSlug,
  topicSourceSlugCandidates,
} from "../src/lib/research/topicCanonicalSlugAliases.js";
import { buildTopicGoldenProjection, topicDensity } from "../src/lib/research/topicGoldenProjection.js";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

const card = {
  id: "11111111-1111-4111-8111-111111111111",
  slug: "888-test",
  title: "888 — התכנסות בדיקה",
  subtitle: "תיאור מקור אמיתי של ההתכנסות",
  numbers: [888],
  highlight_numbers: [888],
  status: "approved",
  quality: 6,
  meter_score: 44,
  created_at: "2026-09-18T10:00:00Z",
  approved_at: "2026-09-19T10:00:00Z",
  node_id: null,
  created_by: "חוקר בדיקה",
  image_ids: ["img-1"],
  search_terms: ["888"],
  occurred_at: null,
  findings: {
    hint: "רמז מתוך המקור",
    caveat: "חישוב ופרשנות נשארים נפרדים.",
    source: "חוקר בדיקה",
    phrases: ["ביטוי א", "ביטוי ב"],
    bullets: ["ממצא ראשון"],
  },
};

const finding = topicConvergenceToUniversalFinding({ card });
const projection = buildTopic2029Projection(finding);
assert.ok(projection);
assert.equal(projection.slug, "888-test");
assert.equal(projection.title, card.title);
assert.equal(projection.description, card.subtitle);
assert.deepEqual(projection.numbers, [888]);
assert.deepEqual(projection.highlightNumbers, [888]);
assert.equal(projection.createdBy, "חוקר בדיקה");
assert.equal(projection.phrases.length, 2);
assert.equal(projection.caveats.length, 1);
assert.equal(projection.imageIds.length, 1);
assert.equal(projection.stage, null);
assert.equal(projection.governanceStatus, null);
assert.equal(projection.verificationState, null);

const sourceFact = finding.evidence.facts.find((fact) => fact.type === "topic-card-source");
assert.equal(sourceFact.subtitle, card.subtitle);
assert.equal(sourceFact.created_at, card.created_at);
assert.deepEqual(sourceFact.highlight_numbers, [888]);

const audit = topic2029SearchAudit(projection);
assert.equal(audit.canonicalIdentity, true);
assert.equal(audit.withheld, false);
assert.match(audit.note, /does not decide indexability/);

const page = read("src/pages/Topic2029Page.jsx");
const app = read("src/App2029.jsx");
const vercel = read("vercel.json");
const seo = read("src/lib/seo.js");

assert.match(page, /fetchCanonicalTopicConvergenceFinding/);
assert.match(page, /buildTopic2029Projection/);
assert.match(page, /data-entity-type="convergence"/);
assert.match(page, /setConvergenceJsonLd/);
assert.match(page, /התכנסות ≠ עובדה קנונית/);
assert.match(page, /to=\{"\/number\/" \+ value\}/);
assert.equal(page.includes("getTopicCardBySlug"), false);
assert.equal(page.includes("getGalleryImagesByIds"), false);
assert.equal(page.includes("BeitMidrash"), false);
assert.equal(page.includes("TopicPage.jsx"), false);

assert.match(app, /path="\/topic\/:slug" element=\{<Topic2029Page \/>/);
const config = JSON.parse(vercel);
assert.equal(config.rewrites.some((row) => row.source === "/topic/(.*)" && row.destination === "/2029.html"), true);
assert.match(seo, /export function setConvergenceJsonLd/);
assert.match(seo, /"@type": "WebPage"/);
assert.match(seo, /BreadcrumbList/);

console.log("2029 native Topic surface acceptance: PASS");


const semanticSlugs = TOPIC_CANONICAL_SLUG_MIGRATIONS.map((row) => row.newSlug);
assert.equal(TOPIC_CANONICAL_SLUG_MIGRATIONS.length, 79, "user-prefixed Topic migration count must stay exact");
assert.equal(new Set(semanticSlugs).size, 79, "canonical Topic slugs must be unique");
assert.equal(semanticSlugs.every((slug) => /^[a-z0-9-]+$/.test(slug)), true, "canonical Topic slugs must be Latin/URL-safe");
assert.equal(semanticSlugs.every((slug) => !/^(tzvi|shimon)-conv-/.test(slug)), true, "creator identity must not own canonical Topic URL");
assert.equal(canonicalTopicSlug("tzvi-conv-98"), "98-ikuv-geula");
assert.deepEqual(topicSourceSlugCandidates("98-ikuv-geula"), ["98-ikuv-geula", "tzvi-conv-98"]);

for (const { oldSlug, newSlug } of TOPIC_CANONICAL_SLUG_MIGRATIONS) {
  assert.equal(
    config.redirects.some((row) => row.source === `/topic/${oldSlug}` && row.destination === `/topic/${newSlug}` && row.permanent === true),
    true,
    `legacy Topic alias must permanently redirect: ${oldSlug}`,
  );
}

const slugMigration = read("supabase/migrations/20260922170000_topic_semantic_slug_migration_v1.sql");
assert.match(slugMigration, /expected 79 legacy rows/);
assert.match(slugMigration, /update public\.topic_cards/);
assert.match(slugMigration, /update public\.nodes/);
assert.equal(/set\s+title\s*=/.test(slugMigration), false, "slug migration must never rename the Hebrew Topic title");


assert.equal(topicDensity(0), "sparse");
assert.equal(topicDensity(2), "sparse");
assert.equal(topicDensity(3), "medium");
assert.equal(topicDensity(6), "rich");

const goldenFixture = buildTopicGoldenProjection({
  authoredFactsCount: 7,
  createdBy: "צבי (OPOC)",
  attribution: ["contribution:צבי (OPOC)", "ai"],
}, {
  hub: {
    identity: { nodeId: "topic-node" },
    graph: { relations: [{
      id: "edge-finding",
      projection: { relations: [{ relationType: "related", from: { id: "topic-node", type: "convergence", label: "Topic" }, to: { id: "n-424", type: "number", label: "424" } }] },
    }] },
    sources: [{ ref: "human:1", label: "ספר מקור" }, { ref: "technical:1", label: "work_log:abc" }],
    media: { items: [{ galleryImageId: "img-1", label: "מדיה", thumbUrl: "https://example.test/a.jpg" }] },
    research: { findings: [{ id: "r1" }] },
  },
  prominence: {
    candidateCount: 3,
    items: [{
      id: "p1",
      kind: "research",
      label: "ממצא",
      explainWhy: {
        researchStrengthSignals: ["engine_match", "provenance_present"],
        humanCuration: { tier: "gold" },
        uncertainty: null,
      },
    }],
  },
});
assert.equal(goldenFixture.density, "rich");
assert.equal(goldenFixture.graphConnections[0].href, "/number/424");
assert.deepEqual(goldenFixture.people, ["צבי (OPOC)"]);
assert.equal(goldenFixture.sources.length, 1);
assert.equal(goldenFixture.media.length, 1);
assert.equal(goldenFixture.rank.engineMatches, 1);
assert.equal(goldenFixture.rank.gold, 1);
assert.equal(goldenFixture.rank.attentionPolicy, "human_gate_only");
assert.equal(goldenFixture.rankContract.universalScore, false);

const topicPageGolden = read("src/pages/Topic2029Page.jsx");
assert.match(topicPageGolden, /fetchEntityHubProjection/);
assert.match(topicPageGolden, /buildWorldContextualProminence/);
assert.match(topicPageGolden, /buildTopicGoldenProjection/);
assert.match(topicPageGolden, /research_gold_hints_law-v3/);
assert.match(topicPageGolden, /לא ציון אמת/);
assert.equal(topicPageGolden.includes("worldConvergenceLensProjection"), false, "public Topic must not import the admin Attention lens");
assert.equal(/>EXPRESSIONS<|>FINDINGS<|>RELATIONS<|>PROVENANCE<|CANONICAL TOPIC/.test(topicPageGolden), false, "Topic Golden should be Hebrew-first");
