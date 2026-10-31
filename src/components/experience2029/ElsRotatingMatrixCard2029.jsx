// Home entrance to the biblical cipher (ELS): an illustrative, softly rotating letter matrix beside a dark panel.
// Presentation only. It starts no ELS engine, scan, AI call or result load; the matrix is a deterministic
// decoration (aria-hidden) and is labelled "illustration" in the live panel. Title, sentence and button are
// live UI. Availability comes from the existing `lock_els` feature state - nothing is enabled locally.
// Motion: one CSS transform animation (the rig); paused off-screen and in a hidden tab; absent under reduced motion
// (OS or frame); a visible pause control exists whenever the motion can run.
import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useFeatureState } from "../MaintenanceLock.jsx";
import { DESIGN_V2_PALETTES } from "../../lib/palette.js";
import "./elsRotatingMatrixCard2029.css";

export const ELS_CARD_TITLE = "חיפוש בצופן התנ״כי";
// A factual sentence. The ELS page itself states "no AI guessing"; AI is not part of this capability.
export const ELS_CARD_SENTENCE = "דילוגי אותיות בתורה ובכל התנ״ך, עם אימות כל מופע במנוע.";
export const ELS_CARD_ACTION = "פתח את הצופן";
export const ELS_CARD_NOTE = "מטריצה להמחשה";
export const ELS_CARD_HREF = "/code";

// The card is a bounded "Night window": its roles are read from the single palette owner (Night preset),
// so the dark panel stays readable in Day, Parchment and Night. No colour is defined here.
const NIGHT = DESIGN_V2_PALETTES.dark;
const SCOPE = Object.freeze({
  "--els-bg": NIGHT.pageBg, "--els-surface": NIGHT.card, "--els-ink": NIGHT.ink, "--els-ink-soft": NIGHT.inkSoft,
  "--els-line": NIGHT.borderStrong, "--els-cyan": NIGHT.accentDiscovery, "--els-violet": NIGHT.accentSecondary,
  "--els-blue": NIGHT.accentText, "--els-gold": NIGHT.brandGold, "--els-sapphire": NIGHT.brandSapphire,
  "--els-focus": NIGHT.focusRing, "--els-btn": NIGHT.accentBtn, "--els-on-accent": NIGHT.onAccent,
  "--els-hero": NIGHT.heroNum,
});

const COLS = 15;
const ROWS = 10;
// Decorative letters only (no final forms), weighted towards frequent letters. Deterministic: no Math.random.
const WEIGHTED = "יייוווההההאאאלללמממבבשרתעקכנדחפצגסזט";
// An illustrative line of equal steps (right to left in the RTL grid) - not a result.
const PATH = Object.freeze([
  { ch: "ת", c: 2, r: 3 }, { ch: "ו", c: 5, r: 4 }, { ch: "ר", c: 8, r: 5 }, { ch: "ה", c: 11, r: 6 },
]);

function seeded(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Two flat-coloured layers only: a dim far layer and a lit near layer (a few letters "closer" = larger).
// Glow is a static text-shadow painted once into the layer; there is no filter and no per-frame effect.
function buildLayer(seed, keep, { tone = false, near = 0 } = {}) {
  const next = seeded(seed);
  const taken = new Set(PATH.map(({ c, r }) => `${c}:${r}`));
  const cells = [];
  for (let r = 1; r <= ROWS; r += 1) {
    for (let c = 1; c <= COLS; c += 1) {
      const ch = WEIGHTED[Math.floor(next() * WEIGHTED.length)];
      const kept = next() < keep;
      const isNear = next() < near;
      if (kept && !taken.has(`${c}:${r}`)) cells.push({ ch, c, r, tone: tone ? (c * 3 + r * 5) % 4 : null, near: isNear });
    }
  }
  return cells;
}

const LAYERS = Object.freeze({
  back: buildLayer(1820, 0.92),
  mid: buildLayer(29, 0.5, { tone: true, near: 0.07 }),
});

// SVG x runs physically left to right; RTL column 1 is the rightmost cell.
const lineX = (c) => COLS - (c - 0.5);
const lineY = (r) => r - 0.5;

function Layer({ name, cells, children = null }) {
  return <div className={`els-hm__layer is-${name}`}>
    {children}
    {cells.map(({ ch, c, r, tone, near }) => <span key={`${c}:${r}`} className={tone == null ? undefined : `t${tone}${near ? " is-near" : ""}`} style={{ gridColumn: c, gridRow: r }}>{ch}</span>)}
  </div>;
}

function useMatrixMotion(rootRef) {
  const [inView, setInView] = useState(true);
  const [tabVisible, setTabVisible] = useState(() => typeof document === "undefined" || document.visibilityState !== "hidden");
  const [reduced, setReduced] = useState(() => typeof window !== "undefined" && typeof window.matchMedia === "function"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    const onVisibility = () => setTabVisible(document.visibilityState !== "hidden");
    document.addEventListener("visibilitychange", onVisibility);
    let query = null;
    const onQuery = () => setReduced(Boolean(query?.matches));
    if (typeof window.matchMedia === "function") {
      query = window.matchMedia("(prefers-reduced-motion: reduce)");
      query.addEventListener?.("change", onQuery);
    }
    let observer = null;
    if (typeof IntersectionObserver === "function" && rootRef.current) {
      observer = new IntersectionObserver((entries) => {
        const last = entries[entries.length - 1];
        if (last) setInView(last.isIntersecting);
      }, { threshold: 0 });
      observer.observe(rootRef.current);
    }
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      query?.removeEventListener?.("change", onQuery);
      observer?.disconnect();
    };
  }, [rootRef]);
  return { inView, tabVisible, reduced };
}

function Action({ state }) {
  if (state.loading) {
    return <span className="h29-btn els-hm__cta is-closed" role="status" aria-disabled="true">בודק זמינות…</span>;
  }
  if (state.blocked) {
    const label = state.status === "registered_only" ? "פתוח למשתמשים רשומים" : "הצופן ייפתח בקרוב";
    return <span className="h29-btn els-hm__cta is-closed" aria-disabled="true">{label}</span>;
  }
  return <Link className="h29-btn is-primary els-hm__cta" to={ELS_CARD_HREF}>{ELS_CARD_ACTION}<span aria-hidden="true"> ←</span></Link>;
}

export default function ElsRotatingMatrixCard2029() {
  const state = useFeatureState("lock_els");
  const rootRef = useRef(null);
  const { inView, tabVisible, reduced } = useMatrixMotion(rootRef);
  const [userPaused, setUserPaused] = useState(false);
  const running = inView && tabVisible && !userPaused && !reduced;
  const availability = state.loading ? "loading" : state.blocked ? "blocked" : "open";

  return <section
    ref={rootRef}
    className="els-hm"
    style={SCOPE}
    aria-labelledby="els-hm-title"
    data-experience-capability="home-els-entry"
    data-els-availability={availability}
    data-els-motion={running ? "running" : "paused"}
  >
    <div className="els-hm__stage" aria-hidden="true">
      <div className="els-hm__rigwrap">
        <Layer name="back" cells={LAYERS.back} />
        <div className="els-hm__rig">
          <Layer name="mid" cells={LAYERS.mid}>
            <svg className="els-hm__line" viewBox={`0 0 ${COLS} ${ROWS}`} preserveAspectRatio="none" focusable="false">
              <line className="is-halo" x1={lineX(PATH[0].c)} y1={lineY(PATH[0].r)} x2={lineX(PATH[PATH.length - 1].c)} y2={lineY(PATH[PATH.length - 1].r)} vectorEffect="non-scaling-stroke" />
              <line className="is-thread" x1={lineX(PATH[0].c)} y1={lineY(PATH[0].r)} x2={lineX(PATH[PATH.length - 1].c)} y2={lineY(PATH[PATH.length - 1].r)} vectorEffect="non-scaling-stroke" />
            </svg>
            {PATH.map(({ ch, c, r }) => <span key={`path-${c}:${r}`} className="is-path" style={{ gridColumn: c, gridRow: r }}>{ch}</span>)}
          </Layer>
        </div>
      </div>
      <i className="els-hm__scrim" />
    </div>

    {!reduced ? <button
      type="button"
      className="els-hm__pause"
      aria-pressed={userPaused}
      aria-label="השהיית תנועת המטריצה"
      title={userPaused ? "הפעלת תנועת המטריצה" : "השהיית תנועת המטריצה"}
      onClick={() => setUserPaused((value) => !value)}
    >
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
        {userPaused ? <path d="M8 5.5v13l11-6.5z" /> : <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" />}
      </svg>
    </button> : null}

    <div className="els-hm__panel">
      <h2 id="els-hm-title" className="els-hm__title">{ELS_CARD_TITLE}</h2>
      <p className="els-hm__sentence">{ELS_CARD_SENTENCE}</p>
      <div className="els-hm__actions">
        <Action state={state} />
      </div>
      <small className="els-hm__note">{ELS_CARD_NOTE}</small>
    </div>
  </section>;
}
