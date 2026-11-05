// Smart Footer 2029: every link from SITE_LINK_REGISTRY_V1, presentation state from the same router the pages use,
// closed routes shown as "בבנייה", Legacy WhatsApp/social links preserved, grounded suggestions (max 3).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { build } from "esbuild";
import { SITE_LINKS, SITE_LINK_EXTERNAL } from "../supabase/functions/_shared/siteLinkRegistry.js";

const read = (file) => readFileSync(new URL("../" + file, import.meta.url), "utf8");
const ROOT = path.resolve(".");

// Bundle the real component; only the account hook, tracking and the signup form are stubbed (they need a backend).
async function loadFooter(adminFlag = false) {
  const stub = (filter, code) => ({ name: "stub-" + code.slice(0, 8), setup(b) { b.onLoad({ filter }, () => ({ contents: code, loader: "jsx" })); } });
  const out = await build({
    entryPoints: [path.join(ROOT, "src/components/experience2029/Footer2029.jsx")],
    bundle: true, write: false, format: "esm", platform: "node", jsx: "automatic",
    external: ["react", "react/jsx-runtime", "react-router-dom", "react-dom"],
    loader: { ".css": "empty" },
    define: {
      "import.meta.env": JSON.stringify({ VITE_PUBLIC_READING_RELEASE: "public-reading-20261101" }),
      __SOD_2029_BUILD__: "true", __SOD_PUBLIC_READING_PRODUCTION_ARTIFACT__: "true",
    },
    plugins: [
      stub(/lib[\\/]AuthContext\.jsx$/, `export const useAuth = () => ({ isAdmin: ${adminFlag} });`),
      stub(/lib[\\/]tracking\.js$/, "export const trackWhatsappJoin = () => {};"),
      stub(/components[\\/]StayUpdatedCTA\.jsx$/, "export function NewsletterSignup2029({ variant, children }) { return <div data-newsletter-signup=\"existing\" data-variant={variant}>{children}</div>; }"),
    ],
  });
  // Written inside node_modules/.cache so the bundle resolves react exactly like the repository does.
  const dir = path.join(ROOT, "node_modules/.cache/footer-2029-test");
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `Footer2029-${adminFlag ? "admin" : "public"}.mjs`);
  writeFileSync(file, out.outputFiles[0].text);
  return import(file + "?v=" + Math.random());
}

const render = (module, pathname) => renderToStaticMarkup(React.createElement(MemoryRouter, { initialEntries: [pathname] }, React.createElement(module.default)));
const hrefs = (html) => [...html.matchAll(/<a [^>]*href="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, "&"));

test("public footer links come from the registry and external links keep their verified URLs and safe attributes", async () => {
  const footer = await loadFooter(false);
  const html = render(footer, "/2029/posts");
  assert.match(html, /<footer[^>]*data-footer-2029="smart"/);
  for (const url of Object.values(SITE_LINK_EXTERNAL)) assert.ok(html.includes(`href="${url}"`), url);
  for (const match of html.matchAll(/<a [^>]*href="https:[^"]+"[^>]*>/g)) {
    assert.match(match[0], /target="_blank"/);
    assert.match(match[0], /rel="noopener noreferrer"/);
  }
  const allowed = new Set(SITE_LINKS.map((item) => item.href));
  for (const href of hrefs(html)) assert.ok(allowed.has(href), `footer link ${href} is not in the registry`);
  for (const href of ["/post", "/category/מימד חמש", "/community/chat", "/category/סוד החשמל", "/world", "/number", "/profile", "/profile#notifications", "/community", "/contact", "/privacy", "/map"]) {
    assert.ok(hrefs(html).includes(href), `${href} is missing from the footer`);
  }
});

test("closed routes are shown as under construction, never as active links (public viewer)", async () => {
  const footer = await loadFooter(false);
  const html = render(footer, "/2029/posts");
  for (const label of ["ארכיון", "היכל", "המחקר שלי", "כאן מתחילים"]) {
    assert.match(html, new RegExp(`<li class="f29-closed"><span>${label}</span><small>בבנייה</small></li>`), label);
  }
  for (const closedHref of ["/archive", "/research", "/start"]) assert.ok(!hrefs(html).includes(closedHref), closedHref);
  // ZURIEL opened the Bible code (Classic) to the public on 5.11.2026: the footer takes its state from the same router as the pages, so it is a
  // working link for the public and no longer "בבנייה" (the registry's own defaultState is not what the footer shows).
  assert.ok(hrefs(html).includes("/code"), "the Bible code is an active link for the public");
  assert.doesNotMatch(html, /<li class="f29-closed"><span>דילוגי אותיות<\/span>/, "the Bible code is not shown as under construction");
});

test("an admin sees the admin-view routes as working links with a visible admin marker", async () => {
  const footer = await loadFooter(true);
  const html = render(footer, "/2029/posts");
  assert.ok(hrefs(html).includes("/research"));
  assert.ok(hrefs(html).includes("/code"));
  assert.match(html, /<small class="f29-admin">למנהל<\/small>/);
  assert.match(html, /<li class="f29-closed"><span>ארכיון<\/span>/, "/archive stays closed for admins too");
});

test("suggestions are at most three, open, registry-only and never the page already open", async () => {
  const footer = await loadFooter(false);
  for (const [pathname, expected] of [["/2029", ["/post", "/number", "/gematria"]], ["/2029/posts", ["/number", "/gematria", "/world"]],
    ["/number", ["/gematria", "/world", "/post"]], ["/world", ["/post", "/number", "/books"]], ["/privacy", ["/post", "/number", "/map"]]]) {
    const html = render(footer, pathname);
    const chips = [...html.matchAll(/<a class="f29-chip"[^>]*href="([^"]+)"/g)].map((m) => m[1]);
    assert.deepEqual(chips, expected, pathname);
    assert.ok(chips.length <= 3);
    assert.ok(!chips.includes(pathname.replace(/^\/2029$/, "/")), pathname);
  }
});

test("the existing signup is reused on inner pages and not duplicated on the Home page", async () => {
  const footer = await loadFooter(false);
  assert.equal((render(footer, "/2029/posts").match(/data-newsletter-signup="existing"/g) || []).length, 1);
  assert.equal((render(footer, "/2029").match(/data-newsletter-signup="existing"/g) || []).length, 0);
  assert.equal((render(footer, "/").match(/data-newsletter-signup="existing"/g) || []).length, 0);
});

test("the footer is part of the page end: mounted once in the frame, never fixed, no hardcoded hrefs", () => {
  const frame = read("src/components/experience2029/SystemFrame2029.jsx");
  assert.equal((frame.match(/<Footer2029 \/>/g) || []).length, 1);
  const css = read("src/components/experience2029/footer2029.css");
  assert.doesNotMatch(css, /position:\s*(?:fixed|sticky)/);
  const source = read("src/components/experience2029/Footer2029.jsx");
  assert.doesNotMatch(source, /href="[^{]|to="\//, "links must come from the registry, not literals");
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /min-height:44px/);
});

test("the gematria calculator and Beit Midrash are footer destinations; Beit Midrash is an open link for everyone", async () => {
  const publicHtml = render(await loadFooter(false), "/2029/posts");
  assert.ok(hrefs(publicHtml).includes("/gematria"), "מחשבון גימטריה must be a footer link");
  assert.ok(hrefs(publicHtml).includes("/beit-midrash"), "Beit Midrash is a working public footer link");
  assert.doesNotMatch(publicHtml, /<li class="f29-closed"><span>בית המדרש<\/span>/);
  const adminHtml = render(await loadFooter(true), "/2029/posts");
  assert.ok(hrefs(adminHtml).includes("/beit-midrash"), "admin sees Beit Midrash as a working link");
});

test("the footer updates strip is compact: no big card, WhatsApp join is part of it on every page, signup not duplicated", async () => {
  const footer = await loadFooter(false);
  const page = render(footer, "/2029/posts");
  assert.doesNotMatch(page, /f29-news/);
  assert.match(page, /data-newsletter-signup="existing" data-variant="compact"/);
  const home = render(footer, "/");
  assert.doesNotMatch(home, /data-newsletter-signup/, "Home already has its own updates section");
  for (const html of [page, home]) {
    assert.match(html, /<a class="f29-join" href="https:\/\/chat\.whatsapp\.com\/FaI8Nq95NMrCvZheSrW6Ql" target="_blank" rel="noopener noreferrer">/);
    assert.match(html, /עדכונים בוואטסאפ/);
  }
});
