import { useEffect } from "react";
import "./awakening2029.css";
import { AWAKENING_MS, shouldPlayAwakening } from "./awakening2029.js";

// The arrival cue (see awakening2029.js): mounted once for the whole app, it waits (MutationObserver, so it reacts in the same task as the commit
// that inserts the frame, before the first paint of it) for the real bar and crown to replace the opening, then plays once per page load.
const SVG_NS = "http://www.w3.org/2000/svg";
const ARC_LEFT = "M160 62C70 62 44 0 0 0";
const ARC_RIGHT = "M160 62C250 62 276 0 320 0";
let finished = false;

function px(node, rect) { Object.assign(node.style, { left: rect.left + "px", top: rect.top + "px", width: rect.width + "px", height: rect.height + "px" }); }

function play(crown) {
  const html = document.documentElement;
  const bar = document.querySelector(".sod29-header.closed-orientation");
  const dip = document.querySelector(".sod29-crown-dip");
  if (!bar || !dip) return false;
  const barRect = bar.getBoundingClientRect();
  const dipRect = dip.getBoundingClientRect();
  const crownRect = crown.getBoundingClientRect();
  if (dipRect.width < 8 || crownRect.width < 8 || !document.body) return false;
  const layer = document.createElement("div");
  layer.className = "wk29";
  layer.setAttribute("aria-hidden", "true");
  const animations = [];
  const run = (node, keyframes, options) => { if (node.animate) animations.push(node.animate(keyframes, { fill: "both", ...options })); };

  // 1) a light wave runs from the bottom of the arc up to both ends
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 320 64");
  svg.setAttribute("preserveAspectRatio", "none");
  px(svg, dipRect);
  for (const d of [ARC_LEFT, ARC_RIGHT]) {
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", d);
    path.setAttribute("pathLength", "1");
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "#fff3c4");
    path.setAttribute("stroke-width", "3");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("vector-effect", "non-scaling-stroke");
    path.setAttribute("stroke-dasharray", "0.16 2");
    path.style.opacity = "0";
    svg.appendChild(path);
    run(path, [{ strokeDashoffset: 0.16, opacity: 0 }, { opacity: 1, offset: 0.15 }, { strokeDashoffset: -1.05, opacity: 0 }], { duration: 400, easing: "ease-in" });
  }
  layer.appendChild(svg);

  // 2) it continues along the bar's gold line to both edges (the line is interrupted under the arc, so the wave starts at the arc's edge)
  const width = html.clientWidth;
  const gap = dipRect.width - 6;
  const line = document.createElement("div");
  line.className = "wk29-line";
  Object.assign(line.style, { left: "0px", top: barRect.bottom - 3 + "px", width: width + "px" });
  const mask = `linear-gradient(90deg,#000 0 calc(50% - ${gap / 2}px),transparent calc(50% - ${gap / 2}px) calc(50% + ${gap / 2}px),#000 calc(50% + ${gap / 2}px) 100%)`;
  line.style.webkitMask = mask;
  line.style.mask = mask;
  for (const dir of [-1, 1]) {
    const wave = document.createElement("i");
    line.appendChild(wave);
    run(wave, [{ opacity: 0, transform: `translateX(${dir * (gap / 2 - 4)}px)` }, { opacity: 1, offset: 0.2 }, { opacity: 0, transform: `translateX(${dir * (width / 2 + 80)}px)` }], { duration: 400, delay: 340, easing: "ease-out" });
  }
  layer.appendChild(line);

  // 3) one glint crosses the crown (masked by the lockup itself)
  const glint = document.createElement("div");
  glint.className = "wk29-glint";
  px(glint, crownRect);
  const source = `url("${crown.currentSrc || crown.src}")`;
  glint.style.webkitMaskImage = source;
  glint.style.maskImage = source;
  run(glint, [{ opacity: 1, backgroundPosition: "160% 0" }, { opacity: 1, backgroundPosition: "-60% 0" }], { duration: 600, delay: 100, easing: "ease-in-out" });
  layer.appendChild(glint);

  document.body.appendChild(layer);
  html.setAttribute("data-awakening", "go");
  let ended = false;
  const end = () => { if (ended) return; ended = true; animations.forEach((animation) => animation.cancel()); layer.remove(); html.removeAttribute("data-awakening"); };
  window.setTimeout(end, AWAKENING_MS + 400);
  return true;
}

function read(fn, fallback) { try { return fn(); } catch { return fallback; } }

export default function Awakening2029() {
  useEffect(() => {
    if (finished || typeof MutationObserver === "undefined") return undefined;
    let stopped = false;
    const stop = () => { stopped = true; observer.disconnect(); window.clearTimeout(giveUp); };
    const check = () => {
      if (stopped) return;
      const crown = document.querySelector(".sod29-header-crown img");
      if (!crown || document.querySelector(".sod29-opening")) return;
      finished = true;
      stop();
      const should = shouldPlayAwakening({
        search: read(() => window.location.search, ""),
        reducedMotion: read(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches, false),
        webdriver: read(() => navigator.webdriver === true, false),
        waitedMs: read(() => performance.now(), 0),
        scrolled: read(() => window.scrollY > 10 || document.documentElement.getAttribute("data-crown-scrolled") === "true", false),
      });
      if (should) read(() => play(crown), false);
    };
    const observer = new MutationObserver(check);
    observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
    const giveUp = window.setTimeout(stop, 20000);
    check();
    return stop;
  }, []);
  return null;
}
