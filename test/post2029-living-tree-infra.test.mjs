import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { projectPost2029Experience } from "../src/lib/research/post2029ExperienceProjection.js";

test("Post 2029 living-tree projection is a no-op without upstream experience data", () => {
  assert.deepEqual(projectPost2029Experience({ id: 1 }), {
    version: "post-2029-experience-v1",
    media: null,
    connections: [],
    timeline: [],
    trail: [],
  });
});

test("Post 2029 living-tree projection preserves source/derivative separation and temporal roles", () => {
  const out = projectPost2029Experience({
    _experience: {
      media: {
        highlight: { src: "/highlight.mp4", sourceIdentity: "source-1", startSeconds: 11, endSeconds: 13 },
        fullSource: { href: "/full.mp4", sourceUrl: "https://example.test/source", platformId: "abc" },
      },
      timeline: [
        { id: "p", date: "2026-09-22", temporalRole: "published", label: "פורסם הפוסט" },
        { id: "e", date: "2026-09-24", temporalRole: "occurred", label: "קרה האירוע" },
      ],
      connections: [{ label: "מלח", kind: "concept", value: 78 }],
      trail: [{ label: "פוסט", active: true }, { label: "מלח" }],
    },
  });

  assert.equal(out.media.highlight.src, "/highlight.mp4");
  assert.equal(out.media.fullSource.href, "/full.mp4");
  assert.equal(out.timeline[0].temporalRole, "published");
  assert.equal(out.timeline[1].temporalRole, "occurred");
  assert.equal(out.connections[0].label, "מלח");
  assert.equal(out.trail[0].active, true);
});

test("Post 2029 page exposes stable semantic capability seams", () => {
  const page = readFileSync(new URL("../src/pages/Post2029Page.jsx", import.meta.url), "utf8");
  const media = readFileSync(new URL("../src/components/experience2029/PostEvidenceMedia2029.jsx", import.meta.url), "utf8");
  const timeline = readFileSync(new URL("../src/components/experience2029/PostTimeline2029.jsx", import.meta.url), "utf8");
  const frame = readFileSync(new URL("../src/components/experience2029/SystemFrame2029.jsx", import.meta.url), "utf8");

  assert.match(page, /data-experience-surface="post-reading"/);
  assert.match(media, /data-experience-capability="post-source-media"/);
  assert.match(timeline, /data-experience-capability="post-factual-timeline"/);
  assert.match(frame, /sod29-command-trail/);
  assert.doesNotMatch(page, /PostContextTrail2029/);
});


test("System Frame locks one shared Contextual Inspector and keeps bottom trail separate from Global Navigation", () => {
  const contract = readFileSync(new URL("../docs/sod1820-system-frame-contract-v2-addendum.md", import.meta.url), "utf8");
  const inspector = readFileSync(new URL("../src/components/experience2029/ContextualInspector2029.jsx", import.meta.url), "utf8");
  const rail = readFileSync(new URL("../src/components/experience2029/ReadingContextRail2029.jsx", import.meta.url), "utf8");

  assert.match(contract, /Contextual Inspector is one shared semantic capability across desktop surfaces/);
  assert.match(contract, /Bottom context trail != Global Navigation/);
  assert.match(contract, /The Inspector \*\*is not a mini-World\*\*/);
  assert.match(inspector, /data-experience-capability="contextual-inspector"/);
  assert.match(rail, /ContextualInspector2029/);
});


test("Golden Post architecture wireframe exposes the full structural preview without inventing product truth", async () => {
  const projectionSource = readFileSync(new URL("../src/lib/research/post2029ReadingProjection.js", import.meta.url), "utf8");
  const experienceSource = readFileSync(new URL("../src/lib/research/post2029ExperienceProjection.js", import.meta.url), "utf8");
  const page = readFileSync(new URL("../src/pages/Post2029Page.jsx", import.meta.url), "utf8");
  const frame = readFileSync(new URL("../src/components/experience2029/SystemFrame2029.jsx", import.meta.url), "utf8");

  assert.match(projectionSource, /buildPost2029ArchitectureWireframe/);
  assert.match(experienceSource, /post-2029-wireframe-v1/);
  assert.match(experienceSource, /אין טענת סיבתיות/);
  assert.match(page, /WIREFRAME · מבנה בלבד/);
  assert.equal(frame.includes('{ to: "/heichal", label: "היכל"'), false);
  assert.match(frame, /label: "מסעות"/);
  assert.match(frame, /label: "קהילה"/);
  assert.match(frame, /data-raziel-anchor="center"/);
});


test("Post timeline drops unknown temporal roles instead of asserting that an event occurred", () => {
  const out = projectPost2029Experience({
    _experience: {
      timeline: [
        { id: "bad", date: "2026-09-30", temporalRole: "unknown", label: "לא ידוע" },
        { id: "good", date: "2026-09-30", temporalRole: "discovered", label: "נמצא" },
      ],
    },
  });
  assert.equal(out.timeline.length, 1);
  assert.equal(out.timeline[0].id, "good");
  assert.equal(out.timeline[0].temporalRole, "discovered");
});

test("Research Path and commands share one physical System Frame bottom surface", () => {
  const page = readFileSync(new URL("../src/pages/Post2029Page.jsx", import.meta.url), "utf8");
  const frame = readFileSync(new URL("../src/components/experience2029/SystemFrame2029.jsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../src/components/experience2029/systemFrame2029.css", import.meta.url), "utf8");

  assert.match(page, /bottomTrail: state\.projection\?\.experience\?\.trail \|\| \[\]/);
  assert.match(frame, /has-context-trail/);
  assert.match(frame, /aria-label="מסלול המחקר הנוכחי"/);
  assert.match(css, /Unified bottom Context \+ Command Surface/);
  assert.doesNotMatch(page, /<PostContextTrail2029/);
});
