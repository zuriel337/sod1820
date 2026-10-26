import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from "react";
import { askRaziel } from "../supabase.js";
import { useResearch } from "./ResearchProvider.jsx";
import { loadRazielSessionRequestBuilder2029 } from "./razielSessionRequestLoader2029.js";
import {
  createInitialRazielSessionState,
  normalizeRazielQuestion,
  razielSessionReducer,
} from "./razielSession2029.js";

const RazielSessionContext2029 = createContext(null);
const systemClock = () => new Date().toISOString();
const systemTurnId = () => globalThis.crypto?.randomUUID?.() || `raziel-${Date.now()}`;

// Non-throwing read for hosts that may need to install the provider themselves. This is a plain,
// unconditional context read so it follows the Rules of Hooks and never relies on catch-as-control-flow.
export function useOptionalRazielSession2029() {
  return useContext(RazielSessionContext2029);
}

export function useRazielSession2029() {
  const session = useOptionalRazielSession2029();
  if (!session) throw new Error("useRazielSession2029 must be used inside RazielSessionProvider2029");
  return session;
}

// Headless provider mounted once above the 2029 routes. Desktop and mobile projections consume
// this same temporary instance; durable research state continues to belong to ResearchProvider.
export function RazielSessionProvider2029({
  children,
  transport = askRaziel,
  clock = systemClock,
  createTurnId = systemTurnId,
  loadRequestBuilder = loadRazielSessionRequestBuilder2029,
}) {
  const research = useResearch();
  const [state, dispatch] = useReducer(razielSessionReducer, undefined, createInitialRazielSessionState);
  const stateRef = useRef(state);
  const inFlightRef = useRef(false);
  const mountedRef = useRef(true);
  stateRef.current = state;

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const submit = useCallback(async ({
    question,
    intelligenceLevel = "fast",
    again = false,
    facts = "",
    view = {},
    projection = null,
    viewMode = null,
    viewModeOverride = null,
    continuationTurnId = null,
  } = {}) => {
    if (inFlightRef.current || stateRef.current.busy) return { ok: false, error: "turn_pending" };
    const capturedQuestion = normalizeRazielQuestion(question);
    if (!capturedQuestion) return { ok: false, error: "question_required" };
    const capturedState = stateRef.current;
    const startedAt = clock();
    const draftTurn = {
      id: createTurnId(),
      question: capturedQuestion,
      intelligenceLevel: intelligenceLevel === "deep" ? "deep" : "fast",
      startedAt,
    };
    inFlightRef.current = true;
    dispatch({ type: "turn_preparing", turn: draftTurn, contextSnapshot: null });
    let failure = "request_builder_unavailable";
    try {
      const buildRazielSessionRequest = await loadRequestBuilder();
      if (!mountedRef.current) return { ok: false, error: "session_unmounted" };
      const prepared = buildRazielSessionRequest.prepareSubmission({
        question: capturedQuestion,
        state: capturedState,
        researchContext: research.context,
        facts,
        intelligenceLevel,
        again,
        view,
        projection,
        viewMode,
        viewModeOverride,
        continuationTurnId,
        startedAt,
        createTurnId: () => draftTurn.id,
      });
      if (!prepared) {
        const completedAt = clock();
        if (mountedRef.current) dispatch({ type: "turn_failed", completedAt, error: "question_required" });
        return { ok: false, error: "question_required" };
      }
      const { request, turn, contextSnapshot, navigation } = prepared;
      dispatch({ type: "turn_started", turn, contextSnapshot });
      // Explicit navigation request: answered locally and deterministically (shared grammar, canonical routes).
      // No transport call, no model, no quota use. The follow-up action is derived from the reducer's own
      // result, because no render happens between the two dispatches.
      if (navigation) {
        dispatch(buildRazielSessionRequest.createNavigationSucceededAction({
          state: razielSessionReducer(stateRef.current, { type: "turn_started", turn, contextSnapshot }),
          navigation,
          completedAt: clock(),
        }));
        return { ok: true, navigation };
      }
      // The only AI boundary in this module: an explicit submit action.
      failure = "transport_failed";
      const rawResponse = await transport(request);
      if (!mountedRef.current) return { ok: false, error: "session_unmounted" };
      const completedAt = clock();
      const response = buildRazielSessionRequest.normalizeResponse(rawResponse, request.intelligenceLevel);
      if (!response) {
        dispatch({ type: "turn_failed", completedAt, error: "unavailable" });
        return { ok: false, error: "unavailable" };
      }
      const provenance = buildRazielSessionRequest.createProvenance({ response: rawResponse, turn, completedAt });
      dispatch(buildRazielSessionRequest.createSucceededAction({
        state: stateRef.current,
        response,
        provenance,
        completedAt,
      }));
      return { ok: true, response, provenance };
    } catch {
      const completedAt = clock();
      if (mountedRef.current) dispatch({ type: "turn_failed", completedAt, error: failure });
      return { ok: false, error: failure };
    } finally {
      inFlightRef.current = false;
    }
  }, [clock, createTurnId, loadRequestBuilder, research.context, transport]);

  // One-shot actions ("✨ הפתע אותי" = exploratory/deep, "🗺️ פתח מפת מחקר" = landscape/fast): a continuation of the LAST answer's
  // question over the same session and Bundle. It goes through submit() (the single AI boundary and the lazy request builder),
  // never dispatches view_mode_set, and is refused here — before any state change or request — when the last answer has no
  // valid Bundle. The gate is a tiny lazy module, so nothing of it enters the eager 2029 graph.
  const submitOneShot = useCallback(async (kind, options) => {
    const { selectRazielOneShot, RAZIEL_ONE_SHOT_SPEC } = await import("./razielOneShotGate2029.js");
    const shot = selectRazielOneShot(stateRef.current);
    const spec = RAZIEL_ONE_SHOT_SPEC[kind];
    if (!spec || !shot.ok) return { ok: false, error: "no_material_for_one_shot" };
    return submit({ ...options, question: shot.question, intelligenceLevel: spec.level, again: true, continuationTurnId: shot.turnId, viewModeOverride: spec.mode });
  }, [submit]);

  const setViewMode = useCallback((viewMode) => {
    dispatch({ type: "view_mode_set", viewMode });
  }, []);

  // Saving/restoring is an explicit ResearchProvider action. The serializer is loaded only
  // after the user asks to save or reopen a conversation; ordinary chat stays on the lean path.
  const saveCurrentSession = useCallback(async () => {
    if (inFlightRef.current || stateRef.current.busy) return { ok: false, error: "turn_pending" };
    const { buildRazielSavedSessionEntity } = await import("./razielSavedSession2029.js");
    const built = buildRazielSavedSessionEntity(stateRef.current, { now: clock });
    if (!built.ok) return built;
    const previous = (Array.isArray(research.saved) ? research.saved : []).find((item) => (
      item?.type === "raziel_session" && item.ref === built.entity.ref
    ));
    if (previous?.title) built.entity.title = previous.title;
    if (!research.saveItem?.(built.entity)) return { ok: false, error: "research_save_unavailable" };
    dispatch({ type: "session_saved", sessionRef: built.entity.ref, savedAt: built.entity.saved_at });
    return { ok: true, session: built.entity };
  }, [clock, research]);

  const restoreSavedSession = useCallback(async (sessionId) => {
    if (inFlightRef.current || stateRef.current.busy) return { ok: false, error: "turn_pending" };
    const selected = (Array.isArray(research.saved) ? research.saved : []).find((item) => (
      item?.type === "raziel_session" && (item.id === sessionId || item.ref === sessionId)
    ));
    if (!selected) return { ok: false, error: "saved_session_not_found" };
    const { razielSavedSessionState } = await import("./razielSavedSession2029.js");
    const restored = razielSavedSessionState(selected);
    if (!restored) return { ok: false, error: "saved_session_invalid" };
    dispatch({ type: "session_restored", state: restored });
    return { ok: true, session: selected };
  }, [research.saved]);

  const removeSavedSession = useCallback((sessionId) => {
    const selected = (Array.isArray(research.saved) ? research.saved : []).find((item) => (
      item?.type === "raziel_session" && (item.id === sessionId || item.ref === sessionId)
    ));
    return selected ? Boolean(research.removeSaved?.(selected.id)) : false;
  }, [research]);

  const renameSavedSession = useCallback(async (sessionId, requestedTitle) => {
    if (inFlightRef.current || stateRef.current.busy) return { ok: false, error: "turn_pending" };
    const selected = (Array.isArray(research.saved) ? research.saved : []).find((item) => (
      item?.type === "raziel_session" && (item.id === sessionId || item.ref === sessionId)
    ));
    if (!selected) return { ok: false, error: "saved_session_not_found" };
    const { normalizeRazielSavedSessionEntity, normalizeRazielSavedSessionTitle } = await import("./razielSavedSession2029.js");
    const normalized = normalizeRazielSavedSessionEntity(selected);
    if (!normalized) return { ok: false, error: "saved_session_invalid" };
    const title = normalizeRazielSavedSessionTitle(requestedTitle);
    if (!title) return { ok: false, error: "title_required" };
    const entity = {
      ...selected,
      id: normalized.id,
      ref: normalized.ref,
      type: normalized.type,
      title,
    };
    if (!research.saveItem?.(entity)) return { ok: false, error: "research_save_unavailable" };
    return { ok: true, session: entity };
  }, [research]);

  const resetTemporarySession = useCallback(() => {
    if (inFlightRef.current || stateRef.current.busy) return false;
    dispatch({ type: "session_reset" });
    return true;
  }, []);

  const savedSessions = useMemo(() => (Array.isArray(research.saved) ? research.saved : [])
    .filter((item) => item?.type === "raziel_session" && typeof item?.id === "string")
    .map((item) => ({
      id: item.id,
      ref: typeof item.ref === "string" ? item.ref : item.id,
      title: typeof item.title === "string" ? item.title.slice(0, 96) : "שיחה עם רזיאל",
      turn_count: Number.isSafeInteger(item.turn_count) && item.turn_count >= 0 ? item.turn_count : 0,
      saved_at: typeof item.saved_at === "string" ? item.saved_at : null,
    }))
    .sort((a, b) => String(b.saved_at || "").localeCompare(String(a.saved_at || "")))
    .slice(0, 50), [research.saved]);

  const value = useMemo(() => ({
    ...state,
    submit,
    setViewMode,
    submitOneShot,
    saveCurrentSession,
    restoreSavedSession,
    removeSavedSession,
    renameSavedSession,
    savedSessions,
    savedSessionsSyncStatus: research.syncStatus || "local_only",
    resetTemporarySession,
  }), [state, submit, setViewMode, submitOneShot, saveCurrentSession, restoreSavedSession,
    removeSavedSession, renameSavedSession, savedSessions, research.syncStatus, resetTemporarySession]);

  return (
    <RazielSessionContext2029.Provider value={value}>
      {children}
    </RazielSessionContext2029.Provider>
  );
}
