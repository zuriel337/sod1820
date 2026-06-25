import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { C, F, calcGem, isWarmNumber } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { useHotPostSlugs } from "../lib/hotPosts.js";
import {
  getPostsFromSupabase, searchPosts, adaptPost,
  getDistinctCategoriesAndTags, getGematriaByValue,
  getTagCounts, getGalleryNumberTags,
} from "../lib/supabase.js";
import { stripHtml, formatDateHe, timeAgoHe } from "../lib/format.js";
import { openNumberDrawer } from "../lib/numberDrawer.js";
import StickyAnchorAd from "../components/StickyAnchorAd.jsx";
import SideRailAd from "../components/SideRailAd.jsx";

// ===== דף הפוסטים — עיצוב זהב מלכותי + חיפוש חכם מאוחד =====
// חיפוש חכם: מזהה לבד טקסט / מספר / ביטוי עברי→גימטריה.
// מיון (חדש/ישן/מדובר) · צ'יפים וגלולות לפילטרים · "טען עוד".

const PER = 12;
const TOP_CATS = 10;       // כמה גלולות קטגוריה להציג לפני "עוד"
const TOP_TAGS = 14;       // כמה תגיות פופולריות להציג לפני "עוד"
const MAX_TAGS = 80;       // כמה תגיות בסך הכל לאחר הרחבה
const SORTS = [
  { key: "date_desc", label: "חדש", orderBy: "modified", ascending: false },
  { key: "date_asc",  label: "ישן", orderBy: "modified", ascending: true },
];

const isHebrew = s => /[א-ת]/.test(s);
const isNumeric = s => /^\d+$/.test(s.trim());
const shortDate = d => { try { return new Date(d).toLocaleDateString("he-IL"); } catch { return ""; } };

function PostCard({ p, i, view, hot }) {
  const P = usePalette();
  const image = p._embedded?.["wp:featuredmedia"]?.[0]?.source_url ?? null;
  const title = stripHtml(p.title?.rendered ?? "");
  const excerpt = stripHtml(p.excerpt?.rendered ?? "").slice(0, view === "list" ? 200 : 120);
  const created = shortDate(p.date);
  const updated = shortDate(p.modified || p.date);
  const wasUpdated = p.modified && p.modified !== p.date;
  const gem = calcGem(title);
  return (
    <Link to={`/${p.slug}`} className={`pp-card pp-card-${view}`} style={{ animationDelay: `${(i % PER) * 45}ms` }}>
      <div className="pp-thumb" style={{
        background: image ? `center/cover no-repeat url(${image})` : P.cardGrad,
      }}>
        {!image && <span className="pp-thumb-mark">✦</span>}
        <span className="pp-thumb-holo" />
        {hot && <span title="חם השבוע" style={{ position: "absolute", top: 8, insetInlineStart: 8, background: "rgba(0,0,0,0.55)", color: "#fff", fontSize: 13, borderRadius: 999, padding: "2px 7px" }}>🔥</span>}
        {isWarmNumber(gem) && <span className="pp-gem" title={`מספר חם: ${gem}`}>ג׳ {gem}</span>}
      </div>
      <div className="pp-body">
        <div className="pp-name">{title}</div>
        {excerpt && <div className="pp-excerpt">{excerpt}…</div>}
        <div className="pp-meta">
          <span className="pp-dates" title={`נוצר ${formatDateHe(p.date)} · עודכן ${formatDateHe(p.modified || p.date)}`}>
            <span>📅 {created}</span>
            <span style={{ color: wasUpdated ? P.accentText : P.inkSoft }}>· ✏️ {updated}</span>
          </span>
          <span aria-hidden>←</span>
        </div>
      </div>
    </Link>
  );
}

export default function PostsPage() {
  const P = usePalette();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  // נתוני עזר
  const [cats, setCats] = useState([]);
  const [tagList, setTagList] = useState([]);     // [{ tag, posts }] לפי פופולריות
  const [galleryNums, setGalleryNums] = useState([]); // [{ n, imgs, galleries }] מהגלריה

  // חיפוש / פילטרים / מיון / תצוגה
  const [query, setQuery] = useState("");
  const [byGematria, setByGematria] = useState(false); // האם לחפש לפי ערך הגימטריה
  const [filterCat, setFilterCat] = useState(null);
  const [filterTag, setFilterTag] = useState(null);
  const [filterYear, setFilterYear] = useState(null);
  const filterAuthor = searchParams.get("author") || null;
  const [sort, setSort] = useState("date_desc");
  const [view, setView] = useState("grid");
  const [showFilters, setShowFilters] = useState(false); // כל המסננים סגורים כברירת מחדל
  const [showAllCats, setShowAllCats] = useState(false);
  const [showTags, setShowTags] = useState(false);
  const [showNums, setShowNums] = useState(false);

  // תוצאות
  const [posts, setPosts] = useState([]);
  const hotSlugs = useHotPostSlugs();   // 🔥 פוסטים חמים השבוע (דגל בלבד)
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

  // טעינת קטגוריות, תגיות (לפי פופולריות) ותגיות-מספר מהגלריה — פעם אחת
  useEffect(() => {
    getDistinctCategoriesAndTags().then(({ categories }) => setCats(categories)).catch(() => {});
    getTagCounts({ limit: MAX_TAGS }).then(setTagList).catch(() => {});
    getGalleryNumberTags().then(setGalleryNums).catch(() => {});
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
      category: filterCat, tag: filterTag, year: filterYear, author: filterAuthor,
    })
      .then(({ posts: rows, total }) => {
        setPosts(prev => p === 1 ? rows.map(adaptPost) : [...prev, ...rows.map(adaptPost)]);
        setTotal(total); setLoading(false);
      })
      .catch(err => { setError(err.message || "שגיאה בטעינה"); setLoading(false); });
  }, [sortDef.orderBy, sortDef.ascending, filterCat, filterTag, filterYear, filterAuthor]);

  // איפוס עמוד כשמשתנים פילטר/מיון (במצב גלישה)
  useEffect(() => { if (!searching) setPage(1); }, [sort, filterCat, filterTag, filterYear, filterAuthor, searching]);

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
  // תגית-מספר פעילה? (למשל "16" או "14 = דוד") — גשר אל הגלריה/מגירת המספר
  const tagNum = filterTag && /^\d+/.test(filterTag) ? parseInt(filterTag.match(/^\d+/)[0], 10) : null;
  const tagGallery = tagNum != null ? galleryNums.find(g => g.n === tagNum) : null;
  const years = Array.from({ length: 8 }, (_, i) => new Date().getFullYear() - i);
  const shownCats = showAllCats ? cats : cats.slice(0, TOP_CATS);

  return (
    <div style={{ direction: "rtl", maxWidth: 1280, margin: "0 auto", padding: "48px 18px 90px", position: "relative", zIndex: 1 }}>
      <StickyAnchorAd />
      <SideRailAd />
      {/* כותרת */}
      <div style={{ textAlign: "center", marginBottom: 26 }}>
        {filterAuthor ? (
          <>
            <button onClick={() => setSearchParams({})} style={{ background: "none", border: "none", color: P.inkSoft, cursor: "pointer", fontFamily: F.heading, fontSize: 13, letterSpacing: 3, marginBottom: 12 }}>← כל הפוסטים</button>
            <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 12, letterSpacing: 4, textTransform: "uppercase", marginBottom: 8 }}>✍️ פוסטים של</div>
            <h1 style={{ color: P.accentText, fontFamily: F.regal, fontSize: "clamp(22px,4vw,36px)", fontWeight: 700, margin: 0 }}>{filterAuthor}</h1>
          </>
        ) : (
          <>
            <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 12, letterSpacing: 4, textTransform: "uppercase", marginBottom: 8 }}>
              📖 פוסטים
            </div>
            <h1 style={{ color: P.accentText, fontFamily: F.regal, fontSize: "clamp(26px,5vw,44px)", fontWeight: 700, margin: 0, textShadow: `0 0 40px ${P.glow}` }}>
              תובנות ותגליות
            </h1>
            <p style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 15, marginTop: 10 }}>
              חיפוש חכם — טקסט, מספר או גימטריה. הקלידו ונחשוף את הרמזים.
            </p>
          </>
        )}
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
            <button className="pp-gem-drawer" onClick={() => openNumberDrawer(String(gemValue))} title="פתח מגירת המספר — פוסטים, גלריה וגימטריה">🖼 גלריה ומספרים</button>
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

        {/* כפתור פתיחת מסננים — סגור כברירת מחדל; כל אחד פותח אם רוצה */}
        <div className="pp-row">
          <button className="pp-pill pp-filters-toggle" onClick={() => setShowFilters(v => !v)} aria-expanded={showFilters}>
            🎛 סינון — קטגוריה · שנה · תגית · מספר {showFilters ? "▲" : "▾"}
          </button>
          {!showFilters && (filterCat || filterTag || filterYear) && (
            <span style={{ color: P.inkSoft, fontFamily: F.heading, fontSize: 12 }}>· פילטר פעיל</span>
          )}
        </div>

        {showFilters && (<>
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

        {/* תגיות פופולריות — לפי כמות פוסטים (פופולרי בהתחלה) */}
        {tagList.length > 0 && (
          <div className="pp-row pp-pills pp-tags">
            <span className="pp-row-label">🏷</span>
            {(showTags ? tagList : tagList.slice(0, TOP_TAGS)).map(({ tag, posts }) => (
              <button key={tag} className={`pp-pill pp-tag${filterTag === tag ? " active" : ""}`} onClick={() => toggleTag(tag)}>
                {tag}<span className="pp-count">{posts}</span>
              </button>
            ))}
            {tagList.length > TOP_TAGS && (
              <button className="pp-pill pp-more" onClick={() => setShowTags(v => !v)}>{showTags ? "פחות ▲" : "עוד תגיות ▾"}</button>
            )}
          </div>
        )}

        {/* מספרים מהגלריה — לחיצה פותחת את מגירת המספר (פוסטים + גלריה + גימטריה) */}
        {galleryNums.length > 0 && (
          <div className="pp-row pp-pills pp-nums">
            <span className="pp-row-label" title="מספרים משמעותיים מהגלריה — לחצו לפתיחת מגירת המספר">🔢 מספרים</span>
            {(showNums ? galleryNums : galleryNums.slice(0, 12)).map(({ n, imgs }) => (
              <button key={n} className="pp-pill pp-pill-sm pp-num" onClick={() => openNumberDrawer(String(n))}
                title={`${imgs} תמונות בגלריה · פתח מגירת המספר`}>
                {n}<span className="pp-count">🖼{imgs}</span>
              </button>
            ))}
            {galleryNums.length > 12 && (
              <button className="pp-pill pp-more" onClick={() => setShowNums(v => !v)}>{showNums ? "פחות ▲" : "עוד ▾"}</button>
            )}
          </div>
        )}
        </>)}

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

      {/* גשר אל הגלריה/מגירת המספר — כשמסננים תגית-מספר */}
      {tagNum != null && (
        <button className="pp-bridge" onClick={() => openNumberDrawer(String(tagNum))}>
          <span className="pp-bridge-n">🔢 {tagNum}</span>
          <span>
            {tagGallery ? `יש ${tagGallery.imgs.toLocaleString()} תמונות בגלריה למספר ${tagNum} · ` : ""}
            פתחו את מגירת המספר — פוסטים, גלריה וגימטריה
          </span>
          <span aria-hidden>←</span>
        </button>
      )}

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
            {posts.map((p, i) => <PostCard key={`${p.slug}-${i}`} p={p} i={i} view={view} hot={hotSlugs.has(p.slug)} />)}
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
          border: 1px solid ${P.borderStrong}; border-radius: 18px;
          background: ${P.cardGrad};
          backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
          box-shadow: 0 16px 50px rgba(0,0,0,0.5); display: flex; flex-direction: column; gap: 12px; }

        .pp-search { display: flex; align-items: center; gap: 8px; background: ${P.cardSoft};
          border: 1px solid ${P.border}; border-radius: 999px; padding: 6px 14px; transition: border-color .2s, box-shadow .2s; }
        .pp-search:focus-within { border-color: ${P.accent}; box-shadow: 0 0 20px ${P.glow}; }
        .pp-search-ico { font-size: 16px; opacity: 0.85; }
        .pp-search input { flex: 1; background: none; border: none; outline: none; color: ${P.ink};
          font-family: ${F.body}; font-size: 16px; padding: 8px 2px; min-width: 0; }
        .pp-search input::placeholder { color: ${P.inkSoft}; opacity: 0.8; }
        .pp-clear-x { background: none; border: none; color: ${P.inkSoft}; font-size: 22px; cursor: pointer; line-height: 1; padding: 0 4px; }
        .pp-clear-x:hover { color: ${P.accentText}; }

        .pp-gem-hint { display: flex; flex-wrap: wrap; align-items: center; gap: 10px;
          background: ${P.cardSoft};
          border: 1px solid ${P.borderStrong}; border-radius: 12px; padding: 9px 14px;
          color: ${P.ink}; font-family: ${F.body}; font-size: 13.5px; }
        .pp-gem-hint b { color: ${P.accentText}; font-size: 16px; }
        .pp-gem-toggle, .pp-gem-drawer { cursor: pointer; border-radius: 999px; font-family: ${F.heading};
          font-size: 12px; font-weight: 700; padding: 5px 12px; border: 1px solid ${P.borderStrong};
          background: ${P.cardSoft}; color: ${P.accentText}; transition: all .18s; }
        .pp-gem-toggle:hover, .pp-gem-drawer:hover { background: ${P.accent}; color: ${P.onAccent}; }
        .pp-gem-toggle.on { background: ${P.accent}; color: ${P.onAccent}; }
        .pp-gem-words { color: ${P.inkSoft}; font-size: 13px; }

        .pp-row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
        .pp-controls { justify-content: space-between; }
        .pp-row-label { color: ${P.inkSoft}; font-size: 14px; }
        .pp-seg { display: inline-flex; gap: 6px; background: ${P.cardSoft}; border: 1px solid ${P.border};
          border-radius: 999px; padding: 4px; }
        .pp-pills { row-gap: 8px; }

        .pp-pill { cursor: pointer; background: ${P.card}; border: 1px solid ${P.border};
          color: ${P.ink}; font-family: ${F.heading}; font-size: 13px; font-weight: 700;
          padding: 7px 14px; border-radius: 999px; transition: border-color .15s, background .15s, color .15s, transform .12s; }
        .pp-pill:hover { border-color: ${P.accent}; background: ${P.cardSoft}; transform: translateY(-1px); }
        .pp-pill.active { background: ${P.accentBtn}; color: ${P.onAccent}; border-color: ${P.accent};
          box-shadow: 0 4px 16px ${P.glow}; }
        .pp-seg .pp-pill { border: none; background: transparent; padding: 6px 14px; }
        .pp-seg .pp-pill.active { box-shadow: none; }
        .pp-pill-sm { font-size: 12px; padding: 5px 11px; font-family: ${F.mono}; }
        .pp-pill.pp-icon { font-size: 15px; padding: 6px 12px; }
        .pp-pill.pp-more { background: transparent; border-style: dashed; color: ${P.inkSoft}; }
        .pp-years { gap: 6px; }
        .pp-tags { row-gap: 8px; }
        .pp-tag { padding-inline-end: 6px; }
        .pp-count { display: inline-flex; align-items: center; margin-inline-start: 6px; padding: 1px 7px;
          font-family: ${F.mono}; font-size: 11px; font-weight: 700; border-radius: 999px;
          background: ${P.cardSoft}; color: ${P.inkSoft}; }
        .pp-pill.active .pp-count { background: rgba(0,0,0,0.22); color: ${P.onAccent}; }
        .pp-nums .pp-num { font-family: ${F.mono}; border-color: ${P.borderStrong};
          background: ${P.cardSoft}; color: ${P.accentText}; }
        .pp-nums .pp-num:hover { border-color: ${P.accent}; background: ${P.cardSoft}; }

        .pp-chips { padding-top: 4px; border-top: 1px solid ${P.border}; }
        .pp-chip { display: inline-flex; align-items: center; gap: 6px; background: ${P.cardSoft};
          border: 1px solid ${P.borderStrong}; border-radius: 999px; padding: 4px 6px 4px 12px;
          color: ${P.ink}; font-family: ${F.heading}; font-size: 12px; }
        .pp-chip button { background: none; border: none; color: ${P.inkSoft}; cursor: pointer; font-size: 16px; line-height: 1; }
        .pp-chip button:hover { color: ${P.accentText}; }
        .pp-clear-all { background: none; border: 1px solid ${C.crimsonLight}; color: #c0392b;
          border-radius: 999px; padding: 5px 14px; cursor: pointer; font-family: ${F.heading}; font-size: 12px; }
        .pp-clear-all:hover { background: rgba(160,31,46,0.2); }

        .pp-bridge { display: flex; align-items: center; gap: 12px; width: 100%; max-width: 920px; margin: 0 auto 14px;
          cursor: pointer; text-align: right; border-radius: 14px; padding: 12px 18px;
          border: 1px solid ${P.borderStrong};
          background: ${P.cardSoft};
          color: ${P.ink}; font-family: ${F.body}; font-size: 14.5px;
          box-shadow: 0 8px 26px rgba(0,0,0,0.4); transition: border-color .18s, transform .12s, box-shadow .18s; }
        .pp-bridge:hover { border-color: ${P.accent}; transform: translateY(-1px); box-shadow: 0 12px 32px rgba(0,0,0,0.5), 0 0 22px ${P.glow}; }
        .pp-bridge > span:nth-child(2) { flex: 1; }
        .pp-bridge-n { font-family: ${F.mono}; font-weight: 800; font-size: 17px; color: ${P.accentText};
          background: ${P.cardSoft}; border: 1px solid ${P.borderStrong}; border-radius: 999px; padding: 4px 12px; white-space: nowrap; }

        .pp-status { text-align: center; color: ${P.inkSoft}; font-family: ${F.heading}; font-size: 13px; margin: 6px 0 22px; }
        .pp-empty { text-align: center; color: ${P.inkSoft}; font-family: ${F.body}; padding: 56px 20px; font-size: 15px; }

        .pp-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 18px; }
        .pp-listcol { display: flex; flex-direction: column; gap: 14px; max-width: 860px; margin: 0 auto; }

        .pp-card { display: flex; flex-direction: column; text-decoration: none; overflow: hidden;
          border: 1px solid ${P.border}; border-radius: 14px;
          background: ${P.cardGrad};
          transition: border-color .18s, transform .18s, box-shadow .18s; animation: pp-in .5s ease both; }
        .pp-card:hover { border-color: ${P.accent}; transform: translateY(-3px);
          box-shadow: 0 14px 38px rgba(0,0,0,0.5), 0 0 22px ${P.glow}; }
        .pp-thumb { position: relative; aspect-ratio: 16/10; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .pp-thumb-mark { color: ${P.accentDim}; font-size: 30px; opacity: .5; }
        .pp-thumb-holo { position: absolute; inset: 0; background: linear-gradient(180deg, transparent 45%, rgba(5,4,0,0.85)); }
        .pp-gem { position: absolute; top: 8px; right: 8px; background: rgba(212,175,55,0.92); color: #1a0e00;
          font-family: ${F.mono}; font-size: 13px; font-weight: 800; padding: 2px 9px; border-radius: 999px; z-index: 2; }
        .pp-body { padding: 13px 15px 15px; display: flex; flex-direction: column; gap: 7px; flex: 1; }
        .pp-name { color: ${P.accentText}; font-family: ${F.regal}; font-size: 17.5px; font-weight: 700; line-height: 1.4;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .pp-excerpt { color: ${P.inkSoft}; font-family: ${F.body}; font-size: 14.5px; line-height: 1.75;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .pp-meta { display: flex; justify-content: space-between; align-items: flex-end; margin-top: auto; padding-top: 6px;
          color: ${P.inkSoft}; font-family: ${F.heading}; font-size: 12.5px; }
        .pp-dates { display: inline-flex; flex-direction: row; flex-wrap: wrap; gap: 5px; align-items: baseline; line-height: 1.4; }
        .pp-filters-toggle { border-style: dashed; }

        /* תצוגת רשימה — תמונה לצד טקסט */
        .pp-card-list { flex-direction: row; align-items: stretch; }
        .pp-card-list .pp-thumb { width: 200px; aspect-ratio: auto; flex-shrink: 0; }
        .pp-card-list .pp-name { -webkit-line-clamp: 1; }
        .pp-card-list .pp-excerpt { -webkit-line-clamp: 3; }
        @media (max-width: 560px) {
          .pp-card-list { flex-direction: column; }
          .pp-card-list .pp-thumb { width: auto; aspect-ratio: 16/10; }
        }

        .pp-loadmore { cursor: pointer; background: ${P.cardGrad};
          border: 1px solid ${P.borderStrong}; border-radius: 999px; color: ${P.accentText};
          font-family: ${F.heading}; font-weight: 700; font-size: 15px; padding: 12px 38px; letter-spacing: 1;
          box-shadow: 0 8px 28px rgba(0,0,0,0.4); }
        .pp-loadmore:hover { background: ${P.cardSoft}; }

        @keyframes pp-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @media (prefers-reduced-motion: reduce) { .pp-card { animation: none; } }
      `}</style>
    </div>
  );
}
