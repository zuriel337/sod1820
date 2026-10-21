import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// SHELL_MOBILE_ISLAND_V1_5107_20261021 · explicit tests for the phone island V1 in the Elections 5107 preview shell
// AND for the unchanged behavior of every other surface. These tests only ADD assertions; no existing test is edited.
const read = (file) => readFileSync(new URL("../" + file, import.meta.url), "utf8");
const frame = read("src/components/experience2029/SystemFrame2029.jsx");
const rail = read("src/components/experience2029/SurfaceContextRail2029.jsx");
const css = read("src/components/experience2029/systemFrame2029-unified-bar.css");

const GATE = '.sod29-root[data-shell-review="elections631"]';
const MARK = "Mobile island V1 · Elections 5107 preview gate ONLY";
// the block starts at the comment banner that carries MARK (so comments can be stripped cleanly)
const blockStart = css.lastIndexOf("/* ====", css.indexOf(MARK));
assert.ok(blockStart > 0);
const block = css.slice(blockStart);
const before = css.slice(0, blockStart);
const blockCode = block.replace(/\/\*[\s\S]*?\*\//g, "");
const between = (text, start, end) => {
  const a = text.indexOf(start);
  assert.ok(a >= 0, `missing start: ${start.slice(0, 60)}`);
  const b = text.indexOf(end, a + start.length);
  assert.ok(b > a, `missing end: ${end.slice(0, 60)}`);
  return text.slice(a, b);
};
const islandJsx = between(frame, "className={`sod29-command-island is-unified-bar", "{renderTransient()}");

// ---------------------------------------------------------------------------------------------------------------------
// PILOT: new behavior
// ---------------------------------------------------------------------------------------------------------------------

test("pilot CSS: every new rule is scoped to the 5107 preview gate (nothing leaks to other surfaces)", () => {
  assert.ok(block.length > 2000);
  const stripped = blockCode;
  const preludes = [...stripped.matchAll(/([^{}]+)\{/g)].map((match) => match[1].trim()).filter(Boolean);
  const selectors = preludes.filter((prelude) => !/^@(media|keyframes)\b/.test(prelude) && !/^(from|to|\d+%)$/.test(prelude));
  assert.ok(selectors.length >= 25, `expected the full set of pilot rules, got ${selectors.length}`);
  for (const group of selectors) {
    for (const selector of group.split(",").map((part) => part.trim()).filter(Boolean)) {
      assert.ok(selector.startsWith(GATE), `ungated selector in the pilot block: ${selector.slice(0, 100)}`);
    }
  }
});

test("pilot CSS: phone-only rules live under max-width 620px; here/badge are hidden elsewhere", () => {
  assert.match(block, new RegExp(`${GATE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\.sod29-island-here \\{ display: none; \\}`));
  assert.match(block, new RegExp(`${GATE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\.sod29-now-badge \\{ display: none; \\}`));
  const phone = between(block, "@media (max-width: 620px) {", "\n}\n");
  for (const needle of ["sod29-header-search", "sod29-island-action", "sod29-island-here", "sod29-glass-locator", "sod29-feed-chip", "sod29-command-trail", "sod29-now-badge"]) {
    assert.ok(phone.includes(needle), `phone rule missing for ${needle}`);
  }
  // the desktop and tablet projections are not touched by the pilot block
  assert.equal(/min-width:\s*981px/.test(block), false);
  assert.equal(/max-width:\s*980px/.test(block), false);
});

test("one search: the header search is hidden on phones in the pilot only; the island search stays", () => {
  assert.match(block, /@media \(max-width: 620px\) \{[\s\S]*?\.sod29-root\[data-shell-review="elections631"\] \.sod29-header-search \{ display: none; \}/);
  assert.ok(islandJsx.includes(`title={surface === "heichal" ? "פקודה" : "חיפוש"} onClick={openCommand}`));
});

test("phone island is one row 2|orb|2 in the pilot: no trail row, no progress track, no locator strip, no feed chip", () => {
  const phone = between(block, "@media (max-width: 620px) {", "\n}\n");
  assert.match(phone, /--s29-bar-height: 66px; --s29-island-clearance: 96px;/);
  assert.match(phone, /has-context-trail \{ grid-template-rows: auto; row-gap: 0; \}/);
  assert.match(phone, /\.sod29-command-trail,[\s\S]*?\.sod29-reading-progress \{ display: none; \}/);
  assert.match(phone, /\.sod29-command-actions \{ grid-column: 1; grid-row: 1; \}/);
  assert.match(phone, /> \.sod29-raziel-orb \{ grid-column: 2; grid-row: 1; margin-block: -16px 0; \}/);
  assert.match(phone, /> \.sod29-bar-zone\.is-actions \{ grid-column: 3; grid-row: 1; \}/);
  for (const hidden of ["sod29-glass-locator", "sod29-surface-context-mobile-cue", "sod29-feed-chip"]) assert.ok(phone.includes(`${GATE} .${hidden}`), `${hidden} should be hidden in the pilot on phones`);
});

test("Action is hidden from the phone island in the pilot and stays reachable inside the merged sheet", () => {
  assert.match(block, /\.sod29-command-actions > button\.sod29-island-action \{ display: none; \}/);
  // the Action button itself is still rendered by the frame (CSS decides); it only gained a hook class
  assert.ok(islandJsx.includes('<button type="button" className="sod29-island-action" title="פעולה" onClick={() => openAction(activeTarget)}'));
  assert.ok(islandJsx.includes("aria-pressed={transientKind === TRANSIENT.ACTION}"));
});

test("merged Tools + Actions sheet: pilot only, same projections and handlers, accessible tabs", () => {
  const merged = between(frame, "if (shellReviewActive && (transientKind === TRANSIENT.ACTION || transientKind === TRANSIENT.TOOLS)) {", "if (transientKind === TRANSIENT.ACTION) return");
  // both original projections with their original props: nothing dropped, nothing new
  assert.ok(merged.includes("<ActionProjection surface={surface} target={inspectTarget} context={context} onInspect={openInspect} onCapability={openCapability} onRaziel={openRaziel} razielLocked={razielLocked} go={go} />"));
  assert.ok(merged.includes("<ToolsProjection surface={surface} target={activeTarget} go={go} onCapability={openCapability} />"));
  // tabs semantics
  assert.match(merged, /role="tablist"/);
  assert.match(merged, /role="tab"[^>]*aria-selected=\{onActions\}[^>]*aria-controls="sod29-merged-panel"[^>]*tabIndex=\{onActions \? 0 : -1\}/);
  assert.match(merged, /role="tab"[^>]*aria-selected=\{!onActions\}[^>]*aria-controls="sod29-merged-panel"[^>]*tabIndex=\{onActions \? -1 : 0\}/);
  assert.match(merged, /role="tabpanel" id="sod29-merged-panel" aria-labelledby=/);
  assert.match(merged, /\["ArrowLeft", "ArrowRight", "Home", "End"\]/);
  // switching tabs must not re-record the focus-return target (openTransient would record the tab button)
  assert.match(merged, /setTransient\(toActions \? \{ kind: TRANSIENT\.ACTION, payload: \{ subject: normalizeTarget\(activeTarget\) \} \} : \{ kind: TRANSIENT\.TOOLS, payload: null \}\)/);
  assert.equal(merged.includes("openTransient("), false);
  // the island Tools button stays pressed while the sheet shows Actions (pilot only)
  assert.ok(islandJsx.includes("aria-pressed={transientKind === TRANSIENT.TOOLS || (shellReviewActive && transientKind === TRANSIENT.ACTION)}"));
  // every capability the Action tab reached before is still wired: this sheet reuses the same props, plus Inspect/Raziel handlers
  for (const handler of ["onInspect={openInspect}", "onCapability={openCapability}", "onRaziel={openRaziel}"]) assert.ok(merged.includes(handler));
  // tab styling is pilot-gated and keeps a 44px target and a visible focus ring
  assert.match(block, /\.sod29-merged-tabs \[role="tab"\] \{[^}]*min-block-size: 44px/);
  assert.match(block, /\.sod29-merged-tabs \[role="tab"\]:focus-visible \{ outline: 2px solid var\(--s29-accent\)/);
});

test("'here' button: opens the existing Context sheet, count from the one readingProgress, phone-only", () => {
  const here = between(islandJsx, "{shellReviewActive ? <button type=\"button\" className=\"sod29-island-here\"", "{nowTabs}");
  assert.ok(here.includes("onClick={() => openTransient(TRANSIENT.CONTEXT)}"));
  assert.ok(here.includes('aria-haspopup="dialog"'));
  assert.ok(here.includes("aria-pressed={transientKind === TRANSIENT.CONTEXT}"));
  assert.ok(here.includes("`כאן: חלק ${readingProgress.index} מתוך ${readingProgress.total}, ${readingProgress.label}. פתח את המיקום המלא`"));
  assert.ok(here.includes("readingProgress.index}/{readingProgress.total"));
  assert.ok(here.includes("(readingProgress.index / readingProgress.total) * 100"));
  // without real sections there is no counter and no progress bar, only the mark
  assert.ok(here.includes('<span aria-hidden="true">⌖</span>'));
  assert.match(block, /\.sod29-island-here:not\(\[style\*="--s29-here-progress"\]\)::after \{ display: none; \}/);
});

test("one readingProgress feeds the ring, the 'here' count and the peek (no second section counter)", () => {
  assert.equal((frame.match(/const readingProgress = /g) || []).length, 1);
  assert.ok(frame.includes("progress={shellReviewActive && readingProgress ? readingProgress.index / readingProgress.total"));
  assert.ok(frame.includes("const hereId = readingProgress ? readingProgress.ids[readingProgress.index - 1] : null;"));
  assert.ok(frame.includes("setPositionPeek({ id: hereId, index: readingProgress.index, total: readingProgress.total, label: readingProgress.label });"));
  // no invented sections: the progress sections are the real surfaceSections with id and label only
  assert.ok(frame.includes("filter((item) => item?.id && item?.label)"));
  assert.match(frame, /progressSections\.length >= 2 && progressIndex >= 0/);
});

test("position peek: ~2s, only on a real section change, never first position, inside the island, hidden when a sheet is open", () => {
  const effect = between(frame, "const hereId = readingProgress", "// ELS owns its on-demand matrix inspector");
  assert.match(effect, /if \(!shellReviewActive \|\| !hereId\) \{ lastHereIdRef\.current = null; setPositionPeek\(null\); return undefined; \}/);
  assert.match(effect, /if \(previous === null \|\| previous === hereId\) return undefined;/);
  assert.match(effect, /setTimeout\(\(\) => setPositionPeek\(null\), 2000\)/);
  assert.match(effect, /return \(\) => clearTimeout\(timer\)/);
  assert.ok(islandJsx.includes('{shellReviewActive && positionPeek && !transientKind ? <div className="sod29-island-peek" aria-hidden="true"'));
  // the peek is a child of the island element itself, before its first zone: not a separate fixed bar
  assert.ok(islandJsx.indexOf("sod29-island-peek") < islandJsx.indexOf('<div className="sod29-bar-zone is-context">'));
  assert.equal((frame.match(/sod29-island-peek/g) || []).length, 1);
  // presentation: centered above the orb, finite fade, none under reduced motion, 14px text
  assert.match(block, /\.sod29-island-peek \{[^}]*left: 50%[^}]*font: 800 14px/s);
  assert.match(block, /@media \(prefers-reduced-motion: reduce\) \{\s*\.sod29-root\[data-shell-review="elections631"\] \.sod29-island-peek \{ animation: none; \}/);
  assert.equal((block.match(/infinite/g) || []).length, 0);
});

test("Raziel orb: tapping the whole circle always opens Raziel in the pilot; the ring is progress only", () => {
  // the pilot gate is Post-only, and on a Post the orb handler is openRaziel (focusCompanionRaziel is for non-Post Companion surfaces)
  assert.match(frame, /const shellReviewActive = import\.meta\.env\.VITE_ELECTIONS_631_PREVIEW === "true"\s*&& surface === "post"/);
  assert.ok(frame.includes('onClick={companionActive && surface !== "post" ? focusCompanionRaziel : openRaziel}'));
  assert.ok(frame.includes("attention={shellReviewActive ? razielAttention : null}"));
  const ring = css.slice(css.indexOf('.sod29-raziel-orb[data-orb-ring]::before'));
  assert.match(ring.slice(0, 400), /pointer-events: none/); // the ring never intercepts the tap
});

test("Now keeps one launcher with the unread count in the pilot (replaces the feed chip), accent not danger", () => {
  assert.ok(frame.includes("newCount={shellReviewActive ? feed.newCount : 0}"));
  assert.ok(frame.includes("function NowTabs2029({ activeKind, onWorld, onMe, onRaziel, razielLocked = false, newCount = 0 })"));
  assert.ok(frame.includes("const unread = tab.id === \"world\" && newCount > 0 ? newCount : 0;"));
  assert.ok(frame.includes("`עכשיו · ${tab.label} · ${unread} חדשים`"));
  assert.match(block, /\.sod29-now-badge \{[^}]*background: var\(--s29-accent\); color: var\(--s29-on-accent/);
  assert.doesNotMatch(block, /#f00|#ff0000|red\b|--s29-danger/);
});

test("label: 'התכנסויות' replaces 'מפגש' in the shell text only; identifiers and anchors are unchanged", () => {
  assert.ok(rail.includes("ממדי כיסוי · פרטים ב״התכנסויות״ אחרי הפוסט"));
  assert.equal(rail.includes("ב״מפגש״"), false);
  assert.equal(frame.includes("מפגש"), false);
  assert.ok(rail.includes('hash: "#post-discovery-meeting"'));
});

test("no persistent share button yet: v9 is not approved, share stays in the existing Action/Inspect projections", () => {
  assert.equal(/ShareActions|שתף|share/i.test(islandJsx), false, "the island must not contain a share control before canonical_ui_components_law v9 is approved");
  assert.equal(/share/i.test(blockCode), false, "the pilot CSS must not style a share control");
  assert.ok(frame.includes("ShareActions"));
  assert.equal(frame.includes("shareOrCopy"), false);
});

test("pilot touch and text floors: 44px targets and 14px text in the new chrome", () => {
  assert.match(block, /\.sod29-island-here \{[^}]*min-inline-size: 44px; min-block-size: 44px/s);
  assert.match(block, /\.sod29-island-here b \{ font: 900 14px/);
  assert.match(block, /\.sod29-now-badge \{[^}]*font: 900 14px/s);
  assert.match(block, /\.sod29-island-peek \{[^}]*min-block-size: 36px/s);
  assert.doesNotMatch(block, /font(-size)?:[^;}]*\b(9|10|11|12|13)px/);
});

// ---------------------------------------------------------------------------------------------------------------------
// OTHER SURFACES: unchanged behavior (explicit assertions, not an indirect reading of the old tests)
// ---------------------------------------------------------------------------------------------------------------------

test("other surfaces: Search, Action and Tools island buttons are still rendered unconditionally", () => {
  assert.ok(islandJsx.includes('<button type="button" title={surface === "heichal" ? "פקודה" : "חיפוש"} onClick={openCommand} aria-pressed={transientKind === TRANSIENT.COMMAND}>'));
  assert.ok(islandJsx.includes("<small>{surface === \"heichal\" ? \"פקודה\" : \"חיפוש\"}</small>"));
  assert.match(islandJsx, /\{!\(showBottomTrail && numberPageRoute\) \? <button type="button" className="sod29-island-action" title="פעולה" onClick=\{\(\) => openAction\(activeTarget\)\}/);
  assert.ok(islandJsx.includes("<small>פעולה</small>"));
  assert.ok(islandJsx.includes('<button type="button" title="כלים" onClick={openTools}'));
  assert.ok(islandJsx.includes("<small>כלים</small>"));
  // the Number page keeps its dedicated Action button
  assert.ok(islandJsx.includes('className="sod29-number-island-action"'));
  // the global-navigation guard from the System Frame contract stays: no Number / Inspect slots in the island
  assert.equal(islandJsx.includes("<small>מספר</small>"), false);
  assert.equal(islandJsx.includes("<small>בדיקה</small>"), false);
});

test("other surfaces: the original Action and Tools sheets are untouched and reached whenever the pilot gate is off", () => {
  assert.ok(frame.includes('if (transientKind === TRANSIENT.ACTION) return <PanelShell {...common} icon="◎" kicker="פעולות" title={`פעולה · ${inspectTarget?.label || context?.subject?.label || "ההקשר הנוכחי"}`}><ActionProjection surface={surface} target={inspectTarget} context={context} onInspect={openInspect} onCapability={openCapability} onRaziel={openRaziel} razielLocked={razielLocked} go={go} /></PanelShell>;'));
  assert.ok(frame.includes('if (transientKind === TRANSIENT.TOOLS) return <PanelShell {...common} icon="◇" kicker="כלים" title="כלים"><ToolsProjection surface={surface} target={activeTarget} go={go} onCapability={openCapability} /></PanelShell>;'));
  // the merged branch is strictly before them and strictly gated
  assert.ok(frame.indexOf("shellReviewActive && (transientKind === TRANSIENT.ACTION") < frame.indexOf('if (transientKind === TRANSIENT.ACTION) return <PanelShell'));
  assert.equal((frame.match(/id="sod29-merged-/g) || []).length, 3); // the two tab ids and the panel id, nowhere else
});

test("other surfaces: header search, trail, reading progress, feed chip and Now tabs are unchanged", () => {
  assert.ok(frame.includes('<button className="sod29-header-search" type="button" onClick={openCommand} aria-label="חיפוש">'));
  assert.ok(islandJsx.includes('{showBottomTrail ? <nav className="sod29-command-trail" aria-label="מסלול המחקר הנוכחי">'));
  assert.ok(islandJsx.includes('{readingProgress ? <button type="button" className="sod29-reading-progress" onClick={() => openTransient(TRANSIENT.CONTEXT)}'));
  assert.ok(frame.includes('{!companionWide && feed.newCount > 0 && !transientKind ? <button type="button" className="sod29-feed-chip" onClick={openAttention}'));
  for (const label of ['"בעולם"', '"בשבילי"', '"רזיאל מציע"']) assert.ok(frame.includes(label));
  // outside the pilot NowTabs is called without a count and shows no badge
  assert.ok(frame.includes("newCount={shellReviewActive ? feed.newCount : 0}"));
});

test("other surfaces: the orb keeps its Companion focus behavior and the baseline island CSS is byte-for-byte present", () => {
  assert.ok(frame.includes("focusCompanionRaziel"));
  assert.ok(islandJsx.includes('surface !== "post" ? focusCompanionRaziel : openRaziel'));
  // baseline rules the pilot block overrides must still exist before it (it overrides by specificity, it does not edit them)
  for (const rule of [
    ".sod29-root.native-frame:has(.sod29-command-island.has-context-trail) { --s29-bar-height: 104px; --s29-island-clearance: 132px; }",
    ".sod29-root.native-frame .sod29-command-island.is-unified-bar.has-context-trail { grid-template-rows: auto auto; row-gap: 4px; }",
    ".sod29-root.native-frame .sod29-command-island.has-context-trail > .sod29-raziel-orb { grid-column: 2; grid-row: 2; margin-block: 0; }",
    "@media (max-width: 340px) {",
    ".sod29-root.native-frame .sod29-command-island.is-unified-bar .sod29-raziel-orb.compact { min-width: 48px; width: 48px; height: 48px; }",
    ".sod29-root.native-frame .sod29-now-tab { min-width: 36px; width: 36px; }",
  ]) assert.ok(before.includes(rule), `baseline CSS changed: ${rule.slice(0, 80)}`);
  // and the global ones (no gate prefix) were not extended: the only new global-looking selectors are inside the pilot block
  const afterBlockGlobals = [...blockCode.matchAll(/([^{}]+)\{/g)].map((m) => m[1].trim()).filter((s) => s && !s.startsWith("@") && !/^(from|to)$/.test(s) && !s.startsWith(GATE));
  assert.deepEqual(afterBlockGlobals, []);
});
