import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useResearch } from "../lib/research/ResearchProvider.jsx";
import { contextMapReaders } from "../lib/research/contextMapReaders2029.js";
import Sod2029Shell, { FrameState } from "../components/experience2029/Sod2029Shell.jsx";
import { getPostsFromSupabase } from "../lib/supabase.js";
import { applySeo } from "../lib/seo.js";
import PostIndexCard from "../components/experience2029/PostIndexCard2029.jsx";
import "./posts2029.css";

export default function Posts2029Page() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const research = useResearch();
  const requestedPage = Number(searchParams.get("page") || 1);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 && requestedPage <= 10000 ? requestedPage : 1;
  const [state, setState] = useState({ page, loading: true, posts: [], total: 0, error: null });

  useEffect(() => {
    applySeo({
      title: "פוסטים · SOD1820",
      description: "אינדקס הפוסטים של SOD1820.",
      path: page > 1 ? `/posts?page=${page}` : "/posts",
      noindex: false,
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

  // Exact return: leaving a card's context map writes this list position as returnTo in the existing Context.
  const openFromContextMap = (post, item) => {
    if (!item?.href) return;
    const origin = `${window.location.pathname}${window.location.search}#post-card-${post.id}`;
    research.updateResearchContext?.({
      subject: { id: item.id, type: item.type, label: item.label, href: item.href },
      returnTo: { href: origin, label: post.title, subject: { id: String(post.id), type: "post", label: post.title, href: origin } },
    });
    navigate(item.href);
  };
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
          {posts.map((post, index) => <PostIndexCard key={post.id || post.slug} post={post} index={index} mapReaders={contextMapReaders} onMapOpen={openFromContextMap} />)}
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
