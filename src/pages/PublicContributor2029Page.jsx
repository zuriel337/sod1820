import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import ContributorFindingsLens from "../components/research/ContributorFindingsLens.jsx";
import { loadPublicContributor2029 } from "../components/contributor2029/loadPublicContributor2029.js";
import { readContributorLocation, SECTIONS, selectContributorItems } from "../components/contributor2029/publicContributor2029Model.js";
import { use2029Palette } from "../lib/palette.js";
import { bilingualDateLabel } from "../lib/relativeTime2029.js";
import { applySeo } from "../lib/seo.js";
import "./publicContributor2029.css";
import ContributorCommunityActivity2029 from "../components/contributor2029/ContributorCommunityActivity2029.jsx";
import PublicSourceCatalog2029 from "../components/contributor2029/PublicSourceCatalog2029.jsx";
import PublicContributorRank2029 from "../components/contributor2029/ContributorRankSeal2029.jsx";
import ContributorActionsController2029 from "../components/contributor2029/ContributorActionsController2029.jsx";
import { useContributorReading2029 } from "../components/contributor2029/ContributorReadingController2029.jsx";

const TYPE_LABELS = { sources: "מקור", findings: "ממצא", writings: "כתב", topics: "נושא" };
const VERIFICATION = { match: "טענה אומתה מול המנוע", mismatch: "טענה נסתרה במנוע", not_tested: "לא נבדקה טענה מול המנוע", method_unknown: "השיטה לא זוהתה" };

export function PublicContributor2029View(props) {
  return props.view?.kind === "source_catalog" ? <PublicSourceCatalog2029 view={props.view} onRetry={props.onRetry} /> : <GeneralContributor2029View {...props} />;
}

function GeneralContributor2029View({ view, loading = false, error = false, onRetry }) {
  const P = use2029Palette();
  const reading = useContributorReading2029(view, onRetry);
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const context = readContributorLocation(location.search, typeof window !== "undefined" ? window.location.origin : "https://sod1820.co.il");
  const selection = useMemo(() => selectContributorItems(view || { items: [] }, context.section, context.sort), [view, context.section, context.sort]);
  const [limit, setLimit] = useState(12);
  const selectedRef = useRef(null);
  useEffect(() => { setLimit(12); }, [context.section, selection.sort]);
  useEffect(() => {
    if (context.item && view) {
      selectedRef.current?.scrollIntoView({ block: "nearest" });
      selectedRef.current?.focus({ preventScroll: true });
    }
  }, [context.item, view]);
  const change = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    if (key === "section") { next.delete("item"); next.delete("sort"); }
    setParams(next);
  };
  const selectedIndex = selection.rows.findIndex((item) => item.id === context.item);
  const shown = selection.rows.slice(0, Math.max(limit, selectedIndex + 1));
  const style = { "--pc-ink": P.ink, "--pc-muted": P.inkSoft, "--pc-card": P.card,
    "--pc-soft": P.cardSoft, "--pc-border": P.border, "--pc-accent": P.accentText,
    "--pc-focus": P.focusRing || P.accent, "--pc-bg": P.pageBg };
  const message = loading ? "טוען את דף הכותב…" : error ? "לא ניתן לקרוא את דף הכותב כרגע." : !view ? "הכותב לא נמצא." : null;
  return <section className="public-contributor-2029" dir="rtl" lang="he" style={style} aria-busy={loading} aria-labelledby="public-contributor-title">
    {context.returnHref ? <Link className="pc-return" to={context.returnHref}>חזרה למקום שממנו הגעת <span aria-hidden="true">↗</span></Link> : null}
    {message ? <div className="pc-notice" role={error ? "alert" : "status"}>
      <h1 id="public-contributor-title">{message}</h1>
      {error && onRetry ? <button onClick={onRetry} type="button">ניסיון נוסף</button> : null}
      {!loading && !error ? <p>אין דף ציבורי זמין בכתובת הזאת.</p> : null}
    </div> : <>
      <header className="pc-profile">
        <div className="pc-profile-copy"><p className="pc-eyebrow">כתבים · מקורות · מחקר</p>
          <h1 id="public-contributor-title">{view.profile.name}</h1>
          {view.profile.role ? <p className="pc-role">{view.profile.role}</p> : null}
          {view.profile.bio ? <p className="pc-bio">{view.profile.bio}</p> : null}
          <p className="pc-boundary">החומרים של הכותב וההקשרים שנפתחו מהם. שיוך לכותב אינו אימות של תוכן.</p>
        </div>
        <PublicContributorRank2029 canonicalHref={view.canonicalHref} name={view.profile.name} avatar={view.profile.avatar} bio={view.profile.bio}
          links={[{ href: `${view.canonicalHref}?section=findings`, label: "ממצאים וכתבים" }]} previewRank={view.rankPreview} />
      </header>
      <ContributorActionsController2029 view={view} onPublicData={reading.receivePublicData} excludedStudioIds={reading.featuredIds} />
      {reading.header}
      {view.partial ? <p className="pc-notice" role="status">חלק מהמידע אינו זמין כרגע. מוצגים רק החומרים שנקראו ושויכו בוודאות.</p> : null}
      {view.unattributed ? <p className="pc-notice" role="status">יש תוכן שלא שויך במדויק לכותב, ולכן אינו מופיע כאן.</p> : null}
      <nav className="pc-filters" aria-label="סוג התוכן של הכותב">
        {SECTIONS.map(([key, label]) => <button type="button" key={key} aria-pressed={key === context.section} onClick={() => change("section", key)}>{label}</button>)}
      </nav>
      <div className="pc-list-heading"><h2>{SECTIONS.find(([key]) => key === context.section)?.[1]}</h2>
        {context.section !== "community" ? <label>מיון <select value={selection.sort} onChange={(event) => change("sort", event.target.value)}>
          <option value="newest">החדש ביותר</option><option value="oldest">הישן ביותר</option>
          {selection.canDiscuss ? <option value="discussed">המדובר ביותר</option> : null}
          {selection.canStrength ? <option value="strength">החזקים תחילה</option> : null}
        </select></label> : null}
      </div>
      {context.section === "community" ? <ContributorCommunityActivity2029 authorKey={view.communityAuthorKey} enabled /> : null}
      {context.section === "community" ? null : !selection.rows.length ? <p className="pc-notice" role="status">{!view.items.length
        ? view.partial ? "המידע שנטען אינו כולל תוכן ציבורי זמין. אי אפשר לקבוע שאין תוכן נוסף." : "אין עדיין תוכן ציבורי משויך לכותב."
        : "אין תוכן זמין במדור הזה מתוך המידע שנטען."}</p> : <div className="pc-items">
        {shown.map((item) => {
          const expanded = item.id === context.item;
          const date = bilingualDateLabel(item.date);
          return <article className="pc-item" key={item.id} ref={expanded ? selectedRef : null} tabIndex={-1}>
            <div className="pc-item-meta"><span>{item.label || TYPE_LABELS[item.type]}</span>{date ? <time dateTime={item.date}>נוסף · {date}</time> : <span>תאריך לא זמין</span>}</div>
            <h3>{item.href ? <a href={item.href} onClick={() => reading.recordOpen(item)}>{item.title}</a> : item.title}</h3>
            <p className="pc-reason">{item.reason}</p>
            {reading.actions(item)}
            {item.sourceOnly ? <p className="pc-source-state">מקור ללא ממצאים משויכים.</p> : null}
            {item.findingsUnavailable ? <p className="pc-source-state">המקור זמין לקריאה; המידע על ממצאים אינו זמין כרגע.</p> : null}
            {item.type === "findings" ? <div className="pc-metrics">
              <span>חוזק: {item.strength ?? "לא דורג"}</span><span>איכות: {item.quality ?? "לא דורג"}</span>
              <span>{VERIFICATION[item.verification] || "לא הוצהר אימות"}</span>
              {item.value !== null ? <Link to={`/2029/number/${item.value}`}>מספר <bdi className="pc-number">{item.value}</bdi></Link> : null}
            </div> : null}
            <button className="pc-disclose" type="button" aria-expanded={expanded} aria-controls={`pc-detail-${encodeURIComponent(item.id)}`} onClick={() => change("item", expanded ? null : item.id)}>{expanded ? "סגירת הפרטים" : "לקריאה והקשר"} <span aria-hidden="true">{expanded ? "−" : "+"}</span></button>
            {expanded ? <div className="pc-detail" id={`pc-detail-${encodeURIComponent(item.id)}`}>
              {item.group ? <ContributorFindingsLens timeMode="bilingual" projection={{ mode: "public_view", contributor: { displayName: view.profile.name },
                sourceGroups: [item.group], topics: [], worldCounts: {}, counts: { sourceGroups: 1, engineVerified: 0,
                  topics: view.availability.topics === "ok" ? 0 : "לא זמין" }, availability: view.availability }} />
                : item.summary ? <p className="pc-body">{item.summary}</p> : null}
              {item.mediaUrl ? /\.(mp4|webm|mov|m4v)([?#]|$)/i.test(item.mediaUrl)
                ? <video src={item.mediaUrl} controls preload="none" aria-label="סרטון מתוך המקור" />
                : <a href={item.mediaUrl}><img src={item.mediaUrl} loading="lazy" alt={item.title} /></a> : null}
              {item.href ? <a className="pc-open" href={item.href}>{item.linkLabel || "פתיחת הפרסום המקורי"} ↗</a> : <p className="pc-reason">קישור מדויק לפרסום המקורי אינו זמין במידע שנטען.</p>}
              {item.sourceHref ? <a className="pc-open" href={item.sourceHref}>פתיחת המקור ↗</a> : null}
            </div> : null}
          </article>;
        })}
      </div>}
      {context.section !== "community" && shown.length < selection.rows.length ? <button className="pc-more" type="button" onClick={() => setLimit((value) => value + 12)}>הצגת חומרים נוספים</button> : null}
      {context.section !== "community" && context.item && selectedIndex < 0 ? <p role="status" className="pc-notice">הפריט שבקישור אינו זמין במדור הזה.</p> : null}
    </>}
  </section>;
}

// Mounted by the existing frame at integration. This page adds no shell or global navigation.
export default function PublicContributor2029Page() {
  const { slug } = useParams();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ key: null, loading: true, view: null, error: false });
  useEffect(() => {
    let current = true;
    setState({ key: slug, loading: true, view: null, error: false });
    loadPublicContributor2029(slug).then((view) => current && setState({ key: slug, loading: false, view, error: false }))
      .catch(() => current && setState({ key: slug, loading: false, view: null, error: true }));
    return () => { current = false; };
  }, [slug, attempt]);
  const active = state.key === slug ? state : { loading: true, view: null, error: false };
  useEffect(() => {
    applySeo({ title: active.view?.profile.name || "דף כותב", path: active.view?.canonicalHref || `/community/researcher/${encodeURIComponent(slug || "")}`,
      description: active.view?.profile.bio || "הכתבים, המקורות והממצאים הציבוריים של הכותב.", noindex: !active.view || active.view.noindex === true });
  }, [slug, active.view]);
  return <PublicContributor2029View {...active} onRetry={() => setAttempt((value) => value + 1)} />;
}
