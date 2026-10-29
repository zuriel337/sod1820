// Acceptance-only geometry predicate. Chromium's pageSelector reports the
// central/most-visible page, not the requested top page when FitH displays
// several complete pages in a narrow, tall viewport. Never infer success from
// that counter or from the iframe URL alone.
export function ahavatNativePdfPageAtStart(snapshot, physical) {
  if (!Number.isInteger(physical) || physical < 1 || physical > 99 || !snapshot || snapshot.loadState !== "success" || snapshot.documentPages !== 99 || snapshot.pageIndex !== physical - 1) return false;
  const { requestedRect: rect, previousRect, viewportHeight } = snapshot;
  if (!rect || ![rect.x, rect.y, rect.width, rect.height, viewportHeight].every(Number.isFinite) || rect.width <= 0 || rect.height <= 0 || viewportHeight <= 0) return false;
  // Native PDF inter-page insets plus subpixel rounding; never an entire page.
  if (Math.abs(rect.y) > 8 || rect.y >= viewportHeight || rect.y + rect.height <= 0) return false;
  if (physical > 1 && (!previousRect || ![previousRect.y, previousRect.height].every(Number.isFinite) || previousRect.height <= 0 || previousRect.y + previousRect.height > 8)) return false;
  return true;
}
