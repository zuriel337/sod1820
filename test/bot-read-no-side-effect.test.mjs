// BOT_READ_NO_SIDE_EFFECT_V1 — behavioural test of the read-side gate.
//
// The invariant under test: a bot may READ public content, but the act of reading
// must not produce a side effect (activity, prominence, recommendations, journeys,
// attribution, progression). A human's behaviour must be byte-identical to before.
//
// The gate reads only `document.cookie` / `navigator` — exactly what a browser gives
// it — so the tests drive it by stubbing those globals rather than by injecting a
// test-only hook into production code.
import assert from "node:assert/strict";
import {
  isBot, sideEffectAllowed, suppressedCounts, noteSuppressed,
} from "../src/lib/botVerdict.js";

function withEnv({ cookie = "", ua = "", webdriver = false }, fn) {
  const hadDoc = "document" in globalThis, hadNav = "navigator" in globalThis;
  const prevDoc = globalThis.document, prevNav = globalThis.navigator;
  globalThis.document = { cookie };
  Object.defineProperty(globalThis, "navigator", {
    value: { userAgent: ua, webdriver }, configurable: true, writable: true,
  });
  try { return fn(); } finally {
    if (hadDoc) globalThis.document = prevDoc; else delete globalThis.document;
    if (hadNav) {
      Object.defineProperty(globalThis, "navigator", { value: prevNav, configurable: true, writable: true });
    } else { delete globalThis.navigator; }
  }
}

// ── 1. The edge verdict (cookie vb) is authoritative and outranks the UA ──────
withEnv({ cookie: "vc=IL; vb=browser", ua: "Googlebot/2.1" }, () => {
  assert.equal(isBot(), false, "vb=browser must win over a bot-looking UA (headless faking)");
});
withEnv({ cookie: "vb=goodbot", ua: "Mozilla/5.0 (iPhone)" }, () => {
  assert.equal(isBot(), true, "vb=goodbot must win over a human-looking UA (UA spoofing)");
});
withEnv({ cookie: "vb=ai", ua: "" }, () => assert.equal(isBot(), true, "vb=ai is a bot"));
withEnv({ cookie: "vb=bot", ua: "" }, () => assert.equal(isBot(), true, "vb=bot is a bot"));

// ── 2. UA heuristic is the fallback only when no edge verdict exists yet ─────
withEnv({ cookie: "vc=IL", ua: "Mozilla/5.0 (compatible; Googlebot/2.1)" }, () => {
  assert.equal(isBot(), true, "no vb cookie → UA fallback catches the crawler");
});
withEnv({ cookie: "", ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Safari/605.1" }, () => {
  assert.equal(isBot(), false, "a real mobile browser is never a bot");
});
withEnv({ cookie: "", ua: "Mozilla/5.0", webdriver: true }, () => {
  assert.equal(isBot(), true, "declared automation (navigator.webdriver) is a bot");
});

// ── 3. Real crawler UAs actually observed on this site (crawl_daily, 14d) ────
for (const ua of [
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
  "Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)",
  "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.1)",
  "Mozilla/5.0 (compatible; Baiduspider/2.0; +http://www.baidu.com/search/spider.html)",
  "facebookexternalhit/1.1",
  "Mozilla/5.0 (compatible; PerplexityBot/1.0)",
  "Mozilla/5.0 (Macintosh) AppleWebKit/537.36 HeadlessChrome/120.0.0.0",
]) {
  withEnv({ cookie: "", ua }, () => assert.equal(isBot(), true, `must classify as bot: ${ua}`));
}

// ── 4. Real human UAs must never be suppressed (zero false positives) ────────
for (const ua of [
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
  "Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36",
]) {
  withEnv({ cookie: "", ua }, () => assert.equal(isBot(), false, `must NOT suppress a human: ${ua}`));
}

// ── 5. The gate: humans allowed, bots suppressed, and suppression is counted ─
const before = suppressedCounts();
withEnv({ cookie: "vb=browser", ua: "" }, () => {
  assert.equal(sideEffectAllowed("search_log"), true, "a human may produce side effects");
});
assert.deepEqual(suppressedCounts(), before, "an allowed call must not increment the counter");

withEnv({ cookie: "vb=goodbot", ua: "" }, () => {
  assert.equal(sideEffectAllowed("search_log"), false, "a bot may not produce side effects");
  assert.equal(sideEffectAllowed("page_views"), false);
  assert.equal(sideEffectAllowed("visitor_events"), false);
  assert.equal(sideEffectAllowed("meta_capi_pageview"), false);
});
const after = suppressedCounts();
assert.equal((after.search_log || 0) - (before.search_log || 0), 1, "suppression is counted per sink");
assert.equal((after.page_views || 0) - (before.page_views || 0), 1);
assert.equal((after.visitor_events || 0) - (before.visitor_events || 0), 1);
assert.equal((after.meta_capi_pageview || 0) - (before.meta_capi_pageview || 0), 1);

// ── 6. FAIL-OPEN TO THE HUMAN. If the verdict cannot be computed at all, the
//      visitor is treated as a person: a broken cookie/navigator must never
//      silently stop counting real people.
const noEnvBefore = suppressedCounts().unknown_env || 0;
(() => {
  const hadDoc = "document" in globalThis, hadNav = "navigator" in globalThis;
  const prevDoc = globalThis.document, prevNav = globalThis.navigator;
  delete globalThis.document; delete globalThis.navigator;
  try {
    assert.equal(isBot(), false, "no DOM at all → treated as human, never as bot");
    assert.equal(sideEffectAllowed("unknown_env"), true, "uncertainty must fail open to the human");
  } finally {
    if (hadDoc) globalThis.document = prevDoc;
    if (hadNav) Object.defineProperty(globalThis, "navigator", { value: prevNav, configurable: true, writable: true });
  }
})();
assert.equal((suppressedCounts().unknown_env || 0), noEnvBefore, "fail-open must not count as suppression");

// ── 7. noteSuppressed is additive and never throws ───────────────────────────
const n0 = suppressedCounts().manual || 0;
noteSuppressed("manual"); noteSuppressed("manual");
assert.equal(suppressedCounts().manual, n0 + 2);

// ── 8. suppressedCounts() returns a copy — callers cannot mutate gate state ──
const snap = suppressedCounts();
snap.manual = 9999;
assert.notEqual(suppressedCounts().manual, 9999, "counter snapshot must be a copy");

console.log("bot-read-no-side-effect: PASS");
