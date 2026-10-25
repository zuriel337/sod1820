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
      const { request, turn, contextSnapshot } = prepared;
      dispatch({ type: "turn_started", turn, contextSnapshot });
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

  const resetTemporarySession = useCallback(() => {
    if (inFlightRef.current || stateRef.current.busy) return false;
    dispatch({ type: "session_reset" });
    return true;
  }, []);

  const value = useMemo(() => ({
    ...state,
    submit,
    setViewMode,
    submitOneShot,
    resetTemporarySession,
  }), [state, submit, setViewMode, submitOneShot, resetTemporarySession]);

  return (
    <RazielSessionContext2029.Provider value={value}>
      {children}
    </RazielSessionContext2029.Provider>
  );
}
