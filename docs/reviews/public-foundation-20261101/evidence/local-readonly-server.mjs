// Acceptance server only. Serves the exact built entry with SW bootstrap removed
// so Playwright's independent deny-by-default network barrier sees every request.
// The production/protected Preview builder and its worker are tested separately.
import http from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { publicDocumentHandler } from "../../../../preview-deploy/api/public-document.js";
import sitemap from "../../../../api/sitemap.js";
const root = resolve(process.env.SOD_ACCEPTANCE_DIST || new URL("../../../../preview-deploy/dist/", import.meta.url).pathname);
const nativeFetch = globalThis.fetch;
globalThis.fetch = async (input, options = {}) => {
  const url = new URL(typeof input === "string" ? input : input.url);
  const method = options.method || "GET";
  if (url.origin !== "https://linswmnnkjxvweumprav.supabase.co") throw Error("acceptance-egress-denied");
  if (method === "POST" && url.pathname === "/rest/v1/rpc/sitemap_numbers" && (options.body === "{}")) return nativeFetch(url, { ...options, method: "GET", body: undefined });
  if (!["GET", "HEAD"].includes(method) || !url.pathname.startsWith("/rest/v1/")) throw Error("acceptance-egress-denied");
  return nativeFetch(url, { ...options, redirect: "error" });
};
async function rawEntry() {
  const html = await readFile(resolve(root, "index.html"), "utf8");
  const entry = html.match(/await import\('([^']+)'\)/)?.[1];
  if (!entry) throw Error("missing-built-entry");
  return html.replace(/<script type="module">if\(!\('serviceWorker'[\s\S]*?<\/script>/, `<script type="module" src="${entry}"></script>`);
}
const document = publicDocumentHandler({ env: { VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: "gpt/2029-public-foundation-continuity-20261101" }, readDocument: rawEntry });
http.createServer(async (req, res) => {
  const send = { setHeader: (k,v) => res.setHeader(k,v), status(code) { res.statusCode=code;return this; }, send(body) { res.end(body); } };
  try {
    const url = new URL(req.url, "http://127.0.0.1");
    if (!["GET", "HEAD"].includes(req.method)) return send.status(405).send("read only");
    if (url.pathname === "/sitemap.xml") return await sitemap({ publicFoundationPreview: true }, send);
    const path = resolve(root, "." + decodeURIComponent(url.pathname));
    if (!path.startsWith(root + "/") && path !== root) return send.status(400).send("invalid");
    try {
      if (["/index.html", "/2029.html"].includes(url.pathname)) throw Error("use safe entry");
      const body = await readFile(path);
      const type = { ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".webp": "image/webp", ".txt": "text/plain", ".woff2": "font/woff2" }[extname(path)] || "application/octet-stream";
      res.setHeader("Content-Type", type); return res.end(req.method === "HEAD" ? "" : body);
    } catch { if (/\.(?:js|css|png|jpg|svg|webp|woff2)$/.test(url.pathname)) return send.status(404).send("not found"); }
    if (["/index.html", "/2029.html"].includes(url.pathname)) { res.setHeader("Content-Type", "text/html; charset=utf-8"); return res.end(await rawEntry()); }
    return await document({ method: req.method, headers: req.headers, query: { ...Object.fromEntries(url.searchParams), path: url.pathname } }, send);
  } catch { return send.status(503).send("acceptance source unavailable"); }
}).listen(Number(process.env.SOD_ACCEPTANCE_PORT || 4185), "127.0.0.1", () => console.log("Read-only acceptance server ready"));
