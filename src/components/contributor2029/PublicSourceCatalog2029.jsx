import React, { useEffect, useMemo, useRef } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { use2029Palette } from "../../lib/palette.js";
import { bilingualDateLabel } from "../../lib/relativeTime2029.js";
import { approvedReturnHref } from "./publicContributor2029Model.js";
import { CATALOG_FORMATS, selectSourceCatalog2029 } from "./publicSourceCatalog2029Model.js";
import ContributorCommunityActivity2029 from "./ContributorCommunityActivity2029.jsx";
import ContributorPersonMedallion2029 from "./ContributorPersonMedallion2029.jsx";
import { contributorPersonView2029 } from "./contributorPersonView2029.js";
import ContributorActionsController2029 from "./ContributorActionsController2029.jsx";
import { useContributorReading2029 } from "./ContributorReadingController2029.jsx";

const FORMAT_LABEL = { text: "טקסט", image: "תמונה", video: "וידאו", external_link: "קישור" };

export default function PublicSourceCatalog2029({ view, onRetry, onCommunityReply }) {
  const P = use2029Palette();
  const reading = useContributorReading2029(view, onRetry);
  const person = useMemo(() => contributorPersonView2029(view.personProjection, { overview: reading.overview, name: view.profile.name }),
    [view, reading.overview]);
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const selection = selectSourceCatalog2029(view, location.search);
  const focused = useRef(null);
  const returnHref = approvedReturnHref(params.get("returnTo") || view.entryReturnHref, typeof window === "undefined" ? "https://sod1820.co.il" : window.location.origin);
  useEffect(() => { if (selection.item) { focused.current?.focus(); focused.current?.scrollIntoView({ block: "nearest" }); } }, [selection.item, selection.page]);
  const change = (key, value) => {
    const next = new URLSearchParams(params);
    next.set(key, value);
    next.delete("item");
    if (key !== "page") next.delete("page");
    if (key === "section") next.delete("format");
    setParams(next);
  };
  const sourceCountKnown = view.catalog.sourcesAvailable && !view.catalog.truncated;
  return <section className="public-contributor-2029" dir="rtl" lang="he" aria-labelledby="public-contributor-title"
    style={{ "--pc-ink": P.ink, "--pc-muted": P.inkSoft, "--pc-card": P.card, "--pc-soft": P.cardSoft,
      "--pc-border": P.border, "--pc-accent": P.accentText, "--pc-focus": P.focusRing || P.accent,
      "--pc-secondary": P.accentSecondary, "--pc-discovery": P.accentDiscovery }}>
    {returnHref ? <Link className="pc-return" to={returnHref}>חזרה למקום שממנו הגעת ↗</Link> : null}
    <header className="pc-profile">
      <div className="pc-profile-copy"><p className="pc-eyebrow">{person?.eyebrow || "חבר קהילה"} · כתבים וחומרים</p><h1 id="public-contributor-title">{view.profile.name}</h1>
        {view.profile.role ? <p className="pc-role">{view.profile.role}</p> : null}
        {view.profile.bio ? <p className="pc-bio">{view.profile.bio}</p> : null}
        <p className="pc-boundary">להכיר את הכתבים, לקרוא במקור ולהמשיך אל הממצאים והקשרים בעולם.</p>
      </div>
      <ContributorPersonMedallion2029 person={person} name={view.profile.name} avatar={view.profile.avatar} bio={view.profile.bio}
        links={[{ href: view.worldHref, label: "הממצאים בעולם" }, { href: `${view.canonicalHref}?section=all`, label: "כל הכתבים" }]} />
    </header>
    <ContributorActionsController2029 view={view} onPublicData={reading.receivePublicData} excludedStudioIds={reading.featuredIds} />
    {reading.header}
    <nav className="pc-filters" aria-label="כניסות לדף הכתב">
      {[["recent", "כתבים אחרונים"], ["all", "כל הכתבים"], ["media", "תמונות וגלריה"], ["topics", "נושאים מפורשים"], ["community", "כתיבה בקהילה"]].map(([key, label]) =>
        <button type="button" key={key} aria-pressed={selection.section === key} onClick={() => change("section", key)}>{label}</button>)}
      <Link className="pc-open pc-world" to={view.worldHref}>הממצאים של {view.profile.name} בעולם ↗</Link>
    </nav>
    {selection.section === "community" ? <section aria-labelledby="writer-community-title">
      <h2 id="writer-community-title">כתיבה בקהילה</h2>
      <ContributorCommunityActivity2029 authorKey={view.communityAuthorKey} filter={view.communityFilter || "all"}
        initial={view.community || null} onReply={onCommunityReply} enabled />
    </section> : null}
    {selection.section !== "community" ? <section aria-labelledby="writer-source-title">
      <div className="pc-list-heading"><div>{selection.section === "recent" ? <p className="pc-eyebrow">כתבי מקור וחומרים שהועלו</p> : null}<h2 id="writer-source-title">{selection.section === "recent" ? "התעדכן לאחרונה" : "כתבי מקור וחומרים שהועלו"}</h2>
        <p className="pc-reason">{selection.section === "recent" ? "עד 20 פרסומים אחרונים, חדשים תחילה." : "פרסומי המקור שהועלו, חדשים תחילה."}</p>
      </div></div>
      {selection.section !== "recent" ? <div className="pc-filters" role="group" aria-label="סוג חומר המקור">
        {CATALOG_FORMATS.map(([key, label]) => <button key={key} type="button" aria-pressed={selection.format === key} onClick={() => change("format", key)}>{label}</button>)}
      </div> : null}
      {!view.catalog.sourcesAvailable ? <div className="pc-notice" role="status"><p>קטלוג המקורות אינו זמין כרגע. אי אפשר לקבוע שאין פרסומים.</p>
        {onRetry ? <button className="pc-more" type="button" onClick={onRetry}>ניסיון נוסף</button> : null}</div> : null}
      {view.catalog.truncated ? <p className="pc-notice" role="status">זהו חלק מקטלוג המקורות; חלק מהחומר עדיין לא נטען.</p> : null}
      {!selection.rows.length && view.catalog.sourcesAvailable ? <p className="pc-notice" role="status">אין כרגע פרסומי מקור ציבוריים במסנן הזה.</p> : null}
      <div className="pc-items">{selection.rows.map((item) => <article className="pc-item" key={item.id}
        tabIndex={-1} ref={item.id === selection.item ? focused : null} data-catalog-source="true">
        <div className="pc-item-meta"><span>{item.formats.filter((format) => FORMAT_LABEL[format]).map((format) => FORMAT_LABEL[format]).join(" · ") || "מקור"}</span>
          {item.publicationState ? <span className="pc-state">פורסם</span> : null}
          {bilingualDateLabel(item.createdAt) ? <time dateTime={item.createdAt}>{bilingualDateLabel(item.createdAt)}</time> : <span>תאריך לא זמין</span>}</div>
        <h3>{item.href ? <Link to={item.href} onClick={() => reading.recordOpen(item)}>{item.title}</Link> : item.title}</h3>
        {item.media ? item.media.type === "video" ? <video className="pc-catalog-media" src={item.media.url} poster={item.media.thumbUrl || undefined} controls preload="none" aria-label={item.title} />
          : item.href ? <Link to={item.href} onClick={() => reading.recordOpen(item)}><img className="pc-catalog-media" src={item.media.thumbUrl || item.media.url} alt={item.title} loading="lazy" width="480" height="300" /></Link>
            : <img className="pc-catalog-media" src={item.media.thumbUrl || item.media.url} alt={item.title} loading="lazy" width="480" height="300" /> : null}
        {item.paired ? <p className="pc-reason pc-paired">תמונה וטקסט בפרסום אחד</p> : null}
        {item.sourceTopics.length ? <p className="pc-reason">נושאים שנרשמו במקור: {item.sourceTopics.join(" · ")}</p> : null}
        {item.href ? <Link className="pc-open" to={item.href} onClick={() => reading.recordOpen(item)}>להופעה המדויקת בעולם ↗</Link> : <p className="pc-reason">הקישור להופעה המדויקת אינו זמין.</p>}
        {reading.actions(item)}
      </article>)}</div>
      {selection.section === "recent" && sourceCountKnown && view.catalog.items.length > view.catalog.recentItems.length ? <button className="pc-more" type="button" onClick={() => change("section", "all")}>לכל הכתבים</button> : null}
      {selection.pages > 1 ? <nav className="pc-pagination" aria-label="עמודי קטלוג המקורות">
        <button type="button" disabled={selection.page === 1} onClick={() => change("page", String(selection.page - 1))}>הקודם</button>
        <span>עמוד <bdi className="pc-number">{selection.page}</bdi> מתוך <bdi className="pc-number">{selection.pages}</bdi></span>
        <button type="button" disabled={selection.page === selection.pages} onClick={() => change("page", String(selection.page + 1))}>הבא</button>
      </nav> : null}
    </section> : null}
  </section>;
}
