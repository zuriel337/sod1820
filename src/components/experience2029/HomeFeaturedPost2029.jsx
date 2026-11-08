// The first Home card (ZURIEL 8.11.2026): the featured Post — its video, title and link — with the message beside it, the reality-tree note beneath,
// and the numbers on screen + the engine-checked connections. The language follows public_language_revelation_geula_law (discovery/hint voice;
// arithmetic stays arithmetic, interpretation is labelled). A reserved-height skeleton while it loads; nothing at all when there is no Post.
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

const wide = () => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(min-width: 900px)").matches;

export default function HomeFeaturedPost2029({ state }) {
  const { post, loading } = state;
  const [open, setOpen] = useState(wide);
  if (loading) return <section className="h29-launch-card h29-featured h29-skel" aria-hidden="true" data-home-featured="loading" />;
  if (!post) return null;
  return <section className="h29-launch-card h29-featured" aria-label="תיעוד מוצג" data-home-featured={post.id}>
    <div className="h29-featured-main">
      {post.video
        ? <video className="h29-featured-poster is-video" controls preload="none" playsInline poster={post.video.poster} width="362" height="600" aria-label={`${post.title}. ${post.video.credit}`}>
          <source src={post.video.src} type="video/mp4" />
        </video>
        : post.poster ? <img className="h29-featured-poster" src={post.poster} alt="" width="640" height="360" decoding="async" /> : <span className="h29-featured-poster is-empty" aria-hidden="true">▶</span>}
      <div className="h29-featured-head">
        <Link className="h29-featured-title" to={post.href}>{post.title}</Link>
        {post.video ? <small className="h29-featured-credit">{post.video.credit}</small> : null}
        <div className="h29-featured-message" data-home-featured-message="true">
          <b>{post.messageTitle}</b>
          {post.message.map(line => <p key={line}>{line}</p>)}
        </div>
      </div>
    </div>
    <details className="h29-featured-more" open={open} onToggle={event => setOpen(event.currentTarget.open)} data-home-featured-more="true">
      <summary>העץ, המספרים והחיבורים</summary>
      <p className="h29-featured-note" data-home-featured-note="true">{post.note}</p>
      <div className="h29-featured-numbers" role="group" aria-label={post.numbersTitle}>
        <small>{post.numbersTitle}</small>
        <ul>{post.numbers.map(item => <li key={`${item.value}-${item.label}`}><b>{item.value}</b><span>{item.label}</span></li>)}</ul>
      </div>
      <div className="h29-featured-connections" role="group" aria-label={post.connectionsTitle} data-home-featured-connections="true">
        <small>{post.connectionsTitle}</small>
        <ul>{post.connections.map(item => <li key={`${item.value}-${item.phrase}`}><Link to={`/2029/number/${item.value}`}><b>{item.value}</b><span>{item.phrase}</span></Link></li>)}</ul>
        <em>{post.connectionsFootnote}</em>
      </div>
    </details>
  </section>;
}
