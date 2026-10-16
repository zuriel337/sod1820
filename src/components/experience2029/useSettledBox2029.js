// Presentation memory only (never data): the box a list settled to, remembered by key and width for this session.
// While the list is pending on a return to Home, or while it still shows the same number of items as last time, it keeps
// that box (min-block-size rule in homeComposition2029.css); a different item count or a different width releases it.
// The box is the natural extent of the list's own children, so a larger remembered box never feeds on itself.
// No read, query, request or cache is involved. Users: Home composition strips + the discovery gateways.
import { useCallback, useEffect, useRef } from "react";

export const SETTLED_HEIGHT_VAR = "--h29-settled-h";

// The viewport width is cached and refreshed on resize: reading window.innerWidth per hook instance at commit time can force a layout.
let viewportWidth = typeof window !== "undefined" ? window.innerWidth : 0;
if (typeof window !== "undefined") window.addEventListener("resize", () => { viewportWidth = window.innerWidth; }, { passive: true });
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
  const live = useRef({ node: null, observer: null, appliedWidth: null });
  latest.current = { settled, count };
  const measure = useCallback(() => {
    const state = live.current, node = state.node, now = latest.current;
    if (!node) return;
    const width = Math.round(node.getBoundingClientRect().width);
    // The width changed while mounted (rotation, resize, another breakpoint): a height remembered for the old width would
    // hold the wrong amount of space, so it is released before anything is measured again.
    if (shouldReleaseHold(state.appliedWidth, width)) { node.style.removeProperty(SETTLED_HEIGHT_VAR); state.appliedWidth = null; }
    const first = node.firstElementChild, last = node.lastElementChild;
    if (!first || !last) return;
    // Observe the outer children too: a held (min-size) box does not resize when its content does (observe() is idempotent).
    state.observer?.observe(first); state.observer?.observe(last);
    if (!(typeof now.settled === "function" ? now.settled(node) : now.settled)) return;
    const next = nextMemory({ width, viewport: viewportWidth, top: first.getBoundingClientRect().top, bottom: last.getBoundingClientRect().bottom, count: now.count });
    if (next) rememberSettledBox(key, next);
  }, [key]);
  // Callback ref: runs at commit, before paint, so the remembered box is in place for the first frame of a return. It reads no
  // layout (a forced layout per instance at commit time delayed the first read of Home by ~70 ms at CPU x4): the remembered
  // node width becomes `appliedWidth`, and the first ResizeObserver callback, which runs after layout and before paint,
  // releases the hold if the node's real width differs.
  const ref = useCallback((node) => {
    const state = live.current;
    state.observer?.disconnect(); state.observer = null; state.node = node; state.appliedWidth = null;
    if (!node) return;
    const memory = readSettledBox(key);
    const height = rememberedHeight(memory, viewportWidth);
    if (height != null) { node.style.setProperty(SETTLED_HEIGHT_VAR, `${height}px`); state.appliedWidth = memory.w; }
    if (typeof ResizeObserver !== "undefined") { state.observer = new ResizeObserver(measure); state.observer.observe(node); }
  }, [key, measure]);
  useEffect(() => { measure(); }, [measure, typeof settled === "function" ? 0 : settled, count]);
  useEffect(() => () => { live.current.observer?.disconnect(); }, []);
  // held: a remembered box exists for this viewport width, so the rule in homeComposition2029.css already reserves the space and the
  // caller does not need to render loading slots (each slot is DOM that React has to create at the moment Home mounts).
  const memory = readSettledBox(key);
  return { ref, hold: holdAttribute({ pending, settled, memory, count }), held: rememberedHeight(memory, viewportWidth) != null };
}
