import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { topicConvergenceToUniversalFinding } from "../src/lib/research/topicConvergence.js";
import { buildTopic2029Projection, topic2029SearchAudit } from "../src/lib/research/topic2029Projection.js";
import { buildTopicSourceResearchProjection } from "../src/lib/research/topicSourceResearchProjection.js";

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

const sourceResearch = buildTopicSourceResearchProjection({
  slug: "tzvi-conv-620",
  researchRows: [
    {
      id: "ro-verified",
      kind: "observation",
      statement: "עשרים = 620",
      source_ref: "channel_updates:11111111-1111-4111-8111-111111111111#batch0",
      contributor: "צבי (OPOC)",
      engine_verified: true,
      status: "candidate",
      privacy_scope: "private",
      created_at: "2026-08-06T00:52:00Z",
      meta: { ext: { spatial_research: { cluster: "620 כתר · עשרימון" } } },
    },
    {
      id: "ro-source-only",
      kind: "observation",
      statement: "source body",
      source_ref: "channel_updates:22222222-2222-4222-8222-222222222222",
      contributor: "צבי (OPOC)",
      engine_verified: false,
      status: "candidate",
      privacy_scope: "private",
      created_at: "2026-09-20T05:23:00Z",
      meta: { ext: {
        spatial_research: { cluster: "620 כתר · עשרימון" },
        wa_channel_intake: { analysis_state: "source_preserved_needs_structural_analysis" },
      } },
    },
  ],
  sourceRows: [
    {
      id: "11111111-1111-4111-8111-111111111111",
      created_at: "2026-08-06T00:51:12Z",
      text: "הכתר בגימטריא תלת מימדית\n[Image 3825.jpg]\nעשרים = 620",
      image_url: "https://example.test/a.jpg",
      credit: "צבי (OPOC)",
      channel: "torat-haremez",
    },
    {
      id: "22222222-2222-4222-8222-222222222222",
      created_at: "2026-08-06T18:33:27Z",
      text: "הכתר בגימטריא תלת מימדית\nעשרים = 620",
      image_url: "https://example.test/b.jpg",
      credit: "צבי (OPOC)",
      channel: "torat-haremez",
    },
  ],
});
assert.ok(sourceResearch);
assert.equal(sourceResearch.sourceGroups.length, 1, "same authored narrative must compose as one source layer");
assert.equal(sourceResearch.sourceGroups[0].media.length, 2, "multiple source representations stay attached");
assert.equal(sourceResearch.analysis.length, 1, "source-preservation rows must not masquerade as system analysis");
assert.equal(sourceResearch.analysis[0].engineVerified, true);
assert.equal(sourceResearch.counts.pendingStructuralAnalysis, 1);
assert.match(sourceResearch.truthBoundary, /candidate\/private/);


const page = read("src/pages/Topic2029Page.jsx");
const app = read("src/App2029.jsx");
const vercel = read("vercel.json");
const seo = read("src/lib/seo.js");
const sourceProjection = read("src/lib/research/topicSourceResearchProjection.js");
const sourcePilot = read("src/components/research/TopicSourceResearchPilot.jsx");

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

assert.match(page, /useAuth/);
assert.match(page, /searchParams\.get\("sourceview"\) === "1"/);
assert.match(page, /isAdmin/);
assert.match(page, /GOLDEN_TOPIC_SOURCE_RESEARCH\[slug\]/);
assert.match(page, /<TopicSourceResearchPilot state=\{sourceResearchState\}/);
assert.match(sourceProjection, /\.from\("research_objects"\)/);
assert.match(sourceProjection, /\.from\("channel_updates"\)/);
assert.equal(sourceProjection.includes('.from("topic_cards")'), false, "private source projection must not read legacy Topic storage");
assert.match(sourceProjection, /\.contains\("meta", \{ ext: \{ spatial_research: \{ cluster: config\.cluster \} \} \}\)/);
assert.match(sourcePilot, /דברי צבי והמחקר החי/);
assert.match(sourcePilot, /המילים של צבי/);
assert.match(sourcePilot, /ניתוח המערכת/);
assert.match(sourcePilot, /פיילוט מנהל/);


assert.match(app, /path="\/topic\/:slug" element=\{<Topic2029Page \/>/);
const config = JSON.parse(vercel);
assert.equal(config.rewrites.some((row) => row.source === "/topic/(.*)" && row.destination === "/2029.html"), true);
assert.match(seo, /export function setConvergenceJsonLd/);
assert.match(seo, /"@type": "WebPage"/);
assert.match(seo, /BreadcrumbList/);

console.log("2029 native Topic surface acceptance: PASS");
