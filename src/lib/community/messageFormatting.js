// Versioned text in the existing body column. The reader never interprets HTML
// or arbitrary attributes/CSS, and historical plain messages stay plain.
export const MESSAGE_FORMAT_PREFIX = "[sod:v1]\n";
const OPEN = { "[b]": "bold", "[u]": "underline", "[color=gold]": "gold", "[color=blue]": "blue", "[quote]": "quote" };
const CLOSE = { "[/b]": "bold", "[/u]": "underline", "[/color]": "color", "[/quote]": "quote" };
const isColor = type => type === "gold" || type === "blue";
const escapeText = text => String(text).replace(/[\\[]/g, "\\$&");

export function parseMessageFormatting(value = "") {
  const source = String(value);
  if (!source.startsWith(MESSAGE_FORMAT_PREFIX)) return [{ type: "text", text: source }];
  const text = source.slice(MESSAGE_FORMAT_PREFIX.length), root = { children: [] }, stack = [root];
  const append = text => {
    if (!text) return;
    const children = stack.at(-1).children, previous = children.at(-1);
    if (previous?.type === "text") previous.text += text;
    else children.push({ type: "text", text });
  };
  let cursor = 0;
  for (const match of text.matchAll(/\\[\\[]|\[(?:b|u|color=(?:gold|blue)|quote|\/b|\/u|\/color|\/quote)\]/gi)) {
    append(text.slice(cursor, match.index));
    const token = match[0].toLowerCase(), type = OPEN[token];
    if (token.startsWith("\\")) append(match[0].slice(1));
    else if (type && stack.length < 9) {
      const node = { type, children: [], open: match[0] };
      stack.at(-1).children.push(node); stack.push(node);
    } else if (!type && stack.length > 1 && (CLOSE[token] === stack.at(-1).type || CLOSE[token] === "color" && isColor(stack.at(-1).type))) {
      const node = stack.pop(); delete node.open;
    } else append(match[0]);
    cursor = match.index + match[0].length;
  }
  append(text.slice(cursor));
  while (stack.length > 1) {
    const node = stack.pop(), children = stack.at(-1).children;
    children.splice(children.indexOf(node), 1, { type: "text", text: node.open }, ...node.children);
  }
  return root.children;
}

export function messageFormattingText(nodes) {
  return nodes.map(node => node.type === "text" ? node.text : messageFormattingText(node.children)).join("");
}
export const plainMessageText = value => messageFormattingText(parseMessageFormatting(value));

// Existing notification producers take a short excerpt, sometimes cutting an
// opening/closing mark. Presentation strips only this version's own tokens.
export function messageNotificationPreview(value) {
  if (typeof value !== "string") return value;
  const at = value.indexOf(MESSAGE_FORMAT_PREFIX);
  if (at < 0) return value;
  const excerpt = value.slice(at + MESSAGE_FORMAT_PREFIX.length)
    .replace(/\\[\\[]|\[(?:b|u|color=(?:gold|blue)|quote|\/b|\/u|\/color|\/quote)\]/gi, token => token.startsWith("\\") ? token.slice(1) : "")
    .replace(/(?<!\\)\[(?:\/?(?:b|u|quote|color)(?:=[a-z]*)?)?$/i, "");
  return value.slice(0, at) + excerpt;
}

export function encodeMessageFormatting(nodes) {
  const plain = messageFormattingText(nodes);
  if (nodes.every(node => node.type === "text") && !plain.startsWith(MESSAGE_FORMAT_PREFIX) && !plain.includes("&")) return plain;
  const encode = nodes => nodes.map(node => {
    if (node.type === "text") return escapeText(node.text);
    const content = encode(node.children);
    if (isColor(node.type)) return `[color=${node.type}]${content}[/color]`;
    const tag = { bold: "b", underline: "u", quote: "quote" }[node.type];
    return tag ? `[${tag}]${content}[/${tag}]` : content;
  }).join("");
  return MESSAGE_FORMAT_PREFIX + encode(nodes);
}

export function appendMessageQuote(value, quote) {
  return encodeMessageFormatting([...parseMessageFormatting(value), ...(value ? [{ type: "text", text: "\n" }] : []), { type: "quote", children: [{ type: "text", text: quote }] }, { type: "text", text: "\n" }]);
}

export function appendMessageText(value, suffix) {
  if (!suffix) return value;
  return encodeMessageFormatting([...parseMessageFormatting(value), { type: "text", text: `${value ? "\n\n" : ""}${suffix}` }]);
}

export function selectedMessageQuote(selection, body) {
  if (!body || !selection || selection.rangeCount !== 1 || selection.isCollapsed) return "";
  const range = selection.getRangeAt(0);
  if (!body.contains(range.startContainer) || !body.contains(range.endContainer)) return "";
  const text = selection.toString().trim();
  return text && Array.from(text).length <= 600 ? text : "";
}
