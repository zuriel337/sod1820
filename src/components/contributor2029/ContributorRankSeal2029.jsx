import React, { useEffect, useRef, useState } from "react";
import { use2029Palette } from "../../lib/palette.js";
import { fetchPublicContributorRank, publicContributorRank } from "./contributorRank2029Model.js";
import "./contributorRankSeal2029.css";

const STATUS = { loading: "טוען את הדרגה…", unlinked: "אין עדיין דרגה מקושרת", not_found: "דרגה אינה זמינה להצגה", unavailable: "הדרגה אינה זמינה כרגע" };

export function ContributorRankSeal2029({ rank: input, name, onRetry }) {
  const rank = publicContributorRank(input);
  const P = use2029Palette();
  const [rotation, setRotation] = useState(0);
  const stage = useRef(null);
  const caption = rank.state === "ready" ? rank.label : STATUS[rank.state];
  const resetTilt = () => { stage.current?.style.setProperty("--rank-tilt-x", "0deg"); stage.current?.style.setProperty("--rank-tilt-y", "0deg"); };
  const tilt = (event) => {
    if (event.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    stage.current?.style.setProperty("--rank-tilt-x", `${(0.5 - (event.clientY - bounds.top) / bounds.height) * 12}deg`);
    stage.current?.style.setProperty("--rank-tilt-y", `${((event.clientX - bounds.left) / bounds.width - 0.5) * 18}deg`);
  };
  return <figure className="pc-rank" data-rank-state={rank.state} aria-label={`דרגת הכותב ${name || ""}`}
    style={{ "--rank-sapphire": P.brandSapphire, "--rank-gold": P.brandGold, "--rank-violet": P.accentSecondary,
      "--rank-card": P.card, "--rank-soft": P.cardSoft, "--rank-ink": P.ink, "--rank-muted": P.inkSoft,
      "--rank-border": P.border, "--rank-accent": P.accentText, "--rank-focus": P.focusRing || P.accent }}>
    <div className="pc-rank-scene" ref={stage} onPointerMove={tilt} onPointerLeave={resetTilt} aria-hidden="true" style={{ "--rank-turn": `${rotation}deg` }}>
      <div className="pc-rank-halo" /><div className="pc-rank-floor" />
      <div className="pc-rank-orbit pc-rank-orbit-a" /><div className="pc-rank-orbit pc-rank-orbit-b" />
      <div className="pc-rank-prism">
        {Array.from({ length: 6 }, (_, index) => <i key={index} className="pc-rank-side" style={{ "--rank-face-angle": `${index * 60}deg` }} />)}
        {["front", "back"].map((face) => <div key={face} className={`pc-rank-face pc-rank-${face}`}>
          <div className="pc-rank-glass"><i className="pc-rank-facet pc-rank-facet-a" /><i className="pc-rank-facet pc-rank-facet-b" />
            <span className="pc-rank-number">{rank.state === "ready" ? rank.level : "✦"}</span>
            {rank.state === "ready" ? <div className="pc-rank-lights">{Array.from({ length: 5 }, (_, index) => <i key={index} data-lit={index < rank.level} />)}</div> : null}
          </div>
        </div>)}
      </div>
      <span className="pc-rank-spark pc-rank-spark-a" /><span className="pc-rank-spark pc-rank-spark-b" />
    </div>
    <figcaption className="pc-rank-copy">
      <span className="pc-rank-kicker">דרגת כותב</span>
      <strong className="pc-rank-label" role="status">{caption}</strong>
      {rank.state === "ready" ? <span className="pc-rank-level">דרגה <bdi className="pc-number">{rank.level}</bdi> מתוך <bdi className="pc-number">5</bdi></span> : null}
      <div className="pc-rank-actions"><button type="button" onClick={() => setRotation((value) => value + 60)} aria-label="סובב את חותם הכותב">סיבוב החותם <span aria-hidden="true">↻</span></button>
        {rank.state === "unavailable" && onRetry ? <button type="button" onClick={onRetry}>ניסיון נוסף</button> : null}</div>
      <details className="pc-rank-about"><summary>על הדרגה</summary><p>הדרגה מבטאת פעילות לפי מנגנון הדרגות הקיים. היא אינה מדד לאמיתות התוכן או לחוזק של ממצא.</p></details>
    </figcaption>
  </figure>;
}

export default function PublicContributorRank2029({ canonicalHref, name, previewRank }) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ key: null, rank: { state: "loading" } });
  const key = canonicalHref?.split("/").at(-1) || "";
  useEffect(() => {
    if (previewRank !== undefined || !key) return;
    let current = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    setState({ key, rank: { state: "loading" } });
    fetchPublicContributorRank(key, { signal: controller.signal }).then((rank) => {
      if (current) setState({ key, rank: controller.signal.aborted ? { state: "unavailable" } : rank });
    }).finally(() => clearTimeout(timeout));
    return () => { current = false; clearTimeout(timeout); controller.abort(); };
  }, [key, attempt, previewRank]);
  const rank = previewRank !== undefined ? previewRank : state.key === key ? state.rank : { state: "loading" };
  return <ContributorRankSeal2029 name={name} rank={rank} onRetry={() => setAttempt((value) => value + 1)} />;
}
