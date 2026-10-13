// Four compact discovery gateways over existing public readers, not new research stores.
// Language research is an existing legacy deep-link until its 2029 projection is ready.
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getPostsFromSupabase, getCategoryVideos } from "../../lib/supabase.js";
import { claimHomeItems } from "../../lib/research/homePlacement2029.js";
import WatchButton from "../WatchButton.jsx";
import { getMatrixLibraryPage } from "../../lib/elsMatrices.js";
import { savedMatrixWorkspaceHref } from "../../lib/elsSavedMatrix.js";
import { stripHtml } from "../../lib/format.js";
import "./discoveryGateways2029.css";

const clean = value => stripHtml(String(value || "")).trim();

const postHref = slug => {
  if (!slug) return "/2029/posts";
  let decoded = String(slug);
  try { decoded = decodeURIComponent(decoded); } catch { /* preserve original */ }
  return `/post/${encodeURIComponent(decoded)}`;
};

function Gateway({ title, subtitle, symbol, href, action, secondaryHref, secondaryAction, items, empty, loading, followTopics = [] }) {
  return <article className="dg29-gateway">
    <div className="dg29-gateway-head">
      <span className="dg29-glyph" aria-hidden="true">{symbol}</span>
      <div><h3>{title}</h3><p>{subtitle}</p></div>
    </div>
    <div className="dg29-sources">
      {items.map(item => <Link to={item.href} key={item.id} className="dg29-source">
        <span>{item.title}</span>
        {item.detail ? <small>{item.detail}</small> : null}
      </Link>)}
      {!loading && items.length === 0 ? <p className="dg29-empty">{empty}</p> : null}
      {loading && items.length === 0 ? <p className="dg29-empty" role="status">טוען מקורות ציבוריים…</p> : null}
    </div>
    <Link className="dg29-gateway-action" to={href}>{action} ←</Link>
    {secondaryHref ? <Link className="dg29-gateway-secondary" to={secondaryHref}>{secondaryAction} ←</Link> : null}
    {followTopics.length ? <div className="dg29-follow" aria-label={`מעקב אחרי ${title}`}>
      {followTopics.map(({ category, topic, title: followTitle }) => <WatchButton
        key={topic || category} topic={topic || `cat:${category}`}
        source="home_2029_discovery" noPush compact icon="🔔"
        label={followTitle || `עקבו אחרי ${category}`} explainer="" />)}
    </div> : null}
  </article>;
}

function DimensionFiveFeature({ items, loading }) {
  return <section className="dg29-dimension" aria-label="מימד חמש — סרטים ומסרים">
    <div className="dg29-dimension-head">
      <span className="dg29-glyph" aria-hidden="true">🎥</span>
      <div>
        <h3>מימד חמש</h3>
        <p>סרטים ומסרים — רצועה עצמאית מתוך הקטגוריה</p>
      </div>
    </div>
    <div className="dg29-dimension-sources">
      {items.map(item => <Link key={item.id} className="dg29-dimension-source" to={item.href}>
        <span className="dg29-dimension-poster" aria-hidden="true">
          {item.poster ? <img src={item.poster} alt="" loading="lazy" decoding="async" width="100" height="72" /> : "✦"}
        </span>
        <span>{item.title}</span>
      </Link>)}
      {loading && !items.length ? <p role="status" className="dg29-empty">טוען את הסרטים והמסרים…</p> : null}
      {!loading && !items.length ? <p className="dg29-empty">כל התכנים זמינים בקטגוריה; אין פריט נוסף להצגה כאן ללא כפילות.</p> : null}
    </div>
    <div className="dg29-dimension-foot">
      <Link className="dg29-gateway-action" to="/category/מימד חמש">לכל תכני מימד חמש ←</Link>
      <WatchButton topic="cat:מימד חמש" source="home_2029_discovery"
        noPush compact icon="🔔" label="עקבו אחרי מימד חמש" explainer="" />
    </div>
  </section>;
}

export default function DiscoveryGateways2029({ excludedPostKeys = [] }) {
  const [state, setState] = useState({ loading: true, language: [], cinema: [], videos: [], dimension: [], matrices: [] });
  useEffect(() => {
    let active = true;
    // Categories are the ONLY automatic admission rule. Do not derive a gateway
    // from tags, title keywords, a shared word or video metadata.
    Promise.allSettled([
      getPostsFromSupabase({ category: "שבילי שפה", limit: 24, orderBy: "modified" }),
      getPostsFromSupabase({ category: "הצופן בסרטים", limit: 30, orderBy: "modified" }),
      getCategoryVideos("צפונות בתורה", { limit: 80 }),
      getPostsFromSupabase({ category: "מימד חמש", limit: 60, orderBy: "modified" }),
      getMatrixLibraryPage({ view: "public", pageSize: 4 }),
    ]).then(([language, cinema, videos, dimension, matrices]) => {
      if (!active) return;
      const value = (result, fallback) => result.status === "fulfilled" ? result.value : fallback;
      const languagePosts = (value(language, { posts: [] }).posts || [])
        .filter(post => post?.slug && post.home_hidden !== true);
      const cinemaPosts = (value(cinema, { posts: [] }).posts || [])
        .filter(post => post?.slug && post.home_hidden !== true);
      const cipherVideos = (value(videos, []) || [])
        .filter(video => video?.slug && (video.video_url || video.yt));
      const dimensionPosts = (value(dimension, { posts: [] }).posts || [])
        .filter(post => post?.slug && post.home_hidden !== true
          && !(post.categories || []).includes("הצופן בסרטים"));
      const publicMatrices = (value(matrices, { rows: [] })?.rows || [])
        .filter(row => row?.slug || row?.id).slice(0, 3);
      setState({
        loading: false,
        language: languagePosts.map(post => ({ id: `post:${post.id || post.slug}`, slug: post.slug,
          title: clean(post.title), href: postHref(post.slug) })),
        cinema: cinemaPosts.map(post => ({ id: `post:${post.id || post.slug}`, slug: post.slug,
          title: clean(post.title), href: postHref(post.slug) })),
        videos: cipherVideos.map(video => ({ id: `video:${video.slug}`, slug: video.slug,
          title: clean(video.title), href: postHref(video.slug) })),
        dimension: dimensionPosts.map(post => ({ id: `post:${post.id || post.slug}`, slug: post.slug,
          title: clean(post.title), href: postHref(post.slug), poster: post.thumb_url || null })),
        matrices: publicMatrices.map(row => ({
          id: `els:${row.id || row.slug}`,
          title: clean(row.title || row.search_term),
          detail: Number.isInteger(row.skip_distance) ? `דילוג ${Math.abs(row.skip_distance)}` : null,
          href: savedMatrixWorkspaceHref(row),
        })),
      });
    });
    return () => { active = false; };
  }, []);

  const language = claimHomeItems(state.language, excludedPostKeys, 2);
  const cinema = claimHomeItems(state.cinema, language.reserved, 3);
  const videos = claimHomeItems(state.videos, cinema.reserved, 3);
  const dimension = claimHomeItems(state.dimension, videos.reserved, 4);
  // ELS records are distinct research sources, not extra Post copies.
  const biblicalSources = [
    ...videos.items.slice(0, 2).map(item => ({ ...item, detail: "סרטון מתוך צפונות בתורה" })),
    ...state.matrices.slice(0, 2).map(item => ({
      ...item, detail: item.detail ? `צופן ELS · ${item.detail}` : "צופן ELS שמור",
    })),
  ];

  return <section className="dg29" aria-label="שערי הגילוי">
    <div className="h29-sec-h">
      <h2>שערי הגילוי</h2>
      <span className="dg29-intro">שלושה שערי מחקר ורצועה רחבה למימד חמש</span>
    </div>
    <div className="dg29-grid">
      <Gateway title="שבילי שפה" subtitle="מילים, שורשים וקשרים בין שפות" symbol="🌍"
        href="/languages" action="למחקר השפות"
        followTopics={[{ category: "שבילי שפה" }]}
        items={language.items} loading={state.loading} empty="אין כרגע פוסטים ציבוריים בקטגוריה זו" />
      <Gateway title="הצופן בקולנוע" subtitle="מחקרים על סרטים, סדרות ומספרים" symbol="🎬"
        href="/category/הצופן בסרטים" action="לכל מחקרי הקולנוע"
        followTopics={[{ category: "הצופן בסרטים" }]}
        items={cinema.items} loading={state.loading} empty="אין כרגע מחקרי קולנוע ציבוריים להצגה" />
      <Gateway title="הצופן התנ״כי" subtitle="סרטוני צפונות התורה, דילוגי אותיות ומטריצות ELS" symbol="✦"
        href="/category/צפונות בתורה" action="לכל מחקרי הצופן התנ״כי"
        secondaryHref="/els?library=public" secondaryAction="לספריית ELS ולמנוע הדילוגים"
        followTopics={[{ category: "צפונות בתורה" }, { topic: "codes:new", title: "עקבו אחרי צפני ELS חדשים" }]}
        items={biblicalSources} loading={state.loading} empty="אין כרגע סרטונים או מטריצות ציבוריות להצגה" />
    </div>
    <DimensionFiveFeature items={dimension.items} loading={state.loading} />
  </section>;
}
