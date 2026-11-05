import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isPublicIp, parsePublicHttpsUrl, parseOpenGraph } from "../supabase/functions/_shared/linkPreviewCore.js";
import { fetchLinkPreview, normalizeLinkPreview, _resetLinkPreviewCache } from "../src/lib/community/linkPreviewClient.js";

test("SSRF: private, loopback, link-local, metadata and reserved addresses are never public", () => {
  for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "224.0.0.1", "198.18.0.1",
    "::1", "::", "fe80::1", "fc00::1", "fd12::1", "ff02::1", "::ffff:127.0.0.1", "::ffff:10.0.0.1", "999.1.1.1", "not-an-ip"]) assert.equal(isPublicIp(ip), false, ip);
  for (const ip of ["8.8.8.8", "93.184.216.34", "172.32.0.1", "2606:4700:4700::1111"]) assert.equal(isPublicIp(ip), true, ip);
});

test("only https on the default port with a real DNS name, no credentials, no IP literal", () => {
  assert.ok(parsePublicHttpsUrl("https://example.org/a?b=1"));
  for (const bad of ["http://example.org", "https://user:pw@example.org", "https://example.org:8443/", "https://127.0.0.1/", "https://[::1]/", "https://localhost/",
    "https://intranet/", "https://a.internal/", "https://a.local/", "ftp://example.org", "javascript:alert(1)", "https://10.0.0.1/", "https://x.onion/", "", null]) assert.equal(parsePublicHttpsUrl(bad), null, String(bad));
});

test("Open Graph parsing: bounded text, tags stripped, image only as a public https URL", () => {
  const html = `<html><head><title>Fallback</title>
    <meta property="og:title" content="כותרת &amp; &quot;מצוטטת&quot; &lt;b&gt;">
    <meta property="og:description" content="${"x".repeat(500)}">
    <meta property="og:site_name" content="אתר">
    <meta property="og:image" content="/img/a.jpg"></head></html>`;
  const og = parseOpenGraph(html, "https://example.org/post/1");
  assert.equal(og.title, 'כותרת & "מצוטטת"');
  assert.equal(og.description.length, 300);
  assert.equal(og.siteName, "אתר");
  assert.equal(og.image, "https://example.org/img/a.jpg");
  assert.equal(parseOpenGraph(`<meta property="og:title" content="t"><meta property="og:image" content="http://example.org/a.jpg">`, "https://example.org/").image, null, "http image dropped");
  assert.equal(parseOpenGraph(`<meta property="og:title" content="t"><meta property="og:image" content="https://127.0.0.1/a.jpg">`, "https://example.org/").image, null, "private-host image dropped");
  assert.equal(parseOpenGraph(`<meta property="og:title" content="t"><meta property="og:image" content="javascript:alert(1)">`, "https://example.org/").image, null);
  assert.equal(parseOpenGraph("<html><body>nothing</body></html>", "https://example.org/"), null);
  assert.equal(parseOpenGraph(`<title>Only title</title>`, "https://example.org/").title, "Only title");
});

test("client: dark by default — no request while the flag is off; one request per link when on; failures fall back to null", async () => {
  _resetLinkPreviewCache();
  let calls = 0;
  const ok = async () => { calls++; return { ok: true, json: async () => ({ preview: { title: "T", description: "D", siteName: "S", image: "https://example.org/i.jpg" } }) }; };
  assert.equal(await fetchLinkPreview("https://example.org/a", { enabled: false, fetchImpl: ok }), null);
  assert.equal(calls, 0, "flag off => no network");
  const first = await fetchLinkPreview("https://example.org/a", { enabled: true, fetchImpl: ok, base: "https://x.supabase.co" });
  await fetchLinkPreview("https://example.org/a", { enabled: true, fetchImpl: ok });
  assert.equal(calls, 1); assert.equal(first.title, "T"); assert.equal(first.image, "https://example.org/i.jpg");
  assert.equal(await fetchLinkPreview("http://example.org/insecure", { enabled: true, fetchImpl: ok }), null);
  assert.equal(await fetchLinkPreview("https://example.org/b", { enabled: true, fetchImpl: async () => ({ ok: false }) }), null);
  assert.equal(await fetchLinkPreview("https://example.org/c", { enabled: true, fetchImpl: async () => { throw new Error("net"); } }), null);
  assert.equal(normalizeLinkPreview({ title: "", description: "", image: "http://x/a.png" }, "h"), null);
  assert.equal(normalizeLinkPreview({ title: "t", image: "javascript:1" }, "h").image, null);
});

test("wiring: component uses the flag-gated client; the Edge function guards redirects, DNS, size and content-type", () => {
  const comp = readFileSync(new URL("../src/components/community2029/CommunityMessageContent.jsx", import.meta.url), "utf8");
  assert.match(comp, /GenericLinkCard/); assert.match(comp, /referrerPolicy="no-referrer"/);
  const fn = readFileSync(new URL("../supabase/functions/link-preview/index.ts", import.meta.url), "utf8");
  for (const needle of ['redirect: "manual"', "resolvesPublic", "hop <= 3", "262144", "text\\/html", 'credentials: "omit"', "parsePublicHttpsUrl", "AbortController"]) assert.ok(fn.includes(needle), needle);
  assert.ok(!/service_role|SUPABASE_SERVICE|createClient/i.test(fn), "no database access");
});
