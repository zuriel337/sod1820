import { createWebVitalsRuntime2029 } from "@collector";
import { primaryContentState2029 } from "@readiness";

const home = `
  <main>
    <div class="h29" data-experience-capability="home-composition">
      <article class="h29-hero"><h1>תוכן בית אמיתי</h1><a href="/post/example">לקריאה</a></article>
    </div>
  </main>`;

const world = `
  <main>
    <section data-flight-story="world">
      <article class="sod29-flight-feature">
        <h2>סיפור העולם</h2><p class="sod29-flight-meta">מקור ציבורי</p>
        <div class="sod29-actions"><button type="button">פתח</button></div>
      </article>
    </section>
  </main>`;

document.body.innerHTML = home;

const previewWrites = [];
let previewIdentityReads = 0;
const preview = createWebVitalsRuntime2029({
  production: false,
  transport: (payload) => previewWrites.push(payload),
  getSodId: () => { previewIdentityReads += 1; return "must-not-read"; },
  checkpointMs: 20,
  authorizationTimeoutMs: 2000,
});
preview.authorize();

const writes = [];
let identityReads = 0;
let id = 0;
const runtime = createWebVitalsRuntime2029({
  production: true,
  transport: (payload, options) => writes.push({ payload, options }),
  getSodId: () => { identityReads += 1; return "browser-sod"; },
  sessionId: () => "browser-session",
  appContext: () => "chromium",
  trafficHint: "human_like",
  bot: false,
  buildSha: "browser-build-sha",
  deployEnv: "production",
  checkpointMs: 20,
  usablePollMs: 10,
  usableTimeoutMs: 2000,
  authorizationTimeoutMs: 2000,
  cryptoObject: { randomUUID: () => `browser-${++id}` },
});

window.__rumV2 = {
  runtime,
  writes,
  preview,
  previewWrites,
  get identityReads() { return identityReads; },
  get previewIdentityReads() { return previewIdentityReads; },
  authorize() { runtime.authorize(); },
  finalizeHard() { window.dispatchEvent(new Event("pagehide")); },
  goWorld() {
    history.pushState({}, "", "/world");
    document.body.innerHTML = world;
  },
  project(pathname, html) {
    document.body.innerHTML = html;
    return primaryContentState2029({ pathname, doc: document, win: window });
  },
};
