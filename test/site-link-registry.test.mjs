// SMART_FOOTER_LINK_REGISTRY_V1 — registry, Raziel answers, footer wiring and route/lock parity.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SITE_LINK_REGISTRY, SITE_LINK_BY_ID, siteLinkUrl, SITE_ORIGIN } from "../supabase/functions/_shared/siteLinkRegistry.js";
import { parseRazielSiteLinkRequest, resolveRazielSiteLinkAnswer, razielSiteLinkWhatsappText } from "../supabase/functions/_shared/razielSiteLinks.js";
import { parseRazielNavigationRequest } from "../supabase/functions/_shared/razielNavigationActions.js";
import { publicReadingPath } from "../src/lib/publicReadingRelease2029.js";
import { footerSuggestions, footerHidden, FOOTER_COLUMNS, FOOTER_LEGAL_IDS } from "../src/components/experience2029/siteFooter2029Model.js";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const WHATSAPP = "https://chat.whatsapp.com/FaI8Nq95NMrCvZheSrW6Ql";

test("preserved external links are exact", () => {
  assert.equal(SITE_LINK_BY_ID.whatsapp.href, WHATSAPP);
  assert.equal(SITE_LINK_BY_ID.instagram.href, "https://www.instagram.com/zuriel7676?igsh=ZnJodWtxcnh1Y3dp");
  assert.equal(SITE_LINK_BY_ID.facebook.href, "https://www.facebook.com/sod1820");
  assert.equal(SITE_LINK_BY_ID.tiktok.href, "https://www.tiktok.com/@sod_1820");
});

test("legacy navigation routes are all present, ids and hrefs unique", () => {
  const expected = ["/post", "/category/מימד חמש", "/community/chat", "/category/סוד החשמל", "/archive", "/research", "/world", "/number", "/code", "/profile", "/profile#notifications", "/start", "/community", "/contact", "/privacy", "/map"];
  const hrefs = SITE_LINK_REGISTRY.map((item) => item.href);
  for (const href of expected) assert.ok(hrefs.includes(href), href);
  assert.equal(new Set(hrefs).size, hrefs.length);
  assert.equal(new Set(SITE_LINK_REGISTRY.map((item) => item.id)).size, SITE_LINK_REGISTRY.length);
});

test("availability mirrors the public reading route/lock projection", () => {
  const expectedStatus = { open: "public", building: "closed", account: "continuation" };
  for (const item of SITE_LINK_REGISTRY.filter((entry) => entry.kind === "internal")) {
    assert.equal(publicReadingPath(item.href.split("#")[0]), expectedStatus[item.availability], `${item.id} ${item.href}`);
  }
});

test("an internal URL is absolute https on the canonical origin only; previews yield nothing", () => {
  assert.equal(siteLinkUrl(SITE_LINK_BY_ID.privacy), `${SITE_ORIGIN}/privacy`);
  assert.equal(siteLinkUrl(SITE_LINK_BY_ID.privacy, "https://x-git-main.vercel.app"), "");
  assert.equal(siteLinkUrl(SITE_LINK_BY_ID.newsletter), "");
});

test("Raziel answers where WhatsApp / community / Heichal / Number / ELS / privacy / newsletter / socials are", () => {
  const ask = (text) => resolveRazielSiteLinkAnswer({ text });
  assert.match(ask("איפה הוואטסאפ?").message, new RegExp(WHATSAPP));
  assert.match(ask("תן לי קישור לקבוצת הוואטסאפ").message, new RegExp(WHATSAPP));
  assert.match(ask("איפה הקהילה").message, /sod1820\.co\.il\/community$/);
  assert.match(ask("איפה דף המספר").message, /sod1820\.co\.il\/number$/);
  assert.match(ask("איפה הפרטיות").message, /sod1820\.co\.il\/privacy$/);
  assert.match(ask("איפה אפשר להירשם לניוזלטר").message, /בתחתית/);
  const socials = ask("איפה הרשתות החברתיות");
  assert.deepEqual(socials.link_ids, ["instagram", "facebook", "tiktok"]);
  // Closed areas are never offered as a live link.
  for (const text of ["איפה ההיכל", "איפה דילוגי אותיות", "איפה ELS"]) {
    const answer = ask(text);
    assert.match(answer.message, /בבנייה/, text);
    assert.doesNotMatch(answer.message, /https?:/, text);
  }
  assert.equal(razielSiteLinkWhatsappText(ask("איפה הפייסבוק")), ask("איפה הפייסבוק").message);
});

test("every URL Raziel can emit is a registry URL; unrelated and negated asks fall through", () => {
  const allowed = new Set(SITE_LINK_REGISTRY.map((item) => siteLinkUrl(item)).filter(Boolean));
  for (const item of SITE_LINK_REGISTRY) {
    for (const alias of item.aliases) {
      const answer = resolveRazielSiteLinkAnswer({ text: `איפה ${alias}` });
      if (!answer) continue;
      for (const url of answer.message.match(/https:\/\/\S+/g) || []) assert.ok(allowed.has(url), `${alias} -> ${url}`);
    }
  }
  for (const text of ["מה הגימטריה של שלום", "שלום", "לא איפה הוואטסאפ", "איפה העולם", "תן לי את העולם", "מה הלינק של דף המספר", "פתח את דף המספר 73", "", null]) {
    assert.equal(parseRazielSiteLinkRequest(text), null, String(text));
  }
});

test("canonical number navigation keeps precedence and the old grammar is untouched", () => {
  assert.ok(parseRazielNavigationRequest("פתח את דף המספר 73"));
  assert.equal(parseRazielNavigationRequest("איפה הוואטסאפ"), null);
});

test("transports call the site-link answer only after the navigation grammar", () => {
  const site = read("src/lib/research/razielSessionRequest2029.js");
  assert.match(site, /if \(!request\) return resolveRazielSiteLinkAnswer\(\{ text: question \}\);/);
  const wa = read("supabase/functions/wa-raziel/index.ts");
  assert.ok(wa.indexOf("parseRazielNavigationRequest(cleanText)") < wa.indexOf("resolveRazielSiteLinkAnswer({ text: cleanText })"));
});

test("footer: registry-only links, WhatsApp analytics kept, one signup owner, page-end only", () => {
  const source = read("src/components/experience2029/SiteFooter2029.jsx");
  assert.doesNotMatch(source, /https?:\/\//);
  assert.match(source, /trackWhatsappJoin\("footer"\)/);
  assert.match(source, /StayUpdatedCTA variant="footer"/);
  assert.doesNotMatch(source, /<form|type="email"|submitNewsletterSignup/);
  assert.doesNotMatch(read("src/components/experience2029/siteFooter2029.css"), /position:\s*(?:fixed|sticky)/);
  const columnIds = FOOTER_COLUMNS.flatMap((c) => c.ids).concat(FOOTER_LEGAL_IDS);
  for (const id of columnIds) assert.ok(SITE_LINK_BY_ID[id], id);
  assert.match(read("src/components/experience2029/SystemFrame2029.jsx"), /<SiteFooter2029 \/>/);
});

test("contextual suggestions: at most 3, open links only, never the current page; reader surfaces hide the footer", () => {
  for (const path of ["/", "/post", "/post/x", "/number/73", "/2029/number/73", "/gematria", "/world", "/community/chat", "/privacy", "/zzz"]) {
    const items = footerSuggestions(path);
    assert.ok(items.length <= 3 && items.length > 0, path);
    for (const item of items) {
      assert.equal(item.availability, "open", `${path} ${item.id}`);
      assert.notEqual(item.href, path);
    }
  }
  assert.ok(footerHidden("/book/x") && footerHidden("/code") && !footerHidden("/post"));
});
