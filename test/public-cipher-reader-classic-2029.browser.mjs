import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import { startFixture } from "./helpers/authBrowserFixture.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

test("a guest can move from a published cipher to its exact Classic record on request", async t => {
  const row = {
    id: "01000000-0000-4000-a000-000000000001", slug: "saved-public-cipher", title: "צופן שמור לבדיקה",
    search_term: "תורה", scope: "torah", direction: "fwd", skip_distance: 12,
    status: "published", visibility: "public", source: "community",
  };
  const fixture = await startFixture({ supabase: ({ url }) => {
    if (url.pathname !== "/rest/v1/els_records") return null;
    const filters = url.searchParams;
    if (filters.get("id") === `eq.${row.id}`) return { body: [row] };
    const publicDetail = filters.get("slug") === `eq.${row.slug}`
      && filters.get("and") === "(or(status.eq.published,self_published.eq.true))" && filters.get("visibility") === "eq.public";
    return { body: publicDetail ? [row] : [] };
  } });
  t.after(() => fixture.close());
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || process.env.CHROMIUM_EXECUTABLE_PATH,
    args: fixture.chromiumArgs, env: fixture.browserEnv,
  });
  try {
    for (const width of [390, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 840 }, ignoreHTTPSErrors: true });
      try {
        const page = await context.newPage();
        const engineRequests = [];
        page.on("request", req => {
          const path = new URL(req.url()).pathname;
          if (/Els2029Page-|ElsNativeClassic|\/tzofen\.html$|\/functions\/v1\/els[-_](?:scan|search)/i.test(path)) engineRequests.push(path);
        });
        await page.goto(`${fixture.origin}/codes/${row.slug}`, { waitUntil: "domcontentloaded" });
        const action = page.getByRole("link", { name: "פתיחת הצופן השמור בכלי הקלאסי" });
        await action.waitFor();
        assert.equal(await action.getAttribute("href"), `/code?mode=classic&record=${row.id}`);
        assert.deepEqual(engineRequests, [], "reading a publication must not load the tool or start a search");
        await action.click();
        const heading = page.locator(".els29-saved-record h2");
        await heading.waitFor();
        assert.equal(await heading.innerText(), row.title);
        assert.equal(new URL(page.url()).searchParams.get("record"), row.id);
      } finally { await context.close(); }
    }
  } finally { await browser.close(); }
});
