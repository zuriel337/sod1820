import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { projectPost2029Experience } from "../src/lib/research/post2029ExperienceProjection.js";
import { post2029ReadingInternals } from "../src/lib/research/post2029ReadingProjection.js";
import { mergeResearchContext } from "../src/lib/research/researchContext.js";

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

  assert.match(page, /bottomTrail: \[/);
  assert.match(page, /surfaceFocus:/);
  assert.match(frame, /has-context-trail/);
  assert.match(frame, /aria-label="מסלול המחקר הנוכחי"/);
  assert.match(css, /Unified bottom Context \+ Command Surface/);
  assert.doesNotMatch(page, /<PostContextTrail2029/);
});


test("Research Context preserves bottom trail at runtime", () => {
  const merged = mergeResearchContext(null, { subject: { id: "post-1", type: "post", label: "Golden", href: "/post/golden" }, dimensions: { bottomTrail: [{ id: "root", label: "Post", kind: "post", active: false, href: "/post/golden" }, { id: "focus", label: "631", kind: "number", active: true, href: "/2029/number/631" }] } });
  assert.equal(merged.dimensions.bottomTrail.length, 2);
  assert.equal(merged.dimensions.bottomTrail[1].label, "631");
});


test("FZ1073 pilot builds bounded context without changing other posts", () => {
  const { FZ1073_SLUG, FZ1073_REGIONS, buildFz1073Experience, markFz1073RegionHeadings } = post2029ReadingInternals;
  assert.equal(FZ1073_SLUG, "flydubai-fz1073-363-14000-remzei-geula");
  assert.equal(FZ1073_REGIONS.length, 7);

  const marked = markFz1073RegionHeadings("<h1>מהשמיים — עד הנחיתה בטבוק</h1><h2>סעודיה</h2>");
  assert.match(marked, /data-source-heading="true"/);

  const experience = buildFz1073Experience(
    { date: "2026-09-30T20:15:36.000Z" },
    { slug: "gapfill-363", title: "363 — חמישה = המשיח" },
  );
  assert.equal(experience.connections[0].href, "/topic/gapfill-363");
  assert.equal(experience.connections.find((row) => row.id === "topic-718")?.href, "/topic/gapfill-718");
  assert.equal(experience.connections.find((row) => row.id === "topic-386")?.href, "/topic/386-david-ben-yishai-tzipor");
  assert.equal(experience.connections.length, 6);
  assert.equal(experience.timeline[0].temporalRole, "occurred");
  assert.equal(experience.timeline.find((row) => row.id === "fz1073-published")?.temporalRole, "published");
  assert.equal(experience.media.highlight.src.includes("final-20261001-v4.mp4"), true);
  assert.equal(experience.connections.find((row) => row.id === "oct-710-post")?.href.includes("710-"), true);
  assert.equal(experience.connections.find((row) => row.id === "tiran-saudi-post")?.href.includes("%d7%"), true);
  assert.equal(experience.trail[0].label, "FZ1073");
});

test("Only the FZ1073 legacy URL is redirected into Post 2029", () => {
  const config = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));
  const redirects = config.redirects || [];
  const source = "/flydubai-fz1073-363-14000-remzei-geula";
  const match = redirects.find((row) => row.source === source);
  assert.ok(match);
  assert.equal(match.destination, "/post/flydubai-fz1073-363-14000-remzei-geula");
  assert.equal(match.permanent, true);
  assert.equal(redirects.some((row) => row.source === "/(.*)" && String(row.destination || "").startsWith("/post/")), false);
});


test("Posts-first High-Fidelity Golden reconciles onto current 2029 shell", () => {
  const app = readFileSync(new URL("../src/App2029.jsx", import.meta.url), "utf8");
  const frame = readFileSync(new URL("../src/components/experience2029/SystemFrame2029.jsx", import.meta.url), "utf8");
  const index = readFileSync(new URL("../src/pages/Posts2029Page.jsx", import.meta.url), "utf8");
  const indexCss = readFileSync(new URL("../src/pages/posts2029.css", import.meta.url), "utf8");
  const post = readFileSync(new URL("../src/pages/Post2029Page.jsx", import.meta.url), "utf8");
  const postCss = readFileSync(new URL("../src/pages/post2029-reading.css", import.meta.url), "utf8");
  const config = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));

  assert.match(app, /path="\/2029\/posts" element={<Posts2029Page/);
  assert.match(app, /path="\/post\/:slug" element={<Post2029Page/);
  assert.doesNotMatch(app, /path="\/post" element={<Posts2029Page/);
  assert.match(frame, /to: "\/2029\/posts", label: "פוסטים"/);

  assert.match(index, /<Sod2029Shell surface="post"/);
  assert.doesNotMatch(index, /<Sod2029Shell surface="posts"/);
  assert.match(index, /data-experience-surface="posts-index"/);
  assert.match(index, /data-experience-capability="posts-index-hero"/);
  assert.match(index, /getPostsFromSupabase/);
  assert.match(index, /Golden Preview/);

  assert.match(post, /data-experience-capability="post-master-hero"/);
  assert.match(post, /data-experience-capability="post-master-reading-stage"/);
  assert.match(post, /shell\.openNumber\?\./);
  assert.match(post, /source: "post-master-hero"/);
  assert.doesNotMatch(post, /<Link[^>]+2029\/number/);

  assert.match(indexCss, /var\(--s29-accent\)/);
  assert.match(indexCss, /var\(--s29-panel\)/);
  assert.match(postCss, /Post Master high-fidelity hero/);
  assert.doesNotMatch(indexCss, /#[0-9a-fA-F]{3,8}/);

  assert.ok(config.rewrites.some((row) => row.source === "/2029/posts" && row.destination === "/2029.html"));
  const previewHeaders = config.headers.find((row) => row.source === "/2029/posts");
  assert.ok(previewHeaders);
  assert.ok(previewHeaders.headers.some((header) => header.key === "X-Robots-Tag" && /noindex/.test(header.value)));
});

test("Bennett and FZ1073 remain the two Post Master fixtures", () => {
  const { BENNETT_SALT_SLUG, BENNETT_SALT_REGIONS, FZ1073_SLUG, FZ1073_REGIONS } = post2029ReadingInternals;
  assert.equal(BENNETT_SALT_SLUG, "bennett-melach-631-78");
  assert.deepEqual(BENNETT_SALT_REGIONS.map((region) => region.number), [78, 631, 78, 133, 690]);
  assert.equal(FZ1073_SLUG, "flydubai-fz1073-363-14000-remzei-geula");
  assert.equal(FZ1073_REGIONS.length, 7);
});



test("Post Master Bennett fixture opens canonical contextual number focus without a parallel renderer", () => {
  const page = readFileSync(new URL("../src/pages/Post2029Page.jsx", import.meta.url), "utf8");

  const { BENNETT_CONTEXTUAL_NUMBER_FOCUS, markBennettContextualNumberFocus } = post2029ReadingInternals;
  assert.deepEqual(BENNETT_CONTEXTUAL_NUMBER_FOCUS, {
    expression: "מלח",
    methodKey: "רגיל",
    resultValue: 78,
    regionId: "salt-78",
  });

  const source = '<h2 data-source-heading="true">הרמז המרכזי — מלח</h2><p>מקור</p>';
  const untouched = markBennettContextualNumberFocus(source, { verified: false, value: 78 });
  assert.equal(untouched, source);

  const marked = markBennettContextualNumberFocus(source, { verified: true, value: 78 });
  assert.match(marked, /data-contextual-number-focus-group="true"/);
  assert.match(marked, /data-expression="מלח"/);
  assert.match(marked, /data-method="רגיל"/);
  assert.match(marked, /data-result="78"/);

  assert.match(page, /entityType: "gematria_expression"/);
  assert.match(page, /expression: cleanExpression/);
  assert.match(page, /method: cleanMethodKey/);
  assert.match(page, /resultValue: numericResult/);
  assert.match(page, /locator,/);
  assert.match(page, /type: "phrase"/);
  assert.match(page, /source: "post-contextual-focus"/);
  assert.match(page, /exactReturnForRegion\(targetRegion\)/);
  assert.doesNotMatch(page, /SpatialMethodStage2029/);
  assert.doesNotMatch(page, /fetchGematriaMethodTrace/);
});


test("Unified Experience exposes one shared rail and section navigation without a duplicate Post rail", () => {
  const frame = readFileSync(new URL("../src/components/experience2029/SystemFrame2029.jsx", import.meta.url), "utf8");
  const rail = readFileSync(new URL("../src/components/experience2029/SurfaceContextRail2029.jsx", import.meta.url), "utf8");
  const tabs = readFileSync(new URL("../src/components/experience2029/SurfaceSectionNav2029.jsx", import.meta.url), "utf8");
  const post = readFileSync(new URL("../src/pages/Post2029Page.jsx", import.meta.url), "utf8");
  assert.match(frame, /SurfaceContextRail2029/);
  assert.match(frame, /surfaceFocus/);
  assert.match(rail, /ContextualInspector2029/);
  assert.match(rail, /sod29-surface-context-mobile-cue/);
  assert.match(tabs, /data-experience-capability="surface-section-nav"/);
  assert.match(post, /SurfaceSectionNav2029/);
  assert.doesNotMatch(post, /<ReadingContextRail2029/);
});
