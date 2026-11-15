import { useEffect, useRef, useState } from "react";

// Reuse Legacy's dismissal hints only. Neither key proves consent to site-updates.
const UNTIL = "sod_legacy_newsletter_invite_until";
const JOINED = "sod_legacy_newsletter_invite_joined";
const read = key => { try { return localStorage.getItem(key); } catch { return null; } };
const write = (key, value) => { try { localStorage.setItem(key, value); } catch { /* optional browser hint */ } };
const suppressed = () => read(JOINED) === "yes" || Number(read(UNTIL) || 0) > Date.now();
export function dismissGuestNewsletterInvite2029() { write(UNTIL, String(Date.now() + 14 * 86400000)); }
export function confirmGuestNewsletterInvite2029() {
  write(JOINED, "yes");
  write(UNTIL, String(Date.now() + 365 * 86400000));
}

export function guestNewsletterRoute2029(pathname) {
  let path;
  try { path = decodeURIComponent(pathname || "/"); } catch { return false; }
  // Only existing public reading surfaces invite; never interrupt personal work,
  // login, service actions, closed modules, or an arbitrary missing document.
  return path === "/" || /^\/(?:world|post|category|tag|gallery|number|phrase|gematria|community)(?:\/|$)/.test(path)
    || /^\/2029\/(?:posts|post|number|phrase)(?:\/|$)/.test(path);
}

export function useGuestNewsletterInvite2029({ eligible, blocked, routeKey, onOpen, requireResolvedPost = false }) {
  const [due, setDue] = useState(null);
  const open = useRef(onOpen);
  open.current = onOpen;
  const attempted = useRef(false);
  const generation = useRef(0);
  useEffect(() => {
    const lease = ++generation.current;
    setDue(null);
    attempted.current = false;
    if (!eligible || suppressed()) return;
    let triggered = false;
    const reveal = () => { if (!triggered) { triggered = true; setDue({ routeKey, lease }); } };
    const onScroll = () => { if (window.scrollY > 450) reveal(); };
    const timer = window.setTimeout(reveal, 22000);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { clearTimeout(timer); window.removeEventListener("scroll", onScroll); };
  }, [eligible, routeKey]);
  useEffect(() => {
    if (due?.routeKey !== routeKey || due?.lease !== generation.current || !eligible || blocked || attempted.current || suppressed()) return;
    const reveal = () => {
      if (attempted.current || suppressed()) return;
      // A Post shell also exists while loading or showing a missing/private post.
      // Invite at original /<slug> addresses only once the public reader rendered it.
      if (requireResolvedPost && !document.querySelector('article[data-experience-surface="post-reading"] [data-public-post-id]')) return;
      if (document.activeElement?.matches?.("input,textarea,select,[contenteditable=true]") || String(window.getSelection?.() || "").trim()) return;
      if (document.querySelector('[role=dialog],[aria-modal=true]')) return;
      attempted.current = true;
      observer.disconnect();
      open.current();
    };
    // A slow Post or an existing dialog may finish after the invitation is due.
    // Observe only while waiting; never restart the timer or interrupt that dialog.
    const observer = new MutationObserver(reveal);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['role', 'aria-modal', 'data-public-post-id'] });
    reveal();
    document.addEventListener("focusout", reveal);
    document.addEventListener("selectionchange", reveal);
    return () => { observer.disconnect(); document.removeEventListener("focusout", reveal); document.removeEventListener("selectionchange", reveal); };
  }, [due, eligible, blocked, routeKey, requireResolvedPost]);
}
