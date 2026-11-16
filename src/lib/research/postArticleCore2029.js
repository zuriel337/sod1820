// The article transforms of a Post, moved unchanged out of post2029ReadingProjection.js (OLD_POST_ARTICLE_FIRST, 16.11.2026) so that the page
// and the server document run the SAME code. A leaf module: no Supabase client, no research system. Needs a DOM (the browser's, or one
// the caller installs for the duration of a synchronous call). Three property writes became the equivalent attribute writes.

export const clean = (value) => value == null ? "" : String(value).trim();

export function postCssSelectors(selector) {
  const selectors = []; let start = 0, depth = 0, quote = null, escaped = false;
  for (let index = 0; index < selector.length; index += 1) {
    const char = selector[index];
    if (escaped) { escaped = false; continue; }
    if (char === "\\") { escaped = true; continue; }
    if (quote) { if (char === quote) quote = null; continue; }
    if (char === '"' || char === "'") { quote = char; continue; }
    if (char === "(" || char === "[") depth += 1;
    if (char === ")" || char === "]") depth -= 1;
    if (char === "," && !depth) { selectors.push(selector.slice(start, index)); start = index + 1; }
  }
  selectors.push(selector.slice(start));
  return selectors.map(value => value.trim()).filter(Boolean);
}

// Presentation containment over the authored source, not an HTML sanitizer or
// a source rewrite. Legacy plugin resources never become 2029 global styles.
export function postReadingHtml2029(html) {
  if (!globalThis.document?.createElement) return String(html || "");
  const template = document.createElement("template"); template.innerHTML = String(html || "");
  for (const iframe of template.content.querySelectorAll("iframe[src]")) {
    try { const u=new URL(iframe.getAttribute("src"),"https://sod1820.co.il");
      if(["sod1820.co.il","www.sod1820.co.il","sod1820.vercel.app"].includes(u.hostname) && /^\/[^/]+\/embed\/?$/.test(u.pathname)) {
        const link=document.createElement("a");link.setAttribute("href",u.pathname.replace(/\/embed\/?$/,"/")+u.search+u.hash);
        link.textContent=iframe.getAttribute("title")||"לקריאת הפוסט המקושר במלואו ←";iframe.replaceWith(link);
      }
    } catch { /* malformed embeds do not supply identity */ }
  }
  for (const dependency of template.content.querySelectorAll('script,link[rel~="stylesheet"],link[rel="preload"][as="style"]')) dependency.remove();
  for (const icon of template.content.querySelectorAll('img[src*="/wp-content/plugins/gallery-images/"]')) {
    // WordPress plugin arrows/spinners are UI assets, not the authored gallery
    // images. Keep the raw source witness and all actual media URLs unchanged.
    const loader = icon.closest(".loading");
    if (loader && !clean(loader.textContent) && loader.querySelectorAll("img").length === 1) loader.remove();
    else icon.remove();
  }
  const scopedRules = rules => [...rules].flatMap(rule => {
    if (rule.type === 1 && rule.selectorText) {
      const selectors = postCssSelectors(rule.selectorText).map(selector => `.sod29-reading-source ${selector}`);
      return [`${selectors.join(",")} {${rule.style.cssText}}`];
    }
    if ((rule.type === 4 || rule.type === 12) && rule.cssRules) {
      const body = scopedRules(rule.cssRules).join("\n");
      return body ? [`${rule.cssText.slice(0, rule.cssText.indexOf("{"))}{${body}}`] : [];
    }
    // Imports, font faces and animations belong to the existing 2029 owners.
    return [];
  });
  for (const style of template.content.querySelectorAll("style")) {
    try {
      const sheet = new CSSStyleSheet(); sheet.replaceSync(style.textContent || "");
      style.textContent = scopedRules(sheet.cssRules).join("\n");
      style.dataset.postScopedStyle = "true";
    } catch { style.remove(); }
  }
  for (const frame of template.content.querySelectorAll("iframe")) {
    // Attribute writes: what the browser's reflected properties write, so a server DOM produces the same markup.
    frame.setAttribute("loading", "lazy");
    if (!clean(frame.getAttribute("title"))) frame.setAttribute("title", "מדיה מוטמעת מתוך הפוסט");
  }
  return template.innerHTML;
}

// Some WordPress Posts authored equalities as plain text with a colored value,
// before data-gem existed. Decorate only complete, explicit equality lines.
// Preserve their wording, colors and media; no association is engine-verified
// here. Each operand opens its own canonical Number calculation.
export function markLegacyEqualityLines(content = "") {
  const operand = (text, numeric = false) => `<button type="button" class="${numeric ? "sod29-gematria-value" : "sod29-gematria-expression"}" data-post-equality-operand="true" data-gem="${text.trim().replace(/&/g, "&amp;").replace(/"/g, "&quot;")}">${text.trim()}</button>`;
  const hebrew = '[א-ת][א-ת\\u0591-\\u05C7 ״׳"\\x27-]{0,70}';
  const forward = new RegExp('(^|>|\\n)(' + hebrew + ')\\s*=\\s*(<span\\b[^>]*>)?(\\d{1,9})(<\\/span>)?(?:\\s*=\\s*(' + hebrew + '))?(?=\\s*(?:<br\\b|<\\/(?:p|h[1-6]|div)>|$))', 'g');
  const reverse = new RegExp('(^|>|\\n)(\\d{1,9})\\s*=\\s*(' + hebrew + ')(?=\\s*(?:<br\\b|<\\/(?:p|h[1-6]|div)>|$))', 'g');
  return String(content).split(/(<(?:a|button|script|style|pre|code)\b[^>]*>[\s\S]*?<\/(?:a|button|script|style|pre|code)>)/gi).map((part, index) => index % 2 ? part : part
    .replace(forward, (match, start, phrase, span, number, endSpan, other) => `${start}${operand(phrase)} = ${span || ""}${operand(number, true)}${endSpan || ""}${other ? ` = ${operand(other)}` : ""}`)
    .replace(reverse, (match, start, number, phrase) => `${start}${operand(number, true)} = ${operand(phrase)}`)).join("");
}
