// HISTORICAL negative control for test/home-settled-box-dom-2029.test.mjs: the hook exactly as at e3498434 (width release redraws the slots, but the held-height variable outlived a list that settled with another item count).
// Not used by the product.
// Presentation memory only (never data): the box a list settled to, remembered by key and width for this session.
// While the list is pending on a return to Home, or while it still shows the same number of items as last time, it keeps
// that box (min-block-size rule in homeComposition2029.css); a different item count or a different width releases it.
// The box is the natural extent of the list's own children, so a larger remembered box never feeds on itself.
// No read, query, request or cache is involved. Users: Home composition strips + the discovery gateways.
import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";

export const SETTLED_HEIGHT_VAR = "--h29-settled-h";

// The viewport width is cached and refreshed on resize: reading window.innerWidth per hook instance at commit time can force a layout.
// The same listener releases every box that was held for another viewport width (see `release` below), before the new layout is painted.
let viewportWidth = typeof window !== "undefined" ? window.innerWidth : 0;
const viewportListeners = new Set();
if (typeof window !== "undefined") window.addEventListener("resize", () => { viewportWidth = window.innerWidth; for (const notify of [...viewportListeners]) notify(); }, { passive: true });
export const currentViewportWidth = () => viewportWidth;

const settledBox = {};
export const readSettledBox = (key) => settledBox[key];
export const rememberSettledBox = (key, box) => { settledBox[key] = box; };
export const resetSettledBoxes = () => { for (const key of Object.keys(settledBox)) delete settledBox[key]; };

// Mount-time check, with NO layout read: a remembered height is only a candidate while the viewport width is the one it was
// remembered at. The node's own width is verified by the first ResizeObserver callback (after layout, before paint), see below.
export function rememberedHeight(memory, viewportWidth) {
  return memory && memory.vw === viewportWidth ? memory.h : null;
}

// The held height was applied at `appliedWidth`; once the box has a different (visible) width it no longer describes it.
export function shouldReleaseHold(appliedWidth, width) {
  return appliedWidth != null && width > 0 && appliedWidth !== width;
}

// The same rule for the viewport: a hold applied for one viewport width is stale as soon as the viewport has another one.
export function viewportChangedSinceHold(appliedViewport, viewport) {
  return appliedViewport != null && viewport > 0 && appliedViewport !== viewport;
}

// Natural extent (first child's top to last child's bottom) at the current width; null when there is nothing to remember.
export function nextMemory({ width, viewport, top, bottom, count }) {
  const height = bottom - top;
  return width > 0 && height > 0 ? { w: Math.round(width), vw: viewport, h: Math.round(height), n: count } : null;
}

// `settled` may be a predicate over the node (truthy = a rule that waits for the content itself).
export function holdAttribute({ pending, settled, memory, count }) {
  return pending || (Boolean(settled) && Boolean(memory) && memory.n === count) ? "" : undefined;
}

export function useSettledBox(key, { pending = false, settled = false, count = 0 } = {}) {
  const latest = useRef({ settled, count });
  const live = useRef({ node: null, observer: null, appliedWidth: null, appliedViewport: null, released: false, unsubscribe: null });
  // released: this mount's hold was dropped because the width changed. The caller then renders its own loading slots at the new
  // width (held is false) instead of leaving an empty box, in the same frame (flushSync), so nothing collapses and re-grows.
  const [released, setReleased] = useState(false);
  latest.current = { settled, count };
  const release = useCallback((synchronous) => {
    const state = live.current, node = state.node;
    if (!node || state.released || state.appliedWidth == null) return;
    state.released = true;
    if (synchronous) flushSync(() => setReleased(true)); else setReleased(true);   // from an effect, flushSync is not allowed: batch instead
    node.style.removeProperty(SETTLED_HEIGHT_VAR);
    state.appliedWidth = null; state.appliedViewport = null;
  }, []);
  const measure = useCallback((synchronous = true) => {
    const state = live.current, node = state.node, now = latest.current;
    if (!node) return;
    const width = Math.round(node.getBoundingClientRect().width);
    // The width changed while mounted (rotation, resize, another breakpoint): a height remembered for the old width would
    // hold the wrong amount of space, so it is released before anything is measured again.
    if (shouldReleaseHold(state.appliedWidth, width)) release(synchronous);
    const first = node.firstElementChild, last = node.lastElementChild;
    if (!first || !last) return;
    // Observe the outer children too: a held (min-size) box does not resize when its content does (observe() is idempotent).
    state.observer?.observe(first); state.observer?.observe(last);
    if (!(typeof now.settled === "function" ? now.settled(node) : now.settled)) return;
    const next = nextMemory({ width, viewport: viewportWidth, top: first.getBoundingClientRect().top, bottom: last.getBoundingClientRect().bottom, count: now.count });
    if (next) rememberSettledBox(key, next);
  }, [key, release]);
  const observe = useCallback(() => measure(true), [measure]);
  // Callback ref: runs at commit, before paint, so the remembered box is in place for the first frame of a return. It reads no
  // layout (a forced layout per instance at commit time delayed the first read of Home by ~70 ms at CPU x4): the remembered
  // node width becomes `appliedWidth`, and the first ResizeObserver callback, which runs after layout and before paint,
  // releases the hold if the node's real width differs. A viewport resize releases it even earlier (the resize event).
  const ref = useCallback((node) => {
    const state = live.current;
    state.observer?.disconnect(); state.observer = null; state.unsubscribe?.(); state.unsubscribe = null;
    state.node = node; state.appliedWidth = null; state.appliedViewport = null;
    if (!node) return;
    const memory = readSettledBox(key);
    const height = state.released ? null : rememberedHeight(memory, viewportWidth);
    if (height != null) {
      node.style.setProperty(SETTLED_HEIGHT_VAR, `${height}px`); state.appliedWidth = memory.w; state.appliedViewport = memory.vw;
      const onViewport = () => { if (viewportChangedSinceHold(state.appliedViewport, viewportWidth)) release(true); };
      viewportListeners.add(onViewport); state.unsubscribe = () => viewportListeners.delete(onViewport);
    }
    if (typeof ResizeObserver !== "undefined") { state.observer = new ResizeObserver(observe); state.observer.observe(node); }
  }, [key, observe, release]);
  useEffect(() => { measure(false); }, [measure, typeof settled === "function" ? 0 : settled, count]);
  useEffect(() => () => { live.current.observer?.disconnect(); live.current.unsubscribe?.(); }, []);
  // held: a remembered box exists for this viewport width, so the rule in homeComposition2029.css already reserves the space and the
  // caller does not need to render loading slots (each slot is DOM that React has to create at the moment Home mounts).
  const memory = readSettledBox(key);
  return { ref, hold: holdAttribute({ pending, settled, memory, count }), held: !released && rememberedHeight(memory, viewportWidth) != null };
}
