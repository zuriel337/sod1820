import assert from "node:assert/strict";

process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = "1";
const playwright = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const { chromium } = playwright.default || playwright;
const base = process.env.INTEGRATED_PREVIEW_BASE || "http://127.0.0.1:4178";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
const cases = [];

try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const errors = [];
    const userId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const now = new Date().toISOString();
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const token = [
      { alg: "HS256", typ: "JWT" },
      { sub: userId, aud: "authenticated", role: "authenticated", exp },
    ].map(value => Buffer.from(JSON.stringify(value)).toString("base64url")).join(".") + ".synthetic";
    const user = {
      id: userId,
      aud: "authenticated",
      role: "authenticated",
      email: "preview-login@example.invalid",
      email_confirmed_at: now,
      app_metadata: { provider: "email", providers: ["email"] },
      user_metadata: {},
      identities: [],
      created_at: now,
    };
    const session = {
      access_token: token,
      refresh_token: "synthetic-preview-login",
      token_type: "bearer",
      expires_in: 3600,
      expires_at: exp,
      user,
    };
    await context.route("https://linswmnnkjxvweumprav.supabase.co/**", async route => {
      const request = route.request();
      const url = new URL(request.url());
      const reply = (body, status = 200) => route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
      if (url.pathname === "/auth/v1/token") return reply(session);
      if (url.pathname === "/auth/v1/user") return reply(user);
      if (url.pathname === "/rest/v1/users") return reply({
        id: userId,
        username: "preview-login",
        display_name: "בדיקת כניסה",
        avatar_url: null,
        tier: "member",
        role: "user",
        created_at: now,
      });
      if (request.method() === "GET") return reply([]);
      return reply(null);
    });

    const page = await context.newPage();
    page.setDefaultTimeout(20_000);
    page.on("pageerror", error => errors.push(error.message));
    let loginNavigations = 0;
    page.on("framenavigated", frame => {
      if (frame === page.mainFrame() && new URL(frame.url()).pathname === "/login") loginNavigations++;
    });

    await page.goto(`${base}/login?returnTo=%2F2029%2Fjourney`, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "כניסה להיכל", exact: true }).waitFor();
    await page.waitForTimeout(250);
    const settledNavigations = loginNavigations;
    await page.waitForTimeout(250);
    assert.equal(loginNavigations, settledNavigations, "login route must settle instead of reload-looping");
    assert.ok(loginNavigations <= 2, `login route reloaded ${loginNavigations} times`);

    await page.getByRole("button", { name: "🔑 כניסה עם סיסמה", exact: true }).click();
    await page.locator('input[type="email"]').fill(user.email);
    await page.locator('input[type="password"]').fill("synthetic-correct-password");
    await page.getByRole("button", { name: "התחבר ←", exact: true }).click();
    await page.waitForURL(url => url.pathname === "/2029/journey");
    await page.locator('[data-experience-surface="life-journey-2029"]').waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
    assert.deepEqual(errors, []);
    cases.push({ width, directLogin: true, exactReturn: true, reloadLoop: false, noOverflow: true });
    await context.close();
  }
} finally {
  await browser.close();
}

console.log(JSON.stringify({ cases }));
