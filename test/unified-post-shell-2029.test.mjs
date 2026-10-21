import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (file) => readFileSync(new URL("../" + file, import.meta.url), "utf8");
const frame = read("src/components/experience2029/SystemFrame2029.jsx");
const rail = read("src/components/experience2029/SurfaceContextRail2029.jsx");
const css = read("src/components/experience2029/systemFrame2029-unified-bar.css");

const unified = css.slice(css.indexOf("Unified post shell"));
const GATE = '.sod29-root[data-shell-review="elections631"]';

test("unified shell presentation is scoped to the one Elections 5107 preview gate", () => {
  assert.match(frame, /const shellReviewActive = import\.meta\.env\.VITE_ELECTIONS_631_PREVIEW === "true"/);
  assert.match(frame, /data-shell-review=\{import\.meta\.env\.VITE_ELECTIONS_631_PREVIEW === "true"/);
  // the JS gate and the DOM attribute use the identical condition
  assert.match(frame, /location\.pathname === "\/post\/sharshar-elections-redemption-hints-draft";/);
  // every selector that targets the locator, the "here" shortcut or an orb state is gated in the same line
  const scoped = unified.split("\n").filter((line) => /\.sod29-(glass-locator|surface-context-here)|\.sod29-raziel-orb\[data/.test(line) && /[{,]\s*$|\{/.test(line));
  assert.ok(scoped.length >= 10);
  for (const line of scoped) assert.ok(line.includes(GATE), `ungated rule: ${line.slice(0, 90)}`);
  // ordinary posts and other surfaces get no ring/state from the frame
  assert.match(frame, /attention=\{shellReviewActive \? razielAttention : null\} progress=\{shellReviewActive && readingProgress/);
});

test("Raziel orb: four presentation states plus locked, real producers only", () => {
  assert.match(frame, /ORB_STATE_LABEL = Object\.freeze\(\{ thinking: .*suggest: .*important: /s);
  assert.match(frame, /const state = !locked && ORB_STATE_LABEL\[attention\] \? attention : null;/); // locked always wins
  assert.match(frame, /aria-busy=\{state === "thinking" \? true : undefined\}/);
  assert.match(frame, /const razielAttention = razielBusy \? "thinking" : null;/); // suggest/important stay dormant
  assert.doesNotMatch(frame, /functions\/raziel-attention|invoke\(["']raziel-attention/); // admin-only helper is not a public signal source
  assert.match(frame, /onBusyChange\?\.\(busy\)/);
  assert.doesNotMatch(frame, /setRazielAttention|razielAttention = .*suggest/);
  // non-color cue for suggest/important
  assert.match(frame, /ORB_STATE_MARK = Object\.freeze\(\{ suggest: "✦", important: "!" \}\)/);
});

test("orb motion: one finite pulse, spinner only for thinking, static reduced-motion alternative, no red", () => {
  assert.match(unified, /\[data-attention="suggest"\]::after \{ animation: sod29-orb-pulse 2\.4s ease-out 2 both; \}/);
  assert.match(unified, /\[data-attention="important"\]::after \{ border-width: 3px; animation: sod29-orb-pulse 1\.6s ease-out 1 both; \}/);
  assert.equal((unified.match(/infinite/g) || []).length, 1, "only the real-thinking spinner may loop");
  assert.match(unified, /\[data-attention="thinking"\]::after \{[^}]*sod29-orb-spin 1\.2s linear infinite/s);
  const reduced = unified.slice(unified.indexOf("prefers-reduced-motion: reduce"));
  assert.match(reduced, /animation: none !important/);
  assert.doesNotMatch(unified, /#f00|#ff0000|red\b|--s29-danger/);
});

test("gold ring is real reading progress only", () => {
  assert.match(frame, /progress=\{shellReviewActive && readingProgress \? readingProgress\.index \/ readingProgress\.total : null\}/);
  assert.match(frame, /const ring = Number\.isFinite\(progress\) && progress > 0/);
  assert.match(unified, /conic-gradient\(from 0deg, var\(--s29-brand-gold\) var\(--s29-orb-progress, 0%\)/);
  assert.match(unified, /\.sod29-command-island \.sod29-reading-progress \{ display: none; \}/); // one progress cue, not two
});

test("desktop glass locator reuses the existing component beside the source, not a second global rail", () => {
  assert.match(rail, /host \? createPortal\(children, host\) : children/);
  assert.match(rail, /<ShellPortal host=\{shellHost\}>/);
  assert.match(rail, /className="sod29-glass-locator"/);
  assert.equal((rail.match(/className="sod29-glass-locator"/g) || []).length, 1, "one locator component");
  assert.match(unified, /@media \(min-width: 981px\) \{[\s\S]*\.sod29-glass-locator \{\s*position: fixed;/);
  assert.match(unified, /inset-inline-start: calc\(10px \+ var\(--s29-rail-slim, 56px\) \+ 10px\)/); // beside the existing right rail
  assert.doesNotMatch(frame, /sod29-glass-locator/); // the frame adds no second locator / rail
});

test("Companion Context keeps only focus, six compact cups and a shortcut to 'here'", () => {
  assert.match(frame, /shellReview=\{shellReviewActive\} embedded/);
  assert.match(rail, /sections\.length && !\(shellReview && embedded\)/); // station list leaves the Companion
  assert.match(rail, /sod29-surface-context-here/);
  for (const hidden of ["actions", "depth-pointer", "deepen", "source", "signals", "findings", "expression", "learn", "reason", "deeplink"]) {
    assert.ok(unified.includes(`.sod29-surface-context-${hidden}`), hidden);
  }
  assert.match(frame, /contextNode=\{companionHasContext \? <SurfaceContextRail2029/);
});

test("no new island action, owner, store, share system or Raziel conversation", () => {
  assert.doesNotMatch(frame, /title="שיתוף"/); // share A is PROPOSED_ONLY (canonical_ui_components_law v8 §1 unchanged)
  assert.doesNotMatch(frame, /TRANSIENT\.SHARE|openShare/);
  assert.doesNotMatch(frame, /createContext\(\s*null\s*\)[\s\S]{0,80}Raziel(Orb|Attention)/);
  assert.match(frame, /razielLocked/);
  assert.match(frame, /disabled=\{locked\}/); // locked orb is not interactive
  assert.equal((frame.match(/<RazielNativeChat /g) || []).length, 2, "no extra chat instance was added");
});
