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
  const trail = readFileSync(new URL("../src/components/experience2029/PostContextTrail2029.jsx", import.meta.url), "utf8");

  assert.match(page, /data-experience-surface="post-reading"/);
  assert.match(media, /data-experience-capability="post-source-media"/);
  assert.match(timeline, /data-experience-capability="post-factual-timeline"/);
  assert.match(trail, /data-experience-capability="post-context-trail"/);
});
