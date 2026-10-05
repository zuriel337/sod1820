import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Sod2029Shell, { FrameState } from "../components/experience2029/Sod2029Shell.jsx";
import { getPostsFromSupabase } from "../lib/supabase.js";
import { applySeo } from "../lib/seo.js";
import { stripHtml, formatDateHe } from "../lib/format.js";
import { humanContentTitle } from "../lib/presentation/contentTitle.js";
import "./posts2029.css";

const numericSignals = (tags = []) => [...new Set(
  (Array.isArray(tags) ? tags : [])
    .map((tag) => String(tag || "").trim())
    .filter((tag) => /^\d{1,6}$/.test(tag))
)].slice(0, 4);

const isGoldenPost = (post) => Array.isArray(post?.tags)
  && post.tags.some((tag) => String(tag).includes("2029-golden"));

function PostIndexCard({ post, index }) {
  const title = humanContentTitle(post?.title, { max: 92 });
  const excerpt = stripHtml(post?.excerpt || post?.content || "").slice(0, 180);
  const numbers = numericSignals(post?.tags);
  const image = post?.image_url || null;
  const categories = (Array.isArray(post?.categories) ? post.categories : []).slice(0, 3);
  const golden = isGoldenPost(post);

  return <article
    className={"sod29-post-index-card" + (golden ? " is-golden" : "")}
    data-experience-capability="post-index-card"
    data-post-golden={golden ? "true" : "false"}
    style={{ "--post-order": index }}
  >
    <Link className="sod29-post-index-card-link" to={"/post/" + encodeURIComponent(post.slug)}>
      <div
        className={"sod29-post-index-visual" + (image ? " has-image" : "")}
        style={image ? { backgroundImage: `url("${image.replace(/"/g, "%22")}")` } : undefined}
        aria-hidden="true"
      >
        {!image ? <div className="sod29-post-index-number-field">
          {(numbers.length ? numbers : ["✦"]).map((value) => <span key={value}>{value}</span>)}
        </div> : null}
        <div className="sod29-post-index-visual-wash" />
        {golden ? <span className="sod29-post-index-golden-mark">מומלץ</span> : null}
      </div>

      <div className="sod29-post-index-copy">
        <div className="sod29-post-index-meta">
          <span>{formatDateHe(post?.modified || post?.date)}</span>
          {categories.map((category) => <span key={category}>{category}</span>)}
        </div>
        <h2>{title || "פוסט"}</h2>
        {excerpt ? <p>{excerpt}</p> : null}
        {numbers.length ? <div className="sod29-post-index-signals" aria-label="מספרים מרכזיים">
          {numbers.map((value) => <b key={value}>{value}</b>)}
        </div> : null}
        <span className="sod29-post-index-open">פתח את הפוסט <b aria-hidden="true">←</b></span>
      </div>
    </Link>
  </article>;
}

export default function Posts2029Page() {
  const [state, setState] = useState({ loading: true, posts: [], total: 0, error: null });

  useEffect(() => {
    applySeo({
      title: "פוסטים · SOD1820 2029",
      description: "אינדקס הפוסטים של SOD1820.",
      path: "/2029/posts",
      noindex: true,
    });

    let live = true;
    getPostsFromSupabase({ limit: 24, page: 1, orderBy: "modified", ascending: false })
      .then(({ posts, total }) => {
        if (!live) return;
        setState({ loading: false, posts: posts || [], total: total || 0, error: null });
      })
      .catch((error) => {
        if (!live) return;
        setState({ loading: false, posts: [], total: 0, error: error?.message || "טעינת הפוסטים נכשלה" });
      });

    return () => { live = false; };
  }, []);

  const goldenCount = useMemo(
    () => state.posts.filter(isGoldenPost).length,
    [state.posts],
  );

  return <Sod2029Shell surface="post" symbol="✦" status="Posts 2029 · GOLDEN">
    <main className="sod29-posts-index" data-experience-surface="posts-index">
      <header className="sod29-posts-index-hero" data-experience-capability="posts-index-hero">
        <div className="sod29-posts-index-eyebrow">עדכונים · סיפורים · מחקר חי</div>
        <div className="sod29-posts-index-hero-grid">
          <div>
            <h1>הפוסטים</h1>
            <p>
              כל פוסט הוא שער אחד לתוך אותה מציאות: המקור במרכז, המספרים והחיבורים סביבו,
              והדרך לעומק נשארת פתוחה בלי לערבב מקור עם פרשנות.
            </p>
          </div>
          <div className="sod29-posts-index-orbit" aria-label="פוסטים מובילים">
            <strong>{goldenCount || "—"}</strong>
            <span>פוסטים מובילים</span>
            <small>התצוגה כאן היא מבט על הפוסטים; התוכן נשאר של כותביו.</small>
          </div>
        </div>
      </header>

      {state.loading ? <FrameState kind="loading" title="פותח את הפוסטים">טוען את המקורות הציבוריים הקיימים.</FrameState> : null}
      {state.error ? <FrameState kind="error" title="לא הצלחתי לפתוח את הפוסטים">{state.error}</FrameState> : null}
      {!state.loading && !state.error && !state.posts.length
        ? <FrameState kind="empty" title="אין פוסטים להצגה">לא הומצא תוכן כדי למלא את המסך.</FrameState>
        : null}

      {state.posts.length ? <section className="sod29-posts-index-stage" aria-label="פוסטים">
        <div className="sod29-posts-index-stage-head">
          <span>{state.total ? `${state.total} פוסטים במקור` : "הפוסטים האחרונים"}</span>
          <small>הפוסטים האחרונים</small>
        </div>
        <div className="sod29-posts-index-grid">
          {state.posts.map((post, index) => <PostIndexCard key={post.id || post.slug} post={post} index={index} />)}
        </div>
      </section> : null}
    </main>
  </Sod2029Shell>;
}
