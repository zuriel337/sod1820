// The first Home card (ZURIEL 8.11.2026): the featured Post — its video, title and link — with the message beside it and the reality-tree note beneath;
// the numbers and connections are NOT on Home, they live inside the Post. The language follows public_language_revelation_geula_law (discovery/hint voice;
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

export default function HomeFeaturedPost2029({ state }) {
  const { post, loading } = state;
  if (loading) return <section className="h29-launch-card h29-featured h29-skel" aria-hidden="true" data-home-featured="loading" />;
  if (!post) return null;
  return <section className="h29-launch-card h29-featured" aria-label="תיעוד מוצג" data-home-featured={post.id}>
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
    {post.highlight ? <div className="h29-featured-spot" data-home-featured-spot={post.highlight.value}>
      <b className="h29-featured-spot-value">{post.highlight.value}</b>
      <div><small>{post.highlight.title}</small>
        {post.highlight.phrases.map(phrase => <p key={phrase}>{phrase} <span>= {post.highlight.value}</span></p>)}</div>
    </div> : null}
    <p className="h29-featured-note" data-home-featured-note="true">{post.note} <Link to={post.href}>{post.noteLink}</Link></p>
  </section>;
}
