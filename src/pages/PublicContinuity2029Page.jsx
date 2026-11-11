import React, { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useLocation, useParams, useSearchParams } from "react-router-dom";
import Sod2029Shell, { use2029Shell } from "../components/experience2029/Sod2029Shell.jsx";
import NavigationIcon2029 from "../components/experience2029/NavigationIcon2029.jsx";
import { applySeo } from "../lib/seo.js";
import { bilingualDateLabel } from "../lib/relativeTime2029.js";
import { publicReadingExternalSourceHref, publicTemporarilyClosed } from "../lib/publicReadingRelease2029.js";
import {
  loadPublicOrGeulaCollection2029, loadPublicOrGeulaOccurrence2029,
  loadPublicPeopleContinuation2029, loadPublicForumContinuation2029,
  loadPublicCommentPostContinuation2029, publicContinuityPage2029,
  publicOrGeulaOccurrenceHref2029, publicContinuityPlaybackTime2029,
  publicForumChatHref2029,
  publicHistoricalLecturePage2029, historicalLectureHtml2029,
} from "../lib/publicContinuityReaders2029.js";
import "./publicContinuity2029.css";
import { postReadingClassName } from "./postReadingStyles2029.js";

const TITLES = { "or-geula": "אור הגאולה", people: "הכתבים והחוקרים", forum: "פורום המחקר", comments: "תגובות לפוסטים", contact: "יצירת קשר", about: "אודות סוד 1820" };

function usePublicRead(reader) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ reader: null, status: "loading" });
  useEffect(() => {
    const controller = new AbortController();
    setState({ reader, status: "loading" });
    Promise.resolve().then(() => reader(controller.signal)).then(result => {
      if (!controller.signal.aborted) setState({ ...result, reader });
    }).catch(() => {
      if (!controller.signal.aborted) setState({ reader, status: "failed" });
    });
    return () => controller.abort();
  }, [reader, attempt]);
  return [state.reader === reader ? state : { status: "loading" }, () => setAttempt(value => value + 1)];
}

function ContentPlane({ kind, title, description, path, state = "ready", children }) {
  const location = useLocation();
  const canonicalPath = path || location.pathname;
  // A feature area closed only until it reopens soon stays indexable (the server answers it 503 + Retry-After).
  const reopeningSoon = state === "gated" && publicTemporarilyClosed(location.pathname);
  useEffect(() => {
    applySeo({ title, description, path: canonicalPath, noindex: !(["ready", "empty"].includes(state) || reopeningSoon) });
  }, [title, description, canonicalPath, state, reopeningSoon]);
  return <section className="public-continuity-2029" dir="rtl" data-continuity-kind={kind} data-read-state={state} data-state={state}>
    <header className="continuity-heading">
      <span className="continuity-eyebrow">סוד 1820</span>
      <h1>{title}</h1>
      {description ? <p>{description}</p> : null}
    </header>
    {children}
  </section>;
}

function StatePanel({ title, children, icon = "help", alert = false }) {
  return <div className="continuity-state" role={alert ? "alert" : undefined}>
    <span className="continuity-state-symbol" aria-hidden="true"><NavigationIcon2029 name={icon} /></span>
    <div><h2>{title}</h2>{children}</div>
  </div>;
}

function ReadBoundary({ state, retry, missing, empty, children }) {
  if (state.status === "loading") return <div className="continuity-loading" role="status" aria-live="polite"><span aria-hidden="true" />טוען את התוכן…</div>;
  if (state.status === "failed") return <StatePanel title="התוכן לא נטען" alert>
    <p>לא הצלחנו להשלים את הקריאה. אפשר לנסות שוב.</p><button type="button" className="continuity-action" onClick={retry}>ניסיון נוסף</button>
  </StatePanel>;
  if (state.status === "not-found") return <StatePanel title="הפריט לא נמצא"><p>{missing || "אין פריט ציבורי זמין בכתובת הזאת."}</p></StatePanel>;
  if (state.status === "empty") return <StatePanel title="אין פריטים להצגה"><p>{empty || "אין כרגע פריטים ציבוריים באוסף הזה."}</p></StatePanel>;
  return children;
}

function withPage(location, page) {
  const search = new URLSearchParams(location.search);
  if (page > 1) search.set("page", String(page)); else search.delete("page");
  return `${location.pathname}${search.size ? `?${search}` : ""}${location.hash}`;
}

function Pager({ page, hasMore, location }) {
  if (page <= 1 && !hasMore) return null;
  return <nav className="continuity-pager" aria-label="דפדוף באוסף">
    {page > 1 ? <Link className="continuity-action" to={withPage(location, page - 1)}>לעמוד הקודם</Link> : <span />}
    <span className="continuity-page-label">עמוד <bdi>{page}</bdi></span>
    {hasMore ? <Link className="continuity-action" to={withPage(location, page + 1)}>לעמוד הבא</Link> : <span />}
  </nav>;
}

function SourceDate({ value }) {
  return value ? <time dateTime={value}>{bilingualDateLabel(value, "תאריך לא צוין")}</time> : null;
}

function SourceMedia({ item, start }) {
  const [failed, setFailed] = useState(false);
  if (!item.mediaHref) return null;
  return <figure className="continuity-source-media" data-media-state={failed ? "failed" : "ready"}>
    {item.mediaKind === "audio" ? <audio controls preload="none" src={item.mediaHref} aria-label={item.title} onError={() => setFailed(true)} />
      : item.mediaKind === "video" ? <video controls playsInline preload="none" poster={item.posterHref || undefined}
      src={item.mediaHref} aria-label={item.title} onError={() => setFailed(true)}
      onLoadedMetadata={event => {
        if (start > 0 && Number.isFinite(event.currentTarget.duration)) event.currentTarget.currentTime = Math.min(start, event.currentTarget.duration);
      }} /> : <img src={item.mediaHref} alt={item.title} onError={() => setFailed(true)} />}
    {failed ? <figcaption role="alert">המדיה לא נטענה. אפשר לנסות לרענן את העמוד.</figcaption> : null}
  </figure>;
}

function OrGeulaContent() {
  const { id } = useParams();
  const location = useLocation();
  const [params] = useSearchParams();
  const occurrenceId = id ?? (params.has("v") ? params.get("v") : null);
  const page = publicContinuityPage2029(params.has("page") ? params.getAll("page") : null);
  const reader = useCallback(signal => occurrenceId !== null
    ? loadPublicOrGeulaOccurrence2029(occurrenceId, { signal })
    : page === null ? Promise.resolve({ status: "not-found", items: [] })
      : loadPublicOrGeulaCollection2029({ page, signal }), [occurrenceId, page]);
  const [state, retry] = usePublicRead(reader);
  const item = state.item;
  const collectionSearch = new URLSearchParams(location.search); collectionSearch.delete("v");
  const collectionHref = `/or-geula${collectionSearch.size ? `?${collectionSearch}` : ""}${location.hash}`;
  const path = item?.href || (occurrenceId === null ? "/or-geula" : location.pathname);
  return <ContentPlane kind="or-geula" title={item?.title || "אור הגאולה"} path={path} state={state.status}
    description={occurrenceId === null ? "סרטונים, תמונות ומסרים מתוך ערוץ אור הגאולה, עם המקור והקרדיט שלהם." : "פריט מתוך ערוץ אור הגאולה"}>
    {occurrenceId !== null ? <Link className="continuity-back" to={collectionHref}>לאוסף אור הגאולה</Link> : null}
    <ReadBoundary state={state} retry={retry} missing="הפריט המבוקש אינו זמין לציבור באור הגאולה." empty="אין כרגע פריטים ציבוריים בעמוד הזה של אור הגאולה.">
      {item ? <article className="continuity-source" data-source-ref={item.sourceRef} data-occurrence-ref={item.occurrenceRef}>
        <div className="continuity-source-byline"><span>{item.sourceLabel}</span><SourceDate value={item.at} /></div>
        <SourceMedia key={item.id} item={item} start={publicContinuityPlaybackTime2029(location.search, location.hash)} />
        {item.text ? <p className="continuity-source-text" dir="auto">{item.text}</p> : null}
        {item.textTruncated ? <p className="continuity-note">התיאור המוצג מקוצר.</p> : null}
        <dl className="continuity-source-credit">
          <div><dt>מקור</dt><dd>{item.credit || item.sourceLabel}</dd></div>
          {item.speaker ? <div><dt>דובר</dt><dd>{item.speaker}</dd></div> : null}
        </dl>
        <Link className="continuity-action" to={publicOrGeulaOccurrenceHref2029(item.id, location)}>קישור לפריט הזה</Link>
      </article> : <ul className="continuity-source-grid">
        {(state.items || []).map(source => <li key={source.id} data-source-ref={source.sourceRef}>
          <Link className="continuity-source-card" to={publicOrGeulaOccurrenceHref2029(source.id, location)}>
            <div className="continuity-source-cover">
              {source.posterHref || source.mediaKind === "image" && source.mediaHref
                ? <img src={source.posterHref || source.mediaHref} alt="" loading="lazy" />
                : <NavigationIcon2029 name={source.mediaKind === "video" ? "video" : "posts"} />}
              {source.mediaKind === "video" ? <span className="continuity-media-label">סרטון</span> : null}
            </div>
            <div className="continuity-source-card-copy"><h2>{source.title}</h2>
              <p>{source.credit || source.sourceLabel}{source.speaker ? ` · ${source.speaker}` : ""}</p>
              <SourceDate value={source.at} /><span className="continuity-card-open">פתיחת הפריט ←</span>
            </div>
          </Link>
        </li>)}
      </ul>}
    </ReadBoundary>
    {occurrenceId === null && ["ready", "empty"].includes(state.status) ? <Pager page={page} hasMore={state.hasMore} location={location} /> : null}
  </ContentPlane>;
}

function PeopleContent() {
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const query = params.get("q") || "";
  const [draft, setDraft] = useState(query);
  useEffect(() => setDraft(query), [query]);
  const page = publicContinuityPage2029(params.has("page") ? params.getAll("page") : null), size = 20;
  const invalidPage = page === null;
  const reader = useCallback(signal => invalidPage ? Promise.resolve({ status: "not-found" }) : loadPublicPeopleContinuation2029({ signal }), [invalidPage]);
  const [state, retry] = usePublicRead(reader);
  const term = query.trim().toLocaleLowerCase("he");
  const people = (state.people || []).filter(person => !term || `${person.displayName} ${person.role}`.toLocaleLowerCase("he").includes(term));
  const visible = people.slice((page - 1) * size, page * size);
  const currentState = state.status === "ready" && page > 1 && !visible.length ? { ...state, status: "not-found" } : state;
  return <ContentPlane kind="people" title="הכתבים והחוקרים" path="/community/researchers" state={currentState.status}
    description="האנשים שמאחורי המקורות והפרסומים. היכנסו לדף הציבורי של כל כתב או חוקר.">
    <form className="continuity-search" role="search" onSubmit={event => {
      event.preventDefault(); const next = new URLSearchParams(params); next.delete("page");
      if (draft.trim()) next.set("q", draft.trim()); else next.delete("q");
      setParams(next);
    }}>
      <label htmlFor="continuity-people-search">שם או תחום</label>
      <div><input id="continuity-people-search" type="search" maxLength={120} value={draft} onChange={event => setDraft(event.target.value)} placeholder="חיפוש בכתבים ובחוקרים" />
        <button className="continuity-action" type="submit">חיפוש</button></div>
    </form>
    <ReadBoundary state={currentState} retry={retry} empty="אין כרגע דפי כתבים או חוקרים פתוחים לציבור.">
      {visible.length ? <ul className="continuity-people-grid">{visible.map(person => <li key={person.slug}>
        <Link to={person.href} className="continuity-person-card">
          {person.avatar ? <img src={person.avatar} alt="" loading="lazy" className="continuity-person-avatar" />
            : <span aria-hidden="true" className="continuity-person-avatar is-placeholder"><NavigationIcon2029 name="personal" /></span>}
          <div><h2>{person.displayName}</h2><p>{person.role}</p><span className="continuity-card-open">לדף הציבורי ←</span></div>
        </Link>
      </li>)}</ul> : <StatePanel title="לא נמצאה התאמה"><p>אפשר לנסות שם אחר או להסיר את החיפוש.</p><Link className="continuity-action" to="/community/researchers">לכל הכתבים והחוקרים</Link></StatePanel>}
      <Pager page={page} hasMore={people.length > page * size} location={location} />
    </ReadBoundary>
  </ContentPlane>;
}

function ForumContent() {
  const { id } = useParams();
  const location = useLocation();
  const reader = useCallback(signal => loadPublicForumContinuation2029(id ?? null, { signal }), [id]);
  const [state, retry] = usePublicRead(reader);
  // Only an actual anonymous-approved identity can continue. Unknown/private
  // IDs retain their404 instead of becoming successful generic destinations.
  if (state.exists === true && state.status === "gated") return <Navigate replace to={publicForumChatHref2029(location.search,location.hash)} />;
  return <ContentPlane kind="forum" title="פורום המחקר" state={state.status} description="מקום לדיונים, שאלות ותרומות מחקר של הקהילה.">
    <ReadBoundary state={state} retry={retry} missing="לא נמצא דיון ציבורי זמין בכתובת הזאת.">
      <StatePanel title="הפורום פתוח כעת למשתמשים רשומים" icon="conversation">
        <p>{state.exists ? "הקישור לדיון זוהה. " : ""}קריאת הפורום דרך העמוד הזה עדיין אינה זמינה. אפשר להמשיך לפרסומים הציבוריים או לשיחת הקהילה.</p>
        <div className="continuity-actions"><Link className="continuity-action" to="/post">לפרסומים</Link><Link className="continuity-action" to="/community/chat">לשיחת הקהילה</Link></div>
      </StatePanel>
    </ReadBoundary>
    {id ? <Link className="continuity-back" to="/forum">לעמוד הפורום</Link> : null}
  </ContentPlane>;
}

function CommentsContent() {
  const [params] = useSearchParams();
  const wpId = params.has("p") ? params.get("p") : null;
  const reader = useCallback(signal => loadPublicCommentPostContinuation2029(wpId, { signal }), [wpId]);
  const [state, retry] = usePublicRead(reader);
  return <ContentPlane kind="comments" title="תגובות לפוסטים" path="/community/comments" state={state.status}
    description="התגובות ההיסטוריות נשמרות בהקשר שבו נכתבו — לצד הפוסט המקורי.">
    <ReadBoundary state={state} retry={retry} missing="לא נמצא פוסט ציבורי מתאים לקישור לתגובות.">
      <StatePanel title={state.post ? state.post.title : "קריאת תגובות מתוך הפוסט"} icon="posts">
        <p>אפשר לקרוא את התגובות באזור התגובות של כל פוסט. אינדקס התגובות הכללי אינו פתוח כעת.</p>
        <div className="continuity-actions">{state.post ? <Link className="continuity-action is-primary" to={state.post.href}>לתגובות בפוסט</Link> : null}
          <Link className="continuity-action" to="/post">בחירת פוסט</Link></div>
      </StatePanel>
      <div className="continuity-related"><h2>שיחת הקהילה</h2><p>לשיחה המשותפת ולארכיון הצ׳אט יש עמוד משלהם.</p><Link className="continuity-action" to="/community/chat">לשיחת הקהילה</Link></div>
    </ReadBoundary>
  </ContentPlane>;
}

function ContactContent() {
  const { openIssueReport } = use2029Shell();
  return <ContentPlane kind="contact" title="יצירת קשר" path="/contact" description="שאלה, הצעה או בעיה באתר — אפשר לפנות לצוות סוד 1820.">
    <div className="continuity-contact">
      <span className="continuity-contact-symbol" aria-hidden="true"><NavigationIcon2029 name="conversation" /></span>
      <h2>נשמח לשמוע מכם</h2><p>פתחו את טופס הפנייה ובחרו את סוג ההודעה.</p>
      <button className="continuity-action is-primary" type="button" onClick={() => openIssueReport()}>פתיחת טופס פנייה</button>
      <p className="continuity-note">לפניות בנושא פרטיות ומחיקת מידע:</p>
      <a className="continuity-email" href="mailto:zyz997@gmail.com" dir="ltr">zyz997@gmail.com</a>
      <Link className="continuity-back" to="/privacy">מדיניות הפרטיות</Link>
    </div>
  </ContentPlane>;
}

function StatusContent({ kind, title, description, links = [] }) {
  return <ContentPlane kind={kind} title={title} description={description} state="gated">
    <div className="continuity-related">
      {links.length ? <nav className="continuity-actions" aria-label="אפשרויות להמשך">{links.map((link, index) => {
        const [href, label] = Array.isArray(link) ? link : [link.href, link.label];
        if (typeof href === "string" && /^\/(?!\/)/.test(href) && !href.includes("\\")) return <Link key={`${href}:${index}`} className="continuity-action" to={href}>{label}</Link>;
        const external = publicReadingExternalSourceHref(href);
        return external ? <a key={`${href}:${index}`} className="continuity-action" href={external} target="_blank" rel="noopener noreferrer">{label}</a> : null;
      })}</nav> : <Link className="continuity-action" to="/map">למפת האתר</Link>}
    </div>
  </ContentPlane>;
}

function HistoricalLecturesContent() {
  const location = useLocation();
  const page = React.useMemo(() => publicHistoricalLecturePage2029(location.pathname), [location.pathname]);
  const html = React.useMemo(() => historicalLectureHtml2029(page), [page]);
  useEffect(() => { if (page) applySeo({title:page.title,description:"הרצאות המקור ההיסטוריות, בסדרן ובכתובתן המקורית.",path:page.canonicalPath,type:"article"}); }, [page]);
  if (!page) return <StatePanel title="המקור לא נמצא" />;
  return <article className={postReadingClassName()} data-post-character="quiet" data-historical-source={`wp:page:${page.wpPageId}`}>
    <header className="sod29-reading-hero"><span className="sod29-reading-source-badge">הרצאות המקור · תיעוד היסטורי</span>
      <h1>{page.title}</h1><p className="sod29-reading-source-line">פורסם {bilingualDateLabel(page.publishedAt)} · עודכן {bilingualDateLabel(page.modifiedAt)}</p>
      <p className="sod29-reading-deck">תוכן המקור משנת {new Date(page.publishedAt).getUTCFullYear()} נשמר כאן כפי שפורסם. המועדים והטענות שבו שייכים למקור ההיסטורי. לכל הרצאה יש גם קישור ישיר לאתר המקור.</p>
      <details className="sod29-post-details"><summary>מקור וגרסת הקריאה</summary><p>הטקסט שוחזר מעותק ציבורי מתוארך מ־{bilingualDateLabel(page.capturedAt)}, ונמצא זהה בעותק נוסף.</p><a href={page.archiveUrl} target="_blank" rel="noopener noreferrer">לעותק המקור המתוארך ↗</a></details>
    </header>
    <div className="sod29-reading-layout"><section className="sod29-reading-source" aria-label="תוכן ההרצאות המקורי" onToggleCapture={event => {
      const details = event.target;
      if (details.tagName !== "DETAILS" || !details.open) return;
      const frame = details.querySelector("iframe[data-video-src]");
      if (frame && !frame.hasAttribute("src")) frame.src = frame.dataset.videoSrc;
    }} dangerouslySetInnerHTML={{__html:html}} /></div>
  </article>;
}

// Route ownership stays in App2029. This component only presents the requested
// known capability; unknown routes must never be sent here as a catch-all.
export default function PublicContinuity2029Page({ kind = "status", title, description, links }) {
  const pageTitle = title || TITLES[kind] || "השירות";
  return <Sod2029Shell surface={kind === "or-geula" ? "world" : "community"} title={pageTitle} introVariant="none">
    {kind === "historical-lectures" ? <HistoricalLecturesContent /> : kind === "or-geula" ? <OrGeulaContent /> : kind === "people" ? <PeopleContent /> : kind === "forum" ? <ForumContent />
      : kind === "comments" ? <CommentsContent /> : kind === "contact" ? <ContactContent /> : kind === "about" ? <ContentPlane kind="about" title={pageTitle} path="/about"
        description="פוסטים, מקורות, מספרים ואנשים — מרחב הקריאה והקהילה של סוד 1820.">
        <div className="continuity-related"><h2>מכאן אפשר להמשיך</h2><p>לקרוא את הפרסומים, לפגוש את הכותבים ולגלות את המקורות באתר.</p>
          <nav className="continuity-actions" aria-label="על האתר"><Link className="continuity-action" to="/post">הפרסומים</Link><Link className="continuity-action" to="/community/researchers">הכתבים והחוקרים</Link><Link className="continuity-action" to="/contact">יצירת קשר</Link></nav></div>
      </ContentPlane> : <StatusContent kind={kind} title={pageTitle} description={description} links={links} />}
  </Sod2029Shell>;
}
