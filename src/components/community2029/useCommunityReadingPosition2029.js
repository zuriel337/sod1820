import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { fetchCommunityThreadUpdates } from "../../lib/community/communityArchive.js";
import { captureCommunityReading, communityReadingPrincipal, loadCommunityReading, rememberCommunityReading, saveCommunityReading } from "../../lib/community/communityReadingPosition.js";
import { captureCommunityScrollAnchor, restoreCommunityScrollAnchor, startCommunityRefresh } from "../../lib/community/communityRefresh.js";

const NO_UPDATES = Object.freeze({});
const blank = scope => ({ scope, position: { threads: [], last: null }, resume: null, updates: NO_UPDATES, error: false });
const storage = () => { try { return window.localStorage; } catch { return null; } };

export function useCommunityReadingPosition2029({ auth, active, enabled }) {
  const principal = enabled ? communityReadingPrincipal(auth) : null;
  const scope = useRef(principal); scope.current = principal;
  const activeRef = useRef(active); activeRef.current = active;
  const [snapshot, setSnapshot] = useState(() => blank(null));
  const current = snapshot.scope === principal ? snapshot : blank(principal);
  const latest = useRef(current); latest.current = current;
  const request = useRef(null), updateAnchor = useRef(null);
  const [restore, setRestore] = useState(null);
  const restoring = useRef(restore); restoring.current = restore;
  useEffect(() => {
    request.current?.abort(); request.current = null; setRestore(null);
    const position = loadCommunityReading(storage(), principal);
    setSnapshot({ ...blank(principal), position, resume: position.last });
  }, [principal]);

  useEffect(() => {
    if (!principal || !active) return undefined;
    let timer;
    const capture = () => {
      if (scope.current !== principal || !activeRef.current || restoring.current) return;
      const root = document.getElementById("community-new-chat");
      const position = captureCommunityReading(root);
      if (!position) return;
      const previous = latest.current.position;
      if (previous.last?.message_id === position.message_id && Math.abs(previous.last.top - position.top) < 8) return;
      const next = rememberCommunityReading(previous, position);
      saveCommunityReading(storage(), principal, next);
      latest.current = { ...latest.current, position: next };
      setSnapshot(value => value.scope === principal ? { ...value, position: next } : value);
    };
    const schedule = () => { clearTimeout(timer); timer = setTimeout(capture, 700); };
    const observer = new MutationObserver(changes => {
      if (changes.some(change => [...change.addedNodes].some(node => node.nodeType === 1 && (node.matches?.(".sod29-community-thread") || node.querySelector?.(".sod29-community-thread"))))) schedule();
    });
    const root = document.getElementById("community-new-chat");
    if (root) observer.observe(root, { childList: true, subtree: true });
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    window.addEventListener("pagehide", capture);
    schedule();
    return () => { clearTimeout(timer); observer.disconnect(); window.removeEventListener("scroll", schedule); window.removeEventListener("resize", schedule); window.removeEventListener("pagehide", capture); };
  }, [principal, active]);

  const refresh = useCallback(async () => {
    if (!principal || scope.current !== principal || !activeRef.current || document.hidden) return;
    const cursors = latest.current.position.threads;
    if (!cursors.length || request.current) return;
    const controller = new AbortController(); request.current = controller;
    const key = JSON.stringify(cursors);
    try {
      const data = await fetchCommunityThreadUpdates(cursors, { signal: controller.signal });
      if (controller.signal.aborted || scope.current !== principal || !activeRef.current || key !== JSON.stringify(latest.current.position.threads)) return;
      updateAnchor.current = captureCommunityScrollAnchor(document.getElementById("community-new-chat"));
      setSnapshot(value => value.scope === principal ? { ...value, updates: data, error: false } : value);
    } catch {
      if (!controller.signal.aborted && scope.current === principal) setSnapshot(value => value.scope === principal ? { ...value, error: true } : value);
    } finally { if (request.current === controller) request.current = null; }
  }, [principal]);
  const cursorKey = JSON.stringify(current.position.threads);
  useEffect(() => {
    if (!principal || !active) return undefined;
    request.current?.abort(); request.current = null;
    const timer = setTimeout(refresh, 800);
    return () => clearTimeout(timer);
  }, [principal, active, cursorKey, refresh]);
  useEffect(() => {
    if (!principal || !active) return undefined;
    const stop = startCommunityRefresh({ refresh });
    return () => { stop(); request.current?.abort(); request.current = null; };
  }, [principal, active, refresh]);
  useLayoutEffect(() => { restoreCommunityScrollAnchor(updateAnchor.current); updateAnchor.current = null; }, [current.updates]);

  useEffect(() => {
    if (!restore || restore.scope !== principal || !active) return undefined;
    let canceled = false, scheduled = false, firstFrame, secondFrame;
    const attempt = () => {
      const target = document.getElementById(`message-${restore.position.message_id}`);
      if (scheduled || !target?.classList.contains("is-focused")) return;
      scheduled = true;
      firstFrame = requestAnimationFrame(() => { secondFrame = requestAnimationFrame(() => {
        if (canceled || scope.current !== principal) return;
        restoreCommunityScrollAnchor({ id: target.id, top: restore.position.top });
        setRestore(null);
        setSnapshot(value => value.scope === principal ? { ...value, resume: null } : value);
      }); });
    };
    const root = document.getElementById("community-new-chat"), observer = new MutationObserver(attempt);
    if (root) observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
    const timeout = setTimeout(() => setRestore(null), 10000);
    attempt();
    return () => { canceled = true; observer.disconnect(); clearTimeout(timeout); cancelAnimationFrame(firstFrame); cancelAnimationFrame(secondFrame); };
  }, [restore, principal, active]);
  return { resume: current.resume, updates: current.updates, error: current.error,
    requestResume: () => { if (current.resume && principal) setRestore({ scope: principal, position: current.resume }); } };
}
