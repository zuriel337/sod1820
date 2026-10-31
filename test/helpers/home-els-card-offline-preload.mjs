// Reuse the original card browser assertions with an actual built app, real fonts,
// deterministic external transport fixtures, and no live product writes or reads.
// node --import ./test/helpers/home-els-card-offline-preload.mjs test/els-home-card-2029.browser.mjs
import { createRequire } from "node:module";
import { existsSync, writeFileSync } from "node:fs";

const { chromium } = createRequire(import.meta.url)("playwright");
const launch = chromium.launch.bind(chromium);
const evidence = { externalIO: "fully intercepted synthetic fixtures", forwardedExternal: 0,
  blockedMutations: {}, fixtureRequests: {}, edgeAttempts: [], webSocketsBlocked: 0 };
const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*" };
const count = (bucket, name) => { bucket[name] = (bucket[name] || 0) + 1; };
const fixturePosts = Array.from({ length: 4 }, (_, i) => ({
  id: 990100 + i, slug: `synthetic-home-card-${i}`, title: `מקור סינתטי לבדיקת הכרטיס ${i + 1}`,
  author: "בדיקת ממשק", content: "<p>תוכן סינתטי לבדיקת פריסה בלבד.</p>",
  image_url: null, thumb_url: null, date: "2026-10-30T10:00:00Z",
  modified: "2026-10-31T08:00:00Z", tags: [], categories: [], status: "publish",
}));
const flags = ["lock_els", "lock_world", "lock_heichal", "lock_raziel_site", "lock_number",
  "lock_books", "lock_life_journey"].map(key => ({ key, enabled: false, mode: "all", message: "" }));

chromium.launch = async options => {
  const browser = await launch({
    ...(existsSync("/usr/bin/chromium") ? { executablePath: "/usr/bin/chromium" } : {}),
    ...options, args: ["--no-sandbox", "--disable-dev-shm-usage", ...(options?.args || [])],
  });
  const newContext = browser.newContext.bind(browser);
  browser.newContext = async options => {
    const context = await newContext(options);
    // Do not connect any external socket; Supabase's initial bundle may contain
    // realtime support but this test does not admit a live subscription.
    await context.routeWebSocket("**/*", ws => {
      evidence.webSocketsBlocked++;
      ws.close();
    });
    await context.route("**/*", async route => {
      const request = route.request(), url = new URL(request.url());
      if (["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)) return route.continue();
      const key = `${request.method()} ${url.pathname}`;
      if (url.hostname !== "linswmnnkjxvweumprav.supabase.co") return route.abort();
      count(evidence.fixtureRequests, key);
      const reply = (body, status = 200, headers = {}) => route.fulfill({ status,
        headers: { ...cors, ...headers }, contentType: "application/json", body: JSON.stringify(body) });
      if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
      if (url.pathname.includes("/functions/v1/")) {
        evidence.edgeAttempts.push(key);
        return reply({ error: "card_acceptance_forbids_edge_calls" }, 403);
      }
      if (url.pathname === "/auth/v1/user") return reply({ error: "synthetic_guest" }, 401);
      if (url.pathname === "/rest/v1/site_flags") return reply(flags);
      if (url.pathname === "/rest/v1/posts") return reply(fixturePosts,
        200, { "content-range": `0-3/${fixturePosts.length}` });
      // Read RPCs and all existing telemetry/mutations are synthetic responses.
      // Page-level availability fixtures in the original suite override this route.
      if (!["GET", "HEAD"].includes(request.method())) {
        count(evidence.blockedMutations, key);
        return reply([]);
      }
      if (request.method() === "HEAD") return route.fulfill({ status: 200,
        headers: { ...cors, "content-range": "*/0" } });
      return reply([]);
    });
    return context;
  };
  return browser;
};

process.on("exit", () => {
  if (process.env.HOME_CARD_OFFLINE_REPORT) {
    writeFileSync(process.env.HOME_CARD_OFFLINE_REPORT, JSON.stringify(evidence, null, 2) + "\n");
  }
  if (evidence.edgeAttempts.length) process.exitCode = 1;
});
