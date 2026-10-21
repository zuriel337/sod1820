// #1142 RazielSession V0 → 2029 frame seam: one provider, one conversation in two projections, zero AI on
// open/close/navigation/saved, Hebrew context without raw keys, privacy and bounded cost.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildRazielSessionRequest,
  createInitialRazielSessionState,
  createRazielContextSnapshot,
  razielSessionReducer,
  selectRazielResearchPreview,
} from "../src/lib/research/razielSession2029.js";
import {
  entityTypeNounHe,
  looksLikeInternalKey,
  razielContextParts,
  razielSavedLabel,
  withRazielSurfaceContext,
} from "../src/components/experience2029/razielSessionSeam2029.js";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const app = read("src/App2029.jsx");
const legacyApp = read("src/App.jsx");
const frame = read("src/components/experience2029/SystemFrame2029.jsx");
const mount = read("src/components/experience2029/RazielSessionMount2029.jsx");
const seam = read("src/components/experience2029/razielSessionSeam2029.js");
const provider = read("src/lib/research/RazielSessionProvider2029.jsx");
const css = read("src/components/experience2029/systemFrame2029.css");
const chat = frame.slice(frame.indexOf("function RazielNativeChat"), frame.indexOf("function RazielProjection"));
const razielCss = css.slice(css.indexOf("/* Raziel pane = one shared session"), css.indexOf('[data-panel-kind="raziel"]') + 120);

test("one provider: mounted once in App2029 under ResearchProvider and above Routes; Legacy untouched", () => {
  assert.equal((app.match(/<RazielSessionMount2029>/g) || []).length, 1);
  const iResearch = app.indexOf("<ResearchProvider>");
  const iMount = app.indexOf("<RazielSessionMount2029>");
  const iRoutes = app.indexOf("<Routes>");
  assert.ok(iResearch > 0 && iResearch < iMount && iMount < iRoutes);
  assert.ok(app.indexOf("</RazielSessionMount2029>") < app.indexOf("</ResearchProvider>"));
  assert.ok(app.indexOf("</Routes>") < app.indexOf("</RazielSessionMount2029>"));
  assert.doesNotMatch(legacyApp, /RazielSession/);
  // the mount consumes the Codex provider unchanged: one transport, no second session implementation
  assert.match(mount, /<RazielSessionProvider2029 transport=\{transport\}>/);
  assert.equal((mount.match(/askRaziel\s*\(/g) || []).length, 1);
  assert.doesNotMatch(mount + seam, /useReducer|createContext|razielSessionReducer/);
});

test("one conversation, two projections: Companion (desktop) and sheet (mobile) read the same session", () => {
  assert.equal((frame.match(/<RazielNativeChat /g) || []).length, 2);
  assert.match(frame, /<RazielNativeChat projection="desktop" onOpenMyResearch=\{openMyResearch\}/);
  assert.match(frame, /primary=\{!routeActionValid\} projection="mobile" onOpenMyResearch=\{onOpenMyResearch\}/);
  assert.match(chat, /const session = useOptionalRazielSession2029\(\);/);
  assert.doesNotMatch(chat, /useState\(\[\]\)|setThread/);
  assert.equal((frame.match(/askRaziel\s*\(/g) || []).length, 0);
  // a 2029 surface hosted by another app gets the same mount, never a second chat implementation
  assert.match(frame, /return useOptionalRazielSession2029\(\)\s*\? <SystemFrame2029Body \{\.\.\.props\} \/>\s*: <RazielSessionMount2029><SystemFrame2029Body/);
  // the orb mirrors the one session turn; the Now tab opens the same projection as the orb
  assert.match(frame, /const razielBusy = Boolean\(razielSession\?\.busy\);/);
  assert.match(frame, /onRaziel=\{\(\) => launchRaziel\(\)\}/);
  assert.match(frame, /const launchRaziel = \(\) => \(companionActive && surface !== "post" \? focusCompanionRaziel\(\) : openRaziel\(\)\);/);
});

test("continuity: a turn from one projection is visible to the other (shared reducer state)", () => {
  const snap = createRazielContextSnapshot({ subject: { type: "number", id: "776", label: "776" } });
  let s = createInitialRazielSessionState();
  s = razielSessionReducer(s, { type: "turn_started", contextSnapshot: snap, turn: { id: "a", question: "מה זה 776?", intelligenceLevel: "fast", again: false, projection: "desktop", startedAt: "t0" } });
  s = razielSessionReducer(s, { type: "turn_succeeded", completedAt: "t1", response: { answer: "תשובה", intelligenceLevel: "fast", deterministic: false, sourceNames: [] }, provenance: { turnId: "a" } });
  const req = buildRazielSessionRequest({ question: "ובמסתתר?", state: s, contextSnapshot: snap });
  assert.match(req.context, /שיחה אחרונה:\nמשתמש: מה זה 776\?\nרזיאל: תשובה/);
});

test("zero AI on open, close, navigation and saved display: the only boundary is an explicit send", () => {
  assert.doesNotMatch(chat, /useEffect|useLayoutEffect/);
  assert.equal((chat.match(/session\.submit\(/g) || []).length, 1);
  const send = chat.slice(chat.indexOf("const send = async"), chat.indexOf("const contextParts"));
  assert.match(send, /if \(!q \|\| busy\) return;/);
  assert.match(chat, /onSubmit=\{\(e\) => \{ e\.preventDefault\(\); send\(text, "fast"\); \}\}/);
  assert.match(chat, /onClick=\{\(\) => setSavedOpen\(\(open\) => !open\)\}/);
  const iResearch = frame.indexOf("const openMyResearch = useCallback");
  assert.ok(iResearch > 0);
  assert.doesNotMatch(frame.slice(iResearch, iResearch + 400), /submit|askRaziel|transport/);
  const reset = mount.slice(mount.indexOf("function RazielSessionOwnerReset2029"), mount.indexOf("export default"));
  assert.doesNotMatch(reset, /submit|transport|askRaziel/);
  // provider (Codex, unchanged): one awaited transport inside submit, nothing before it
  assert.equal((provider.match(/await transport\(request\)/g) || []).length, 1);
  assert.doesNotMatch(provider.slice(0, provider.indexOf("const submit")), /transport\s*\(/);
});

test("Hebrew context strip: human labels, original source names, never raw keys", () => {
  const snap = createRazielContextSnapshot({
    lens: "post_reading",
    subject: { type: "post", id: "post-5107", label: "post-5107" },
    dimensions: { readingFocus: { primary: "surfaceFocus", sourceLabel: "Sha'arei Orah" }, surfaceFindings: [{ sourceLabel: "ספר יצירה" }] },
  }, { numberFocus: { expression: "שער נון", method: "רגיל", resultValue: 676 } });
  const parts = razielContextParts(snap);
  for (const part of parts) assert.equal(looksLikeInternalKey(part.label.split(" · ")[0]), false, part.label);
  assert.equal(parts[0].label, "פוסט");
  assert.ok(parts.some((p) => p.key === "number" && p.label === "שער נון · רגיל = 676"));
  assert.ok(parts.some((p) => p.key === "sources" && p.label === "Sha'arei Orah · ספר יצירה"));
  assert.ok(!parts.some((p) => p.key === "reading"));
  assert.deepEqual(razielContextParts(createRazielContextSnapshot({ subject: { type: "number", id: "776", label: "776" } })).map((p) => p.label), ["מספר 776"]);
  assert.deepEqual(razielContextParts(null), []);
  assert.equal(entityTypeNounHe("post"), "פוסט");
  assert.equal(entityTypeNounHe("surface_focus"), "פריט");
  assert.equal(razielSavedLabel({ type: "post", id: "post-5107", label: "post-5107" }), "פוסט");
  assert.equal(razielSavedLabel({ type: "number", id: "424", label: "424" }), "מספר 424");
  assert.equal(razielSavedLabel({ type: "book", id: "b1", label: "ספר הזוהר" }), "ספר הזוהר");
  // the workspace research list no longer prints raw type keys either
  assert.match(frame, /<small>\{entityTypeNounHe\(e\.type\)\}<\/small>/);
  assert.doesNotMatch(frame, /<small>\{e\.type\}<\/small>/);
});

test("saved: compact read-only view of the existing ResearchProvider items, link to My Workspace research", () => {
  assert.match(chat, /data-raziel-saved-preview="ResearchProvider"/);
  assert.match(chat, /researchPreview\.saved\.map/);
  assert.match(chat, /data-raziel-open-my-research="true" onClick=\{onOpenMyResearch\}/);
  assert.match(frame, /openTransient\(TRANSIENT\.WORKSPACE\);\s*setTimeout\(\(\) => \{ document\.querySelector\('\[data-workspace-section="research"\]'\)/);
  // saved items are never sent to Raziel implicitly
  assert.match(chat, /view: \{ numberFocus, readingFocus, elsFocus \}/);
  assert.doesNotMatch(chat.slice(chat.indexOf("const send = async"), chat.indexOf("const contextParts")), /saved|researchPreview|cart/);
  const preview = selectRazielResearchPreview({ saved: [{ id: "1", type: "post", title: "א" }], saveItem() {} });
  assert.equal("saveItem" in preview, false);
});

test("privacy: memory only, reset for a different signed-in person, allowlisted surface context", () => {
  for (const src of [mount, seam, provider, chat]) assert.doesNotMatch(src, /localStorage|sessionStorage|indexedDB|document\.cookie/);
  assert.match(mount, /if \(owner\.current !== uid\) \{ owner\.current = uid; pending\.current = true; \}/);
  assert.match(mount, /if \(pending\.current && !busy && resetTemporarySession\(\)\) pending\.current = false;/);
  const request = { subject: "שאלה", surfaceSemantic: { surface: "post", context: { lens: "post" } } };
  const context = { lens: "post", subject: { type: "post", id: "5107", href: "/post/x" }, privateNotes: "PRIVATE", saved: [{ id: "s" }], access: { token: "T" } };
  const out = withRazielSurfaceContext(request, context);
  assert.notEqual(out, request);
  assert.deepEqual(request.surfaceSemantic.context, { lens: "post" }); // input not mutated
  assert.equal(out.surfaceSemantic.context.subjectHref, "/post/x");
  assert.doesNotMatch(JSON.stringify(out), /PRIVATE|"T"|saved/);
  assert.equal(withRazielSurfaceContext(request, null), request);
});

test("cost: bounded payload per explicit send, deep only by explicit action", () => {
  const big = "א".repeat(5000);
  let s = createInitialRazielSessionState();
  for (let i = 0; i < 30; i += 1) s = { ...s, thread: [...s.thread, { role: i % 2 ? "raziel" : "user", text: big }] };
  const snap = createRazielContextSnapshot({ subject: { type: "post", id: "1", label: big }, dimensions: { readingFocus: { primary: big } } });
  const req = withRazielSurfaceContext(buildRazielSessionRequest({ question: big, state: s, contextSnapshot: snap, facts: big }),
    { lens: big, subject: { type: "post", id: "1", href: `/p/${big}` }, dimensions: { readingFocus: { primary: big, label: big } } });
  assert.equal(req.subject.length, 300);
  assert.ok(req.context.length <= 600);
  assert.ok(req.facts.length <= 1200);
  assert.equal(req.intelligenceLevel, "fast");
  assert.ok(JSON.stringify(req).length < 4000, `payload ${JSON.stringify(req).length}`);
  assert.equal((chat.match(/"deep"/g) || []).length, 1);
  assert.match(chat, /data-raziel-deepen="true" onClick=\{\(\) => send\(lastRaziel\.question, "deep", true\)\}/);
});

test("RTL, accessibility and three themes: dir/bdi, live regions, 44px targets, ≥14px text, tokens only", () => {
  assert.match(chat, /aria-label="שאלה לרזיאל" dir="auto"/);
  assert.match(chat, /<span dir="auto">\{m\.text\}<\/span>/);
  assert.match(chat, /<bdi>\{part\.label\}<\/bdi>/);
  assert.match(chat, /role="log" aria-label="השיחה עם רזיאל"/);
  assert.match(chat, /className="sod29-raziel-status" role="status"/);
  assert.match(chat, /aria-expanded=\{savedOpen\}/);
  assert.match(chat, /"שאלת" : "רזיאל"/); // role by label, not by opacity
  const rules = razielCss.replace(/\/\*[\s\S]*?\*\//g, "");
  assert.doesNotMatch(rules, /opacity\s*:/);
  assert.doesNotMatch(rules, /#[0-9a-f]{3,8}\b|rgb\(|hsl\(/i);
  assert.ok((razielCss.match(/min-block-size: 44px/g) || []).length >= 3);
  for (const m of razielCss.matchAll(/font-size: (\d+)px/g)) assert.ok(Number(m[1]) >= 14, m[0]);
  assert.match(razielCss, /height: min\(78dvh, 760px\)/);
  assert.match(frame, /data-panel-kind=\{panelKind\}/);
});

test("canonical orb and Now are preserved: one compact orb in the island, three Now tabs", () => {
  assert.equal((frame.match(/<RazielOrb compact /g) || []).length, 1);
  assert.match(frame, /onClick=\{companionActive && surface !== "post" \? focusCompanionRaziel : openRaziel\} locked=\{razielLocked\}/);
  assert.match(frame, /\{ id: "rz", label: razielLocked \? "רזיאל · נעול" : "רזיאל מציע"/);
  assert.match(frame, /role="group" aria-label="עכשיו"/);
  assert.doesNotMatch(chat, /RazielOrb/); // the pane adds no second orb
});

test("server lock is honest in the preview: closed for this viewer ⇒ the server's message, no send", () => {
  // root cause 21.10: lock_raziel_site (mode all) makes ai-analyze answer HTTP 200 {error:"availability"} for non-admins;
  // the preview only projects the pane open, so the frame mirrors the canonical lock instead of a call that must fail.
  assert.match(frame, /resolveFeatureState\(razielFeature\.lock, \{ user, isAdmin, requireFlag: true \}\)\.blocked/);
  assert.match(frame, /const razielServerClosed = Boolean\(razielFeature\.readOnlyPreview && razielFeature\.lock/);
  const send = chat.slice(chat.indexOf("const send = async"), chat.indexOf("const contextParts"));
  assert.ok(send.indexOf("if (closedNote) return;") < send.indexOf("session.submit("));
  assert.match(chat, /data-raziel-server-closed="true">\{closedNote\}/);
  assert.match(chat, /disabled=\{busy \|\| Boolean\(closedNote\)\}/);
  assert.equal((frame.match(/closedNote=\{razielClosedNote\}/g) || []).length, 2); // Companion + sheet
});
