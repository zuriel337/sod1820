// W1 Slice 1 — Adaptive Shell context spine.
// Behavioral test of the pure derivation: the Dock's previous private projection
// must be preserved exactly, and exact-return must resolve identically for every
// shell surface that reads the spine.
import assert from "node:assert/strict";
import {
  describeRoute, lensLabel, lensForSubject,
  deriveShellContext, resolveReturnPatch, resolveRootPatch,
} from "../src/lib/shell/shellContext.js";

// --- route projection: the cases BottomBar.contextFromLocation handled before ---
assert.deepEqual(describeRoute("/number/1820"), { kind: "מספר", label: "1820" });
assert.deepEqual(describeRoute("/topic/1820"), { kind: "נושא", label: "1820" });
assert.deepEqual(describeRoute("/journey"), { kind: "מסע", label: "המסע הנוכחי" });
assert.deepEqual(describeRoute("/lab/els"), { kind: "ELS", label: "מרחב הצופן" });
assert.deepEqual(describeRoute("/research", "?tool=els"), { kind: "ELS", label: "מרחב הצופן" });
assert.deepEqual(describeRoute("/book/x", "?book=zohar"), { kind: "ספר", label: "zohar" });
assert.deepEqual(describeRoute("/heichal"), { kind: "היכל", label: "היכל" });
assert.deepEqual(describeRoute("/some-post-slug"), { kind: "פוסט", label: "some-post-slug" });
// reserved single-segment routes are system space, not posts
assert.deepEqual(describeRoute("/admin"), { kind: "SOD1820", label: "מרחב המחקר" });
assert.deepEqual(describeRoute("/research"), { kind: "SOD1820", label: "מרחב המחקר" });
assert.deepEqual(describeRoute("/"), { kind: "SOD1820", label: "מרחב המחקר" });
// percent-encoded Hebrew route stays readable in the orientation label
assert.equal(describeRoute("/number/" + encodeURIComponent("אמת")).label, "אמת");

// --- lens vocabulary ---
assert.equal(lensLabel("els"), "ELS");
assert.equal(lensLabel(null), "הקשר");
assert.equal(lensForSubject({ type: "phrase" }), "number");
assert.equal(lensForSubject({ type: "convergence" }), "topic");
assert.equal(lensForSubject(null), null);

// --- orientation with no research context: route still answers "where am I" ---
const bare = deriveShellContext({ pathname: "/number/1820", search: "" });
assert.equal(bare.kind, "מספר");
assert.equal(bare.label, "1820");
assert.equal(bare.hasContext, false, "no fabricated signal without real context");
assert.equal(bare.rootDiffers, false);
assert.equal(bare.lensLabel, null);

// --- orientation with a research context whose root is elsewhere ---
const ctx = {
  subject: { id: "1820", type: "number", label: "1820", href: "/number/1820" },
  selection: { entityId: "אמת", entityType: "phrase" },
  lens: "number",
  returnTo: { href: "/topic/1820", label: "חזרה לנושא", subject: { id: "1820", type: "topic" } },
};
const deep = deriveShellContext({ pathname: "/some-post-slug", search: "", context: ctx });
assert.equal(deep.rootDiffers, true, "root on a different href must be offered");
assert.equal(deep.rootLabel, "1820");
assert.equal(deep.lensLabel, "מספר");
assert.equal(deep.currentRef, "אמת");
assert.equal(deep.currentType, "phrase");
assert.equal(deep.hasContext, true);
assert.equal(deep.href, "/some-post-slug");

// standing ON the root must not offer a redundant "go to root" chip
const atRoot = deriveShellContext({ pathname: "/number/1820", search: "", context: ctx });
assert.equal(atRoot.rootDiffers, false, "no root chip while already at the root");

// locator-only selection (ELS) still yields a current ref
const els = deriveShellContext({
  pathname: "/research", search: "?tool=els",
  context: { selection: { entityType: "els", locator: "els:torah:אמת:regular:0:7" }, lens: "els" },
});
assert.equal(els.currentType, "els");
assert.equal(els.currentRef, "els:torah:אמת:regular:0:7");
assert.equal(els.hasContext, true);

// --- exact return (system frame v2 §5) ---
const back = resolveReturnPatch(ctx.returnTo, "number");
assert.equal(back.href, "/topic/1820");
assert.deepEqual(back.patch.selection, { entityId: "1820", entityType: "topic" });
assert.equal(back.patch.lens, "topic", "lens follows the return target's own type");
assert.equal(back.patch.returnTo, null, "return is consumed, not left dangling");

// a return target without a subject keeps the active lens rather than guessing
const bareBack = resolveReturnPatch({ href: "/post" }, "els");
assert.equal(bareBack.patch.lens, "els");
assert.equal(bareBack.patch.selection, null);

// no valid target => null, so callers render an honest terminal state
assert.equal(resolveReturnPatch(null), null);
assert.equal(resolveReturnPatch({ label: "no href" }), null);
assert.equal(resolveRootPatch({ id: "1", type: "number" }), null, "root without href is not navigable");

const rootJump = resolveRootPatch(ctx.subject);
assert.equal(rootJump.href, "/number/1820");
assert.deepEqual(rootJump.patch.selection, { entityId: "1820", entityType: "number" });
assert.equal(rootJump.patch.lens, "number");

// --- the spine is stateless: same inputs, same output, no memory between calls ---
assert.deepEqual(
  deriveShellContext({ pathname: "/number/7", search: "" }),
  deriveShellContext({ pathname: "/number/7", search: "" })
);

console.log("shell-context-spine: ok");
