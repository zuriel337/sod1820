import { WORLD_SOURCE_ITEMS_PAGE_SIZE } from "./worldPeopleSourcesProjection.js";

// A window over already-authorized public material, not a reader or a ranker.
// The requested source is the sole exception to the ordinary visible prefix.
export function worldFocusedMaterialWindow(items = [], {
  sourceRef = null, limit = WORLD_SOURCE_ITEMS_PAGE_SIZE, availableItems = items,
} = {}) {
  const size = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : WORLD_SOURCE_ITEMS_PAGE_SIZE;
  const rows = items.slice(0, size);
  const wanted = typeof sourceRef === "string" ? sourceRef : "";
  const focusedItem = wanted ? items.find((row) => row.sourceRef === wanted) || null : null;
  if (focusedItem && !rows.some((row) => row.sourceRef === wanted)) rows.unshift(focusedItem);
  return {
    rows, focusedItem, hasMore: rows.length < items.length,
    focusState: !wanted ? "idle" : focusedItem ? "visible"
      : availableItems.some((row) => row.sourceRef === wanted) ? "filtered_out" : "unavailable",
  };
}
