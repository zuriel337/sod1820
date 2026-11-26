// "עולם הגילויים והתרומות" (ZURIEL 26.11.2026): the Home section and the pieces /stats reuses. One reader pair (lib/research/discoveryCenter2029.js), one cache,
// no counting here. A surface draws a part only when the reader gave it real data; a reader that is not available draws nothing.
// Layout follows the Dense Row Law: columns stretch to one height and are filled by their content, short items share a row, nothing is a box around one empty line.
import React, { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../lib/AuthContext.jsx";
import { relativeTimeLabel, bilingualDateLabel } from "../../lib/relativeTime2029.js";
import {
  readDiscoveryFeed, readDiscoveryStats, discoveryModel, discoveryTotals, writerHref, numberHref, writerActivityLine,
  setFeaturedDiscovery, forgetDiscoveryReads, CONTENT_SOURCES_2029,
} from "../../lib/research/discoveryCenter2029.js";
// The ONE existing display of a gematria finding (letters, steps, the equation, from the canonical engine trace): loaded when the card nears the screen, never built again here.
const UnitGematria2029 = lazy(() => import("./UnitGematria2029.jsx"));
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

function FeaturedCard({ item, primary, mode }) {
  const href = numberHref(item.value), writer = writerHref(item.creditSlug);
  return <article className={`dc29-featured${primary ? " is-primary" : ""}`} aria-label={primary ? "הגילוי הנבחר" : "גילוי נוסף לצד הנבחר"}>
    <span className="dc29-tag">{primary ? "גילוי נבחר" : "ולצדו"}</span>
    <p className="dc29-eq">{item.phrase} = {href ? <Link to={href} aria-label={`פתיחת דף המספר ${fmt(item.value)}`}><em>{fmt(item.value)}</em></Link> : <em>{fmt(item.value)}</em>}</p>
    <p className="dc29-method">שיטת {item.methodLabel}</p>
    <p className="dc29-credit">{item.creditName ? <Credit name={item.creditName} slug={item.creditSlug} /> : null}{item.creditName && item.createdAt ? " · " : ""}{dateOf(item.createdAt, mode)}</p>
    <Suspense fallback={<p className="dc29-credit" role="status">פותח את פירוט החישוב…</p>}>
      <UnitGematria2029 item={{ phrase: item.phrase, methodKey: item.method, stated: item.value, display: "full" }} />
    </Suspense>
    <div className="dc29-actions">
      {writer ? <Link className="r29-btn" to={writer}>{item.creditName}</Link> : null}
      {primary ? <Link className="r29-btn is-primary" to="/world">בעולם</Link> : null}
    </div>
  </article>;
}

/** The featured discovery and what stands beside it (up to two), each with its own method and value. */
export function DiscoveryFeatured({ featured, featuredWith = [], mode }) {
  if (!featured) return null;
  return <div className="dc29-featuredrow" data-count={1 + featuredWith.length}>
    <FeaturedCard item={featured} primary mode={mode} />
    {featuredWith.map(item => <FeaturedCard key={item.id + item.method} item={item} mode={mode} />)}
  </div>;
}

/** Admin only (the server refuses anyone else): choose a listed discovery, in its own method, as the featured one or beside it. The public never receives this control. */
function ChooseFeatured({ item, model, onDone }) {
  const [busy, setBusy] = useState(false), [note, setNote] = useState("");
  const current = model.featured ? [model.featured, ...model.featuredWith] : [];
  const save = async (picks, done) => {
    setBusy(true); setNote("");
    try { await setFeaturedDiscovery(picks); setNote(done); onDone?.(); } catch { setNote("לא נשמר"); } finally { setBusy(false); }
  };
  const mine = { id: item.id, method: item.method };
  const canAdd = current.length > 0 && current.length < 3;
  return <span className="dc29-admin">
    <button type="button" className="r29-btn" onClick={() => save([mine], "נבחר")} disabled={busy} aria-busy={busy}>הצג כנבחר</button>
    {canAdd ? <button type="button" className="r29-btn" onClick={() => save([...current.map(c => ({ id: c.id, method: c.method })), mine], "נוסף לצד הנבחר")} disabled={busy}>הוסף לצד הנבחר</button> : null}
    {note ? <small role="status">{note}</small> : null}
  </span>;
}

export function DiscoveryLatest({ items, model, mode, admin, onChanged }) {
  if (!items?.length) return null;
  return <section className="dc29-card dc29-fill dc29-latest" aria-label="גילויים חדשים">
    <h3>גילויים חדשים</h3>
    <ul className="dc29-list">
      {items.map(item => {
        const href = numberHref(item.value);
        return <li key={item.id}>
          <span className="dc29-t">{item.phrase}{item.method !== "רגיל" ? <i className="dc29-m"> · שיטת {item.methodLabel}</i> : null}</span>
          {href ? <Link className="dc29-n" to={href}>{fmt(item.value)}</Link> : <b className="dc29-n">{fmt(item.value)}</b>}
          <small>{item.creditName ? <Credit name={item.creditName} slug={item.creditSlug} /> : null}{item.creditName && item.createdAt ? " · " : ""}{dateOf(item.createdAt, mode)}</small>
          {admin && !(model.featured?.id === item.id && model.featured.method === item.method) ? <ChooseFeatured item={item} model={model} onDone={onChanged} /> : null}
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
  const left = Boolean(model?.latest.length), right = Boolean(model?.writers.length || model?.contributions.length);
  return <section className="dc29 r29" aria-labelledby="dc29-title" data-home-discovery="open">
    <div className="dc29-head"><h2 id="dc29-title">עולם הגילויים והתרומות</h2><Link to="/stats">לכל הסטטיסטיקה ←</Link></div>
    <p className="dc29-sub">מה שנוסף לעולם הידע שלנו, ומי הוסיף אותו</p>
    <DiscoveryTotals totals={totals} />
    <DiscoveryFeatured featured={model?.featured} featuredWith={model?.featuredWith} mode="home" />
    {left || right ? <div className={`dc29-grid${left && right ? "" : " dc29-one"}`}>
      {left ? <div className="dc29-col"><DiscoveryLatest items={model.latest} model={model} mode="home" admin={admin} onChanged={reload} /></div> : null}
      {right ? <div className="dc29-col"><DiscoveryWriters writers={model.writers} fill={!model.contributions.length} /><DiscoveryContributions items={model.contributions} mode="home" stack /></div> : null}
    </div> : null}
    <p className="dc29-foot">המספרים לפי סוג ואינם מסוכמים: כל פריט נספר פעם אחת. תוכן מוסתר או ממתין לאישור אינו נכלל.</p>
  </section>;
}
