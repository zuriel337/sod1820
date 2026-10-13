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

const postHref = slug => slug ? `/post/${encodeURIComponent(slug)}` : "/2029/posts";

const languageSources = [
  { id: "language-intro", title: "שבילי שפה — מפתח לגן", href: "/post/chibur-bein-hasafot-mafteach-lagan" },
  { id: "language-shimon", title: "הזהב של שמעון חיימוב", href: "/post/shimon-haimov-english-gold" },
];

function Gateway({ title, subtitle, symbol, href, action, items, empty, loading, followTopics = [] }) {
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
    {followTopics.length ? <div className="dg29-follow" aria-label={`מעקב אחרי ${title}`}>
      {followTopics.map(({ category, topic, title: followTitle }) => <WatchButton
        key={topic || category} topic={topic || `cat:${category}`}
        source="home_2029_discovery" noPush compact icon="🔔"
        label={followTitle || `עקבו אחרי ${category}`} explainer="" />)}
    </div> : null}
  </article>;
}

export default function DiscoveryGateways2029({ excludedPostKeys = [] }) {
  const [state, setState] = useState({ loading: true, cinema: [], videos: [], dimension: [], matrices: [] });
  useEffect(() => {
    let active = true;
    // Categories are the ONLY automatic admission rule. Do not derive a gateway
    // from tags, title keywords, a shared word or video metadata.
    Promise.allSettled([
      getPostsFromSupabase({ category: "הצופן בסרטים", limit: 30, orderBy: "modified" }),
      getCategoryVideos("צפונות בתורה", { limit: 80 }),
      getPostsFromSupabase({ category: "מימד חמש", limit: 16, orderBy: "modified" }),
      getMatrixLibraryPage({ view: "public", pageSize: 4 }),
    ]).then(([cinema, videos, dimension, matrices]) => {
      if (!active) return;
      const value = (result, fallback) => result.status === "fulfilled" ? result.value : fallback;
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
        cinema: cinemaPosts.map(post => ({ id: `post:${post.id || post.slug}`, slug: post.slug,
          title: clean(post.title), href: postHref(post.slug) })),
        videos: cipherVideos.map(video => ({ id: `video:${video.slug}`, slug: video.slug,
          title: clean(video.title), href: postHref(video.slug) })),
        dimension: dimensionPosts.map(post => ({ id: `post:${post.id || post.slug}`, slug: post.slug,
          title: clean(post.title), href: postHref(post.slug) })),
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

  const language = claimHomeItems(languageSources, excludedPostKeys, 2);
  const cinema = claimHomeItems(state.cinema, language.reserved, 3);
  const dimension = claimHomeItems(state.dimension, cinema.reserved, 1);
  const videos = claimHomeItems(state.videos, dimension.reserved, 3 - dimension.items.length);

  return <section className="dg29" aria-label="שערי הגילוי">
    <div className="h29-sec-h">
      <h2>שערי הגילוי</h2>
      <span className="dg29-intro">ארבע דרכים להעמיק באותו עולם מחקר</span>
    </div>
    <div className="dg29-grid">
      <Gateway title="שבילי שפה" subtitle="מילים, שורשים וקשרים בין שפות" symbol="🌍"
        href="/languages" action="למחקר השפות"
        followTopics={[{ category: "שבילי שפה" }]}
        items={language.items} loading={false} empty="אין כרגע מקורות להצגה" />
      <Gateway title="הצופן בקולנוע" subtitle="מחקרים על סרטים, סדרות ומספרים" symbol="🎬"
        href="/category/הצופן בסרטים" action="לכל מחקרי הקולנוע"
        followTopics={[{ category: "הצופן בסרטים" }]}
        items={cinema.items} loading={state.loading} empty="אין כרגע מחקרי קולנוע ציבוריים להצגה" />
      <Gateway title="הצפנים בסרטונים" subtitle="תוכן חזותי מתוך הקטגוריות המאושרות" symbol="▶"
        href="/category/צפונות בתורה" action="לכל סרטוני הצפנים"
        followTopics={[{ category: "צפונות בתורה" }, { category: "מימד חמש" }]}
        items={[...dimension.items.map(item => ({ ...item, detail: "מימד חמש · תוכן חזותי" })), ...videos.items]}
        loading={state.loading} empty="אין כרגע סרטוני צופן זמינים בקטגוריות" />
      <Gateway title="הצופן התנ״כי" subtitle="דילוגי אותיות, מטריצות וצפנים שמורים" symbol="✦"
        href="/els?library=public" action="לספריית ELS ולמנוע הדילוגים"
        followTopics={[{ topic: "codes:new", title: "עקבו אחרי צפני ELS חדשים" }]}
        items={state.matrices} loading={state.loading} empty="אין כרגע מטריצות ציבוריות להצגה" />
    </div>
  </section>;
}
