import React, { useEffect, useRef } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { use2029Palette } from "../../lib/palette.js";
import { bilingualDateLabel } from "../../lib/relativeTime2029.js";
import { approvedReturnHref } from "./publicContributor2029Model.js";
import { CATALOG_FORMATS, selectSourceCatalog2029 } from "./publicSourceCatalog2029Model.js";
import PublicContributorRank2029 from "./ContributorRankSeal2029.jsx";

const FORMAT_LABEL = { text: "טקסט", image: "תמונה", video: "וידאו", external_link: "קישור" };

export default function PublicSourceCatalog2029({ view }) {
  const P = use2029Palette();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const selection = selectSourceCatalog2029(view, location.search);
  const focused = useRef(null);
  const returnHref = approvedReturnHref(params.get("returnTo"), typeof window === "undefined" ? "https://sod1820.co.il" : window.location.origin);
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
      "--pc-border": P.border, "--pc-accent": P.accentText, "--pc-focus": P.focusRing || P.accent }}>
    {returnHref ? <Link className="pc-return" to={returnHref}>חזרה למקום שממנו הגעת ↗</Link> : null}
    <header className="pc-profile">
      {view.profile.avatar ? <img className="pc-avatar" src={view.profile.avatar} alt="" width="72" height="72" onError={(event) => { event.currentTarget.hidden = true; }} /> : null}
      <div className="pc-profile-copy"><p className="pc-eyebrow">דף כתב · מקורות וחומרים</p><h1 id="public-contributor-title">{view.profile.name}</h1>
        {view.profile.role ? <p className="pc-role">{view.profile.role}</p> : null}
        {view.profile.bio ? <p className="pc-bio">{view.profile.bio}</p> : null}
        <p className="pc-boundary">להכיר את הכתבים, לקרוא במקור ולהמשיך אל הממצאים והקשרים בעולם.</p>
      </div>
      <PublicContributorRank2029 canonicalHref={view.canonicalHref} name={view.profile.name} previewRank={view.rankPreview} />
    </header>
    <nav className="pc-filters" aria-label="כניסות לדף הכתב">
      {[["recent", "כתבים אחרונים"], ["all", "כל הכתבים"], ["media", "תמונות וגלריה"], ["topics", "נושאים מפורשים"], ["community", "כתיבה בקהילה"]].map(([key, label]) =>
        <button type="button" key={key} aria-pressed={selection.section === key} onClick={() => change("section", key)}>{label}</button>)}
      <Link className="pc-open" to={view.worldHref}>הממצאים של {view.profile.name} בעולם ↗</Link>
    </nav>
    <section aria-labelledby="writer-community-title" className={selection.section === "community" ? "" : "pc-community-peek"}>
      <h2 id="writer-community-title">כתיבה בקהילה</h2>
      {selection.section !== "community" ? <p className="pc-reason">הודעות ותגובות שיוחסו לכותב מופיעות במדור נפרד מחומרי המקור.</p>
        : !view.community.available ? <p role="status" className="pc-notice">המידע על כתיבה בקהילה אינו זמין כרגע.</p>
        : !view.community.items.length ? <p role="status" className="pc-notice">אין עדיין הודעות קהילה ציבוריות משויכות במידע שנטען.</p>
        : <div className="pc-items">{view.community.items.slice(0, 20).map((item) => <article className="pc-item" key={item.id}>
          <div className="pc-item-meta">הודעה בקהילה · {bilingualDateLabel(item.date) || "תאריך לא זמין"}</div>
          <h3>{item.title}</h3>{item.summary ? <p className="pc-body">{item.summary}</p> : null}
          <p className="pc-reason">ספירת לייקים ותגובות אינה זמינה בקורא הציבורי הזה.</p>
          {item.href ? <a className="pc-open" href={item.href}>{item.linkLabel || "פתיחת המקור המקושר"} ↗</a> : null}
        </article>)}</div>}
    </section>
    {selection.section !== "community" ? <section aria-labelledby="writer-source-title">
      <div className="pc-list-heading"><div>{selection.section === "recent" ? <p className="pc-eyebrow">כתבי מקור וחומרים שהועלו</p> : null}<h2 id="writer-source-title">{selection.section === "recent" ? "התעדכן לאחרונה" : "כתבי מקור וחומרים שהועלו"}</h2>
        <p className="pc-reason">{selection.section === "recent" ? "עד 20 פרסומים אחרונים, חדשים תחילה." : "הפרסומים המקוריים נשמרים באותה זהות, גם כאשר הם מופיעים בכמה מדורים."}</p>
      </div></div>
      {selection.section !== "recent" ? <div className="pc-filters" role="group" aria-label="סוג חומר המקור">
        {CATALOG_FORMATS.map(([key, label]) => <button key={key} type="button" aria-pressed={selection.format === key} onClick={() => change("format", key)}>{label}</button>)}
      </div> : null}
      {!view.catalog.sourcesAvailable ? <p className="pc-notice" role="status">קטלוג המקורות אינו זמין כרגע. אי אפשר לקבוע שאין פרסומים.</p> : null}
      {view.catalog.truncated ? <p className="pc-notice" role="status">זהו חלק מקטלוג המקורות; חלק מהחומר עדיין לא נטען.</p> : null}
      {!selection.rows.length && view.catalog.sourcesAvailable ? <p className="pc-notice" role="status">אין כרגע פרסומי מקור ציבוריים במסנן הזה.</p> : null}
      <div className="pc-items">{selection.rows.map((item) => <article className="pc-item" key={item.id}
        tabIndex={-1} ref={item.id === selection.item ? focused : null} data-catalog-source="true">
        <div className="pc-item-meta"><span>{item.formats.filter((format) => FORMAT_LABEL[format]).map((format) => FORMAT_LABEL[format]).join(" · ") || "מקור"}</span>
          {bilingualDateLabel(item.createdAt) ? <time dateTime={item.createdAt}>{bilingualDateLabel(item.createdAt)}</time> : <span>תאריך לא זמין</span>}</div>
        <h3>{item.href ? <Link to={item.href}>{item.title}</Link> : item.title}</h3>
        {item.media ? item.media.type === "video" ? <video className="pc-catalog-media" src={item.media.url} poster={item.media.thumbUrl || undefined} controls preload="none" aria-label={item.title} />
          : item.href ? <Link to={item.href}><img className="pc-catalog-media" src={item.media.thumbUrl || item.media.url} alt={item.title} loading="lazy" width="480" height="300" /></Link>
            : <img className="pc-catalog-media" src={item.media.thumbUrl || item.media.url} alt={item.title} loading="lazy" width="480" height="300" /> : null}
        {item.paired ? <p className="pc-reason">תמונה וטקסט בפרסום אחד · הופעות המקור נשמרות.</p> : null}
        {item.sourceTopics.length ? <p className="pc-reason">נושאים שנרשמו במקור: {item.sourceTopics.join(" · ")}</p> : null}
        {item.href ? <Link className="pc-open" to={item.href}>להופעה המדויקת בעולם ↗</Link> : <p className="pc-reason">הקישור להופעה המדויקת אינו זמין.</p>}
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
