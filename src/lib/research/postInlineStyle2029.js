// The authored inline style of a Post element, read and edited as TEXT (OLD_POST_ARTICLE_FIRST, 16.11.2026). The browser's CSSOM and a server
// DOM parse and serialize a style attribute differently (unknown properties, normalized values), so the displayed copy never goes through the
// CSSOM: the same text gives the same result in every DOM. A leaf module, no DOM needed.

// The declarations of a style text: [{ name, value, important }], in order; a ";" inside quotes or parentheses does not split.
export function styleDeclarations(text) {
  const out = []; const source = String(text || "");
  let start = 0, paren = 0, quote = null;
  const push = (end) => {
    const part = source.slice(start, end); const colon = part.indexOf(":");
    if (colon > 0) {
      const name = part.slice(0, colon).trim().toLowerCase(); let value = part.slice(colon + 1).trim();
      const important = /!\s*important\s*$/i.test(value); if (important) value = value.replace(/!\s*important\s*$/i, "").trim();
      if (name && value) out.push({ name, value, important });
    }
    start = end + 1;
  };
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quote) { if (char === "\\") index += 1; else if (char === quote) quote = null; continue; }
    if (char === '"' || char === "'") quote = char;
    else if (char === "(") paren += 1;
    else if (char === ")") paren = Math.max(0, paren - 1);
    else if (char === ";" && !paren) push(index);
  }
  push(source.length);
  return out;
}

// The style text without the named properties (the other declarations keep their authored text and order).
export function styleTextWithout(text, names) {
  const drop = new Set([].concat(names).map(name => String(name).toLowerCase()));
  return styleDeclarations(text).filter(item => !drop.has(item.name)).map(item => `${item.name}: ${item.value}${item.important ? " !important" : ""};`).join(" ");
}
