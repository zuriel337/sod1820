const EDITABLE = "input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]),textarea,select,[contenteditable=\"true\"]";

// The keyboard is "open" when the visual viewport is clearly shorter than the layout viewport AND a text field has focus. (A pinch-zoom also
// shrinks the visual viewport; without a focused field it is not a keyboard.) Pure and injectable so it can be tested without a browser.
export function keyboardOpen({ innerHeight, visualHeight, active }) {
  return Number.isFinite(innerHeight) && Number.isFinite(visualHeight) && innerHeight - visualHeight > 140 && Boolean(active?.matches?.(EDITABLE));
}

export function watchKeyboardClearance(win = globalThis.window, doc = globalThis.document) {
  const viewport = win?.visualViewport;
  if (!viewport || !doc?.documentElement) return () => {};
  const root = doc.documentElement;
  let timer = 0;
  const apply = () => {
    const open = keyboardOpen({ innerHeight: win.innerHeight, visualHeight: viewport.height, active: doc.activeElement });
    root.classList.toggle("sod29-kbd-open", open);
    // Keep the field in use clear of the keyboard once the viewport has settled.
    if (open) { clearTimeout(timer); timer = setTimeout(() => doc.activeElement?.scrollIntoView?.({ block: "center", behavior: "instant" }), 120); }
  };
  viewport.addEventListener("resize", apply); viewport.addEventListener("scroll", apply);
  doc.addEventListener("focusin", apply); doc.addEventListener("focusout", apply);
  apply();
  return () => {
    clearTimeout(timer); viewport.removeEventListener("resize", apply); viewport.removeEventListener("scroll", apply);
    doc.removeEventListener("focusin", apply); doc.removeEventListener("focusout", apply); root.classList.remove("sod29-kbd-open");
  };
}
