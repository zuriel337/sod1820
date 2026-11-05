import React, { useEffect, useState } from "react";
import "./entranceIntro2029.css";
import { BRAND_LOCKUP_HERO_2029 } from "../../lib/brandAssets2029.js";
import { ENTRANCE_INTRO_MS, ENTRANCE_INTRO_SEEN_KEY, shouldPlayEntranceIntro } from "./entranceIntro2029.js";

function decide() {
  const read = (fn, fallback) => { try { return fn(); } catch { return fallback; } };
  const play = shouldPlayEntranceIntro({
    search: read(() => window.location.search, ""),
    reducedMotion: read(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches, false),
    webdriver: read(() => navigator.webdriver === true, false),
    seen: read(() => window.sessionStorage.getItem(ENTRANCE_INTRO_SEEN_KEY) === "1", false),
  });
  if (play) read(() => window.sessionStorage.setItem(ENTRANCE_INTRO_SEEN_KEY, "1"), null);
  return play;
}

export default function EntranceIntro2029() {
  // Decided before the first paint so the logo is the first thing seen, not a flash after the page.
  const [playing, setPlaying] = useState(decide);
  useEffect(() => {
    if (!playing) return undefined;
    const timer = window.setTimeout(() => setPlaying(false), ENTRANCE_INTRO_MS + 150);
    return () => window.clearTimeout(timer);
  }, [playing]);
  if (!playing) return null;
  return (
    <div className="e29" aria-hidden="true" data-entrance-intro="2029">
      <img src={BRAND_LOCKUP_HERO_2029.src} width={BRAND_LOCKUP_HERO_2029.width} height={BRAND_LOCKUP_HERO_2029.height}
        alt="" decoding="async" fetchpriority="high" draggable="false" data-brand-asset-state={BRAND_LOCKUP_HERO_2029.state} />
    </div>
  );
}
