// Left Companion panel, PREVIEW ONLY (ZURIEL 12.11.2026, section 10): mounted on a series Post in the protected preview build, INSTEAD of the
// context rail (never in addition to it). It keeps the three tabs — עדכונים / הקשר / רצף האירועים — opens on "הקשר", and a tab the reader
// chose is never replaced while they read (companionTabPolicy2029). The context's CONTENT follows the active unit without touching the tab.
// Desktop only (min-width 981px); the mobile behaviour of the existing sheets is untouched. The Companion stays unmounted everywhere else.
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { companionTabReducer, preferredCompanionTab } from "./companionTabPolicy2029.js";

const wideNow = () => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(min-width: 981px)").matches;
const reduce = (state, action) => companionTabReducer(state, action, action.availability || {});

export function useCompanionPreview2029({ enabled, surface, hasContext, hasSequence, hasFeed }) {
  const [wide, setWide] = useState(wideNow);
  const [pref, setPref] = useState(() => { try { return window.localStorage.getItem("sod-companion"); } catch { return null; } });
  const [peek, setPeek] = useState(false);
  const timer = useRef(null);
  const availability = { hasContext, hasSequence };
  const [tabState, dispatch] = useReducer(reduce, { surface, tab: preferredCompanionTab({ surface, ...availability }), chosenByReader: false });
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return undefined;
    const query = window.matchMedia("(min-width: 981px)");
    const onChange = () => setWide(query.matches);
    query.addEventListener?.("change", onChange);
    return () => query.removeEventListener?.("change", onChange);
  }, []);
  useEffect(() => { dispatch({ type: "surface", surface, availability }); }, [surface]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { dispatch({ type: "context-change", availability }); }, [hasContext, hasSequence]); // eslint-disable-line react-hooks/exhaustive-deps
  const active = Boolean(enabled && wide);
  const pinned = pref === "pinned" || (pref === null && typeof window !== "undefined" && window.innerWidth >= 1560 && hasFeed);
  const mode = !active ? null : pinned ? "pinned" : peek ? "peek" : "slim";
  const chooseTab = useCallback((tab) => dispatch({ type: "choose", tab, availability }), [hasContext, hasSequence]); // eslint-disable-line react-hooks/exhaustive-deps
  const togglePin = useCallback(() => {
    const next = pinned ? "slim" : "pinned";
    setPref(next); setPeek(false);
    try { window.localStorage.setItem("sod-companion", next); } catch { /* optional */ }
  }, [pinned]);
  const hoverPeek = (open) => {
    if (typeof window === "undefined" || !window.matchMedia?.("(hover: hover)").matches) return;
    clearTimeout(timer.current);
    if (open) setPeek(true); else timer.current = setTimeout(() => setPeek(false), 200);
  };
  const tab = tabState.tab === "seq" && !hasSequence ? "feed" : tabState.tab === "ctx" && !hasContext ? "feed" : tabState.tab;
  return {
    active, mode, tab, pinned, chooseTab, togglePin, chosenByReader: tabState.chosenByReader,
    openPanel: (next) => { chooseTab(next); setPeek(true); },
    hoverProps: { onMouseEnter: () => hoverPeek(true), onMouseLeave: () => hoverPeek(false), onFocus: () => hoverPeek(true),
      onBlur: (event) => { if (!event.currentTarget.contains(event.relatedTarget)) hoverPeek(false); } },
  };
}
