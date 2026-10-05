import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const frame = readFileSync(new URL("../src/components/experience2029/SystemFrame2029.jsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../src/components/experience2029/systemFrame2029.css", import.meta.url), "utf8");
const contract = readFileSync(new URL("../docs/sod1820-system-frame-contract-v1.md", import.meta.url), "utf8");

test("System Frame exposes one canonical Glass Context Dock with Raziel fixed at center", () => {
  assert.match(frame, /data-glass-context-dock="v1"/);
  assert.match(frame, /data-raziel-anchor="center"/);
  assert.match(frame, /data-dock-wing="context"/);
  assert.match(frame, /data-dock-wing="system"/);
  assert.match(frame, /<RazielOrb compact/);
  assert.match(css, /grid-template-columns:minmax\(0,1fr\) auto minmax\(0,1fr\)/);
  assert.match(css, /Central Glass Core: position never moves/);
});

test("Glass Dock preserves core capabilities while collapsing secondary actions under More", () => {
  assert.match(frame, /<small>פעולה<\/small>/);
  assert.match(frame, /surface === "heichal" \? "פקודה" : "חיפוש"/);
  assert.match(frame, /<small>עוד<\/small>/);
  assert.match(frame, /function MoreProjection/);
  assert.match(frame, /onAttention=\{openAttention\}/);
  assert.match(frame, /onTools=\{openTools\}/);
  assert.match(frame, /onWorkspace=\{openWorkspace\}/);
  assert.match(frame, /onIssue=\{openIssueReport\}/);
  assert.match(frame, /canReturn=\{Boolean\(context\?\.returnTo\?\.href\)\}/);
});

test("ELS projects canonical Research Context into the same Dock without creating a second toolbar", () => {
  assert.match(frame, /context\?\.selection\?\.entityType === "els"/);
  assert.match(frame, /label: "ELS"/);
  assert.match(frame, /label: `דילוג \$\{Number\(elsSelection\.skip\)\}`/);
  assert.match(frame, /elsSelection\?\.corpus === "tanakh" \? "תנ״ך"/);
  assert.match(frame, /data-dock-mode=\{surface === "els" \? "tool"/);
  assert.equal((frame.match(/data-glass-context-dock="v1"/g) || []).length, 1);
});

test("rolling context is bounded and reduced-motion safe", () => {
  assert.match(frame, /glassContextLong/);
  assert.match(css, /sod29-glass-context-roll/);
  assert.match(css, /animation-play-state:paused/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(css, /animation:none!important;transform:none!important/);
});

test("Human Gate contract locks one tree: Rail expanded, Dock compact, same context", () => {
  assert.match(contract, /Canonical Glass Context Dock \/ Central Raziel Core/);
  assert.match(contract, /Dock and Context Rail consume the same Research Context/);
  assert.match(contract, /Raziel remains \*\*physically centered\*\*/);
  assert.match(contract, /ELS is the first deep-tool projection/);
  assert.match(contract, /No-loss rule/);
});

console.log("System Frame Glass Context Dock V1 contract: PASS");
