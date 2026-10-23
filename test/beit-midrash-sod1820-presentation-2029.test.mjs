import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  BEIT_MIDRASH_SOD1820_PRESENTATION,
  BEIT_MIDRASH_SOD1820_SOURCE_STATUS,
  buildBeitMidrashSod1820Presentation,
} from "../src/lib/research/beitMidrashSod1820Presentation.js";
import {
  BEIT_MIDRASH_LEARNING_MANIFEST,
  beitMidrashLearningHref,
  buildBeitMidrashLearningProjection,
  resolveBeitMidrashLearningLocation,
} from "../src/lib/research/beitMidrashLearningProjection.js";
import { buildCurationCatalog2029 } from "../src/lib/research/curationProjection2029.js";

const catalog = buildCurationCatalog2029([
  { id: "diamond-b", type: "entity", label: "חתימת ב", description: "שנייה", metadata: { tier: "diamond", value: 1820, role: "signature" }, is_active: true },
  { id: "diamond-a", type: "entity", label: "חתימת א", description: "ראשונה", metadata: { tier: "diamond", value: 1820, role: "signature" }, is_active: true },
  { id: "crown-1820", type: "number", label: "1820", metadata: { tier: "diamond", value: 1820, role: "crown_anchor" }, is_active: true },
]);

test("the 1820 presentation follows the original Chotam Hakodesh deck before any site appendix", () => {
  const presentation = buildBeitMidrashSod1820Presentation(catalog);
  assert.equal(presentation.title, "חותם הקודש · סוד 1820");
  assert.equal(presentation.originalDeck.originalContentSlideCount, 21);
  assert.equal(presentation.originalDeck.omittedStaleContactSlide, 22);
  assert.equal(presentation.originalDeck.source.sourceHref, "https://www.slideserve.com/malana/5004169");
  assert.equal(presentation.video.sourceHref, "https://www.youtube.com/watch?v=DClJVGBMCs0");

  const original = presentation.slides.slice(0, 21);
  assert.deepEqual(original.map((slide) => slide.originalDeckPosition), Array.from({ length: 21 }, (_, index) => index + 1));
  assert.deepEqual(original.slice(0, 5).map((slide) => slide.id), [
    "opening", "great-wonder", "name-times-seventy", "five-books", "bereshit-milui",
  ]);
  assert.ok(presentation.slides.slice(21).every((slide) => slide.chapter === "נספח מן האתר"));
});

test("the requested source-reading lesson, personal approval copy and draft comparison are absent", () => {
  const presentation = buildBeitMidrashSod1820Presentation(catalog);
  const publicCopy = JSON.stringify(presentation);
  assert.equal(presentation.slides.some((slide) => slide.id === "reading-boundary"), false);
  assert.equal(presentation.slides.some((slide) => slide.id === "historic-methods"), false);
  assert.doesNotMatch(publicCopy, /איך קוראים|שלוש שכבות|צוריאל|1829|טיוטה|עדיין בבנייה|מראה מקום מדויק בבנייה/);
});

test("Bereshit uses the original milui calculation and totals 1820", () => {
  const slide = buildBeitMidrashSod1820Presentation(catalog, "bereshit-milui").selectedSlide;
  assert.equal(slide.title, "בראשית במילוי א״י");
  assert.deepEqual(slide.parts.map((part) => part.value), [412, 510, 111, 360, 20, 407]);
  assert.equal(slide.parts.reduce((sum, part) => sum + part.value, 0), 1820);
  assert.equal(slide.equation, "412 + 510 + 111 + 360 + 20 + 407 = 1820");
});

test("the five-book count keeps its exact Ahavat Torah links", () => {
  const slide = buildBeitMidrashSod1820Presentation(catalog, "five-books").selectedSlide;
  assert.equal(slide.equation, "165 + 398 + 311 + 396 + 550 = 1820");
  assert.deepEqual(slide.figures.map((item) => item.value), [165, 398, 311, 396, 550]);
  assert.equal(slide.truth.source, BEIT_MIDRASH_SOD1820_SOURCE_STATUS.EXACT);
  const bookSources = slide.sources.filter((source) => source.kind === "book");
  assert.equal(bookSources.length, 2);
  for (const source of bookSources) {
    assert.match(source.sourceRef, /^book:hebrewbooks:5635#p6:/);
    assert.match(source.sourceHref, /^\/book\/ahavat-torah\?tab=dossier&selection=/);
    assert.match(source.sourceHref, /&page=6#selection$/);
  }
});

test("the original arithmetic stations reproduce their stated totals", () => {
  const presentation = buildBeitMidrashSod1820Presentation(catalog);
  const ids = ["name-times-seventy", "bereshit-chain-total", "secret-and-strength", "twenty-six-to-sixty-five", "twenty-six-milui", "jacob-rachel-leah", "brothers-words", "two-censuses", "six-tribes", "leaders", "ana-bekoach"];
  for (const id of ids) {
    const slide = presentation.slides.find((item) => item.id === id);
    assert.match(`${slide.equation || ""}${JSON.stringify(slide.equations || [])}`, /1820/, id);
  }
});

test("the site appendix remains visibly separate and diamonds are projected once", () => {
  const presentation = buildBeitMidrashSod1820Presentation(catalog, "diamonds");
  assert.equal(presentation.slides[20].id, "ana-bekoach");
  assert.equal(presentation.slides[21].id, "strong-1820");
  assert.equal(presentation.slides[22].id, "bibi-examples");
  assert.equal(presentation.slides[23].id, "diamonds");
  assert.deepEqual(presentation.selectedSlide.diamonds.map((item) => item.id), ["diamond-a", "diamond-b"]);
  assert.equal(new Set(presentation.selectedSlide.diamonds.map((item) => item.id)).size, 2);
  assert.equal(presentation.selectedSlide.diamonds.some((item) => item.id === "crown-1820"), false);
});

test("presentation location is URL-only, validated and canonical", () => {
  const location = resolveBeitMidrashLearningLocation({
    search: "?section=paths&path=sod1820&lesson=sod1820&slide=bereshit-milui",
  });
  assert.equal(location.presentationSlideId, "bereshit-milui");
  assert.equal(location.canonicalHref, "/beit-midrash?section=paths&path=sod1820&lesson=sod1820&slide=bereshit-milui#sod1820-slide-bereshit-milui");
  assert.equal(
    beitMidrashLearningHref("paths", { pathId: "sod1820", lessonId: "sod1820", slideId: "diamonds" }),
    "/beit-midrash?section=paths&path=sod1820&lesson=sod1820&slide=diamonds#sod1820-slide-diamonds",
  );

  const unknown = resolveBeitMidrashLearningLocation({ search: "?section=paths&path=sod1820&lesson=sod1820&slide=private-draft" });
  assert.equal(unknown.presentationSlideId, null);
  assert.equal(unknown.canonicalHref, "/beit-midrash?section=paths&path=sod1820&lesson=sod1820#path-sod1820");
});

test("learning projection exposes the deck without a new reader, store or fetch", () => {
  const projection = buildBeitMidrashLearningProjection({
    curationCatalog: catalog,
    search: "?section=paths&path=sod1820&lesson=sod1820&slide=diamonds",
  });
  assert.equal(projection.sod1820Presentation.selectedSlide.id, "diamonds");
  assert.equal(projection.sod1820Presentation.selectedSlide.diamonds.length, 2);
  assert.equal(projection.sources.diamonds, "curationProjection2029");
  assert.equal(projection.sources.book, "book:ahavat-torah");

  const source = fs.readFileSync(new URL("../src/lib/research/beitMidrashSod1820Presentation.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /\.from\(|fetch\(|useState|useEffect|localStorage|sessionStorage/);
  assert.doesNotMatch(source, /admin_|candidate|privacy_scope:\s*["']private["']/i);
});

test("the 1820 learning path opens the presentation before the existing route chain", () => {
  const path = BEIT_MIDRASH_LEARNING_MANIFEST.learningPaths.find((item) => item.id === "sod1820");
  assert.equal(path.steps[0].id, "presentation");
  assert.equal(path.steps[0].href, BEIT_MIDRASH_SOD1820_PRESENTATION.href);
  assert.deepEqual(path.steps.slice(1).map((step) => step.id), [
    "number-layers", "math-profile", "method", "guided-example", "world-map", "heichal",
  ]);
});
