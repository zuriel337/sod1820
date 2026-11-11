import React, { useState } from "react";
import NavigationIcon2029 from "./NavigationIcon2029.jsx";
import { nowPinUntilLabel } from "../../lib/nowPublications2029.js";
import { numberExpressionFocusHref } from "../../lib/research/numberExpressionFocus.js";
import "./royal2029.css";
import "./nowRoyalCenter2029.css";

// "עכשיו · המרכז" (ZURIEL 11.11.2026, approved design): the pinned central message and the source picker, shared by the Home centre and the
// "עכשיו" sheet. Presentation only over the ONE shared feed (nowModels → nowPinnedMessage / nowSourceChoices): no reader, store, flag or ranking.
// The owner's message is shown verbatim (never rewritten); its numbers open the existing number window; the Post keeps its own address.

/**
 * The pinned Post with its new update (ZURIEL 11.11.2026, second pass). The Post keeps its OWN title and identity, always; the update is a separate
 * layer under it ("🔔 עדכון חדש בפוסט · <date>"), shown as a one- or two-line summary and opened in place ("פתיחת העדכון" / "סגירת העדכון") to the
 * whole update: the owner's message, every number group with its phrases (numbers open the number window) and the owner's sentence. "לפוסט המלא"
 * is always a separate action. Nothing here renames the Post or creates a second publication.
 */
export function NowPinnedMessage2029({ pinned, onOpen }) {
  const [open, setOpen] = useState(false);
  if (!pinned) return null;
  const { central, until, href } = pinned;
  const groups = central.groups || [];
  const go = target => event => { if (!onOpen) return; event.preventDefault(); onOpen(target); };
  const numberLink = (value, expression = null) => numberExpressionFocusHref(value, expression ? { expression, method: "רגיל" } : { method: "רגיל" });
  const bodyId = `sod29-pin-full-${pinned.model.id}`.replace(/[^a-zA-Z0-9_-]/g, "-");
  // The Post's own title from its data source (posts.title); the update's own heading is only a fallback when that is missing.
  const postTitle = central.postTitle || central.title || "";
  const summary = central.lead ? [central.lead, central.leadSub].filter(Boolean).join(". ") : groups.map(group => `${group.phrases.join(" · ")} = ${group.value}`).join(" · ");
  return <article className={`rc29-pin r29 r29-hall is-feature${open ? " is-open" : ""}`} data-r29-kind="pinned" aria-label={postTitle || "הפוסט הנעוץ"} data-now-pinned-message={pinned.model.id}>
    <div className="rc29-pin-top">
      <span className="rc29-tag is-pin r29-badge is-pinned" data-now-pin-until={until}><NavigationIcon2029 name="kingdom" size={14} />נעוץ · {nowPinUntilLabel(until)}</span>
      <span className="rc29-tag is-kind r29-badge" data-r29-kind="post">פוסט</span>
    </div>
    <h3 className="rc29-pin-title" data-now-pinned-post-title="true">{postTitle}</h3>
    <section className="rc29-update" aria-label="עדכון חדש בפוסט" data-now-pinned-update="true" data-r29-kind="update">
      <p className="rc29-update-head"><span aria-hidden="true">🔔</span> <b>{central.kicker || "עדכון חדש בפוסט"}</b>{central.date ? <> · <time>{central.date}</time></> : null}</p>
      {open ? <div className="rc29-full" id={bodyId} data-now-pinned-full="true">
        {central.lead ? <div className="rc29-lead" data-now-pinned-lead="true"><strong className="rc29-lead-text">{central.lead}</strong>{central.leadSub ? <p>{central.leadSub}</p> : null}</div> : null}
        {central.fullTitle ? <strong className="rc29-full-title">{central.fullTitle}</strong> : null}
        {groups.map(group => {
          const numberHref = numberLink(group.value);
          return <div className="rc29-group" key={group.value} data-now-pinned-group={group.value}>
            {numberHref ? <a className="rc29-num r29-coin" href={numberHref} onClick={go(numberHref)} aria-label={`פתח את המספר ${group.value}`}><b>{group.value}</b></a> : <b className="rc29-num r29-coin"><b>{group.value}</b></b>}
            {group.phrases.map(phrase => {
              const phraseHref = (group.numberOnly || []).includes(phrase) ? numberHref : numberLink(group.value, phrase);
              return <div className="rc29-line" key={phrase}><span>{phrase}</span>{phraseHref ? <a href={phraseHref} onClick={go(phraseHref)}>= {group.value}</a> : <b>= {group.value}</b>}</div>;
            })}
          </div>;
        })}
        {central.statement ? <p className="rc29-statement" data-now-pinned-statement="true">{central.statement}</p> : null}
        <p className="rc29-owner">המסר בנוסח הבעלים. המערכת לא מנסחת אותו מחדש.</p>
      </div> : <>
        <p className="rc29-sum" data-now-pinned-summary="true">{summary}</p>
        {groups.length ? <div className="rc29-nums is-mini" aria-label="המספרים בעדכון">{groups.map(group => {
          const numberHref = numberLink(group.value);
          return numberHref ? <a key={group.value} className="rc29-num r29-coin" href={numberHref} onClick={go(numberHref)} aria-label={`פתח את המספר ${group.value}`}><b>{group.value}</b></a>
            : <b key={group.value} className="rc29-num r29-coin"><b>{group.value}</b></b>;
        })}</div> : null}
      </>}
    </section>
    <div className="rc29-acts">
      <button type="button" className="rc29-btn r29-btn is-primary is-update" aria-expanded={open} aria-controls={open ? bodyId : undefined} onClick={() => setOpen(value => !value)}>{open ? "סגירת העדכון" : "פתיחת העדכון"}</button>
      {href ? <a className="rc29-btn r29-btn is-quiet" href={href} onClick={go(href)} data-now-pinned-post="true">לפוסט המלא ←</a> : null}
    </div>
  </article>;
}

const KIND_ICON = { group: "community", channel: "signal", series: "posts", site: "spark" };

/** One source picker: "הכול" by default, then each source with its kind (group / channel / series / the site's publications). */
export function NowSourcePicker2029({ choices, value, onChange, total }) {
  if (!choices?.length) return null;
  const chip = (id, label, kindLabel, icon, logo, count, kind = "all") => <button key={id || "all"} type="button" className="rc29-chip r29-chip" data-kind={kind} data-r29-kind={kind} aria-pressed={value === id}
    onClick={() => onChange(id)} data-now-source={id || "all"} aria-label={`${label}${kindLabel ? ` · ${kindLabel}` : ""}, ${count} פרסומים בחלונית`}>
    <span className="rc29-cm r29-medal" aria-hidden="true">{logo ? <img src={logo.src} alt="" width="28" height="28" loading="lazy" decoding="async" /> : <NavigationIcon2029 name={icon} size={16} />}</span>
    <span aria-hidden="true"><b>{label}</b><small>{kindLabel}{count ? ` · ${count}` : ""}</small></span>
  </button>;
  return <div className="rc29-src r29" role="group" aria-label="בחירת מקור">
    {chip("", "הכול", "כל המקורות", "layers", null, total)}
    {choices.map(item => chip(item.id, item.label, item.kindLabel, KIND_ICON[item.kind] || "spark", item.logo, item.count, item.kind))}
  </div>;
}

/** The empty state of a chosen source with nothing in the window (never hidden, never an error). */
export const NowSourceEmpty2029 = ({ label }) => <p className="rc29-empty" role="status">אין פרסום חדש מ{label ? `״${label}״` : "המקור הזה"} בימים האחרונים.</p>;
