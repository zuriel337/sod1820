// Centers one item inside its own horizontally scrolling rail, and moves nothing else.
//
// Element.scrollIntoView() also scrolls every scrollable ancestor, the page included, until the item is on screen.
// On /beit-midrash the source-reading strip sits far below the fold, so calling it on mount made the page scroll itself
// down to that strip a moment after opening; the methods list then loaded above it and pushed the visible sections
// away (CLS 0.66 on a phone). Here only the rail's own scroll position changes, in both LTR and RTL.
export function centerInRail(rail, item) {
  if (!rail || !item || !(rail.scrollWidth > rail.clientWidth)) return;
  const railBox = rail.getBoundingClientRect();
  const itemBox = item.getBoundingClientRect();
  const delta = itemBox.left + itemBox.width / 2 - (railBox.left + railBox.width / 2);
  if (Math.abs(delta) >= 1) rail.scrollLeft += delta;
}
