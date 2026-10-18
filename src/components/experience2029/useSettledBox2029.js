// Presentation memory only (never data): the box a list settled to, remembered by key and width for this session.
// While the list is pending on a return to Home, or while it still shows the same number of items as last time, it keeps
// that box (min-block-size rule in homeComposition2029.css); a different item count or a different width releases it.
// The box is the natural extent of the list's own children, so a larger remembered box never feeds on itself. The extent is the LAYOUT extent
// (layoutExtent): a card that is part-way through its entrance animation is painted offset from its layout box, and a box remembered from the painted
// extent was 6-7 px too tall for a four-card strip, which then stretched the grid rows of every later return.
// A message (empty / unavailable) keeps the box too (the `keep` option), so what stood there does not collapse into a one-line message under the person's eyes. Every entry starts
// from the whole box that was remembered, whatever happened on an earlier entry: a failure is not proof that the next read fails, and an area that starts small and then loads grows
// into the page. The reservation of a message is bounded (KEEP_RESERVE_PX) and is given back inside the entry, only where nothing the person sees can move: while the area is below
// the viewport, or entirely above it once the person is idle and the scroll restorer is not holding the page. Above the viewport, the displacement is measured after the box shrinks
// and the page is put back by exactly that in the same task (giveBackAbove). The shell keeps one horizontal guard on html; no inner clipping ancestor interrupts that compensation.
// No read, query, request or cache is involved. Users: Home composition strips + the discovery gateways.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";

export const SETTLED_HEIGHT_VAR = "--h29-settled-h";
// What a message (empty / unavailable) may keep reserved once it is out of view: room for the message and its retry, never the whole strip that used to stand there.
export const KEEP_RESERVE_PX = 160;

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

// The layout extent of a list: first child's top to last child's bottom, from offsetTop/offsetHeight, which ignore transforms (the entrance animation of a
// card translates it by a few px for a few hundred ms). Falls back to the painted rectangles for a node without an offset box (SVG) or without an offset parent.
export function layoutExtent(first, last) {
  if (typeof first.offsetTop === "number" && typeof last.offsetTop === "number" && first.offsetParent && first.offsetParent === last.offsetParent) {
    return { top: first.offsetTop, bottom: last.offsetTop + last.offsetHeight };
  }
  return { top: first.getBoundingClientRect().top, bottom: last.getBoundingClientRect().bottom };
}

// The box a message keeps: all of what was reserved while the area is (even partly) in view, so nothing under the person's eyes moves; the bound once it is out of view.
export function keptHeight(full, inView, bound = KEEP_RESERVE_PX) {
  return full > 0 ? (inView ? full : Math.min(full, bound)) : 0;
}
// The person is idle when nothing has scrolled or been pressed for QUIET_MS (any scroll counts, the restorer's own too) and the scroll restorer is not holding the page (it pauses scroll
// anchoring with overflow-anchor: none while a return settles). Only then is space given back above the viewport.
export const QUIET_MS = 400;
// A box has to be entirely above the viewport by this much to be given back there (sub-pixel layout and rounding must not decide).
export const ABOVE_MARGIN_PX = 8;
let lastActivity = 0;
const noteActivity = () => { lastActivity = typeof performance !== "undefined" ? performance.now() : 0; };
if (typeof window !== "undefined") for (const type of ["scroll", "wheel", "touchstart", "touchmove", "keydown", "pointerdown"]) window.addEventListener(type, noteActivity, { passive: true, capture: true });
export function personIsIdle(now = typeof performance !== "undefined" ? performance.now() : 0, doc = typeof document !== "undefined" ? document : null) {
  if (!doc) return false;
  return now - lastActivity >= QUIET_MS && doc.documentElement.style.overflowAnchor !== "none" && doc.visibilityState !== "hidden";
}
// Timers for several failed areas can come due together. Giving one box back at a time avoids exposing intermediate movement between boxes.
export const GIVE_BACK_GAP_MS = 150;
let lastGiveBack = -Infinity;
export const mayGiveBack = (now = typeof performance !== "undefined" ? performance.now() : 0) => now - lastGiveBack >= GIVE_BACK_GAP_MS;
// Shrink a box that is entirely above the viewport and preserve the person's reading place. A browser that applies native scroll anchoring has already compensated by the second
// rectangle read (drift 0); otherwise the exact measured drift is applied before the next frame. Returns the drift corrected by this function.
export function giveBackAbove(node, height, win = typeof window !== "undefined" ? window : null) {
  const before = node.getBoundingClientRect().bottom;
  node.style.setProperty(SETTLED_HEIGHT_VAR, `${height}px`);
  const drift = node.getBoundingClientRect().bottom - before;
  if (win && Math.abs(drift) >= 0.5) win.scrollBy({ top: drift, left: 0, behavior: "instant" });
  lastGiveBack = typeof performance !== "undefined" ? performance.now() : 0;
  return drift;
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

// `keep`: a message (empty / unavailable) stands where the content was. The box that was held at mount stays, so the message sits in the place of what the
// person was looking at instead of collapsing the page under them; it is only the box this mount already held (no hold was applied = nothing to keep).
export function useSettledBox(key, { pending = false, settled = false, count = 0, keep = false } = {}) {
  const latest = useRef({ settled, count });
  const live = useRef({ node: null, observer: null, appliedWidth: null, appliedViewport: null, appliedCount: null, appliedHeight: null, lastHeight: 0, released: false, unsubscribe: null });
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
    state.appliedWidth = null; state.appliedViewport = null; state.appliedCount = null; state.appliedHeight = null;
  }, []);
  // The box this mount held is spent (the content settled with another item count): drop the variable so the box is its content again.
  const spend = useCallback(() => {
    const state = live.current;
    state.node?.style.removeProperty(SETTLED_HEIGHT_VAR);
    state.appliedWidth = null; state.appliedViewport = null; state.appliedCount = null; state.appliedHeight = null; state.unsubscribe?.(); state.unsubscribe = null;
  }, []);
  const measure = useCallback((synchronous = true) => {
    const state = live.current, node = state.node, now = latest.current;
    if (!node) return;
    const box = node.getBoundingClientRect(), width = Math.round(box.width);
    state.lastHeight = Math.round(box.height);   // what the area measured last: the reservation a message keeps when nothing was held at mount
    // The width changed while mounted (rotation, resize, another breakpoint): a height remembered for the old width would
    // hold the wrong amount of space, so it is released before anything is measured again.
    if (shouldReleaseHold(state.appliedWidth, width)) release(synchronous);
    const first = node.firstElementChild, last = node.lastElementChild;
    if (!first || !last) return;
    // Observe the outer children too: a held (min-size) box does not resize when its content does (observe() is idempotent).
    state.observer?.observe(first); state.observer?.observe(last);
    if (!(typeof now.settled === "function" ? now.settled(node) : now.settled)) return;
    // The list settled with another number of items than the box that was held: the held height is spent. Dropping the variable matters: once the new
    // box is remembered the hold attribute comes back (same count again), and a variable left from the mount would re-expand the list to its old height.
    if (state.appliedCount != null && state.appliedCount !== now.count) spend();
    const { top, bottom } = layoutExtent(first, last);
    const next = nextMemory({ width, viewport: viewportWidth, top, bottom, count: now.count });
    if (next) rememberSettledBox(key, next);
  }, [key, release, spend]);
  const observe = useCallback(() => measure(true), [measure]);
  // Callback ref: runs at commit, before paint, so the remembered box is in place for the first frame of a return. It reads no
  // layout (a forced layout per instance at commit time delayed the first read of Home by ~70 ms at CPU x4): the remembered
  // node width becomes `appliedWidth`, and the first ResizeObserver callback, which runs after layout and before paint,
  // releases the hold if the node's real width differs. A viewport resize releases it even earlier (the resize event).
  const ref = useCallback((node) => {
    const state = live.current;
    state.observer?.disconnect(); state.observer = null; state.unsubscribe?.(); state.unsubscribe = null;
    state.node = node; state.appliedWidth = null; state.appliedViewport = null; state.appliedCount = null; state.appliedHeight = null;
    if (!node) return;
    const memory = readSettledBox(key);
    const height = state.released ? null : rememberedHeight(memory, viewportWidth);
    if (height != null) {
      node.style.setProperty(SETTLED_HEIGHT_VAR, `${height}px`); state.appliedWidth = memory.w; state.appliedViewport = memory.vw; state.appliedCount = memory.n; state.appliedHeight = height;
      const onViewport = () => { if (viewportChangedSinceHold(state.appliedViewport, viewportWidth)) release(true); };
      viewportListeners.add(onViewport); state.unsubscribe = () => viewportListeners.delete(onViewport);
    }
    if (typeof ResizeObserver !== "undefined") { state.observer = new ResizeObserver(observe); state.observer.observe(node); }
  }, [key, observe, release]);
  useEffect(() => { measure(false); }, [measure, typeof settled === "function" ? 0 : settled, count]);
  // A message stands where content was: keep the box, before the first frame of the message (a layout effect only writes a style, it reads no layout). While the area is in view
  // the whole reservation stays. It is bounded to KEEP_RESERVE_PX at once while below the viewport; while entirely above it, once the person is idle and the scroll restorer has
  // released the page, giveBackAbove preserves the reading place. A retry gives the whole reservation back for its own loading.
  useLayoutEffect(() => {
    const state = live.current, node = state.node;
    if (!keep || !node) return undefined;
    // what the box was held at, or what the area measured while it was loading when that was more (the hero's loading state is taller than the remembered box): a message never shrinks it
    const full = Math.max(state.appliedHeight ?? 0, state.lastHeight);
    if (!(full > 0)) return undefined;
    node.style.setProperty(SETTLED_HEIGHT_VAR, `${full}px`);
    const bound = keptHeight(full, false);
    let observer = null, timer = null, above = false;
    const stop = () => { observer?.disconnect(); observer = null; clearTimeout(timer); timer = null; above = false; };
    const tryAbove = () => {
      timer = null;
      if (!above || !node.isConnected) return;
      if (personIsIdle() && mayGiveBack()) {
        const box = node.getBoundingClientRect();
        if (box.bottom < -ABOVE_MARGIN_PX) { giveBackAbove(node, bound); stop(); return; }
      }
      timer = setTimeout(tryAbove, QUIET_MS);
    };
    if (full > KEEP_RESERVE_PX && typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver((entries) => {
        const entry = entries[entries.length - 1];
        if (!entry) return;
        if (entry.isIntersecting) { above = false; clearTimeout(timer); timer = null; return; }
        if (entry.boundingClientRect.top >= 0) { node.style.setProperty(SETTLED_HEIGHT_VAR, `${bound}px`); stop(); return; }
        above = true; clearTimeout(timer); timer = setTimeout(tryAbove, QUIET_MS);
      });
      observer.observe(node);
    }
    return () => { stop(); node.style.setProperty(SETTLED_HEIGHT_VAR, `${full}px`); };
  }, [keep]);
  useEffect(() => () => { live.current.observer?.disconnect(); live.current.unsubscribe?.(); }, []);
  // held: a remembered box exists for this viewport width, so the rule in homeComposition2029.css already reserves the space and the
  // caller does not need to render loading slots (each slot is DOM that React has to create at the moment Home mounts).
  const memory = readSettledBox(key);
  return { ref, hold: holdAttribute({ pending: pending || keep, settled, memory, count }), held: !released && rememberedHeight(memory, viewportWidth) != null };
}
