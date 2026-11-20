// Approved Home composition (reference fa0e26f) inside the single System Frame.
// Presentation over existing public readers: latest posts, cipher posts, home videos and the
// Home projection. Existing capability components arrive as slots so none is duplicated here.
import React, { lazy, Suspense, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import NavigationIcon2029 from "./NavigationIcon2029.jsx";
import { getLatestPostCards, getTzofonStories, getHomeVideos } from "../../lib/supabase.js";
import { useAuth } from "../../lib/AuthContext.jsx";
import { NewsletterSignup2029 } from "../StayUpdatedCTA.jsx";
import { getHomeLaunchPostCards, getHomeStandalonePostCards, HOME_STANDALONE_LIMIT } from "../../lib/research/homeLaunchPosts2029.js";
import { CONTENT_SERIES_2029, fetchContentSeriesCatalog2029, seriesFamilyRows2029, seriesHomeFamilies2029, seriesHomeTeaser2029 } from "../../lib/research/contentSeries2029Projection.js";
import { stripHtml } from "../../lib/format.js";
import { levelNumbers } from "../../lib/ratings2029.js";
import { relativeTimeLabel } from "../../lib/relativeTime2029.js";
// The notable convergences sit far below the opening screen: their rating marks load with them (ZURIEL 17.11.2026, Speed Law).
const HomeStreamVideo2029 = lazy(() => import("./HomeStreamVideo2029.jsx"));
const ConvergenceRatings2029 = lazy(() => import("./ConvergenceRatings2029.jsx"));
import HomeHeroMotion2029 from "./HomeHeroMotion2029.jsx";
import { SystemFeedContext2029 } from "./systemFeedContext2029.js";
import SeriesBell2029 from "./SeriesBell2029.jsx";
import HomeFeaturedPost2029, { useHomeFeaturedPost } from "./HomeFeaturedPost2029.jsx";
import { NowPinnedMessage2029 } from "./NowRoyalCenter2029.jsx";
import { HOME_SECTIONS_2029 } from "../../lib/research/homeSections2029.js";
import { nowModels, buildNowEntries, nowPinnedMessage, REALITY_MAP_LATEST_KEY, seriesLatestFace2029, seriesLatestMember2029 } from "../../lib/nowPublications2029.js";
import { pinCoverSet, PIN_COVER_SIZES } from "./homePinnedCover2029.js";
import { thumb } from "../../lib/img.js";
import { HomeLeadImageGate2029, HOME_LEAD_IMAGE_CAP_MS } from "./homeLeadImageGate2029.js";
import { useReveal } from "./useReveal2029.js";
import { useApproach2029 } from "./useApproach2029.js";
import { realUpdate } from "../../lib/heroUpdate2029.js";
import { publicPostHref, postAddressSlug } from "../../lib/publicPostUrls.js";
import { BRAND_LOCKUP_NAV_2029, HOME_ATMOSPHERE_2029 } from "../../lib/brandAssets2029.js";
import { PUBLIC_READING_RELEASE, publicReadingPath } from "../../lib/publicReadingRelease2029.js";
import { useFeatureState } from "../MaintenanceLock.jsx";
import { recentConvergence, readSeen, markSeen } from "../../lib/homeMotion2029.js";
import PostCategories2029 from "./PostCategories2029.jsx";
import "./homeMotion2029.css";
import "./homeComposition2029.css";
import SeriesLatestMark2029 from "./SeriesLatestMark2029.jsx";
import NowThumb2029 from "./NowThumb2029.jsx";
import { NUMBER_PAGE_BASE } from "../../lib/research/numberPageAddress.js";

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

// Bounded copies for non-LCP Home media. Originals remain canonical in Storage and Posts.
const HOME_MEDIA_SLOTS_2029 = {
  compact: { widths: [96, 160], sizes: "64px", quality: 58 },
  series: { widths: [240, 480], sizes: "(max-width: 760px) calc(100vw - 48px), 360px", quality: 62 },
  tile: { widths: [160, 320], sizes: "150px", quality: 62 },
  poster: { widths: [240, 480], sizes: "(max-width: 760px) 150px, 180px", quality: 64 },
};
const homeMediaProps2029 = (url, slot = "compact") => {
  const { widths, sizes, quality } = HOME_MEDIA_SLOTS_2029[slot] || HOME_MEDIA_SLOTS_2029.compact;
  const src = thumb(url, widths[0], quality);
  return !src || src === url ? { src: url || null, srcSet: null, sizes: null }
    : { src, srcSet: widths.map(width => `${thumb(url, width, quality)} ${width}w`).join(", "), sizes };
};
function Media({ src, fallback, className = "", slot = "compact" }) {
  const [failed, setFailed] = useState(false);
  const open = useContext(HomeLeadImageGate2029);
  const media = homeMediaProps2029(src, slot);
  useEffect(() => { setFailed(false); }, [src]);
  return src && !failed && open
    ? <img className={`h29-media ${className}`} {...media} data-home-media={slot} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} />
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
    <Media src={item.imageUrl} fallback="✦" slot="series" /><span><strong>{item.title}</strong><small>{item.author || series.writerLabel || series.publisherLabel || "פוסט"}</small><PublicationTime at={item.publishedAt} /><UpdatedTime published={item.publishedAt} updated={item.updatedAt} /></span>
  </Link>;
}


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
  const famAll = seriesFamilyRows2029(items, families);
  // The sample IS an example of its source Post. When that Post is a member shown by a family row (today: שבילי שפה, post 5018), the sample
  // sits attached under that Post, that row comes first, and nothing is left empty beside it. Otherwise the sample stays on its own as before.
  const leadIndex = teaser ? famAll.rows.findIndex(row => row.item && row.item.sourceRef === teaser.sourceRef) : -1;
  const attached = leadIndex >= 0;
  const famView = attached ? { ...famAll, rows: [famAll.rows[leadIndex], ...famAll.rows.filter((_, index) => index !== leadIndex)] } : famAll;
  const sample = teaser ? <Link className="h29-series-teaser h29-card-open" to={teaser.href} data-home-series-teaser={teaser.sourceRef} aria-label={`${teaser.text}. מתוך הפוסט: ${teaser.sourceTitle}`}>
      <span className="h29-teaser-kicker">{attached ? `דוגמה מ${famView.rows[0].label}` : "דוגמית מהסדרה"}{teaser.step ? ` · ${teaser.step}` : ""}</span>
      <span className="h29-teaser-tiles" dir="ltr" aria-hidden="true">
        {teaser.tiles.map((tile, index) => <i key={index} style={{ "--i": index }}>{tile.letter}<small>{tile.value}</small></i>)}
        <b className="h29-teaser-total">= {teaser.total}</b>
      </span>
      <strong className="h29-teaser-line" aria-hidden="true"><bdi dir="ltr">{teaser.highlight}</bdi></strong>
      <small className="h29-teaser-source" aria-hidden="true">מתוך הפוסט: {teaser.sourceTitle}{teaser.methodNote ? ` · ${teaser.methodNote}` : ""}</small>
    </Link> : null;
  return <article className={`h29-series-card is-primary h29-rm${open ? " has-list" : ""}${attached ? " is-attached" : ""}`} data-home-series={spec.key} data-home-series-primary="true">
    <header className="h29-rm-id" data-home-rm-identity="true">
      <img className="h29-rm-logo" src={BRAND_LOCKUP_NAV_2029.src} width={BRAND_LOCKUP_NAV_2029.width} height={BRAND_LOCKUP_NAV_2029.height} alt="" decoding="async" draggable="false" />
      <span className="h29-rm-brand"><b>כי לה׳ המלוכה</b><small>סוד 1820 · התוכן המקורי שלנו</small></span>
    </header>
    <div className="h29-series-head">
      {open ? <Link className="h29-series-name h29-rm-title" to={seriesHref}>{spec.label}</Link> : <h3 className="h29-series-name h29-rm-title">{spec.label}</h3>}
      <SeriesBell2029 seriesKey={spec.key} label={spec.label} />
    </div>
    {!attached ? sample : null}
    {open || families.length ? <section className="h29-rm-products h29-rm-fams" aria-label="הפוסטים במפה" data-home-rm-products="true">
      <h4>מהמפה{open ? <small>{total}</small> : null}</h4>
      <div className="h29-fam-rows">
        {famView.rows.map((row, rowIndex) => <div className={`h29-fam-row${row.item ? "" : " is-bare"}${attached && rowIndex === 0 ? " is-lead" : ""}`} key={row.key} data-home-family={row.key}>
          {row.item
            ? <Link className="h29-fam-post" to={row.item.href} data-home-rm-item={row.item.id}>
              <Media src={row.item.imageUrl} fallback={<img src={BRAND_LOCKUP_NAV_2029.src} alt="" width={40} height={40} />} className="h29-rm-thumb" slot="compact" />
              <span><b className="h29-fam-k">{row.label}</b><strong>{row.item.title}</strong><small>פוסט {row.item.id} · <PublicationTime at={row.item.publishedAt} /></small></span>
            </Link>
            : <span className="h29-fam-post is-empty"><b className="h29-fam-k">{row.label}</b>{row.note ? <small>{row.note}</small> : null}</span>}
          {attached && rowIndex === 0 ? sample : null}
          <Link className="h29-fam-all" to={row.href} aria-label={`כל הפוסטים ב${row.label}`}>{row.label} ←</Link>
        </div>)}
      </div>
      {famView.rest.length ? <ul className="h29-rm-rest" aria-label="עוד פוסטים במפה">
        {famView.rest.slice(0, 3).map(item => <li key={item.sourceRef || item.id}><Link to={item.href} data-home-rm-item={item.id}><strong>{item.title}</strong><PublicationTime at={item.publishedAt} /></Link></li>)}
      </ul> : null}
      {famView.soon.map(family => <span key={family.key} className="soon h29-fam-soon" data-home-family={family.key}>{family.label}{family.note ? ` · ${family.note}` : ""}</span>)}
      {open ? <Link className="h29-series-more" to={seriesHref}>לכל הפוסטים בסדרה ←</Link> : null}
    </section> : null}
  </article>;
}

// One read of the series catalog serves both Home areas (the flagship region and the other series) AND the shared feed's details
// (the reader shares one read; each series shows its own explicit count inside the 90-day window: `homeDisplay` in the series identity).
function useHomeSeries() {
  const [state, setState] = useState({ series: [], loading: true, failed: false });
  useEffect(() => {
    const controller = new AbortController();
    fetchContentSeriesCatalog2029({ homeOnly: true, homeDisplay: true, signal: controller.signal })
      .then(result => { if (!controller.signal.aborted) setState({ series: result.series, loading: false, failed: false }); })
      .catch(() => { if (!controller.signal.aborted) setState({ series: [], loading: false, failed: true }); });
    return () => controller.abort();
  }, []);
  return state;
}

// The primary series comes first (the owner's list order) in its own area right after the live updates.
function HomeFlagshipRegion({ state }) {
  const primarySpec = CONTENT_SERIES_2029.find(spec => spec.priorityLane === "primary") || null;
  const primarySeries = state.series.find(series => series.priorityLane === "primary") || null;
  if (!primarySpec) return null;
  return <section className="h29-sec h29-flagship-section" aria-label="מפת המציאות" data-home-flagship="true">
    <div className="h29-series-grid" aria-busy={state.loading} data-home-public-series="true">
      <PrimarySeriesCard series={primarySeries} spec={primarySpec} teaser={seriesHomeTeaser2029(primarySpec)} families={seriesHomeFamilies2029(primarySpec)} />
    </div>
  </section>;
}

// The other series keep their existing order and cards, after the flagship region, the ELS entry and the latest ciphers.
function HomeOtherSeries({ state }) {
  const others = state.series.filter(series => series.priorityLane !== "primary");
  const hasPrimary = CONTENT_SERIES_2029.some(spec => spec.priorityLane === "primary");
  return <Section title="מהסדרות והכותבים" className="h29-series-section" link={<Link to="/2029/posts">לכל הסדרות ←</Link>}>
    <div className="h29-series-grid" aria-busy={state.loading} data-home-other-series="true">
      {state.loading ? Array.from({ length: CONTENT_SERIES_2029.length - (hasPrimary ? 1 : 0) }, (_, i) => <div className="h29-series-card h29-skel" key={i} aria-hidden="true" />) : null}
      {others.map(series => {
        const item = series.items[0];
        const more = series.items.slice(1);
        return <article className="h29-series-card" data-home-series={series.key} key={series.key}>
          <div className="h29-series-head"><Link className="h29-series-name" to={`/2029/posts?series=${encodeURIComponent(series.key)}`}>{series.label}</Link><SeriesBell2029 seriesKey={series.key} label={series.label} /></div>
          {item ? <SeriesLatestItem item={item} series={series} /> : <p className="h29-empty" role={series.readState === "failed" ? "alert" : "status"}>{series.readState === "failed" ? "לא ניתן לקרוא כרגע את הסדרה." : series.hasApprovedSources && !series.sourcesRequested ? "אפשר לבדוק מקורות נוספים בעמוד הסדרה." : "אין כרגע פרסום זמין בסדרה."}</p>}
          {more.length ? <ul className="h29-series-more-list" data-home-series-more={series.key}>{more.map(next => <li key={next.sourceRef || next.id}><Link to={next.href}><strong>{next.title}</strong><PublicationTime at={next.publishedAt} /></Link></li>)}</ul> : null}
        </article>;
      })}
      {state.failed ? <p role="alert">הסדרות אינן זמינות כרגע. <Link to="/2029/posts">אפשר לפתוח את רשימת הפוסטים.</Link></p> : null}
    </div>
  </Section>;
}

// Home takes the first three entries from the shared Now default view after removing the
// separately presented Reality Map series and central pin. The existing public access gate still applies.
const HOME_UPDATES_LIMIT = 3;
function useHomeUpdates(feed, { postsOnly, exclude }) {
  const loading = Boolean(feed?.loading || feed?.detailsPending);
  const all = useMemo(() => {
    const rows = Array.isArray(feed?.expandedRows) ? feed.expandedRows : Array.isArray(feed?.rows) ? feed.rows : [];
    return nowModels(rows, Date.now(), feed?.seen);
  }, [feed?.expandedRows, feed?.rows, feed?.seen]);
  const pinned = useMemo(() => nowPinnedMessage(all), [all]);
  // The newest מפת המציאות publication is the Home's pinned lead (HomePinnedLead below): the SAME model that leads "עכשיו", shown once.
  const lead = useMemo(() => all.find(model => model.seriesLatest) || null, [all]);
  const models = useMemo(() => {
    const pool = all.filter(model => model.id !== pinned?.model.id && (!postsOnly || model.item?.sourceKind === "post")
      && !(model.href && exclude?.has(model.href)));
    return buildNowEntries(pool).filter(entry => entry.model?.seriesKey !== REALITY_MAP_LATEST_KEY).slice(0, HOME_UPDATES_LIMIT);
  }, [all, pinned, postsOnly, exclude]);
  return { loading, models, pinned, lead, see: feed?.see };
}

// The site-wide construction note (Design Contract V2: it describes the whole site), first on the Home (ZURIEL 17.11.2026: "לכתוב שם שהדף בבנייה").
function HomeBuildingNote() {
  return <p className="h29-building" role="note" data-home-building-note="true">
    <span className="h29-building-k"><span aria-hidden="true">🛠️</span> הדף בבנייה</span>
    <span className="h29-building-t">האתר נפתח בהדרגה, חלק אחר חלק</span>
    <button type="button" className="h29-linkbtn" onClick={scrollToNewsletter}>לעדכונים במייל ←</button>
  </p>;
}

// ZURIEL 17.11.2026 ("הדבר הנעוץ למעלה זה חייב להיות הרבה זמן, זה הבשר של האתר שלנו"): the Home opens with the newest publication of מפת המציאות,
// our own content, as one large pinned card. It is the SAME model that leads "עכשיו" (nowModels: the newest reality-map publication, or its newest
// registered update, with the mark that blinks until this viewer enters it), so it stays until a newer reality-map publication replaces it; no
// timer ends it. Until the shared feed arrives the series catalog's newest member stands in (the same Post in practice), and the card keeps its
// size either way. An owner's pinned message (a time-bounded pin) still shows, above it. The cover copies are defined once in
// homePinnedCover2029.js, which the Home's early start (src/lib/homePinnedLeadEarly2029.js) also uses, so its early request is this card's file.
const postIdOf = id => /^post:(\d+)$/.exec(String(id || ""))?.[1] || null;
function HomePinnedLead({ lead, catalogItems, pinned, onNavigateTo, settled = false, onImageSettled = null }) {
  const member = lead ? catalogItems.find(item => item.id === postIdOf(lead.id)) || null : seriesLatestMember2029(catalogItems);
  const face = lead ? { title: lead.title, postTitle: lead.postTitle, at: lead.at, href: lead.href } : seriesLatestFace2029(member);
  const href = face?.href || null;
  const title = face?.title || "";
  const context = face?.postTitle && face.postTitle !== face.title ? face.postTitle : null;
  const cover = member?.coverUrl || null;
  const image = cover || lead?.thumb || member?.imageUrl || null;
  const set = cover ? pinCoverSet(cover) : "";
  const at = face?.at || null;
  const time = at && Number.isFinite(new Date(at).getTime()) ? new Date(at) : null;
  // No image to wait for: the images below may start (homeLeadImageGate2029).
  useEffect(() => { if (settled && !image) onImageSettled?.(); }, [settled, image, onImageSettled]);
  // Both readers answered and neither has a reality-map publication (or both failed): no card, and the Home's content gate is not left waiting.
  if (settled && !lead && !member) return pinned ? <section className="h29-pinlead" aria-label="הנעוץ" data-home-pinned-lead="none"><NowPinnedMessage2029 pinned={pinned} onOpen={onNavigateTo} /></section>
    : <section className="h29-pinlead" data-home-pinned-lead="none" hidden />;
  // One structure whether the Post is known yet or not (same boxes, same heights), so nothing moves when it arrives.
  const body = <>
    <span className="h29-pinlead-media">{image ? <img src={image} srcSet={set || undefined} sizes={set ? PIN_COVER_SIZES : undefined}
      alt="" width="1280" height="720" fetchpriority="high" decoding="async" onLoad={onImageSettled || undefined} onError={onImageSettled || undefined} /> : <span className="h29-pinlead-empty" aria-hidden="true">✦</span>}</span>
    <span className="h29-pinlead-badge r29-badge is-pinned"><NavigationIcon2029 name="kingdom" size={14} />נעוץ · מפת המציאות</span>
    <strong className="h29-pinlead-title">{href ? title : "טוען את הפרסום הנעוץ…"}</strong>
    <small className="h29-pinlead-meta">{context ? <span className="h29-pinlead-ctx">{context}</span> : null}
      {lead?.seriesLatest ? <SeriesLatestMark2029 model={lead} /> : null}
      {time ? <time dateTime={time.toISOString()}>{relativeTimeLabel(at)}</time> : null}</small>
    <span className="h29-pinlead-cta r29-btn is-primary" aria-hidden={href ? undefined : "true"}>לקריאה ←</span>
  </>;
  return <section className="h29-pinlead" aria-label="הנעוץ · מפת המציאות" data-home-pinned-lead={lead ? "feed" : member ? "catalog" : "loading"} aria-busy={!href}>
    {pinned ? <NowPinnedMessage2029 pinned={pinned} onOpen={onNavigateTo} /> : null}
    <article className="h29-pinlead-card r29 r29-hall">
      {href ? <Link className="h29-pinlead-link" to={href} data-home-pinned-post={postIdOf(lead?.id) || member?.id || undefined}>{body}</Link>
        : <span className="h29-pinlead-link is-loading" role="status">{body}</span>}
      <Link className="h29-pinlead-all" to="/2029/posts?series=reality-map">כל מפת המציאות ←</Link>
    </article>
  </section>;
}

function HomeNowThumb({ model }) {
  const thumb = <NowThumb2029 model={model} className="h29-live-thumb">
    <Media src={model.thumb} fallback={model.video ? "▶" : "◈"} className="h29-live-thumb" slot="compact" />
  </NowThumb2029>;
  return model.previewKind === "video" && (model.thumb || model.logo)
    ? <span className="h29-live-video">{thumb}<i aria-hidden="true">▶</i></span> : thumb;
}

function HomeLiveUpdates({ updates, onOpenNow }) {
  const { loading, models } = updates;
  if (!loading && !models.length) return null;
  return <section className="rc29 r29 r29-hall is-home is-compact h29-live" aria-label="עכשיו" data-home-top-updates="live" data-home-now-center="true" data-home-now-compact="true" aria-busy={loading}>
    <header className="rc29-head h29-live-head"><span className="rc29-medal r29-medal" aria-hidden="true"><NavigationIcon2029 name="now" size={18} /></span>
      <span><h2>עכשיו</h2><small>הפרסומים האחרונים מכל המקורות</small></span></header>
    <ul className="h29-live-list rc29-list">
      {loading ? Array.from({ length: HOME_UPDATES_LIMIT }, (_, i) => i === 0
        ? <li className="h29-live-item h29-skel" key={i}><span className="h29-live-status" role="status">טוען את העדכונים האחרונים…</span></li>
        : <li className="h29-live-item h29-skel" key={i} aria-hidden="true" />)
        : models.map((entry, index) => {
          if (entry.models) {
            const lead = entry.models[0];
            const run = entry.kind === "run";
            const at = entry.latest || lead.at;
            const body = <>
              {lead.logo ? <HomeNowThumb model={lead} /> : null}
              <span className="rc29-rt"><strong>{entry.models.some(model => model.row?.isNew) ? <span className="r29-badge is-new rc29-new-badge">חדש</span> : null}{lead.title}</strong>
              <small className="h29-live-meta"><b>{entry.label || entry.sourceName}</b>{run ? " · מקור · טרם נבדק" : ""} · {entry.models.length} {entry.models.length === 1 ? "עדכון" : "עדכונים"}{at ? <> · <time dateTime={at}>{relativeTimeLabel(at)}</time></> : null}</small></span>
            </>;
            return <li className={`h29-live-item rc29-row${index === 0 ? " is-lead" : ""}`} data-tone={run ? "ember" : "gold"} data-home-update-item={entry.id} data-home-group="true" data-home-update-box={run ? undefined : "or-geula-rabbi"} key={entry.id}>
              {onOpenNow ? <button type="button" className="h29-live-open r29-card" onClick={onOpenNow}>{body}</button> : <div className="r29-card">{body}</div>}
            </li>;
          }
          const model = entry.model;
          const body = <>
            <HomeNowThumb model={model} />
            <span className="rc29-rt"><strong>{model.pinned ? <span className="r29-badge is-pinned rc29-new-badge" data-home-update-pinned="true">📌 נעוץ</span> : null}{model.row?.isNew ? <span className="r29-badge is-new rc29-new-badge">חדש</span> : model.updated ? <span className="r29-badge is-updated rc29-new-badge">עודכן</span> : null}{model.title}</strong>
              <small className="h29-live-meta"><b>{model.typeLabel}</b>{model.byline.length ? ` · ${model.byline.join(" · ")}` : ""}{model.at && Number.isFinite(new Date(model.at).getTime()) ? <> · <time dateTime={new Date(model.at).toISOString()}>{relativeTimeLabel(model.at)}</time></> : null}</small></span>
          </>;
          return <li className={`h29-live-item rc29-row${index === 0 ? " is-lead" : ""}`} data-tone={model.tone} data-home-update-item={model.id} key={model.id}>
            {model.href?.startsWith("/") ? <Link className="r29-card" to={model.href} onClick={() => updates.see?.(model.row)}>{body}</Link> : model.href ? <a className="r29-card" href={model.href} onClick={() => updates.see?.(model.row)}>{body}</a>
              : onOpenNow ? <button type="button" className="h29-live-open r29-card" onClick={onOpenNow} data-home-update-opens-now="true">{body}</button> : <div className="r29-card">{body}</div>}
          </li>;
        })}
    </ul>
    {onOpenNow ? <button type="button" className="rc29-btn r29-btn is-gold rc29-more" onClick={onOpenNow} data-home-open-now="true"><NavigationIcon2029 name="now" size={18} />לכל העדכונים ב״עכשיו״ ←</button>
      : <Link className="rc29-btn r29-btn is-gold rc29-more" to="/2029/posts">לכל הפוסטים ←</Link>}
  </section>;
}

// Entrances (ZURIEL, 6.11.2026): the Beit Midrash (the methods, explained) and a promo for the life journey. The "site under construction"
// note with its way to sign up for updates moved to the top of the Home (HomeBuildingNote, 17.11.2026). A gate that is closed shows its true state (HOME-05), never a dead link.
function scrollToNewsletter() {
  const target = document.getElementById("home-newsletter");
  if (!target) return;
  const calm = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  target.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "center" });
  target.querySelector("button, input, a")?.focus?.({ preventScroll: true });
}
function HomeEntryBand({ journeyLocked, midrashOpen }) {
  return <section className="h29-entry-band" aria-label="כניסות והרשמה לעדכונים" data-home-entry-band="true">
    {midrashOpen
      ? <Link className="h29-entry k29-rv" to="/beit-midrash" data-home-entry="beit-midrash"><span className="h29-entry-k">בית המדרש</span><strong>איך מחשבים ואיך מגלים</strong><small>השיטות מוסברות, שיטה אחר שיטה</small></Link>
      : <div className="h29-entry k29-rv is-locked" aria-disabled="true" data-home-entry="beit-midrash"><span className="h29-entry-k">בית המדרש · בבנייה</span><strong>איך מחשבים ואיך מגלים</strong><small>ייפתח בהמשך</small></div>}
    {/* ZURIEL 18.11.2026: Life Journey appears once on Home; while it is locked only the "כלים וכניסות" tile names it. */}
    {journeyLocked
      ? null
      : <Link className="h29-entry k29-rv" to="/2029/journey" data-home-entry="life-journey"><span className="h29-entry-k">מסע החיים · פרומו</span><strong>מסע קצר עם השם והתאריך שלכם</strong><small>מתחילים כאן</small></Link>}
  </section>;
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
            <Media src={post.poster} fallback="✦" className="h29-recent-thumb" slot="compact" />
            <span><strong>{clean(post.title)}</strong>{post.excerpt ? <small className="h29-recent-excerpt">{post.excerpt}</small> : null}<PublicationTime at={post.publishedAt} /></span>
          </Link>
        </li>)}
    </ul>
  </Section>;
}

function AvailabilityItem({ label, href, flag }) {
  const feature = useFeatureState(flag, { requireFlag: true });
  const open = !feature.loading && feature.publicState === "open";
  // ZURIEL 18.11.2026: a closed area is named, not linked (a link led to the closed page).
  return <li>{open ? <Link to={href}>{label}</Link> : <span className="h29-availability-name">{label}</span>}<span>{feature.loading ? "בודק זמינות" : open ? "פתוח לציבור" : "סגור לציבור · בבנייה"}</span></li>;
}

function HomeAvailabilityMap() {
  return <section className="h29-launch-card h29-availability" aria-label="מפת פתיחת חלקי האתר" data-home-availability-map="true">
    <h2>האתר ממשיך להיבנות</h2><p>החלקים נפתחים בהדרגה. אפשר לראות כאן מה זמין עכשיו.</p>
    <ul><li><Link to="/2029/posts">פוסטים</Link><span>פתוח לציבור</span></li>
      <li><Link to="/gematria">מחשבון גימטריה</Link><span>פתוח לציבור</span></li>
      <AvailabilityItem label="העולם והגלריות" href="/world" flag="lock_world" />
      <AvailabilityItem label="מספרים וביטויים" href={`${NUMBER_PAGE_BASE}/1820`} flag="lock_number" />
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
  onWorldApproach, onSummaryApproach, onOpenNow = null,
  onNavigate, activity = null,
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
  const seriesState = useHomeSeries();
  const featured = useHomeFeaturedPost();
  const feed = useContext(SystemFeedContext2029);
  const midrashState = publicReadingPath("/beit-midrash", { isAdmin: adminViewer });
  const midrashOpen = !(midrashState === "closed" || midrashState === "missing");
  // The featured story keeps its dedicated card; it must not appear twice on Home.
  const updatesExclude = useMemo(() => new Set([
    featured.post?.href,
  ].filter(Boolean)), [featured.post?.href]);
  const updates = useHomeUpdates(feed, { exclude: updatesExclude, postsOnly: corePublic && !worldOpen });
  const primaryItems = useMemo(() => seriesState.series.find(series => series.priorityLane === "primary")?.items || [], [seriesState.series]);
  const navigate = useNavigate();
  const openHref = href => { if (!href) return; if (/^\/(?!\/)/.test(href)) { onNavigate?.(href); navigate(href); } else window.location.assign(href); };
  const standaloneExclude = useMemo(() => new Set([
    ...data.posts.map(post => post.slug), ...(data.videos || []).map(video => video.slug),
    ...(HOME_SECTIONS_2029.ciphers ? (data.ciphers || []).map(cipher => postAddressSlug(cipher.link_url)) : []),
    ...updates.models.flatMap(entry => (entry.models || [entry.model]).map(model => model.href ? postAddressSlug(model.href) : null)),
    featured.post?.slug,
  ].filter(Boolean).map(String)), [data.posts, data.videos, data.ciphers, updates.models, featured.post]);
  useEffect(() => { if (worldAdmitted) onWorldApproach?.(true); }, [worldAdmitted, onWorldApproach]);
  const now = projection?.temporalNow || null;
  const people = projection?.worldPreview?.people || [];
  const pulse = projection?.systemPulse || null;
  const lead = data.posts[0] || null;
  const [seen, setSeen] = useState(readSeen);
  const see = (key) => setSeen((current) => (current[key] ? current : markSeen(key, current)));
  // The images below the pinned lead wait for its image (homeLeadImageGate2029), at most a few seconds.
  const [leadImageDone, setLeadImageDone] = useState(false);
  const leadImageSettled = useCallback(() => setLeadImageDone(true), []);
  useEffect(() => { const cap = setTimeout(leadImageSettled, HOME_LEAD_IMAGE_CAP_MS); return () => clearTimeout(cap); }, [leadImageSettled]);

  return <HomeLeadImageGate2029.Provider value={leadImageDone}><div className={`h29 h29-launch${PUBLIC_READING_RELEASE ? " h29-home-cosmos" : ""}`} style={PUBLIC_READING_RELEASE ? {
    "--home-atmosphere-desktop": `url("${HOME_ATMOSPHERE_2029.desktop}")`,
    "--home-atmosphere-mobile": `url("${HOME_ATMOSPHERE_2029.mobile}")`,
  } : undefined} data-experience-capability="home-composition" onClickCapture={event => {
    const link = event.target.closest?.("a[href]");
    const href = link?.getAttribute("href");
    if (link && !link.hasAttribute("download") && (!link.target || link.target === "_self") && href?.startsWith("/") && !href.startsWith("//") && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) onNavigate?.(href);
  }}>
    {/* ZURIEL 17.11.2026: the construction note, then the pinned מפת המציאות lead (our own content), then a short "עכשיו" from the same feed. */}
    <HomeBuildingNote />
    <div className="h29-lead-pair">
      <HomePinnedLead lead={updates.lead} catalogItems={primaryItems} pinned={updates.pinned} onNavigateTo={openHref} settled={!seriesState.loading && !updates.loading} onImageSettled={leadImageSettled} />
      <Suspense fallback={<div className="h29-stream-slot" aria-hidden="true" />}>
        {leadImageDone ? <HomeStreamVideo2029 /> : <div className="h29-stream-slot" aria-hidden="true" />}
      </Suspense>
    </div>
    <HomeLiveUpdates updates={updates} onOpenNow={onOpenNow} />
    {activity}

    {elsEntry ? <Reveal id="els-entry">{elsEntry}</Reveal> : null}

    {HOME_SECTIONS_2029.ciphers ? <Section label="הצפנים האחרונים בתורה">
      <div className="h29-strips">
        <div className="h29-strip k29-rv">
          <div className="h29-sec-h"><h2><img className="h29-sec-logo" src="/els-logo.png" width="28" height="28" alt="" loading="lazy" decoding="async" />הצפנים האחרונים בתורה</h2><Link to="/2029/posts?category=צפונות%20בתורה">כל פרסומי הצופן ←</Link></div>
          <div className="h29-strip-row">
            {data.ciphers.map((cipher) => <Link key={cipher.id} className="h29-tile" to={postHref(cipher.link_url)}>
              <Media src={cipher.thumb_url} fallback="✦" /><span>{clean(cipher.text)}</span>
            </Link>)}
            {!data.loading && !data.ciphers.length ? <p className="h29-empty">אין צפנים להצגה כרגע.</p> : null}
          </div>
        </div>
      </div>
    </Section> : null}

    <HomeFlagshipRegion state={seriesState} />
    <HomeEntryBand journeyLocked={journeyLocked} midrashOpen={midrashOpen} />

    <HomeOtherSeries state={seriesState} />

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
          <Suspense fallback={null}><ConvergenceRatings2029 quality={card.quality} meterScore={card.meterScore} highlightNumbers={card.highlightNumbers} numbers={card.numbers} autoTiers={index < 4} /></Suspense>
        </article>;
        })}
      </div>
    </Section> : null}

    <HomeFeaturedPost2029 state={featured} hideHighlights={Boolean(updates.pinned)} mediaFor={homeMediaProps2029} />

    {story && worldOpen ? <Reveal id="story" admissionRef={storyRef}>{storyAdmitted ? story
      : <section id="home-plane" className="sod29-flight-story is-home is-loading" aria-label="סיפור המטוס נטען"><p role="status">סיפור המטוס וכיווני הגילוי</p></section>}</Reveal> : null}

    {!corePublic ? <Section label="סרטים">
      <div className="h29-strips">
        <div ref={videosRef} className="h29-strip k29-rv">
          <div className="h29-sec-h"><h2>הסרטים האחרונים</h2><Link to="/2029/posts?category=וידאו">כל הסרטים ←</Link></div>
          <div className="h29-strip-row">
            {data.videos.map((video) => <a key={video.yt || video.slug} className="h29-tile is-video" href={video.slug ? postHref(video) : "/2029/posts?category=וידאו"}>
              <Media src={video.poster_url || (video.yt ? `https://i.ytimg.com/vi/${video.yt}/hqdefault.jpg` : null)} fallback="▶" slot="tile" />
              <span>{clean(video.title)}</span>
            </a>)}
            {!data.videosLoading && !data.videos.length ? <p className="h29-empty">אין סרטים להצגה כרגע.</p> : null}
          </div>
        </div>
      </div>
    </Section> : null}

    {arrivals && worldOpen ? <Reveal id="arrivals" admissionRef={worldRef}>{worldAdmitted ? arrivals : <p className="h29-note h29-stream-reserve" role="status">זרם המציאות ייטען כשתגיעו אליו</p>}</Reveal> : null}

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
        {!corePublic && now ? <Link className="h29-portion k29-rv" to={`${NUMBER_PAGE_BASE}/${now.value}`}><span className="h29-portion-h"><NavigationIcon2029 name="number" />מספר העת</span>
          <span className="h29-daynum">{now.value}</span><small>{now.yearLabel}</small></Link> : null}
        {corePublic ? <a className="h29-portion k29-rv" href="/community/chat"><span className="h29-portion-h"><NavigationIcon2029 name="community" />צ׳אט</span><small>לשיחות הקהילה</small></a>
          : <Link className="h29-portion k29-rv" to="/2029/posts" data-home-archive="posts"><span className="h29-portion-h"><NavigationIcon2029 name="books" />ארכיון</span><small>שנים של פוסטים, לפי שנה ונושא</small></Link>}
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
    <section id="home-newsletter" className="h29-launch-card h29-newsletter-end" aria-label="הרשמה לעדכונים במייל" data-home-newsletter="end"><NewsletterSignup2029 /></section>
  </div></HomeLeadImageGate2029.Provider>;
}

