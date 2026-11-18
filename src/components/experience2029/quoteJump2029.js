import "./quoteJump2029.css";
import { normalizeQuote } from "../../lib/quoteShareLink2029.js";

// Opens a post at a shared sentence (#q=<first words>, ZURIEL 18.11.2026). The text fragment in the same link already does this in
// browsers that support it once the text is in the page; this covers the rest, and an article that renders after load. It finds the
// first block of the article that holds the words, lands on it the way an attachment anchor lands (re-landing while images load, until
// the reader touches the page or five seconds pass) and highlights the words with the CSS Highlight API, so the article's DOM is never
// changed (the server-rendered article stays byte-identical to the page).
const BLOCKS = "p, li, blockquote, h2, h3, h4, figcaption, td";

export function findQuoteRange(root, words) {
  const needle = normalizeQuote(words);
  if (!root || needle.length < 4) return null;
  for (const block of root.querySelectorAll(BLOCKS)) {
    if (!normalizeQuote(block.textContent).includes(needle)) continue;
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const at = node.textContent.indexOf(needle);
      if (at >= 0) { const range = document.createRange(); range.setStart(node, at); range.setEnd(node, at + needle.length); return range; }
    }
    const range = document.createRange(); range.selectNodeContents(block); return range; // the words cross inline elements: the whole block
  }
  return null;
}

export function landOnQuote(root, encoded) {
  let words = "";
  try { words = decodeURIComponent(encoded || ""); } catch { return () => {}; }
  let range = null, frame = null, released = false, tries = 0;
  const highlight = () => { try { if (range && globalThis.CSS?.highlights && globalThis.Highlight) CSS.highlights.set("sod-quote", new Highlight(range)); } catch { /* no highlight support */ } };
  const land = () => {
    if (released || frame != null) return;
    frame = requestAnimationFrame(() => {
      frame = null;
      if (released) return;
      range = range || findQuoteRange(root, words);
      if (!range) { if (++tries < 20) setTimeout(land, 250); return; }
      highlight();
      (range.startContainer.parentElement || root).scrollIntoView({ block: "center", behavior: "instant" });
    });
  };
  const release = () => { released = true; observer?.disconnect(); };
  const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(land) : null;
  observer?.observe(root);
  const timer = setTimeout(release, 5000);
  for (const event of ["wheel", "touchstart", "pointerdown", "keydown"]) window.addEventListener(event, release, { passive: true, once: true });
  land();
  return () => {
    release(); clearTimeout(timer); if (frame != null) cancelAnimationFrame(frame);
    for (const event of ["wheel", "touchstart", "pointerdown", "keydown"]) window.removeEventListener(event, release);
  };
}
