#!/usr/bin/env node
// "בדוק את האתר" — one command for every agent (ZURIEL 26.11.2026). The READ suite: public site only, no login, no writes, no secrets.
//
// It runs where the network is open (a GitHub Actions runner), because the agent containers cannot reach the site through their proxy.
// It reuses the existing zero-AI canary for the HTTP layer (scripts/post-deploy-canary.mjs) and adds a real Chromium pass on desktop and
// a named phone, so what an agent reports is what a person sees. It does not weaken or bypass any protection: it sends no spoofed
// User-Agent, no bypass header or token, and it reports an edge block (403/429) as a finding instead of working around it.
// A member (write) suite is deliberately NOT here: it needs a protected secret, a dedicated account and a reviewer gate (see CLAUDE.md 0.6).
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { runCanary } from "./post-deploy-canary.mjs";

export const ALLOWED_HOSTS = Object.freeze(["sod1820.co.il", "www.sod1820.co.il", "sod1820.vercel.app"]);
const SHA_IN_PAGE = /"sourceSha":"([0-9a-f]{40})"/;
const BENIGN_THIRD_PARTY = /(google|googletagmanager|doubleclick|googlesyndication|facebook|fbcdn|spot\.im|gstatic|googleapis|adtrafficquality|fundingchoices)/i;

/** The target must be one of the three public origins: the check is not a general scanner. */
export function parseTarget(value = "https://sod1820.co.il") {
  let url;
  try { url = new URL(String(value)); } catch { throw new Error("invalid_url"); }
  if (url.protocol !== "https:" || !ALLOWED_HOSTS.includes(url.hostname) || url.username || url.password || url.port) throw new Error("url_not_allowed");
  return url.origin;
}

export function summarize(report) {
  const failed = report.checks.filter(check => !check.ok);
  const lines = [
    `# בדיקת האתר · ${report.origin}`,
    `מקור פרוס: \`${report.observedSha || "לא נמצא"}\`${report.expectedSha ? ` · צפוי: \`${report.expectedSha}\` · ${report.observedSha === report.expectedSha ? "תואם" : "לא תואם"}` : ""}`,
    `תוצאה: **${failed.length ? `נכשל (${failed.length})` : "עבר"}** · ${report.checks.length} בדיקות · ${new Date(report.finishedAt).toISOString()}`,
    "",
    ...report.checks.map(check => `- ${check.ok ? "✅" : "❌"} ${check.name}${check.detail ? ` — ${check.detail}` : ""}`),
    "",
    "מה לא נבדק: התחברות, שמירה, כתיבה ופעולות חבר (בדיקת חבר דורשת סוד מוגן, חשבון ייעודי ואישור נפרד). אמולציית נייד אינה מכשיר אמיתי.",
  ];
  return lines.join("\n");
}

async function loadPlaywright() {
  const roots = [process.env.SITE_CHECK_TOOLS, process.cwd()].filter(Boolean);
  for (const root of roots) {
    try { return createRequire(join(root, "noop.js"))("playwright"); } catch { /* try the next place */ }
  }
  throw new Error("playwright_not_installed");
}

async function browserPass(origin, pages, { outDir, add }) {
  const { chromium, devices } = await loadPlaywright();
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  try {
    const profiles = [
      { name: "desktop-1440", options: { viewport: { width: 1440, height: 900 } } },
      { name: "iphone-13", options: { ...devices["iPhone 13"] } },
    ];
    for (const profile of profiles) {
      const context = await browser.newContext({ ...profile.options, locale: "he-IL" });
      for (const path of pages) {
        const label = `${profile.name} ${path}`;
        const page = await context.newPage();
        const consoleErrors = [], failedRequests = [];
        page.on("console", message => { if (message.type() === "error" && !BENIGN_THIRD_PARTY.test(message.text())) consoleErrors.push(message.text().slice(0, 160)); });
        page.on("pageerror", error => consoleErrors.push(String(error.message).slice(0, 160)));
        page.on("response", response => {
          const target = response.url();
          if (response.status() >= 400 && !BENIGN_THIRD_PARTY.test(target) && /sod1820|supabase\.co/.test(target)) failedRequests.push(`${response.status()} ${new URL(target).pathname.slice(0, 80)}`);
        });
        try {
          const response = await page.goto(origin + path, { waitUntil: "domcontentloaded", timeout: 30000 });
          const status = response?.status() ?? 0;
          if ([401, 403, 429].includes(status)) { add(`${label}: נטען`, false, `חסימה בקצה (${status}); דווחו ואל תעקפו`); await page.close(); continue; }
          const ready = await page.waitForFunction(() => !document.querySelector(".sod29-opening") && !!document.querySelector("#root"), null, { timeout: 25000 }).then(() => true, () => false);
          const facts = await page.evaluate(() => ({
            title: document.title, overflow: document.documentElement.scrollWidth - window.innerWidth,
            broken: /העמוד לא נפתח|worker_bootstrap|worker_identity_mismatch/.test(document.body.innerText || ""),
            h1: !!document.querySelector("h1, h2"),
          }));
          const shot = `${profile.name}-${path.replace(/[^\w]+/g, "_") || "home"}.png`;
          try { mkdirSync(join(outDir, "shots"), { recursive: true }); await page.screenshot({ path: join(outDir, "shots", shot), fullPage: false }); } catch { /* the screenshot is evidence, never a verdict */ }
          add(`${label}: נטען ונפתח`, status === 200 && ready && !facts.broken, `status=${status} ready=${ready}${facts.broken ? " עמוד שבור" : ""}`);
          add(`${label}: כותרת וכותרת־משנה`, !!facts.title && facts.h1, facts.title.slice(0, 60));
          add(`${label}: אין גלילה אופקית`, facts.overflow <= 1, `overflow=${facts.overflow}px`);
          add(`${label}: אין שגיאות קונסול או בקשות כושלות`, consoleErrors.length === 0 && failedRequests.length === 0, [...consoleErrors, ...failedRequests].slice(0, 3).join(" | "));
        } catch (error) {
          add(`${label}: נטען`, false, String(error.message).slice(0, 140));
        }
        await page.close();
      }
      await context.close();
    }
  } finally { await browser.close(); }
}

export async function runSiteCheck({ url, expectedSha = "", outDir = "site-check-out", fetchImpl = fetch } = {}) {
  const origin = parseTarget(url);
  mkdirSync(outDir, { recursive: true });
  const checks = [];
  const add = (name, ok, detail = "") => checks.push({ name, ok: !!ok, detail: String(detail).slice(0, 200) });
  const report = { origin, suite: "read", startedAt: Date.now(), expectedSha, observedSha: "", checks };

  // HTTP layer: the existing canary (home, bundle, robots, sitemap, health), not a second copy of it.
  const canary = await runCanary(origin, { fetchImpl });
  for (const check of canary.checks) add(`canary: ${check.name}`, check.ok, check.detail);

  // Source identity, security headers and the public/private contract of cipher addresses.
  const code = await fetchImpl(origin + "/code", { redirect: "follow", signal: AbortSignal.timeout(20000) });
  const codeText = await code.text();
  report.observedSha = SHA_IN_PAGE.exec(codeText)?.[1] || "";
  add("/code: 200 ופתיחת האפליקציה", code.status === 200 && /id=["']root["']/.test(codeText), `status=${code.status}`);
  add("/code: זהות מקור (worker)", !!report.observedSha && (!expectedSha || report.observedSha === expectedSha), report.observedSha.slice(0, 12));
  for (const header of ["content-security-policy", "strict-transport-security", "x-content-type-options", "referrer-policy"])
    add(`כותרת אבטחה קיימת: ${header}`, !!code.headers.get(header));
  const missing = await fetchImpl(origin + "/codes/site-check-does-not-exist-" + Date.now(), { redirect: "follow", signal: AbortSignal.timeout(20000) });
  add("כתובת צופן שאינה קיימת: 404 עם noindex", missing.status === 404 && /noindex/i.test(missing.headers.get("x-robots-tag") || ""), `status=${missing.status}`);

  // A real public cipher address from the sitemap (never a hard-coded or private one).
  let cipherPath = "";
  try {
    const index = await (await fetchImpl(origin + "/sitemap.xml", { signal: AbortSignal.timeout(20000) })).text();
    const parts = [...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1].replace(/&amp;/g, "&"));
    for (const part of parts) {
      let partUrl; try { partUrl = new URL(part); } catch { continue; }
      if (partUrl.origin !== origin) continue;
      const text = await (await fetchImpl(partUrl.href, { signal: AbortSignal.timeout(20000) })).text();
      const hit = [...text.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1].replace(/&amp;/g, "&")).find(loc => { try { const p = new URL(loc); return p.origin === origin && /^\/codes\/[^/]+$/.test(p.pathname) && decodeURIComponent(p.pathname) !== "/codes/מחקר"; } catch { return false; } });
      if (hit) { cipherPath = new URL(hit).pathname; break; }
    }
  } catch { /* reported below */ }
  add("sitemap: נמצאה כתובת צופן ציבורי", !!cipherPath, cipherPath ? decodeURIComponent(cipherPath).slice(0, 60) : "לא נמצאה");
  if (cipherPath) {
    const cipher = await fetchImpl(origin + cipherPath, { redirect: "follow", signal: AbortSignal.timeout(20000) });
    const text = await cipher.text();
    add("צופן ציבורי: 200, index ו־JSON-LD", cipher.status === 200 && /index/i.test(cipher.headers.get("x-robots-tag") || "") && /"@type":"Article"/.test(text), `status=${cipher.status}`);
  }

  // Browser pass (real Chromium: desktop and a named phone).
  try { await browserPass(origin, ["/", "/code", "/codes", ...(cipherPath ? [cipherPath] : [])], { outDir, add }); }
  catch (error) { add("דפדפן אמיתי: ריצה", false, String(error.message).slice(0, 140)); }

  report.finishedAt = Date.now();
  writeFileSync(join(outDir, "report.json"), JSON.stringify(report, null, 2));
  writeFileSync(join(outDir, "summary.md"), summarize(report));
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const arg = name => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : undefined; };
  try {
    const report = await runSiteCheck({ url: arg("url") || process.env.SITE_CHECK_URL, expectedSha: arg("sha") || process.env.SITE_CHECK_SHA || "", outDir: arg("out") || "site-check-out" });
    console.log("SITE-CHECK-REPORT-BEGIN");
    console.log(summarize(report));
    console.log("SITE-CHECK-REPORT-END");
    process.exit(report.checks.every(check => check.ok) ? 0 : 1);
  } catch (error) {
    console.error(`site-check: ${error.message}`);
    process.exit(2);
  }
}
