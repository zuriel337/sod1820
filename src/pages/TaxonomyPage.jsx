import React, { useState, useEffect, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { C, F, calcGem } from "../theme.js";
import { getPostsFromSupabase, adaptPost } from "../lib/supabase.js";
import { stripHtml, formatDateHe, timeAgoHe, fromSlug } from "../lib/format.js";
import { applySeo } from "../lib/seo.js";
import { openNumberDrawer } from "../lib/numberDrawer.js";

// ===== דף תגית / קטגוריה — בעיצוב האתר (זהב מלכותי), "טען עוד" במקום עימוד =====
// כל פוסט מקושר לדף הפוסט; גימטריית השם מקושרת לדף הישות + פותחת את מגירת המספר.

const PER = 12;

// כרטיס פוסט — סגנון זהב, תואם לשערים/רצועת הפוסטים בעמוד הבית.
function PostCard({ p, i }) {
  const image = p._embedded?.["wp:featuredmedia"]?.[0]?.source_url ?? null;
  const title = stripHtml(p.title?.rendered ?? "");
  const excerpt = stripHtml(p.excerpt?.rendered ?? "").slice(0, 120);
  const date = timeAgoHe(p.modified || p.date);
  const gem = calcGem(title);
  return (
    <Link to={`/${p.slug}`} className="tax-card" style={{ animationDelay: `${(i % PER) * 50}ms` }}>
      <div className="tax-thumb" style={{
        background: image ? `center/cover no-repeat url(${image})` : `linear-gradient(135deg, ${C.goldDeep}, ${C.faint})`,
      }}>
        {!image && <span className="tax-thumb-mark">✦</span>}
        <span className="tax-thumb-holo" />
        {gem > 0 && <span className="tax-gem" title={`גימטריה: ${gem}`}>ג׳ {gem}</span>}
      </div>
      <div className="tax-body">
        <div className="tax-name">{title}</div>
        {excerpt && <div className="tax-excerpt">{excerpt}…</div>}
        <div className="tax-meta">
          <span title={formatDateHe(p.modified || p.date)}>{date}</span>
          <span aria-hidden>←</span>
        </div>
      </div>
    </Link>
  );
}

function TaxonomyView({ kind }) {
  const { slug } = useParams();
  const name = fromSlug(slug);
  const isTag = kind === "tag";
  const gem = calcGem(name);

  const [posts, setPosts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const label = isTag ? "תגית" : "קטגוריה";
    applySeo({
      title: `${label}: ${name}`,
      description: `כל הפוסטים ב${label} "${name}" באתר SOD1820 — גימטריה, צופן ותיעוד בשפת המספרים.`,
      path: `/${kind}/${slug}`,
    });
    setPosts([]); setTotal(0); setPage(1); setLoading(true); setError("");
  }, [slug, name, kind, isTag]);

  const load = useCallback((p) => {
    setLoading(true);
    const args = { limit: PER, page: p, orderBy: "date" };
    if (isTag) args.tag = name; else args.category = name;
    getPostsFromSupabase(args)
      .then(({ posts: rows, total }) => {
        setPosts(prev => p === 1 ? rows.map(adaptPost) : [...prev, ...rows.map(adaptPost)]);
        setTotal(total);
        setLoading(false);
      })
      .catch(err => { setError(err.message || "שגיאה בטעינה"); setLoading(false); });
  }, [isTag, name]);

  useEffect(() => { load(page); }, [load, page]);

  const hasMore = posts.length < total;
  const eyebrow = isTag ? "תגית" : "קטגוריה";

  return (
    <div style={{ direction: "rtl", maxWidth: 1280, margin: "0 auto", padding: "48px 18px 90px", position: "relative", zIndex: 1 }}>
      {/* כותרת */}
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 12, letterSpacing: 4, textTransform: "uppercase", marginBottom: 8 }}>
          {isTag ? "🔖" : "🗂️"} {eyebrow}
        </div>
        <h1 style={{ color: C.goldBright, fontFamily: F.regal, fontSize: "clamp(26px,5vw,44px)", fontWeight: 700, margin: 0, textShadow: "0 0 40px rgba(212,175,55,0.3)" }}>
          {name}
        </h1>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", alignItems: "center", flexWrap: "wrap", marginTop: 14 }}>
          {total > 0 && (
            <span style={{ color: C.muted, fontFamily: F.body, fontSize: 14 }}>{total.toLocaleString()} פוסטים</span>
          )}
          {gem > 0 && (
            <>
              <span style={{ color: C.border }}>·</span>
              <Link to={`/number/${gem}`} onClick={() => openNumberDrawer(gem)} style={{
                textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6,
                background: "rgba(212,175,55,0.1)", border: `1px solid ${C.borderGold}`, borderRadius: 999,
                padding: "4px 13px", color: C.goldLight, fontFamily: F.mono, fontSize: 13, fontWeight: 700,
              }}>גימטריה {gem} 🔢</Link>
            </>
          )}
        </div>
      </div>

      {error && <div style={{ textAlign: "center", color: C.crimsonLight, fontFamily: F.body, padding: 20 }}>{error}</div>}

      {posts.length === 0 && loading ? (
        <div style={{ textAlign: "center", color: C.muted, fontFamily: F.body, padding: 40 }}>טוען פוסטים…</div>
      ) : posts.length === 0 ? (
        <div style={{ textAlign: "center", color: C.muted, fontFamily: F.body, padding: 40 }}>אין פוסטים {isTag ? "בתגית" : "בקטגוריה"} זו עדיין.</div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 18 }}>
            {posts.map((p, i) => <PostCard key={`${p.slug}-${i}`} p={p} i={i} />)}
          </div>

          {hasMore && (
            <div style={{ textAlign: "center", marginTop: 36 }}>
              <button onClick={() => setPage(pp => pp + 1)} disabled={loading} style={{
                cursor: loading ? "default" : "pointer", background: "linear-gradient(135deg, rgba(212,175,55,0.16), rgba(8,5,2,0.4))",
                border: `1px solid ${C.borderGold}`, borderRadius: 999, color: C.goldBright,
                fontFamily: F.heading, fontWeight: 700, fontSize: 15, padding: "12px 38px", letterSpacing: 1,
                boxShadow: "0 8px 28px rgba(0,0,0,0.4)", opacity: loading ? 0.6 : 1,
              }}>
                {loading ? "טוען…" : `טען עוד · נותרו ${(total - posts.length).toLocaleString()}`}
              </button>
            </div>
          )}
        </>
      )}

      <div style={{ textAlign: "center", marginTop: 40 }}>
        <Link to="/post" style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 13, textDecoration: "none", letterSpacing: 2 }}>
          אל כל הפוסטים →
        </Link>
      </div>

      <style>{`
        .tax-card { display:flex; flex-direction:column; text-decoration:none; overflow:hidden;
          border:1px solid ${C.border}; border-radius:14px; background:linear-gradient(160deg, rgba(20,15,12,0.55), rgba(8,5,2,0.45));
          transition:border-color .18s, transform .18s, box-shadow .18s; animation:tax-in .5s ease both; }
        .tax-card:hover { border-color:${C.gold}; transform:translateY(-3px);
          box-shadow:0 14px 38px rgba(0,0,0,0.5), 0 0 22px rgba(212,175,55,0.16); }
        .tax-thumb { position:relative; aspect-ratio:16/10; display:flex; align-items:center; justify-content:center; }
        .tax-thumb-mark { color:${C.goldDim}; font-size:30px; opacity:.5; }
        .tax-thumb-holo { position:absolute; inset:0; background:linear-gradient(180deg, transparent 45%, rgba(5,4,0,0.85)); }
        .tax-gem { position:absolute; top:8px; right:8px; background:rgba(212,175,55,0.92); color:#1a0e00;
          font-family:${F.mono}; font-size:12px; font-weight:800; padding:2px 9px; border-radius:999px; z-index:2; }
        .tax-body { padding:13px 15px 15px; display:flex; flex-direction:column; gap:7px; flex:1; }
        .tax-name { color:${C.goldBright}; font-family:${F.regal}; font-size:16px; font-weight:700; line-height:1.4;
          display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
        .tax-excerpt { color:${C.muted}; font-family:${F.body}; font-size:13px; line-height:1.7;
          display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
        .tax-meta { display:flex; justify-content:space-between; align-items:center; margin-top:auto; padding-top:6px;
          color:${C.goldDim}; font-family:${F.heading}; font-size:11.5px; }
        @keyframes tax-in { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </div>
  );
}

export function TagPage() { return <TaxonomyView kind="tag" />; }
export function CategoryPage() { return <TaxonomyView kind="category" />; }
export default TaxonomyView;
