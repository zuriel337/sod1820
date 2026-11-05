// Design Contract V2 §13 — a control and the text beside it must not be glued together.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const read = (file) => fs.readFileSync(file, "utf8");
const walk = (dir, out = []) => {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walk(full, out);
    else if (/\.jsx$/.test(name)) out.push(full);
  }
  return out;
};

test("the action-row primitive and its gap token exist and are at least 8px", () => {
  const css = read("src/components/experience2029/sod2029.css");
  const token = css.match(/--s29-action-gap:\s*(\d+)px/);
  assert.ok(token, "--s29-action-gap token must be defined");
  assert.ok(Number(token[1]) >= 8, "gap token must be >= 8px");
  const row = css.match(/\.sod29-action-row\{([^}]*)\}/);
  assert.ok(row, ".sod29-action-row primitive must exist");
  assert.match(row[1], /display:flex/);
  assert.match(row[1], /gap:[^;]*var\(--s29-action-gap\)/);
  assert.match(css, /button\.sod29-action,a\.sod29-action\)\+:where\(a,button\)/, "legacy safety-net rule must remain");
  assert.match(css, /\.sod29-action-row,\.sod29-actions\)>:is\(a,button\)\{margin-inline-start:0\}/, "containers that own a gap must not double it");
});

test("the Design Contract documents the rule", () => {
  const contract = read("SOD1820_DESIGN_CONTRACT_V2.md");
  assert.match(contract, /## 13\. Action adjacency/);
  assert.match(contract, /sod29-action-row/);
});

test("no .sod29-action button is directly followed by a link without the row wrapper", () => {
  const offenders = [];
  const pattern = /<button[^>]*className="[^"]*\bsod29-action\b[^"]*"[^>]*>[^<]*(?:<[^/][^>]*>[^<]*<\/[^>]+>[^<]*)*<\/button>\s*(?:<a\b|<Link\b)/g;
  for (const file of [...walk("src/components"), ...walk("src/pages")]) {
    const source = read(file);
    for (const match of source.matchAll(pattern)) {
      // allowed only when the pair is already inside an action row / actions container on the same line
      const before = source.slice(Math.max(0, match.index - 160), match.index);
      if (/sod29-action-row|sod29-actions|className="[^"]*(?:actions|controls|toolbar|row)[^"]*"/.test(before)) continue;
      offenders.push(`${file}: ${match[0].slice(0, 80)}`);
    }
  }
  assert.deepEqual(offenders, [], "wrap the control and its neighbour in <div className=\"sod29-action-row\">");
});

test("the newsletter component keeps each control and its neighbour inside an action row", () => {
  const source = read("src/components/StayUpdatedCTA.jsx");
  const start = source.indexOf("export function NewsletterSignup2029");
  const end = source.indexOf('// "הישאר מעודכן"');
  const body = source.slice(start, end);
  assert.match(body, /<div className="sod29-action-row">\{askButton\}\{privacyLink\}<\/div>/);
  assert.doesNotMatch(body, /<\/button>\s*<a\b/);
  assert.doesNotMatch(body, /\{askButton\}\s*\{?\s*<a\b/);
});

test("the footer places the WhatsApp join beside the signup control through the row", () => {
  const footer = read("src/components/experience2029/Footer2029.jsx");
  assert.match(footer, /<NewsletterSignup2029 variant="compact"/);
  assert.doesNotMatch(footer, /f29-news\b/);
});
