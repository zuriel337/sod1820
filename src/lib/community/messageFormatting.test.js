import test from "node:test";
import assert from "node:assert/strict";
import { MESSAGE_FORMAT_PREFIX as P, appendMessageQuote, appendMessageText, encodeMessageFormatting, parseMessageFormatting, plainMessageText, selectedMessageQuote, messageNotificationPreview } from "./messageFormatting.js";
import { messageLinkPreviews, splitMessageLinks } from "./messageLinks.js";
import { decodeCommunityText } from "./communityArchive.js";

test("old chat text remains literal, including old markup and HTML-shaped text", () => {
  const source = '[b]טקסט ישן[/b] <img src=x onerror=alert(1)> &amp;';
  assert.deepEqual(parseMessageFormatting(source), [{ type: "text", text: source }]);
});

test("formatting round trips Hebrew, emoji, literal syntax, entities, nested marks and quotations", () => {
  const text = '[b]ממש טקסט[/b] \\ נתיב &copy; 😀';
  const nodes = [{ type: "bold", children: [{ type: "underline", children: [{ type: "gold", children: [{ type: "text", text }] }] }] }, { type: "blue", children: [{ type: "text", text: "כחול" }] }];
  const encoded = encodeMessageFormatting(nodes);
  assert.ok(encoded.startsWith(P));
  assert.equal(plainMessageText(encoded), text + "כחול");
  assert.equal(decodeCommunityText(encoded), encoded);
  assert.equal(plainMessageText(encodeMessageFormatting(parseMessageFormatting(encoded))), text + "כחול");
  assert.equal(plainMessageText(encodeMessageFormatting([{ type: "text", text: P + "[b]literal[/b]" }])), P + "[b]literal[/b]");
});

test("unknown attributes, colors, scripts and broken tags remain text; nesting is bounded", () => {
  const attack = '[color=red]red[/color]<script>alert(1)</script>[b onclick=x]text[/b][u]unfinished';
  assert.equal(plainMessageText(P + attack), attack);
  const tree = parseMessageFormatting(P + '[b]'.repeat(1000) + 'טקסט' + '[/b]'.repeat(1000));
  const check = (nodes, depth = 0) => { assert.ok(depth <= 8); for (const node of nodes) { assert.ok(['text','bold','underline','gold','blue','quote'].includes(node.type)); if (node.children) check(node.children, depth + 1); } };
  check(tree);
});

test("quoted user text and attachment names cannot introduce formatting or destroy a URL", () => {
  const selected = '[color=blue]משפט &copy;[/color]';
  const draft = appendMessageQuote("התשובה שלי", selected);
  const quote = parseMessageFormatting(draft).find(node => node.type === 'quote');
  assert.ok(quote.children.every(node => node.type === "text"));
  assert.equal(quote.children.map(node => node.text).join(""), selected);
  const url = 'https://www.youtube.com/watch?v=Jp0pxGofPjQ&t=3';
  const combined = appendMessageText(draft, `📎 [b]literal.pdf\n${url}`);
  assert.ok(plainMessageText(combined).includes(`📎 [b]literal.pdf\n${url}`));
  assert.equal(messageLinkPreviews(splitMessageLinks(plainMessageText(combined)))[0].id, 'Jp0pxGofPjQ');
});

test("quotation accepts only the selected message, rejecting page chrome, multiple ranges and oversized selections", () => {
  const body = { contains: node => node === 'inside' };
  const selection = { rangeCount: 1, isCollapsed: false, getRangeAt: () => ({ startContainer: 'inside', endContainer: 'inside' }), toString: () => '  משפט נבחר  ' };
  assert.equal(selectedMessageQuote(selection, body), 'משפט נבחר');
  assert.equal(selectedMessageQuote({ ...selection, getRangeAt: () => ({ startContainer: 'inside', endContainer: 'outside' }) }, body), '');
  assert.equal(selectedMessageQuote({ ...selection, rangeCount: 2 }, body), '');
  assert.equal(selectedMessageQuote({ ...selection, toString: () => 'א'.repeat(601) }, body), '');
  assert.equal(selectedMessageQuote({ ...selection, isCollapsed: true }, body), '');
});

test("short notification excerpts retain sender and text without leaking incomplete format tokens", () => {
  assert.equal(messageNotificationPreview(`כותב הגיב: ${P}[b][color=gold]שלום`), 'כותב הגיב: שלום');
  assert.equal(messageNotificationPreview(`כותב הגיב: ${P}[u]שלום[/u][color=bl`), 'כותב הגיב: שלום');
  assert.equal(messageNotificationPreview('הודעה ישנה [b]'), 'הודעה ישנה [b]');
});
