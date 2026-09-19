import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { topicConvergenceToUniversalFinding } from "../src/lib/research/topicConvergence.js";
import { buildTopic2029Projection, topic2029SearchAudit } from "../src/lib/research/topic2029Projection.js";

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
