import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from "react";
import { askRaziel } from "../supabase.js";
import { useResearch } from "./ResearchProvider.jsx";
import {
  createInitialRazielSessionState,
  loadRazielSessionSubmission,
  razielSessionReducer,
} from "./razielSession2029.js";

const RazielSessionContext2029 = createContext(null);
const systemClock = () => new Date().toISOString();
const systemTurnId = () => crypto.randomUUID?.() || String(Date.now());

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
    inFlightRef.current = true;
    let turnStarted = false;
    try {
      const submission = await loadRazielSessionSubmission();
      const prepared = submission.prepareRazielSessionSubmission({
        question,
        state: stateRef.current,
        researchContext: research.context,
        facts,
        intelligenceLevel,
        again,
        view,
        projection,
        viewMode,
        continuationTurnId,
        startedAt,
        createTurnId,
      });
      if (!prepared) return { ok: false, error: "question_required" };
      const { request, turn, contextSnapshot } = prepared;
      dispatch({ type: "turn_started", turn, contextSnapshot });
      turnStarted = true;
      // The only AI boundary in this module: an explicit submit action.
      const rawResponse = await transport(request);
      if (!mountedRef.current) return { ok: false, error: "session_unmounted" };
      const completedAt = clock();
      const response = submission.normalizeRazielResponse(rawResponse, request.intelligenceLevel);
      if (!response) {
        dispatch({ type: "turn_failed", completedAt, error: "unavailable" });
        return { ok: false, error: "unavailable" };
      }
      const provenance = submission.createRazielProvenance({ response: rawResponse, turn, completedAt });
      dispatch(submission.createRazielTurnSucceededAction({
        state: stateRef.current,
        response,
        provenance,
        completedAt,
      }));
      return { ok: true, response, provenance };
    } catch {
      const completedAt = clock();
      if (mountedRef.current) {
        dispatch({
          type: turnStarted ? "turn_failed" : "request_failed",
          completedAt,
          error: "transport_failed",
        });
      }
      return { ok: false, error: "transport_failed" };
    } finally {
      inFlightRef.current = false;
    }
  }, [clock, createTurnId, research.context, transport]);

  const setViewMode = useCallback((viewMode) => {
    dispatch({ type: "view_mode_set", viewMode });
  }, []);

  const value = useMemo(() => ({
    ...state,
    submit,
    setViewMode,
  }), [state, submit, setViewMode]);

  return (
    <RazielSessionContext2029.Provider value={value}>
      {children}
    </RazielSessionContext2029.Provider>
  );
}
