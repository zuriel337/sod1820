// A block that is late and changes height while the reader is already inside it or below it (28.11.2026, /stats on a phone): a discovery answer with one item shrank the
// reserved slot by ~380 px, then the second answer grew it again by ~800 px, and the row the reader was looking at, and pressing, moved out from under the finger; with an empty
// or failed answer by 1,500 px. The browser's own scroll anchoring held the row only some of the time, so the page does it by what it sees: the element right after the block is
// the anchor; when the block's height changes and the block starts above the top of the screen, whatever distance the anchor moved on screen (the browser's own adjustment
// already included) is scrolled back in the same frame, before paint. A block whose top is on screen (the reader is at the block itself) is left alone.
export function keepReadingPlace(node, win = globalThis.window) {
  const anchor = node?.nextElementSibling;
  if (!node || !anchor || !win || typeof win.ResizeObserver !== "function") return () => {};
  let last = anchor.getBoundingClientRect().top;
  const remember = () => { last = anchor.getBoundingClientRect().top; };
  const observer = new win.ResizeObserver(() => {
    const moved = anchor.getBoundingClientRect().top - last;
    if (moved && Number.isFinite(moved) && node.getBoundingClientRect().top < 0) win.scrollBy({ top: moved, left: 0, behavior: "instant" });
    remember();
  });
  observer.observe(node);
  win.addEventListener("scroll", remember, { passive: true });
  return () => { observer.disconnect(); win.removeEventListener("scroll", remember); };
}
