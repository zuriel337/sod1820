import React, { Suspense, useEffect, useId, useRef, useState } from "react";
import NavigationIcon2029 from "./NavigationIcon2029.jsx";
import { PERSONAL_GROUPS } from "../../lib/userCenter/personalArea2029.js";
import "./royal2029.css";
import "./personalArea2029.css";

// "האזור האישי שלי" in the language of "עכשיו" and "עוד" (Royal 2029): the account first, then compact cards under clear headings, with the
// long lists (research and saved items, follows, Raziel) opening on demand. Presentation only: the frame hands in the model
// (personalCards), the existing section nodes and its existing openers. No data is read, stored or decided here.
//
// Interaction contract (one entry, one destination per capability):
//   module/href cards -> onNavigate(card)   section "research" | "follow" | "companion" -> opens its list here
//   section "raziel" | "hints"              -> onAction(card)   { signIn } -> focuses the account form on top
// A card that is closed (locked / building) is a labelled status with the real reason, never a button.

const STATE_LABEL = { locked: "נעול", building: "בבנייה", unavailable: "לא זמין" };
const HUE = Object.fromEntries(PERSONAL_GROUPS.map(group => [group.id, group.hue]));

function Card({ card, onPress }) {
  const hintId = useId();
  const closed = card.state !== "live";
  const body = <>
    <span className="pa29-medal r29-medal" aria-hidden="true"><NavigationIcon2029 name={card.icon} size={20} /></span>
    <span className="pa29-card-text"><strong>{card.title}</strong><small id={hintId}>{card.hint}</small></span>
    {closed ? <span className="pa29-state r29-badge" data-pa29-state={card.state}>{STATE_LABEL[card.state] || "סגור"}</span>
      : <span className="pa29-chev" aria-hidden="true" />}
  </>;
  const common = { className: `pa29-card r29-card${closed ? " is-closed" : ""}`, "data-r29-kind": HUE[card.group] || "me", "data-workspace-card": card.id, "data-card-state": card.state,
    "aria-describedby": hintId, title: closed && card.reason ? card.reason : undefined };
  if (closed) return <div {...common} role="group" aria-disabled="true" aria-label={`${card.title}: ${STATE_LABEL[card.state] || "סגור"}`}>{body}</div>;
  return <button type="button" {...common} onClick={() => onPress(card)}>{body}</button>;
}

function Disclosure({ id, open, onToggle, icon, title, hint, children, hue = "research", cardId }) {
  const bodyId = `pa29-${id}-body`;
  return <section className={`pa29-more r29-card${open ? " is-open" : ""}`} data-r29-kind={hue} data-workspace-section={id} data-workspace-card={cardId || undefined}>
    <button type="button" className="pa29-more-head" aria-expanded={open} aria-controls={bodyId} onClick={() => onToggle(id)}>
      <span className="pa29-medal r29-medal" aria-hidden="true"><NavigationIcon2029 name={icon} size={20} /></span>
      <span className="pa29-card-text"><strong>{title}</strong>{hint ? <small>{hint}</small> : null}</span>
      <span className="pa29-chev" aria-hidden="true" />
    </button>
    {/* A lazy part inside a list must suspend only this list: the frame-level boundary would hide the whole panel and reset its scroll. */}
    {open ? <div className="pa29-more-body" id={bodyId}><Suspense fallback={<p role="status" className="pa29-loading">טוען…</p>}>{children}</Suspense></div> : null}
  </section>;
}

export default function PersonalHome2029({ signedIn, name, email, avatar, stats, follows, inbox, cards, primary, onPrimary, onNavigate, onAction,
  slots = {}, focusSection = null, onSectionHandled, guestLists = false }) {
  const [open, setOpen] = useState({});
  const accountRef = useRef(null);
  const toggle = id => setOpen(value => ({ ...value, [id]: !value[id] }));
  const reveal = id => {
    setOpen(value => ({ ...value, [id]: true }));
    // After the list has rendered and the frame has settled its own focus. An instant jump: a glide is cancelled when the list loads in.
    const toTop = () => document.querySelector(`.pa29 [data-workspace-section="${id}"]`)?.scrollIntoView?.({ block: "start", behavior: "auto" });
    setTimeout(toTop, 160); setTimeout(toTop, 800);   // again once the list's own data has loaded in and the panel is tall enough
  };
  const focusAccount = () => {
    accountRef.current?.scrollIntoView?.({ block: "start", behavior: "smooth" });
    requestAnimationFrame(() => accountRef.current?.querySelector?.("input:not([type=hidden]),button")?.focus?.({ preventScroll: true }));
  };
  // The frame can ask for a section (for example, the main action "המחקר והשמורים").
  useEffect(() => { if (focusSection) { reveal(focusSection); onSectionHandled?.(); } }, [focusSection]); // eslint-disable-line react-hooks/exhaustive-deps
  const press = card => {
    const to = card.to || {};
    if (to.signIn) return focusAccount();
    if (to.section === "research" || to.section === "follow" || to.section === "companion") return reveal(to.section);
    if (to.section) return onAction?.(card);
    return onNavigate?.(card);
  };
  const act = action => {
    if (action.to?.signIn) return focusAccount();
    if (action.to?.section === "research") return reveal("research");
    return onPrimary?.(action);
  };
  const coins = [
    follows?.status === "ready" ? { k: "follows", v: follows.topics.length, l: "עוקב" } : null,
    inbox?.status === "ready" ? { k: "unread", v: inbox.unread, l: "חדשות" } : null,
    stats?.level != null ? { k: "level", v: stats.level, l: "שלב" } : null,
    stats?.credits != null ? { k: "credits", v: stats.credits, l: "קרדיטים" } : null,
  ].filter(Boolean);
  const guestCards = signedIn ? null : cards.filter(card => card.state === "live");
  const listsNode = (
      <section className="pa29-group pa29-lists" aria-label="רזיאל">
        <Disclosure id="companion" open={!!open.companion} onToggle={toggle} icon="raziel" hue="hint" title="רזיאל באזור האישי" hint="הצעה לצעד הבא, לפי בקשה בלבד">{slots.raziel}</Disclosure>
      </section>
  );
  return <div className="pa29 r29" data-personal-area="2029" data-signed-in={signedIn ? "true" : "false"}>
    <section className="pa29-hall r29-hall is-feature" data-r29-kind="me" data-workspace-section="pulse" aria-label="החשבון שלי">
      <div className="pa29-id">
        <span className="pa29-avatar r29-medal" aria-hidden="true">{avatar}</span>
        <div className="pa29-id-text">
          <strong>{signedIn ? (name || "החשבון שלי") : "אורח"}</strong>
          <small dir="ltr">{signedIn ? (email || "") : "לא מחובר"}</small>
        </div>
        <span className="r29-badge pa29-badge" data-pa29-badge={signedIn ? "in" : "out"}>{signedIn ? "מחובר" : "אורח"}</span>
      </div>
      {coins.length ? <div className="pa29-coins" aria-label="תמונת מצב אישית">
        {coins.map(coin => <span key={coin.k} className="r29-coin pa29-coin" data-pa29-coin={coin.k}><b>{coin.v}</b><small>{coin.l}</small></span>)}
      </div> : null}
      {primary ? <div className="pa29-actions"><button type="button" className="pa29-primary" data-pa29-primary={primary.id} onClick={() => act(primary)}>{primary.label}</button></div> : null}
      <div className="pa29-account" data-workspace-section="account" ref={accountRef}>{slots.account}</div>
    </section>

    {!signedIn && !guestLists ? <>
      {slots.guestNote}
      <section className="pa29-more r29-card" data-r29-kind="research" aria-label="מה יש באזור האישי אחרי כניסה">
        <details className="pa29-guest-list">
          <summary><span className="pa29-card-text"><strong>מה יש באזור האישי</strong><small>אחרי כניסה: פרופיל, דף, שמורים, הודעות ועוד</small></span><span className="pa29-chev" aria-hidden="true" /></summary>
          <ul className="pa29-guest-ul">{guestCards.map(card => <li key={card.id}><b>{card.title}</b><small>{card.hint}</small></li>)}</ul>
        </details>
      </section>
    </> : <>
      {PERSONAL_GROUPS.map(group => {
        const rows = cards.filter(card => card.group === group.id);
        if (!rows.length) return null;
        const headId = `pa29-group-${group.id}`;
        return <section key={group.id} className="pa29-group" aria-labelledby={headId} data-pa29-group={group.id}>
          <h3 id={headId} className="pa29-h"><span className="r29-rule" aria-hidden="true">◆</span>{group.title}</h3>
          <div className="pa29-cards">{rows.map(card => card.to?.section === "research" || card.to?.section === "follow"
            ? <Disclosure key={card.id} id={card.to.section} cardId={card.id} open={!!open[card.to.section]} onToggle={toggle} icon={card.icon} title={card.title} hint={card.hint}>{slots[card.to.section]}</Disclosure>
            : <Card key={card.id} card={card} onPress={press} />)}</div>
        </section>;
      })}
      {listsNode}
    </>}
  </div>;
}
