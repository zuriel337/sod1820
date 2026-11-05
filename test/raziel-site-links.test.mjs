// Raziel answers "where is X" with exact, verified links from SITE_LINK_REGISTRY_V1 — deterministic, no model, no DB,
// no invented link, and a closed route is never offered as open.
import test from "node:test";
import assert from "node:assert/strict";
import {
  RAZIEL_NAVIGATION_INTENT, isCanonicalRazielNavigationHref, normalizeRazielNavigationAction, parseRazielNavigationRequest,
  razielNavigationNeedsFocus, razielNavigationUrl, razielNavigationWhatsappText, resolveRazielNavigationAction,
} from "../supabase/functions/_shared/razielNavigationActions.js";
import { SITE_LINK_EXTERNAL, siteLinkById } from "../supabase/functions/_shared/siteLinkRegistry.js";
import { razielNavigationButton } from "../src/components/experience2029/razielSessionSeam2029.js";
import { razielSiteLinkState } from "../src/lib/research/razielSessionRequest2029.js";

const SITE = "https://sod1820.co.il";
const ask = (text, options = {}) => resolveRazielNavigationAction({ text, ...options });

test("where is the WhatsApp / social links: exact verified external URLs, no model calls", () => {
  for (const [text, url] of [
    ["איפה הוואטסאפ?", SITE_LINK_EXTERNAL.whatsapp], ["איפה קבוצת הוואטסאפ", SITE_LINK_EXTERNAL.whatsapp], ["תן לי את הלינק לקבוצת הווצאפ", SITE_LINK_EXTERNAL.whatsapp],
    ["איפה האינסטגרם", SITE_LINK_EXTERNAL.instagram], ["איפה הפייסבוק", SITE_LINK_EXTERNAL.facebook], ["תשלח לי את הלינק לטיקטוק", SITE_LINK_EXTERNAL.tiktok],
  ]) {
    const action = ask(text);
    assert.equal(action.type, "navigate", text);
    assert.equal(action.intent, RAZIEL_NAVIGATION_INTENT.SITE_LINK, text);
    assert.equal(action.href, url, text);
    assert.equal(action.external, true, text);
    assert.equal(action.model_calls, 0, text);
    assert.equal(razielNavigationWhatsappText(action, SITE), `${action.message}\n${url}`, text);
  }
});

test("where are community / Number / privacy / newsletter: exact internal registry hrefs", () => {
  for (const [text, href] of [
    ["איפה הקהילה", "/community"], ["איפה הצ'אט", "/community/chat"], ["איפה אור הגאולה", "/community/chat"], ["איפה דף המספר", "/number"],
    ["איפה הפרטיות", "/privacy"], ["תן לי את הפרטיות", "/privacy"], ["קח אותי לקהילה", "/community"], ["איפה הניוזלטר", "/updates"],
    ["איפה מפת האתר", "/map"], ["איפה צור קשר", "/contact"], ["הלינק לפוסטים", "/post"],
  ]) {
    const action = ask(text);
    assert.equal(action?.type, "navigate", text);
    assert.equal(action.href, href, text);
    assert.equal(action.external, false, text);
    assert.equal(razielNavigationUrl(href, SITE), SITE + href, text);
  }
});

test("a closed route is never offered as open: honest reason plus the registry's open alternative", () => {
  for (const [text, closedId, altHref] of [
    ["איפה ההיכל", "heichal", "/books"], ["איפה אפשר למצוא את ההיכל", "heichal", "/books"], ["איפה דילוגי אותיות", "els", "/codes"],
    ["איפה הארכיון", "archive", "/gallery"], ["איפה כאן מתחילים", "start", "/map"],
  ]) {
    const action = ask(text);
    assert.equal(action.type, "navigate", text);
    assert.equal(action.closed_target, closedId, text);
    assert.equal(action.href, altHref, text);
    assert.equal(action.message, siteLinkById(closedId).closed.message, text);
    assert.match(action.message, /בבנייה|בתהליך התאמה/u, text);
  }
  // lock injection: a route the live router closes turns an otherwise open answer into the honest alternative
  const closedNumber = ask("איפה דף המספר", { linkState: (item) => (item.id === "number" ? "closed" : "open") });
  assert.equal(closedNumber, null, "an entry without a defined alternative answers nothing rather than a closed link");
  const closedCommunity = ask("איפה הקהילה", { linkState: () => "open" });
  assert.equal(closedCommunity.href, "/community");
});

test("the web adapter's live route state agrees with every registry entry", () => {
  for (const id of ["posts", "or-geula", "community", "privacy", "number", "map", "whatsapp", "instagram", "updates"]) {
    assert.equal(razielSiteLinkState(siteLinkById(id)), "open", id);
  }
  for (const id of ["heichal", "els", "archive", "start", "my-research"]) {
    assert.equal(razielSiteLinkState(siteLinkById(id)), "closed", id);
  }
});

test("existing grammar is untouched and \"where\" never becomes a number-page or world request", () => {
  assert.equal(ask("פתח את דף המספר 73").href, "/2029/number/73");
  assert.equal(ask("פתח את העולם").href, "/world");
  assert.equal(ask("תן לי לינק לדף המספר").type, "clarify");
  assert.equal(parseRazielNavigationRequest("איפה העולם"), null);
  assert.equal(parseRazielNavigationRequest("תן לי את העולם"), null);
  assert.equal(parseRazielNavigationRequest("מה הלינק של דף המספר"), null);
  assert.equal(parseRazielNavigationRequest("איפה דף המספר").intent, RAZIEL_NAVIGATION_INTENT.SITE_LINK);
  assert.equal(razielNavigationNeedsFocus(parseRazielNavigationRequest("איפה הפרטיות")), false);
});

test("unknown phrases, mixed asks, negations and information questions never produce a link", () => {
  for (const text of ["איפה הכסף", "איפה אפשר להשיג גימטריה", "מה זה הוואטסאפ", "איפה הוואטסאפ ותסביר לי מה זה", "אל תתן לי את הפרטיות",
    "איפה פרטיות כזאת", "תן לי עוד על הקהילה", "איפה אני נרשם לעדכונים", "איפה", "", null]) {
    assert.equal(ask(text), null, String(text));
  }
});

test("a stored or spoofed action can only render a registry button; external ones open in a new tab", () => {
  const good = { role: "raziel", navigationAction: ask("איפה הוואטסאפ") };
  const external = razielNavigationButton(good);
  assert.equal(external.href, SITE_LINK_EXTERNAL.whatsapp);
  assert.equal(external.external, true);
  const internal = razielNavigationButton({ role: "raziel", navigationAction: ask("איפה הפרטיות") });
  assert.equal(internal.href, "/privacy");
  assert.equal(internal.external, undefined);
  for (const href of ["https://evil.example", "https://chat.whatsapp.com/other", "/privacyx", "/privacy/", "//evil.example", "/profile?x=1", "javascript:alert(1)"]) {
    assert.equal(razielNavigationButton({ ...good, navigationAction: { ...good.navigationAction, href } }), null, href);
    assert.equal(isCanonicalRazielNavigationHref(href), false, href);
  }
  const restored = normalizeRazielNavigationAction(good.navigationAction);
  assert.equal(restored.href, SITE_LINK_EXTERNAL.whatsapp);
  assert.equal(restored.external, true);
  assert.equal(razielNavigationUrl("https://evil.example/x", SITE), "");
  assert.equal(razielNavigationUrl("/privacy", "https://sod1820-x.vercel.app"), "");
});
