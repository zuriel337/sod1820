const { test, expect } = require('@playwright/test');

const BASE = 'http://127.0.0.1:4173';
const PATH = '/topic/ateret-tiferetchem-1820?gematria2029=1';

test.setTimeout(75_000);
test.describe.configure({ mode: 'serial' });

async function noHorizontalOverflow(page) {
  const metrics = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(metrics.scrollWidth).toBe(metrics.clientWidth);
}

for (const width of [390, 1440]) {
  test(`Golden Topic Gematria is one convergence board + one active card at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width < 600 ? 844 : 1000 });
    await page.goto(BASE + PATH, { waitUntil: 'domcontentloaded' });

    const nativeTopic = page.locator('.sod29-topic2029[data-canonical-slug="ateret-tiferetchem-1820"]');
    await expect(nativeTopic).toBeVisible({ timeout: 30_000 });

    const golden = page.locator('[data-gematria-topic-golden="v1"]');
    await expect(golden).toBeVisible({ timeout: 30_000 });
    await expect(golden).toContainText('7 שוויונות מאומתים');
    await expect(golden).toContainText('1820');
    await expect(golden).toContainText('786');
    await expect(golden).toContainText('לא חלק מציר השוויון המאומת');

    const equality = golden.getByRole('button', { name: /התגלות השם המפורש.*1820/ });
    await expect(equality).toBeVisible();
    await equality.click();

    const card = golden.locator('[data-gematria-card="golden-v1"]');
    await expect(card).toBeVisible();
    await expect(card).toContainText('התגלות השם המפורש');
    await expect(card).toContainText('1820');

    const miluy = card.locator('[data-method-key="מילוי"]');
    await expect(miluy).toBeVisible();
    await miluy.click();
    await expect(card).toContainText('2,549');

    const regular = card.locator('[data-method-key="רגיל"]');
    await regular.click();
    await expect(card).toContainText('1820');

    const cardCount = await golden.locator('[data-gematria-card="golden-v1"]').count();
    expect(cardCount).toBe(1);

    const compactHeight = await card.evaluate((el) => el.getBoundingClientRect().height);
    expect(compactHeight).toBeLessThanOrEqual(width < 600 ? 360 : 300);

    await noHorizontalOverflow(page);
    await page.screenshot({
      path: `test-results/release-visual/gematria-topic-golden-${width}.png`,
      fullPage: true,
    });
  });
}
