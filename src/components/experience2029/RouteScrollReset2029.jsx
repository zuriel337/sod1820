import { useLayoutEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

const position = () => ({ left: window.scrollX, top: window.scrollY });
// Outside the account-keyed provider: login is not navigation. Positions are
// ephemeral per history entry; hash/source and same-page query owners stay intact.
export default function RouteScrollReset2029() {
  const { key, pathname, hash } = useLocation();
  const navigationType = useNavigationType();
  const previous = useRef({ key, pathname });
  const last = useRef(null);
  const positions = useRef(new Map());

  useLayoutEffect(() => {
    const record = () => { last.current = position(); };
    record();
    window.addEventListener("scroll", record, { passive: true });
    return () => window.removeEventListener("scroll", record);
  }, []);

  useLayoutEffect(() => {
    const from = previous.current;
    if (from.key !== key) {
      positions.current.set(from.key, last.current || position());
      if (positions.current.size > 60) positions.current.delete(positions.current.keys().next().value);
    }
    previous.current = { key, pathname };
    last.current = position();
    if (from.pathname === pathname || hash) return;
    if (navigationType !== "POP") {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      last.current = position();
      return;
    }
    const target = positions.current.get(key);
    if (!target) return; // Initial entry/reload and unknown history use the browser.

    // Native POP can clamp to a short loading placeholder after a forward reset.
    // Wait for enough document height, bounded and cancelled by any user intent.
    let frame = 0, done = false, aligned = 0;
    const deadline = performance.now() + 4000;
    const events = ["wheel", "touchstart", "pointerdown", "keydown"];
    const stop = () => {
      done = true;
      cancelAnimationFrame(frame);
      for (const event of events) window.removeEventListener(event, stop);
    };
    const restore = () => {
      if (done || performance.now() >= deadline) { stop(); return; }
      const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      if (maxY >= target.top) {
        window.scrollTo({ ...target, behavior: "instant" });
        last.current = position();
        aligned = Math.abs(window.scrollY - target.top) <= 1 ? aligned + 1 : 0;
        if (aligned >= 2) { stop(); return; }
      }
      frame = requestAnimationFrame(restore);
    };
    for (const event of events) window.addEventListener(event, stop, { passive: true });
    frame = requestAnimationFrame(restore);
    return stop;
  }, [key, pathname, hash, navigationType]);

  return null;
}
