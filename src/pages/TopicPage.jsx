import React, { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { F, calcGem } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { getTopicCardBySlug, getGalleryImagesByIds, getConvergenceEntities, setImageCuration } from "../lib/supabase.js";
import { applySeo } from "../lib/seo.js";
import { cleanName } from "../lib/galleryName.js";
import { useAuth } from "../lib/AuthContext.jsx";
import ImageEditModal from "../components/ImageEditModal.jsx";
import RealityStream from "../components/RealityStream.jsx";
import DocActions from "../components/DocActions.jsx";
import ShareActions from "../components/ShareActions.jsx";
import { track } from "../lib/tracking.js";
import { withRid } from "../lib/propagation.js";

// ===== מרכז ההתכנסות — עמוד כרטיס נושא (/topic/:slug) =====
// כאן נפגשים כל החוטים: מספרים, תמונות, חיבורים ורמזים — שער לעולם שלם של קשרים.
function stars(q) {
  const n = Math.max(0, Math.min(5, Math.round((q || 0) / 2)));
  return "★".repeat(n) + "☆".repeat(5 - n);
}

export default function TopicPage() {
  const P = usePalette();
  const box = { background: P.card, border: `1px solid ${P.border}`, borderRadius: 14, padding: "18px 20px" };
  const { slug } = useParams();
  const contentRef = useRef(null);   // מכל-התוכן להדפסה (DocActions)
  const [card, setCard] = useState(undefined); // undefined=loading, null=not found
  const [imgs, setImgs] = useState([]);
  const [ents, setEnts] = useState([]); // ישויות/חתימות מחוברות בגרף (דרך edges)
  const [openBullet, setOpenBullet] = useState(null); // שורת ממצא פתוחה (תמונה מתחתיה)
  const { isAdmin } = useAuth();        // עריכת תמונה בדף ההתכנסויות — מנהל בלבד
  const [editImg, setEditImg] = useState(null);

  // 💾 שמירת עריכת-תמונה (מנהל) — מעדכן במאגר + אופטימי ברשימה. אותו מנגנון של הגלריות (עץ אחד).
  function saveImgEdit(patch) {
    if (!editImg || !Object.keys(patch).length) { setEditImg(null); return; }
    const id = editImg.id;
    setImageCuration(id, patch)
      .then(() => { setImgs(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i)); setEditImg(null); })
      .catch(() => setEditImg(null));
  }

  useEffect(() => { if (slug) track("convergence", slug); }, [slug]);

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
  if (!card) return <Center>הכרטיס לא נמצא. <Link to="/" style={{ color: P.accentText }}>חזרה →</Link></Center>;

  const f = card.findings || {};
  const hot = new Set(card.highlight_numbers || []);
  const nums = card.numbers || [];

  // convergence_evidence_law: עוצמת ההתכנסות = מספר השיטות/הראיות העצמאיות המתלכדות בעוגן.
  // הכוכבים נגזרים מהעוצמה האמיתית לפי העץ — לא מ-quality שהוזן ידנית.
  const evRows = Array.isArray(f) ? f : (f.rows || []);
  const evMethods = new Set();
  let evCount = 0;
  evRows.forEach(r => {
    if (r && (r.n != null || r.v != null)) evCount++;
    const m = r && (r.method || r.note);
    if (m) String(m).split(/[·/]/).forEach(x => { const t = x.trim(); if (t && t !== "—") evMethods.add(t); });
  });
  ents.forEach(e => { if (e.edgeMethod) evMethods.add(e.edgeMethod); });
  const meterStars = card.meter_score ? Math.round(card.meter_score / 20) : 0;
  const convStars = Math.max(1, Math.min(5, Math.max(evMethods.size, evCount >= 5 ? 5 : evCount, meterStars)));

  return (
    <div ref={contentRef} style={{ direction: "rtl", maxWidth: 920, margin: "0 auto", padding: "40px 22px 90px", background: P.pageBg, color: P.inkSoft }}>
      {/* כותרת */}
      <div style={{ ...box, borderColor: P.borderStrong, marginBottom: 20 }}>
        <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 12, letterSpacing: 3, textTransform: "uppercase", marginBottom: 6 }}>🧠 מרכז ההתכנסות</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
          <h1 style={{ color: P.accentText, fontFamily: F.regal, fontSize: "clamp(26px,5vw,42px)", fontWeight: 700, margin: 0 }}>{card.title}</h1>
          <span style={{ color: P.accent, fontSize: 15, letterSpacing: 2 }}>{"★".repeat(convStars) + "☆".repeat(5 - convStars)}</span>
          {evMethods.size >= 2 && <span style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 12.5 }}>· {evMethods.size} שיטות עצמאיות</span>}
        </div>
        {card.subtitle && <p style={{ color: P.ink, fontFamily: F.body, fontSize: 15.5, lineHeight: 1.7, margin: "10px 0 0" }}>{card.subtitle}</p>}
        {/* שיתוף ההתכנסות — רכיב-השיתוף הקנוני (canonical_ui_components_law), עם rid למעקב-התפשטות */}
        <div style={{ marginTop: 14 }}>
          <ShareActions type="topic"
            url={withRid(`${typeof window !== "undefined" ? window.location.origin : "https://sod1820.co.il"}/topic/${slug}`)}
            title={`${card.title} · התכנסות בסוד 1820 👑`} />
        </div>
        {/* 🖨️ הדפסה + 💾 שמירה פרטית לדף העבודה */}
        <div style={{ marginTop: 12 }}>
          <DocActions kind="convergence" refId={slug} title={`${card.title} — מרכז ההתכנסות`} link={`/topic/${slug}`} contentRef={contentRef} />
        </div>
        {/* מספרים → עמוד מספר */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
          {nums.map(n => (
            <Link key={n} to={`/number/${n}`} style={{ textDecoration: "none", fontFamily: F.mono, fontWeight: 800,
              fontSize: hot.has(n) ? 16 : 13, padding: hot.has(n) ? "5px 14px" : "3px 10px", borderRadius: 999,
              border: `1px solid ${hot.has(n) ? P.accent : P.border}`, background: hot.has(n) ? P.glow : "transparent",
              color: hot.has(n) ? P.accentText : P.accentDim }}>{n}</Link>
          ))}
        </div>
        {/* גשר ל-/cross — הצלבת השיטות של המספרים המודגשים */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          {(card.highlight_numbers || nums.slice(0, 3)).map(n => (
            <Link key={`x${n}`} to={`/cross?n=${n}`} style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 5,
              border: `1px solid ${P.border}`, borderRadius: 999, padding: "4px 12px",
              color: P.ink, fontFamily: F.heading, fontSize: 12, fontWeight: 700 }}>⟡ הצלבת {n} →</Link>
          ))}
        </div>
      </div>

      {/* 👑 ישויות מחוברות בגרף (חתימות זהב) */}
      {ents.length > 0 && (
        <div style={{ ...box, borderColor: P.borderStrong, marginBottom: 20 }}>
          <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 18, fontWeight: 700, marginBottom: 10 }}>👑 חתימות וישויות מחוברות</div>
          <div style={{ display: "grid", gap: 8 }}>
            {ents.map(e => {
              const gold = e.metadata?.tier === "gold";
              // convergence_number_method_law: מספר מוצג רק כשהוא ראיה אמיתית (שיטה שמתלכדת בעוגן),
              // ותמיד עם שם השיטה. הערך+השיטה ספציפיים להתכנסות ויושבים על ה-edge.
              // ישות-נושא (קשורה תמטית, לא בערך) — מוצגת בלי מספר, כדי לא להטעות.
              const stored = e.edgeValue ?? e.metadata?.value ?? null;
              const rag = calcGem(e.label) || null;
              const ragMatches = rag != null && (card.numbers || []).includes(rag);
              const val = stored ?? (ragMatches ? rag : null);
              const method = e.edgeMethod || (stored == null && ragMatches ? "רגיל" : null);
              return (
                <Link key={e.label} to={`/number/${encodeURIComponent(val ?? e.label)}`} style={{ textDecoration: "none",
                  display: "block", padding: "10px 13px", borderRadius: 10,
                  background: gold ? P.cardGrad : P.cardSoft,
                  border: `1px solid ${gold ? P.accent : P.border}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    {gold && <span title="חתימת זהב">👑</span>}
                    <span style={{ color: P.accentText, fontFamily: F.regal, fontSize: 16.5, fontWeight: 700 }}>{e.metadata?.display || e.label}</span>
                    {val != null && <span style={{ color: P.accentDim, fontFamily: F.mono, fontSize: 13 }}>= {val}{method ? ` (${method})` : ""}</span>}
                  </div>
                  {e.metadata?.claim_note && <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 12, lineHeight: 1.6, marginTop: 4 }}>⚖️ {e.metadata.claim_note}</div>}
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
          <div style={{ color: P.ink, fontFamily: F.body, fontSize: 15, lineHeight: 1.85 }}><b>רמז משלים: </b>{f.hint}</div>
        </div>
      )}

      {/* ממצאים */}
      {(f.headline || Array.isArray(f.bullets)) && (
        <div style={{ ...box, marginBottom: 20 }}>
          {f.headline && <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 19, fontWeight: 700, marginBottom: 10 }}>{f.headline}</div>}
          {Array.isArray(f.bullets) && (
            <ul style={{ margin: 0, paddingInlineStart: 22, color: P.inkSoft, fontFamily: F.body, fontSize: 15, lineHeight: 1.95 }}>
              {f.bullets.map((b, i) => {
                const text = typeof b === "string" ? b : (b?.t || "");
                const imgId = (typeof b === "object" && b) ? b.img : null;
                // תמונה מקושרת מפורשת, ואחרת — אוטומטית לפי מיקום השורה (כל שורה לחיצה)
                const img = (imgId ? imgs.find(x => x.id === imgId) : null) || imgs[i] || null;
                const open = openBullet === i;
                return (
                  <li key={i} style={{ marginBottom: img ? 4 : 0 }}>
                    <span onClick={img ? () => setOpenBullet(open ? null : i) : undefined}
                      style={{ cursor: img ? "pointer" : "default", borderBottom: img ? `1px dashed ${P.borderStrong}` : "none", color: img && open ? P.accentText : "inherit" }}>
                      {text}{img && <span style={{ color: P.accentDim, fontSize: 12, marginInlineStart: 6 }}>{open ? "▾" : "🖼"}</span>}
                    </span>
                    {img && open && (
                      <div style={{ margin: "8px 0 4px", maxWidth: 420 }}>
                        <img src={img.image_url} alt={cleanName(img.name) || text} loading="lazy"
                          style={{ width: "100%", borderRadius: 10, border: `1px solid ${P.borderStrong}`, display: "block" }} />
                        {(img.description || cleanName(img.name)) && <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 12.5, lineHeight: 1.6, marginTop: 5 }}>{img.description || cleanName(img.name)}</div>}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* התכנסות — כל שורה: ביטוי + הערך שלו מימין (convergence_display_law) */}
      {Array.isArray(f.rows) && f.rows.length > 0 && (
        <div style={{ ...box, marginBottom: 20 }}>
          <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 18, fontWeight: 700, marginBottom: 12 }}>🔢 ההתכנסות — כל ביטוי והערך שלו</div>
          <div style={{ display: "grid", gap: 8 }}>
            {f.rows.map((r, i) => {
              const v = typeof r === "object" && r ? r.v : null;
              const p = typeof r === "object" && r ? r.p : String(r);
              const note = typeof r === "object" && r ? r.note : null;
              return (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "baseline", background: P.cardSoft, border: `1px solid ${P.border}`, borderRadius: 10, padding: "9px 12px" }}>
                  <Link to={`/number/${v}`} style={{ flex: "0 0 auto", minWidth: 56, textAlign: "center", fontFamily: F.mono, fontWeight: 800, color: "#241a02", background: "linear-gradient(135deg,#ffd86b,#d8b34a)", borderRadius: 8, padding: "2px 9px", textDecoration: "none", fontVariantNumeric: "tabular-nums" }}>{v}</Link>
                  <span style={{ flex: "1 1 auto", minWidth: 0, color: P.ink, fontFamily: F.body, fontSize: 14.5, lineHeight: 1.55 }}>
                    <Link to={`/number/${encodeURIComponent(p)}`} style={{ color: "inherit", textDecoration: "none", borderBottom: `1px dotted ${P.borderStrong}` }}>{p}</Link>
                    {note && <span style={{ color: P.inkSoft, fontSize: 12.5 }}> · {note}</span>}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* חיבורים */}
      {Array.isArray(f.connections) && f.connections.length > 0 && (
        <div style={{ ...box, marginBottom: 20 }}>
          <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 18, fontWeight: 700, marginBottom: 10 }}>🔗 מסלולי קשר</div>
          <div style={{ display: "grid", gap: 8 }}>
            {f.connections.map((cn, i) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", background: P.cardSoft, border: `1px solid ${P.border}`, borderRadius: 10, padding: "8px 12px" }}>
                <Link to={`/number/${cn.number}`} style={{ fontFamily: F.mono, fontWeight: 800, color: P.accentText, fontSize: 15, textDecoration: "none" }}>{cn.number}</Link>
                <span style={{ color: P.accentDim }}>↔</span>
                {(cn.links || []).map(l => <span key={l} style={{ color: P.ink, fontFamily: F.body, fontSize: 13.5 }}>{l}</span>)}
                {cn.note && <span style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 12.5 }}>· {cn.note}</span>}
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
            <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 11.5, fontWeight: 700, letterSpacing: 1 }}>📖 הפוסטים המלאים</div>
            {posts.map((p, i) => (
              <Link key={i} to={`/${p.slug}`} style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none", background: P.cardSoft, border: `1px solid ${P.border}`, borderRadius: 10, padding: "10px 13px" }}>
                <span style={{ fontSize: 20 }}>📖</span>
                <span style={{ flex: 1, minWidth: 0, color: P.accentText, fontFamily: F.regal, fontSize: 15.5, fontWeight: 700, lineHeight: 1.4 }}>{p.title || "קראו את הפוסט המלא"}</span>
                <span style={{ color: P.accentText, fontFamily: F.heading, fontWeight: 800, flexShrink: 0 }}>←</span>
              </Link>
            ))}
          </div>
        );
      })()}

      {/* ממצאים בגלריות — masonry, מספרים לינקים, תאריכים, lightbox מובנה */}
      {imgs.length > 0 && (
        <div style={{ ...box, marginBottom: 20 }}>
          <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 18, fontWeight: 700, marginBottom: 4 }}>🖼 ממצאים בגלריות ({imgs.length})</div>
          <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 12.5, marginBottom: 14 }}>כל תמונה היא ממצא בציר — בסדר שמספר את הסיפור.</div>
          <RealityStream
            hints={imgs.map(im => ({ ...im, all_values: im.ocr_numbers || [], primary_value: (im.ocr_numbers || [])[0] ?? null }))}
            palette={P}
            onEdit={isAdmin ? (h => setEditImg(imgs.find(i => i.id === h.id) || h)) : undefined}
          />
        </div>
      )}

      {/* ✏️ עריכת תמונה — מנהל בלבד, גם כאן בדף ההתכנסויות (אותו מודל של הגלריות) */}
      {editImg && (
        <ImageEditModal
          image={editImg}
          onSave={saveImgEdit}
          onClose={() => setEditImg(null)}
          onDelete={id => { setImgs(prev => prev.filter(i => i.id !== id)); setEditImg(null); }}
          onRemoveFromStream={editImg.source === "update" ? async () => {
            await setImageCuration(editImg.id, { source: "manual" });
            setImgs(prev => prev.map(i => i.id === editImg.id ? { ...i, source: "manual" } : i));
            setEditImg(null);
          } : null}
        />
      )}

      {/* הסתייגות מחקרית */}
      {f.caveat && (
        <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 13, lineHeight: 1.8, padding: "0 4px", borderInlineStart: `2px solid ${P.border}`, paddingInlineStart: 12, marginBottom: 20 }}>⚠️ {f.caveat}</div>
      )}

      {/* משפט הסיום — מפת הידע החיה */}
      <div style={{ textAlign: "center", color: P.accentDim, fontFamily: F.body, fontSize: 14, lineHeight: 1.9, maxWidth: 620, margin: "0 auto", fontStyle: "italic" }}>
        כאן נפגשים כל החוטים הקשורים ל{card.title}. ככל שהמאגר גדל, גם רשת הקשרים ממשיכה להתפתח ולהיחשף.
      </div>
    </div>
  );
}

function Center({ children }) {
  const P = usePalette();
  return <div style={{ direction: "rtl", textAlign: "center", color: P.inkSoft, fontFamily: F.body, padding: "120px 24px", fontSize: 16 }}>{children}</div>;
}
