// Inert server representation of the same anonymous public post content.
// Never insert authored HTML, scripts, embeds or event attributes into the document.
const escape = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const textHtml = value => escape(value).replace(/&amp;((?:#\d+|#x[\da-f]+|[a-z][a-z\d]+);)/gi, '&$1');

export function publicPostDocument(content, canonical) {
  const source = String(content || '')
    .replace(/<!--[\s\S]*?(?:-->|$)/g, '')
    .replace(/<(script|style|template|noscript)\b[^>]*>[\s\S]*?(?:<\/\1\s*>|$)/gi, '');
  const paragraphs = source
    .replace(/<\/?(?:p|div|h[1-6]|li|tr|section|article|blockquote)\b[^>]*>|<br\b[^>]*>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .split(/\n+/).map(p => p.trim()).filter(Boolean)
    .map(p => `<p>${textHtml(p)}</p>`).join('\n');
  const links = new Map();
  for (const match of source.matchAll(/<a\b[^>]*\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))[^>]*>([\s\S]*?)<\/a\s*>/gi)) {
    const raw = (match[1] ?? match[2] ?? match[3]).replace(/&amp;/gi, '&');
    try {
      const url = new URL(raw, canonical);
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) continue;
      const label = match[4].replace(/<[^>]*>/g, ' ').trim() || url.href;
      links.set(url.href, label);
    } catch { /* malformed links remain text, not executable markup */ }
  }
  const references = [...links].map(([href, label]) => `<li><a href="${escape(href)}">${textHtml(label)}</a></li>`).join('\n');
  return `<article data-public-post-content>\n${paragraphs}\n${references ? `<nav aria-label="קישורים מתוך הפוסט"><ul>${references}</ul></nav>` : ''}\n</article>`;
}
