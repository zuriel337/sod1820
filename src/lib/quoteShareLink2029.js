// A link that opens a post at one sentence (ZURIEL 18.11.2026, "שיתוף משפט מסומן"). It uses the browsers' own text fragment
// (#:~:text=start,end — Chrome, Edge, Safari 16.1+): the browser scrolls to the words and highlights them, and the page never sees the
// fragment, so nothing new is stored or routed. A browser without support simply opens the post.
const WORDS = 5;
const encodePart = (text) => encodeURIComponent(text).replace(/-/g, "%2D").replace(/,/g, "%2C").replace(/&/g, "%26");

export function normalizeQuote(raw) {
  return String(raw || "").replace(/\s+/g, " ").trim();
}

/** The quote a reader may share: one to a few sentences of real text (12–320 characters). */
export function shareableQuote(raw) {
  const text = normalizeQuote(raw);
  return text.length >= 12 && text.length <= 320 ? text : "";
}

/** The post's own public address plus a text fragment that points at the quote (start and end words for a long quote). */
export function quoteLink(postUrl, quote) {
  const text = normalizeQuote(quote);
  let base;
  try { const url = new URL(postUrl); url.hash = ""; base = url.toString(); } catch { return null; }
  if (!text) return base;
  const words = text.split(" ");
  const directive = words.length <= WORDS * 2
    ? encodePart(text)
    : `${encodePart(words.slice(0, WORDS).join(" "))},${encodePart(words.slice(-WORDS).join(" "))}`;
  // #q= carries the first words for the site's own landing (quoteJump2029); the text directive after :~: is the browser's and is never
  // visible to the page.
  return `${base}#q=${encodePart(words.slice(0, 8).join(" "))}:~:text=${directive}`;
}

/** The text that travels with the link: the quote in Hebrew quotation marks and the post's title. */
export function quoteMessage(quote, title) {
  const text = normalizeQuote(quote);
  return title ? `«${text}» — ${title}` : `«${text}»`;
}
