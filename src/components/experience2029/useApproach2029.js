import { useEffect, useRef, useState } from "react";

// Admit an existing reader once its own section approaches, or receives intent.
// No timer, polling, permission cache or data ownership lives in this hook.
export function useApproach2029(enabled = true, { rootMargin = "256px 0px", layoutReady = true } = {}) {
  const ref = useRef(null);
  const [admitted, setAdmitted] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!enabled || admitted || !element) return undefined;
    const admit = () => setAdmitted(true);
    if (layoutReady && typeof IntersectionObserver === "undefined") { admit(); return undefined; }
    const observer = layoutReady && typeof IntersectionObserver !== "undefined" ? new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) admit();
    }, { rootMargin, threshold: 0 }) : null;
    const admitFragment = () => {
      try {
        const id = decodeURIComponent(window.location.hash.slice(1));
        const target = id && document.getElementById(id);
        if (target && element.contains(target)) admit();
      } catch { /* A malformed fragment is not intent for this section. */ }
    };
    const admitScrolledSection = () => {
      const rect = element.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) admit();
    };
    observer?.observe(element);
    element.addEventListener("focusin", admit);
    element.addEventListener("pointerenter", admit);
    window.addEventListener("hashchange", admitFragment);
    if (!layoutReady) window.addEventListener("scroll", admitScrolledSection, { passive: true });
    admitFragment();
    return () => {
      observer?.disconnect();
      element.removeEventListener("focusin", admit);
      element.removeEventListener("pointerenter", admit);
      window.removeEventListener("hashchange", admitFragment);
      window.removeEventListener("scroll", admitScrolledSection);
    };
  }, [enabled, admitted, rootMargin, layoutReady]);
  return [ref, admitted];
}
