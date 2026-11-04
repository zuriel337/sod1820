// Only additive companion units on the explicitly extended pages are projected
// away. Historical page fields, all 189 adopted units and every old hash remain.
import { ahavatBeforePublicReading } from './ahavat-public-reading-baseline-2029.mjs';
export const AHAVAT_BOOK_COMPLETION_PAGES = Object.freeze([
  ...Array.from({ length: 15 }, (_, i) => i + 1),
  ...Array.from({ length: 20 }, (_, i) => i + 25),
]);
export function ahavatBeforeBookCompletion(page) {
  // Reverse only exact, separately tested public-prose edits before replaying
  // this earlier checkpoint. Never replace or relax its historical digest.
  page = ahavatBeforePublicReading(page);
  if (!AHAVAT_BOOK_COMPLETION_PAGES.includes(page.pdf_page)) return page;
  const { companion_units, ...historicalPage } = page;
  // One explicitly source-reviewed correction, PDF 3: the colophon says תשס״ג.
  // Restore only that exact prior phrase when checking the historical digest.
  if (page.pdf_page === 3) historicalPage.companion_explanation = historicalPage.companion_explanation.replace('מהדורת תשס״ג.', 'מהדורת תשמ״ג.');
  return historicalPage;
}
