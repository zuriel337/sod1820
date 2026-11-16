// The first-paint stylesheet of the first-document article (OLD_POST_ARTICLE_FIRST; ZURIEL 16.11.2026: "לקצר את ההמתנה לעיצוב הראשוני, בלי קפיצת
// פסקאות ועוגנים"; Codex review: "extract the necessary article styles from the existing source of styling ... do not maintain two drifting
// article designs"). It is not a second design: it is the page's own stylesheets, in their own order, with only the rules left out that can
// never match the first document. A rule is kept when ANY of its selectors may match the markup the first document can contain (its
// vocabulary: every tag, id, class, attribute and attribute value of every proven article document, the frame, the opening bar and the
// document itself); everything that cannot be decided (:has, :is with an open branch, unknown syntax) is kept. Keeping too much costs bytes;
// dropping a rule that applies would change the article when the full stylesheets arrive, which the browser acceptance compares (geometry,
// fonts, colours before and after adoption).
import { postCssSelectors } from "../../src/lib/research/postArticleCore2029.js";

// Attributes whose values are free text: only their presence is known, any value may match.
const FREE_VALUES = new Set(["href", "src", "srcset", "sizes", "alt", "title", "style", "aria-label", "aria-controls", "aria-describedby", "aria-labelledby",
  "content", "datetime", "width", "height", "name", "id", "value", "placeholder", "for", "colspan", "rowspan", "allow", "target", "rel", "lang",
  "data-ssr-post", "data-ssr-source", "data-ssr-path", "data-post-slug", "data-media-id", "data-gallery-image-id", "data-id", "data-src", "data-public-post-id"]);
const MAX_VALUES = 400;

export function emptyVocabulary() { return { tags: new Set(), ids: new Set(), classes: new Set(), attributes: new Map() }; }
export function addToVocabulary(vocabulary, root) {
  const elements = root.querySelectorAll ? [...(root.nodeType === 1 ? [root] : []), ...root.querySelectorAll("*")] : [];
  for (const element of elements) {
    vocabulary.tags.add(element.localName.toLowerCase());
    if (element.id) vocabulary.ids.add(element.id);
    for (const name of element.classList || []) vocabulary.classes.add(name);
    for (const attribute of element.attributes) {
      const name = attribute.name.toLowerCase();
      if (!vocabulary.attributes.has(name)) vocabulary.attributes.set(name, FREE_VALUES.has(name) || name.startsWith("data-elementor") ? null : new Set());
      const values = vocabulary.attributes.get(name);
      if (values) { values.add(attribute.value); if (values.size > MAX_VALUES) vocabulary.attributes.set(name, null); }
    }
  }
  return vocabulary;
}
export const vocabularyToJson = vocabulary => ({ tags: [...vocabulary.tags].sort(), ids: [...vocabulary.ids].sort(), classes: [...vocabulary.classes].sort(),
  attributes: Object.fromEntries([...vocabulary.attributes].sort(([a], [b]) => a < b ? -1 : 1).map(([name, values]) => [name, values ? [...values].sort() : null])) });
export const vocabularyFromJson = json => ({ tags: new Set(json.tags), ids: new Set(json.ids), classes: new Set(json.classes),
  attributes: new Map(Object.entries(json.attributes).map(([name, values]) => [name, values ? new Set(values) : null])) });
export function mergeVocabularies(...list) {
  const out = emptyVocabulary();
  for (const vocabulary of list) {
    for (const key of ["tags", "ids", "classes"]) for (const value of vocabulary[key]) out[key].add(value);
    for (const [name, values] of vocabulary.attributes) {
      if (!out.attributes.has(name)) out.attributes.set(name, values ? new Set(values) : null);
      else if (out.attributes.get(name) && values) for (const value of values) out.attributes.get(name).add(value);
      else out.attributes.set(name, null);
    }
  }
  return out;
}

// --- selectors -------------------------------------------------------------------------------------------------------------------------------
function splitCompounds(selector) {
  const parts = []; let current = "", depth = 0, quote = null;
  for (let index = 0; index < selector.length; index += 1) {
    const char = selector[index];
    if (quote) { current += char; if (char === "\\") { current += selector[++index] ?? ""; } else if (char === quote) quote = null; continue; }
    if (char === '"' || char === "'") { quote = char; current += char; continue; }
    if (char === "(" || char === "[") depth += 1;
    if (char === ")" || char === "]") depth -= 1;
    if (!depth && (/\s/.test(char) || char === ">" || char === "+" || char === "~")) { if (current) parts.push(current); current = ""; continue; }
    current += char;
  }
  if (current) parts.push(current);
  return parts;
}
const unescape = value => value.replace(/\\([0-9a-fA-F]{1,6}\s?|.)/g, (match, code) => /^[0-9a-fA-F]/.test(code) ? String.fromCodePoint(parseInt(code, 16)) : code);
function readParenthesis(text, start) {   // text[start] === "("
  let depth = 0, quote = null;
  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (quote) { if (char === "\\") index += 1; else if (char === quote) quote = null; continue; }
    if (char === '"' || char === "'") { quote = char; continue; }
    if (char === "(") depth += 1; else if (char === ")") { depth -= 1; if (!depth) return index; }
  }
  return text.length - 1;
}
function compoundMayMatch(compound, vocabulary) {
  let index = 0;
  const ident = () => { const match = /^(?:\\.|[-\w -￿])+/.exec(compound.slice(index)); if (!match) return null; index += match[0].length; return unescape(match[0]); };
  if (compound[index] === "*") index += 1;
  else if (/[-\w\\]/.test(compound[index] || "")) { const type = ident(); if (type && !vocabulary.tags.has(type.toLowerCase())) return false; }
  while (index < compound.length) {
    const char = compound[index];
    if (char === "#") { index += 1; const id = ident(); if (id != null && !vocabulary.ids.has(id)) return false; continue; }
    if (char === ".") { index += 1; const name = ident(); if (name != null && !vocabulary.classes.has(name)) return false; continue; }
    if (char === "[") {
      const end = compound.indexOf("]", index); const body = compound.slice(index + 1, end < 0 ? undefined : end).trim(); index = end < 0 ? compound.length : end + 1;
      // [ns|name op value flag]: the name never takes the operator's first character ([style*=x] is the attribute "style")
      const match = /^(?:(?:[-\w]*|\*)\|)?([-\w]+)\s*(?:([~|^$*]?=)\s*("(?:\\.|[^"])*"|'(?:\\.|[^'])*'|[^\s\]]+)\s*([is])?)?$/.exec(body);
      if (!match) continue;   // unknown: may match
      const name = match[1].toLowerCase();
      if (!vocabulary.attributes.has(name)) return false;
      const values = vocabulary.attributes.get(name);
      if (match[2] === "=" && values && !match[4]) { const value = unescape(match[3].replace(/^["']|["']$/g, "")); if (!values.has(value)) return false; }
      continue;
    }
    if (char === ":") {
      const element = compound[index + 1] === ":"; index += element ? 2 : 1;
      const name = (ident() || "").toLowerCase();
      let argument = null;
      if (compound[index] === "(") { const close = readParenthesis(compound, index); argument = compound.slice(index + 1, close); index = close + 1; }
      if (element) continue;
      if (name === "root" && !vocabulary.tags.has("html")) return false;
      if ((name === "is" || name === "where" || name === "matches" || name === "-webkit-any") && argument != null && !postCssSelectors(argument).some(inner => selectorMayMatch(inner, vocabulary))) return false;
      continue;   // :not, :has, states, structure, lang/dir: may match
    }
    index += 1;   // anything else: skip it, may match
  }
  return true;
}
export function selectorMayMatch(selector, vocabulary) {
  try { return splitCompounds(selector.trim()).every(compound => compoundMayMatch(compound, vocabulary)); } catch { return true; }
}

// --- stylesheets -----------------------------------------------------------------------------------------------------------------------------
function blocks(css) {
  const out = []; let index = 0;
  while (index < css.length) {
    let end = index, paren = 0, quote = null;
    for (; end < css.length; end += 1) {
      const char = css[end];
      if (quote) { if (char === "\\") end += 1; else if (char === quote) quote = null; continue; }
      if (char === '"' || char === "'") { quote = char; continue; }
      if (char === "(") paren += 1; else if (char === ")") paren = Math.max(0, paren - 1);
      else if (!paren && (char === "{" || char === ";" || char === "}")) break;
    }
    const prelude = css.slice(index, end).trim();
    if (end >= css.length) { if (prelude) out.push({ statement: prelude }); break; }
    if (css[end] !== "{") { if (css[end] === ";" && prelude) out.push({ statement: prelude }); index = end + 1; continue; }
    let close = end + 1, depth = 1; quote = null;
    for (; close < css.length && depth; close += 1) {
      const char = css[close];
      if (quote) { if (char === "\\") close += 1; else if (char === quote) quote = null; continue; }
      if (char === '"' || char === "'") { quote = char; continue; }
      if (char === "{") depth += 1; else if (char === "}") depth -= 1;
    }
    out.push({ prelude, body: css.slice(end + 1, depth ? close : close - 1) });
    index = close;
  }
  return out;
}
const GROUPING = new Set(["media", "supports", "container", "layer", "document", "scope", "starting-style"]);
function select(css, vocabulary, stats, keyframes) {
  let out = "";
  for (const block of blocks(css)) {
    if (block.statement != null) { if (!/^@(charset|import)\b/i.test(block.statement)) out += `${block.statement};`; continue; }
    const { prelude, body } = block;
    if (prelude[0] === "@") {
      const name = (/^@([-\w]+)/.exec(prelude) || [])[1]?.toLowerCase() || "";
      if (GROUPING.has(name)) { const inner = select(body, vocabulary, stats, keyframes); if (inner) out += `${prelude}{${inner}}`; continue; }
      if (/keyframes$/.test(name)) { keyframes.push({ name: prelude.replace(/^@[-\w]+\s+/, "").trim().replace(/^["']|["']$/g, ""), text: `${prelude}{${body}}` }); continue; }
      out += `${prelude}{${body}}`;   // @font-face, @property, @counter-style, @page ...: kept
      continue;
    }
    const keep = postCssSelectors(prelude).some(selector => selectorMayMatch(selector, vocabulary));
    if (keep) { out += `${prelude}{${body}}`; stats.kept += 1; } else stats.dropped += 1;
  }
  return out;
}

// cssTexts: the stylesheets in the order the document loads them. → { css, kept, dropped }
export function articleFirstCriticalCss(cssTexts, vocabulary) {
  const stats = { kept: 0, dropped: 0 }; const keyframes = [];
  let css = cssTexts.map(text => select(String(text).replace(/\/\*[\s\S]*?\*\//g, ""), vocabulary, stats, keyframes)).join("");
  // animations used by a kept rule stay with it
  const used = keyframes.filter(item => item.name && new RegExp(`(?:^|[\\s:,])${item.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:[\\s;,}]|$)`).test(css));
  css += used.map(item => item.text).join("");
  return { css, kept: stats.kept, dropped: stats.dropped, keyframes: used.length };
}
