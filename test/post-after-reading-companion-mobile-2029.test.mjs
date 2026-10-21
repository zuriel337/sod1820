import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (file) => readFileSync(new URL("../" + file, import.meta.url), "utf8");

const page = read("src/pages/Post2029Page.jsx");
const tabs = read("src/components/experience2029/PostAfterReadingTabs2029.jsx");
const tabCss = read("src/components/experience2029/postAfterReadingTabs2029.css");
const rail = read("src/components/experience2029/SurfaceContextRail2029.jsx");
const frame = read("src/components/experience2029/SystemFrame2029.jsx");
const frameCss = read("src/components/experience2029/systemFrame2029-unified-bar.css");
const cupsCss = read("src/components/experience2029/contextDepthCupsInRail2029.css");
const review = read("src/components/experience2029/Elections631ContextPreview2029.jsx");
const reader = read("src/lib/research/elections631PostReviewReader2029.js");

test("Post 5107 reads and renders original article before any optional post-end discovery", () => {
  assert.ok(page.indexOf("dangerouslySetInnerHTML={{ __html: preparedPostBody }}")
    < page.indexOf("<PostAfterReadingTabs2029 postId={post.id}"));
  assert.match(page, /POST_631_PREVIEW_2029 && isElectionsMaster/);
  assert.match(page, /!projection\.draft && !projection\.privateStage && !projection\.previewSnapshot/);
  assert.match(page, /postConvergenceContent/);
  assert.match(page, /postContinuationsContent/);
  assert.match(page, /<PostTimeline2029 items=\{visibleTimeline\}/);
  assert.match(page, /<footer id="post-sources"/);
  assert.match(page, /<PostComments2029/);
  assert.doesNotMatch(page, /<Elections631ContextPreview2029[^>]+model=\{[^}]*\}[^>]+onOpenRaziel/);
});

test("the post-end Links, Meeting and Sources are one accessible in-flow menu", () => {
  for (const [id, label] of [["connections","קשרים"],["meeting","התכנסויות"],["sources","מקורות"]]) {
    assert.ok(tabs.includes('id: "' + id + '", label: "' + label + '"'));
  }
  assert.match(tabs, /role="tablist"/);
  assert.match(tabs, /role="tab"/);
  assert.match(tabs, /role="tabpanel"/);
  assert.match(tabs, /aria-selected=\{active === tab\.id\}/);
  assert.match(tabs, /ArrowLeft/);
  assert.match(tabs, /ArrowRight/);
  assert.match(tabs, /Home/);
  assert.match(tabs, /End/);
  assert.match(tabs, /post-discovery-meeting/);
  assert.match(tabs, /post-sources/);
  assert.match(tabs, /post-connections/);
  assert.match(tabs, /hash: "#post-discovery-" \+ next/);
  assert.doesNotMatch(tabCss, /position:\s*fixed/);
  assert.match(tabCss, /min-height:44px/);
  assert.match(tabCss, /@media\(max-width:620px\)/);
});

test("six canonical cups remain in Companion; details and provenance are in the Post only", () => {
  assert.match(rail, /DIMENSIONS, COVERAGE_LABEL/);
  assert.match(rail, /ContextDepthCups2029/);
  assert.match(rail, /variant="compact"/);
  assert.match(rail, /post-discovery-meeting/);
  assert.match(rail, /findings\.length && !electionsPostActive/);
  assert.match(rail, /hasNumber && !restMode && !electionsPostActive/);
  assert.doesNotMatch(rail, /Elections631ContextPreview2029/);
  assert.match(review, /view === "sources"/);
  assert.match(review, /variant="full"/);
  assert.match(reader, /public_calculation_reader_error/);
  assert.match(reader, /\.eq\("is_published", true\)/);
  assert.match(cupsCss, /min-height:44px/);
  assert.doesNotMatch(cupsCss, /position:\s*fixed/);
});

test("mobile has one gated Now launcher, one central Raziel orb and one Context locator", () => {
  assert.match(frame, /sod29-command-island is-unified-bar/);
  assert.match(frame, /<RazielOrb compact/);
  assert.match(frame, /<CompanionPanel2029/);
  assert.match(frame, /<SurfaceContextRail2029/);
  assert.match(frame, /const companionHasContext = showContextRail && !numberPageRoute/);
  assert.match(frame, /data-shell-review=\{import\.meta\.env\.VITE_ELECTIONS_631_PREVIEW/);
  assert.match(frameCss, /\[data-shell-review="elections631"\]/);
  assert.match(frameCss, /\.sod29-now-tab:is\(\.is-me,\.is-rz\)\{display:none\}/);
  assert.match(frameCss, /\.sod29-now-tab\.is-world/);
  assert.match(frameCss, /min-width:44px;width:44px;min-height:44px/);
  assert.match(frameCss, /:has\(\.sod29-glass-locator\) \.sod29-feed-chip\{display:none\}/);
  assert.match(frameCss, /@media\(max-width:620px\)/);
  // The native left chat is deliberately not rendered on Posts; the existing
  // orb/sheet can consume the Post reading focus without a separate AI engine.
  assert.match(frame, /razielNode=\{razielLocked \|\| surface === "post" \? null : <RazielNativeChat/);
  assert.match(frame, /onClick=\{companionActive && surface !== "post" \? focusCompanionRaziel : openRaziel\}/);
  assert.doesNotMatch(tabs + review + reader, /askRaziel\(|new.*Raziel|new ResearchProvider/);
});

test("mobile and on-demand source review do not create a second evidence authority", () => {
  assert.match(reader, /readElections631PostReview2029\(post,/);
  assert.match(reader, /projectElections631Context\(\{ post, gematriaRows:/);
  assert.match(reader, /summaryForElections631Context2029/);
  assert.match(page, /elections631Coverage: statuses/);
  assert.doesNotMatch(page, /new Graph|INSERT INTO|UPDATE posts|source_copy/);
  assert.doesNotMatch(review, /new score|convergence_meter\(/i);
});
