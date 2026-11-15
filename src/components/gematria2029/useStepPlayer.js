import { useCallback, useEffect, useState } from "react";

// Shared motion rules for the Spatial method stages (ריבוע view, convergence view):
// static by default; "play" only moves the focus, only on an explicit user action; never under reduced motion;
// stops when the stage leaves the viewport or the tab is hidden; exactly one timer.
export function useReducedMotion(rootRef) {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : null;
    const sync = () => setReduced(Boolean(media?.matches || rootRef.current?.closest('[data-frame-reduced-motion="true"]')));
    sync();
    media?.addEventListener?.("change", sync);
    const observer = typeof MutationObserver === "function" ? new MutationObserver(sync) : null;
    observer?.observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ["data-frame-reduced-motion"] });
    return () => { media?.removeEventListener?.("change", sync); observer?.disconnect(); };
  }, [rootRef]);
  return reduced;
}

export function useStepPlayer(rootRef, count, ms = 900) {
  const reduced = useReducedMotion(rootRef);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [visible, setVisible] = useState(true);
  const last = Math.max(0, count - 1);
  useEffect(() => {
    if (typeof IntersectionObserver !== "function" || !rootRef.current) return undefined;
    const observer = new IntersectionObserver(([entry]) => setVisible(Boolean(entry?.isIntersecting)));
    observer.observe(rootRef.current);
    return () => observer.disconnect();
  }, [rootRef]);
  const running = playing && visible && !reduced;
  useEffect(() => {
    if (!running) return undefined;
    const timer = setInterval(() => setIndex((current) => {
      if (current >= last) { setPlaying(false); return current; }
      return current + 1;
    }), ms);
    const onHide = () => { if (document.hidden) setPlaying(false); };
    document.addEventListener("visibilitychange", onHide);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", onHide); };
  }, [running, last, ms]);
  const goTo = useCallback((next) => { setPlaying(false); setIndex(Math.max(0, Math.min(last, next))); }, [last]);
  const reset = useCallback(() => { setIndex(0); setPlaying(false); }, []);
  const toggle = useCallback(() => {
    setPlaying((current) => { if (!current) setIndex((i) => (i >= last ? 0 : i)); return !current; });
  }, [last]);
  return { index: Math.min(index, last), goTo, reset, toggle, playing, running, reduced, last };
}
