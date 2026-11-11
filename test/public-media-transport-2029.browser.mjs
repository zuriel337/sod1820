// Browser regression for public storage media through the REAL public-reading worker ("המדיה לא נטענה", 10.11.2026).
// A real Chromium, the BUILT artifact and its sw.js on the production URL, and the shared fixture answering for the Supabase
// storage host with HTTP Range/206. Videos and audio must play and seek, images must load, with and without a version key or
// a media start fragment, on first load and after a reload; a signed object must never leave the worker as a native load.
//   node scripts/build-public-reading-production.mjs && node --test test/public-media-transport-2029.browser.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { startFixture, dist } from './helpers/authBrowserFixture.mjs';

const req = createRequire(import.meta.url);
let pw; for (const name of ['playwright', '@playwright/test']) { try { pw = req(name); break; } catch { /* optional tooling */ } }
const executablePath = process.env.CHROMIUM_PATH || process.env.CHROMIUM_EXECUTABLE_PATH;
const skip = !(Boolean(pw) && existsSync(join(dist, 'sw.js'))) && 'playwright or the built artifact is unavailable';
// Set by the CI step when the browser it runs can decode H.264 (Google Chrome): then video must really play and seek, not only load.
const requireVideoDecode = process.env.PUBLIC_MEDIA_REQUIRE_VIDEO_DECODE === '1';

const STORE = 'https://linswmnnkjxvweumprav.supabase.co/storage/v1';
const PROFILES = {
  desktop: { viewport: { width: 1280, height: 900 } },
  mobile: { viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2,
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36' },
};
// What new WhatsApp intake writes (canonical path, no parameter) and what history holds (version keys, the Now start fragment).
const PLAYERS = [
  ['video', `${STORE}/object/public/media/fixture/clip.mp4`],
  ['video', `${STORE}/object/public/media/fixture/clip.mp4?_=4`],
  ['video', `${STORE}/object/public/gallery/fixture/clip.mp4#t=0.1`],
  ['video', `${STORE}/object/public/media/fixture/clip.mp4?v=2`, 'anonymous'],
  ['audio', `${STORE}/object/public/media/fixture/tone.wav`],
  ['audio', `${STORE}/object/public/media/fixture/tone.wav?v=1786548126`],
];
const IMAGES = [
  `${STORE}/object/public/media/fixture/poster.png`,
  `${STORE}/object/public/media/fixture/poster.png?v=1786548126`,
  `${STORE}/render/image/public/media/fixture/poster.png?v=1&width=200&quality=62&resize=contain`,
];
const SIGNED = `${STORE}/object/sign/media/fixture/poster.png?token=synthetic`;

const ready = page => page.waitForFunction(async () => {
  if (!navigator.serviceWorker.controller || window.__bootstrapFailure) return false;
  const channel = new MessageChannel();
  const reply = await new Promise(resolve => { channel.port1.onmessage = event => resolve(event.data); setTimeout(() => resolve(null), 1500);
    navigator.serviceWorker.controller.postMessage({ type: 'public-reading-policy' }, [channel.port2]); });
  return Boolean(reply?.policy && reply?.sourceSha);
}, null, { timeout: 30000, polling: 250 });

// Plays every player, then seeks to 60% and waits for the seek to land; returns one outcome per player.
const playAndSeek = (page, players) => page.evaluate(async players => {
  const outcomes = [];
  for (const [tag, src, crossOrigin] of players) {
    const el = document.createElement(tag); el.muted = true; el.preload = 'none'; if (crossOrigin) el.crossOrigin = crossOrigin;
    el.src = src; document.body.append(el);
    const settle = (events, ms) => new Promise(resolve => { const done = name => () => resolve(name);
      for (const name of events) el.addEventListener(name, done(name), { once: true }); setTimeout(() => resolve('timeout'), ms); });
    let play = 'ok'; try { await Promise.race([el.play(), new Promise((_, reject) => setTimeout(() => reject(new Error('play timeout')), 20000))]); } catch (error) { play = String(error?.message || error); }
    let seek = null, target = null;
    if (play === 'ok' && Number.isFinite(el.duration) && el.duration > 3) {
      target = Math.floor(el.duration * 0.6); el.currentTime = target; seek = await settle(['seeked', 'error'], 15000);
    }
    outcomes.push({ tag, src, play, seek, target, at: el.currentTime, error: el.error?.code || null,
      codec: tag === 'video' ? el.canPlayType('video/mp4; codecs="avc1.42E01E"') : 'pcm' });
    el.pause(); el.remove();
  }
  return outcomes;
}, players);

const loadImages = (page, sources) => page.evaluate(sources => Promise.all(sources.map(src => new Promise(resolve => {
  const img = new Image(); img.onload = () => resolve({ src, width: img.naturalWidth }); img.onerror = () => resolve({ src, width: 0 });
  img.src = src; setTimeout(() => resolve({ src, width: -1 }), 15000);
}))), sources);

for (const profile of Object.keys(PROFILES)) {
  test(`[${profile}] public storage media plays, seeks and loads through the real worker, with and without version keys; signed stays guarded`, { skip, timeout: 180000 }, async () => {
    const fixture = await startFixture();
    const browser = await pw.chromium.launch({ ...(executablePath ? { executablePath } : {}), headless: true,
      args: [...fixture.chromiumArgs, '--autoplay-policy=no-user-gesture-required'], env: fixture.browserEnv });
    try {
      const context = await browser.newContext({ ...PROFILES[profile], ignoreHTTPSErrors: true, locale: 'he-IL' });
      const page = await context.newPage();
      console.log(`[public-media] ${profile}: browser ${browser.version()}, video decode required: ${requireVideoDecode}`);
      for (const visit of ['first load', 'reload']) {
        if (visit === 'first load') await page.goto(fixture.origin + '/', { waitUntil: 'domcontentloaded' }); else await page.reload({ waitUntil: 'domcontentloaded' });
        await ready(page);
        const before = fixture.state.storage.length;
        for (const outcome of await playAndSeek(page, PLAYERS)) {
          const label = `${visit}: ${outcome.tag} ${outcome.src}`;
          const path = new URL(outcome.src).pathname, seen = fixture.state.storage.slice(before).filter(entry => entry.path === path);
          assert.ok(seen.some(entry => entry.range && entry.status === 206), `${label}: the browser reached storage natively with a Range request`);
          if (outcome.tag === 'video' && !outcome.codec) { // the transport is proven above; this browser build cannot decode H.264
            assert.equal(requireVideoDecode, false, `${label}: this run requires real video decoding (browser ${browser.version()})`); continue;
          }
          assert.equal(outcome.play, 'ok', label); assert.equal(outcome.error, null, label);
          assert.equal(outcome.seek, 'seeked', label); assert.ok(Math.abs(outcome.at - outcome.target) < 1.5, `${label}: seek landed at ${outcome.at}`);
          assert.ok(seen.some(entry => entry.status === 206 && entry.start > 0) || outcome.tag === 'audio', `${label}: seeking asked for a later byte range`);
        }
        for (const image of await loadImages(page, IMAGES)) assert.ok(image.width > 0, `${visit}: image ${image.src}`);
        const signed = await loadImages(page, [SIGNED]);
        assert.ok(!fixture.state.storage.some(entry => entry.path.startsWith('/storage/v1/object/sign/')), `${visit}: a signed object never became a native load (${signed[0].width})`);
      }
      await context.close();
    } finally { await browser.close(); await fixture.close(); }
  });
}
