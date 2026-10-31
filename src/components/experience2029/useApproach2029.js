import { useEffect, useRef, useState } from "react";

// Admit an existing reader once its own section approaches, or receives intent.
// No timer, polling, permission cache or data ownership lives in this hook.
export function useApproach2029(enabled = true) {
  const ref = useRef(null);
  const [admitted, setAdmitted] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!enabled || admitted || !element) return undefined;
    const admit = () => setAdmitted(true);
    if (typeof IntersectionObserver === "undefined") { admit(); return undefined; }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) admit();
    }, { rootMargin: "256px 0px", threshold: 0 });
    const admitFragment = () => {
      try {
        const id = decodeURIComponent(window.location.hash.slice(1));
        const target = id && document.getElementById(id);
        if (target && element.contains(target)) admit();
      } catch { /* A malformed fragment is not intent for this section. */ }
    };
    observer.observe(element);
    element.addEventListener("focusin", admit);
    element.addEventListener("pointerenter", admit);
    window.addEventListener("hashchange", admitFragment);
    admitFragment();
    return () => {
      observer.disconnect();
      element.removeEventListener("focusin", admit);
      element.removeEventListener("pointerenter", admit);
      window.removeEventListener("hashchange", admitFragment);
    };
  }, [enabled, admitted]);
  return [ref, admitted];
}
