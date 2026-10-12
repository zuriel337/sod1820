import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Sod2029Shell, { FrameState } from "../components/experience2029/Sod2029Shell.jsx";
import { getPostsFromSupabase } from "../lib/supabase.js";
import { applySeo } from "../lib/seo.js";
import { stripHtml } from "../lib/format.js";
import { bilingualDateLabel } from "../lib/relativeTime2029.js";
import PostCategories2029 from "../components/experience2029/PostCategories2029.jsx";
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
  const image = post?.thumb_url || post?.image_url || null;
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
      </div>

      <div className="sod29-post-index-copy">
        <div className="sod29-post-index-meta">
          {post.author ? <span>{post.author}</span> : null}
          <span>{post?.modified ? "עודכן " : "פורסם "}{bilingualDateLabel(post?.modified || post?.date, "תאריך לא צוין")}</span>
          <PostCategories2029 categories={categories} max={3} nested />
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
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedPage = Number(searchParams.get("page") || 1);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 && requestedPage <= 10000 ? requestedPage : 1;
  const [state, setState] = useState({ page, loading: true, posts: [], total: 0, error: null });

  useEffect(() => {
    applySeo({
      title: "פוסטים · SOD1820 2029",
      description: "אינדקס הפוסטים של SOD1820.",
      path: "/2029/posts",
      noindex: true,
    });

    let live = true;
    setState({ page, loading: true, posts: [], total: 0, error: null });
    getPostsFromSupabase({ limit: 24, page, orderBy: "modified", ascending: false, stableOrder: true })
      .then(({ posts, total }) => {
        if (!live) return;
        setState({ page, loading: false, posts: posts || [], total: total || 0, error: null });
      })
      .catch((error) => {
        if (!live) return;
        const message = error?.code === "PGRST103" ? "העמוד הזה נמצא מעבר לפוסטים הזמינים." : error?.message || "טעינת הפוסטים נכשלה";
        setState({ page, loading: false, posts: [], total: 0, error: message });
      });

    return () => { live = false; };
  }, [page]);

  const pages = Math.max(1, Math.ceil(state.total / 24));
  const posts = state.page === page ? state.posts : [];
  const loading = state.loading || state.page !== page;
  const error = state.page === page ? state.error : null;
  const goToPage = (nextPage) => {
    const next = new URLSearchParams(searchParams);
    if (nextPage === 1) next.delete("page");
    else next.set("page", String(nextPage));
    setSearchParams(next);
    document.getElementById("posts-catalog")?.scrollIntoView({ block: "start", behavior: "instant" });
  };

  return <Sod2029Shell surface="post" title="פוסטים" introVariant="none" symbol="✦" status="פוסטים">
    <main className="sod29-posts-index" data-experience-surface="posts-index">
      <header className="sod29-posts-index-hero" data-experience-capability="posts-index-hero">
        <div className="sod29-posts-index-eyebrow">אירועים · סיפורים · רמזים</div>
        <div className="sod29-posts-index-hero-grid">
          <div>
            <h1>הפוסטים</h1>
            <details className="sod29-post-details sod29-post-index-about">
              <summary>על הפוסטים <span aria-hidden="true">⌄</span></summary>
              <p>אירועים · סיפורים · רמזים</p>
              <p>
              סיפור אחד יכול לפתוח כמה כיווני גילוי: אנשים, מקומות, מספרים ומקורות.
              בוחרים חיבור וממשיכים ממנו.
              </p>
              <p>התצוגה כאן היא מבט על הפוסטים; התוכן נשאר של כותביו.</p>
            </details>
          </div>
        </div>
      </header>

      {loading ? <FrameState kind="loading" title="פותח את הפוסטים">טוען את המקורות הציבוריים הקיימים.</FrameState> : null}
      {error ? <FrameState kind="error" title="לא הצלחתי לפתוח את הפוסטים">
        <p>{error}</p>
        {page > 1 ? <button type="button" onClick={() => goToPage(1)}>חזרה לפוסטים האחרונים</button> : null}
      </FrameState> : null}
      {!loading && !error && !posts.length
        ? <FrameState kind="empty" title="אין פוסטים בעמוד הזה">
          {page > 1 ? <button type="button" onClick={() => goToPage(1)}>חזרה לפוסטים האחרונים</button> : "אין כרגע מקורות זמינים להצגה."}
        </FrameState>
        : null}

      {posts.length ? <section id="posts-catalog" className="sod29-posts-index-stage" aria-label="פוסטים" data-posts-page={page}>
        <div className="sod29-posts-index-stage-head">
          <span>{state.total ? `${state.total} פוסטים במקור` : "הפוסטים האחרונים"}</span>
          <small>עמוד {page} מתוך {pages} · לפי עדכון הפוסט</small>
        </div>
        <div className="sod29-posts-index-grid">
          {posts.map((post, index) => <PostIndexCard key={post.id || post.slug} post={post} index={index} />)}
        </div>
      </section> : null}
      {!loading && !error && posts.length ? <nav className="sod29-posts-pagination" aria-label="עמודי הפוסטים">
        <button type="button" disabled={page <= 1} onClick={() => goToPage(page - 1)}>פוסטים חדשים יותר</button>
        <span aria-live="polite">עמוד {page} מתוך {pages}</span>
        <button type="button" disabled={page >= pages} onClick={() => goToPage(page + 1)}>פוסטים קודמים</button>
      </nav> : null}
    </main>
  </Sod2029Shell>;
}
