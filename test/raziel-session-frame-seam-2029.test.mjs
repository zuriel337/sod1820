// #1142 RazielSession V0 → central 2029 frame seam: one provider, one temporary
// conversation in desktop/mobile projections, zero AI on open, bounded context and owner reset.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildRazielSessionRequest } from "../src/lib/research/razielSessionRequest2029.js";
import {
  createRazielContinuationSnapshot,
  createInitialRazielSessionState,
  createRazielContextSnapshot,
  razielSessionReducer,
  selectRazielContinuation,
} from "../src/lib/research/razielSession2029.js";
import {
  entityTypeNounHe,
  looksLikeInternalKey,
  razielContextParts,
  razielSavedLabel,
  withRazielSurfaceContext,
} from "../src/components/experience2029/razielSessionSeam2029.js";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const app = read("src/App2029.jsx");
const legacyApp = read("src/App.jsx");
const frame = read("src/components/experience2029/SystemFrame2029.jsx");
const mount = read("src/components/experience2029/RazielSessionMount2029.jsx");
const seam = read("src/components/experience2029/razielSessionSeam2029.js");
const provider = read("src/lib/research/RazielSessionProvider2029.jsx");
const chat = frame.slice(frame.indexOf("function RazielNativeChat"), frame.indexOf("function RazielProjection"));

test("one provider: App2029 mounts it once below ResearchProvider and above the existing Routes; Legacy stays untouched", () => {
  assert.equal((app.match(/<RazielSessionMount2029>/g) || []).length, 1);
  const iResearch = app.indexOf("<ResearchProvider>");
  const iMount = app.indexOf("<RazielSessionMount2029>");
  const iRoutes = app.indexOf("<Routes>");
  assert.ok(iResearch > 0 && iResearch < iMount && iMount < iRoutes);
  assert.ok(app.indexOf("</Routes>") < app.indexOf("</RazielSessionMount2029>"));
  assert.ok(app.indexOf("</RazielSessionMount2029>") < app.indexOf("</ResearchProvider>"));
  assert.doesNotMatch(legacyApp, /RazielSession/);
  assert.match(mount, /<RazielSessionProvider2029 key=\{principalKey\} transport=\{transport\}>/);
  assert.equal((mount.match(/askRaziel\s*\(/g) || []).length, 1);
  assert.doesNotMatch(mount + seam, /useReducer|createContext|razielSessionReducer/);
});

test("one conversation: desktop Companion and mobile sheet consume the same session without changing central shell markup", () => {
  assert.equal((frame.match(/<RazielNativeChat /g) || []).length, 2);
  assert.match(frame, /<RazielNativeChat[^>]*projection="desktop"/);
  assert.match(frame, /<RazielNativeChat[^>]*projection="mobile"/);
  assert.match(chat, /const session = useOptionalRazielSession2029\(\);/);
  assert.doesNotMatch(chat, /useState\(\[\]\)|setThread|await askRaziel\s*\(/);
  assert.equal((frame.match(/askRaziel\s*\(/g) || []).length, 0);
  assert.match(frame, /return useOptionalRazielSession2029\(\)[\s\S]*\? <SystemFrame2029Body \{\.\.\.props\} \/>[\s\S]*: <RazielSessionMount2029><SystemFrame2029Body/);
});

test("continuity: a desktop turn is available to the next mobile request", () => {
  const snapshot = createRazielContextSnapshot({ subject: { type: "number", id: "776", label: "776" } });
  let state = createInitialRazielSessionState();
  state = razielSessionReducer(state, {
    type: "turn_started",
    contextSnapshot: snapshot,
    turn: { id: "a", question: "מה זה 776?", intelligenceLevel: "fast", again: false, projection: "desktop", startedAt: "t0" },
  });
  state = razielSessionReducer(state, {
    type: "turn_succeeded",
    completedAt: "t1",
    response: { answer: "תשובה", intelligenceLevel: "fast", deterministic: false, sourceNames: [] },
    provenance: { turnId: "a" },
  });
  const request = buildRazielSessionRequest({ question: "ובמסתתר?", state, contextSnapshot: snapshot });
  assert.match(request.context, /שיחה אחרונה:\nמשתמש: מה זה 776\?\nרזיאל: תשובה/);
});

test("deep continuation is not rebound to a newly opened surface", () => {
  const contextA = {
    lens: "post",
    subject: { type: "post", id: "a", label: "פוסט א", href: "/post/a" },
    journey: { kind: "finding", id: "journey-a", position: "2", revisionNo: 7 },
    selection: { entityType: "finding", entityId: "selection-a", findingId: "finding-a", locator: "section-a" },
    returnTo: { href: "/world?finding=return-a", label: "חזרה לא", subject: { type: "finding", id: "return-a", label: "ממצא א" } },
    dimensions: {
      surfaceFocus: { type: "post", id: "focus-a", label: "מוקד א", sectionLabel: "פרק א" },
      readingFocus: { id: "reading-a", primary: "מקטע א", sourceLabel: "מקור א", locator: "line-a", signals: ["אות א"] },
      entrySource: "entry-a",
      sourceRef: "source-a",
      journeySemanticId: "semantic-a",
      journeyRoot: "root-a",
      journeyVisitedValues: [26, 1820],
      surfaceSections: [{ label: "מדור א" }],
      surfaceFindings: [{ label: "ממצא א" }],
    },
  };
  const snapshotA = createRazielContextSnapshot(contextA, {}, "2026-10-24T12:00:00Z");
  const continuationA = createRazielContinuationSnapshot({
    contextSnapshot: snapshotA,
    facts: "עובדות א",
    viewMode: "landscape",
  });
  let state = createInitialRazielSessionState();
  state = razielSessionReducer(state, {
    type: "turn_started",
    contextSnapshot: snapshotA,
    turn: { id: "turn-a", question: "שאלה א", intelligenceLevel: "fast", again: false, continuation: continuationA },
  });
  state = razielSessionReducer(state, {
    type: "turn_succeeded",
    completedAt: "done",
    response: { answer: "תשובה א", intelligenceLevel: "fast", deterministic: false, sourceNames: ["מקור א"] },
    provenance: { turnId: "turn-a" },
  });
  const original = selectRazielContinuation(state.thread, { turnId: "turn-a" });
  const deepRequest = buildRazielSessionRequest({
    question: "שאלה א",
    state,
    contextSnapshot: original.contextSnapshot,
    facts: original.facts,
    intelligenceLevel: "deep",
    again: true,
    viewMode: original.viewMode,
  });
  const initialTransport = withRazielSurfaceContext(
    buildRazielSessionRequest({ question: "שאלה א", state: createInitialRazielSessionState(), contextSnapshot: snapshotA }),
    contextA,
  );
  assert.equal(initialTransport.surfaceSemantic.context.subjectHref, "/post/a");

  const output = withRazielSurfaceContext(deepRequest, {
    lens: "world",
    subject: { type: "finding", id: "b", href: "/world?finding=b" },
    selection: { entityType: "finding", entityId: "selection-b" },
    returnTo: { href: "/world?finding=return-b", label: "חזרה לב" },
    dimensions: {
      surfaceFocus: { type: "finding", id: "focus-b", label: "מוקד ב" },
      readingFocus: { id: "reading-b", primary: "מקטע ב" },
      surfaceSections: [{ label: "מדור ב" }],
      surfaceFindings: [{ label: "ממצא ב" }],
    },
  });
  assert.equal(output, deepRequest);
  assert.equal(output.surfaceSemantic.subject.id, "a");
  assert.equal(output.surfaceSemantic.context.subjectHref, "/post/a");
  assert.equal(output.surfaceSemantic.context.focus.id, "focus-a");
  assert.equal(output.surfaceSemantic.context.reading.id, "reading-a");
  assert.equal(output.surfaceSemantic.context.navigation.selection.entityId, "selection-a");
  assert.equal(output.surfaceSemantic.context.navigation.returnTo.href, "/world?finding=return-a");
  assert.deepEqual(output.surfaceSemantic.context.sections, ["מדור א"]);
  assert.deepEqual(output.surfaceSemantic.context.findings, ["ממצא א"]);
  assert.ok(JSON.stringify(original).length < 5000, "continuation stays bounded");
  assert.doesNotMatch(JSON.stringify(output), /finding=b|selection-b|return-b|focus-b|reading-b|מדור ב|ממצא ב|"lens":"world"/);
});

test("zero AI on open/navigation: the only transport boundary is an explicit submit", () => {
  assert.doesNotMatch(chat, /useEffect|useLayoutEffect/);
  assert.equal((chat.match(/session\.submit\(/g) || []).length, 1);
  assert.match(chat, /if \(!q \|\| busy\) return;/);
  assert.match(chat, /send\(text, "fast"\)/);
  const reset = mount.slice(mount.indexOf("function RazielSessionOwnerReset2029"), mount.indexOf("export default"));
  assert.doesNotMatch(reset, /submit|transport|askRaziel/);
  assert.equal((provider.match(/await transport\(request\)/g) || []).length, 1);
  assert.doesNotMatch(provider.slice(0, provider.indexOf("const submit")), /transport\s*\(/);
});

test("deep remains previewed and explicit; ungrounded synthesis is labelled as interpretation", () => {
  assert.match(chat, /const deepCandidate = selectRazielDeepeningCandidate\(session\);/);
  assert.match(chat, /data-raziel-deepen-preview="true"/);
  assert.match(chat, /m === deepCandidate/);
  assert.match(chat, /deepCandidate && deepOpen/);
  assert.match(chat, /data-raziel-deepen="true"[\s\S]*send\(deepCandidate\.question, "deep", true, deepCandidate\.turnId\)/);
  assert.equal((chat.match(/"deep"/g) || []).length, 1);
  assert.match(chat, /data-raziel-grounding="interpretation">ללא מקור מאומת · פרשנות של רזיאל/);
});

test("Hebrew context helpers expose human labels and preserve original source names", () => {
  const snapshot = createRazielContextSnapshot({
    lens: "post_reading",
    subject: { type: "post", id: "post-5107", label: "post-5107" },
    dimensions: {
      readingFocus: { primary: "surfaceFocus", sourceLabel: "Sha'arei Orah" },
      surfaceFindings: [{ sourceLabel: "ספר יצירה" }],
    },
  }, { numberFocus: { expression: "שער נון", method: "רגיל", resultValue: 676 } });
  const parts = razielContextParts(snapshot);
  for (const part of parts) assert.equal(looksLikeInternalKey(part.label.split(" · ")[0]), false, part.label);
  assert.equal(parts[0].label, "פוסט");
  assert.ok(parts.some((part) => part.key === "number" && part.label === "שער נון · רגיל = 676"));
  assert.ok(parts.some((part) => part.key === "sources" && part.label === "Sha'arei Orah · ספר יצירה"));
  assert.equal(entityTypeNounHe("post"), "פוסט");
  assert.equal(entityTypeNounHe("surface_focus"), "פריט");
  assert.equal(razielSavedLabel({ type: "number", id: "424", label: "424" }), "מספר 424");
});

test("privacy: memory only, owner changes reset it, and surface context is allowlisted", () => {
  for (const source of [mount, seam, provider, chat]) {
    assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB|document\.cookie/);
  }
  assert.match(mount, /if \(owner\.current !== uid\) \{ owner\.current = uid; pending\.current = true; \}/);
  assert.match(mount, /if \(pending\.current && !busy && resetTemporarySession\(\)\) pending\.current = false;/);
  assert.match(mount, /const principalKey = loading \? "auth-loading" : \(user\?\.id \|\| "anon"\);/);
  assert.doesNotMatch(mount, /try\s*\{|catch\s*\{/);
  assert.match(provider, /export function useOptionalRazielSession2029\(\) \{\n\s+return useContext\(RazielSessionContext2029\);/);
  assert.match(provider, /if \(!mountedRef\.current\) return \{ ok: false, error: "session_unmounted" \}/);
  const request = { subject: "שאלה", surfaceSemantic: { surface: "post", context: { lens: "post" } } };
  const context = {
    lens: "post",
    subject: { type: "post", id: "5107", href: "/post/x" },
    privateNotes: "PRIVATE",
    saved: [{ id: "s" }],
    access: { token: "T" },
  };
  const output = withRazielSurfaceContext(request, context);
  assert.notEqual(output, request);
  assert.deepEqual(request.surfaceSemantic.context, { lens: "post" });
  assert.equal(output.surfaceSemantic.context.subjectHref, "/post/x");
  assert.doesNotMatch(JSON.stringify(output), /PRIVATE|"T"|saved/);
});

test("cost: every explicit request stays bounded and deep appears once", () => {
  const large = "א".repeat(5000);
  let state = createInitialRazielSessionState();
  for (let index = 0; index < 30; index += 1) {
    state = { ...state, thread: [...state.thread, { role: index % 2 ? "raziel" : "user", text: large }] };
  }
  const snapshot = createRazielContextSnapshot({
    subject: { type: "post", id: "1", label: large },
    dimensions: { readingFocus: { primary: large } },
  });
  const request = withRazielSurfaceContext(
    buildRazielSessionRequest({ question: large, state, contextSnapshot: snapshot, facts: large }),
    { lens: large, subject: { type: "post", id: "1", href: `/p/${large}` } },
  );
  assert.equal(request.subject.length, 300);
  assert.ok(request.context.length <= 600);
  assert.ok(request.facts.length <= 1200);
  assert.equal(request.intelligenceLevel, "fast");
  assert.ok(JSON.stringify(request).length < 5000, `payload ${JSON.stringify(request).length}`);
});

test("central chat keeps accessible shared-session semantics", () => {
  assert.match(chat, /data-raziel-session="shared"/);
  assert.match(chat, /data-raziel-projection=\{projection\}/);
  assert.match(chat, /role="log" aria-label="השיחה עם רזיאל"/);
  assert.match(chat, /aria-label="שאלה לרזיאל" dir="auto"/);
  assert.match(chat, /<span dir="auto">\{m\.text\}<\/span>/);
  assert.match(chat, /className="sod29-raziel-status" role="status"/);
});

test("the bounded central seam deliberately omits the older personal-pair feature and its eager dependencies", () => {
  const sources = mount + provider + chat;
  assert.doesNotMatch(sources, /personalGematriaPair|runPersonalPair|data-raziel-personal-pair|researchResultWorkspaceAdapter/);
});
