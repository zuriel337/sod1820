import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import { emit, EVENTS } from "./eventBus.js";
import { normalizeResearchContext, mergeResearchContext } from "./researchContext.js";
import {
  applyResearchOps,
  appendResearchOp,
  emptyResearchState,
  entityRef,
  makeResearchOp,
  normalizeResearchState,
  principalContextKey,
  principalStateKey,
  principalToken,
} from "./researchSyncState.js";
import { useAuth } from "../AuthContext.jsx";
import { applyCloudResearchOps, getCloudResearch } from "../auth.js";
import { trackResearch } from "../tracking.js";
import { signalAiBehavior } from "../supabase.js";

const Ctx = createContext(null);
export const useResearch = () => useContext(Ctx) || {};

const EMPTY = emptyResearchState();

function loadPrincipalState(principal) {
  try {
    const raw = JSON.parse(localStorage.getItem(principalStateKey(principal)) || "null") || {};
    return {
      ...normalizeResearchState(raw),
      mode: raw.mode === "discovery" ? "discovery" : "reader",
      pendingOps: Array.isArray(raw.pendingOps) ? raw.pendingOps : [],
    };
  } catch {
    return { ...EMPTY, mode: "reader", pendingOps: [] };
  }
}

function persistPrincipalState(principal, state) {
  if (!principal) return;
  try { localStorage.setItem(principalStateKey(principal), JSON.stringify(state)); } catch { /* noop */ }
}

function loadSessionContext(principal) {
  if (!principal) return null;
  try { return normalizeResearchContext(JSON.parse(sessionStorage.getItem(principalContextKey(principal)) || "null")); }
  catch { return null; }
}

function persistSessionContext(principal, context) {
  if (!principal) return;
  try {
    const key = principalContextKey(principal);
    if (context) sessionStorage.setItem(key, JSON.stringify(context));
    else sessionStorage.removeItem(key);
  } catch { /* noop */ }
}

function numberRouteSelection(pathname) {
  const match = String(pathname || "").match(/^\/number\/([^/?#]+)/);
  if (!match) return null;
  let key = match[1];
  try { key = decodeURIComponent(key); } catch { /* keep raw key */ }
  key = String(key || "").trim();
  if (!key) return null;
  const numeric = /^\d+$/.test(key) && Number.isSafeInteger(Number(key));
  const id = numeric ? String(Number(key)) : key;
  return {
    subject: { id, type: numeric ? "number" : "phrase", label: id, href: `/number/${encodeURIComponent(id)}` },
    selection: { entityId: id, entityType: numeric ? "number" : "phrase" },
  };
}

function itemDeleteOp(bucket, entity) {
  const ref = entityRef(entity);
  const type = String(entity?.type || "").trim();
  if (!type || !ref) return null;
  return makeResearchOp("item_delete", { bucket, entity_type: type, entity_ref: ref });
}

export default function ResearchProvider({ children }) {
  const { pathname } = useLocation();
  const { user, loading: authLoading } = useAuth();
  const principal = authLoading ? null : principalToken(user?.id || null);

  const [cart, setCart] = useState([]);
  const [saved, setSaved] = useState([]);
  const [pinned, setPinned] = useState([]);
  const [history, setHistory] = useState([]);
  const [collections, setCollections] = useState([]);
  const [journeys, setJourneys] = useState([]);
  // Active Research Context is tab/session state. Cloud/local copies are durable last snapshots only.
  const [context, setContextState] = useState(null);
  const [mode, setModeState] = useState("reader");
  const [pendingOps, setPendingOps] = useState([]);
  const [hydratedPrincipal, setHydratedPrincipal] = useState(null);
  const [cloudReady, setCloudReady] = useState(false);
  const [cloudHydrationRevision, setCloudHydrationRevision] = useState(0);

  const principalRef = useRef(null);
  const pendingOpsRef = useRef([]);
  const hydrationSeq = useRef(0);

  const installWorkspaceState = useCallback((state) => {
    const s = normalizeResearchState(state);
    setCart(s.cart);
    setSaved(s.saved);
    setPinned(s.pinned);
    setHistory(s.history);
    setCollections(s.collections);
    setJourneys(s.journeys);
  }, []);

  const enqueueOp = useCallback((op) => {
    const p = principalRef.current;
    // Guest research stays local and isolated. It is never silently adopted into a future account.
    if (!p || !p.startsWith("user:") || !op?.kind) return;
    setPendingOps(prev => {
      const next = appendResearchOp(prev, op);
      pendingOpsRef.current = next;
      return next;
    });
  }, []);

  const queueContextSnapshot = useCallback((next) => {
    enqueueOp(makeResearchOp("context_set", { context: next ?? null }));
  }, [enqueueOp]);

  // Principal boundary: load only that principal's browser partition. The legacy unscoped v1 key
  // remains preserved in storage as recoverable provenance but is never auto-adopted by guest or account.
  useEffect(() => {
    if (!principal) return;
    let alive = true;
    const seq = ++hydrationSeq.current;
    const expectedUserId = user?.id || null;
    principalRef.current = principal;
    setHydratedPrincipal(null);
    setCloudReady(false);

    const local = loadPrincipalState(principal);
    pendingOpsRef.current = local.pendingOps;
    setPendingOps(local.pendingOps);
    installWorkspaceState(local);
    setModeState(local.mode);
    const sessionContext = loadSessionContext(principal);
    setContextState(sessionContext);
    emit(EVENTS.RESEARCH_CONTEXT_CHANGE, sessionContext);
    setHydratedPrincipal(principal);

    if (!expectedUserId) {
      setCloudHydrationRevision(v => v + 1);
      return () => { alive = false; };
    }

    getCloudResearch(expectedUserId).then(cloud => {
      if (!alive || hydrationSeq.current !== seq || principalRef.current !== principal) return;
      // Pending operations are the only local mutations allowed to travel into an account.
      // Replaying them over the fresh cloud snapshot prevents a stale browser snapshot from winning.
      const merged = applyResearchOps(cloud, pendingOpsRef.current);
      installWorkspaceState(merged);
      setCloudReady(true);
      setCloudHydrationRevision(v => v + 1);
    }).catch(() => {
      if (!alive || hydrationSeq.current !== seq || principalRef.current !== principal) return;
      // Fail closed: keep this principal's local partition, never reinterpret read failure as empty cloud.
      setCloudReady(false);
      setCloudHydrationRevision(v => v + 1);
    });

    return () => { alive = false; };
  }, [principal, user?.id, installWorkspaceState]);

  // Persist only after the principal-specific partition has been installed.
  useEffect(() => {
    if (!principal || hydratedPrincipal !== principal) return;
    persistPrincipalState(principal, {
      cart, saved, pinned, history, collections, journeys, context, mode, pendingOps,
    });
  }, [principal, hydratedPrincipal, cart, saved, pinned, history, collections, journeys, context, mode, pendingOps]);

  useEffect(() => {
    if (!principal || hydratedPrincipal !== principal) return;
    persistSessionContext(principal, context);
  }, [principal, hydratedPrincipal, context]);

  // Flush explicit semantic operations only. A failed batch remains queued locally and is replay-safe;
  // there is no delete-by-absence reconciliation and no account id is trusted from browser state.
  useEffect(() => {
    if (!user?.id || !cloudReady || hydratedPrincipal !== principal || !pendingOps.length) return;
    const expectedUserId = user.id;
    const expectedPrincipal = principal;
    const batch = pendingOps.slice(0, 100);
    const sentIds = new Set(batch.map(op => op?.op_id).filter(Boolean));
    let alive = true;
    const t = setTimeout(() => {
      applyCloudResearchOps(expectedUserId, batch).then(() => {
        if (!alive || principalRef.current !== expectedPrincipal) return;
        setPendingOps(prev => {
          const next = prev.filter(op => !sentIds.has(op?.op_id));
          pendingOpsRef.current = next;
          return next;
        });
      }).catch(() => {
        // Keep the exact operations queued. No local state is erased and no destructive fallback runs.
      });
    }, 350);
    return () => { alive = false; clearTimeout(t); };
  }, [user?.id, principal, cloudReady, hydratedPrincipal, pendingOps]);

  const logHistory = useCallback((entity) => {
    if (!entity || !entity.id) return;
    const rec = { ...entity, t: Date.now() };
    setHistory(h => [rec, ...h.filter(e => e.id !== entity.id)].slice(0, 50));
    enqueueOp(makeResearchOp("history_add", { entity: rec }));
  }, [enqueueOp]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    enqueueOp(makeResearchOp("history_clear"));
  }, [enqueueOp]);

  const setResearchContext = useCallback((next) => {
    setContextState((prev) => {
      const value = typeof next === "function" ? next(prev) : next;
      const normalized = value == null ? null : mergeResearchContext(null, value);
      emit(EVENTS.RESEARCH_CONTEXT_CHANGE, normalized);
      queueContextSnapshot(normalized);
      return normalized;
    });
  }, [queueContextSnapshot]);

  const updateResearchContext = useCallback((patch) => {
    setContextState((prev) => {
      const normalized = mergeResearchContext(prev, patch);
      emit(EVENTS.RESEARCH_CONTEXT_CHANGE, normalized);
      queueContextSnapshot(normalized);
      return normalized;
    });
  }, [queueContextSnapshot]);

  const clearResearchContext = useCallback(() => {
    if (principalRef.current) persistSessionContext(principalRef.current, null);
    setContextState(null);
    queueContextSnapshot(null);
    emit(EVENTS.RESEARCH_CONTEXT_CHANGE, null);
  }, [queueContextSnapshot]);

  useEffect(() => {
    const route = numberRouteSelection(pathname);
    if (!route) return;
    setContextState((prev) => {
      const current = normalizeResearchContext(prev);
      const sameSelection = current?.selection?.entityId === route.selection.entityId
        && current?.selection?.entityType === route.selection.entityType
        && current?.lens === "number";
      if (current?.subject && sameSelection) return prev;
      const next = current?.subject
        ? mergeResearchContext(current, { selection: route.selection, lens: "number" })
        : mergeResearchContext(null, { subject: route.subject, selection: route.selection, lens: "number" });
      emit(EVENTS.RESEARCH_CONTEXT_CHANGE, next);
      queueContextSnapshot(next);
      return next;
    });
  }, [pathname, cloudHydrationRevision, queueContextSnapshot]);

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
        queueContextSnapshot(next);
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
  }, [logHistory, queueContextSnapshot]);

  const addToResearch = useCallback((entity) => {
    if (!entity?.id) return;
    setCart(c => (c.some(e => e.id === entity.id) ? c : [...c, entity]));
    enqueueOp(makeResearchOp("item_upsert", { bucket: "cart", entity }));
    logHistory(entity);
    emit(EVENTS.RESEARCH_ADD, entity);
    trackResearch("add", { type: entity.type });
    signalAiBehavior("research");
  }, [enqueueOp, logHistory]);

  const removeFromResearch = useCallback((id) => {
    const target = cart.find(e => e.id === id);
    const op = itemDeleteOp("cart", target);
    if (op) enqueueOp(op);
    setCart(c => c.filter(e => e.id !== id));
  }, [cart, enqueueOp]);

  const clearResearch = useCallback(() => {
    setCart([]);
    enqueueOp(makeResearchOp("item_clear_bucket", { bucket: "cart" }));
    emit(EVENTS.RESEARCH_CLEAR);
  }, [enqueueOp]);

  const saveItem = useCallback((entity) => {
    if (!entity?.id) return;
    setSaved(s => (s.some(e => e.id === entity.id) ? s : [entity, ...s]));
    enqueueOp(makeResearchOp("item_upsert", { bucket: "library", entity }));
    logHistory(entity);
    emit(EVENTS.ITEM_SAVE, entity);
    trackResearch("save", { type: entity.type });
  }, [enqueueOp, logHistory]);

  const removeSaved = useCallback((id) => {
    const target = saved.find(e => e.id === id);
    const op = itemDeleteOp("library", target);
    if (op) enqueueOp(op);
    setSaved(s => s.filter(e => e.id !== id));
  }, [saved, enqueueOp]);

  const togglePin = useCallback((entity) => {
    if (!entity?.id) return;
    const on = pinned.some(e => e.id === entity.id);
    setPinned(p => on ? p.filter(e => e.id !== entity.id) : [entity, ...p]);
    if (on) {
      const op = itemDeleteOp("pinned", entity);
      if (op) enqueueOp(op);
      emit(EVENTS.PIN_REMOVE, entity);
    } else {
      enqueueOp(makeResearchOp("item_upsert", { bucket: "pinned", entity }));
      emit(EVENTS.PIN_ADD, entity);
    }
  }, [pinned, enqueueOp]);

  const isPinned = useCallback((id) => pinned.some(e => e.id === id), [pinned]);

  const addCollection = useCallback((name, meta) => {
    const id = "c" + Date.now();
    const { topic, world, number, year } = meta || {};
    const rec = {
      id, name: (name || "אוסף").trim(),
      topic: topic || null, world: world || null,
      number: (number || number === 0) ? Number(number) : null,
      year: (year || year === 0) ? Number(year) : null,
    };
    setCollections(cs => [...cs, rec]);
    enqueueOp(makeResearchOp("collection_add", { collection: rec }));
    return id;
  }, [enqueueOp]);

  const updateCollection = useCallback((id, patch) => {
    setCollections(cs => cs.map(c => (c.id === id ? { ...c, ...patch } : c)));
    enqueueOp(makeResearchOp("collection_update", { id, patch: patch || {} }));
  }, [enqueueOp]);

  const removeCollection = useCallback((id) => {
    setCollections(cs => cs.filter(c => c.id !== id));
    setSaved(s => s.map(e => (e.coll === id ? { ...e, coll: undefined } : e)));
    enqueueOp(makeResearchOp("collection_remove", { id }));
  }, [enqueueOp]);

  const assignCollection = useCallback((itemId, collId) => {
    const target = saved.find(e => e.id === itemId);
    setSaved(s => s.map(e => (e.id === itemId ? { ...e, coll: collId || undefined } : e)));
    const ref = entityRef(target);
    const type = String(target?.type || "").trim();
    if (type && ref) enqueueOp(makeResearchOp("collection_assign", {
      entity_type: type,
      entity_ref: ref,
      coll_id: collId || null,
    }));
  }, [saved, enqueueOp]);

  const addJourney = useCallback((j) => {
    if (!j || j.root == null) return;
    const rec = { id: "j" + j.root, root: j.root, path: j.path || [], world: j.world || null, msg: j.msg || null, t: Date.now() };
    setJourneys(js => [rec, ...js.filter(x => x.root !== j.root)].slice(0, 30));
    enqueueOp(makeResearchOp("journey_add", { journey: rec }));
    trackResearch("journey", { root: j.root });
  }, [enqueueOp]);

  const removeJourney = useCallback((id) => {
    setJourneys(js => js.filter(j => j.id !== id));
    enqueueOp(makeResearchOp("journey_remove", { id }));
  }, [enqueueOp]);

  const clearJourneys = useCallback(() => {
    setJourneys([]);
    enqueueOp(makeResearchOp("journey_clear"));
  }, [enqueueOp]);

  const setMode = useCallback((m) => setModeState(m === "discovery" ? "discovery" : "reader"), []);
  const enterDiscovery = useCallback(() => setModeState("discovery"), []);
  const toggleMode = useCallback(() => setModeState(m => (m === "discovery" ? "reader" : "discovery")), []);

  const value = {
    cart, saved, pinned, history, collections, journeys, context,
    addToResearch, removeFromResearch, clearResearch, saveItem, removeSaved, togglePin, isPinned,
    logHistory, clearHistory, addCollection, updateCollection, removeCollection, assignCollection,
    addJourney, removeJourney, clearJourneys,
    setResearchContext, updateResearchContext, clearResearchContext,
    mode, setMode, enterDiscovery, toggleMode,
    syncState: {
      principal: principal || null,
      cloudReady: Boolean(user?.id && cloudReady),
      pending: pendingOps.length,
      hydrated: Boolean(principal && hydratedPrincipal === principal),
    },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
