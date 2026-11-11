import React, { useState } from "react";
import NavigationIcon2029 from "./NavigationIcon2029.jsx";
import { nowPinUntilLabel } from "../../lib/nowPublications2029.js";
import { numberExpressionFocusHref } from "../../lib/research/numberExpressionFocus.js";
import "./nowRoyalCenter2029.css";

// "עכשיו · המרכז" (ZURIEL 11.11.2026, approved design): the pinned central message and the source picker, shared by the Home centre and the
// "עכשיו" sheet. Presentation only over the ONE shared feed (nowModels → nowPinnedMessage / nowSourceChoices): no reader, store, flag or ranking.
// The owner's message is shown verbatim (never rewritten); its numbers open the existing number window; the Post keeps its own address.

/** The pinned central message: a short summary, opened in place to every line before entering the Post. */
export function NowPinnedMessage2029({ pinned, onOpen }) {
  const [open, setOpen] = useState(false);
  if (!pinned) return null;
  const { central, until, href } = pinned;
  const groups = central.groups || [];
  const go = target => event => { if (!onOpen) return; event.preventDefault(); onOpen(target); };
  const numberLink = (value, expression = null) => numberExpressionFocusHref(value, expression ? { expression, method: "רגיל" } : { method: "רגיל" });
  const bodyId = `sod29-pin-full-${pinned.model.id}`.replace(/[^a-zA-Z0-9_-]/g, "-");
  const summary = central.lead ? null : groups.map(group => `${group.phrases.join(" · ")} = ${group.value}`).join(" · ");
  return <article className="rc29-pin" aria-label="המסר המרכזי" data-now-pinned-message={pinned.model.id}>
    <div className="rc29-pin-top">
      <span className="rc29-tag is-pin" data-now-pin-until={until}><NavigationIcon2029 name="kingdom" size={14} />נעוץ · {nowPinUntilLabel(until)}</span>
      {central.kicker || central.date ? <span className="rc29-tag">{[central.kicker, central.date].filter(Boolean).join(" · ")}</span> : null}
    </div>
    {central.lead ? <div className="rc29-lead" data-now-pinned-lead="true"><h3 className="rc29-pin-title is-lead">{central.lead}</h3>{central.leadSub ? <p>{central.leadSub}</p> : null}</div>
      : <h3 className="rc29-pin-title">{central.title}</h3>}
    {open ? <div className="rc29-full" id={bodyId} data-now-pinned-full="true">
      {central.fullTitle ? <strong className="rc29-full-title">{central.fullTitle}</strong> : null}
      {groups.map(group => {
        const numberHref = numberLink(group.value);
        return <div className="rc29-group" key={group.value} data-now-pinned-group={group.value}>
          {numberHref ? <a className="rc29-num" href={numberHref} onClick={go(numberHref)} aria-label={`פתח את המספר ${group.value}`}><b>{group.value}</b></a> : <b className="rc29-num"><b>{group.value}</b></b>}
          {group.phrases.map(phrase => {
            const phraseHref = (group.numberOnly || []).includes(phrase) ? numberHref : numberLink(group.value, phrase);
            return <div className="rc29-line" key={phrase}><span>{phrase}</span>{phraseHref ? <a href={phraseHref} onClick={go(phraseHref)}>= {group.value}</a> : <b>= {group.value}</b>}</div>;
          })}
        </div>;
      })}
      {central.statement ? <p className="rc29-statement" data-now-pinned-statement="true">{central.statement}</p> : null}
      <p className="rc29-owner">המסר בנוסח הבעלים. המערכת לא מנסחת אותו מחדש.</p>
    </div> : <>
      <div className={`rc29-nums${central.lead ? " is-compact" : ""}`}>{groups.map(group => {
        const numberHref = numberLink(group.value);
        return numberHref ? <a key={group.value} className="rc29-num" href={numberHref} onClick={go(numberHref)} aria-label={`פתח את המספר ${group.value}`}><b>{group.value}</b></a>
          : <b key={group.value} className="rc29-num"><b>{group.value}</b></b>;
      })}</div>
      {summary ? <p className="rc29-sum">{summary}</p> : null}
    </>}
    {central.postTitle ? <div className="rc29-from">מתוך הפוסט <b>{central.postTitle}</b></div> : null}
    <div className="rc29-acts">
      <button type="button" className="rc29-btn" aria-expanded={open} aria-controls={open ? bodyId : undefined} onClick={() => setOpen(value => !value)}>{open ? "סגירת המסר" : central.lead ? "כל המסר והחיבורים" : "כל המסר"}</button>
      {href ? <a className="rc29-btn is-quiet" href={href} onClick={go(href)} data-now-pinned-post="true">לפוסט המקורי ←</a> : null}
    </div>
  </article>;
}

const KIND_ICON = { group: "community", channel: "signal", series: "posts", site: "spark" };

/** One source picker: "הכול" by default, then each source with its kind (group / channel / series / the site's publications). */
export function NowSourcePicker2029({ choices, value, onChange, total }) {
  if (!choices?.length) return null;
  const chip = (id, label, kindLabel, icon, logo, count) => <button key={id || "all"} type="button" className="rc29-chip" aria-pressed={value === id}
    onClick={() => onChange(id)} data-now-source={id || "all"} aria-label={`${label}${kindLabel ? ` · ${kindLabel}` : ""}, ${count} פרסומים בחלונית`}>
    <span className="rc29-cm" aria-hidden="true">{logo ? <img src={logo.src} alt="" width="28" height="28" loading="lazy" decoding="async" /> : <NavigationIcon2029 name={icon} size={16} />}</span>
    <span aria-hidden="true"><b>{label}</b><small>{kindLabel}{count ? ` · ${count}` : ""}</small></span>
  </button>;
  return <div className="rc29-src" role="group" aria-label="בחירת מקור">
    {chip("", "הכול", "כל המקורות", "layers", null, total)}
    {choices.map(item => chip(item.id, item.label, item.kindLabel, KIND_ICON[item.kind] || "spark", item.logo, item.count))}
  </div>;
}

/** The empty state of a chosen source with nothing in the window (never hidden, never an error). */
export const NowSourceEmpty2029 = ({ label }) => <p className="rc29-empty" role="status">אין פרסום חדש מ{label ? `״${label}״` : "המקור הזה"} בימים האחרונים.</p>;
