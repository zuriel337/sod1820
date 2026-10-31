import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Sod2029Shell, { FrameState } from "../components/experience2029/Sod2029Shell.jsx";
import { fetchPostsCatalog2029, postClassification2029, postsCatalogScope2029 } from "../lib/research/postsCatalog2029Projection.js";
import { applySeo } from "../lib/seo.js";
import { stripHtml } from "../lib/format.js";
import { bilingualDateLabel } from "../lib/relativeTime2029.js";
import PostCategories2029 from "../components/experience2029/PostCategories2029.jsx";
import { humanContentTitle } from "../lib/presentation/contentTitle.js";
import { fetchContentSeriesCatalog2029 } from "../lib/research/contentSeries2029Projection.js";
import { POST_BACKGROUND_ASSETS_2029 } from "../lib/research/postBackground2029.js";
import "./posts2029.css";

function SeriesEntrances2029({ activeKey }) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ loading: true, series: [], error: false });
  useEffect(() => {
    let live = true;
    setState({ loading: true, series: [], error: false });
    // Existing anonymous series reader: one metadata row per series, no bodies,
    // Home-only exclusion, new membership list or media scan on library entry.
    fetchContentSeriesCatalog2029({ limitPerSeries: 1, homeOnly: false })
      .then(({ series }) => { if (live) setState({ loading: false, series, error: false }); })
      .catch(() => { if (live) setState({ loading: false, series: [], error: true }); });
    return () => { live = false; };
  }, [attempt]);

  return <section className="sod29-posts-series" aria-labelledby="posts-series-title" aria-busy={state.loading}>
    <h2 id="posts-series-title">לגלות דרך הסדרות</h2>
    {state.loading ? <p role="status">טוען את הסדרות…</p> : null}
    {state.error ? <div className="sod29-posts-series-error" role="status">
      <p>הסדרות לא נטענו. אפשר להמשיך לקרוא את הפוסטים.</p>
      <button type="button" onClick={() => setAttempt(value => value + 1)}>לטעון שוב את הסדרות</button>
    </div> : null}
    {state.series.length ? <nav className="sod29-posts-series-grid" aria-label="סדרות הפוסטים">
      {state.series.map(series => {
        const image = series.items[0]?.imageUrl;
        return <Link key={series.key} className="sod29-posts-series-card"
          to={`/2029/posts?series=${encodeURIComponent(series.key)}`} aria-current={activeKey === series.key ? "page" : undefined}>
          <div className="sod29-posts-series-image" aria-hidden="true" data-series-cover={image ? "post" : "illustration"}>
            <span>✦</span>
            {image || POST_BACKGROUND_ASSETS_2029[series.key] ? <img src={image || POST_BACKGROUND_ASSETS_2029[series.key].mobile} alt="" width="360" height="225" loading="eager" decoding="async" onError={event => { event.currentTarget.hidden = true; }} /> : null}
          </div>
          <div className="sod29-posts-series-copy">
            <h3>{series.label}</h3>
            {series.publisherLabel ? <p>מפרסם: {series.publisherLabel}</p> : series.writerLabel ? <p>מאת {series.writerLabel}</p> : null}
            <span>לעיון בסדרה <span aria-hidden="true">←</span></span>
          </div>
        </Link>;
      })}
    </nav> : null}
  </section>;
}

function PostIndexCard({ post, index }) {
  const title = humanContentTitle(post?.title, { max: 0 });
  const excerpt = stripHtml(post?.excerpt || post?.content || "").slice(0, 180);
  const image = post?.thumb_url || post?.image_url || null;
  const { credit } = postClassification2029(post);

  return <article
    className="sod29-post-index-card"
    data-experience-capability="post-index-card"
    style={{ "--post-order": index }}
  >
    <Link className="sod29-post-index-card-link" to={"/post/" + encodeURIComponent(post.slug)}>
      <div
        className={"sod29-post-index-visual" + (image ? " has-image" : "")}
        aria-hidden="true"
      >
        <span className="sod29-post-index-cover-fallback">✦</span>
        {image ? <img className="sod29-post-index-cover" src={image} alt="" loading="lazy" decoding="async" width="640" height="400" onError={event => { event.currentTarget.hidden = true; }} /> : null}
      </div>

      <div className="sod29-post-index-copy">
        <h2>{title || "פוסט"}</h2>
        {excerpt ? <p>{excerpt}</p> : null}
        <div className="sod29-post-index-meta">
          {credit ? <span>{credit.prefix}: {credit.name}</span> : null}
          <span>{post?.modified ? "עודכן " : "פורסם "}{bilingualDateLabel(post?.modified || post?.date, "תאריך לא צוין")}</span>
          <PostCategories2029 post={post} max={2} compact nested />
        </div>
        <span className="sod29-post-index-open">פתח את הפוסט <b aria-hidden="true">←</b></span>
      </div>
    </Link>
  </article>;
}

export default function Posts2029Page() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [attempt, setAttempt] = useState(0);
  const scope = postsCatalogScope2029(searchParams);
  const title = scope.kind === "all" ? "פוסטים" : scope.label;
  const scopeKey = JSON.stringify([scope.kind, scope.key]);
  const requestedPage = Number(searchParams.get("page") || 1);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 && requestedPage <= 10000 ? requestedPage : 1;
  const [state, setState] = useState({ page, scopeKey, loading: true, posts: [], total: null, error: null });

  useEffect(() => {
    applySeo({
      title: `${scope.label} · SOD1820 2029`,
      description: "אינדקס הפוסטים של SOD1820.",
      path: "/2029/posts",
      noindex: true,
    });

    let live = true;
    setState({ page, scopeKey, loading: true, posts: [], total: null, error: null });
    fetchPostsCatalog2029({ scope, page })
      .then(({ posts, total }) => {
        if (!live) return;
        setState({ page, scopeKey, loading: false, posts, total, error: null });
      })
      .catch((error) => {
        if (!live) return;
        const message = error?.code === "PGRST103" ? "העמוד הזה נמצא מעבר לפוסטים הזמינים." : error?.message || "טעינת הפוסטים נכשלה";
        setState({ page, scopeKey, loading: false, posts: [], total: null, error: message });
      });

    return () => { live = false; };
  }, [page, scopeKey, attempt]);

  const pages = Math.max(1, Math.ceil(state.total / 24));
  const sameScope = state.page === page && state.scopeKey === scopeKey;
  const posts = sameScope ? state.posts : [];
  const loading = state.loading || !sameScope;
  const error = sameScope ? state.error : null;
  const goToPage = (nextPage) => {
    const next = new URLSearchParams(searchParams);
    if (nextPage === 1) next.delete("page");
    else next.set("page", String(nextPage));
    setSearchParams(next);
    document.getElementById("posts-catalog")?.scrollIntoView({ block: "start", behavior: "instant" });
  };

  return <Sod2029Shell surface="post" title={title} introVariant="none" symbol="✦" status="פוסטים">
    <main className="sod29-posts-index" data-experience-surface="posts-index">
      <header className="sod29-posts-index-hero" data-experience-capability="posts-index-hero">
        {scope.kind !== "all" ? <Link className="sod29-posts-index-back" to="/2029/posts">לכל הפוסטים <span aria-hidden="true">←</span></Link> : null}
        <div className="sod29-posts-index-hero-grid">
          <div>
            <h1>{title}</h1>
            {scope.kind === "all" ? <p className="sod29-posts-index-intro">סיפורים, רמזים וחיבורים שמעוררים התבוננות</p> : null}
            {scope.compatibilityNote ? <p>{scope.compatibilityNote} {scope.seriesLink ? <Link to={scope.seriesLink.href}>{scope.seriesLink.label} ←</Link> : null}</p> : null}
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

      {scope.kind === "all" || scope.kind === "series" ? <SeriesEntrances2029 activeKey={scope.kind === "series" ? scope.key : null} /> : null}

      {loading ? <FrameState kind="loading" title="פותח את הפוסטים">טוען את המקורות הציבוריים הקיימים.</FrameState> : null}
      {error ? <FrameState kind="error" title="לא הצלחתי לפתוח את הפוסטים">
        <p>{error}</p>
        <button type="button" onClick={() => setAttempt(value => value + 1)}>ניסיון טעינה נוסף</button>
        {page > 1 ? <button type="button" onClick={() => goToPage(1)}>חזרה לפוסטים האחרונים</button> : null}
      </FrameState> : null}
      {!loading && !error && !posts.length
        ? <FrameState kind="empty" title="אין פוסטים בעמוד הזה">
          {page > 1 ? <button type="button" onClick={() => goToPage(1)}>חזרה לפוסטים האחרונים</button> : "אין כרגע מקורות זמינים להצגה."}
        </FrameState>
        : null}

      {posts.length ? <section id="posts-catalog" className="sod29-posts-index-stage" aria-label="פוסטים" data-posts-page={page}>
        <div className="sod29-posts-index-stage-head">
          <h2>{scope.kind === "all" ? "כל הפוסטים" : "הפוסטים בבחירה"}</h2>
          <span><bdi className="sod29-posts-numeric">{state.total}</bdi> פוסטים · עמוד <bdi className="sod29-posts-numeric">{page}</bdi> מתוך <bdi className="sod29-posts-numeric">{pages}</bdi></span>
          <small>הפוסטים האחרונים · לפי עדכון הפוסט</small>
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
