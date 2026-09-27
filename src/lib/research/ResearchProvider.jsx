import React, { createContext, useContext, useState, useLayoutEffect, useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../AuthContext.jsx";
import { applyCloudResearchOps, getCloudResearch } from "../auth.js";
import { trackResearch } from "../tracking.js";
import { signalAiBehavior } from "../supabase.js";
import { emit, EVENTS } from "./eventBus.js";
import { normalizeResearchContext, mergeResearchContext } from "./researchContext.js";
import { parseNumberExpressionFocus } from "./numberExpressionFocus.js";
import {
  contextFromResearchPathSnapshot,
  getLatestResearchPath,
  isResearchPathId,
  researchPathOperationKey,
  resumeHrefFromResearchPath,
  saveResearchPathSnapshot,
} from "./researchPathRuntime.js";
import { emitJourney2029, makeJourney2029InstanceKey } from "./journey2029Telemetry.js";
import { entityRef, makeResearchOp, principalToken } from "./researchSyncState.js";
import { createResearchSyncRuntime } from "./researchSyncRuntime.js";

const MODE_ROLLOUT_KEY = "sod_mode_rollout_v1";
const LEGACY_UNSCOPED_KEY = "sod_research_v1";
const Ctx = createContext(null);
export const useResearch = () => useContext(Ctx) || {};
function browserStorage(name) { try { return globalThis[name]; } catch { return null; } }
const publishContext = (context) => emit(EVENTS.RESEARCH_CONTEXT_CHANGE, context);

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
  const { user, loading } = useAuth();
  // A new account gets a new component BEFORE children render. No A-state/B-identity frame.
  // Same-account token refresh is not a new principal and keeps the research session intact.
  const principal = loading ? "auth:pending" : principalToken(user?.id);
  return (
    <PrincipalResearchProvider key={principal} userId={loading ? null : user?.id || null} disabled={!!loading}>
      {children}
    </PrincipalResearchProvider>
  );
}

function PrincipalResearchProvider({ children, userId, disabled }) {
  const { pathname, search } = useLocation();
  const [runtime] = useState(() => createResearchSyncRuntime({
    userId, disabled,
    storage: browserStorage("localStorage"), session: browserStorage("sessionStorage"),
    readCloud: getCloudResearch, writeCloud: applyCloudResearchOps, onContext: publishContext,
  }));
  const state = useSyncExternalStore(runtime.subscribe, runtime.getSnapshot, runtime.getSnapshot);
  useLayoutEffect(() => { runtime.start(); return () => runtime.stop(); }, [runtime]);
  useEffect(() => {
    const reconnect = () => { void runtime.retry(); };
    window.addEventListener("online", reconnect);
    return () => window.removeEventListener("online", reconnect);
  }, [runtime]);

  // One-time discovery-mode rollout nudge for a returning local (pre-sync) user. Applied at most
  // once per browser, and never for a fresh/guest install that never had local research state.
  useEffect(() => {
    if (disabled) return;
    try {
      const storage = browserStorage("localStorage");
      if (!storage || storage.getItem(MODE_ROLLOUT_KEY) === "1") return;
      const returning = storage.getItem(LEGACY_UNSCOPED_KEY) != null;
      storage.setItem(MODE_ROLLOUT_KEY, "1");
      if (returning) runtime.setMode("discovery");
    } catch { /* noop */ }
  }, [disabled, runtime]);

  const [pathResume, setPathResume] = useState({ loading: false, latest: null, error: null });

  const actions = useMemo(() => {
    const now = () => runtime.getSnapshot();
    const op = makeResearchOp;
    const history = (entity) => op("history_add", { entity: { ...entity, t: Date.now() } });
    function remove(bucket, key, id) {
      const e = now()[key].find((x) => x.id === id);
      return e ? runtime.commit([op("item_delete", { bucket, entity_type: e.type, entity_ref: entityRef(e) })]) : false;
    }
    function setContext(value, merge = false) {
      const current = now().context;
      const resolved = typeof value === "function" ? value(current) : value;
      const context = merge ? mergeResearchContext(current, resolved) : resolved == null ? null : mergeResearchContext(null, resolved);
      return runtime.commit([op("context_set", { context })]);
    }
    return {
      addToResearch(entity) {
        if (!entity?.id || !entity?.type) return false;
        const ok = runtime.commit([op("item_upsert", { bucket: "cart", entity }), history(entity)]);
        if (ok) { emit(EVENTS.RESEARCH_ADD, entity); trackResearch("add", { type: entity.type }); signalAiBehavior("research"); }
        return ok;
      },
      removeFromResearch: (id) => remove("cart", "cart", id),
      clearResearch() {
        const ok = runtime.commit([op("item_clear_bucket", { bucket: "cart" })]);
        if (ok) emit(EVENTS.RESEARCH_CLEAR);
        return ok;
      },
      saveItem(entity) {
        if (!entity?.id || !entity?.type) return false;
        const ok = runtime.commit([op("item_upsert", { bucket: "library", entity }), history(entity)]);
        if (ok) { emit(EVENTS.ITEM_SAVE, entity); trackResearch("save", { type: entity.type }); }
        return ok;
      },
      removeSaved: (id) => remove("library", "saved", id),
      togglePin(entity) {
        if (!entity?.id || !entity?.type) return false;
        const on = now().pinned.some((e) => e.id === entity.id);
        const ok = on ? remove("pinned", "pinned", entity.id) : runtime.commit([op("item_upsert", { bucket: "pinned", entity })]);
        if (ok) emit(on ? EVENTS.PIN_REMOVE : EVENTS.PIN_ADD, entity);
        return ok;
      },
      isPinned: (id) => now().pinned.some((e) => e.id === id),
      logHistory: (entity) => (entity?.id ? runtime.commit([history(entity)]) : false),
      clearHistory: () => runtime.commit([op("history_clear")]),
      addCollection(name, meta = {}) {
        const id = `c${crypto.randomUUID()}`;
        const collection = {
          id, name: (name || "אוסף").trim(), topic: meta.topic || null, world: meta.world || null,
          number: meta.number == null ? null : Number(meta.number), year: meta.year == null ? null : Number(meta.year),
        };
        return runtime.commit([op("collection_add", { collection })]) ? id : null;
      },
      updateCollection: (id, patch) => runtime.commit([op("collection_update", { id, patch })]),
      removeCollection: (id) => runtime.commit([op("collection_remove", { id })]),
      assignCollection(itemId, collId) {
        const e = now().saved.find((x) => x.id === itemId);
        return e ? runtime.commit([op("collection_assign", { entity_type: e.type, entity_ref: entityRef(e), coll_id: collId || null })]) : false;
      },
      addJourney(j) {
        if (j?.root == null) return false;
        const journey = { id: `j${j.root}`, root: j.root, path: j.path || [], world: j.world || null, msg: j.msg || null, t: Date.now() };
        const ok = runtime.commit([op("journey_add", { journey })]);
        if (ok) trackResearch("journey", { root: j.root });
        return ok;
      },
      removeJourney: (id) => runtime.commit([op("journey_remove", { id })]),
      clearJourneys: () => runtime.commit([op("journey_clear")]),
      setResearchContext: (value) => setContext(value),
      updateResearchContext: (patch) => setContext(patch, true),
      clearResearchContext: () => setContext(null),
      setMode: runtime.setMode,
      enterDiscovery: () => runtime.setMode("discovery"),
      toggleMode: () => runtime.setMode(now().mode === "discovery" ? "reader" : "discovery"),
      retryResearchSync: runtime.retry,
      resolveResearchSyncConflict: runtime.resolveConflict,
      exportPendingResearch: runtime.exportPending,
      listResearchRecoveryJournals: runtime.listRecoveryJournals,
      recoverResearchJournal: runtime.recoverJournal,
      exportLegacyResearch: runtime.exportLegacy,
    };
  }, [runtime]);

  // Path resumability is a separate explicit continuity projection over the same runtime Context.
  // Loading the latest saved Path NEVER activates it; only resumeResearchPath() may replace it.
  useEffect(() => {
    let alive = true;
    if (!userId) {
      setPathResume({ loading: false, latest: null, error: null });
      return () => { alive = false; };
    }
    setPathResume((prev) => ({ ...prev, loading: true, error: null }));
    getLatestResearchPath().then((snapshot) => {
      if (!alive) return;
      if (snapshot?.ok) setPathResume({ loading: false, latest: snapshot, error: null });
      else setPathResume({ loading: false, latest: null, error: snapshot?.error || null });
    }).catch((error) => {
      if (alive) setPathResume({ loading: false, latest: null, error: error?.message || "research_path_unavailable" });
    });
    return () => { alive = false; };
  }, [userId]);

  const saveCurrentResearchPath = useMemo(() => async ({ href = null, label = null, surface = null } = {}) => {
    if (!userId) return { ok: false, error: "authentication_required" };
    const current = normalizeResearchContext(runtime.getSnapshot().context);
    if (!current?.subject) return { ok: false, error: "no_research_context" };

    const activePathId = current.journey?.kind === "research_path" && isResearchPathId(current.journey?.id)
      ? current.journey.id
      : null;
    const expectedRevisionNo = activePathId && Number.isInteger(current.journey?.revisionNo)
      ? current.journey.revisionNo
      : null;

    setPathResume((prev) => ({ ...prev, loading: true, error: null }));
    const saveKey = researchPathOperationKey("save");
    let result;
    try {
      result = await saveResearchPathSnapshot({
        context: current, href, label, surface, pathId: activePathId, expectedRevisionNo, saveKey,
      });

      // One bounded recovery pass: a second tab/device may have appended after
      // this Context was loaded. Refresh the latest revision and retry with the
      // SAME operation key so a network-uncertain first write remains idempotent.
      if (activePathId && result?.error === "revision_conflict") {
        const latest = await getLatestResearchPath(activePathId);
        if (latest?.ok && Number.isInteger(latest.revision_no)) {
          result = await saveResearchPathSnapshot({
            context: current, href, label, surface, pathId: activePathId, expectedRevisionNo: latest.revision_no, saveKey,
          });
        }
      }
    } catch (error) {
      result = { ok: false, error: error?.message || "save_failed" };
    }

    if (!result?.ok) {
      setPathResume((prev) => ({ ...prev, loading: false, error: result?.error || "save_failed" }));
      return result;
    }

    const position = Math.max(0, (Array.isArray(result.steps) ? result.steps.length : 1) - 1);
    actions.updateResearchContext({
      journey: { id: result.path_id, kind: "research_path", position, revisionId: result.revision_id, revisionNo: result.revision_no },
    });
    setPathResume({ loading: false, latest: result, error: null });
    trackResearch("path_save", { revision: result.revision_no, surface: surface || null });
    return result;
  }, [userId, runtime, actions]);

  const startResearchJourney = useMemo(() => async ({
    journeyKind = "general_research",
    journeyMode = "organic",
    sourceSurface = null,
    rootType = null,
    publicInstanceKey = null,
    href = null,
    label = null,
    surface = null,
  } = {}) => {
    const current = normalizeResearchContext(runtime.getSnapshot().context);
    if (!current?.subject) return { ok: false, error: "no_research_context" };

    const instanceKey = publicInstanceKey || makeJourney2029InstanceKey(journeyKind);
    let persisted = null;
    if (userId) {
      persisted = await saveCurrentResearchPath({
        href,
        label,
        surface: surface || sourceSurface,
      });
    }

    const active = normalizeResearchContext(runtime.getSnapshot().context);
    const pathId = persisted?.ok && isResearchPathId(persisted.path_id)
      ? persisted.path_id
      : (active?.journey?.kind === "research_path" && isResearchPathId(active?.journey?.id)
        ? active.journey.id
        : null);

    emitJourney2029("start", {
      journeyKind,
      journeyMode,
      sourceSurface: sourceSurface || surface,
      rootType: rootType || current.subject.type,
      pathId,
      publicInstanceKey: instanceKey,
    });

    return {
      ok: true,
      persisted: Boolean(persisted?.ok),
      path_id: pathId,
      journey_instance: instanceKey,
      save_error: persisted && !persisted.ok ? persisted.error || "save_failed" : null,
    };
  }, [userId, runtime, saveCurrentResearchPath]);

  const recordResearchJourneyEvent = useMemo(() => (eventType, {
    journeyKind = null,
    journeyMode = null,
    sourceSurface = null,
    rootType = null,
    publicInstanceKey = null,
  } = {}) => {
    const current = normalizeResearchContext(runtime.getSnapshot().context);
    const pathId = current?.journey?.kind === "research_path" && isResearchPathId(current?.journey?.id)
      ? current.journey.id
      : null;
    return emitJourney2029(eventType, {
      journeyKind: journeyKind || current?.dimensions?.journeyKind || "general_research",
      journeyMode: journeyMode || current?.dimensions?.journeyMode || "organic",
      sourceSurface: sourceSurface || current?.dimensions?.journeySource || null,
      rootType: rootType || current?.subject?.type || null,
      pathId,
      publicInstanceKey: publicInstanceKey || current?.dimensions?.journeyInstance || null,
    });
  }, [runtime]);

  const resumeResearchPath = useMemo(() => async (pathId = null) => {
    if (!userId) return { ok: false, error: "authentication_required" };
    setPathResume((prev) => ({ ...prev, loading: true, error: null }));
    let snapshot;
    try {
      snapshot = await getLatestResearchPath(pathId || pathResume.latest?.path_id || null);
    } catch (error) {
      snapshot = { ok: false, error: error?.message || "resume_failed" };
    }
    if (!snapshot?.ok) {
      setPathResume((prev) => ({ ...prev, loading: false, error: snapshot?.error || "not_found" }));
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
    actions.setResearchContext(next);
    setPathResume({ loading: false, latest: snapshot, error: null });
    trackResearch("path_resume", { revision: snapshot.revision_no });
    return { ...snapshot, href: resumeHrefFromResearchPath(snapshot), context: next };
  }, [userId, pathResume.latest?.path_id, actions]);

  useEffect(() => {
    const route = numberRouteSelection(pathname, search);
    if (!route) return;
    const current = normalizeResearchContext(runtime.getSnapshot().context);
    const sameSelection = current?.selection?.entityId === route.selection.entityId
      && current?.selection?.entityType === route.selection.entityType
      && (current?.selection?.expression || null) === (route.selection.expression || null)
      && (current?.selection?.method || null) === (route.selection.method || null)
      && (current?.selection?.crossingPartner || null) === (route.selection.crossingPartner || null)
      && current?.lens === "number";
    if (current?.subject && sameSelection) return;
    const focusDimensions = { expressionFocusExplicit: Boolean(route.focusExplicit) };
    const next = current?.subject
      ? mergeResearchContext(current, { subject: route.subject, selection: route.selection, lens: "number", dimensions: focusDimensions })
      : mergeResearchContext(null, { subject: route.subject, selection: route.selection, lens: "number", dimensions: focusDimensions });
    actions.setResearchContext(next);
  }, [pathname, search, runtime, actions]);

  const lastElsHistorySig = useRef(null);
  useEffect(() => {
    const onElsState = (event) => {
      if (event.origin !== window.location.origin) return;
      // Reject detached/old-principal frames, even when origin and claimed source text match.
      const currentFrame = [...document.querySelectorAll("iframe")].some((frame) => {
        try {
          const url = new URL(frame.src, location.href);
          return url.origin === location.origin && frame.contentWindow === event.source;
        } catch { return false; }
      });
      if (!currentFrame) return;
      const d = event.data;
      if (!d || d.source !== "tzofen" || d.type !== "state" || d.status !== "ok") return;
      const term = String(d?.axis?.term || d?.axis?.t || d?.term || d?.query || d?.raw || "").trim();
      if (!term) return;
      const scope = d?.provenance?.scope || d?.scope || "torah";
      const skipRaw = d?.axis?.skip ?? null;
      const skip = skipRaw != null && skipRaw !== "" && Number.isInteger(Number(skipRaw)) ? Number(skipRaw) : null;
      const hitId = d?.axis?.hitId ?? d?.occurrence?.index ?? 0;
      const startRaw = d?.axis?.start ?? d?.occurrence?.start ?? null;
      const start = startRaw != null && startRaw !== "" && Number.isInteger(Number(startRaw)) ? Number(startRaw) : null;
      const dirRaw = d?.axis?.dir
        ?? d?.occurrence?.dir
        ?? (d?.axis?.direction === "back" ? -1 : d?.axis?.direction === "fwd" ? 1 : null);
      const dirNumber = dirRaw != null && dirRaw !== "" ? Number(dirRaw) : null;
      const dir = [-1, 1].includes(dirNumber) ? dirNumber : null;
      const occurrenceId = String(d?.axis?.occurrenceId || d?.occurrence?.occurrence_id || "").trim() || null;
      const corpusVersion = String(d?.provenance?.corpusVersion || d?.corpusVersion || "").trim() || null;
      const searchKind = d?.provenance?.searchKind || d?.kind || "regular";
      const sig = `${scope}|${term}|${searchKind}|${hitId}|${skip ?? ""}|${start ?? ""}|${dir ?? ""}`;
      if (lastElsHistorySig.current === sig) return;
      lastElsHistorySig.current = sig;

      const locator = `els:${scope}:${term}:${searchKind}:${hitId}:${skip ?? ""}`;
      // Context preserves replay intent only. These coordinates are NOT treated as verified truth;
      // /els must replay them through the canonical server verify boundary before rendering.
      const elsSelection = {
        entityType: "els", locator, term, corpus: scope, corpusVersion, occurrenceId, start, skip, dir,
      };
      const current = normalizeResearchContext(runtime.getSnapshot().context);
      const sameSelection = current?.selection?.entityType === "els"
        && current?.selection?.locator === locator
        && current?.selection?.term === term
        && current?.selection?.corpus === scope
        && (current?.selection?.start ?? null) === start
        && (current?.selection?.skip ?? null) === skip
        && (current?.selection?.dir ?? null) === dir
        && current?.lens === "els";
      if (!(current?.subject && sameSelection)) {
        const directSubject = { id: term, type: "phrase", label: term, href: `/research?tool=els&q=${encodeURIComponent(term)}` };
        const next = current?.subject
          ? mergeResearchContext(current, { selection: elsSelection, lens: "els" })
          : mergeResearchContext(null, { subject: directSubject, selection: elsSelection, lens: "els" });
        actions.setResearchContext(next);
      }

      actions.logHistory({
        id: `els:${encodeURIComponent(scope)}:${encodeURIComponent(term)}:${encodeURIComponent(searchKind)}:${hitId}:${skip}`,
        type: "els", title: `ELS · ${term}`, label: term, term, scope, skip, searchKind,
        href: `/lab/els?q=${encodeURIComponent(term)}`,
        metadata: {
          engine: "tzofen", corpus: scope, hitId, skip, searchKind,
          findingCount: Array.isArray(d.findings) ? d.findings.length : 0, matrixVersion: d?.matrix?.v || null,
        },
      });
    };
    window.addEventListener("message", onElsState);
    return () => window.removeEventListener("message", onElsState);
  }, [runtime, actions]);

  const value = useMemo(() => ({
    ...state,
    pathResume,
    saveCurrentResearchPath,
    startResearchJourney,
    recordResearchJourneyEvent,
    resumeResearchPath,
    ...actions,
  }), [state, pathResume, saveCurrentResearchPath, startResearchJourney, recordResearchJourneyEvent, resumeResearchPath, actions]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
