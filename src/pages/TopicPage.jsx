import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { C, F } from "../theme.js";
import { getTopicCardBySlug, getGalleryImagesByIds, getConvergenceEntities } from "../lib/supabase.js";
import { applySeo } from "../lib/seo.js";

// ===== מרכז ההתכנסות — עמוד כרטיס נושא (/topic/:slug) =====
// כאן נפגשים כל החוטים: מספרים, תמונות, חיבורים ורמזים — שער לעולם שלם של קשרים.
function stars(q) {
  const n = Math.max(0, Math.min(5, Math.round((q || 0) / 2)));
  return "★".repeat(n) + "☆".repeat(5 - n);
}
const box = { background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px 20px" };

export default function TopicPage() {
  const { slug } = useParams();
  const [card, setCard] = useState(undefined); // undefined=loading, null=not found
  const [imgs, setImgs] = useState([]);
  const [ents, setEnts] = useState([]); // ישויות/חתימות מחוברות בגרף (דרך edges)
  const [openBullet, setOpenBullet] = useState(null); // שורת ממצא פתוחה (תמונה מתחתיה)

  useEffect(() => {
    let live = true;
    setCard(undefined); setImgs([]); setEnts([]);
    getTopicCardBySlug(slug).then(async c => {
      if (!live) return;
      setCard(c);
      if (c) {
        applySeo({
          title: `${c.title} — מרכז ההתכנסות`,
          description: c.subtitle || "מפת הקשרים של SOD1820",
          path: `/topic/${slug}`, type: "article",
          publishedTime: c.created_at, modifiedTime: c.approved_at || c.created_at,
          tags: c.search_terms || [],
        });
        if ((c.image_ids || []).length) {
          try {
            const fetched = await getGalleryImagesByIds(c.image_ids);
            const byId = Object.fromEntries(fetched.map(i => [i.id, i]));
            // שמירה על הסדר שנקבע בכרטיס (image_ids) — לא סדר אקראי
            setImgs((c.image_ids || []).map(id => byId[id]).filter(Boolean));
          } catch { /* ignore */ }
        }
        if (c.node_id) {
          try { setEnts(await getConvergenceEntities(c.node_id)); } catch { /* ignore */ }
        }
      }
    }).catch(() => live && setCard(null));
    return () => { live = false; };
  }, [slug]);

  if (card === undefined) return <Center>טוען…</Center>;
  if (!card) return <Center>הכרטיס לא נמצא. <Link to="/" style={{ color: C.goldBright }}>חזרה →</Link></Center>;

  const f = card.findings || {};
  const hot = new Set(card.highlight_numbers || []);
  const nums = card.numbers || [];

  return (
    <div style={{ direction: "rtl", maxWidth: 920, margin: "0 auto", padding: "40px 22px 90px" }}>
      {/* כותרת */}
      <div style={{ ...box, borderColor: C.borderGold, marginBottom: 20 }}>
        <div style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 12, letterSpacing: 3, textTransform: "uppercase", marginBottom: 6 }}>🧠 מרכז ההתכנסות</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
          <h1 style={{ color: C.goldBright, fontFamily: F.regal, fontSize: "clamp(26px,5vw,42px)", fontWeight: 700, margin: 0 }}>{card.title}</h1>
          <span style={{ color: C.gold, fontSize: 15, letterSpacing: 2 }}>{stars(card.quality)}</span>
        </div>
        {card.subtitle && <p style={{ color: C.goldLight, fontFamily: F.body, fontSize: 15.5, lineHeight: 1.7, margin: "10px 0 0" }}>{card.subtitle}</p>}
        {/* מספרים → עמוד מספר */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
          {nums.map(n => (
            <Link key={n} to={`/number/${n}`} style={{ textDecoration: "none", fontFamily: F.mono, fontWeight: 800,
              fontSize: hot.has(n) ? 16 : 13, padding: hot.has(n) ? "5px 14px" : "3px 10px", borderRadius: 999,
              border: `1px solid ${hot.has(n) ? C.gold : C.border}`, background: hot.has(n) ? "rgba(212,175,55,0.18)" : "transparent",
              color: hot.has(n) ? C.goldBright : C.goldDim }}>{n}</Link>
          ))}
        </div>
        {/* גשר ל-/cross — הצלבת השיטות של המספרים המודגשים */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          {(card.highlight_numbers || nums.slice(0, 3)).map(n => (
            <Link key={`x${n}`} to={`/cross?n=${n}`} style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 5,
              border: `1px solid ${C.border}`, borderRadius: 999, padding: "4px 12px",
              color: C.goldLight, fontFamily: F.heading, fontSize: 12, fontWeight: 700 }}>⟡ הצלבת {n} →</Link>
          ))}
        </div>
      </div>

      {/* 👑 ישויות מחוברות בגרף (חתימות זהב) */}
      {ents.length > 0 && (
        <div style={{ ...box, borderColor: C.borderGold, marginBottom: 20 }}>
          <div style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 18, fontWeight: 700, marginBottom: 10 }}>👑 חתימות וישויות מחוברות</div>
          <div style={{ display: "grid", gap: 8 }}>
            {ents.map(e => {
              const gold = e.metadata?.tier === "gold";
              const val = e.metadata?.value;
              return (
                <Link key={e.label} to={`/number/${encodeURIComponent(e.label)}`} style={{ textDecoration: "none",
                  display: "block", padding: "10px 13px", borderRadius: 10,
                  background: gold ? "linear-gradient(135deg, rgba(212,175,55,0.18), rgba(212,175,55,0.03))" : C.surface2,
                  border: `1px solid ${gold ? C.gold : C.border}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    {gold && <span title="חתימת זהב">👑</span>}
                    <span style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 16.5, fontWeight: 700 }}>{e.metadata?.display || e.label}</span>
                    {val != null && <span style={{ color: C.goldDim, fontFamily: F.mono, fontSize: 13 }}>= {val}</span>}
                  </div>
                  {e.metadata?.claim_note && <div style={{ color: C.muted, fontFamily: F.body, fontSize: 12, lineHeight: 1.6, marginTop: 4 }}>⚖️ {e.metadata.claim_note}</div>}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* רמז משלים */}
      {f.hint && (
        <div style={{ ...box, borderColor: "rgba(99,102,241,0.4)", background: "rgba(99,102,241,0.07)", marginBottom: 20, display: "flex", gap: 10 }}>
          <span style={{ fontSize: 20 }}>🔮</span>
          <div style={{ color: "#cfd1ff", fontFamily: F.body, fontSize: 15, lineHeight: 1.85 }}><b>רמז משלים: </b>{f.hint}</div>
        </div>
      )}

      {/* ממצאים */}
      {(f.headline || Array.isArray(f.bullets)) && (
        <div style={{ ...box, marginBottom: 20 }}>
          {f.headline && <div style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 19, fontWeight: 700, marginBottom: 10 }}>{f.headline}</div>}
          {Array.isArray(f.bullets) && (
            <ul style={{ margin: 0, paddingInlineStart: 22, color: "#d4ccbf", fontFamily: F.body, fontSize: 15, lineHeight: 1.95 }}>
              {f.bullets.map((b, i) => {
                const text = typeof b === "string" ? b : (b?.t || "");
                const imgId = (typeof b === "object" && b) ? b.img : null;
                // תמונה מקושרת מפורשת, ואחרת — אוטומטית לפי מיקום השורה (כל שורה לחיצה)
                const img = (imgId ? imgs.find(x => x.id === imgId) : null) || imgs[i] || null;
                const open = openBullet === i;
                return (
                  <li key={i} style={{ marginBottom: img ? 4 : 0 }}>
                    <span onClick={img ? () => setOpenBullet(open ? null : i) : undefined}
                      style={{ cursor: img ? "pointer" : "default", borderBottom: img ? `1px dashed ${C.borderGold}` : "none", color: img && open ? C.goldBright : "inherit" }}>
                      {text}{img && <span style={{ color: C.goldDim, fontSize: 12, marginInlineStart: 6 }}>{open ? "▾" : "🖼"}</span>}
                    </span>
                    {img && open && (
                      <div style={{ margin: "8px 0 4px", maxWidth: 420 }}>
                        <img src={img.image_url} alt={img.name || text} loading="lazy"
                          style={{ width: "100%", borderRadius: 10, border: `1px solid ${C.borderGold}`, display: "block" }} />
                        {(img.description || img.name) && <div style={{ color: C.muted, fontFamily: F.body, fontSize: 12.5, lineHeight: 1.6, marginTop: 5 }}>{img.description || img.name}</div>}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* חיבורים */}
      {Array.isArray(f.connections) && f.connections.length > 0 && (
        <div style={{ ...box, marginBottom: 20 }}>
          <div style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 18, fontWeight: 700, marginBottom: 10 }}>🔗 מסלולי קשר</div>
          <div style={{ display: "grid", gap: 8 }}>
            {f.connections.map((cn, i) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", background: "rgba(212,175,55,0.06)", border: `1px solid ${C.border}`, borderRadius: 10, padding: "8px 12px" }}>
                <Link to={`/number/${cn.number}`} style={{ fontFamily: F.mono, fontWeight: 800, color: C.goldBright, fontSize: 15, textDecoration: "none" }}>{cn.number}</Link>
                <span style={{ color: C.goldDim }}>↔</span>
                {(cn.links || []).map(l => <span key={l} style={{ color: C.goldLight, fontFamily: F.body, fontSize: 13.5 }}>{l}</span>)}
                {cn.note && <span style={{ color: C.muted, fontFamily: F.body, fontSize: 12.5 }}>· {cn.note}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* הפוסט/ים המלאים — חיבור הכרטיס לפוסט/ים המקור */}
      {(() => {
        const posts = Array.isArray(f.posts) ? f.posts.filter(p => p && p.slug) : (f.post && f.post.slug ? [f.post] : []);
        if (!posts.length) return null;
        return (
          <div style={{ ...box, marginBottom: 20, display: "grid", gap: 8 }}>
            <div style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 11.5, fontWeight: 700, letterSpacing: 1 }}>📖 הפוסטים המלאים</div>
            {posts.map((p, i) => (
              <Link key={i} to={`/${p.slug}`} style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none", background: "rgba(212,175,55,0.06)", border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 13px" }}>
                <span style={{ fontSize: 20 }}>📖</span>
                <span style={{ flex: 1, minWidth: 0, color: C.goldBright, fontFamily: F.regal, fontSize: 15.5, fontWeight: 700, lineHeight: 1.4 }}>{p.title || "קראו את הפוסט המלא"}</span>
                <span style={{ color: C.goldBright, fontFamily: F.heading, fontWeight: 800, flexShrink: 0 }}>←</span>
              </Link>
            ))}
          </div>
        );
      })()}

      {/* ממצאים בגלריות — תמונות גדולות, מוסברות, בסדר שנקבע, מקשרות לגלריה */}
      {imgs.length > 0 && (
        <div style={{ ...box, marginBottom: 20 }}>
          <div style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 18, fontWeight: 700, marginBottom: 4 }}>🖼 ממצאים בגלריות ({imgs.length})</div>
          <div style={{ color: C.muted, fontFamily: F.body, fontSize: 12.5, marginBottom: 14 }}>כל תמונה היא ממצא בציר — בסדר שמספר את הסיפור.</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px,1fr))", gap: 16 }}>
            {imgs.map((im, i) => {
              const caption = (im.description || im.name || "").trim();
              const nums = (im.ocr_numbers || []).filter(n => n >= 10).slice(0, 5);
              return (
                <Link key={im.id} to="/archive" style={{ textDecoration: "none", background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                  <div style={{ position: "relative", height: 200, background: "#0a0702", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                    <img src={im.image_url} alt={caption || ""} loading="lazy" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", display: "block" }} />
                    <span style={{ position: "absolute", top: 8, insetInlineStart: 8, background: "rgba(8,5,2,0.85)", color: C.goldBright, fontFamily: F.mono, fontSize: 12, fontWeight: 800, borderRadius: 999, padding: "2px 9px" }}>{i + 1}</span>
                  </div>
                  <div style={{ padding: "11px 13px", flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
                    {caption && <div style={{ color: C.goldLight, fontFamily: F.body, fontSize: 13, lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{caption}</div>}
                    {nums.length > 0 && (
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                        {nums.map(n => <span key={n} style={{ fontFamily: F.mono, fontSize: 11.5, fontWeight: 700, color: C.goldDim, border: `1px solid ${C.border}`, borderRadius: 999, padding: "1px 8px" }}>{n}</span>)}
                      </div>
                    )}
                    <span style={{ marginTop: "auto", color: C.goldBright, fontFamily: F.heading, fontSize: 12, fontWeight: 700 }}>🖼 בגלריה →</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* הסתייגות מחקרית */}
      {f.caveat && (
        <div style={{ color: C.muted, fontFamily: F.body, fontSize: 13, lineHeight: 1.8, padding: "0 4px", borderInlineStart: `2px solid ${C.border}`, paddingInlineStart: 12, marginBottom: 20 }}>⚠️ {f.caveat}</div>
      )}

      {/* משפט הסיום — מפת הידע החיה */}
      <div style={{ textAlign: "center", color: C.goldDim, fontFamily: F.body, fontSize: 14, lineHeight: 1.9, maxWidth: 620, margin: "0 auto", fontStyle: "italic" }}>
        כאן נפגשים כל החוטים הקשורים ל{card.title}. ככל שהמאגר גדל, גם רשת הקשרים ממשיכה להתפתח ולהיחשף.
      </div>
    </div>
  );
}

function Center({ children }) {
  return <div style={{ direction: "rtl", textAlign: "center", color: C.muted, fontFamily: F.body, padding: "120px 24px", fontSize: 16 }}>{children}</div>;
}
