import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import { emit, EVENTS } from "./eventBus.js";
import { normalizeResearchContext, mergeResearchContext } from "./researchContext.js";
import { parseNumberExpressionFocus } from "./numberExpressionFocus.js";
import {
  contextFromResearchPathSnapshot,
  getLatestResearchPath,
  isResearchPathId,
  resumeHrefFromResearchPath,
  saveResearchPathSnapshot,
} from "./researchPathRuntime.js";
import { useAuth } from "../AuthContext.jsx";
import { getCloudResearch, saveCloudResearch } from "../auth.js";
import { trackResearch } from "../tracking.js";
import { signalAiBehavior } from "../supabase.js";

const KEY = "sod_research_v1";
const CONTEXT_SESSION_KEY = "sod_research_context_session_v1";
const MODE_ROLLOUT_KEY = "sod_mode_rollout_v1";
const Ctx = createContext(null);
export const useResearch = () => useContext(Ctx) || {};

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}

function loadSessionContext() {
  try { return normalizeResearchContext(JSON.parse(sessionStorage.getItem(CONTEXT_SESSION_KEY) || "null")); }
  catch { return null; }
}

function persistSessionContext(context) {
  try {
    if (context) sessionStorage.setItem(CONTEXT_SESSION_KEY, JSON.stringify(context));
    else sessionStorage.removeItem(CONTEXT_SESSION_KEY);
  } catch { /* noop */ }
}

function initialMode(init) {
  try {
    if (localStorage.getItem(MODE_ROLLOUT_KEY) !== "1") {
      const returning = localStorage.getItem(KEY) != null;
      localStorage.setItem(MODE_ROLLOUT_KEY, "1");
      if (returning) return "discovery";
    }
  } catch { /* noop */ }
  return init.mode === "discovery" ? "discovery" : "reader";
}

function numberRouteSelection(pathname, search = "") {
  const match = String(pathname || "").match(/^\/(2029\/)?number\/([^/?#]+)/);
  if (!match) return null;
  const native2029 = Boolean(match[1]);
  let key = match[2];
  try { key = decodeURIComponent(key); } catch { /* keep raw key */ }
  key = String(key || "").trim();
  if (!key) return null;
  const numeric = /^\d+$/.test(key) && Number.isSafeInteger(Number(key));
  const id = numeric ? String(Number(key)) : key;
  const focus = native2029 && numeric
    ? parseNumberExpressionFocus(search)
    : { expression: null, method: null, crossingPartner: null, explicit: false };
  return {
    subject: {
      id,
      type: numeric ? "number" : "phrase",
      label: id,
      href: `${native2029 ? "/2029" : ""}/number/${encodeURIComponent(id)}${native2029 ? search || "" : ""}`,
    },
    selection: {
      entityId: id,
      entityType: numeric ? "number" : "phrase",
      expression: focus.expression,
      method: focus.method,
      resultValue: numeric ? Number(id) : null,
      focusKind: focus.crossingPartner ? "crossing" : focus.expression ? "expression" : null,
      crossingPartner: focus.crossingPartner,
    },
    focusExplicit: focus.explicit,
  };
}

export default function ResearchProvider({ children }) {
  const { pathname, search } = useLocation();
  const init = load();
  const [cart, setCart] = useState(() => init.cart || []);
  const [saved, setSaved] = useState(() => init.saved || []);
  const [pinned, setPinned] = useState(() => init.pinned || []);
  const [history, setHistory] = useState(() => init.history || []);
  const [collections, setCollections] = useState(() => init.collections || []);
  const [journeys, setJourneys] = useState(() => init.journeys || []);
  // Active Research Context is tab/session navigation state. Local/cloud context remains only a durable last snapshot.
  const [context, setContextState] = useState(loadSessionContext);
  const [cloudHydrationRevision, setCloudHydrationRevision] = useState(0);
  const [pathResume, setPathResume] = useState({ loading: false, latest: null, error: null });
  const [mode, setModeState] = useState(() => initialMode(init));

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify({ cart, saved, pinned, history, collections, journeys, context, mode })); } catch { /* noop */ }
  }, [cart, saved, pinned, history, collections, journeys, context, mode]);

  useEffect(() => { persistSessionContext(context); }, [context]);

  const { user } = useAuth();
  const pulled = useRef(false);
  const previousUserId = useRef(user?.id || null);

  // Logout/account switch ends only the active Context. Saved/workspace state is untouched.
  useEffect(() => {
    const prev = previousUserId.current;
    const next = user?.id || null;
    if (prev && prev !== next) {
      setContextState(null);
      persistSessionContext(null);
      setPathResume({ loading: false, latest: null, error: null });
      emit(EVENTS.RESEARCH_CONTEXT_CHANGE, null);
    }
    previousUserId.current = next;
  }, [user?.id]);

  // Cloud owns durable user state, but may never overwrite the active tab's Research Context.
  // d.context is intentionally treated as a last-session snapshot for future explicit resume, not auto-activation.
  useEffect(() => {
    pulled.current = false;
    if (!user) return;
    let alive = true;
    getCloudResearch(user.id).then(d => {
      if (!alive) return;
      const has = d && ((d.cart && d.cart.length) || (d.saved && d.saved.length) || (d.pinned && d.pinned.length) || (d.history && d.history.length) || (d.collections && d.collections.length) || (d.journeys && d.journeys.length) || d.context);
      if (has) {
        if (Array.isArray(d.cart)) setCart(d.cart);
        if (Array.isArray(d.saved)) setSaved(d.saved);
        if (Array.isArray(d.pinned)) setPinned(d.pinned);
        if (Array.isArray(d.history)) setHistory(d.history);
        if (Array.isArray(d.collections)) setCollections(d.collections);
        if (Array.isArray(d.journeys)) setJourneys(d.journeys);
      } else {
        saveCloudResearch(user.id, { cart, saved, pinned, history, collections, journeys, context }).catch(() => {});
      }
      pulled.current = true;
      setCloudHydrationRevision(v => v + 1);
    }).catch(() => {
      pulled.current = true;
      if (alive) setCloudHydrationRevision(v => v + 1);
    });
    return () => { alive = false; };
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Path resumability is a separate explicit continuity projection. Loading the
  // latest saved Path NEVER activates it; only resumeResearchPath() may replace
  // the active session Context.
  useEffect(() => {
    let alive = true;
    if (!user?.id) {
      setPathResume({ loading: false, latest: null, error: null });
      return () => { alive = false; };
    }
    setPathResume((state) => ({ ...state, loading: true, error: null }));
    getLatestResearchPath().then((snapshot) => {
      if (!alive) return;
      if (snapshot?.ok) setPathResume({ loading: false, latest: snapshot, error: null });
      else setPathResume({ loading: false, latest: null, error: snapshot?.error || null });
    }).catch((error) => {
      if (alive) setPathResume({ loading: false, latest: null, error: error?.message || "research_path_unavailable" });
    });
    return () => { alive = false; };
  }, [user?.id]);

  useEffect(() => {
    if (!user || !pulled.current) return;
    const t = setTimeout(() => { saveCloudResearch(user.id, { cart, saved, pinned, history, collections, journeys, context }).catch(() => {}); }, 700);
    return () => clearTimeout(t);
  }, [user, cart, saved, pinned, history, collections, journeys, context]);

  const logHistory = useCallback((entity) => {
    if (!entity || !entity.id) return;
    setHistory(h => [{ ...entity, t: Date.now() }, ...h.filter(e => e.id !== entity.id)].slice(0, 50));
  }, []);
  const clearHistory = useCallback(() => setHistory([]), []);

  const setResearchContext = useCallback((next) => {
    setContextState((prev) => {
      const value = typeof next === "function" ? next(prev) : next;
      const normalized = value == null ? null : mergeResearchContext(null, value);
      emit(EVENTS.RESEARCH_CONTEXT_CHANGE, normalized);
      return normalized;
    });
  }, []);
  const updateResearchContext = useCallback((patch) => {
    setContextState((prev) => {
      const normalized = mergeResearchContext(prev, patch);
      emit(EVENTS.RESEARCH_CONTEXT_CHANGE, normalized);
      return normalized;
    });
  }, []);
  const clearResearchContext = useCallback(() => {
    persistSessionContext(null);
    setContextState(null);
    emit(EVENTS.RESEARCH_CONTEXT_CHANGE, null);
  }, []);

  useEffect(() => {
    const route = numberRouteSelection(pathname, search);
    if (!route) return;
    setContextState((prev) => {
      const current = normalizeResearchContext(prev);
      const sameSelection = current?.selection?.entityId === route.selection.entityId
        && current?.selection?.entityType === route.selection.entityType
        && (current?.selection?.expression || null) === (route.selection.expression || null)
        && (current?.selection?.method || null) === (route.selection.method || null)
        && (current?.selection?.crossingPartner || null) === (route.selection.crossingPartner || null)
        && current?.lens === "number";
      if (current?.subject && sameSelection) return prev;
      const focusDimensions = { expressionFocusExplicit: Boolean(route.focusExplicit) };
      const next = current?.subject
        ? mergeResearchContext(current, { subject: route.subject, selection: route.selection, lens: "number", dimensions: focusDimensions })
        : mergeResearchContext(null, { subject: route.subject, selection: route.selection, lens: "number", dimensions: focusDimensions });
      emit(EVENTS.RESEARCH_CONTEXT_CHANGE, next);
      return next;
    });
  }, [pathname, search, cloudHydrationRevision]);

  const lastElsHistorySig = useRef(null);
  useEffect(() => {
    const onElsState = (e) => {
      if (e.origin !== window.location.origin) return;
      const d = e.data;
      if (!d || d.source !== "tzofen" || d.type !== "state" || d.status !== "ok") return;
      const term = String(d?.axis?.term || d?.axis?.t || d?.term || d?.query || d?.raw || "").trim();
      if (!term) return;
      const scope = d?.provenance?.scope || d?.scope || "torah";
      const skip = Number(d?.axis?.skip || 0);
      const hitId = d?.axis?.hitId ?? d?.occurrence?.index ?? 0;
      const searchKind = d?.provenance?.searchKind || d?.kind || "regular";
      const sig = `${scope}|${term}|${searchKind}|${hitId}|${skip}`;
      if (lastElsHistorySig.current === sig) return;
      lastElsHistorySig.current = sig;

      const locator = `els:${scope}:${term}:${searchKind}:${hitId}:${skip}`;
      const elsSelection = { entityType: "els", locator };
      setContextState((prev) => {
        const current = normalizeResearchContext(prev);
        const sameSelection = current?.selection?.entityType === "els"
          && current?.selection?.locator === locator
          && current?.lens === "els";
        if (current?.subject && sameSelection) return prev;
        const directSubject = {
          id: term,
          type: "phrase",
          label: term,
          href: `/research?tool=els&q=${encodeURIComponent(term)}`,
        };
        const next = current?.subject
          ? mergeResearchContext(current, { selection: elsSelection, lens: "els" })
          : mergeResearchContext(null, { subject: directSubject, selection: elsSelection, lens: "els" });
        emit(EVENTS.RESEARCH_CONTEXT_CHANGE, next);
        return next;
      });

      logHistory({
        id: `els:${encodeURIComponent(scope)}:${encodeURIComponent(term)}:${encodeURIComponent(searchKind)}:${hitId}:${skip}`,
        type: "els",
        title: `ELS · ${term}`,
        label: term,
        term,
        scope,
        skip,
        searchKind,
        href: `/lab/els?q=${encodeURIComponent(term)}`,
        metadata: {
          engine: "tzofen",
          corpus: scope,
          hitId,
          skip,
          searchKind,
          findingCount: Array.isArray(d.findings) ? d.findings.length : 0,
          matrixVersion: d?.matrix?.v || null,
        },
      });
    };
    window.addEventListener("message", onElsState);
    return () => window.removeEventListener("message", onElsState);
  }, [logHistory]);

  const addToResearch = useCallback((entity) => {
    setCart(c => (c.some(e => e.id === entity.id) ? c : [...c, entity]));
    logHistory(entity);
    emit(EVENTS.RESEARCH_ADD, entity);
    trackResearch("add", { type: entity.type });
    signalAiBehavior("research");
  }, [logHistory]);
  const removeFromResearch = useCallback((id) => setCart(c => c.filter(e => e.id !== id)), []);
  const clearResearch = useCallback(() => { setCart([]); emit(EVENTS.RESEARCH_CLEAR); }, []);

  const saveItem = useCallback((entity) => {
    setSaved(s => (s.some(e => e.id === entity.id) ? s : [entity, ...s]));
    logHistory(entity);
    emit(EVENTS.ITEM_SAVE, entity);
    trackResearch("save", { type: entity.type });
  }, [logHistory]);
  const removeSaved = useCallback((id) => setSaved(s => s.filter(e => e.id !== id)), []);

  const togglePin = useCallback((entity) => {
    setPinned(p => {
      const on = p.some(e => e.id === entity.id);
      const next = on ? p.filter(e => e.id !== entity.id) : [entity, ...p];
      emit(on ? EVENTS.PIN_REMOVE : EVENTS.PIN_ADD, entity);
      return next;
    });
  }, []);
  const isPinned = useCallback((id) => pinned.some(e => e.id === id), [pinned]);

  const addCollection = useCallback((name, meta) => {
    const id = "c" + Date.now();
    const { topic, world, number, year } = meta || {};
    setCollections(cs => [...cs, {
      id, name: (name || "אוסף").trim(),
      topic: topic || null, world: world || null,
      number: (number || number === 0) ? Number(number) : null,
      year: (year || year === 0) ? Number(year) : null,
    }]);
    return id;
  }, []);
  const updateCollection = useCallback((id, patch) => {
    setCollections(cs => cs.map(c => (c.id === id ? { ...c, ...patch } : c)));
  }, []);
  const removeCollection = useCallback((id) => {
    setCollections(cs => cs.filter(c => c.id !== id));
    setSaved(s => s.map(e => (e.coll === id ? { ...e, coll: undefined } : e)));
  }, []);
  const assignCollection = useCallback((itemId, collId) => {
    setSaved(s => s.map(e => (e.id === itemId ? { ...e, coll: collId || undefined } : e)));
  }, []);

  const addJourney = useCallback((j) => {
    if (!j || j.root == null) return;
    const rec = { id: "j" + j.root, root: j.root, path: j.path || [], world: j.world || null, msg: j.msg || null, t: Date.now() };
    setJourneys(js => [rec, ...js.filter(x => x.root !== j.root)].slice(0, 30));
    trackResearch("journey", { root: j.root });
  }, []);
  const removeJourney = useCallback((id) => setJourneys(js => js.filter(j => j.id !== id)), []);
  const clearJourneys = useCallback(() => setJourneys([]), []);

  const saveCurrentResearchPath = useCallback(async ({ href = null, label = null, surface = null } = {}) => {
    if (!user?.id) return { ok: false, error: "authentication_required" };
    const current = normalizeResearchContext(context);
    if (!current?.subject) return { ok: false, error: "no_research_context" };

    const activePathId = current.journey?.kind === "research_path" && isResearchPathId(current.journey?.id)
      ? current.journey.id
      : null;
    const expectedRevisionNo = activePathId && Number.isInteger(current.journey?.revisionNo)
      ? current.journey.revisionNo
      : null;

    setPathResume((state) => ({ ...state, loading: true, error: null }));
    const result = await saveResearchPathSnapshot({
      context: current,
      href,
      label,
      surface,
      pathId: activePathId,
      expectedRevisionNo,
    });

    if (!result?.ok) {
      setPathResume((state) => ({ ...state, loading: false, error: result?.error || "save_failed" }));
      return result;
    }

    const position = Math.max(0, (Array.isArray(result.steps) ? result.steps.length : 1) - 1);
    setContextState((prev) => {
      const next = mergeResearchContext(prev, {
        journey: {
          id: result.path_id,
          kind: "research_path",
          position,
          revisionId: result.revision_id,
          revisionNo: result.revision_no,
        },
      });
      emit(EVENTS.RESEARCH_CONTEXT_CHANGE, next);
      return next;
    });
    setPathResume({ loading: false, latest: result, error: null });
    trackResearch("path_save", { revision: result.revision_no, surface: surface || null });
    return result;
  }, [user?.id, context]);

  const resumeResearchPath = useCallback(async (pathId = null) => {
    if (!user?.id) return { ok: false, error: "authentication_required" };
    setPathResume((state) => ({ ...state, loading: true, error: null }));
    const snapshot = await getLatestResearchPath(pathId || pathResume.latest?.path_id || null);
    if (!snapshot?.ok) {
      setPathResume((state) => ({ ...state, loading: false, error: snapshot?.error || "not_found" }));
      return snapshot;
    }
    const next = contextFromResearchPathSnapshot(snapshot);
    if (!next?.subject) {
      const failure = { ok: false, error: "resume_context_unavailable", path_id: snapshot.path_id };
      setPathResume({ loading: false, latest: snapshot, error: failure.error });
      return failure;
    }

    // Explicit user action only: now restore the stored navigation state. Access
    // was intentionally stripped from the durable snapshot and must be resolved
    // again by the destination surface/current session.
    persistSessionContext(next);
    setContextState(next);
    emit(EVENTS.RESEARCH_CONTEXT_CHANGE, next);
    setPathResume({ loading: false, latest: snapshot, error: null });
    trackResearch("path_resume", { revision: snapshot.revision_no });
    return { ...snapshot, href: resumeHrefFromResearchPath(snapshot), context: next };
  }, [user?.id, pathResume.latest?.path_id]);

  const setMode = useCallback((m) => setModeState(m === "discovery" ? "discovery" : "reader"), []);
  const enterDiscovery = useCallback(() => setModeState("discovery"), []);
  const toggleMode = useCallback(() => setModeState(m => (m === "discovery" ? "reader" : "discovery")), []);

  const value = {
    cart, saved, pinned, history, collections, journeys, context, pathResume,
    addToResearch, removeFromResearch, clearResearch, saveItem, removeSaved, togglePin, isPinned,
    logHistory, clearHistory, addCollection, updateCollection, removeCollection, assignCollection,
    addJourney, removeJourney, clearJourneys,
    setResearchContext, updateResearchContext, clearResearchContext,
    saveCurrentResearchPath, resumeResearchPath,
    mode, setMode, enterDiscovery, toggleMode,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
