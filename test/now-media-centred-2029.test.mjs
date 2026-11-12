// ZURIEL 11.11.2026: inside «עכשיו» a picture, a video and a video card stand in the centre of the opened row.
// Before: a portrait WhatsApp picture (narrower than the row) and the 560px YouTube card clung to the row's start (right, in RTL).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../src/components/experience2029/nowPublications2029.css", import.meta.url), "utf8");
const card = readFileSync(new URL("../src/components/experience2029/externalVideoFacade2029.css", import.meta.url), "utf8");
const rule = selector => {
  const at = css.indexOf(`${selector}{`);
  assert.ok(at >= 0, `rule ${selector} exists`);
  return css.slice(at + selector.length + 1, css.indexOf("}", at));
};

test("a picture and a video in an opened Now row are centred (justify-self in the detail grid)", () => {
  assert.match(rule(".sod29-nowpub-detail>:is(.sod29-nowpub-image,.sod29-nowpub-video)"), /justify-self:center/);
  // The media keeps its own size limits: it is centred, never stretched or cropped.
  assert.match(rule(".sod29-nowpub-image,.sod29-nowpub-video"), /max-width:100%;max-height:44vh;.*object-fit:contain/);
});

test("the YouTube card in an opened Now row is centred and keeps its 560px cap", () => {
  assert.match(rule(".sod29-nowpub-detail>.sod29-external-video"), /width:100%;margin-inline:auto/);
  assert.match(card, /\.sod29-external-video\{margin:10px 0;display:grid;gap:6px;max-width:560px\}/);
});

test("only the media is centred: the detail stays one grid column and the text keeps its reading direction", () => {
  assert.match(rule(".sod29-nowpub-detail"), /^display:grid;gap:10px;padding:2px 10px 12px;min-width:0$/);
  assert.doesNotMatch(css, /\.sod29-nowpub-(?:detail|body)\{[^}]*text-align:center/);
  assert.doesNotMatch(css, /\.sod29-nowpub-detail\{[^}]*justify-items:center/);
});
