import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { C, F, calcGem } from "../theme.js";
import {
  getPostsFromSupabase, searchPosts, adaptPost,
  getDistinctCategoriesAndTags, getGematriaByValue,
} from "../lib/supabase.js";
import { stripHtml, formatDateHe, timeAgoHe } from "../lib/format.js";
import { openNumberDrawer } from "../lib/numberDrawer.js";

// ===== דף הפוסטים — עיצוב זהב מלכותי + חיפוש חכם מאוחד =====
// חיפוש חכם: מזהה לבד טקסט / מספר / ביטוי עברי→גימטריה.
// מיון (חדש/ישן/מדובר) · צ'יפים וגלולות לפילטרים · "טען עוד".

const PER = 12;
const TOP_CATS = 10;       // כמה גלולות קטגוריה להציג לפני "עוד"
const TOP_TAGS = 24;       // כמה תגיות בענן
const SORTS = [
  { key: "date_desc", label: "חדש", orderBy: "date", ascending: false },
  { key: "date_asc",  label: "ישן", orderBy: "date", ascending: true },
  { key: "comments",  label: "הכי מדובר", orderBy: "comment_count", ascending: false },
];

const isHebrew = s => /[א-ת]/.test(s);
const isNumeric = s => /^\d+$/.test(s.trim());

function PostCard({ p, i, view }) {
  const image = p._embedded?.["wp:featuredmedia"]?.[0]?.source_url ?? null;
  const title = stripHtml(p.title?.rendered ?? "");
  const excerpt = stripHtml(p.excerpt?.rendered ?? "").slice(0, view === "list" ? 200 : 120);
  const date = timeAgoHe(p.modified || p.date);
  const gem = calcGem(title);
  return (
    <Link to={`/${p.slug}`} className={`pp-card pp-card-${view}`} style={{ animationDelay: `${(i % PER) * 45}ms` }}>
      <div className="pp-thumb" style={{
        background: image ? `center/cover no-repeat url(${image})` : `linear-gradient(135deg, ${C.goldDeep}, ${C.faint})`,
      }}>
        {!image && <span className="pp-thumb-mark">✦</span>}
        <span className="pp-thumb-holo" />
        {gem > 0 && <span className="pp-gem" title={`גימטריה: ${gem}`}>ג׳ {gem}</span>}
      </div>
      <div className="pp-body">
        <div className="pp-name">{title}</div>
        {excerpt && <div className="pp-excerpt">{excerpt}…</div>}
        <div className="pp-meta">
          <span title={formatDateHe(p.modified || p.date)}>{date}</span>
          <span aria-hidden>←</span>
        </div>
      </div>
    </Link>
  );
}

export default function PostsPage() {
  // נתוני עזר
  const [cats, setCats] = useState([]);
  const [tags, setTags] = useState([]);

  // חיפוש / פילטרים / מיון / תצוגה
  const [query, setQuery] = useState("");
  const [byGematria, setByGematria] = useState(false); // האם לחפש לפי ערך הגימטריה
  const [filterCat, setFilterCat] = useState(null);
  const [filterTag, setFilterTag] = useState(null);
  const [filterYear, setFilterYear] = useState(null);
  const [sort, setSort] = useState("date_desc");
  const [view, setView] = useState("grid");
  const [showAllCats, setShowAllCats] = useState(false);
  const [showTags, setShowTags] = useState(false);

  // תוצאות
  const [posts, setPosts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [gemWords, setGemWords] = useState([]);

  const searchInput = useRef(null);
  const debounce = useRef(null);

  const q = query.trim();
  const searching = q.length > 0;
  const gemValue = isNumeric(q) ? parseInt(q, 10) : (isHebrew(q) ? calcGem(q) : null);
  const sortDef = SORTS.find(s => s.key === sort) || SORTS[0];

  // טעינת קטגוריות ותגיות פעם אחת
  useEffect(() => {
    getDistinctCategoriesAndTags()
      .then(({ categories, tags }) => { setCats(categories); setTags(tags); })
      .catch(() => {});
  }, []);

  // קיצור מקלדת "/" למיקוד החיפוש
  useEffect(() => {
    const h = e => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault(); searchInput.current?.focus();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  // טעינת עמוד (גלישה רגילה — לא בחיפוש)
  const loadBrowse = useCallback((p) => {
    setLoading(true); setError("");
    getPostsFromSupabase({
      limit: PER, page: p, orderBy: sortDef.orderBy, ascending: sortDef.ascending,
      category: filterCat, tag: filterTag, year: filterYear,
    })
      .then(({ posts: rows, total }) => {
        setPosts(prev => p === 1 ? rows.map(adaptPost) : [...prev, ...rows.map(adaptPost)]);
        setTotal(total); setLoading(false);
      })
      .catch(err => { setError(err.message || "שגיאה בטעינה"); setLoading(false); });
  }, [sortDef.orderBy, sortDef.ascending, filterCat, filterTag, filterYear]);

  // איפוס עמוד כשמשתנים פילטר/מיון (במצב גלישה)
  useEffect(() => { if (!searching) setPage(1); }, [sort, filterCat, filterTag, filterYear, searching]);

  // אפקט גלישה
  useEffect(() => {
    if (searching) return;
    loadBrowse(page);
  }, [searching, page, loadBrowse]);

  // אפקט חיפוש (debounce)
  useEffect(() => {
    if (!searching) { setGemWords([]); return; }
    clearTimeout(debounce.current);
    setLoading(true); setError("");
    debounce.current = setTimeout(async () => {
      try {
        const term = byGematria && gemValue != null ? String(gemValue) : q;
        const [rows, words] = await Promise.all([
          searchPosts(term, { category: filterCat, tag: filterTag, year: filterYear, limit: 48 }),
          gemValue != null ? getGematriaByValue(gemValue) : Promise.resolve([]),
        ]);
        let list = rows.map(adaptPost);
        // מיון צד-לקוח לתוצאות חיפוש (לפי תאריך)
        if (sort === "date_asc") list = [...list].sort((a, b) => new Date(a.date) - new Date(b.date));
        else if (sort === "date_desc") list = [...list].sort((a, b) => new Date(b.date) - new Date(a.date));
        setPosts(list); setTotal(list.length); setGemWords(words || []); setLoading(false);
      } catch (err) { setError(err.message || "שגיאה בחיפוש"); setLoading(false); }
    }, 320);
    return () => clearTimeout(debounce.current);
  }, [searching, q, byGematria, gemValue, filterCat, filterTag, filterYear, sort]);

  function clearAll() {
    setQuery(""); setByGematria(false);
    setFilterCat(null); setFilterTag(null); setFilterYear(null);
    setPage(1);
  }
  function toggleCat(c) { setByGematria(false); setFilterCat(prev => prev === c ? null : c); }
  function toggleTag(t) { setByGematria(false); setFilterTag(prev => prev === t ? null : t); }
  function toggleYear(y) { setFilterYear(prev => prev === y ? null : y); }

  const hasFilter = q || filterCat || filterTag || filterYear;
  const hasMore = !searching && posts.length < total;
  const years = Array.from({ length: 8 }, (_, i) => new Date().getFullYear() - i);
  const shownCats = showAllCats ? cats : cats.slice(0, TOP_CATS);

  return (
    <div style={{ direction: "rtl", maxWidth: 1280, margin: "0 auto", padding: "48px 18px 90px", position: "relative", zIndex: 1 }}>
      {/* כותרת */}
      <div style={{ textAlign: "center", marginBottom: 26 }}>
        <div style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 12, letterSpacing: 4, textTransform: "uppercase", marginBottom: 8 }}>
          📖 פוסטים
        </div>
        <h1 style={{ color: C.goldBright, fontFamily: F.regal, fontSize: "clamp(26px,5vw,44px)", fontWeight: 700, margin: 0, textShadow: "0 0 40px rgba(212,175,55,0.3)" }}>
          תובנות ותגליות
        </h1>
        <p style={{ color: C.muted, fontFamily: F.body, fontSize: 15, marginTop: 10 }}>
          חיפוש חכם — טקסט, מספר או גימטריה. הקלידו ונחשוף את הרמזים.
        </p>
      </div>

      {/* ── מרכז החיפוש ── */}
      <div className="pp-panel">
        {/* שורת חיפוש */}
        <div className="pp-search">
          <span className="pp-search-ico" aria-hidden>🔎</span>
          <input
            ref={searchInput}
            value={query}
            onChange={e => { setByGematria(false); setQuery(e.target.value); }}
            placeholder="חיפוש בכותרת ובתוכן · מילה · מספר · גימטריה…   (הקלד / למיקוד)"
            aria-label="חיפוש פוסטים"
          />
          {query && <button className="pp-clear-x" onClick={() => { setQuery(""); setByGematria(false); }} aria-label="נקה">×</button>}
        </div>

        {/* רמז גימטריה חכם */}
        {searching && gemValue != null && (
          <div className="pp-gem-hint">
            {isNumeric(q) ? (
              <span>🔢 מספר <b>{gemValue}</b></span>
            ) : (
              <span>✡ גימטריה של «{q}» = <b>{gemValue}</b></span>
            )}
            <button className={`pp-gem-toggle${byGematria ? " on" : ""}`} onClick={() => setByGematria(v => !v)}>
              {byGematria ? "מחפש לפי הערך ✓" : "חפש פוסטים עם הערך"}
            </button>
            <button className="pp-gem-drawer" onClick={() => openNumberDrawer(String(gemValue))} title="פתח מגירת מספר">פתח מגירה 🔢</button>
            {gemWords.length > 0 && (
              <span className="pp-gem-words">· מילים שוות־ערך: {gemWords.slice(0, 6).map(w => w.phrase).join(" · ")}</span>
            )}
          </div>
        )}

        {/* מיון + תצוגה */}
        <div className="pp-row pp-controls">
          <div className="pp-seg" role="group" aria-label="מיון">
            {SORTS.map(s => (
              <button key={s.key} className={`pp-pill${sort === s.key ? " active" : ""}`} onClick={() => setSort(s.key)}>{s.label}</button>
            ))}
          </div>
          <div className="pp-seg" role="group" aria-label="תצוגה">
            <button className={`pp-pill pp-icon${view === "grid" ? " active" : ""}`} onClick={() => setView("grid")} title="רשת" aria-label="תצוגת רשת">▦</button>
            <button className={`pp-pill pp-icon${view === "list" ? " active" : ""}`} onClick={() => setView("list")} title="רשימה" aria-label="תצוגת רשימה">▤</button>
          </div>
        </div>

        {/* גלולות קטגוריה */}
        {cats.length > 0 && (
          <div className="pp-row pp-pills">
            {shownCats.map(c => (
              <button key={c} className={`pp-pill${filterCat === c ? " active" : ""}`} onClick={() => toggleCat(c)}>{c}</button>
            ))}
            {cats.length > TOP_CATS && (
              <button className="pp-pill pp-more" onClick={() => setShowAllCats(v => !v)}>
                {showAllCats ? "פחות ▲" : `עוד קטגוריות ▾`}
              </button>
            )}
          </div>
        )}

        {/* שנים */}
        <div className="pp-row pp-pills pp-years">
          <span className="pp-row-label">📅</span>
          {years.map(y => (
            <button key={y} className={`pp-pill pp-pill-sm${filterYear === y ? " active" : ""}`} onClick={() => toggleYear(y)}>{y}</button>
          ))}
        </div>

        {/* תגיות (נפתח) */}
        {tags.length > 0 && (
          <div className="pp-row pp-tags-wrap">
            <button className="pp-pill pp-more" onClick={() => setShowTags(v => !v)}>
              🏷 תגיות {showTags ? "▲" : "▾"}
            </button>
            {showTags && (
              <div className="pp-pills pp-tag-cloud">
                {tags.slice(0, TOP_TAGS).map(t => (
                  <button key={t} className={`pp-pill pp-pill-sm${filterTag === t ? " active" : ""}`} onClick={() => toggleTag(t)}>{t}</button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* צ'יפים פעילים */}
        {hasFilter && (
          <div className="pp-row pp-chips">
            {q && <span className="pp-chip">חיפוש: {q}<button onClick={() => { setQuery(""); setByGematria(false); }} aria-label="הסר">×</button></span>}
            {filterCat && <span className="pp-chip">קטגוריה: {filterCat}<button onClick={() => setFilterCat(null)} aria-label="הסר">×</button></span>}
            {filterTag && <span className="pp-chip">תגית: {filterTag}<button onClick={() => setFilterTag(null)} aria-label="הסר">×</button></span>}
            {filterYear && <span className="pp-chip">שנה: {filterYear}<button onClick={() => setFilterYear(null)} aria-label="הסר">×</button></span>}
            <button className="pp-clear-all" onClick={clearAll}>נקה הכל ×</button>
          </div>
        )}
      </div>

      {/* מצב/סטטוס */}
      {!loading && !error && (
        <div className="pp-status">
          {searching
            ? `${posts.length.toLocaleString()} תוצאות${posts.length >= 48 ? "+" : ""}`
            : total > 0 ? `${total.toLocaleString()} פוסטים` : ""}
        </div>
      )}

      {error && <div style={{ textAlign: "center", color: C.crimsonLight, fontFamily: F.body, padding: 20 }}>{error}</div>}

      {/* תוצאות */}
      {posts.length === 0 && loading ? (
        <div className="pp-empty">טוען פוסטים…</div>
      ) : posts.length === 0 ? (
        <div className="pp-empty">לא נמצאו פוסטים{hasFilter ? " — נסו לשנות את החיפוש או הפילטרים" : ""}.</div>
      ) : (
        <>
          <div className={view === "grid" ? "pp-grid" : "pp-listcol"}>
            {posts.map((p, i) => <PostCard key={`${p.slug}-${i}`} p={p} i={i} view={view} />)}
          </div>
          {hasMore && (
            <div style={{ textAlign: "center", marginTop: 36 }}>
              <button onClick={() => setPage(pp => pp + 1)} disabled={loading} className="pp-loadmore">
                {loading ? "טוען…" : `טען עוד · נותרו ${(total - posts.length).toLocaleString()}`}
              </button>
            </div>
          )}
        </>
      )}

      <style>{`
        .pp-panel { max-width: 920px; margin: 0 auto 30px; padding: 18px 18px 14px;
          border: 1px solid ${C.borderGold}; border-radius: 18px;
          background: linear-gradient(165deg, rgba(20,15,12,0.72), rgba(8,5,2,0.55));
          backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
          box-shadow: 0 16px 50px rgba(0,0,0,0.5); display: flex; flex-direction: column; gap: 12px; }

        .pp-search { display: flex; align-items: center; gap: 8px; background: rgba(8,5,2,0.6);
          border: 1px solid ${C.border}; border-radius: 999px; padding: 6px 14px; transition: border-color .2s, box-shadow .2s; }
        .pp-search:focus-within { border-color: ${C.gold}; box-shadow: 0 0 20px rgba(212,175,55,0.2); }
        .pp-search-ico { font-size: 16px; opacity: 0.85; }
        .pp-search input { flex: 1; background: none; border: none; outline: none; color: ${C.goldLight};
          font-family: ${F.body}; font-size: 16px; padding: 8px 2px; min-width: 0; }
        .pp-search input::placeholder { color: ${C.muted}; opacity: 0.8; }
        .pp-clear-x { background: none; border: none; color: ${C.muted}; font-size: 22px; cursor: pointer; line-height: 1; padding: 0 4px; }
        .pp-clear-x:hover { color: ${C.goldBright}; }

        .pp-gem-hint { display: flex; flex-wrap: wrap; align-items: center; gap: 10px;
          background: linear-gradient(135deg, rgba(122,19,32,0.28), rgba(61,31,92,0.2));
          border: 1px solid ${C.borderGold}; border-radius: 12px; padding: 9px 14px;
          color: #d8c7ef; font-family: ${F.body}; font-size: 13.5px; }
        .pp-gem-hint b { color: ${C.goldBright}; font-size: 16px; }
        .pp-gem-toggle, .pp-gem-drawer { cursor: pointer; border-radius: 999px; font-family: ${F.heading};
          font-size: 12px; font-weight: 700; padding: 5px 12px; border: 1px solid ${C.borderGold};
          background: rgba(212,175,55,0.1); color: ${C.goldLight}; transition: all .18s; }
        .pp-gem-toggle:hover, .pp-gem-drawer:hover { background: ${C.gold}; color: #1a0e00; }
        .pp-gem-toggle.on { background: ${C.gold}; color: #1a0e00; }
        .pp-gem-words { color: ${C.muted}; font-size: 12px; }

        .pp-row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
        .pp-controls { justify-content: space-between; }
        .pp-row-label { color: ${C.goldDim}; font-size: 14px; }
        .pp-seg { display: inline-flex; gap: 6px; background: rgba(8,5,2,0.4); border: 1px solid ${C.border};
          border-radius: 999px; padding: 4px; }
        .pp-pills { row-gap: 8px; }

        .pp-pill { cursor: pointer; background: rgba(20,15,12,0.6); border: 1px solid ${C.border};
          color: ${C.goldLight}; font-family: ${F.heading}; font-size: 13px; font-weight: 700;
          padding: 7px 14px; border-radius: 999px; transition: border-color .15s, background .15s, color .15s, transform .12s; }
        .pp-pill:hover { border-color: ${C.gold}; background: ${C.surface}; transform: translateY(-1px); }
        .pp-pill.active { background: linear-gradient(135deg, ${C.gold}, ${C.goldLight}); color: #1a0e00; border-color: ${C.gold};
          box-shadow: 0 4px 16px rgba(212,175,55,0.3); }
        .pp-seg .pp-pill { border: none; background: transparent; padding: 6px 14px; }
        .pp-seg .pp-pill.active { box-shadow: none; }
        .pp-pill-sm { font-size: 12px; padding: 5px 11px; font-family: ${F.mono}; }
        .pp-pill.pp-icon { font-size: 15px; padding: 6px 12px; }
        .pp-pill.pp-more { background: transparent; border-style: dashed; color: ${C.goldDim}; }
        .pp-years { gap: 6px; }
        .pp-tags-wrap { flex-direction: column; align-items: flex-start; gap: 10px; }
        .pp-tag-cloud { max-height: 168px; overflow-y: auto; padding: 2px; }

        .pp-chips { padding-top: 4px; border-top: 1px solid ${C.faint}; }
        .pp-chip { display: inline-flex; align-items: center; gap: 6px; background: rgba(212,175,55,0.12);
          border: 1px solid ${C.borderGold}; border-radius: 999px; padding: 4px 6px 4px 12px;
          color: ${C.goldLight}; font-family: ${F.heading}; font-size: 12px; }
        .pp-chip button { background: none; border: none; color: ${C.goldDim}; cursor: pointer; font-size: 16px; line-height: 1; }
        .pp-chip button:hover { color: ${C.goldBright}; }
        .pp-clear-all { background: none; border: 1px solid ${C.crimsonLight}; color: #d98a92;
          border-radius: 999px; padding: 5px 14px; cursor: pointer; font-family: ${F.heading}; font-size: 12px; }
        .pp-clear-all:hover { background: rgba(160,31,46,0.2); }

        .pp-status { text-align: center; color: ${C.muted}; font-family: ${F.heading}; font-size: 13px; margin: 6px 0 22px; }
        .pp-empty { text-align: center; color: ${C.muted}; font-family: ${F.body}; padding: 56px 20px; font-size: 15px; }

        .pp-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 18px; }
        .pp-listcol { display: flex; flex-direction: column; gap: 14px; max-width: 860px; margin: 0 auto; }

        .pp-card { display: flex; flex-direction: column; text-decoration: none; overflow: hidden;
          border: 1px solid ${C.border}; border-radius: 14px;
          background: linear-gradient(160deg, rgba(20,15,12,0.55), rgba(8,5,2,0.45));
          transition: border-color .18s, transform .18s, box-shadow .18s; animation: pp-in .5s ease both; }
        .pp-card:hover { border-color: ${C.gold}; transform: translateY(-3px);
          box-shadow: 0 14px 38px rgba(0,0,0,0.5), 0 0 22px rgba(212,175,55,0.16); }
        .pp-thumb { position: relative; aspect-ratio: 16/10; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .pp-thumb-mark { color: ${C.goldDim}; font-size: 30px; opacity: .5; }
        .pp-thumb-holo { position: absolute; inset: 0; background: linear-gradient(180deg, transparent 45%, rgba(5,4,0,0.85)); }
        .pp-gem { position: absolute; top: 8px; right: 8px; background: rgba(212,175,55,0.92); color: #1a0e00;
          font-family: ${F.mono}; font-size: 12px; font-weight: 800; padding: 2px 9px; border-radius: 999px; z-index: 2; }
        .pp-body { padding: 13px 15px 15px; display: flex; flex-direction: column; gap: 7px; flex: 1; }
        .pp-name { color: ${C.goldBright}; font-family: ${F.regal}; font-size: 16px; font-weight: 700; line-height: 1.4;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .pp-excerpt { color: ${C.muted}; font-family: ${F.body}; font-size: 13px; line-height: 1.7;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .pp-meta { display: flex; justify-content: space-between; align-items: center; margin-top: auto; padding-top: 6px;
          color: ${C.goldDim}; font-family: ${F.heading}; font-size: 11.5px; }

        /* תצוגת רשימה — תמונה לצד טקסט */
        .pp-card-list { flex-direction: row; align-items: stretch; }
        .pp-card-list .pp-thumb { width: 200px; aspect-ratio: auto; flex-shrink: 0; }
        .pp-card-list .pp-name { -webkit-line-clamp: 1; }
        .pp-card-list .pp-excerpt { -webkit-line-clamp: 3; }
        @media (max-width: 560px) {
          .pp-card-list { flex-direction: column; }
          .pp-card-list .pp-thumb { width: auto; aspect-ratio: 16/10; }
        }

        .pp-loadmore { cursor: pointer; background: linear-gradient(135deg, rgba(212,175,55,0.16), rgba(8,5,2,0.4));
          border: 1px solid ${C.borderGold}; border-radius: 999px; color: ${C.goldBright};
          font-family: ${F.heading}; font-weight: 700; font-size: 15px; padding: 12px 38px; letter-spacing: 1;
          box-shadow: 0 8px 28px rgba(0,0,0,0.4); }
        .pp-loadmore:hover { background: linear-gradient(135deg, rgba(212,175,55,0.26), rgba(8,5,2,0.4)); }

        @keyframes pp-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @media (prefers-reduced-motion: reduce) { .pp-card { animation: none; } }
      `}</style>
    </div>
  );
}
