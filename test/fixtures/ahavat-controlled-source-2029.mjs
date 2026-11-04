import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
export const AHAVAT_PDF_SHA256 = "895e9a720d984adf8ea453b644e3f6d0864e101238f348f418aa5fafa20e9c8b";
export const AHAVAT_PDF_URL = "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/gallery/Book/Hebrewbooks_org_5635.pdf";
export const AHAVAT_PDF_BYTES = readFileSync(process.env.AHAVAT_SOURCE_PDF || "/workspace/artifacts/ahavat-book-completion-20261029/source-witness/original.pdf");
assert.equal(createHash("sha256").update(AHAVAT_PDF_BYTES).digest("hex"), AHAVAT_PDF_SHA256);

export function sourcePageCanvas(target, physical) {
  return target.locator(`[data-book-pdf-canvas][data-book-pdf-page="${physical}"][data-book-pdf-painted="true"]`);
}
// The full 99-page independent raster test proves these are actual PDF pages,
// not a screenshot label or a requested-page attribute standing in for pixels.
export async function assertAhavatSourcePage(target, physical) {
  assert.ok(Number.isInteger(physical) && physical >= 1 && physical <= 99);
  const reader = target.locator("xpath=descendant-or-self::*[@data-book-pdf-renderer='controlled']").first();
  const root = await reader.elementHandle();
  let proof, snapshot;
  try {
    // Fullscreen/ResizeObserver may invalidate a paint between locator.waitFor
    // and a later evaluate. Capture readiness, identity and pixels in one JS
    // turn; return an immutable snapshot, not a live canvas reference.
    proof = await reader.page().waitForFunction(({ root, physical }) => {
      if (!root.isConnected) return null;
      const element = root.querySelector(`[data-book-pdf-canvas][data-book-pdf-page="${physical}"][data-book-pdf-painted="true"]`);
      if (!element) return null;
      const rect = element.getBoundingClientRect(), style = getComputedStyle(element);
      if (!rect.width || !rect.height || style.visibility !== "visible" || style.display === "none") return null;
      const context = element.getContext("2d");
      return { renderer: root.dataset.bookPdfRenderer, source: root.dataset.bookPdfSource, sha256: root.dataset.bookSourceSha256, requested: Number(root.dataset.bookRequestedPage), rendered: Number(element.dataset.bookPdfPage), pages: Number(element.dataset.bookPdfPageCount), painted: element.dataset.bookPdfPainted, width: element.width, height: element.height, visibleWidth: rect.width, visibleHeight: rect.height, sample: [...context.getImageData(0, 0, 1, 1).data] };
    }, { root, physical }, { timeout: 30_000, polling: "raf" });
    snapshot = await proof.jsonValue();
  } finally { await proof?.dispose(); await root?.dispose(); }
  assert.equal(snapshot.renderer, "controlled"); assert.equal(snapshot.source, AHAVAT_PDF_URL); assert.equal(snapshot.sha256, AHAVAT_PDF_SHA256);
  assert.equal(snapshot.pages, 99); assert.equal(snapshot.requested, physical); assert.equal(snapshot.rendered, physical); assert.equal(snapshot.painted, "true");
  assert.ok(snapshot.width > 0 && snapshot.height > 0 && snapshot.visibleWidth > 0 && snapshot.visibleHeight > 0);
  assert.equal(snapshot.sample[3], 255);
  return snapshot;
}

export async function ahavatSourceHref(target) {
  const reader = target.locator("xpath=descendant-or-self::*[@data-book-pdf-renderer='controlled' or local-name()='iframe']").first();
  await reader.waitFor();
  if ((await reader.getAttribute("data-book-pdf-renderer")) !== "controlled") return reader.getAttribute("src");
  await reader.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const physical = Number(await reader.getAttribute("data-book-requested-page"));
  const snapshot = await assertAhavatSourcePage(reader, physical);
  return `${snapshot.source}#page=${snapshot.rendered}&view=FitH`;
}

// Request-state acceptance for the original deliberately aborted PDF UI cases.
// Never use this function as evidence that a physical PDF page was rendered.
export async function ahavatRequestedSourceHref(target) {
  const source = target.locator("xpath=ancestor-or-self::*[@id='ahavat29-source']").first();
  const reader = source.locator('[data-book-pdf-renderer="controlled"]');
  await reader.waitFor();
  const href = await source.locator("a[data-book-reader-secondary]").getAttribute("href");
  assert.ok(href.startsWith(`${AHAVAT_PDF_URL}#page=`));
  const physical = Number(new URLSearchParams(new URL(href).hash.slice(1)).get("page"));
  assert.equal(await reader.getAttribute("data-book-pdf-source"), AHAVAT_PDF_URL);
  assert.equal(Number(await reader.getAttribute("data-book-requested-page")), physical);
  assert.equal(await source.locator('[data-book-pdf-painted="true"]').count(), 0, "aborted delivery must not masquerade as a completed source page");
  return href;
}
