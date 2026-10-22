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
import { runPersonalGematriaPair } from "./personalGematriaPairClient.js";
import { researchEntitiesFromResultBundle } from "./researchResultWorkspaceAdapter.js";

const RazielSessionContext2029 = createContext(null);
const systemClock = () => new Date().toISOString();
const systemTurnId = () => globalThis.crypto?.randomUUID?.() || `raziel-${Date.now()}`;
const NO_PAIR_PREVIEW_EXPRESSIONS = Object.freeze([]);

export function useRazielSession2029() {
  const session = useContext(RazielSessionContext2029);
  if (!session) throw new Error("useRazielSession2029 must be used inside RazielSessionProvider2029");
  return session;
}

// Headless provider mounted once above the 2029 routes. Both desktop and mobile projections consume
// this same temporary instance; durable research state continues to belong to ResearchProvider.
export function RazielSessionProvider2029({
  children,
  transport = askRaziel,
  pairTransport = runPersonalGematriaPair,
  personalResearchAvailable = false,
  personalResearchPreview = false,
  personalPairPreviewExpressions = NO_PAIR_PREVIEW_EXPRESSIONS,
  clock = systemClock,
  createTurnId = systemTurnId,
}) {
  const research = useResearch();
  const [state, dispatch] = useReducer(razielSessionReducer, undefined, createInitialRazielSessionState);
  const stateRef = useRef(state);
  const inFlightRef = useRef(false);
  const mountedRef = useRef(true);
  const researchRef = useRef(research);
  stateRef.current = state;
  researchRef.current = research;

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

  const updatePersonalPairDraft = useCallback((field, value) => {
    dispatch({ type: "personal_pair_draft", field, value });
  }, []);

  const runPersonalPair = useCallback(async ({ projection = null } = {}) => {
    if (!personalResearchAvailable) return { ok: false, error: "authentication_required" };
    if (inFlightRef.current || stateRef.current.busy) return { ok: false, error: "turn_pending" };
    const pair = stateRef.current.personalPair?.draft || {};
    const startedAt = clock();
    const turn = {
      id: createTurnId(),
      projection: projection === "mobile" ? "mobile" : projection === "desktop" ? "desktop" : null,
      startedAt,
    };
    const expressions = [String(pair.left || "").trim(), String(pair.right || "").trim()];
    inFlightRef.current = true;
    dispatch({ type: "personal_pair_started", turn, expressions });
    try {
      const result = await pairTransport({ left: pair.left, right: pair.right });
      if (!mountedRef.current) return { ok: false, error: "session_unmounted" };
      const completedAt = clock();
      if (!result?.ok) {
        const error = result?.error || (result?.outcome === "failed" ? "engine_failed" : "research_unavailable");
        dispatch({ type: "personal_pair_failed", completedAt, error, traceId: result?.traceId });
        return { ok: false, error, outcome: result?.outcome || "error" };
      }
      dispatch({ type: "personal_pair_succeeded", completedAt, result });
      return result;
    } catch {
      const completedAt = clock();
      if (mountedRef.current) dispatch({ type: "personal_pair_failed", completedAt, error: "transport_failed" });
      return { ok: false, error: "transport_failed" };
    } finally {
      inFlightRef.current = false;
    }
  }, [clock, createTurnId, pairTransport, personalResearchAvailable]);

  const addPersonalPairFinding = useCallback((findingId) => {
    const pair = stateRef.current.personalPair;
    if (!pair?.bundle || pair.previewFixture || !findingId) {
      return { ok: false, error: pair?.previewFixture ? "preview_fixture" : "finding_unavailable" };
    }
    const selected = researchEntitiesFromResultBundle(pair.bundle, [findingId]);
    if (selected.truncated || selected.missingIds.length !== 0
        || selected.selectedIds.length !== 1 || selected.entities.length !== 1) {
      return { ok: false, error: "finding_unavailable" };
    }
    const entity = selected.entities[0];
    const current = researchRef.current;
    if ((current.cart || []).some((item) => item?.type === entity.type && item?.id === entity.id)) {
      return { ok: true, alreadyAdded: true, entity };
    }
    return current.addToResearch?.(entity) === true
      ? { ok: true, entity }
      : { ok: false, error: "research_commit_failed" };
  }, []);

  const personalPairFindingId = state.personalPair?.bundle?.findings?.[0]?.id || null;
  const personalPairFindingAdded = Boolean(personalPairFindingId && (research.cart || []).some(
    (item) => item?.type === "finding" && item?.id === personalPairFindingId,
  ));

  const value = useMemo(() => ({
    ...state,
    currentContext,
    researchPreview,
    personalResearchAvailable,
    personalResearchPreview,
    personalPairPreviewExpressions,
    personalPairFindingAdded,
    submit,
    updatePersonalPairDraft,
    runPersonalPair,
    addPersonalPairFinding,
    resetTemporarySession,
  }), [
    state,
    currentContext,
    researchPreview,
    personalResearchAvailable,
    personalResearchPreview,
    personalPairPreviewExpressions,
    personalPairFindingAdded,
    submit,
    updatePersonalPairDraft,
    runPersonalPair,
    addPersonalPairFinding,
    resetTemporarySession,
  ]);

  return (
    <RazielSessionContext2029.Provider value={value}>
      {children}
    </RazielSessionContext2029.Provider>
  );
}
