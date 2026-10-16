// Three discovery gateways plus a separate Dimension Five row over existing public readers.
// Language research is an existing legacy deep-link until its 2029 projection is ready.
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { getCategoryVideos } from "../../lib/supabase.js";
import { runtimeOff } from "../../lib/runtimeSwitches2029.js";
import { fetchHomePostCards2029 } from "../../lib/research/homePostCards2029.js";
import { claimHomeItems } from "../../lib/research/homePlacement2029.js";
import WatchButton from "../WatchButton.jsx";
import { getMatrixLibraryPage } from "../../lib/elsMatrices.js";
import { savedMatrixWorkspaceHref } from "../../lib/elsSavedMatrix.js";
import { stripHtml } from "../../lib/format.js";
import { gatewayContentState } from "../../lib/homeReadiness2029.js";
import { useSettledBox } from "./useSettledBox2029.js";
import HomeReadNotice2029 from "./HomeReadNotice2029.jsx";
import "./discoveryGateways2029.css";

const clean = value => stripHtml(String(value || "")).trim();
const NBSP = "\u00a0";
// Presentation memory only (never data): the rows each gateway showed the last time Home was on screen in this session,
// so a return to Home reserves the same rows while its reads repeat. null = not seen yet: use the claim limits.
const shownBefore = { slots: null };

const postHref = slug => {
  if (!slug) return "/posts";
  let decoded = String(slug);
  try { decoded = decodeURIComponent(decoded); } catch { /* preserve original */ }
  return `/post/${encodeURIComponent(decoded)}`;
};

// Presentation only: these four published relationships are shown solely while they
// remain supported by the original, category-admitted Post 5018. No duplicate Post.
function languagePostHighlights(post) {
  if (!post || post.id !== "post:5018" || post.slug !== "chibur-bein-hasafot-mafteach-lagan") return [];
  const sourceText = `${clean(post.content)} ${clean(post.excerpt)}`.replace(/\s+/g, " ");
  return [
    { value: "26", expression: "God ↔ יהוה", exists: /God\s*=\s*26/i.test(sourceText) && /יהוה\s*=\s*26/.test(sourceText) },
    { value: "86", expression: "Bereshit ↔ אלהים", exists: /Bereshit\s*=\s*86/i.test(sourceText) && /אלהים\s*=\s*86/.test(sourceText) },
    { value: "611", expression: "מפתח לגן ↔ תורה", exists: /מפתח לגן\s*=\s*611/.test(sourceText) && /611\s*=\s*תורה/.test(sourceText) },
    { value: "1820", expression: "70 × 26", exists: /70\s*[×x]\s*26\s*=\s*1820/i.test(sourceText) },
  ].filter(item => item.exists);
}

function LanguagePostPreview({ post, highlights }) {
  if (!post || !highlights.length) return null;
  return <Link to={post.href} className="dg29-language-preview"
    aria-label="לקריאת שבילי שפה — מפתח לגן, עם דוגמאות מספריות מתוך המחקר">
    <span className="dg29-language-kicker">מתוך הפוסט · מפתח לגן</span>
    <strong>איך שפות שונות נפגשות במספרים?</strong>
    <span className="dg29-language-metrics">
      {highlights.map(({ value, expression }) => <span className="dg29-language-metric" key={value}>
        <b>{value}</b><span>{expression}</span>
      </span>)}
    </span>
    <span className="dg29-language-evidence">שיטות חישוב שונות · קשרים מספריים המוצגים כרמזים</span>
    <span className="dg29-language-open">למחקר המלא ולמקורות ←</span>
  </Link>;
}

// Loading slots reuse the loaded rows' own markup/classes with non-breaking-space text, so their geometry follows the
// same CSS. Their counts are what each gateway showed the last time (shownBefore); a cold load has no such evidence and renders none.
function LanguageFeatureSlot() {
  return <span className="dg29-language-preview is-loading" aria-hidden="true">
    <span className="dg29-language-kicker">{NBSP}</span>
    <strong>{NBSP}</strong>
    <span className="dg29-language-metrics">
      {[0, 1, 2, 3].map(index => <span className="dg29-language-metric" key={index}><b>{NBSP}</b><span>{NBSP}</span></span>)}
    </span>
    <span className="dg29-language-evidence">{NBSP}</span>
    <span className="dg29-language-open">{NBSP}</span>
  </span>;
}

function SourceSlot({ detail = false }) {
  return <span className="dg29-source is-loading" aria-hidden="true"><span>{NBSP}</span>{detail ? <small>{NBSP}</small> : null}</span>;
}

function Gateway({ title, subtitle, symbol, href, action, secondaryHref, secondaryAction, items, feature = null, empty, loading, followTopics = [], slots = null, failed = false, onRetry = null }) {
  // No rows after the read settled: the message stands in the place of the rows and keeps the box they held (nothing below it moves); an empty gateway is not remembered.
  const count = items.length + (feature ? 1 : 0), unavailable = !loading && count === 0;
  const box = useSettledBox(`gateway:${title}`, { pending: loading, settled: !loading && count > 0, count, keep: unavailable });
  // The status line is visible text unless something else (loading slots or a held box) already reserves this row's place.
  const reserving = Boolean(slots && (slots.feature || slots.rows > 0));
  const followControl = ({ category, topic, title: followTitle }) => <WatchButton
    key={topic || category} topic={topic || `cat:${category}`}
    source="home_2029_discovery" noPush variant="icon"
    label={followTitle || `עקבו אחרי ${category}`} explainer="" />;
  return <article className="dg29-gateway" data-scroll-anchor={`dg:${title}`}>
    <div className="dg29-gateway-head">
      <span className="dg29-glyph" aria-hidden="true">{symbol}</span>
      <div className="dg29-heading"><h3>{title}</h3><p>{subtitle}</p></div>
      {followTopics.length ? <div className="dg29-head-follow" aria-label={`מעקב אחרי ${title}`}>
        {followTopics.slice(0, 1).map(followControl)}
      </div> : null}
    </div>
    <div className="dg29-sources" ref={box.ref} data-h29-hold={box.hold} data-h29-loading={loading && items.length === 0 && !feature && box.held ? "" : undefined} data-h29-notice={unavailable && onRetry ? "" : undefined}>
      {feature}
      {items.map(item => <Link to={item.href} key={item.id} className="dg29-source">
        <span>{item.title}</span>
        {item.detail ? <small>{item.detail}</small> : null}
      </Link>)}
      {unavailable ? (onRetry ? <HomeReadNotice2029 onRetry={onRetry}>{failed ? FAILED_TEXT : empty}</HomeReadNotice2029> : <p className="dg29-empty">{empty}</p>) : null}
      {loading && items.length === 0 && !feature ? <>
        {slots?.feature && !box.held ? <LanguageFeatureSlot /> : null}
        {Array.from({ length: box.held ? 0 : (slots?.rows || 0) }, (_, index) => <SourceSlot key={index} detail={Boolean(slots?.detail)} />)}
        <p className={reserving || box.held ? "dg29-empty dg29-sr" : "dg29-empty"} role="status">טוען מקורות ציבוריים…</p>
      </> : null}
    </div>
    <Link className="dg29-gateway-action" to={href}>{action} ←</Link>
    {secondaryHref ? <div className="dg29-secondary-row">
      <Link className="dg29-gateway-secondary" to={secondaryHref}>{secondaryAction} ←</Link>
      {followTopics.slice(1).map(followControl)}
    </div> : null}
  </article>;
}

function DimensionFiveFeature({ items, loading, dimensionSlots = 0, failed = false, onRetry = null }) {
  const unavailable = !loading && !items.length;   // as in Gateway: the message keeps the held box, an empty strip is not remembered
  const box = useSettledBox("dimension-five", { pending: loading, settled: !loading && items.length > 0, count: items.length, keep: unavailable });
  return <section className="dg29-dimension" aria-label="מימד חמש — סרטים ומסרים" data-scroll-anchor="dg:dimension-five">
    <div className="dg29-dimension-head">
      <span className="dg29-glyph" aria-hidden="true">🎥</span>
      <div>
        <h3>מימד חמש</h3>
        <p>סרטים ומסרים — רצועה עצמאית מתוך הקטגוריה</p>
      </div>
      <WatchButton topic="cat:מימד חמש" source="home_2029_discovery"
        noPush variant="icon" label="עקבו אחרי מימד חמש" explainer="" />
    </div>
    <div className="dg29-dimension-sources" ref={box.ref} data-h29-hold={box.hold} data-h29-loading={loading && !items.length && box.held ? "" : undefined} data-h29-notice={unavailable && onRetry ? "" : undefined}>
      {items.map(item => <Link key={item.id} className="dg29-dimension-source" to={item.href}>
        <span className="dg29-dimension-poster" aria-hidden="true">
          {item.poster ? <img src={item.poster} alt="" loading="lazy" decoding="async" width="100" height="72" /> : "✦"}
        </span>
        <span>{item.title}</span>
      </Link>)}
      {loading && !items.length ? <>
        {Array.from({ length: box.held ? 0 : dimensionSlots }, (_, index) => <span className="dg29-dimension-source is-loading" key={index} aria-hidden="true">
          <span className="dg29-dimension-poster" /><span>{NBSP}</span>
        </span>)}
        <p role="status" className={box.held || dimensionSlots > 0 ? "dg29-empty dg29-sr" : "dg29-empty"}>טוען את הסרטים והמסרים…</p>
      </> : null}
      {unavailable ? (onRetry ? <HomeReadNotice2029 onRetry={onRetry}>{FAILED_TEXT}</HomeReadNotice2029> : <p className="dg29-empty">כל התכנים זמינים בקטגוריה; אין פריט נוסף להצגה כאן ללא כפילות.</p>) : null}
    </div>
    <div className="dg29-dimension-foot">
      <Link className="dg29-gateway-action" to="/category/מימד חמש">לכל תכני מימד חמש ←</Link>
    </div>
  </section>;
}

// The readers behind the gateways, one entry each (the owner switches are resolved once and passed in):
// fx_home_videos (the cipher-videos RPC) and fx_home_gateways (language / cinema / dimension / matrices).
// Categories are the ONLY automatic admission rule. Do not derive a gateway from tags, title keywords, a shared word or video metadata.
const READERS = {
  language: (off) => off.gateways ? Promise.resolve({ posts: [] }) : fetchHomePostCards2029({ category: "שבילי שפה", limit: 24 }),
  cinema: (off) => off.gateways ? Promise.resolve({ posts: [] }) : fetchHomePostCards2029({ category: "הצופן בסרטים", limit: 30 }),
  videos: (off) => off.videos ? Promise.resolve([]) : getCategoryVideos("צפונות בתורה", { limit: 80 }),
  dimension: (off) => off.gateways ? Promise.resolve({ posts: [] }) : fetchHomePostCards2029({ category: "מימד חמש", limit: 60 }),
  matrices: (off) => off.gateways ? Promise.resolve({ rows: [] }) : getMatrixLibraryPage({ view: "public", pageSize: 4 }),
};
const ALL_READS = Object.keys(READERS);
// The reads each area (a gateway, the dimension strip) is built from: a retry repeats the reads of the area that failed and nothing else.
const AREA_READS = { language: ["language"], cinema: ["cinema"], biblical: ["videos", "matrices"], dimension: ["dimension"] };
const SETTLING = { loading: true, failed: false, value: null };
const FAILED_TEXT = "הטעינה נכשלה. אפשר לנסות שוב.";

export default function DiscoveryGateways2029({ excludedPostKeys = [] }) {
  // One entry per reader: loading, failed (the reader rejected) and the value it returned. The first load runs every reader and lands in one render; a retry runs
  // only the readers of one area, with the same arguments, and leaves every other area as it is (the area goes back to its loading state, which keeps its box).
  const [reads, setReads] = useState(() => Object.fromEntries(ALL_READS.map((name) => [name, SETTLING])));
  const live = useRef({ active: true, token: 0, latest: {}, off: null });
  const load = useCallback((names) => {
    const state = live.current, token = ++state.token;
    for (const name of names) state.latest[name] = token;
    setReads((current) => ({ ...current, ...Object.fromEntries(names.map((name) => [name, SETTLING])) }));
    state.off = state.off || Promise.all([runtimeOff("fx_home_videos"), runtimeOff("fx_home_gateways")]).then(([videos, gateways]) => ({ videos, gateways }));
    state.off
      .then((off) => Promise.allSettled(names.map((name) => Promise.resolve().then(() => READERS[name](off)))), () => { state.off = null; return names.map(() => ({ status: "rejected" })); })
      .then((results) => {
        if (!state.active) return;
        setReads((current) => {
          const next = { ...current };
          names.forEach((name, index) => {
            if (state.latest[name] !== token) return;   // a newer attempt for this reader is the one that counts
            next[name] = { loading: false, failed: results[index].status === "rejected", value: results[index].status === "fulfilled" ? results[index].value : null };
          });
          return next;
        });
      });
  }, []);
  useEffect(() => { live.current.active = true; load(ALL_READS); return () => { live.current.active = false; }; }, [load]);
  const areaLoading = (area) => AREA_READS[area].some((name) => reads[name].loading);
  const areaFailed = (area) => AREA_READS[area].some((name) => reads[name].failed);
  const retryArea = (area) => () => load(AREA_READS[area]);
  const loading = ALL_READS.some((name) => reads[name].loading);
  const value = (name, fallback) => reads[name].value ?? fallback;
  const state = {
    loading,
    // every reader rejected: an explicit error outcome, never presented as populated content
    failed: ALL_READS.every((name) => reads[name].failed),
    language: (value("language", { posts: [] }).posts || []).filter(post => post?.slug && post.home_hidden !== true)
      .map(post => ({ id: `post:${post.id || post.slug}`, slug: post.slug, title: clean(post.title), href: postHref(post.slug), content: post.content || "", excerpt: post.excerpt || "" })),
    cinema: (value("cinema", { posts: [] }).posts || []).filter(post => post?.slug && post.home_hidden !== true)
      .map(post => ({ id: `post:${post.id || post.slug}`, slug: post.slug, title: clean(post.title), href: postHref(post.slug) })),
    videos: (value("videos", []) || []).filter(video => video?.slug && (video.video_url || video.yt))
      .map(video => ({ id: `video:${video.slug}`, slug: video.slug, title: clean(video.title), href: postHref(video.slug) })),
    dimension: (value("dimension", { posts: [] }).posts || []).filter(post => post?.slug && post.home_hidden !== true && !(post.categories || []).includes("הצופן בסרטים"))
      .map(post => ({ id: `post:${post.id || post.slug}`, slug: post.slug, title: clean(post.title), href: postHref(post.slug), poster: post.thumb_url || null })),
    matrices: (value("matrices", { rows: [] })?.rows || []).filter(row => row?.slug || row?.id).slice(0, 3)
      .map(row => ({ id: `els:${row.id || row.slug}`, title: clean(row.title || row.search_term), detail: Number.isInteger(row.skip_distance) ? `דילוג ${Math.abs(row.skip_distance)}` : null, href: savedMatrixWorkspaceHref(row) })),
  };

  const language = claimHomeItems(state.language, excludedPostKeys, 2);
  const languagePost = language.items.find(post => post.id === "post:5018") || null;
  const languageHighlights = languagePostHighlights(languagePost);
  // The featured excerpt replaces the ordinary Post link: one Home tile per Post.
  const languageFeature = languageHighlights.length
    ? <LanguagePostPreview post={languagePost} highlights={languageHighlights} /> : null;
  const languageLinks = languageFeature
    ? language.items.filter(item => item !== languagePost) : language.items;
  const cinema = claimHomeItems(state.cinema, language.reserved, 3);
  const videos = claimHomeItems(state.videos, cinema.reserved, 2);
  const dimension = claimHomeItems(state.dimension, videos.reserved, 4);
  // ELS records are distinct research sources, not extra Post copies.
  const biblicalSources = [
    ...videos.items.slice(0, 2).map(item => ({ ...item, detail: "סרטון מתוך צפונות בתורה" })),
    ...state.matrices.slice(0, 2).map(item => ({
      ...item, detail: item.detail ? `צופן ELS · ${item.detail}` : "צופן ELS שמור",
    })),
  ];

  useEffect(() => {
    if (state.loading) return;
    shownBefore.slots = { language: { feature: Boolean(languageFeature), rows: languageLinks.length }, cinema: cinema.items.length,
      biblical: biblicalSources.length, dimension: dimension.items.length };
  });
  const slots = shownBefore.slots;

  // Each area that ended without rows says so in its own box, and offers its own retry when that can help: its reader rejected, or (the biblical gateway) one of its
  // readers swallows its errors, so an empty result may be a failed one. An area whose readers can fail loudly and returned nothing is simply empty: no retry.
  const rowCounts = { language: (languageFeature ? 1 : 0) + languageLinks.length, cinema: cinema.items.length, biblical: biblicalSources.length, dimension: dimension.items.length };
  const retryFor = (area, swallows = false) => !areaLoading(area) && rowCounts[area] === 0 && (areaFailed(area) || swallows) ? retryArea(area) : null;
  // Non-visual: populated gateway rows (not loading slots) decide ready; a settled outcome without any is explicit.
  const itemCount = (languageFeature ? 1 : 0) + languageLinks.length + cinema.items.length + biblicalSources.length + dimension.items.length;
  return <section className="dg29" aria-label="שערי הגילוי" data-dg29-state={gatewayContentState({ loading: state.loading, failed: state.failed, itemCount })}>
    <div className="h29-sec-h">
      <h2>שערי הגילוי</h2>
      <span className="dg29-intro">שלושה שערי מחקר ורצועה רחבה למימד חמש</span>
    </div>
    <div className="dg29-grid">
      <Gateway title="שבילי שפה" subtitle="מילים, שורשים וקשרים בין שפות" symbol="🌍"
        href="/languages" action="למחקר השפות"
        followTopics={[{ category: "שבילי שפה" }]}
        feature={languageFeature} items={languageLinks} loading={areaLoading("language")} failed={areaFailed("language")} slots={slots ? slots.language : null} onRetry={retryFor("language")} empty="אין כרגע פוסטים ציבוריים בקטגוריה זו" />
      <Gateway title="הצופן בקולנוע" subtitle="מחקרים על סרטים, סדרות ומספרים" symbol="🎬"
        href="/category/הצופן בסרטים" action="לכל מחקרי הקולנוע"
        followTopics={[{ category: "הצופן בסרטים" }]}
        items={cinema.items} loading={areaLoading("cinema")} failed={areaFailed("cinema")} slots={slots ? { rows: slots.cinema } : null} onRetry={retryFor("cinema")} empty="אין כרגע מחקרי קולנוע ציבוריים להצגה" />
      <Gateway title="הצופן התנ״כי" subtitle="סרטוני צפונות התורה, דילוגי אותיות ומטריצות ELS" symbol="✦"
        href="/category/צפונות בתורה" action="לכל מחקרי הצופן התנ״כי"
        secondaryHref="/els?library=public" secondaryAction="לספריית ELS ולמנוע הדילוגים"
        followTopics={[{ category: "צפונות בתורה" }, { topic: "codes:new", title: "עקבו אחרי צפני ELS חדשים" }]}
        items={biblicalSources} loading={areaLoading("biblical")} failed={areaFailed("biblical")} slots={slots ? { rows: slots.biblical, detail: true } : null} onRetry={retryFor("biblical", true)} empty="אין כרגע סרטונים או מטריצות ציבוריות להצגה" />
    </div>
    <DimensionFiveFeature items={dimension.items} loading={areaLoading("dimension")} failed={areaFailed("dimension")} onRetry={retryFor("dimension")} dimensionSlots={slots ? slots.dimension : 0} />
  </section>;
}
