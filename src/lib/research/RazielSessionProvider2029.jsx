import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from "react";
import { askRaziel } from "../supabase.js";
import { useResearch } from "./ResearchProvider.jsx";
import {
  buildRazielSessionRequest,
  createInitialRazielSessionState,
  createRazielContextSnapshot,
  createRazielProvenance,
  normalizeRazielResponse,
  razielSessionReducer,
  selectRazielResearchPreview,
} from "./razielSession2029.js";

const RazielSessionContext2029 = createContext(null);
const systemClock = () => new Date().toISOString();
const systemTurnId = () => globalThis.crypto?.randomUUID?.() || `raziel-${Date.now()}`;

export function useRazielSession2029() {
  const session = useContext(RazielSessionContext2029);
  if (!session) throw new Error("useRazielSession2029 must be used inside RazielSessionProvider2029");
  return session;
}

// Headless provider only. It is intentionally not mounted until the active SystemFrame writer
// releases that surface. Both desktop and mobile projections will consume this same instance.
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
  } = {}) => {
    if (inFlightRef.current || stateRef.current.busy) return { ok: false, error: "turn_pending" };
    const startedAt = clock();
    const contextSnapshot = createRazielContextSnapshot(research.context, view, startedAt);
    const request = buildRazielSessionRequest({
      question,
      state: stateRef.current,
      contextSnapshot,
      facts,
      intelligenceLevel,
      again,
    });
    if (!request) return { ok: false, error: "question_required" };

    const turn = {
      id: createTurnId(),
      question: request.subject,
      intelligenceLevel: request.intelligenceLevel,
      again: request.again,
      projection: projection === "mobile" ? "mobile" : projection === "desktop" ? "desktop" : null,
      startedAt,
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
    resetTemporarySession,
  }), [state, currentContext, researchPreview, submit, resetTemporarySession]);

  return (
    <RazielSessionContext2029.Provider value={value}>
      {children}
    </RazielSessionContext2029.Provider>
  );
}
