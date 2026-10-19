// Local, offline preview of the community page with edit / soft delete / thread counts.
// Serves the built app (dist, from `npm run build:2029`) on a port and opens headed browser windows
// whose network is answered by the in-memory stand-in in scripts/lib/community-fake-backend.mjs.
// Nothing reaches a live service; all personas share one in-memory store that resets on exit.
//
//   npm run build:2029
//   npm i --no-save playwright && npx playwright install chromium     # once, if Playwright is not installed
//   npm run preview:community-edit-delete
//
// Options: --port=4173  --personas=guest,author,other,admin  --rpc=missing (simulate "migration not applied")
//          --no-open (serve only; the app then talks to the real Supabase URL, so use it only with --no-open for static checks)
// Env: PLAYWRIGHT_MODULE (path to playwright/index.js), CHROMIUM_PATH.
import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { A, B, ADMIN, makeStore, semantics, sessionFor, installFakeBackend } from "./lib/community-fake-backend.mjs";

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v = "true"] = a.replace(/^--/, "").split("="); return [k, v]; }));
const port = Number(args.port || 4173);
const root = fileURLToPath(new URL("../dist/", import.meta.url)).replace(/\/$/, "");
if (!existsSync(resolve(root, "2029.html"))) { console.error("dist/2029.html is missing. Run: npm run build:2029"); process.exit(1); }

const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".woff2": "font/woff2" };
const server = createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  let file = resolve(root, "." + decodeURIComponent(url.pathname));
  if (!file.startsWith(root + sep) || !existsSync(file) || !statSync(file).isFile()) file = resolve(root, "2029.html");
  res.writeHead(200, { "Content-Type": types[extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
  createReadStream(file).pipe(res);
});
await new Promise((ok, fail) => { server.once("error", fail); server.listen(port, "127.0.0.1", ok); });
const base = `http://127.0.0.1:${port}`;
console.log(`Serving ${base}/community/chat`);
if (args["no-open"]) { console.log("Serve-only mode: the page will call the real Supabase host. Press Ctrl+C to stop."); await new Promise(() => {}); }

const playwright = await import(process.env.PLAYWRIGHT_MODULE || "playwright").catch(() => { console.error("Playwright is not installed. Run: npm i --no-save playwright && npx playwright install chromium"); process.exit(1); });
const { chromium } = playwright.chromium ? playwright : playwright.default;
const browser = await chromium.launch({ headless: process.env.PREVIEW_HEADLESS === "1", ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });

const rows = makeStore(); const sem = semantics(rows);
const personas = { guest: ["אורח (לא מחובר)", null], author: ["אילנה — מחברת ההודעה הראשונה: עריכה ומחיקה של ההודעות שלה", A], other: ["בועז — משתמש אחר: אין עריכה על הודעות של אחרים", B], admin: ["מנהל — מחיקה והסתרת שרשור", ADMIN] };
const wanted = (args.personas || "guest,author,other,admin").split(",").filter((p) => personas[p]);
for (const key of wanted) {
  const [label, uid] = personas[key];
  const context = await browser.newContext({ viewport: { width: 1180, height: 860 }, locale: "he-IL" });
  if (uid) { const { session } = sessionFor(uid); await context.addInitScript((v) => localStorage.setItem("sb-linswmnnkjxvweumprav-auth-token", JSON.stringify(v)), session); }
  await installFakeBackend(context, { base, rows, sem, log: { launcher: 0, tableReads: 0, rpcCalls: [], writes: [], errors: [] }, rpc: args.rpc === "missing" ? "missing" : "on" });
  const page = await context.newPage();
  await page.goto(`${base}/community/chat`);
  console.log(`window: ${label}`);
}
console.log("\nOne shared in-memory store: an edit or delete in one window shows in the others after they refresh (or within ~30s).");
console.log("Close the windows or press Ctrl+C to stop. Data is discarded on exit.");
browser.on("disconnected", () => { server.close(); process.exit(0); });
process.on("SIGINT", async () => { await browser.close().catch(() => {}); process.exit(0); });
