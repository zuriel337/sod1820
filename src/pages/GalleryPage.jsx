import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { F, C } from "../theme.js";
import { useAuth } from "../lib/AuthContext.jsx";
import { getGalleryPage, setImageCuration } from "../lib/supabase.js";
import ImageEditModal from "../components/ImageEditModal.jsx";
import Lightbox from "../components/Lightbox.jsx";
import { cleanName } from "../lib/galleryName.js";

// ===== גלריה ציבורית — /gallery =====
// כל gallery_images עם פילטר לפי image_type, חיפוש, ו-masonry grid.
// עדשה נוספת על עץ אחד (gallery_images) — אותו מקור.

const TYPES = [
  { key: null,        label: "🖼 הכל"       },
  { key: "hint",      label: "💡 רמזים"     },
  { key: "gematria",  label: "🔢 גימטריה"   },
  { key: "method",    label: "📐 שיטות"     },
  { key: "event",     label: "📰 אירועים"   },
  { key: "gallery",   label: "🗂 כללי"      },
];

const LIMIT = 60;

export default function GalleryPage() {
  const { isAdmin } = useAuth();
  const [type, setType] = useState(null);
  const [hiddenMode, setHiddenMode] = useState("no"); // אדמין: no=גלוי · only=מוסתרים · all=הכל
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [images, setImages] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lbIdx, setLbIdx] = useState(null);
  const [editImg, setEditImg] = useState(null);
  const sentinel = useRef(null);
  const debounceRef = useRef(null);

  // Debounce search
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  // אדמין בלבד — אם המשתמש אינו אדמין, תמיד מצב 'no'
  const hidden = isAdmin ? hiddenMode : "no";

  // Reset and reload when filter changes
  useEffect(() => {
    setImages([]);
    setPage(0);
    setLoading(true);
    getGalleryPage({ type, page: 0, limit: LIMIT, search: debouncedSearch, hidden })
      .then(({ data, count }) => { setImages(data); setTotal(count); setLoading(false); })
      .catch(() => setLoading(false));
  }, [type, debouncedSearch, hidden]);

  // Infinite scroll
  useEffect(() => {
    if (!sentinel.current) return;
    const io = new IntersectionObserver(es => {
      if (es[0].isIntersecting && !loadingMore && images.length < total) loadMore();
    }, { rootMargin: "600px" });
    io.observe(sentinel.current);
    return () => io.disconnect();
  }, [images.length, total, loadingMore]);

  async function loadMore() {
    setLoadingMore(true);
    const nextPage = page + 1;
    const { data } = await getGalleryPage({ type, page: nextPage, limit: LIMIT, search: debouncedSearch, hidden });
    setImages(prev => [...prev, ...(data || [])]);
    setPage(nextPage);
    setLoadingMore(false);
  }

  function handleSave(patch) {
    if (!Object.keys(patch).length) { setEditImg(null); return; }
    setImageCuration(editImg.id, patch)
      .then(() => { setImages(prev => prev.map(i => i.id === editImg.id ? { ...i, ...patch } : i)); setEditImg(null); })
      .catch(e => alert("שגיאה: " + e.message));
  }

  function handleDelete(id) {
    setImages(prev => prev.filter(i => i.id !== id));
    setTotal(t => t - 1);
  }

  // אדמין — החזרה/הסתרה מהירה ישירות מהכרטיס (בלי לפתוח את מודל העריכה)
  function toggleHidden(img, e) {
    e?.stopPropagation();
    const next = !img.curator_hidden;
    setImageCuration(img.id, { curator_hidden: next })
      .then(() => {
        // ב-'only' מציגים רק מוסתרות → אחרי החזרה התמונה יוצאת מהרשימה; ב-'all' רק מסמנים
        if (hidden === "only" && !next) {
          setImages(prev => prev.filter(i => i.id !== img.id));
          setTotal(t => Math.max(0, t - 1));
        } else if (hidden === "no" && next) {
          setImages(prev => prev.filter(i => i.id !== img.id));
          setTotal(t => Math.max(0, t - 1));
        } else {
          setImages(prev => prev.map(i => i.id === img.id ? { ...i, curator_hidden: next } : i));
        }
      })
      .catch(err => alert("שגיאה: " + err.message));
  }

  return (
    <div style={{ direction: "rtl", maxWidth: "100%", padding: "clamp(16px,3vw,48px) clamp(12px,3vw,56px) 80px", boxSizing: "border-box" }}>
      <style>{`
        .gl-wall { column-count:4; column-gap:14px; }
        @media(max-width:980px){ .gl-wall{ column-count:3; } }
        @media(max-width:640px){ .gl-wall{ column-count:2; column-gap:10px; } }
        .gl-card { break-inside:avoid; -webkit-column-break-inside:avoid; margin-bottom:14px; display:block; width:100%;
          background:${C.surface2}; border:1px solid ${C.border}; border-radius:14px; overflow:hidden;
          transition:transform .18s, border-color .18s, box-shadow .18s; }
        @media(max-width:640px){ .gl-card{ margin-bottom:10px; } }
        .gl-card:hover { transform:translateY(-4px); border-color:${C.gold}55; box-shadow:0 14px 36px rgba(0,0,0,0.45); }
        .gl-imgwrap { position:relative; overflow:hidden; line-height:0; background:${C.surface2}; cursor:zoom-in; }
        .gl-imgwrap img { width:100%; height:auto; display:block; transition:transform .45s; }
        .gl-card:hover .gl-imgwrap img { transform:scale(1.05); }
        .gl-shade { position:absolute; inset:0; background:linear-gradient(180deg,rgba(0,0,0,.28) 0%,transparent 28%,transparent 60%,rgba(0,0,0,.5) 100%); pointer-events:none; }
        .gl-num { position:absolute; top:8px; inset-inline-start:8px; background:rgba(212,175,55,0.95); color:#1a0e00;
          font-family:${F.mono}; font-size:13px; font-weight:900; border-radius:999px; padding:2px 10px; z-index:2; text-decoration:none; }
        .gl-type-badge { position:absolute; top:8px; inset-inline-end:8px; background:rgba(0,0,0,0.6); border:1px solid rgba(255,255,255,0.2);
          color:#ffffffcc; font-family:${F.heading}; font-size:10px; font-weight:700; border-radius:999px; padding:2px 8px; z-index:2; }
        .gl-edit { position:absolute; bottom:8px; inset-inline-end:8px; z-index:3; background:rgba(0,0,0,0.55); color:#fff;
          border:none; border-radius:999px; width:26px; height:26px; font-size:11px; cursor:pointer; display:flex; align-items:center; justify-content:center; opacity:0; transition:opacity .2s; }
        .gl-card:hover .gl-edit { opacity:1; }
        .gl-hidden-badge { position:absolute; top:36px; inset-inline-start:8px; z-index:2; background:rgba(200,85,61,0.92); color:#fff;
          font-family:${F.heading}; font-size:10px; font-weight:700; border-radius:999px; padding:2px 8px; }
        .gl-hidetoggle { position:absolute; bottom:8px; inset-inline-end:40px; z-index:3; background:rgba(0,0,0,0.6); color:#fff;
          border:1px solid rgba(212,175,55,0.6); border-radius:999px; padding:3px 9px; font-size:10.5px; font-family:${F.heading}; font-weight:700;
          cursor:pointer; opacity:0; transition:opacity .2s; }
        .gl-card:hover .gl-hidetoggle { opacity:1; }
        .gl-body { padding:9px 11px; }
        .gl-title { color:${C.goldLight}; font-family:${F.regal}; font-size:13.5px; font-weight:700; line-height:1.4;
          display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
        .gl-date { color:${C.muted}; font-family:${F.heading}; font-size:10.5px; margin-top:4px; }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 11.5, letterSpacing: 4, textTransform: "uppercase", marginBottom: 6 }}>מאגר התמונות</div>
        <h1 style={{ color: C.goldBright, fontFamily: F.regal, fontSize: "clamp(24px,4vw,36px)", fontWeight: 700, margin: 0 }}>🖼 גלריית התמונות</h1>
        <p style={{ color: C.muted, fontFamily: F.body, fontSize: 14, marginTop: 8 }}>
          {total ? `${total.toLocaleString()} תמונות` : "טוען..."} ·{" "}
          {hidden === "only" ? <span style={{ color: "#e0856a" }}>🕓 מציג מוסתרים בלבד</span>
            : hidden === "all" ? "כל המאגר כולל מוסתרים"
            : "כל מאגר gallery_images"}
        </p>
      </div>

      {/* Tabs + Search */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 20 }}>
        {TYPES.map(t => (
          <button key={String(t.key)} onClick={() => setType(t.key)} style={{
            cursor: "pointer", borderRadius: 999, padding: "7px 16px", fontFamily: F.heading, fontWeight: 700, fontSize: 13.5,
            border: `1px solid ${type === t.key ? C.gold : C.border}`,
            background: type === t.key ? "linear-gradient(135deg,rgba(212,175,55,0.22),rgba(8,5,2,0.4))" : "transparent",
            color: type === t.key ? C.goldBright : C.muted,
          }}>{t.label}</button>
        ))}
        <div style={{ flex: 1 }} />
        {isAdmin && (
          <div style={{ display: "flex", gap: 0, border: `1px solid ${C.border}`, borderRadius: 999, overflow: "hidden" }}>
            {[
              { key: "no",   label: "גלוי" },
              { key: "only", label: "🕓 מוסתרים" },
              { key: "all",  label: "הכל" },
            ].map(m => (
              <button key={m.key} onClick={() => setHiddenMode(m.key)} style={{
                cursor: "pointer", border: "none", padding: "7px 14px", fontFamily: F.heading, fontWeight: 700, fontSize: 12.5,
                background: hiddenMode === m.key ? "rgba(212,175,55,0.22)" : "transparent",
                color: hiddenMode === m.key ? C.goldBright : C.muted,
              }}>{m.label}</button>
            ))}
          </div>
        )}
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 חיפוש..."
          style={{ background: "rgba(0,0,0,0.3)", border: `1px solid ${C.border}`, borderRadius: 999, padding: "7px 14px",
            color: C.goldLight, fontFamily: F.body, fontSize: 13, outline: "none", width: 200, direction: "rtl" }}
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ textAlign: "center", color: C.muted, fontFamily: F.heading, padding: 60, fontSize: 15 }}>טוען...</div>
      ) : !images.length ? (
        <div style={{ textAlign: "center", color: C.muted, fontFamily: F.body, padding: 60, fontSize: 15 }}>לא נמצאו תמונות.</div>
      ) : (
        <div className="gl-wall">
          {images.map((img, idx) => {
            const title = cleanName(img.name) || img.description?.slice(0, 60) || "";
            const date = img.occurred_at ? new Date(img.occurred_at).toLocaleDateString("he-IL", { day: "numeric", month: "short", year: "numeric" }) : "";
            const typeBadge = { hint: "💡", gematria: "🔢", method: "📐", event: "📰", gallery: "🖼" }[img.image_type];
            return (
              <div key={img.id} className="gl-card">
                <div className="gl-imgwrap" onClick={() => setLbIdx(idx)}>
                  <img src={img.image_url} alt={title || ""} loading="lazy" onError={e => { e.target.style.display = "none"; }} />
                  <div className="gl-shade" />
                  {img.primary_value != null && (
                    <Link to={`/number/${img.primary_value}`} onClick={e => e.stopPropagation()} className="gl-num">{img.primary_value}</Link>
                  )}
                  {typeBadge && <span className="gl-type-badge">{typeBadge}</span>}
                  {isAdmin && img.curator_hidden && <span className="gl-hidden-badge">🕓 מוסתר</span>}
                  {isAdmin && (
                    <button className="gl-edit" onClick={e => { e.stopPropagation(); setEditImg(img); }} title="ערוך">✏️</button>
                  )}
                  {isAdmin && (
                    <button className="gl-hidetoggle" onClick={e => toggleHidden(img, e)}
                      title={img.curator_hidden ? "החזר לגלריה" : "הסתר מהגלריה"}>
                      {img.curator_hidden ? "↩︎ הצג" : "🕓 הסתר"}
                    </button>
                  )}
                </div>
                {(title || date) && (
                  <div className="gl-body">
                    {title && <div className="gl-title">{title}</div>}
                    {date && <div className="gl-date">📅 {date}</div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Infinite scroll sentinel */}
      {images.length < total && <div ref={sentinel} style={{ height: 1, marginTop: 20 }} />}
      {loadingMore && <div style={{ textAlign: "center", color: C.muted, fontFamily: F.heading, padding: 20 }}>טוען עוד...</div>}

      {/* Lightbox */}
      {lbIdx != null && (
        <Lightbox images={images} initialIndex={lbIdx} onClose={() => setLbIdx(null)}
          onEdit={isAdmin ? h => { setLbIdx(null); setEditImg(h); } : null} />
      )}

      {/* Edit Modal */}
      {editImg && (
        <ImageEditModal
          image={editImg}
          onSave={handleSave}
          onClose={() => setEditImg(null)}
          onDelete={handleDelete}
          onRemoveFromStream={editImg.source === "update" ? async () => {
            await setImageCuration(editImg.id, { source: "manual" });
            setImages(prev => prev.map(i => i.id === editImg.id ? { ...i, source: "manual" } : i));
            setEditImg(null);
          } : null}
        />
      )}
    </div>
  );
}
