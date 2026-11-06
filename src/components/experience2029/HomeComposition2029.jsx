// Approved Home composition (reference fa0e26f) inside the single System Frame.
// Presentation over existing public readers: latest posts, cipher posts, home videos and the
// Home projection. Existing capability components arrive as slots so none is duplicated here.
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import NavigationIcon2029 from "./NavigationIcon2029.jsx";
import { getLatestPostCards, getTzofonStories, getHomeVideos } from "../../lib/supabase.js";
import { useAuth } from "../../lib/AuthContext.jsx";
import { NewsletterSignup2029 } from "../StayUpdatedCTA.jsx";
import { getHomeLaunchPostCards, getHomeStandalonePostCards, HOME_STANDALONE_LIMIT } from "../../lib/research/homeLaunchPosts2029.js";
import { CONTENT_SERIES_2029, fetchContentSeriesCatalog2029, seriesHomeFamilies2029, seriesHomeTeaser2029 } from "../../lib/research/contentSeries2029Projection.js";
import { stripHtml } from "../../lib/format.js";
import { levelNumbers } from "../../lib/ratings2029.js";
import { relativeTimeLabel } from "../../lib/relativeTime2029.js";
import ConvergenceRatings2029 from "./ConvergenceRatings2029.jsx";
import HomeHeroMotion2029 from "./HomeHeroMotion2029.jsx";
import HomeUpdatesPreview2029 from "./HomeUpdatesPreview2029.jsx";
import { useReveal } from "./useReveal2029.js";
import { useApproach2029 } from "./useApproach2029.js";
import { realUpdate } from "../../lib/heroUpdate2029.js";
import { publicPostHref, postAddressSlug } from "../../lib/publicPostUrls.js";
import { BRAND_LOCKUP_NAV_2029, HOME_ATMOSPHERE_2029 } from "../../lib/brandAssets2029.js";
import { PUBLIC_READING_RELEASE } from "../../lib/publicReadingRelease2029.js";
import { useFeatureState } from "../MaintenanceLock.jsx";
import { recentConvergence, readSeen, markSeen } from "../../lib/homeMotion2029.js";
import PostCategories2029 from "./PostCategories2029.jsx";
import "./homeMotion2029.css";
import "./homeComposition2029.css";

const clean = (value) => stripHtml(value == null ? "" : String(value)).trim();


function postHref(postOrPath) {
  if (typeof postOrPath === "string" && /^\/(?!\/)/.test(postOrPath)) return postOrPath;
  return publicPostHref(postOrPath) || "/2029/posts";
}

function titleNumber(title, tags) {
  const digits = clean(title).replace(/,/g, "");
  for (const tag of Array.isArray(tags) ? tags : []) {
    if (/^\d{2,5}$/.test(String(tag)) && new RegExp(`(^|\\D)${tag}(\\D|$)`).test(digits)) return Number(tag);
  }
  return null;
}

function useHomeCompositionData({ includeWorld = true, primaryReader = null } = {}) {
  const [state, setState] = useState({ loading: true, posts: [], postsError: false, ciphers: [], notable: [], notableLoading: includeWorld, notableError: null });
  useEffect(() => {
    let live = true;
    const controller = new AbortController();
    const update = (patch) => { if (live) setState((current) => ({ ...current, ...patch })); };
    Promise.resolve().then(() => primaryReader ? primaryReader() : getHomeLaunchPostCards({ limit: 4, signal: controller.signal })).then((posts) => {
      if (!live) return;
      const cards = Array.isArray(posts) ? posts : [];
      // One admitted public read supplies the cards and their exact source
      // metadata. The hero need not re-read the same leading post afterwards.
      update({ loading: false, postsError: false, posts: cards.map((post) => ({
        ...post,
        number: titleNumber(post.title, post.sourcePost?.tags),
        update: realUpdate(post.sourcePost),
        categories: post.sourcePost?.categories || post.categories || [],
      })) });
    }).catch(() => update({ loading: false, posts: [], postsError: true }));
    return () => { live = false; controller.abort(); };
  }, [primaryReader]);
  useEffect(() => {
    let live = true;
    getTzofonStories({ limit: 6 }).then(ciphers => { if (live) setState(current => ({ ...current, ciphers: ciphers || [] })); }).catch(() => {});
    return () => { live = false; };
  }, []);
  useEffect(() => {
    if (!includeWorld) return undefined;
    let live = true;
    setState(current => ({ ...current, notableLoading: true, notableError: null }));
    // Start the existing secondary read after mount; downloading its other
    // Explorer readers is not a prerequisite for painting ready primary Posts.
    import("../../lib/research/explorerFacets.js")
      .then(({ fetchExplorerFacetPage }) => live ? fetchExplorerFacetPage("topic", { limit: 4 }) : null)
      .then(result => { if (live) setState(current => ({ ...current, notable: result?.cards || [], notableLoading: false })); })
      .catch(() => { if (live) setState(current => ({ ...current, notableLoading: false, notableError: "לא ניתן לטעון כרגע את ההתכנסויות. אפשר להמשיך לעולם." })); });
    return () => { live = false; };
  }, [includeWorld]);
  return state;
}

function useHomeDeferredData({ includeWorld, videosAdmitted }) {
  const [state, setState] = useState({ videos: [], videosLoading: true, dimensionPost: null });
  useEffect(() => {
    if (!includeWorld || !videosAdmitted) return undefined;
    let live = true;
    getHomeVideos({ limit: 6 }).then(videos => {
      if (live) setState(current => ({ ...current, videos: videos || [], videosLoading: false }));
    }).catch(() => { if (live) setState(current => ({ ...current, videosLoading: false })); });
    return () => { live = false; };
  }, [includeWorld, videosAdmitted]);
  return state;
}

function Media({ src, fallback, className = "" }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [src]);
  return src && !failed
    ? <img className={`h29-media ${className}`} src={src} alt="" loading="lazy" onError={() => setFailed(true)} />
    : <div className={`h29-media is-empty ${className}`}><span>{fallback}</span></div>;
}

function Reveal({ id, children, admissionRef }) {
  const [ref, reveal] = useReveal(`home:${id}`);
  return <div ref={element => { ref.current = element; if (admissionRef) admissionRef.current = element; }} data-reveal={reveal} className="k29-reveal k29-rv-self">{children}</div>;
}

function Section({ title, link, label, children, className = "", admissionRef }) {
  const [ref, reveal] = useReveal(`home:${label || title}`);
  return <section ref={element => { ref.current = element; if (admissionRef) admissionRef.current = element; }} data-reveal={reveal} className={`h29-sec k29-reveal ${className}`} aria-label={label || title}>
    {title ? <div className="h29-sec-h"><h2>{title}</h2>{link}</div> : null}
    {children}
  </section>;
}

function PublicationTime({ at }) {
  const value = at && new Date(at);
  return value && Number.isFinite(value.getTime())
    ? <time dateTime={value.toISOString()}>{value.toLocaleDateString("he-IL", { timeZone: "Asia/Jerusalem" })} · {relativeTimeLabel(at)}</time>
    : <span>מועד הפרסום לא זמין</span>;
}

// An "updated" line appears only when the saved edit is at least a day after
// publication, so the first-hours finishing edits do not read as updates.
const UPDATE_MIN_GAP_MS = 24 * 60 * 60 * 1000;
function UpdatedTime({ published, updated }) {
  const p = published && new Date(published);
  const u = updated && new Date(updated);
  if (!p || !u || !Number.isFinite(p.getTime()) || !Number.isFinite(u.getTime())) return null;
  if (u.getTime() - p.getTime() < UPDATE_MIN_GAP_MS) return null;
  return <time className="h29-updated" dateTime={u.toISOString()}>עודכן · {u.toLocaleDateString("he-IL", { timeZone: "Asia/Jerusalem" })} · {relativeTimeLabel(updated)}</time>;
}

function AdminLatestUpdates() {
  const [state, setState] = useState({ rows: [], loading: true, failed: false });
  useEffect(() => {
    const controller = new AbortController();
    getLatestPostCards({ limit: 4, includeMetadata: true, throwOnError: true, signal: controller.signal })
      .then(rows => { if (!controller.signal.aborted) setState({ rows, loading: false, failed: false }); })
      .catch(() => { if (!controller.signal.aborted) setState({ rows: [], loading: false, failed: true }); });
    return () => controller.abort();
  }, []);
  return <div className="h29-admin-updates" aria-busy={state.loading}>
    {state.rows.map(post => <Link key={post.id} to={postHref(post)}>{clean(post.title)} <PublicationTime at={post.sourcePost?.date} /></Link>)}
    {state.failed ? <p role="alert">העדכונים אינם זמינים כרגע.</p> : null}
  </div>;
}

// Latest published item of a series (shared by every series card).
function SeriesLatestItem({ item, series }) {
  return <Link className="h29-series-item h29-card-open" to={item.href}>
    <Media src={item.imageUrl} fallback="✦" /><span><strong>{item.title}</strong><small>{item.author || series.writerLabel || series.publisherLabel || "פוסט"}</small><PublicationTime at={item.publishedAt} /><UpdatedTime published={item.publishedAt} updated={item.updatedAt} /></span>
  </Link>;
}

// How many flagship products the Home list reads (one read, the series' own membership: the exact tag only).
const REALITY_MAP_LIST_LIMIT = 20;

// The primary series region (מפת המציאות): a branded, compact royal region for our own content. Hierarchy: logo and identity,
// the title, the leading sample (kept first, never part of the list), then the flagship products. It is never empty: without a
// member and without an approved sample it renders nothing; the series page link and the products list appear only once the
// series has a member, so they never lead to an empty page. The list is the series' exact-tag membership, newest first by the
// Post's publication date; nothing is admitted by title, author or category.
function PrimarySeriesCard({ series, spec, teaser, families = [] }) {
  const items = Array.isArray(series?.items) ? series.items : [];
  if (!teaser && !items.length) return null;
  const seriesHref = `/2029/posts?series=${encodeURIComponent(spec.key)}`;
  const open = items.length > 0;
  const total = Number.isFinite(Number(series?.total)) ? Number(series.total) : items.length;
  return <article className={`h29-series-card is-primary h29-rm${open ? " has-list" : ""}`} data-home-series={spec.key} data-home-series-primary="true">
    <header className="h29-rm-id" data-home-rm-identity="true">
      <img className="h29-rm-logo" src={BRAND_LOCKUP_NAV_2029.src} width={BRAND_LOCKUP_NAV_2029.width} height={BRAND_LOCKUP_NAV_2029.height} alt="" decoding="async" draggable="false" />
      <span className="h29-rm-brand"><b>כי לה׳ המלוכה</b><small>סוד 1820 · התוכן המקורי שלנו</small></span>
    </header>
    {open ? <Link className="h29-series-name h29-rm-title" to={seriesHref}>{spec.label}</Link> : <h3 className="h29-series-name h29-rm-title">{spec.label}</h3>}
    {teaser ? <Link className="h29-series-teaser h29-card-open" to={teaser.href} data-home-series-teaser={teaser.sourceRef} aria-label={`${teaser.text}. מתוך הפוסט: ${teaser.sourceTitle}`}>
      <span className="h29-teaser-kicker">דוגמית מהסדרה{teaser.step ? ` · ${teaser.step}` : ""}</span>
      <span className="h29-teaser-tiles" dir="ltr" aria-hidden="true">
        {teaser.tiles.map((tile, index) => <i key={index} style={{ "--i": index }}>{tile.letter}<small>{tile.value}</small></i>)}
        <b className="h29-teaser-total">= {teaser.total}</b>
      </span>
      <strong className="h29-teaser-line" aria-hidden="true"><bdi dir="ltr">{teaser.highlight}</bdi></strong>
      <small className="h29-teaser-source" aria-hidden="true">מתוך הפוסט: {teaser.sourceTitle}{teaser.methodNote ? ` · ${teaser.methodNote}` : ""}</small>
    </Link> : null}
    {open ? <section className="h29-rm-products" aria-label="מוצרי הדגל" data-home-rm-products="true">
      <h4>מוצרי הדגל<small>{total}</small></h4>
      <ol className="h29-rm-list" tabIndex={0} aria-label="מוצרי הדגל במפת המציאות, מהחדש לישן">
        {items.map(item => <li key={item.sourceRef || item.id}>
          <Link className="h29-rm-item" to={item.href} data-home-rm-item={item.id}>
            <Media src={item.imageUrl} fallback="✦" className="h29-rm-thumb" />
            <span><strong>{item.title}</strong><small>פוסט {item.id} · <PublicationTime at={item.publishedAt} /></small></span>
          </Link>
        </li>)}
      </ol>
      <Link className="h29-series-more" to={seriesHref}>לכל הפוסטים בסדרה ←</Link>
    </section> : null}
    {families.length ? <nav className="h29-fam" aria-label="משפחות תוכן במפת המציאות" data-home-series-families="true">
      {families.map(family => family.href
        ? <Link key={family.key} to={family.href} data-home-family={family.key}>{family.label}{family.note ? <small>{family.note}</small> : null}</Link>
        : <span key={family.key} className="soon" data-home-family={family.key}>{family.label}{family.note ? <small>{family.note}</small> : null}</span>)}
    </nav> : null}
  </article>;
}

function HomeSeriesCards() {
  const [state, setState] = useState({ series: [], loading: true, failed: false });
  useEffect(() => {
    const controller = new AbortController();
    fetchContentSeriesCatalog2029({ limitPerSeries: 1, homeOnly: true, primaryLimit: REALITY_MAP_LIST_LIMIT, signal: controller.signal })
      .then(result => { if (!controller.signal.aborted) setState({ series: result.series, loading: false, failed: false }); })
      .catch(() => { if (!controller.signal.aborted) setState({ series: [], loading: false, failed: true }); });
    return () => controller.abort();
  }, []);
  // The primary series comes first, from the owner's list order; the other series keep their existing order and cards.
  const primarySpec = CONTENT_SERIES_2029.find(spec => spec.priorityLane === "primary") || null;
  const primarySeries = state.series.find(series => series.priorityLane === "primary") || null;
  const others = state.series.filter(series => series.priorityLane !== "primary");
  return <Section title="מהסדרות והכותבים" className="h29-series-section" link={<Link to="/2029/posts">לכל הסדרות ←</Link>}>
    <div className="h29-series-grid" aria-busy={state.loading} data-home-public-series="true">
      {primarySpec ? <PrimarySeriesCard series={primarySeries} spec={primarySpec} teaser={seriesHomeTeaser2029(primarySpec)} families={seriesHomeFamilies2029(primarySpec)} /> : null}
      {state.loading ? Array.from({ length: CONTENT_SERIES_2029.length - (primarySpec ? 1 : 0) }, (_, i) => <div className="h29-series-card h29-skel" key={i} aria-hidden="true" />) : null}
      {others.map(series => {
        const item = series.items[0];
        return <article className="h29-series-card" data-home-series={series.key} key={series.key}>
          <Link className="h29-series-name" to={`/2029/posts?series=${encodeURIComponent(series.key)}`}>{series.label}</Link>
          {item ? <SeriesLatestItem item={item} series={series} /> : <p className="h29-empty" role={series.readState === "failed" ? "alert" : "status"}>{series.readState === "failed" ? "לא ניתן לקרוא כרגע את הסדרה." : series.hasApprovedSources && !series.sourcesRequested ? "אפשר לבדוק מקורות נוספים בעמוד הסדרה." : "אין כרגע פרסום זמין בסדרה."}</p>}
        </article>;
      })}
      {state.failed ? <p role="alert">הסדרות אינן זמינות כרגע. <Link to="/2029/posts">אפשר לפתוח את רשימת הפוסטים.</Link></p> : null}
    </div>
  </Section>;
}

// "פוסטים אחרונים": the newest public Posts that are in no series and not in the "עכשיו" pool (exact complement, shared
// predicates), after the series and the lead. A secondary, compact area: it forces no series membership, is read only once
// it approaches, never repeats an item already shown by another Home source, and renders nothing (no empty area, no error)
// when there is nothing to show.
function HomeStandalonePosts({ exclude, admitted, admissionRef }) {
  const [state, setState] = useState({ posts: [], loading: true });
  useEffect(() => {
    if (!admitted) return undefined;
    const controller = new AbortController();
    getHomeStandalonePostCards({ limit: HOME_STANDALONE_LIMIT + 8, signal: controller.signal })
      .then(posts => { if (!controller.signal.aborted) setState({ posts, loading: false }); })
      .catch(() => { if (!controller.signal.aborted) setState({ posts: [], loading: false }); });
    return () => controller.abort();
  }, [admitted]);
  const shown = useMemo(() => state.posts.filter(post => !exclude.has(String(post.slug)) && !exclude.has(String(post.id))).slice(0, HOME_STANDALONE_LIMIT), [state.posts, exclude]);
  const pending = !admitted || state.loading;
  if (!pending && !shown.length) return null;
  return <Section title="פוסטים אחרונים" className="h29-recent-section" admissionRef={admissionRef} link={<Link to="/2029/posts">לכל הפוסטים ←</Link>}>
    <ul className="h29-recent-list" aria-busy={pending} data-home-standalone="true">
      {pending ? Array.from({ length: HOME_STANDALONE_LIMIT }, (_, i) => <li className="h29-recent-item h29-skel" key={i} aria-hidden="true" />)
        : shown.map(post => <li className="h29-recent-item" data-home-standalone-post={post.slug} key={post.id}>
          <Link to={postHref(post.sourcePost)}>
            <Media src={post.poster} fallback="✦" className="h29-recent-thumb" />
            <span><strong>{clean(post.title)}</strong>{post.excerpt ? <small className="h29-recent-excerpt">{post.excerpt}</small> : null}<PublicationTime at={post.publishedAt} /></span>
          </Link>
        </li>)}
    </ul>
  </Section>;
}

function AvailabilityItem({ label, href, flag }) {
  const feature = useFeatureState(flag, { requireFlag: true });
  const open = !feature.loading && feature.publicState === "open";
  return <li><Link to={href}>{label}</Link><span>{feature.loading ? "בודק זמינות" : open ? "פתוח לציבור" : "סגור לציבור · בבנייה"}</span></li>;
}

function HomeAvailabilityMap() {
  return <section className="h29-launch-card h29-availability" aria-label="מפת פתיחת חלקי האתר" data-home-availability-map="true">
    <h2>האתר ממשיך להיבנות</h2><p>החלקים נפתחים בהדרגה. אפשר לראות כאן מה זמין עכשיו.</p>
    <ul><li><Link to="/2029/posts">פוסטים</Link><span>פתוח לציבור</span></li>
      <li><Link to="/gematria">מחשבון גימטריה</Link><span>פתוח לציבור</span></li>
      <AvailabilityItem label="העולם והגלריות" href="/world" flag="lock_world" />
      <AvailabilityItem label="מספרים וביטויים" href="/2029/number/1820" flag="lock_number" />
      <AvailabilityItem label="הצופן התנ״כי" href="/code" flag="lock_els" />
      <AvailabilityItem label="מסע החיים" href="/2029/journey" flag="lock_life_journey" />
      <AvailabilityItem label="רזיאל" href="/2029/raziel" flag="lock_raziel_site" />
      <AvailabilityItem label="ההיכל" href="/heichal" flag="lock_heichal" />
    </ul><Link className="h29-btn" to="/map">מפת האתר המלאה ←</Link>
  </section>;
}

export default function HomeComposition2029({
  projection, loading, nowHero, story, elsEntry, arrivals, calculator, entry, continuity, primaryReader = null,
  selectedSlug, onSelectPost, onOpenWorkspace, journeyLocked = false, corePublic = false, worldOpen = false,
  onWorldApproach, onSummaryApproach,
  onNavigate,
}) {
  const primary = useHomeCompositionData({ includeWorld: !corePublic && worldOpen, primaryReader });
  // Wait for the primary cards to establish section geometry. A short loading
  // skeleton must not admit distant readers before the real content arrives.
  const [videosRef, videosAdmitted] = useApproach2029(!corePublic && !primary.loading);
  const [summaryRef, summaryAdmitted] = useApproach2029(!primary.loading);
  const [standaloneRef, standaloneAdmitted] = useApproach2029(!primary.loading);
  const [worldRef, worldAdmitted] = useApproach2029(!corePublic && worldOpen && !primary.loading);
  const [storyRef, storyAdmitted] = useApproach2029(!corePublic && worldOpen, {
    rootMargin: "0px", layoutReady: !primary.loading && !primary.notableLoading,
  });
  const deferred = useHomeDeferredData({ includeWorld: !corePublic, videosAdmitted });
  const { user, isAdmin } = useAuth();
  const adminViewer = isAdmin === true && Boolean(user?.id);
  useEffect(() => { if (summaryAdmitted) onSummaryApproach?.(true); }, [summaryAdmitted, onSummaryApproach]);
  const data = { ...primary, ...deferred };
  // Items already shown by the lead, the videos strip or the cipher strip are not repeated in the standalone strip.
  const standaloneExclude = useMemo(() => new Set([
    ...data.posts.map(post => post.slug), ...(data.videos || []).map(video => video.slug),
    ...(data.ciphers || []).map(cipher => postAddressSlug(cipher.link_url)),
  ].filter(Boolean).map(String)), [data.posts, data.videos, data.ciphers]);
  useEffect(() => { if (worldAdmitted) onWorldApproach?.(true); }, [worldAdmitted, onWorldApproach]);
  const now = projection?.temporalNow || null;
  const people = projection?.worldPreview?.people || [];
  const pulse = projection?.systemPulse || null;
  const lead = data.posts[0] || null;
  const [seen, setSeen] = useState(readSeen);
  const see = (key) => setSeen((current) => (current[key] ? current : markSeen(key, current)));

  return <div className={`h29 h29-launch${PUBLIC_READING_RELEASE ? " h29-home-cosmos" : ""}`} style={PUBLIC_READING_RELEASE ? {
    "--home-atmosphere-desktop": `url("${HOME_ATMOSPHERE_2029.desktop}")`,
    "--home-atmosphere-mobile": `url("${HOME_ATMOSPHERE_2029.mobile}")`,
  } : undefined} data-experience-capability="home-composition" onClickCapture={event => {
    const link = event.target.closest?.("a[href]");
    const href = link?.getAttribute("href");
    if (link && !link.hasAttribute("download") && (!link.target || link.target === "_self") && href?.startsWith("/") && !href.startsWith("//") && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) onNavigate?.(href);
  }}>
    <section className="h29-launch-card h29-updates-royal" aria-label="עדכונים אחרונים" data-home-top-updates={adminViewer ? "admin" : "public-closed"}>
      <div className="h29-sec-h"><h2>עדכונים אחרונים</h2><Link to="/2029/posts">כל הפוסטים ←</Link></div>
      <div className="h29-construction-notice" role="note">
        <span className="h29-construction-mark" aria-hidden="true"><svg viewBox="0 0 40 40" fill="none"><path d="M10 29v5m20-5v5M7 17h26v12H7z" /><path d="m8 25 8-8m1 12 12-12m-1 12 5-5" /><path d="M20 6v4m-9-1 3 3m15-3-3 3" /></svg></span>
        <div><strong>האתר בבנייה</strong><p>אנחנו בונים את השלב הבא. האתר עדיין לא מוכן במלואו.</p></div>
      </div>
      <div className="h29-updates-stage">
        <HomeUpdatesPreview2029 />
        <div className="h29-updates-copy">
          <span className="h29-preview-badge">תצוגה מקדימה · להמחשה</span>
          {adminViewer ? <p className="h29-note">🔒 תצוגת מנהל · סגור לציבור</p> : <p className="h29-construction">בקרוב: פרסומים מחוברים לאורך הזמן</p>}
        </div>
      </div>
      {adminViewer ? <AdminLatestUpdates key={user?.id || "no-user"} /> : null}
      <NewsletterSignup2029 />
    </section>
    <HomeSeriesCards />

    {(lead ? <HomeHeroMotion2029 key={lead.slug} lead={lead} href={postHref(lead)} includeWorld={!corePublic && worldOpen} /> : <section className={`h29-hero${data.loading ? " is-loading" : ""}`} data-home-primary={data.loading ? "loading" : data.postsError ? "failed" : "empty"} aria-busy={data.loading}><div className="h29-hero-copy"><div className="h29-kicker">עכשיו</div><h1>תיעוד אירועים ורמזי המערכת</h1>{!data.loading ? <p>{data.postsError ? "העדכונים אינם זמינים כרגע. אפשר לנסות שוב או להמשיך לעולם ולמחשבון." : "אין כרגע עדכונים להצגה. אפשר להמשיך לעולם ולמחשבון."}</p> : null}</div></section>)}

    <HomeStandalonePosts exclude={standaloneExclude} admitted={standaloneAdmitted} admissionRef={standaloneRef} />

    {!corePublic && worldOpen ? <Section className="h29-notable-section" title="התכנסויות בולטות" link={<Link to="/world#world-all-convergences">כל ההתכנסויות ←</Link>}>
      <p className="h29-note">מסודרות לפי מד ההתכנסות הקיים. המדדים נפרדים: איכות, חוזק וסימוני זהב ויהלום.</p>
      <div className="h29-notable" aria-busy={data.notableLoading}>
        {data.notableLoading ? <p className="h29-note" role="status">טוען את ההתכנסויות הבולטות…</p>
          : !data.notable.length ? <p className="h29-note" role="status">{data.notableError || "אין כרגע התכנסויות בולטות להצגה."}</p> : null}
        {data.notable.map((card, index) => {
          const fresh = recentConvergence(card.approvedAt);
          const freshKey = `topic:${card.id}:approved:${card.approvedAt}`;
          const unseen = fresh && !seen[freshKey];
          return <article className={`h29-notable-card k29-rv${unseen ? " is-pulse" : ""}`} style={{ "--i": index }} key={card.id}>
          <Link className="h29-notable-main" to={card.href} onClick={() => { if (unseen) see(freshKey); }}>
            <span className="h29-card-t">{clean(card.label)}</span>
            {card.numbers?.length ? <span className="h29-notable-nums">{levelNumbers(card.numbers, card.highlightNumbers, 4).map(({ n, level }) => <span key={n} className={`k29-num is-l${level}`}>{n}</span>)}</span> : null}
          </Link>
          {fresh ? <span className="h29-upd"><i className={`h29-dot${unseen ? " is-new" : ""}`} aria-hidden="true" />אושרה לאחרונה</span> : null}
          <ConvergenceRatings2029 quality={card.quality} meterScore={card.meterScore} highlightNumbers={card.highlightNumbers} numbers={card.numbers} autoTiers={index < 4} />
        </article>;
        })}
      </div>
    </Section> : null}

    {story && worldOpen ? <Reveal id="story" admissionRef={storyRef}>{storyAdmitted ? story
      : <section id="home-plane" className="sod29-flight-story is-home is-loading" aria-label="סיפור המטוס נטען"><p role="status">סיפור המטוס וכיווני הגילוי</p></section>}</Reveal> : null}

    {elsEntry ? <Reveal id="els-entry">{elsEntry}</Reveal> : null}

    <Section label="צפנים וסרטים">
      <div className="h29-strips">
        <div className="h29-strip k29-rv">
          <div className="h29-sec-h"><h2>הצפנים האחרונים בתורה</h2><Link to="/2029/posts?category=צפונות%20בתורה">כל פרסומי הצופן ←</Link></div>
          <div className="h29-strip-row">
            {data.ciphers.map((cipher) => <Link key={cipher.id} className="h29-tile" to={postHref(cipher.link_url)}>
              <Media src={cipher.thumb_url} fallback="✦" /><span>{clean(cipher.text)}</span>
            </Link>)}
            {!data.loading && !data.ciphers.length ? <p className="h29-empty">אין צפנים להצגה כרגע.</p> : null}
          </div>
        </div>
        {!corePublic ? <div ref={videosRef} className="h29-strip k29-rv">
          <div className="h29-sec-h"><h2>הסרטים האחרונים</h2><Link to="/2029/posts?category=וידאו">כל הסרטים ←</Link></div>
          <div className="h29-strip-row">
            {data.videos.map((video) => <a key={video.yt || video.slug} className="h29-tile is-video" href={video.slug ? postHref(video) : "/2029/posts?category=וידאו"}>
              <Media src={video.poster_url || (video.yt ? `https://i.ytimg.com/vi/${video.yt}/hqdefault.jpg` : null)} fallback="▶" />
              <span>{clean(video.title)}</span>
            </a>)}
            {!data.videosLoading && !data.videos.length ? <p className="h29-empty">אין סרטים להצגה כרגע.</p> : null}
          </div>
        </div> : null}
      </div>
    </Section>

    {arrivals && worldOpen ? <Reveal id="arrivals" admissionRef={worldRef}>{arrivals}</Reveal> : null}

    {!corePublic ? <Section label="מקורות וכותבים">
      <div className="h29-anchors">
        <Link className="h29-anchor k29-rv" to="/world"><span className="h29-glyph is-people"><NavigationIcon2029 name="community" /></span>
          <span><b>הכותבים</b><small>{people.length ? people.map((person) => person.displayName).join(" · ") : "הכותבים שמקורותיהם בעולם"}</small></span></Link>
        <Link className="h29-anchor k29-rv" to="/2029/posts?series=messages-from-righteous"><span className="h29-glyph is-geula"><NavigationIcon2029 name="spark" /></span>
          <span><b>מסרים</b><small>הסדרה המשותפת · המקור נשמר בכל פריט</small></span></Link>
      </div>
    </Section> : null}

    <Section label="כלים וכניסות">
      <div className="h29-portions">
        {calculator}
        {corePublic && worldOpen ? <Link className="h29-portion k29-rv" to="/world" data-home-world="open"><span className="h29-portion-h"><NavigationIcon2029 name="cosmos" />העולם</span><small>מקורות, סיפורים וחיבורים במקום אחד</small></Link> : null}
        {!corePublic && now ? <Link className="h29-portion k29-rv" to={`/2029/number/${now.value}`}><span className="h29-portion-h"><NavigationIcon2029 name="number" />מספר העת</span>
          <span className="h29-daynum">{now.value}</span><small>{now.yearLabel}</small></Link> : null}
        {corePublic ? <a className="h29-portion k29-rv" href="/community/chat"><span className="h29-portion-h"><NavigationIcon2029 name="community" />צ׳אט</span><small>לשיחות הקהילה</small></a>
          : <a className="h29-portion k29-rv" href="/archive"><span className="h29-portion-h"><NavigationIcon2029 name="books" />ארכיון</span><small>שנים של פוסטים, לפי שנה ונושא</small></a>}
        {journeyLocked
          ? <div className="h29-portion k29-rv is-locked" aria-disabled="true" data-home-life-journey="locked"><span className="h29-portion-h"><NavigationIcon2029 name="door" />מסע החיים · נעול</span><small>ייפתח לאחר השלמת ההגדרה</small></div>
          : <Link className="h29-portion k29-rv" to="/2029/journey" data-home-life-journey="open"><span className="h29-portion-h"><NavigationIcon2029 name="door" />מתחילים כאן</span><small>מסע קצר עם השם והתאריך שלכם</small></Link>}
        <button className="h29-portion k29-rv" type="button" onClick={onOpenWorkspace} data-home-user-area="open"><span className="h29-portion-h"><NavigationIcon2029 name="community" />האזור האישי שלי</span><small>חשבון, פרופיל והדברים ששמרתם</small></button>
      </div>
    </Section>

    {entry}
    {continuity}
    {nowHero ? <Section label="חיבורים לעת הזאת">{nowHero}</Section> : null}
    <HomeAvailabilityMap worldOpen={worldOpen} journeyLocked={journeyLocked} />

    <section ref={summaryRef} className="h29-quiet" aria-label="דופק ומצב בנייה">
      <span>{pulse?.corpusTotal ? `${Number(pulse.corpusTotal).toLocaleString("he-IL")} ביטויים במאגר${pulse.contributions7d ? ` · ${pulse.contributions7d} תרומות השבוע` : ""}` : summaryAdmitted && loading ? "בודק מה זז עכשיו…" : "האתר מתחדש. כל אזור נפתח לציבור כשהוא בשל."}</span>
      {!corePublic ? <a href="/map">מה כבר חי ומה בדרך ←</a> : null}
    </section>
  </div>;
}

