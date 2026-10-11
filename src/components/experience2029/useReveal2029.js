// Reveal-on-view for the Home sections: 'pre' (hidden, waiting) -> 'anim' (staged appearance, once) | 'static'.
// 'static' is used when the user prefers reduced motion, when this session already played the reveal, or on remount.
// ?replay=1 (preview builds only) forces the staged reveal again. Never loops.
import { useEffect, useRef, useState } from "react";

const SESSION_KEY = "sod-home-reveal-played";
const revealed = new Set();
const preview = () => import.meta.env.DEV || import.meta.env.VITE_INTEGRATED_PREVIEW === "true";
const reduced = () => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const replay = () => preview() && typeof window !== "undefined" && new URLSearchParams(window.location.search).get("replay") === "1";
const sessionPlayedAtLoad = (() => { try { return window.sessionStorage.getItem(SESSION_KEY) === "1"; } catch (_) { return false; } })();

export function useReveal(id) {
  const ref = useRef(null);
  const [state, setState] = useState(() => {
    if (typeof window === "undefined" || reduced() || typeof IntersectionObserver === "undefined") return "static";
    if (!replay() && (revealed.has(id) || sessionPlayedAtLoad)) return "static";
    return "pre";
  });
  useEffect(() => {
    if (state !== "pre" || !ref.current) return undefined;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      revealed.add(id);
      try { window.sessionStorage.setItem(SESSION_KEY, "1"); } catch (_) { /* optional */ }
      setState("anim");
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [state, id]);
  return [ref, state];
}
