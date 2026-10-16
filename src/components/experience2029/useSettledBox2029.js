// Presentation memory only (never data): the box a list settled to, remembered by key and width for this session.
// While the list is pending on a return to Home, or while it still shows the same number of items as last time, it keeps
// that box (min-block-size rule in homeComposition2029.css); a different item count or a different width releases it.
// The box is the natural extent of the list's own children, so a larger remembered box never feeds on itself.
// No read, query, request or cache is involved. Users: Home composition strips + the discovery gateways.
import { useCallback, useEffect, useRef } from "react";

export const SETTLED_HEIGHT_VAR = "--h29-settled-h";

const settledBox = {};
export const readSettledBox = (key) => settledBox[key];
export const rememberSettledBox = (key, box) => { settledBox[key] = box; };
export const resetSettledBoxes = () => { for (const key of Object.keys(settledBox)) delete settledBox[key]; };

// A remembered height is only valid for the width it was measured at.
export function rememberedHeight(memory, width) {
  return memory && memory.w === width ? memory.h : null;
}

// The held height was applied at `appliedWidth`; once the box has a different (visible) width it no longer describes it.
export function shouldReleaseHold(appliedWidth, width) {
  return appliedWidth != null && width > 0 && appliedWidth !== width;
}

// Natural extent (first child's top to last child's bottom) at the current width; null when there is nothing to remember.
export function nextMemory({ width, top, bottom, count }) {
  const height = bottom - top;
  return width > 0 && height > 0 ? { w: Math.round(width), h: Math.round(height), n: count } : null;
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
    const next = nextMemory({ width, top: first.getBoundingClientRect().top, bottom: last.getBoundingClientRect().bottom, count: now.count });
    if (next) rememberSettledBox(key, next);
  }, [key]);
  // Callback ref: runs at commit, before paint, so the remembered box is in place for the first frame of a return.
  const ref = useCallback((node) => {
    const state = live.current;
    state.observer?.disconnect(); state.observer = null; state.node = node; state.appliedWidth = null;
    if (!node) return;
    const width = Math.round(node.getBoundingClientRect().width);
    const height = rememberedHeight(readSettledBox(key), width);
    if (height != null) { node.style.setProperty(SETTLED_HEIGHT_VAR, `${height}px`); state.appliedWidth = width; }
    if (typeof ResizeObserver !== "undefined") { state.observer = new ResizeObserver(measure); state.observer.observe(node); }
  }, [key, measure]);
  useEffect(() => { measure(); }, [measure, typeof settled === "function" ? 0 : settled, count]);
  useEffect(() => () => { live.current.observer?.disconnect(); }, []);
  return { ref, hold: holdAttribute({ pending, settled, memory: readSettledBox(key), count }) };
}
