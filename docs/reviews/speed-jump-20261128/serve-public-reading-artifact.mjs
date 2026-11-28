import http from "node:http"; import zlib from "node:zlib"; import fs from "node:fs"; import path from "node:path";
const root = process.argv[2], port = Number(process.argv[3]); const mode = process.argv[4] || "plain"; // plain | calc
const mod = await import(path.resolve(root, "../route-preload.js"));
const types = { ".js": "text/javascript", ".css": "text/css", ".html": "text/html; charset=utf-8", ".json": "application/json", ".webp": "image/webp", ".avif": "image/avif", ".woff2": "font/woff2", ".png": "image/png", ".svg": "image/svg+xml", ".txt": "text/plain", ".webmanifest": "application/manifest+json" };
http.createServer((req, res) => {
  const u = new URL(req.url, "http://x"); let f = path.join(root, decodeURIComponent(u.pathname));
  const isDoc = !path.extname(u.pathname) || u.pathname === "/2029.html";
  if (isDoc || !fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(root, "../.generated/2029.html");
  let body = fs.readFileSync(f); const ext = f.endsWith("2029.html") ? ".html" : path.extname(f);
  if (f.endsWith(".generated/2029.html")) { let html = body.toString("utf8"); if (mode === "plain") html = html.replace(/<!--sod-calculator-preload [\s\S]*? -->/, ""); html = mod.withRoutePreloads2029(html, { path: u.pathname, status: 200 }); body = Buffer.from(html); }
  const headers = { "content-type": types[ext] || "application/octet-stream", "cache-control": ext === ".html" ? "no-store" : "public, max-age=31536000, immutable", "service-worker-allowed": "/" };
  if (/br/.test(req.headers["accept-encoding"] || "") && [".js", ".css", ".html", ".json", ".svg", ".txt"].includes(ext)) { body = zlib.brotliCompressSync(body, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 5 } }); headers["content-encoding"] = "br"; }
  res.writeHead(200, headers); res.end(body);
}).listen(port, "127.0.0.1", () => console.log("serving", root, port, mode));
