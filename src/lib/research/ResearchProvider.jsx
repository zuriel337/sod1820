import React, { createContext, useContext, useState, useLayoutEffect, useEffect, useMemo, useSyncExternalStore } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { applyCloudResearchOps, getCloudResearch } from '../auth.js';
import { trackResearch } from '../tracking.js';
import { signalAiBehavior } from '../supabase.js';
import { emit, EVENTS } from './eventBus.js';
import { normalizeResearchContext, mergeResearchContext } from './researchContext.js';
import { entityRef, makeResearchOp, principalToken } from './researchSyncState.js';
import { createResearchSyncRuntime } from './researchSyncRuntime.js';

const Ctx = createContext(null);
export const useResearch = () => useContext(Ctx) || {};
function browserStorage(name) { try { return globalThis[name]; } catch { return null; } }
const publishContext = context => emit(EVENTS.RESEARCH_CONTEXT_CHANGE, context);

export default function ResearchProvider({ children }) {
  const { user, loading } = useAuth();
  // A new account gets a new component BEFORE children render. No A-state/B-identity frame.
  // Same-account token refresh is not a new principal and keeps the research session intact.
  const principal = loading ? 'auth:pending' : principalToken(user?.id);
  return <PrincipalResearchProvider key={principal} userId={loading ? null : user?.id || null} disabled={!!loading}>
    {children}
  </PrincipalResearchProvider>;
}
function PrincipalResearchProvider({ children, userId, disabled }) {
  const { pathname, search } = useLocation();
  const [runtime] = useState(() => createResearchSyncRuntime({ userId, disabled,
    storage: browserStorage('localStorage'), session: browserStorage('sessionStorage'),
    readCloud: getCloudResearch, writeCloud: applyCloudResearchOps, onContext: publishContext }));
  const state = useSyncExternalStore(runtime.subscribe, runtime.getSnapshot, runtime.getSnapshot);
  useLayoutEffect(() => { runtime.start(); return () => runtime.stop(); }, [runtime]);
  useEffect(() => {
    const reconnect = () => { void runtime.retry(); };
    window.addEventListener('online', reconnect);
    return () => window.removeEventListener('online', reconnect);
  }, [runtime]);

  const actions = useMemo(() => {
    const now = () => runtime.getSnapshot();
    const op = makeResearchOp;
    const history = entity => op('history_add', { entity: { ...entity, t: Date.now() } });
    function remove(bucket, key, id) {
      const e = now()[key].find(x => x.id === id);
      return e ? runtime.commit([op('item_delete', { bucket, entity_type: e.type, entity_ref: entityRef(e) })]) : false;
    }
    function setContext(value, merge = false) {
      const current = now().context;
      const resolved = typeof value === 'function' ? value(current) : value;
      const context = merge ? mergeResearchContext(current, resolved) : resolved == null ? null : mergeResearchContext(null, resolved);
      return runtime.commit([op('context_set', { context })]);
    }
    return {
      addToResearch(entity) {
        if (!entity?.id || !entity?.type) return false;
        const ok = runtime.commit([op('item_upsert', { bucket: 'cart', entity }), history(entity)]);
        if (ok) { emit(EVENTS.RESEARCH_ADD, entity); trackResearch('add', { type: entity.type }); signalAiBehavior('research'); }
        return ok;
      },
      removeFromResearch: id => remove('cart', 'cart', id),
      clearResearch() { const ok = runtime.commit([op('item_clear_bucket', { bucket: 'cart' })]); if (ok) emit(EVENTS.RESEARCH_CLEAR); return ok; },
      saveItem(entity) {
        if (!entity?.id || !entity?.type) return false;
        const ok = runtime.commit([op('item_upsert', { bucket: 'library', entity }), history(entity)]);
        if (ok) { emit(EVENTS.ITEM_SAVE, entity); trackResearch('save', { type: entity.type }); }
        return ok;
      },
      removeSaved: id => remove('library', 'saved', id),
      togglePin(entity) {
        if (!entity?.id || !entity?.type) return false;
        const on = now().pinned.some(e => e.id === entity.id);
        const ok = on ? remove('pinned', 'pinned', entity.id) : runtime.commit([op('item_upsert', { bucket: 'pinned', entity })]);
        if (ok) emit(on ? EVENTS.PIN_REMOVE : EVENTS.PIN_ADD, entity);
        return ok;
      },
      isPinned: id => now().pinned.some(e => e.id === id),
      logHistory: entity => entity?.id ? runtime.commit([history(entity)]) : false,
      clearHistory: () => runtime.commit([op('history_clear')]),
      addCollection(name, meta = {}) {
        const id = `c${crypto.randomUUID()}`;
        const collection = { id, name: (name || 'אוסף').trim(), topic: meta.topic || null, world: meta.world || null,
          number: meta.number == null ? null : Number(meta.number), year: meta.year == null ? null : Number(meta.year) };
        return runtime.commit([op('collection_add', { collection })]) ? id : null;
      },
      updateCollection: (id, patch) => runtime.commit([op('collection_update', { id, patch })]),
      removeCollection: id => runtime.commit([op('collection_remove', { id })]),
      assignCollection(itemId, collId) {
        const e = now().saved.find(x => x.id === itemId);
        return e ? runtime.commit([op('collection_assign', { entity_type: e.type, entity_ref: entityRef(e), coll_id: collId || null })]) : false;
      },
      addJourney(j) {
        if (j?.root == null) return false;
        const journey = { id: `j${j.root}`, root: j.root, path: j.path || [], world: j.world || null, msg: j.msg || null, t: Date.now() };
        const ok = runtime.commit([op('journey_add', { journey })]);
        if (ok) trackResearch('journey', { root: j.root }); return ok;
      },
      removeJourney: id => runtime.commit([op('journey_remove', { id })]),
      clearJourneys: () => runtime.commit([op('journey_clear')]),
      setResearchContext: value => setContext(value),
      updateResearchContext: patch => setContext(patch, true),
      clearResearchContext: () => setContext(null),
      setMode: runtime.setMode,
      enterDiscovery: () => runtime.setMode('discovery'),
      toggleMode: () => runtime.setMode(now().mode === 'discovery' ? 'reader' : 'discovery'),
      retryResearchSync: runtime.retry,
      resolveResearchSyncConflict: runtime.resolveConflict,
      exportPendingResearch: runtime.exportPending,
      exportLegacyResearch: runtime.exportLegacy,
    };
  }, [runtime]);

  // Explicit compatibility seam. It is NOT 2029 route/engine authority. A future router consumes
  // the same Context API. Hydration completion is intentionally NOT a dependency: clearing
  // context cannot be undone by a late cloud response for this unchanged URL.
  useEffect(() => {
    const match = pathname.match(/^\/number\/([^/?#]+)/);
    if (!match) return;
    let id = match[1]; try { id = decodeURIComponent(id); } catch { /* preserve source */ }
    const numeric = /^\d+$/.test(id) && Number.isSafeInteger(Number(id));
    if (numeric) id = String(Number(id));
    const type = numeric ? 'number' : 'phrase';
    const current = normalizeResearchContext(runtime.getSnapshot().context);
    actions.updateResearchContext({
      ...(!current?.subject ? { subject: { id, type, label: id, href: `/number/${encodeURIComponent(id)}` } } : {}),
      selection: { entityId: id, entityType: type }, lens: 'number',
    });
  }, [pathname, runtime, actions]);

  useEffect(() => {
    const legacyEls = pathname === '/code' || pathname === '/lab/els' || (pathname === '/research' && new URLSearchParams(search).get('tool') === 'els');
    if (!legacyEls) return;
    let lastSignature = null;
    function onElsState(event) {
      if (event.origin !== window.location.origin) return;
      // Reject detached/old-principal frames, even when origin and claimed source text match.
      const currentFrame = [...document.querySelectorAll('iframe')].some(frame => {
        try { const url = new URL(frame.src, location.href); return url.origin === location.origin && url.pathname === '/tzofen.html' && frame.contentWindow === event.source; }
        catch { return false; }
      });
      const d = event.data;
      if (!currentFrame || d?.source !== 'tzofen' || d?.type !== 'state' || d?.status !== 'ok') return;
      const term = String(d.axis?.term || d.axis?.t || d.term || d.query || d.raw || '').trim();
      if (!term) return;
      const scope = d.provenance?.scope || d.scope || 'torah', skip = Number(d.axis?.skip || 0);
      const hitId = d.axis?.hitId ?? d.occurrence?.index ?? 0, searchKind = d.provenance?.searchKind || d.kind || 'regular';
      const signature = JSON.stringify([scope, term, searchKind, hitId, skip]);
      if (signature === lastSignature) return;
      lastSignature = signature;
      const current = normalizeResearchContext(runtime.getSnapshot().context);
      actions.updateResearchContext({
        ...(!current?.subject ? { subject: { id: term, type: 'phrase', label: term, href: `/research?tool=els&q=${encodeURIComponent(term)}` } } : {}),
        selection: { entityType: 'els', locator: `els:${scope}:${term}:${searchKind}:${hitId}:${skip}` }, lens: 'els',
      });
      actions.logHistory({ id: `els:${encodeURIComponent(scope)}:${encodeURIComponent(term)}:${encodeURIComponent(searchKind)}:${hitId}:${skip}`,
        type: 'els', title: `ELS · ${term}`, label: term, term, scope, skip, searchKind, href: `/lab/els?q=${encodeURIComponent(term)}`,
        metadata: { engine: 'tzofen', corpus: scope, hitId, skip, searchKind, findingCount: Array.isArray(d.findings) ? d.findings.length : 0, matrixVersion: d.matrix?.v || null } });
    }
    window.addEventListener('message', onElsState);
    return () => window.removeEventListener('message', onElsState);
  }, [pathname, search, runtime, actions]);

  return <Ctx.Provider value={{ ...state, ...actions }}>{children}</Ctx.Provider>;
}
