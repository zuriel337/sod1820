import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from "react";
import { askRaziel } from "../supabase.js";
import { useResearch } from "./ResearchProvider.jsx";
import {
  buildRazielSessionRequest,
  createRazielContinuationSnapshot,
  createInitialRazielSessionState,
  createRazielContextSnapshot,
  createRazielProvenance,
  normalizeRazielResponse,
  razielSessionReducer,
  selectRazielContinuation,
  selectRazielResearchPreview,
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

  const currentContext = useMemo(
    () => createRazielContextSnapshot(research.context),
    [research.context],
  );
  const researchPreview = useMemo(
    () => selectRazielResearchPreview(research),
    [research.saved, research.cart, research.collections, research.syncStatus],
  );

  const submit = useCallback(async ({
    question,
    intelligenceLevel = "fast",
    again = false,
    facts = "",
    view = {},
    projection = null,
    viewMode = null,
    continuationTurnId = null,
  } = {}) => {
    if (inFlightRef.current || stateRef.current.busy) return { ok: false, error: "turn_pending" };
    const startedAt = clock();
    const continuation = again ? selectRazielContinuation(stateRef.current.thread, {
      turnId: continuationTurnId,
      question,
    }) : null;
    const contextSnapshot = continuation?.contextSnapshot
      || createRazielContextSnapshot(research.context, view, startedAt);
    const selectedFacts = continuation ? continuation.facts : facts;
    const selectedViewMode = continuation?.viewMode
      ?? viewMode
      ?? stateRef.current.viewMode;
    const request = buildRazielSessionRequest({
      question,
      state: stateRef.current,
      contextSnapshot,
      facts: selectedFacts,
      intelligenceLevel,
      again,
      // Session-owned choice, read at submit time so every projection/surface sends the same mode.
      viewMode: selectedViewMode,
    });
    if (!request) return { ok: false, error: "question_required" };

    const turn = {
      id: createTurnId(),
      question: request.subject,
      identityResolution: request.conversationResolution ? {
        identities: request.conversationResolution.identities,
        explicit_text_computation: false,
      } : null,
      intelligenceLevel: request.intelligenceLevel,
      again: request.again,
      projection: projection === "mobile" ? "mobile" : projection === "desktop" ? "desktop" : null,
      startedAt,
      continuation: createRazielContinuationSnapshot({
        contextSnapshot,
        facts: request.facts,
        viewMode: selectedViewMode,
      }),
    };
    inFlightRef.current = true;
    dispatch({ type: "turn_started", turn, contextSnapshot });
    try {
      // The only AI boundary in this module: an explicit submit action.
      const rawResponse = await transport(request);
      if (!mountedRef.current) return { ok: false, error: "session_unmounted" };
      const completedAt = clock();
      const response = normalizeRazielResponse(rawResponse, request.intelligenceLevel);
      if (!response) {
        dispatch({ type: "turn_failed", completedAt, error: "unavailable" });
        return { ok: false, error: "unavailable" };
      }
      const provenance = createRazielProvenance({ response: rawResponse, turn, completedAt });
      dispatch({ type: "turn_succeeded", completedAt, response, provenance });
      return { ok: true, response, provenance };
    } catch {
      const completedAt = clock();
      if (mountedRef.current) dispatch({ type: "turn_failed", completedAt, error: "transport_failed" });
      return { ok: false, error: "transport_failed" };
    } finally {
      inFlightRef.current = false;
    }
  }, [clock, createTurnId, research.context, transport]);

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
    currentContext,
    researchPreview,
    submit,
    setViewMode,
    resetTemporarySession,
  }), [state, currentContext, researchPreview, submit, setViewMode, resetTemporarySession]);

  return (
    <RazielSessionContext2029.Provider value={value}>
      {children}
    </RazielSessionContext2029.Provider>
  );
}
