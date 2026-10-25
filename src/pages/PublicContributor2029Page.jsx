import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import ContributorFindingsLens from "../components/research/ContributorFindingsLens.jsx";
import { loadPublicContributor2029 } from "../components/contributor2029/loadPublicContributor2029.js";
import { loadCommunityPerson2029 } from "../components/contributor2029/loadCommunityPerson2029.js";
import { readContributorLocation, SECTIONS, selectContributorItems } from "../components/contributor2029/publicContributor2029Model.js";
import { use2029Palette } from "../lib/palette.js";
import { bilingualDateLabel } from "../lib/relativeTime2029.js";
import { applySeo } from "../lib/seo.js";
import "./publicContributor2029.css";
import ContributorCommunityActivity2029 from "../components/contributor2029/ContributorCommunityActivity2029.jsx";
import PublicSourceCatalog2029 from "../components/contributor2029/PublicSourceCatalog2029.jsx";
import ContributorPersonMedallion2029 from "../components/contributor2029/ContributorPersonMedallion2029.jsx";
import { contributorPersonView2029 } from "../components/contributor2029/contributorPersonView2029.js";
import ContributorActionsController2029 from "../components/contributor2029/ContributorActionsController2029.jsx";
import { useContributorReading2029 } from "../components/contributor2029/ContributorReadingController2029.jsx";

const TYPE_LABELS = { sources: "מקור", findings: "ממצא", writings: "כתב", topics: "נושא" };
const VERIFICATION = { match: "טענה אומתה מול המנוע", mismatch: "טענה נסתרה במנוע", not_tested: "לא נבדקה טענה מול המנוע", method_unknown: "השיטה לא זוהתה" };

export function PublicContributor2029View(props) {
  return props.view?.kind === "source_catalog" ? <PublicSourceCatalog2029 view={props.view} onRetry={props.onRetry} onCommunityReply={props.onCommunityReply} /> : <GeneralContributor2029View {...props} />;
}

function GeneralContributor2029View({ view, loading = false, error = false, onRetry, onCommunityReply }) {
  const P = use2029Palette();
  const reading = useContributorReading2029(view, onRetry);
  const person = useMemo(() => view ? contributorPersonView2029(view.personProjection, { overview: reading.overview, name: view.profile.name }) : null,
    [view, reading.overview]);
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const sections = view?.sections || SECTIONS;
  const context = readContributorLocation(location.search, typeof window !== "undefined" ? window.location.origin : "https://sod1820.co.il",
    { defaultSection: view?.entrySection || "all", sections, returnHref: view?.entryReturnHref });
  const activityFilter = view?.activitySections?.[context.section] || (context.section === "community" ? view?.communityFilter || "all" : null);
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
        <div className="pc-profile-copy"><p className="pc-eyebrow">{person?.eyebrow || "חבר קהילה"} · {view.contextLabel || "כתבים ומחקר"}</p>
          <h1 id="public-contributor-title">{view.profile.name}</h1>
          {view.profile.role ? <p className="pc-role">{view.profile.role}</p> : null}
          {view.profile.bio ? <p className="pc-bio">{view.profile.bio}</p> : null}
          <p className="pc-boundary">{person?.boundary || "מה שהאדם כתב והעלה בקהילה ובמקורות. שיוך לאדם אינו אימות של תוכן."}</p>
        </div>
        <ContributorPersonMedallion2029 person={person} name={view.profile.name} avatar={view.profile.avatar} bio={view.profile.bio}
          links={view.publicLinks || [{ href: `${view.canonicalHref}?section=findings`, label: "ממצאים וכתבים" }]} />
      </header>
      {view.publicActions !== false ? <ContributorActionsController2029 view={view} onPublicData={reading.receivePublicData} excludedStudioIds={reading.featuredIds} /> : null}
      {reading.header}
      {view.partial ? <p className="pc-notice" role="status">חלק מהמידע אינו זמין כרגע. מוצגים רק החומרים שנקראו ושויכו בוודאות.</p> : null}
      {view.unattributed ? <p className="pc-notice" role="status">יש תוכן שלא שויך במדויק לכותב, ולכן אינו מופיע כאן.</p> : null}
      <nav className="pc-filters" aria-label="סוג התוכן של הכותב">
        {sections.map(([key, label]) => {
          // A count is shown only when it is fully known: complete data and a section whose rows are all in the loaded view.
          const known = !view.partial && key !== "community" && !view.activitySections?.[key] ? selectContributorItems(view, key, "newest").rows.length : null;
          return <button type="button" key={key} aria-pressed={key === context.section} onClick={() => change("section", key)}>{label}{known ? <bdi className="pc-count">{known}</bdi> : null}</button>;
        })}
      </nav>
      <div className="pc-list-heading"><h2>{sections.find(([key]) => key === context.section)?.[1]}</h2>
        {context.section !== "community" || activityFilter ? <label>מיון <select value={selection.sort} onChange={(event) => change("sort", event.target.value)}>
          <option value="newest">החדש ביותר</option><option value="oldest">הישן ביותר</option>
          {selection.canDiscuss ? <option value="discussed">המדובר ביותר</option> : null}
          {selection.canStrength ? <option value="strength">החזקים תחילה</option> : null}
        </select></label> : null}
      </div>
      {activityFilter ? <ContributorCommunityActivity2029 authorKey={view.communityAuthorKey}
        filter={activityFilter} sort={selection.sort} initial={view.community || null} onReply={onCommunityReply} enabled /> : null}
      {activityFilter ? null : !selection.rows.length ? <p className="pc-notice" role="status">{!view.items.length
        ? view.partial ? "המידע שנטען אינו כולל תוכן ציבורי זמין. אי אפשר לקבוע שאין תוכן נוסף." : "אין עדיין תוכן ציבורי משויך לכותב."
        : "אין תוכן זמין במדור הזה מתוך המידע שנטען."}</p> : <div className="pc-items">
        {shown.map((item) => {
          const expanded = item.id === context.item;
          const date = bilingualDateLabel(item.date);
          return <article className="pc-item" key={item.id} ref={expanded ? selectedRef : null} tabIndex={-1}>
            <div className="pc-item-meta"><span>{item.label || TYPE_LABELS[item.type]}</span>{date ? <time dateTime={item.date}>{date}</time> : <span>תאריך לא זמין</span>}</div>
            <h3>{item.href ? <a href={item.href} onClick={() => reading.recordOpen(item)}>{item.title}</a> : item.title}</h3>
            <p className="pc-reason">{item.reason}</p>
            {item.sourceOnly ? <p className="pc-source-state">מקור ללא ממצאים משויכים.</p> : null}
            {item.findingsUnavailable ? <p className="pc-source-state">המקור זמין לקריאה; המידע על ממצאים אינו זמין כרגע.</p> : null}
            {item.type === "findings" ? <div className="pc-metrics">
              <span>חוזק: {item.strength ?? "לא דורג"}</span><span>איכות: {item.quality ?? "לא דורג"}</span>
              <span>{VERIFICATION[item.verification] || "לא הוצהר אימות"}</span>
              {item.value !== null ? <Link to={`/2029/number/${item.value}`}>מספר <bdi className="pc-number">{item.value}</bdi></Link> : null}
            </div> : null}
            <button className="pc-disclose" type="button" aria-expanded={expanded} aria-controls={`pc-detail-${encodeURIComponent(item.id)}`} onClick={() => change("item", expanded ? null : item.id)}>{expanded ? "סגירת הפרטים" : "לקריאה והקשר"} <span aria-hidden="true">{expanded ? "−" : "+"}</span></button>
            <div className="pc-item-actions">{reading.actions(item)}</div>
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
      {!activityFilter && shown.length < selection.rows.length ? <button className="pc-more" type="button" onClick={() => setLimit((value) => value + 12)}>הצגת חומרים נוספים</button> : null}
      {!activityFilter && context.item && selectedIndex < 0 ? <p role="status" className="pc-notice">הפריט שבקישור אינו זמין במדור הזה.</p> : null}
    </>}
  </section>;
}

// Mounted by the existing frame at integration. This page adds no shell or global navigation.
export default function PublicContributor2029Page({ communityAuthorKey = null, entryReturnHref = null, communityOwnProfileHref = null, onCommunityReply } = {}) {
  const { slug: routeSlug } = useParams();
  const slug = communityAuthorKey || routeSlug;
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ key: null, loading: true, view: null, error: false });
  useEffect(() => {
    let current = true;
    setState({ key: slug, loading: true, view: null, error: false });
    const load = communityAuthorKey ? loadCommunityPerson2029 : loadPublicContributor2029;
    load(slug).then((view) => current && setState({ key: slug, loading: false, view, error: false }))
      .catch(() => current && setState({ key: slug, loading: false, view: null, error: true }));
    return () => { current = false; };
  }, [slug, communityAuthorKey, attempt]);
  const active = state.key === slug ? state : { loading: true, view: null, error: false };
  useEffect(() => {
    applySeo({ title: active.view?.profile.name || "דף כותב", path: active.view?.canonicalHref || `/community/researcher/${encodeURIComponent(slug || "")}`,
      description: active.view?.profile.bio || "הכתבים, המקורות והממצאים הציבוריים של הכותב.", noindex: !active.view || active.view.noindex === true });
    if (communityAuthorKey && active.view) {
      const heading = document.getElementById("public-contributor-title");
      heading?.setAttribute("tabindex", "-1");
      heading?.focus({ preventScroll: true });
      heading?.scrollIntoView({ block: "start" });
    }
  }, [slug, communityAuthorKey, active.view]);
  return <PublicContributor2029View {...active} view={active.view ? { ...active.view, entryReturnHref,
    ...(active.view.publicActions === false && communityOwnProfileHref
      ? { publicLinks: [{ href: communityOwnProfileHref, label: "עריכת הפרופיל שלי" }] } : {}) } : null}
    onCommunityReply={onCommunityReply} onRetry={() => setAttempt((value) => value + 1)} />;
}
