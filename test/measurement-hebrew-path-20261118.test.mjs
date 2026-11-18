// Visits to pages with a Hebrew address were not recorded (ZURIEL 18.11.2026). Live: ingest_event answered 400 "invalid measurement envelope"
// on every root WordPress article with a Hebrew address, e.g. /פצצת-אטום-על-הפאה-קריאה-של-האדמור-מהאלמ. readingTelemetryPath returned the
// Hebrew segment itself as the label, and public.ingest_event (read 18.11.2026) admits a measured p_path only when it matches
// ^/([a-z0-9][a-z0-9/-]*(/:(item|value))?)?$. The 18.11 sitemap has 1,158 single-segment Hebrew addresses and one historical page under a
// Hebrew segment. Fix in the client only: the label is the article family; the article identity travels in measurement.page_path
// as /post/<slug>, which the database already admits ([[:alnum:]] = letters and digits; niqqud is not admitted, so such a slug
// travels as the family alone). Latin addresses and private addresses are unchanged.
import test from "node:test";
import assert from "node:assert/strict";
import { readingTelemetryPath as label, readingMeasurementPath as identity, readingMeasurementBody, readingWebVitalBody }
  from "../src/lib/publicReadingTelemetry2029.js";

// The checks public.ingest_event applies to a measured event's addresses (port of the live function; no database is called).
const DB_P_PATH = /^\/([a-z0-9][a-z0-9/-]*(\/:(item|value))?)?$/;
function databaseVerdict(pPath, pagePath) {
  if (typeof pPath !== "string" || pPath.length > 512 || !DB_P_PATH.test(pPath) || pagePath.length > 512) return "invalid measurement envelope";
  let expected = pagePath;
  const article = /^\/(post|tag|category|book|video)\/([\p{L}\p{N}_-]+)$/u.exec(expected);
  if (article && [...article[2]].length <= 256) expected = `/${article[1]}/:item`;
  else if (/^\/number\/[0-9]{1,12}$/.test(expected)) expected = "/number/:value";
  else if (expected !== pPath) return "invalid measurement page";
  return expected === pPath ? "ok" : "private measurement page";
}
const body = (path, surface = "page", eventType = "view", props = {}) => {
  const page = identity(path);
  return { p_sod_id: "abcdef12", p_session_id: "abcdef12", p_path: label(page), p_app_context: "chrome", p_surface: surface,
    p_event_type: eventType, p_is_bot: false, p_props: { ...props, measurement: { version: 2, visitor_id: "abcdef12", page_path: page } } };
};
const engagement = { engaged_ms: 1000, engagement_version: 1, flush_reason: "pagehide", idle_threshold_ms: 30000, max_scroll_pct: 40, visible_ms: 2000 };

const ROOT = "/פצצת-אטום-על-הפאה-קריאה-של-האדמור-מהאלמ";
const ENCODED = "/%D7%A4%D7%A6%D7%A6%D7%AA-%D7%90%D7%98%D7%95%D7%9D";

test("a root Hebrew article: family label, article identity under /post/", () => {
  assert.equal(label(ROOT), "/post/:item");
  assert.equal(identity(ROOT), "/post" + ROOT);
  for (const variant of [ROOT + "/", ROOT + "?utm_source=x&q=secret#title", ENCODED, ENCODED.toLowerCase() + "/"]) {
    assert.equal(label(variant), "/post/:item", variant);
    assert.ok(identity(variant).startsWith("/post/") && !/[?#]/.test(identity(variant)), variant);
  }
  assert.equal(identity(ENCODED), "/post/פצצת-אטום");
});

test("a slug the database cannot admit as an identity is reported as the family alone (niqqud, punctuation, emoji)", () => {
  for (const path of ["/ביאור-חדש-בדברי-המדרש-מֶלֶךְ-פָּרַס-מ", "/הבא-על-הגויה-קשורה-בו-ככלב🐶-יהודי", "/מאמר-״חדש״"]) {
    assert.equal(label(path), "/post/:item", path);
    assert.equal(identity(path), "/post/:item", path);
  }
});

test("a historical page under a Hebrew segment is the article family", () => {
  assert.equal(label("/משיח-בשנת-התשעו/מתי-שנת-הגאולה"), "/post/:item");
  assert.equal(identity("/משיח-בשנת-התשעו/מתי-שנת-הגאולה"), "/post/:item");
});

test("Hebrew inside /post, /tag, /category and /number keeps the existing families", () => {
  assert.equal(label("/post/שלום"), "/post/:item"); assert.equal(identity("/post/שלום"), "/post/שלום");
  assert.equal(label("/tag/סוד-החשמל"), "/tag/:item"); assert.equal(identity("/tag/סוד-החשמל"), "/tag/סוד-החשמל");
  assert.equal(label("/category/גלריות-גימטריה"), "/category/:item"); assert.equal(identity("/category/גלריות-גימטריה"), "/category/גלריות-גימטריה");
  assert.equal(label("/number/משה"), "/number/:value"); assert.equal(identity("/number/משה"), "/number/:value");
  assert.equal(label("/community/researcher/ישראל"), "/community/:item");
});

test("any other address under a Hebrew first segment is the article family (no per-alias table: speed law)", () => {
  for (const path of ["/היכל", "/צור-קשר/טופס-הזמנת-עלונים-ודיסקים"]) assert.equal(label(path), "/post/:item", path);
});

test("Latin addresses are unchanged", () => {
  const expected = { "/": "/", "/world": "/world", "/post/public-slug": "/post/:item", "/old-wordpress-post": "/post/:item",
    "/oliver-stone-obama-is-a-snake": "/oliver-stone-obama-is-a-snake", "/gematria": "/gematria", "/codes/x": "/codes/:item", "/heichal": "/heichal" };
  for (const [path, value] of Object.entries(expected)) assert.equal(label(path), value, path);
});

test("private addresses stay out, also with Hebrew after the private prefix", () => {
  for (const path of ["/me/שם", "/2029/me/מחקר", "/auth/שלום", "/admin/פוסט", "/community/researcher/me", "/community/whatsapp/קבוצה",
    "/login", "/unsubscribe/שלום", "//evil.invalid/שלום", "/bad%zz"]) {
    assert.equal(label(path), null, path);
    assert.equal(identity(path), null, path);
  }
});

test("every label is stable (the validators re-derive it) and admitted by the database", () => {
  for (const path of [ROOT, ENCODED, "/משיח-בשנת-התשעו/מתי-שנת-הגאולה", "/היכל", "/צור-קשר/x", "/post/שלום", "/tag/סוד", "/world"]) {
    const value = label(path);
    assert.equal(label(value), value, path);
    assert.ok(DB_P_PATH.test(value), `${path} -> ${value}`);
  }
});

test("a root Hebrew article sends the same measured events as a Latin article, and the database admits them", () => {
  for (const path of [ROOT, ENCODED, "/ביאור-מֶלֶךְ", "/משיח-בשנת-התשעו/מתי-שנת-הגאולה", "/post/latin-article", "/oliver-stone-obama"]) {
    const view = body(path), engaged = body(path, "page", "engagement", engagement);
    const action = body(path, "content", "view", { action_version: 1, kind: "post", item_id: 7 });
    for (const event of [view, engaged, action]) {
      assert.equal(readingMeasurementBody(event), true, `${path} ${event.p_event_type}`);
      assert.equal(databaseVerdict(event.p_path, event.p_props.measurement.page_path), "ok", `${path} ${event.p_event_type}`);
    }
  }
});

test("before the fix the database refused the label (regression guard for the live 400)", () => {
  assert.equal(databaseVerdict(ROOT, ROOT), "invalid measurement envelope");
  assert.equal(databaseVerdict(label(ROOT), identity(ROOT)), "ok");
});

test("page-speed samples of a root Hebrew article carry the article family", () => {
  const p = { vitals_version: 1, cls: 0, lcp_ms: 1000, inp_ms: null, fcp_ms: 800, ttfb_ms: 200, interaction_count: 0, cls_shift_sources: [],
    ratings: { cls: "good", fcp: "good", inp: null, lcp: "good", ttfb: "good" }, sample_id: "123e4567-e89b-42d3-a456-426614174000",
    phase: "final", flush_reason: "pagehide", initial_path: label(ROOT), current_path: label(ROOT), collector: "performance_observer",
    measurement_scope: "document_navigation_hard_load_only", nav_type: "navigate", visibility_at_flush: "hidden" };
  assert.equal(readingWebVitalBody({ p_sod_id: null, p_session_id: null, p_is_bot: false, p_surface: "performance", p_event_type: "web_vital",
    p_path: label(ROOT), p_app_context: "chrome", p_props: p }), true);
});
