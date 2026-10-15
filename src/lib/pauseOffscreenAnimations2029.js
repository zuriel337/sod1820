// Authored post bodies (WordPress widgets) can carry infinite CSS animations. While such an element is
// off-screen it still invalidates style on every animation tick, so a long post keeps the main thread busy
// for nothing. Keep each animation playing while its element is (nearly) visible and pause it otherwise.
// Only infinite animations inside the given root are touched; content, styles and timing are unchanged and a
// paused animation resumes from the same point. Returns a cleanup that resumes everything it paused.
export function pauseOffscreenAnimations(root, { win = typeof window === "undefined" ? null : window, margin = "160px" } = {}) {
  if (!root || !win || typeof root.getAnimations !== "function" || typeof win.IntersectionObserver !== "function") return () => {};
  const byElement = new Map();
  const paused = new Set();
  const visible = new WeakSet();
  const observer = new win.IntersectionObserver((entries) => {
    for (const entry of entries) {
      const animations = byElement.get(entry.target);
      if (!animations) continue;
      if (entry.isIntersecting) {
        visible.add(entry.target);
        for (const animation of animations) if (paused.delete(animation)) animation.play();
      } else {
        visible.delete(entry.target);
        for (const animation of animations) {
          if (animation.playState === "running") { animation.pause(); paused.add(animation); }
        }
      }
    }
  }, { rootMargin: margin });
  const collect = () => {
    for (const animation of root.getAnimations({ subtree: true })) {
      const timing = animation.effect?.getComputedTiming?.();
      const element = animation.effect?.target;
      if (!element || timing?.iterations !== Infinity) continue;
      let list = byElement.get(element);
      if (!list) { list = []; byElement.set(element, list); observer.observe(element); }
      if (!list.includes(animation)) list.push(animation);
    }
  };
  collect();
  // Animations that start after the first style pass (late fonts/styles) are picked up once more.
  const frame = win.requestAnimationFrame ? win.requestAnimationFrame(collect) : null;
  const late = win.setTimeout ? win.setTimeout(collect, 700) : null;
  return () => {
    if (frame != null) win.cancelAnimationFrame?.(frame);
    if (late != null) win.clearTimeout?.(late);
    observer.disconnect();
    // Only elements still in the document are resumed; when the post is replaced its nodes are already gone.
    for (const animation of paused) {
      if (animation.effect?.target?.isConnected === false) continue;
      try { animation.play(); } catch { /* animation already gone */ }
    }
    paused.clear();
    byElement.clear();
  };
}
