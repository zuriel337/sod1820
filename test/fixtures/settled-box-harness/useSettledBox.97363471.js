// HISTORICAL negative control (the recovery gate): the hook exactly as at 97363471 / eed39c9a. An area that ended as a message on two entries in a row STARTS the next entry at the 160px bound, whatever
// that entry then does; an entry that loads fine grows from the bound, and above the reading place that growth is counted. Not used by the product.
// Presentation memory only (never data): the box a list settled to, remembered by key and width for this session.
// While the list is pending on a return to Home, or while it still shows the same number of items as last time, it keeps
// that box (min-block-size rule in homeComposition2029.css); a different item count or a different width releases it.
// The box is the natural extent of the list's own children, so a larger remembered box never feeds on itself. The extent is the LAYOUT extent
// (layoutExtent): a card that is part-way through its entrance animation is painted offset from its layout box, and a box remembered from the painted
// extent was 6-7 px too tall for a four-card strip, which then stretched the grid rows of every later return.
// A message (empty / unavailable) keeps the box too (the `keep` option), so what stood there does not collapse into a one-line message under the person's eyes;
// the reservation is bounded (KEEP_RESERVE_PX) and is let go only while the box is below the viewport, where nothing the person sees can move. What the person is looking at
// is never moved to give the space back; a fresh entry to the surface gives it back instead: an area that ended as a message leaves a record (`messageBox`, one strike per entry),
// and once it ended as a message on two entries in a row the box of the next mount starts at the bound (entryMemory) before its first paint, where there is no earlier frame to
// shift from. One failed entry is not enough: if the next one loads, an area that started at the bound grows, and above the reading place that growth is counted (0.3 on a phone).
// A list that loads clears the record.
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
// A list that settled with content: its box is what the next entry holds, and an earlier message record for it is void (the area has content again).
export const rememberSettledBox = (key, box) => { settledBox[key] = box; delete messageBox[key]; };
export const resetSettledBoxes = () => { for (const key of Object.keys(settledBox)) delete settledBox[key]; for (const key of Object.keys(messageBox)) delete messageBox[key]; };
// An area that ended as a message (empty / unavailable) with more reserved than the bound: { w, vw, strikes } of the box it kept, one strike per entry that ended so. Never data,
// never a measurement of the message itself.
const messageBox = {};
export const readMessageBox = (key) => messageBox[key];
const rememberMessageBox = (key, record) => { messageBox[key] = record; };
// Entries in a row that must end as a message before the next one starts at the bound.
export const STRIKES_TO_BOUND = 2;

// Mount-time check, with NO layout read: a remembered height is only a candidate while the viewport width is the one it was
// remembered at. The node's own width is verified by the first ResizeObserver callback (after layout, before paint), see below.
export function rememberedHeight(memory, viewportWidth) {
  return memory && memory.vw === viewportWidth ? memory.h : null;
}

// The memory a fresh entry starts from. An area that ended as a message on STRIKES_TO_BOUND entries in a row at this viewport width starts at the bound instead of the whole box it
// used to hold: the page then does not carry hundreds of empty pixels from one visit to the next, and it costs nothing to see (the box is set at mount, before the first paint).
// With no remembered box the bound is still a box (the area is then held, not drawn as loading slots); a record for another viewport width, or with fewer strikes, does not apply.
export function entryMemory(memory, message, viewport, bound = KEEP_RESERVE_PX) {
  if (!message || message.vw !== viewport || !(message.strikes >= STRIKES_TO_BOUND)) return memory;
  const same = Boolean(memory) && memory.vw === viewport;
  return { w: message.w, vw: message.vw, h: same ? Math.min(memory.h, bound) : bound, n: same ? memory.n : 0 };
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
  const live = useRef({ node: null, observer: null, appliedWidth: null, appliedViewport: null, appliedCount: null, appliedHeight: null, lastHeight: 0, lastWidth: 0, released: false, struck: false, unsubscribe: null });
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
    state.lastWidth = width;
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
    const memory = entryMemory(readSettledBox(key), readMessageBox(key), viewportWidth);
    const height = state.released ? null : rememberedHeight(memory, viewportWidth);
    if (height != null) {
      node.style.setProperty(SETTLED_HEIGHT_VAR, `${height}px`); state.appliedWidth = memory.w; state.appliedViewport = memory.vw; state.appliedCount = memory.n; state.appliedHeight = height;
      const onViewport = () => { if (viewportChangedSinceHold(state.appliedViewport, viewportWidth)) release(true); };
      viewportListeners.add(onViewport); state.unsubscribe = () => viewportListeners.delete(onViewport);
    }
    if (typeof ResizeObserver !== "undefined") { state.observer = new ResizeObserver(observe); state.observer.observe(node); }
  }, [key, observe, release]);
  useEffect(() => { measure(false); }, [measure, typeof settled === "function" ? 0 : settled, count]);
  // A message stands where content was: keep the box, before the first frame of the message (a layout effect only writes a style, it reads no layout). While the area
  // is in view, or above it, the whole reservation stays; once it is below the viewport it shrinks to KEEP_RESERVE_PX. A retry gives the whole reservation back for its own loading.
  useLayoutEffect(() => {
    const state = live.current, node = state.node;
    if (!keep || !node) return undefined;
    // what the box was held at, or what the area measured while it was loading when that was more (the hero's loading state is taller than the bound an entry starts from): a message never shrinks it
    const full = Math.max(state.appliedHeight ?? 0, state.lastHeight);
    if (!(full > 0)) return undefined;
    node.style.setProperty(SETTLED_HEIGHT_VAR, `${full}px`);
    // Nothing the person is looking at moves now; the next fresh entry to the surface starts this area at the bound (entryMemory), before its first paint.
    const recordedWidth = state.lastWidth || state.appliedWidth;
    if (full > KEEP_RESERVE_PX && recordedWidth > 0) {
      const earlier = readMessageBox(key), strikes = state.struck ? (earlier?.strikes ?? 1) : (earlier && earlier.vw === viewportWidth ? earlier.strikes : 0) + 1;   // one strike per entry, however often its message comes back
      state.struck = true; rememberMessageBox(key, { w: recordedWidth, vw: viewportWidth, strikes });
    }
    let observer = null;
    if (full > KEEP_RESERVE_PX && typeof IntersectionObserver !== "undefined") {
      // The reservation is let go only while the area is BELOW the viewport: then nothing the person sees can move. An area above the viewport keeps it: shrinking it moves
      // everything under it up, the page can be put back by scroll compensation but the browser still counts the elements above the reading place as having shifted (their old
      // rectangles, seen from the new scroll position, land inside the viewport), and the reading place is not ours to move. It is let go if the person scrolls past it upwards.
      observer = new IntersectionObserver((entries) => {
        const entry = entries[entries.length - 1];
        if (!entry || entry.isIntersecting || node.getBoundingClientRect().top < 0) return;
        node.style.setProperty(SETTLED_HEIGHT_VAR, `${keptHeight(full, false)}px`);
        observer.disconnect();
      });
      observer.observe(node);
    }
    return () => { observer?.disconnect(); node.style.setProperty(SETTLED_HEIGHT_VAR, `${full}px`); };
  }, [keep]);
  useEffect(() => () => { live.current.observer?.disconnect(); live.current.unsubscribe?.(); }, []);
  // held: a remembered box exists for this viewport width, so the rule in homeComposition2029.css already reserves the space and the
  // caller does not need to render loading slots (each slot is DOM that React has to create at the moment Home mounts).
  const memory = entryMemory(readSettledBox(key), readMessageBox(key), viewportWidth);
  return { ref, hold: holdAttribute({ pending: pending || keep, settled, memory, count }), held: !released && rememberedHeight(memory, viewportWidth) != null };
}
