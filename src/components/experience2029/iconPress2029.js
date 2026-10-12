/** Decorative, finite feedback; never intercept navigation, focus or scrolling. */
export function iconPress2029(event) {
  const element = event.currentTarget;
  if (event.isPrimary === false || (event.pointerType === "mouse" && event.button !== 0)) return;
  if (element.closest(':disabled,[aria-disabled="true"],[data-frame-reduced-motion="true"]') ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  // Signature owns its layered glyph; avoid animating both child and parent.
  if (element.matches("svg") && element.closest(".sig-icon")) return;
  const target = element.matches("svg")
    ? element.closest(".sod29-nav-icon,.sod29-hero-symbol,.rf-icon") || element
    : element;
  if (!target.animate) return;
  for (const animation of target.getAnimations()) {
    if (animation.id === "sod29-icon-press") animation.cancel();
  }
  target.animate([
    { transform: "none" },
    { transform: "scale(.92) rotateX(-6deg)", offset: .35 },
    { transform: "none" },
  ], { id: "sod29-icon-press", duration: 320, easing: "ease-out" });
}
