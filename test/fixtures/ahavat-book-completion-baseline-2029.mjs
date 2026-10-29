// Only additive companion units on the explicitly extended pages are projected
// away. Historical page fields, all 189 adopted units and every old hash remain.
export const AHAVAT_BOOK_COMPLETION_PAGES = Object.freeze(Array.from({ length: 15 }, (_, i) => i + 1));
export function ahavatBeforeBookCompletion(page) {
  if (!AHAVAT_BOOK_COMPLETION_PAGES.includes(page.pdf_page)) return page;
  const { companion_units, ...historicalPage } = page;
  return historicalPage;
}
