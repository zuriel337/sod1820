// SITE_LINK_REGISTRY_V1 — the registry is the one source of truth for the footer and Raziel link answers.
// It must preserve the Legacy links, keep Legacy -> 2029 continuity and never disagree with the route router.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { build } from "esbuild";
import {
  SITE_LINKS, SITE_LINK_EXTERNAL, SITE_LINK_GROUPS, findSiteLinkByPhrase, isRegistrySiteHref,
  normalizeSiteLinkPhrase, siteLinkAbsoluteUrl, siteLinkById, siteLinksForFooterGroup,
} from "../supabase/functions/_shared/siteLinkRegistry.js";

const read = (file) => readFileSync(new URL("../" + file, import.meta.url), "utf8");

// The production public-reading artifact profile, exactly as the build defines it.
async function productionRouter() {
  const out = await build({
    stdin: { resolveDir: path.resolve("src/lib"), contents: "export * from './publicReadingRelease2029.js';" },
    bundle: true, write: false, format: "esm", platform: "node",
    define: {
      "import.meta.env": JSON.stringify({ VITE_PUBLIC_READING_RELEASE: "public-reading-20261101" }),
      __SOD_2029_BUILD__: "true", __SOD_PUBLIC_READING_PRODUCTION_ARTIFACT__: "true",
    },
  });
  const dir = mkdtempSync(path.join(tmpdir(), "site-link-router-"));
  const file = path.join(dir, "router.mjs");
  writeFileSync(file, out.outputFiles[0].text);
  return import(file);
}

test("ids are unique, internal hrefs are site-relative and every footer entry sits in a known group", () => {
  const ids = SITE_LINKS.map((item) => item.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const item of SITE_LINKS) {
    if (item.external) assert.match(item.href, /^https:\/\//, item.id);
    else assert.match(item.href, /^\/[^/]/, item.id);
    if (item.footer) assert.ok(SITE_LINK_GROUPS[item.footer.group], item.id);
    assert.ok(["public", "closed", "account", "service"].includes(item.defaultState), item.id);
  }
});

test("the external community links are preserved byte for byte (WhatsApp, Instagram, Facebook, TikTok)", () => {
  assert.equal(SITE_LINK_EXTERNAL.whatsapp, "https://chat.whatsapp.com/FaI8Nq95NMrCvZheSrW6Ql");
  assert.equal(SITE_LINK_EXTERNAL.instagram, "https://www.instagram.com/zuriel7676?igsh=ZnJodWtxcnh1Y3dp");
  assert.equal(SITE_LINK_EXTERNAL.facebook, "https://www.facebook.com/sod1820");
  assert.equal(SITE_LINK_EXTERNAL.tiktok, "https://www.tiktok.com/@sod_1820");
  assert.equal(siteLinkById("whatsapp").tracking, "whatsapp-join");
});

test("Legacy navigation is carried over, each Legacy path resolves to exactly one registry entry", () => {
  const legacyNavigation = ["/post", "/category/מימד חמש", "/community/chat", "/category/סוד החשמל", "/archive", "/research", "/world", "/number",
    "/code", "/profile", "/profile#notifications", "/start", "/community", "/contact", "/privacy", "/map"];
  for (const href of legacyNavigation) {
    assert.ok(SITE_LINKS.some((item) => item.href === href), `Legacy path ${href} is not in the registry`);
  }
  for (const item of SITE_LINKS) assert.ok(item.legacyHrefs.length >= 1, item.id);
  assert.deepEqual(siteLinksForFooterGroup("social").map((item) => item.id), ["whatsapp", "instagram", "facebook", "tiktok"]);
});

test("registry state never disagrees with the 2029 route router (production artifact profile)", async () => {
  const router = await productionRouter();
  for (const item of SITE_LINKS.filter((link) => !link.external)) {
    const state = router.publicReadingPath(item.href.split("#")[0]);
    const expected = { public: ["public"], closed: ["closed"], account: ["continuation", "account"], service: ["service-closed", "public"] }[item.defaultState];
    assert.ok(expected.includes(state), `${item.id} ${item.href}: registry says ${item.defaultState}, router says ${state}`);
  }
});

test("a closed entry always names an open alternative that exists", () => {
  for (const item of SITE_LINKS.filter((link) => link.defaultState === "closed")) {
    assert.ok(item.closed?.message && item.closed.message.length > 20, item.id);
    const alt = siteLinkById(item.closed.alt);
    assert.ok(alt && alt.defaultState === "public" && !alt.external, `${item.id} alt ${item.closed.alt}`);
  }
});

test("aliases are unambiguous and phrase lookup is whole-phrase only", () => {
  const seen = new Map();
  for (const item of SITE_LINKS) {
    for (const alias of [item.label, ...item.aliases]) {
      const key = normalizeSiteLinkPhrase(alias);
      assert.ok(!seen.has(key) || seen.get(key) === item.id, `alias "${alias}" belongs to ${seen.get(key)} and ${item.id}`);
      seen.set(key, item.id);
    }
  }
  assert.equal(findSiteLinkByPhrase("הוואטסאפ").id, "whatsapp");
  assert.equal(findSiteLinkByPhrase("וואטסאפ").id, "whatsapp");
  assert.equal(findSiteLinkByPhrase("קבוצת הוואטסאפ").id, "whatsapp");
  assert.equal(findSiteLinkByPhrase("לפרטיות").id, "privacy");
  assert.equal(findSiteLinkByPhrase("מה זה גימטריה בעצם"), null);
  assert.equal(findSiteLinkByPhrase(""), null);
});

test("absolute links are https and same-site only; external links are returned only if verified", () => {
  assert.equal(siteLinkAbsoluteUrl(siteLinkById("privacy"), "https://sod1820.co.il"), "https://sod1820.co.il/privacy");
  assert.equal(siteLinkAbsoluteUrl(siteLinkById("privacy"), "https://sod1820-x.vercel.app"), "");
  assert.equal(siteLinkAbsoluteUrl(siteLinkById("privacy"), "http://sod1820.co.il"), "");
  assert.equal(siteLinkAbsoluteUrl(siteLinkById("whatsapp"), "https://sod1820.co.il"), SITE_LINK_EXTERNAL.whatsapp);
  assert.equal(siteLinkAbsoluteUrl({ external: true, href: "https://evil.example/x" }, "https://sod1820.co.il"), "");
  assert.equal(isRegistrySiteHref("https://evil.example/x"), false);
  assert.equal(isRegistrySiteHref("/privacy"), true);
});
