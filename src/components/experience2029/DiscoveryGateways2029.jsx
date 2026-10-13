// Four compact discovery gateways over existing public readers, not new research stores.
// Language research is an existing legacy deep-link until its 2029 projection is ready.
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getRealityCodePosts, getRealityVideos } from "../../lib/supabase.js";
import { getMatrixLibraryPage } from "../../lib/elsMatrices.js";
import { savedMatrixWorkspaceHref } from "../../lib/elsSavedMatrix.js";
import { stripHtml } from "../../lib/format.js";
import "./discoveryGateways2029.css";

const clean = value => stripHtml(String(value || "")).trim();

function isCinemaPost(post) {
  const categories = Array.isArray(post?.categories) ? post.categories : [];
  const tags = Array.isArray(post?.tags) ? post.tags : [];
  return categories.includes("הצופן בסרטים")
    || tags.some(tag => ["מטריקס", "משחקי הדיונון", "קולנוע"].includes(tag))
    || /מטריקס|משחקי הדיונון|הצופן בקולנוע/.test(clean(post?.title));
}
const postHref = slug => slug ? `/post/${encodeURIComponent(slug)}` : "/2029/posts";

const languageSources = [
  { id: "language-intro", title: "שבילי שפה — מפתח לגן", href: "/post/chibur-bein-hasafot-mafteach-lagan" },
  { id: "language-shimon", title: "הזהב של שמעון חיימוב", href: "/post/shimon-haimov-english-gold" },
];

function Gateway({ title, subtitle, symbol, href, action, items, empty, loading, featuredLink = null }) {
  return <article className="dg29-gateway">
    <div className="dg29-gateway-head">
      <span className="dg29-glyph" aria-hidden="true">{symbol}</span>
      <div><h3>{title}</h3><p>{subtitle}</p></div>
    </div>
    <div className="dg29-sources">
      {featuredLink ? <Link to={featuredLink.href} className="dg29-source dg29-featured"><span>{featuredLink.title}</span><small>{featuredLink.detail}</small></Link> : null}
      {items.map(item => <Link to={item.href} key={item.id} className="dg29-source">
        <span>{item.title}</span>
        {item.detail ? <small>{item.detail}</small> : null}
      </Link>)}
      {!loading && items.length === 0 ? <p className="dg29-empty">{empty}</p> : null}
      {loading && items.length === 0 ? <p className="dg29-empty" role="status">טוען מקורות ציבוריים…</p> : null}
    </div>
    <Link className="dg29-gateway-action" to={href}>{action} ←</Link>
  </article>;
}

export default function DiscoveryGateways2029() {
  const [state, setState] = useState({ loading: true, cinema: [], videos: [], matrices: [] });
  useEffect(() => {
    let active = true;
    Promise.allSettled([
      getRealityCodePosts(24),
      getRealityVideos({ limit: 40 }),
      getMatrixLibraryPage({ view: "public", pageSize: 4 }),
    ]).then(([cinema, videos, matrices]) => {
      if (!active) return;
      const value = (result, fallback) => result.status === "fulfilled" ? result.value : fallback;
      const cinemaPosts = value(cinema, []).filter(post => post?.slug && isCinemaPost(post)).slice(0, 3);
      const cipherVideos = value(videos, []).filter(video => video?.is_cipher && video?.slug).slice(0, 3);
      const publicMatrices = (value(matrices, { rows: [] })?.rows || []).filter(row => row?.slug || row?.id).slice(0, 3);
      setState({
        loading: false,
        cinema: cinemaPosts.map(post => ({ id: `post:${post.id || post.slug}`, title: clean(post.title), href: postHref(post.slug) })),
        videos: cipherVideos.map(video => ({ id: `video:${video.slug}`, title: clean(video.title), href: postHref(video.slug) })),
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

  return <section className="dg29" aria-label="שערי הגילוי">
    <div className="h29-sec-h">
      <h2>שערי הגילוי</h2>
      <span className="dg29-intro">ארבע דרכים להעמיק באותו עולם מחקר</span>
    </div>
    <div className="dg29-grid">
      <Gateway title="שבילי שפה" subtitle="מילים, שורשים וקשרים בין שפות" symbol="🌍"
        href="/languages" action="למחקר השפות"
        items={languageSources} loading={false} empty="אין כרגע מקורות להצגה" />
      <Gateway title="הצופן בקולנוע" subtitle="מחקרים על סרטים, סדרות ומספרים" symbol="🎬"
        href="/category/הצופן בסרטים" action="לכל מחקרי הקולנוע"
        items={state.cinema} loading={state.loading} empty="אין כרגע מחקרי קולנוע ציבוריים להצגה" />
      <Gateway title="הצפנים בסרטונים" subtitle="סרטוני הצופן והחיבורים שמאחוריהם" symbol="▶"
        href="/archive" action="לספריית הסרטונים"
        featuredLink={{ href: "/category/מימד חמש", title: "מימד חמש · סדרת סרטונים", detail: "סרטונים קצרים ותוכן חזותי — לא כותב" }}
        items={state.videos} loading={state.loading} empty="אין כרגע סרטונים המסומנים כצופן" />
      <Gateway title="הצופן התנ״כי" subtitle="דילוגי אותיות, מטריצות וצפנים שמורים" symbol="✦"
        href="/els?library=public" action="לספריית ELS ולמנוע הדילוגים"
        items={state.matrices} loading={state.loading} empty="אין כרגע מטריצות ציבוריות להצגה" />
    </div>
  </section>;
}
