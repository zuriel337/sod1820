// "עולם הגילויים והתרומות" (ZURIEL 26.11.2026): the Home section and the pieces /stats reuses. One reader pair (lib/research/discoveryCenter2029.js), one cache,
// no counting here. A surface draws a part only when the reader gave it real data; a reader that is not available draws nothing.
// Layout follows the Dense Row Law: columns stretch to one height and are filled by their content, short items share a row, nothing is a box around one empty line.
import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../lib/AuthContext.jsx";
import { relativeTimeLabel, bilingualDateLabel } from "../../lib/relativeTime2029.js";
import {
  readDiscoveryFeed, readDiscoveryStats, discoveryModel, discoveryTotals, writerHref, numberHref, writerActivityLine,
  setFeaturedDiscovery, forgetDiscoveryReads, CONTENT_SOURCES_2029,
} from "../../lib/research/discoveryCenter2029.js";
import "./royal2029.css";
import "./discoveryCenter2029.css";

const dateOf = (value, mode) => mode === "home" ? relativeTimeLabel(value) : bilingualDateLabel(value);
const fmt = n => n.toLocaleString("he-IL");

/** The two readers, once, with a reload after the admin changes the featured discovery. */
export function useDiscoveryCenter(enabled = true) {
  const [state, setState] = useState({ status: "loading", model: null, totals: [] });
  const load = useCallback(() => {
    let live = true;
    Promise.all([readDiscoveryFeed(), readDiscoveryStats()]).then(([feed, stats]) => {
      if (!live) return;
      const model = discoveryModel(feed), totals = discoveryTotals(stats);
      setState({ status: model || totals.length ? "ready" : "none", model, totals });
    });
    return () => { live = false; };
  }, []);
  useEffect(() => (enabled ? load() : undefined), [enabled, load]);
  const reload = useCallback(() => { forgetDiscoveryReads(); load(); }, [load]);
  return { ...state, reload };
}

export function DiscoveryTotals({ totals }) {
  if (!totals?.length) return null;
  return <ul className="dc29-totals" aria-label="המספרים לפי סוג">
    {totals.map(item => <li key={item.key}>{item.to ? <Link to={item.to}><b>{fmt(item.value)}</b><span>{item.label}</span></Link> : <div><b>{fmt(item.value)}</b><span>{item.label}</span></div>}</li>)}
  </ul>;
}

function Credit({ name, slug }) {
  if (!name) return null;
  if (CONTENT_SOURCES_2029[name]) return <>{name} · {CONTENT_SOURCES_2029[name]}</>;
  const href = writerHref(slug);
  return <>מאת {href ? <Link to={href}>{name}</Link> : name}</>;
}

export function DiscoveryFeatured({ featured, mode }) {
  if (!featured) return null;
  const href = numberHref(featured.value), writer = writerHref(featured.creditSlug);
  return <article className="dc29-featured" aria-label="הגילוי הנבחר">
    <span className="dc29-tag">גילוי נבחר</span>
    <p className="dc29-eq">{featured.phrase} = <em>{fmt(featured.value)}</em></p>
    <p className="dc29-credit">{featured.creditName ? <Credit name={featured.creditName} slug={featured.creditSlug} /> : null}{featured.creditName && featured.createdAt ? " · " : ""}{dateOf(featured.createdAt, mode)}</p>
    <div className="dc29-actions">
      {href ? <Link className="r29-btn is-primary" to={href}>פתיחת המספר {fmt(featured.value)}</Link> : null}
      {writer ? <Link className="r29-btn" to={writer}>{featured.creditName}</Link> : null}
      <Link className="r29-btn" to="/world">בעולם</Link>
    </div>
  </article>;
}

/** Admin only (the server refuses anyone else): choose a listed discovery as the featured one. The public never receives this control. */
function ChooseFeatured({ id, onDone }) {
  const [busy, setBusy] = useState(false), [note, setNote] = useState("");
  const choose = async () => {
    setBusy(true); setNote("");
    try { await setFeaturedDiscovery(id); setNote("נבחר"); onDone?.(); } catch { setNote("לא נשמר"); } finally { setBusy(false); }
  };
  return <button type="button" className="r29-btn" onClick={choose} disabled={busy} aria-busy={busy}>{note || "הצג כנבחר"}</button>;
}

export function DiscoveryLatest({ items, featuredId, mode, admin, onChanged }) {
  if (!items?.length) return null;
  return <section className="dc29-card dc29-fill dc29-latest" aria-label="גילויים חדשים">
    <h3>גילויים חדשים</h3>
    <ul className="dc29-list">
      {items.map(item => {
        const href = numberHref(item.value);
        return <li key={item.id}>
          <span className="dc29-t">{item.phrase}</span>
          {href ? <Link className="dc29-n" to={href}>{fmt(item.value)}</Link> : <b className="dc29-n">{fmt(item.value)}</b>}
          <small>{item.creditName ? <Credit name={item.creditName} slug={item.creditSlug} /> : null}{item.creditName && item.createdAt ? " · " : ""}{dateOf(item.createdAt, mode)}</small>
          {admin && item.id !== featuredId ? <ChooseFeatured id={item.id} onDone={onChanged} /> : null}
        </li>;
      })}
    </ul>
  </section>;
}

export function DiscoveryContributions({ items, mode, stack = false }) {
  if (!items?.length) return null;
  return <section className={`dc29-card${stack ? " dc29-fill" : ""}`} aria-label="תרומות חדשות">
    <h3>תרומות חדשות</h3>
    <ul className={`dc29-list${stack ? "" : " dc29-cols"}`}>
      {items.map(item => <li key={item.id}>
        <span className="dc29-t">{item.excerpt}</span>
        <small>{item.authorSlug && item.authorName ? <Link to={writerHref(item.authorSlug)}>{item.authorName}</Link> : item.authorName}{item.authorName && item.createdAt ? " · " : ""}{dateOf(item.createdAt, mode)}</small>
      </li>)}
    </ul>
  </section>;
}

export function DiscoveryWriters({ writers, fill = false, bare = false }) {
  if (!writers?.length) return null;
  const list = <ul className="dc29-chips">
    {writers.map(writer => {
      const href = writer.siteAccount ? null : writerHref(writer.slug), line = writerActivityLine(writer);
      const body = <><span>{writer.siteAccount ? "תוכן האתר" : writer.name}</span>{line ? <i>{line}</i> : null}</>;
      return <li key={writer.slug || writer.name}>{href ? <Link to={href}>{body}</Link> : <span className="dc29-plain">{body}</span>}</li>;
    })}
  </ul>;
  if (bare) return <div className="dc29-bare"><p className="stats29-note">מי הוסיף חומר ב־30 הימים האחרונים, לפי סוג. חומר ציבורי בלבד.</p>{list}</div>;
  return <section className={`dc29-card${fill ? " dc29-fill" : ""} dc29-writers`} aria-label="כותבים פעילים">
    <h3>כותבים פעילים ב־30 הימים האחרונים</h3>
    {list}
  </section>;
}

/** The Home section: totals, then the featured discovery with the active writers beside the new discoveries, then the new contributions. */
export default function DiscoveryCenter2029() {
  const { user, isAdmin } = useAuth();
  const admin = isAdmin === true && Boolean(user?.id);
  const { status, model, totals, reload } = useDiscoveryCenter();
  if (status === "loading") return <section className="dc29 dc29-reserve" aria-label="עולם הגילויים והתרומות" aria-busy="true" />;
  if (status === "none") return null;
  const columns = Boolean(model?.featured || model?.latest.length || model?.writers.length);
  return <section className="dc29 r29" aria-labelledby="dc29-title" data-home-discovery="open">
    <div className="dc29-head"><h2 id="dc29-title">עולם הגילויים והתרומות</h2><Link to="/stats">לכל הסטטיסטיקה ←</Link></div>
    <p className="dc29-sub">מה שנוסף לעולם הידע שלנו, ומי הוסיף אותו</p>
    <DiscoveryTotals totals={totals} />
    {columns ? <div className={`dc29-grid ${model.featured && model.latest.length && model.writers.length ? "dc29-areas" : "dc29-auto"}`}>
      <DiscoveryFeatured featured={model.featured} mode="home" />
      <DiscoveryLatest items={model.latest} featuredId={model.featured?.id} mode="home" admin={admin} onChanged={reload} />
      <DiscoveryWriters writers={model.writers} fill />
    </div> : null}
    <DiscoveryContributions items={model?.contributions} mode="home" />
    <p className="dc29-foot">המספרים לפי סוג ואינם מסוכמים: כל פריט נספר פעם אחת. תוכן מוסתר או ממתין לאישור אינו נכלל.</p>
  </section>;
}
