import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../../lib/AuthContext.jsx";
import { deleteCommunityMessage, editCommunityMessage, fetchCommunityMessageActions } from "../../lib/community/communityMessageActions.js";

const empty = principalKey => ({ principalKey, items: {}, patches: {}, state: "loading" });
const validId = value => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

// Local view/request state only. Server RPCs remain the ownership and write
// authority; this hook is shared by the feed and the existing author activity.
export function useCommunityMessageActions2029(rows, onChanged) {
  const { user } = useAuth();
  const principalKey = user?.id || null;
  const current = useRef(principalKey); current.current = principalKey;
  const mounted = useRef(true);
  const changed = useRef(onChanged); changed.current = onChanged;
  const pending = useRef(new Set());
  const [ids, setIds] = useState([]);
  const [attempt, setAttempt] = useState(0);
  const [snapshot, setSnapshot] = useState(() => empty(principalKey));
  const active = snapshot.principalKey === principalKey ? snapshot : empty(principalKey);
  const register = useCallback(items => {
    const added = items.map(row => row.id).filter(validId);
    setIds(previous => added.every(id => previous.includes(id)) ? previous : [...new Set([...previous, ...added])]);
  }, []);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { register(rows); }, [rows, register]);
  const idKey = ids.join(",");
  useEffect(() => {
    if (!principalKey) { setSnapshot({ ...empty(null), state: "guest" }); return undefined; }
    const abort = new AbortController();
    const previous = snapshot.principalKey === principalKey ? snapshot : empty(principalKey);
    const missing = ids.filter(id => !previous.items[id]);
    if (!missing.length) { setSnapshot(value => value.principalKey === principalKey ? { ...value, state: "ready" } : { ...empty(principalKey), state: "ready" }); return undefined; }
    setSnapshot({ ...previous, state: "loading" });
    (async () => {
      let items = { ...previous.items };
      for (let offset = 0; offset < missing.length; offset += 100) {
        const result = await fetchCommunityMessageActions(missing.slice(offset, offset + 100), {
          principalKey, getCurrentPrincipal: () => mounted.current ? current.current : null, signal: abort.signal,
        });
        if (abort.signal.aborted || current.current !== principalKey) return;
        if (result.state !== "ready") {
          setSnapshot(value => ({ ...(value.principalKey === principalKey ? value : empty(principalKey)), state: "unavailable" }));
          return;
        }
        items = { ...items, ...result.items };
      }
      if (!abort.signal.aborted && current.current === principalKey) setSnapshot(value => ({
        ...(value.principalKey === principalKey ? value : empty(principalKey)), items, state: "ready",
      }));
    })();
    return () => abort.abort();
    // Snapshot is the result of this request, not an input that restarts it.
  }, [principalKey, idKey, attempt]);

  const mutate = useCallback(async (kind, row, body) => {
    const key = `${principalKey}:${row.id}`;
    if (current.current !== principalKey || !mounted.current) return { state: "stale" };
    if (pending.current.has(key)) return { state: "busy" };
    pending.current.add(key);
    try {
      const options = { principalKey, getCurrentPrincipal: () => mounted.current ? current.current : null };
      const result = kind === "edit" ? await editCommunityMessage(row.id, body, options) : await deleteCommunityMessage(row.id, options);
      if (!mounted.current || current.current !== principalKey) return { state: "stale" };
      const patch = result.state === "saved" ? { body: body.trim(), editedAt: result.editedAt }
        : result.state === "deleted" ? { isDeleted: true, body: "", title: null, authorName: "", authorKey: null, authorUserId: null, linkedUserId: null, avatarUrl: null, reactions: {} } : null;
      if (patch) {
        setSnapshot(value => value.principalKey !== principalKey ? value : {
          ...value, patches: { ...value.patches, [row.id]: patch },
          items: result.state === "deleted" ? { ...value.items, [row.id]: { state: "ready", canEdit: false, canDelete: false } } : value.items,
        });
        changed.current?.(kind, row, patch);
      }
      return result;
    } finally { pending.current.delete(key); }
  }, [principalKey]);
  const retry = () => { setSnapshot(value => ({ ...value, items: {} })); setAttempt(value => value + 1); };
  return { ...active, register, mutate, retry };
}
