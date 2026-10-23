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
  {
    id: "diamond-b",
    type: "entity",
    label: "חתימת ב",
    description: "שנייה",
    metadata: { tier: "diamond", value: 1820, role: "signature" },
    is_active: true,
  },
  {
    id: "diamond-a",
    type: "entity",
    label: "חתימת א",
    description: "ראשונה",
    metadata: { tier: "diamond", value: 1820, role: "signature" },
    is_active: true,
  },
  {
    id: "crown-1820",
    type: "number",
    label: "1820",
    metadata: { tier: "diamond", value: 1820, role: "crown_anchor" },
    is_active: true,
  },
]);

test("1820 presentation starts from the exact Ahavat Torah source and keeps truth axes separate", () => {
  const presentation = buildBeitMidrashSod1820Presentation(catalog);
  assert.equal(presentation.id, "sod1820");
  assert.equal(presentation.selectedSlide.id, "opening");
  assert.equal(presentation.slides.at(-1).id, "diamonds");
  assert.equal(presentation.media.poster.sourceRef, "posts:1799");
  assert.equal(presentation.media.torahNameCount.sourceRef, "posts:1799");
  assert.ok(Object.values(presentation.media).every((item) => item.src.startsWith("https://") && item.alt));

  const countSlide = presentation.slides.find((slide) => slide.id === "five-books");
  assert.equal(countSlide.equation, "165 + 398 + 311 + 396 + 550 = 1820");
  assert.deepEqual(countSlide.figures.map((item) => item.value), [165, 398, 311, 396, 550]);
  assert.equal(countSlide.truth.source, BEIT_MIDRASH_SOD1820_SOURCE_STATUS.EXACT);
  assert.equal(countSlide.truth.calculation, "reproducible_arithmetic");
  assert.equal(countSlide.truth.interpretation, "separate");

  for (const source of countSlide.sources) {
    assert.match(source.sourceRef, /^book:hebrewbooks:5635#p6:/);
    assert.match(source.sourceHref, /^\/book\/ahavat-torah\?tab=dossier&selection=/);
    assert.match(source.sourceHref, /&page=6#selection$/);
  }
});

test("the original visual seals stay source-linked and unresolved arithmetic stays unresolved", () => {
  const presentation = buildBeitMidrashSod1820Presentation(catalog, "birkat-kohanim");
  const slide = presentation.selectedSlide;
  assert.equal(slide.media.id, "post:1799:birkat-kohanim");
  assert.equal(slide.media.sourceRef, "posts:1799");
  assert.equal(slide.truth.source, "zuriel_approved_pending_exact_locator");
  assert.equal(slide.truth.calculation, "pending_exact_reconstruction");
  assert.match(slide.statement, /מראה המקום המדויק ושחזור הסכום עדיין בבנייה/);
});

test("missing exact locators use Zuriel approval without pretending to be exact or engine verified", () => {
  assert.equal(BEIT_MIDRASH_SOD1820_PRESENTATION.approvalPolicy.missingExactSource, "zuriel_approved_pending_exact_locator");
  assert.equal(BEIT_MIDRASH_SOD1820_PRESENTATION.approvalPolicy.doesNotImplyEngineVerification, true);
  assert.equal(BEIT_MIDRASH_SOD1820_PRESENTATION.approvalPolicy.doesNotImplyExactSourceLocated, true);

  const presentation = buildBeitMidrashSod1820Presentation(catalog);
  const historic = presentation.slides.find((slide) => slide.id === "historic-methods");
  assert.equal(historic.truth.source, "zuriel_approved_pending_exact_locator");
  assert.equal(historic.truth.calculation, "historic_method_mapping_open");
  assert.match(historic.statement, /אינה מסמנת אותו כאימות מנוע/);
});

test("the final slide projects every canonical diamond once and excludes the crown anchor", () => {
  const presentation = buildBeitMidrashSod1820Presentation(catalog, "diamonds");
  const final = presentation.selectedSlide;
  assert.equal(final.id, "diamonds");
  assert.deepEqual(final.diamonds.map((item) => item.id), ["diamond-a", "diamond-b"]);
  assert.equal(new Set(final.diamonds.map((item) => item.id)).size, final.diamonds.length);
  assert.equal(final.diamonds.some((item) => item.id === "crown-1820"), false);
  assert.ok(final.diamonds.every((item) => item.calculatorHref.startsWith("/2029/gematria?q=")));
});

test("strong 1820 examples and Bibi examples are explicitly separated", () => {
  const presentation = buildBeitMidrashSod1820Presentation(catalog);
  const strong = presentation.slides.find((slide) => slide.id === "strong-1820");
  assert.ok(strong.examples.length >= 5);
  assert.ok(strong.examples.every((item) => item.value === 1820));
  assert.ok(strong.examples.every((item) => item.sourceRef.startsWith("gematria_words:")));
  assert.ok(strong.examples.every((item) => item.calculatorHref.startsWith("/2029/gematria?q=")));

  const bibi = presentation.slides.find((slide) => slide.id === "bibi-examples");
  const values = bibi.examples.flatMap((example) => example.equations.map((item) => item.value));
  assert.deepEqual(values, [683, 386, 631, 631]);
  assert.match(bibi.statement, /ולא כחלק מחישובי 1820/);
});

test("presentation location is URL-only, validated and canonical", () => {
  const location = resolveBeitMidrashLearningLocation({
    search: "?section=paths&path=sod1820&lesson=sod1820&slide=kedusha",
  });
  assert.equal(location.pathId, "sod1820");
  assert.equal(location.lessonId, "sod1820");
  assert.equal(location.presentationSlideId, "kedusha");
  assert.equal(
    location.canonicalHref,
    "/beit-midrash?section=paths&path=sod1820&lesson=sod1820&slide=kedusha#sod1820-slide-kedusha",
  );
  assert.equal(
    beitMidrashLearningHref("paths", { pathId: "sod1820", lessonId: "sod1820", slideId: "diamonds" }),
    "/beit-midrash?section=paths&path=sod1820&lesson=sod1820&slide=diamonds#sod1820-slide-diamonds",
  );

  const unknown = resolveBeitMidrashLearningLocation({
    search: "?section=paths&path=sod1820&lesson=sod1820&slide=private-draft",
  });
  assert.equal(unknown.presentationSlideId, null);
  assert.equal(unknown.canonicalHref, "/beit-midrash?section=paths&path=sod1820&lesson=sod1820#path-sod1820");
});

test("learning projection exposes the selected slide without adding a store or fetch", () => {
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
    "number-layers",
    "math-profile",
    "method",
    "guided-example",
    "world-map",
    "heichal",
  ]);
});
