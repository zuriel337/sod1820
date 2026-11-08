// The first Home card (ZURIEL 8.11.2026): the featured Post (its own poster, title and link) with the reality-tree note beneath it and the
// numbers shown on screen in its video. A reserved-height skeleton while it loads; nothing at all when there is no Post to show.
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getHomeFeaturedPost2029 } from "../../lib/research/homeFeaturedPost2029.js";

export function useHomeFeaturedPost() {
  const [state, setState] = useState({ post: null, loading: true });
  useEffect(() => {
    const controller = new AbortController();
    getHomeFeaturedPost2029({ signal: controller.signal })
      .then(post => { if (!controller.signal.aborted) setState({ post, loading: false }); })
      .catch(() => { if (!controller.signal.aborted) setState({ post: null, loading: false }); });
    return () => controller.abort();
  }, []);
  return state;
}

export default function HomeFeaturedPost2029({ state }) {
  const { post, loading } = state;
  if (loading) return <section className="h29-launch-card h29-featured h29-skel" aria-hidden="true" data-home-featured="loading" />;
  if (!post) return null;
  return <section className="h29-launch-card h29-featured" aria-label="תיעוד מוצג" data-home-featured={post.id}>
    <Link className="h29-featured-main" to={post.href}>
      {post.poster ? <img className="h29-featured-poster" src={post.poster} alt="" width="640" height="360" decoding="async" /> : <span className="h29-featured-poster is-empty" aria-hidden="true">▶</span>}
      <span className="h29-featured-title">{post.title}</span>
    </Link>
    <p className="h29-featured-note" data-home-featured-note="true">{post.note}</p>
    <div className="h29-featured-numbers" role="group" aria-label={post.numbersTitle}>
      <small>{post.numbersTitle}</small>
      <ul>{post.numbers.map(item => <li key={`${item.value}-${item.label}`}><b>{item.value}</b><span>{item.label}</span></li>)}</ul>
    </div>
  </section>;
}
