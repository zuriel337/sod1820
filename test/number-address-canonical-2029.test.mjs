import test from "node:test";
import assert from "node:assert/strict";
import { canonicalNumberAddress, canonicalNumberSegment, canonicalNumberPagePath, canonicalNumericAddress, isNumberPagePath,
  numberPageHref, NUMBER_PAGE_BASE, NUMBER_PAGE_PUBLIC_BASE } from "../src/lib/research/numberPageAddress.js";
import { publicReadingContinuation, publicReadingPath } from "../src/lib/publicReadingRelease2029.js";

// ZURIEL 11.11.2026: public number/expression addresses have no /2029; leading zeros collapse in one permanent hop; the real zero,
// the query, the fragment and an expression's exact address are kept; no redirect chain.

test("numeric addresses lose leading zeros of any length; the real zero stays; expressions are never rewritten", () => {
  assert.equal(canonicalNumericAddress("0358"), "358");
  assert.equal(canonicalNumericAddress("000000358"), "358");
  assert.equal(canonicalNumericAddress("0"), "0");
  assert.equal(canonicalNumericAddress("000"), "0");
  assert.equal(canonicalNumericAddress("358"), "358");
  assert.equal(canonicalNumericAddress("1000"), "1000");
  assert.equal(canonicalNumericAddress("00196500000000"), "196500000000");
  assert.equal(canonicalNumberAddress("0358"), "358");
  for (const expression of ["משיח", "אב בית דין", "0358 משיח", "358א", "מַשִׁיחַ", "+358", "3.58", "٣٥٨"]) assert.equal(canonicalNumberAddress(expression), expression);
  assert.equal(canonicalNumberSegment("0358"), "358");
  assert.equal(canonicalNumberSegment("%30%33%35%38"), "358", "an encoded digit string is still a number");
  const encoded = encodeURIComponent("אב בית דין");
  assert.equal(canonicalNumberSegment(encoded), encoded, "an expression keeps its exact encoded segment");
});

test("one hop from /2029/number and from leading zeros, keeping query and fragment", () => {
  const one = (path, search = "", hash = "") => publicReadingContinuation(path, search, hash);
  assert.equal(one("/number/0358"), "/number/358");
  assert.equal(one("/number/00358"), "/number/358");
  assert.equal(one("/number/0358", "?focus=משיח&method=רגיל#number-essential".replace("#number-essential", "")), "/number/358?focus=משיח&method=רגיל");
  assert.equal(one("/number/0358", "?a=1&a=2", "#number-essential"), "/number/358?a=1&a=2#number-essential");
  assert.equal(one("/2029/number/358"), "/number/358");
  assert.equal(one("/2029/number/0358"), "/number/358", "prefix and zeros are fixed together, no chain");
  assert.equal(one("/2029/number/358", "?from=calc&focus=dna&method=" + encodeURIComponent("מילוי")), "/number/358?from=calc&focus=dna&method=" + encodeURIComponent("מילוי"));
  assert.equal(one("/2029/number"), "/number");
  assert.equal(one("/number/00"), "/number/0");
  assert.equal(one("/number/0"), null, "the real zero is canonical");
  assert.equal(one("/number/358"), null);
  assert.equal(one("/number"), null);
});

test("an expression address keeps its exact encoded form (never replaced by the number it computes to)", () => {
  for (const expression of ["משיח", "משיח בן דוד", "אב בית דין", "מַשִׁיחַ", "וְהָיָה כָּל-סִיר בִּירוּשָׁלִַם וּבִיהוּדָה, קֹדֶשׁ לַיהוָה צְבָאוֹת"]) {
    const segment = encodeURIComponent(expression);
    assert.equal(publicReadingContinuation("/number/" + segment), null, expression + " stays at its own address");
    assert.equal(publicReadingContinuation("/2029/number/" + segment), "/number/" + segment);
    assert.equal(canonicalNumberPagePath("/2029/number/" + segment), "/number/" + segment);
  }
  // a very long address stays as it is
  const long = encodeURIComponent("א".repeat(400));
  assert.equal(publicReadingContinuation("/number/" + long), null);
  assert.equal(publicReadingContinuation("/2029/number/" + long), "/number/" + long);
  // an encoded slash belongs to the address
  assert.equal(publicReadingContinuation("/2029/number/" + encodeURIComponent("א/ב")), "/number/" + encodeURIComponent("א/ב"));
});

test("the continuation is a state of its own and the canonical path never chains", () => {
  assert.equal(publicReadingPath("/2029/number/358"), "continuation");
  assert.equal(publicReadingPath("/number/358"), "public");
  for (const path of ["/number/0358", "/number/00358", "/2029/number/0358", "/2029/number/0358/"]) {
    const first = canonicalNumberPagePath(path);
    assert.equal(first, "/number/358");
    assert.equal(publicReadingContinuation(first), null, "the target is final");
  }
});

test("internal links use one shared helper; /number in the public release and the compatibility base elsewhere", () => {
  assert.match(NUMBER_PAGE_BASE, /^\/(?:2029\/)?number$/);
  assert.equal(NUMBER_PAGE_PUBLIC_BASE, "/number");
  assert.equal(numberPageHref("0358"), NUMBER_PAGE_BASE + "/358");
  assert.equal(numberPageHref("אב בית דין"), NUMBER_PAGE_BASE + "/" + encodeURIComponent("אב בית דין"));
  assert.equal(isNumberPagePath("/number/358"), true);
  assert.equal(isNumberPagePath("/2029/number/358?x=1"), true);
  assert.equal(isNumberPagePath("/number"), false);
  assert.equal(isNumberPagePath("/numbers/358"), false);
});

// A link the build emits in one spelling must be accepted by every consumer that validates it: in the public release the producers
// emit /number/<n>, while saved messages, Posts and research paths still carry /2029/number/<n>. node tests do not set the public
// release flag, so the consumers are checked here for both spellings.
test("consumers that validate a number link accept both /number/<n> and the older /2029/number/<n>", async () => {
  const { readFileSync } = await import("node:fs");
  const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
  const { razielNavigationButton } = await import("../src/components/experience2029/razielSessionSeam2029.js");
  for (const href of ["/number/358", "/2029/number/358"]) {
    assert.ok(razielNavigationButton({ role: "raziel", navigationAction: { href, label: "פתח" } }), `${href} renders`);
  }
  assert.equal(razielNavigationButton({ role: "raziel", navigationAction: { href: "/number/abc", label: "פתח" } }), null);
  for (const path of [
    "src/components/experience2029/RazielOneShotActions2029.jsx",
    "src/lib/research/razielSessionRequest2029.js",
    "src/lib/research/post2029ReadingProjection.js",
    "src/lib/research/lifeJourneyPersonContext.js",
  ]) {
    const source = read(path);
    assert.doesNotMatch(source, /\/\^\\\/2029\\\/number\\\//, `${path} must not accept only the /2029 spelling`);
    assert.match(source, /\\\/\(\?:2029\\\/\)\?number\\\//, `${path} accepts both spellings`);
  }
});
