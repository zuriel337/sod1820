#!/usr/bin/env node
// Live contracts that outlive the Legacy runtime.
//
// These assertions used to sit inside Legacy-era tests (convergence-tree-closure, test-legacy-research-containment, code-page-els-launch-gate,
// test-whatsapp-kod-hametsiut-join, live-whatsapp-feed-projection, research-viewer-*). Those tests are deleted together with the Legacy code they
// mostly describe, but each one also guarded something that still ships: the public sitemap, the closed Heichal entry, the ELS 2029 page, the
// early-access entry and its redirects, the WhatsApp feed edge functions, and the Human Gate of the research viewer projection.
// Only assertions about files that still exist are kept here; nothing is loosened and no new behaviour is invented.
//
// Static, dependency-free, no network and no browser: `node scripts/test-2029-live-contracts.mjs`.
import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("public sitemap never lists the retired /numbers entry, whatever the convergence flag says", async () => {
  const { default: sitemapHandler } = await import("../api/sitemap-public.js");
  const previousFetch = globalThis.fetch;
  const xml = "<urlset><url><loc>https://sod1820.co.il/numbers</loc></url><url><loc>https://sod1820.co.il/post/public</loc></url></urlset>";
  try {
    for (const state of [{ enabled: true, mode: "all" }, { enabled: true, mode: "anon" }, null]) {
      globalThis.fetch = async (url) => String(url).endsWith("/api/sitemap")
        ? { ok: true, text: async () => xml }
        : state ? { ok: true, json: async () => [{ key: "lock_convergence_tree", ...state }, { key: "lock_number", enabled: false, mode: "all" }] } : { ok: false };
      const res = { headers: {}, setHeader(key, value) { this.headers[key] = value; }, status(code) { this.code = code; return this; }, send(body) { this.body = body; return this; } };
      await sitemapHandler({}, res);
      assert.equal(res.code, 200);
      assert.doesNotMatch(res.body, /<loc>https:\/\/sod1820\.co\.il\/numbers<\/loc>/);
      assert.match(res.body, /\/post\/public/);
    }
  } finally { globalThis.fetch = previousFetch; }
});

test("2029 surfaces do not link to the unopened Heichal entry; context actions never deepen into it", () => {
  const frame = read("src/components/experience2029/SystemFrame2029.jsx");
  const topic = read("src/pages/Topic2029Page.jsx");
  const books = read("src/pages/Books2029Page.jsx");
  const number = read("src/pages/Number2029Page.jsx");
  const drawer = read("src/components/number2029/NumberDrawer2029.jsx");
  const contextual = read("src/lib/research/contextualCapabilities.js");
  for (const [name, source] of [["SystemFrame2029", frame], ["Topic2029", topic], ["Books2029", books], ["NumberDrawer2029", drawer]]) {
    assert.equal(source.includes('to="/heichal"'), false, `${name} must not link to unopened Heichal 2029`);
    assert.equal(source.includes('navigate("/heichal")'), false, `${name} must not navigate to unopened Heichal 2029`);
    assert.equal(source.includes('go("/heichal"'), false, `${name} must not navigate to unopened Heichal 2029`);
    assert.equal(source.includes('go?.("/heichal"'), false, `${name} must not navigate to unopened Heichal 2029`);
  }
  // Number b2531763 explicitly wired the existing Heichal action, alongside distinct saved-ELS and new-ELS destinations.
  assert.match(number, /onOpenHeichal=\{\(\) => shell\.go\("\/heichal"\)\}/);
  assert.match(number, /focus\?\.kind === "els_saved_from_number" \? "\/els\?library=public"/);
  assert.match(number, /focus\?\.kind === "els_new_from_number" \? "\/els" : "\/heichal"/);
  assert.equal(frame.includes('{ to: "/heichal", label: "היכל"'), true, "2029 Global Chrome must expose canonical Heichal navigation");
  assert.equal(contextual.includes('label: "◇ העמק בהיכל"'), false, "context actions must not expose Heichal");
  assert.equal(contextual.includes("deepenTool()"), false, "context tools must not generate Heichal deepen entries");
});

test("ELS 2029 stays the active build surface: no launch countdown, exact saved/shared/returned matrices are never overwritten by the query seed", () => {
  const els2029 = read("src/pages/Els2029Page.jsx");
  assert.match(els2029, /data-els-2029-surface="v1"/);
  assert.doesNotMatch(els2029, /ELS_LEGACY_COUNTDOWN_TARGET|els-2029-early-access|week-countdown/);
  assert.doesNotMatch(els2029, /href="\/lab\/els"/);
  // Exercise the actual seed expression: an exact saved/shared/returned matrix must never be overwritten by the ordinary query seed.
  const expressions = [...els2029.matchAll(/initialSeed=\{([^{}]+)\}/g)];
  assert.equal(expressions.length, 1);
  const seed = new Function("savedRecord", "legacyMatrix", "sharedMatrix", "location", "classicSeed", `return (${expressions[0][1]});`);
  for (let mask = 0; mask < 32; mask += 1) {
    const actual = seed({ row: mask & 1 ? { id: "saved" } : null }, mask & 2 ? { skip_distance: 7 } : null,
      { present: Boolean(mask & 4) }, { state: { elsReadingReturnTurnId: mask & 8 ? "reading-turn" : null,
        elsResearchReturnTaskId: mask & 16 ? "research-task" : null } }, "זרע מדויק");
    assert.equal(actual, mask ? "" : "זרע מדויק", `matrix/return guard mask ${mask}`);
  }
  assert.equal(seed({ row: null }, null, { present: false }, {}, "זרע מדויק"), "זרע מדויק");
  assert.match(els2029, /matrix=\{savedRecord\.row \|\| legacyMatrix\}/);
  assert.doesNotMatch(els2029, /<CodePage\b|<ElsWorkAreaPage\b/);
});

test("early-access landing: copy, attribution, the old circulated WhatsApp link, the isolated document and the robots policy", () => {
  const page = read("src/pages/EarlyAccess2029Page.jsx");
  const app = read("src/App2029.jsx");
  const vercel = JSON.parse(read("vercel.json"));
  const brand = read("src/lib/brandAssets2029.js");
  assert.match(page, /BRAND_LOCKUP_2029/);
  assert.match(page, /האתר בבנייה · אתם נכנסים לפני כולם/);
  assert.match(page, /הסרטון שמתפוצץ ברשת/);
  assert.match(page, /0524acef-077d-49f8-9be5-5dad2c8fe538\.mp4/);
  assert.match(page, /רשמו אותי לעדכון הראשון/);
  assert.match(page, /שלחו רמזים למערכת/);
  assert.match(page, /מסע החיים/);
  assert.match(page, /חיפוש בתורה/);
  assert.match(page, /מחקר עם בינה מלאכותית/);
  assert.match(page, /https:\/\/www\.tiktok\.com\/@sod_1820/);
  assert.match(page, /VITE_WHATSAPP_CHANNEL/);
  assert.match(page, /newsletter-signup/);
  assert.match(page, /signupAttribution\(\)/);
  assert.match(page, /SIGNUP_SOURCE = "whatsapp-early-access-2029"/);
  assert.match(page, /back: "\/early-access"/);
  assert.doesNotMatch(page, /קוד המציאות/);
  assert.doesNotMatch(page, /מחשבון|גימטריה|Calculator|2029\/gematria|fn_method_value/);
  assert.match(app, /EarlyAccess2029Page/);
  assert.match(app, /path="\/early-access"/);
  const oldLink = (vercel.redirects || []).find((item) => item.source === "/whatsapp/kod-hametsiut");
  assert.ok(oldLink, "old circulated link must remain valid");
  assert.equal(oldLink.destination, "/early-access");
  assert.equal(oldLink.permanent, false);
  const rewrite = (vercel.rewrites || []).find((item) => item.source === "/early-access");
  assert.ok(rewrite, "neutral entry must use isolated 2029 document");
  assert.equal(rewrite.destination, "/2029.html");
  const header = (vercel.headers || []).find((item) => item.source === "/early-access");
  assert.ok(header, "early access route needs explicit robots policy");
  assert.ok((header.headers || []).some((item) => item.key === "X-Robots-Tag" && /noindex/.test(item.value)));
  assert.match(brand, /sod1820_primary_lockup_v2_transparent_candidate\.png/);
});

test("WhatsApp channel edge functions: research-first channels stay private, the public projection is bounded and strips private storage refs, 2029 never consumes it", () => {
  const ingest = read("supabase/functions/wa-channel-ingest/index.ts");
  const edge = read("supabase/functions/live-whatsapp-feed/index.ts");
  // Research/source state stays unchanged: Torat remains research-first/private at ingest.
  assert.match(ingest, /RESEARCH_FIRST_CHANNELS = new Set\(\["torat-haremez", "gilui-yomi", "sfot-vheker"\]\)/);
  assert.match(ingest, /STORY_LIVE_CHANNELS = new Set\(\["or-geula"\]\)/);
  // Public projection is fixed to Torat, bounded, and strips private storage refs from media output.
  assert.match(edge, /\.eq\("channel", "torat-haremez"\)/);
  assert.match(edge, /Math\.min\([^,]+, 60\)/);
  assert.match(edge, /safePublicUrl\(row\.image_url\)/);
  assert.match(edge, /if \(!hasText && !imageUrl\) continue/);
  assert.match(edge, /credit: row\.status === "live" \? \(row\.credit \|\| "תורת הרמז"\) : "תורת הרמז"/);
  // 2029 remains isolated from the Legacy feed family.
  assert.equal(/live-whatsapp-feed|getToratHaremezLiveFeed/.test(read("src/App2029.jsx")), false);
});

test("research viewer projection keeps the Human Gate: judgment goes through the review RPC, nothing writes research objects or nodes, workspace actions are membership only", () => {
  const projection = read("src/lib/research/researchViewerProjection.js");
  const workspace = read("src/lib/research/useUniversalWorkspace.js");
  assert.match(projection, /fetchCanonicalGematriaFindings/);
  assert.match(projection, /fetchCanonicalTopicConvergenceFinding/);
  assert.match(projection, /fetchResearchViewerDiscovery/);
  assert.match(projection, /fetchResearchViewerGematria/);
  assert.doesNotMatch(projection, /research_objects.*insert|from\(["']research_objects["']\).*insert/s);
  assert.match(projection, /admin_research_review/);
  assert.match(projection, /finding\?\.kind !== "research-object"/);
  assert.match(projection, /p_ack_extraction_incomplete/);
  assert.doesNotMatch(projection, /from\("nodes"\).*insert/s);
  assert.doesNotMatch(projection, /from\("research_objects"\).*update/s);
  assert.match(workspace, /research\.saveItem/);
  assert.match(workspace, /research\.togglePin/);
  assert.match(workspace, /research\.addToResearch/);
  assert.match(workspace, /does NOT change the Finding envelope/);
  assert.doesNotMatch(workspace, /from\(["']research_objects["']\)/);
});
