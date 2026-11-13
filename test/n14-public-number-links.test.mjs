// N14 (ZURIEL 12.11.2026) — new number-page links are the public address /number/<n>; old links keep working.
// One owner (src/lib/research/numberPageAddress.js → publicNumberPageHref). Producers that leave the browser build (ai-analyze, the
// shared Raziel resolver used by wa-raziel and the site) use it; every reader accepts both spellings with the same bounds; stored
// links and messages are never rewritten. No subscriptions, quota or AI-opening change here.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { runInNewContext } from "node:vm";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";
import {
  NUMBER_PAGE_BASE, NUMBER_PAGE_COMPATIBILITY_BASE, numberPageHref, numberPageRouteHref, publicNumberPageHref,
} from "../src/lib/research/numberPageAddress.js";
import {
  RAZIEL_NAVIGATION_ROUTES, normalizeRazielNavigationAction, razielFocusNumberFromCanonicalLink, razielNavigationUrl,
  razielNavigationWhatsappText, razielNumberPageHref, razielWhatsappVerifiedFocus, resolveRazielNavigationAction,
} from "../supabase/functions/_shared/razielNavigationActions.js";
import { razielNavigationButton } from "../src/components/experience2029/razielSessionSeam2029.js";
import { createInitialRazielSessionState, razielSessionReducer } from "../src/lib/research/razielSession2029.js";
import {
  createRazielNavigationTurnSucceededAction, prepareRazielSessionSubmission, selectRazielVerifiedNumberFocus,
} from "../src/lib/research/razielSessionRequest2029.js";
import { buildRazielSavedSessionEntity, razielSavedSessionState } from "../src/lib/research/razielSavedSession2029.js";

const ROOT = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, ROOT), "utf8");
const SITE = "https://sod1820.co.il";

// The address owner compiled the way Vite compiles it (import.meta.env replaced at build time), so the browser build is tested
// with and without the public-release flag. Server code (Deno, node) has no import.meta.env at all: that is the plain import above.
async function addressModuleForBuild(env) {
  const out = await esbuild.build({
    entryPoints: [fileURLToPath(new URL("src/lib/research/numberPageAddress.js", ROOT))],
    bundle: true, write: false, format: "esm", platform: "neutral", logLevel: "silent",
    define: { "import.meta.env": JSON.stringify(env) },
  });
  return import(`data:text/javascript;base64,${Buffer.from(out.outputFiles[0].text).toString("base64")}`);
}

test("a new link for 73 is /number/73 in server code (no Vite flags) and in both browser builds", async () => {
  // server: no import.meta.env (Deno edge, node)
  assert.equal(publicNumberPageHref(73), "/number/73");
  assert.equal(publicNumberPageHref("73"), "/number/73");
  assert.equal(NUMBER_PAGE_BASE, NUMBER_PAGE_COMPATIBILITY_BASE, "without flags the internal builder keeps its compatibility base");
  assert.equal(numberPageHref(73), "/2029/number/73", "the existing internal builder is unchanged");
  for (const [label, env, internal] of [
    ["public release build", { VITE_PUBLIC_READING_RELEASE: "public-reading-20261101" }, "/number/73"],
    ["public foundation preview build", { VITE_PUBLIC_FOUNDATION_PREVIEW: "true" }, "/number/73"],
    ["default build", {}, "/2029/number/73"],
  ]) {
    const mod = await addressModuleForBuild(env);
    assert.equal(mod.publicNumberPageHref(73), "/number/73", label);
    assert.equal(mod.numberPageHref(73), internal, `${label}: internal builder behaviour unchanged`);
    // a rendered Raziel button opens this build's number route, whichever spelling the message carries
    assert.equal(mod.numberPageRouteHref("/number/73"), internal, label);
    assert.equal(mod.numberPageRouteHref("/2029/number/73"), internal, label);
  }
});

test("leading zeros are normalised; the real zero stays", () => {
  assert.equal(publicNumberPageHref("073"), "/number/73");
  assert.equal(publicNumberPageHref("000073"), "/number/73");
  assert.equal(publicNumberPageHref("0"), "/number/0");
  assert.equal(publicNumberPageHref("000"), "/number/0");
  assert.equal(publicNumberPageHref("1000"), "/number/1000");
});

test("an expression address stays an expression and is never replaced by its gematria", () => {
  for (const expression of ["משיח", "אב בית דין", "0358 משיח", "358א", "מַשִׁיחַ", "3.58", "+358"]) {
    assert.equal(publicNumberPageHref(expression), `/number/${encodeURIComponent(expression)}`, expression);
    assert.equal(publicNumberPageHref(expression).slice("/number/".length), numberPageHref(expression).split("/").at(-1),
      "same normalisation and encoding as the internal builder");
  }
  assert.notEqual(publicNumberPageHref("משיח"), "/number/358");
  assert.equal(publicNumberPageHref("א/ב"), `/number/${encodeURIComponent("א/ב")}`, "a slash in an expression stays inside the address");
});

test("the shared Raziel route table equals the public address owner (parity; the shared module cannot import site code)", () => {
  for (let value = 1; value <= 999999; value += 9973) {
    assert.equal(RAZIEL_NAVIGATION_ROUTES.number(value), publicNumberPageHref(value), String(value));
    assert.equal(razielNumberPageHref(value), publicNumberPageHref(value), String(value));
  }
  assert.equal(razielNumberPageHref(999999), "/number/999999");
  // the site turn and the WhatsApp text are both public
  const action = resolveRazielNavigationAction({ text: "תן לי את דף המספר 73" });
  assert.equal(action.href, "/number/73");
  assert.equal(razielNavigationWhatsappText(action, SITE), `${action.message}\n${SITE}/number/73`);
  assert.equal(normalizeRazielNavigationAction(action).href, "/number/73");
});

test("navigation buttons accept both valid spellings, keep the number limits and refuse foreign or forged addresses", () => {
  const button = (href) => razielNavigationButton({ role: "raziel", navigationAction: { href, label: "פתח", intent: "number_page" } });
  for (const href of ["/number/1", "/number/73", "/number/999999", "/2029/number/1", "/2029/number/73", "/2029/number/999999"]) {
    assert.equal(button(href)?.href, href, `${href} renders unchanged`);
    assert.equal(normalizeRazielNavigationAction({ version: "raziel-canonical-navigation-actions-v1", href, label: "פתח" })?.href, href);
  }
  for (const href of [
    "/number/0", "/number/073", "/number/1000000", "/number/73?x=1", "/number/73#x", "/number/73/extra", "/number/abc",
    "/2029/number/0", "/2029/number/073", "/2029/number/1000000", "/2029/number/73?x=1", "/2029/number/73/extra",
    "https://evil.example/number/73", "//evil.example/number/73", "https://sod1820.co.il.evil.invalid/number/73",
    "/x/number/73", "/numbers/73", "javascript:alert(1)", "",
  ]) {
    assert.equal(button(href), null, href);
    assert.equal(normalizeRazielNavigationAction({ version: "raziel-canonical-navigation-actions-v1", href, label: "פתח" }), null, href);
    assert.equal(razielNavigationUrl(href, SITE), "", href);
  }
  // the rendered Link goes through the build route, never the raw stored string
  assert.match(read("src/components/experience2029/SystemFrame2029.jsx"), /to=\{numberPageRouteHref\(razielNavigationButton\(m\)\.href\)\}/);
});

// A saved conversation and an old WhatsApp link still identify the same number. Nothing stored is rewritten.
function savedNavigationEntity() {
  const initial = { ...createInitialRazielSessionState(), viewMode: "exploratory" };
  const prepared = prepareRazielSessionSubmission({ question: "פתח את דף המספר 73", state: initial, researchContext: null,
    startedAt: "2026-11-12T12:00:00Z", createTurnId: () => "n14-turn" });
  const started = razielSessionReducer(initial, { type: "turn_started", turn: prepared.turn, contextSnapshot: prepared.contextSnapshot });
  const state = razielSessionReducer(started, createRazielNavigationTurnSucceededAction({ state: started,
    navigation: prepared.navigation, completedAt: "2026-11-12T12:00:01Z" }));
  return buildRazielSavedSessionEntity(state, { now: () => "2026-11-12T12:00:02Z" }).entity;
}

test("a saved conversation keeps its link exactly and still identifies the same number (old and new spelling)", () => {
  const entity = savedNavigationEntity();
  assert.equal(entity.thread.at(-1).navigationAction.href, "/number/73", "a new turn is saved with the public address");
  for (const href of ["/number/73", "/2029/number/73"]) {
    const saved = JSON.parse(JSON.stringify(entity));
    saved.thread.at(-1).navigationAction.href = href;
    const restored = razielSavedSessionState(saved);
    const action = restored.thread.at(-1).navigationAction;
    assert.equal(action.href, href, "restored without rewriting");
    assert.equal(action.number, 73);
    assert.deepEqual(selectRazielVerifiedNumberFocus({ thread: restored.thread }), { number: 73, source: "conversation" }, href);
    // and a follow-up "this number" request opens the same page, as a new public link
    const next = prepareRazielSessionSubmission({ question: "פתח לי את דף המספר", state: restored, researchContext: null,
      startedAt: "2026-11-12T12:01:00Z", createTurnId: () => "n14-next" });
    assert.equal(next.navigation.href, "/number/73", href);
    // re-saving does not rewrite the older turn
    const resaved = buildRazielSavedSessionEntity(restored, { now: () => "2026-11-12T12:02:00Z" }).entity;
    assert.equal(resaved.thread.at(-1).navigationAction.href, href, "history is not rewritten on re-save");
  }
});

test("an old WhatsApp link and a new one identify the same number; foreign or forged links never do", () => {
  for (const url of [`${SITE}/2029/number/73`, `${SITE}/number/73`, `${SITE}/number/73?focus=x#y`]) {
    assert.equal(razielFocusNumberFromCanonicalLink(`בשמחה — הנה דף המספר 73. 🌳\n${url}`, SITE), 73, url);
    assert.deepEqual(razielWhatsappVerifiedFocus([{ outgoing: false, text: "תודה" }, { outgoing: true, text: url }], SITE), { kind: "number", value: 73 }, url);
  }
  for (const url of [
    "https://evil.example/number/73", `${SITE}.evil.invalid/number/73`, `https://evil.invalid/r?next=${SITE}/number/73`,
    `${SITE}/number/073`, `${SITE}/number/0`, `${SITE}/number/1000000`, `${SITE}/number/73/extra`, `http://sod1820.co.il/number/73`,
  ]) {
    assert.equal(razielFocusNumberFromCanonicalLink(url, SITE), null, url);
  }
});

// ai-analyze: the server-owned "open_number" suggestion reads both spellings and emits only the public address.
function suggestionRegistry() {
  const source = read("supabase/functions/ai-analyze/index.ts");
  const start = source.indexOf("function razielSafeSuggestedPaths(");
  const end = source.indexOf("const svcHeaders", start);
  assert.ok(start > 0 && end > start);
  return runInNewContext(stripTypeScriptTypes(source.slice(start, end)) + "\nrazielSafeSuggestedPaths;", { publicNumberPageHref }, { timeout: 1000 });
}

test("ai-analyze open_number: both spellings in, the public address out, same bounds", () => {
  const registry = suggestionRegistry();
  const open = (href) => registry({ trusted: false, navigation: [{ href }], canonicalReady: false, question: "" })
    .find((item) => item.id === "open_number")?.href ?? null;
  assert.equal(open("/number/358"), "/number/358");
  assert.equal(open("/2029/number/358"), "/number/358");
  assert.equal(open("/number/999999"), "/number/999999");
  for (const href of ["/number/0", "/number/0358", "/number/1000000", "/number/358?x=1", "/number/358/x", "https://evil.example/number/358",
    "//evil.example/number/358", "/2029/number/0", "/2029/number/1000000", "/x/number/358", "javascript:alert(1)"]) {
    assert.equal(open(href), null, href);
  }
  assert.doesNotMatch(read("supabase/functions/ai-analyze/index.ts"), /`\/2029\/number\/\$\{/, "no producer of the old spelling is left");
  assert.doesNotMatch(read("src/lib/research/razielGroundedSourceComposer.js"), /NUMBER_PAGE_BASE|`\/2029\/number\//);
});

// Edge packaging: ai-analyze is deployed as one esbuild bundle (scripts/package-ai-analyze.mjs, esbuild 0.28.2, same flags). The bundle
// must carry the public base and must not carry a producer of the old spelling. wa-raziel is deployed as plain files and imports the
// shared resolver directly.
test("Edge packaging: the ai-analyze bundle produces /number links; wa-raziel ships the public route table", async () => {
  assert.equal(esbuild.version, "0.28.2", "the packaging script pins esbuild 0.28.2");
  const packaging = read("scripts/package-ai-analyze.mjs");
  for (const flag of ["--platform=neutral", "--format=esm", "--target=es2022", "--external:npm:jose@6.2.13", "--minify-syntax"]) {
    assert.ok(packaging.includes(flag), flag);
  }
  const out = await esbuild.build({
    entryPoints: [fileURLToPath(new URL("supabase/functions/ai-analyze/index.ts", ROOT))],
    bundle: true, write: false, platform: "neutral", format: "esm", target: "es2022", external: ["npm:jose@6.2.13"],
    minifySyntax: true, metafile: true, logLevel: "silent",
  });
  const bundle = out.outputFiles[0].text;
  assert.ok(Object.keys(out.metafile.inputs).some((input) => input.endsWith("src/lib/research/numberPageAddress.js")));
  assert.match(bundle, /NUMBER_PAGE_PUBLIC_BASE = "\/number"/);
  assert.match(bundle, /publicNumberPageHref = \(address\) => `\$\{NUMBER_PAGE_PUBLIC_BASE\}\//);
  assert.match(bundle, /href: publicNumberPageHref\(value\)/, "open_number and the composer use the public address");
  assert.doesNotMatch(bundle, /`\/2029\/number\/\$\{/, "no producer of the old spelling in the bundle");
  assert.doesNotMatch(bundle, /\$\{NUMBER_PAGE_BASE\}\/\$\{value\}/, "no producer through the build-dependent base");

  const wa = read("supabase/functions/wa-raziel/index.ts");
  assert.match(wa, /from "\.\.\/_shared\/razielNavigationActions\.js"/);
  const shared = read("supabase/functions/_shared/razielNavigationActions.js");
  assert.match(shared, /number: \(value\) => `\/number\/\$\{value\}`/);
  assert.match(shared, /const NUMBER_HREF = \/\^\\\/\(\?:2029\\\/\)\?number\\\/\(\[1-9\]\\d\{0,5\}\)\$\/;/);
});
