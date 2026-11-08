import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./entranceIntro2029.css";
import { BRAND_LOCKUP_HERO_2029 } from "../../lib/brandAssets2029.js";
import { ENTRANCE_INTRO_MS, ENTRANCE_INTRO_SEEN_KEY, shouldPlayEntranceIntro } from "./entranceIntro2029.js";

// How long the larger lockup may take to decode before the intro is skipped (the page never waits for it).
const DECODE_WAIT_MS = 700;
const EASE_OUT = "cubic-bezier(.2,.8,.2,1)";

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

// ONE crown, one gesture. The overlay places the complete approved lockup exactly on the header crown, hides the real one, lifts it to the
// centre of the screen, lets it rest, and returns it to the bar, where the real crown reappears on the same spot. The opening shell and the
// bar already show the crown from the first frame, so the intro never adds a second crown. Decorative: aria-hidden, click-through, transform and
// opacity only, once per session, never for reduced motion; a tap anywhere ends it, and it is skipped (never waited for) if the larger image is slow.
export default function EntranceIntro2029() {
  // Decided before the first paint so the logo is the first thing seen, not a flash after the page.
  const [playing, setPlaying] = useState(decide);
  const rootRef = useRef(null);
  const imgRef = useRef(null);
  useLayoutEffect(() => {
    if (!playing) return undefined;
    const root = rootRef.current;
    const img = imgRef.current;
    const html = document.documentElement;
    const header = document.querySelector(".sod29-header-crown img");
    const from = header ? header.getBoundingClientRect() : null;
    if (!root || !img || !from || from.width < 8) { setPlaying(false); return undefined; }
    Object.assign(img.style, { left: from.left + "px", top: from.top + "px", width: from.width + "px", height: from.height + "px", opacity: "0" });
    let ended = false;
    const animations = [];
    const finish = () => {
      if (ended) return;
      ended = true;
      window.removeEventListener("pointerdown", finish);
      animations.forEach((animation) => animation.cancel());
      html.removeAttribute("data-entrance-crown");
      setPlaying(false);
    };
    const go = () => {
      if (ended) return;
      const width = window.innerWidth;
      const height = window.innerHeight;
      const size = Math.min(220, width * 0.56);
      const dx = width / 2 - (from.left + from.width / 2);
      const dy = height / 2 - (from.top + from.height / 2);
      const scale = size / from.width;
      const centre = `translate(${dx}px, ${dy}px) scale(${scale})`;
      const rest = `translate(${dx}px, ${dy}px) scale(${scale * 1.03})`;
      const glowBar = "drop-shadow(0 0 10px rgba(232, 200, 74, .25))";
      const glowCentre = "drop-shadow(0 0 34px rgba(232, 200, 74, .5))";
      html.setAttribute("data-entrance-crown", "playing");
      img.style.opacity = "1";
      root.classList.add("is-go");
      if (!img.animate) { finish(); return; }
      const travel = img.animate([
        { offset: 0, transform: "none", filter: glowBar },
        { offset: 0.16, transform: "none", filter: glowBar, easing: EASE_OUT },
        { offset: 0.42, transform: centre, filter: glowCentre, easing: "ease-in-out" },
        { offset: 0.72, transform: rest, filter: glowCentre, easing: "cubic-bezier(.5, 0, .2, 1)" },
        { offset: 1, transform: "none", filter: glowBar },
      ], { duration: ENTRANCE_INTRO_MS, fill: "both" });
      animations.push(travel);
      travel.finished.then(finish, finish);
    };
    window.addEventListener("pointerdown", finish, { once: true, passive: true });
    Promise.race([
      img.decode().then(() => "ok", () => "fail"),
      new Promise((resolve) => window.setTimeout(resolve, DECODE_WAIT_MS, "slow")),
    ]).then((state) => { if (state === "ok") go(); else finish(); });
    return finish;
  }, [playing]);
  useEffect(() => {
    if (!playing) return undefined;
    const timer = window.setTimeout(() => setPlaying(false), ENTRANCE_INTRO_MS + 150 + DECODE_WAIT_MS);
    return () => window.clearTimeout(timer);
  }, [playing]);
  if (!playing) return null;
  // In document.body, above the whole frame: inside the page's own stacking context the sticky bar (z-index 40) would paint over the crown.
  return createPortal(
    <div ref={rootRef} className="e29" aria-hidden="true" data-entrance-intro="2029">
      <img ref={imgRef} src={BRAND_LOCKUP_HERO_2029.src} width={BRAND_LOCKUP_HERO_2029.width} height={BRAND_LOCKUP_HERO_2029.height}
        alt="" decoding="async" fetchpriority="high" draggable="false" data-brand-asset-state={BRAND_LOCKUP_HERO_2029.state} />
    </div>,
    document.body,
  );
}
