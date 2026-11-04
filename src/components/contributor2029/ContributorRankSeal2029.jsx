import React, { useEffect, useId, useRef, useState } from "react";
import { use2029Palette } from "../../lib/palette.js";
import { fetchPublicContributorRank, publicContributorRank } from "./contributorRank2029Model.js";
import "./contributorRankSeal2029.css";

const STATUS = { loading: "טוען את הדרגה…", unlinked: "אין עדיין דרגה מקושרת", not_found: "דרגה אינה זמינה להצגה", unavailable: "הדרגה אינה זמינה כרגע" };

const safeHref = (href) => typeof href === "string" && (/^\/(?!\/)/.test(href) || /^https:\/\//i.test(href)) ? href : "";
const safeAvatar = (url) => typeof url === "string" && (/^\/(?!\/)/.test(url) || /^https:\/\//i.test(url)) ? url : "";
const initialOf = (name) => (typeof name === "string" ? Array.from(name.trim())[0] : "") || "✦";

export function ContributorRankSeal2029({ rank: input, name, onRetry, avatar, bio, links }) {
  const rank = publicContributorRank(input);
  const P = use2029Palette();
  const [flipped, setFlipped] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const stage = useRef(null);
  const panelId = useId();
  const caption = rank.state === "ready" ? rank.label : STATUS[rank.state];
  const portrait = avatarFailed ? "" : safeAvatar(avatar);
  const about = typeof bio === "string" ? bio.trim() : "";
  const navLinks = (Array.isArray(links) ? links : []).map((link) => ({ label: typeof link?.label === "string" ? link.label.trim() : "", href: safeHref(link?.href) })).filter((link) => link.label && link.href);
  const hasDetail = Boolean(about) || navLinks.length > 0;
  const resetTilt = () => { stage.current?.style.setProperty("--rank-tilt-x", "0deg"); stage.current?.style.setProperty("--rank-tilt-y", "0deg"); };
  const tilt = (event) => {
    if (event.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    stage.current?.style.setProperty("--rank-tilt-x", `${(0.5 - (event.clientY - bounds.top) / bounds.height) * 12}deg`);
    stage.current?.style.setProperty("--rank-tilt-y", `${((event.clientX - bounds.left) / bounds.width - 0.5) * 18}deg`);
  };
  const lights = rank.state === "ready" ? <div className="pc-rank-lights">{Array.from({ length: 5 }, (_, index) => <i key={index} data-lit={index < rank.level} />)}</div> : null;
  return <figure className="pc-rank" data-rank-state={rank.state} data-flipped={flipped} aria-label={`דרגת הכותב ${name || ""}`}
    style={{ "--rank-sapphire": P.brandSapphire, "--rank-gold": P.brandGold, "--rank-violet": P.accentSecondary,
      "--rank-card": P.card, "--rank-soft": P.cardSoft, "--rank-ink": P.ink, "--rank-muted": P.inkSoft,
      "--rank-border": P.border, "--rank-accent": P.accentText, "--rank-focus": P.focusRing || P.accent }}>
    <div className="pc-rank-scene" ref={stage} onPointerMove={tilt} onPointerLeave={resetTilt} aria-hidden="true" style={{ "--rank-turn": flipped ? "180deg" : "0deg" }}>
      <div className="pc-rank-halo" /><div className="pc-rank-floor" />
      <div className="pc-rank-orbit pc-rank-orbit-a" /><div className="pc-rank-orbit pc-rank-orbit-b" />
      <div className="pc-rank-prism">
        {Array.from({ length: 6 }, (_, index) => <i key={index} className="pc-rank-side" style={{ "--rank-face-angle": `${index * 60}deg` }} />)}
        <div className="pc-rank-face pc-rank-front">
          <div className="pc-rank-glass"><i className="pc-rank-facet pc-rank-facet-a" /><i className="pc-rank-facet pc-rank-facet-b" />
            {portrait ? <img className="pc-rank-portrait" src={portrait} alt="" loading="lazy" decoding="async" onError={() => setAvatarFailed(true)} />
              : <span className="pc-rank-number pc-rank-initial">{initialOf(name)}</span>}
            {lights}
          </div>
        </div>
        <div className="pc-rank-face pc-rank-back">
          <div className="pc-rank-glass"><i className="pc-rank-facet pc-rank-facet-a" /><i className="pc-rank-facet pc-rank-facet-b" />
            <span className="pc-rank-number">{rank.state === "ready" ? rank.level : "✦"}</span>
            {lights}
          </div>
        </div>
      </div>
      <span className="pc-rank-spark pc-rank-spark-a" /><span className="pc-rank-spark pc-rank-spark-b" />
    </div>
    <figcaption className="pc-rank-copy">
      <span className="pc-rank-kicker">דרגת כותב</span>
      <strong className="pc-rank-label" role="status">{caption}</strong>
      {rank.state === "ready" ? <span className="pc-rank-level">דרגה <bdi className="pc-number">{rank.level}</bdi> מתוך <bdi className="pc-number">5</bdi></span> : null}
      <div className="pc-rank-actions">
        {hasDetail ? <button type="button" className="pc-rank-flip" aria-expanded={flipped} aria-controls={panelId} onClick={() => setFlipped((value) => !value)}>
          {flipped ? "חזרה לחזית" : "על הכותב"} <span aria-hidden="true">↻</span></button> : null}
        {rank.state === "unavailable" && onRetry ? <button type="button" onClick={onRetry}>ניסיון נוסף</button> : null}</div>
      {hasDetail ? <div className="pc-rank-detail" id={panelId} hidden={!flipped}>
        {about ? <p className="pc-rank-bio">{about}</p> : null}
        {navLinks.length ? <nav aria-label={`קישורים של ${name || "הכותב"}`}><ul className="pc-rank-links">
          {navLinks.map((link) => <li key={`${link.href}|${link.label}`}><a href={link.href}>{link.label}</a></li>)}</ul></nav> : null}
      </div> : null}
      <details className="pc-rank-about"><summary>על הדרגה</summary><p>הדרגה מבטאת פעילות לפי מנגנון הדרגות הקיים. היא אינה מדד לאמיתות התוכן או לחוזק של ממצא.</p></details>
    </figcaption>
  </figure>;
}

export default function PublicContributorRank2029({ canonicalHref, name, previewRank, avatar, bio, links }) {
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
  return <ContributorRankSeal2029 name={name} rank={rank} avatar={avatar} bio={bio} links={links} onRetry={() => setAttempt((value) => value + 1)} />;
}
