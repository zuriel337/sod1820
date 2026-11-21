// Lab server: HTTP/2 + TLS, one shared emulated line (round-robin bytes across open responses, like HTTP/2 multiplexing) and a fixed
// latency before each response. Documents: the built shell; "/" gets the Home hints through the real document handler function.
import http2 from "node:http2"; import fs from "node:fs"; import path from "node:path"; import zlib from "node:zlib";
const [arm, routePreloadPath, port, kbps, rttMs] = process.argv.slice(2);
const { withRoutePreloads2029 } = await import(routePreloadPath);
const root = path.resolve(arm), dist = path.join(root, "dist"), shell = fs.readFileSync(path.join(root, "shell.html"), "utf8");
const T = "/tmp/claude-0/-home-user-sod1820/c9b833e8-a63a-5dad-96a0-96133df72f23/scratchpad/shell/tls";
const rate = Number(kbps) * 1000 / 8, rtt = Number(rttMs); // bytes per second (0 = unlimited)
const types = { ".js": "text/javascript", ".css": "text/css", ".woff2": "font/woff2", ".webp": "image/webp", ".png": "image/png", ".json": "application/json", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".html": "text/html; charset=utf-8" };
const active = new Set(); let log = [];
setInterval(() => { // every 10 ms the line delivers rate*0.01 bytes, shared round-robin in 1 KB slices
  if (!active.size) return; let budget = rate ? rate * 0.01 : Infinity;
  while (budget > 0 && active.size) for (const s of [...active]) { const n = Math.min(1024, s.buf.length - s.off, budget); if (n <= 0) continue; s.stream.write(s.buf.subarray(s.off, s.off + n)); s.off += n; budget -= n; s.sent += n;
    if (s.off >= s.buf.length) { active.delete(s); s.stream.end(); log.push({ path: s.path, bytes: s.buf.length, done: Date.now() }); } if (budget <= 0) break; }
}, 10);
const server = http2.createSecureServer({ allowHTTP1: true, key: fs.readFileSync(path.join(T, "key.pem")), cert: fs.readFileSync(path.join(T, "cert.pem")) });
server.on("stream", (stream, headers) => {
  const url = new URL(headers[":path"], "https://localhost"), p = url.pathname;
  if (p === "/__log") { stream.respond({ ":status": 200, "content-type": "application/json" }); stream.end(JSON.stringify(log)); return; }
  if (p === "/__reset") { log = []; stream.respond({ ":status": 204 }); stream.end(); return; }
  let body, head = {};
  if (p === "/sw.js") { body = fs.readFileSync(path.join(dist, "sw.js")); head = { "content-type": "text/javascript", "service-worker-allowed": "/", "cache-control": "no-cache" }; }
  else if (p.startsWith("/assets/") || p.startsWith("/fonts/") || p.startsWith("/brand/") || /\.(png|ico|webmanifest|svg|webp|json|txt)$/.test(p)) {
    const f = path.join(dist, p); if (!f.startsWith(dist) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { stream.respond({ ":status": 404 }); stream.end(); return; }
    body = fs.readFileSync(f); head = { "content-type": types[path.extname(f)] || "application/octet-stream", "cache-control": p.startsWith("/assets/") ? "public, max-age=31536000, immutable" : "no-cache" };
  } else { body = Buffer.from(withRoutePreloads2029(shell, { path: p, status: 200 })); head = { "content-type": types[".html"], "cache-control": "no-store" }; }
  const gz = /text|javascript|json|svg/.test(head["content-type"]) && (headers["accept-encoding"] || "").includes("gzip");
  if (gz) { body = zlib.gzipSync(body); head["content-encoding"] = "gzip"; }
  setTimeout(() => { if (stream.destroyed) return; stream.respond({ ":status": 200, ...head }); active.add({ stream, buf: body, off: 0, sent: 0, path: p }); }, rtt);
});
server.on("request", (req, res) => { if (req.httpVersion === "2.0") return; // control endpoints for the runner (HTTP/1)
  if (req.url === "/__log") { res.setHeader("content-type", "application/json"); return res.end(JSON.stringify(log)); }
  if (req.url === "/__reset") { log = []; res.statusCode = 204; return res.end(); } res.statusCode = 404; res.end(); });
server.listen(Number(port), () => console.log("ready", arm, port));
