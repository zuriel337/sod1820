import React, { useId, useRef, useState } from "react";
import { use2029Palette } from "../../lib/palette.js";
import { bilingualDateLabel } from "../../lib/relativeTime2029.js";
import "./contributorPersonMedallion2029.css";

const safeUrl = (url) => typeof url === "string" && (/^\/(?!\/)/.test(url) || /^https:\/\//i.test(url)) ? url : "";

// Identity medallion for the public writer family. The centre is the approved public portrait or the first
// letter of the name. Depth is presentation only: it never encodes a rank, a score or a percentage.
// An outer research-standing ring exists only when the authorized evidence adapter supplied a level.
export default function ContributorPersonMedallion2029({ person, name, avatar, bio, links }) {
  const P = use2029Palette();
  const [open, setOpen] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const scene = useRef(null);
  const panelId = useId();
  if (!person) return null;
  const portrait = avatarFailed ? "" : safeUrl(avatar);
  const about = typeof bio === "string" ? bio.trim() : "";
  const navLinks = (Array.isArray(links) ? links : []).map((link) => ({ label: typeof link?.label === "string" ? link.label.trim() : "", href: safeUrl(link?.href) })).filter((link) => link.label && link.href);
  const registered = person.registeredAt ? bilingualDateLabel(person.registeredAt) : "";
  const reset = () => { scene.current?.style.setProperty("--pm-tilt-x", "0deg"); scene.current?.style.setProperty("--pm-tilt-y", "0deg"); };
  const tilt = (event) => {
    if (event.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const box = event.currentTarget.getBoundingClientRect();
    scene.current?.style.setProperty("--pm-tilt-x", `${(0.5 - (event.clientY - box.top) / box.height) * 14}deg`);
    scene.current?.style.setProperty("--pm-tilt-y", `${((event.clientX - box.left) / box.width - 0.5) * 20}deg`);
  };
  const label = `הדרך של ${name || "הכותב"}`;
  return <div className="pc-person" data-open={open} data-mode={person.mode} data-standing={person.standing ? "ready" : "unmeasured"}
    style={{ "--pm-sapphire": P.brandSapphire, "--pm-gold": P.brandGold, "--pm-violet": P.accentSecondary,
      "--pm-card": P.card, "--pm-soft": P.cardSoft, "--pm-ink": P.ink, "--pm-muted": P.inkSoft,
      "--pm-border": P.border, "--pm-accent": P.accentText, "--pm-focus": P.focusRing || P.accent }}>
    <div className="pc-person-seal" role="presentation" onPointerMove={tilt} onPointerLeave={reset} onClick={() => setOpen((value) => !value)}>
      <div className="pc-person-scene" ref={scene} aria-hidden="true">
        <i className="pc-person-shadow" />
        <div className="pc-person-stack">
          {person.standing ? <i className="pc-person-ring" /> : null}
          <i className="pc-person-rim" />
          <div className="pc-person-face">
            <i className="pc-person-facet pc-person-facet-a" /><i className="pc-person-facet pc-person-facet-b" />
            {portrait ? <img className="pc-person-portrait" src={portrait} alt="" loading="lazy" decoding="async" onError={() => setAvatarFailed(true)} />
              : <span className="pc-person-initial" data-length={Array.from(person.initial).length}>{person.initial}</span>}
          </div>
          {person.standing ? <span className="pc-person-level">{person.standing.level}</span> : null}
        </div>
      </div>
    </div>
    <div className="pc-person-copy">
      <ul className="pc-person-labels" aria-label="התפקידים של האדם">
        {person.labels.map((item) => <li key={item}>{item}</li>)}
      </ul>
      {person.standing ? <p className="pc-person-standing">מעמד מחקרי: <bdi className="pc-number">{person.standing.level}</bdi> <span className="pc-person-muted">לפי מתאם ראיות מוסמך</span></p> : null}
      {person.summary.length ? <dl className="pc-person-summary" aria-label="מדידות זמינות">
        {person.summary.map((item) => <div key={item.key}><dt>{item.label}</dt><dd><bdi className="pc-number">{item.valueText}</bdi></dd></div>)}
      </dl> : null}
      <button type="button" className="pc-person-toggle" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((value) => !value)}>
        {label} <span aria-hidden="true" className="pc-person-chevron">{open ? "−" : "+"}</span>
      </button>
    </div>
    <div className="pc-person-panel" id={panelId} role="region" aria-label={label} hidden={!open}>
      {about ? <section className="pc-person-block pc-person-about-block"><h2>{person.aboutLabel}</h2><p className="pc-person-about">{about}</p></section> : null}
      <section className="pc-person-block">
        <h2>מה נמדד</h2>
        {person.measured.length ? person.measured.map((group) => <div key={group.key} className="pc-person-group">
          <h3>{group.label}</h3>
          <dl>{group.items.map((item) => <div key={item.key} className="pc-person-measure">
            <dt>{item.label}</dt><dd><bdi className="pc-number">{item.valueText}</bdi></dd>
            <dd className="pc-person-explain">{item.explain} מקור: {item.source}.</dd>
          </div>)}</dl>
        </div>) : <p className="pc-person-muted">עדיין אין מדידה ציבורית שלמה להצגה.</p>}
        {registered ? <div className="pc-person-group"><h3>ותק והמשכיות</h3>
          <p>נרשם לאתר ב<bdi>{registered}</bdi>. {person.registrationNote}</p></div> : null}
      </section>
      {person.unmeasured.length ? <section className="pc-person-block">
        <h2>עדיין לא נמדד</h2>
        <p className="pc-person-muted">נתון שלא נמדד אינו מוצג כאפס.</p>
        <ul className="pc-person-gaps">{person.unmeasured.map((item) => <li key={item.key}><strong>{item.label}</strong>{item.reason ? <span> {item.reason}</span> : null}</li>)}</ul>
      </section> : null}
      {navLinks.length ? <nav aria-label={`קישורים של ${name || "הכותב"}`}><ul className="pc-person-links">
        {navLinks.map((link) => <li key={`${link.href}|${link.label}`}><a href={link.href}>{link.label}</a></li>)}</ul></nav> : null}
      {person.binding ? <p className="pc-person-note">{person.binding}</p> : null}
    </div>
  </div>;
}
