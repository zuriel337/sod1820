import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { F } from "../theme.js";
import { getPostsFromSupabase, getRealityCodePosts, REALITY_CODE_TAGS } from "../lib/supabase.js";
import { stripHtml, timeAgoHe } from "../lib/format.js";
import { applySeo } from "../lib/seo.js";
import { track } from "../lib/tracking.js";
import { setStream } from "../lib/stream.js";
import MatrixRain from "../components/MatrixRain.jsx";

// ===== בית-הקוד · עדשת «קוד המציאות» (/reality + root-swap) =====
// עץ אחד, עדשה שנייה: אותו API/DB כמו בית-המלוכה — רק מסגור (כהה/ניאון/טכנולוגי).
// "עדכונים" = פוסטי «מימד חמש» (שם פנימי — לא מוצג). שאר הפוסטים בקטן מתחת.

const ACCENT = "#7fc8ff";
// עולם «קוד המציאות» — עדשת המציאות/קולנוע. העדכונים הראשיים = כל התגיות של העולם הזה
// (מימד חמש · מטריקס · משחקי הדיונון · קולנוע), לא רק «מימד חמש». שמות פנימיים — לא מוצגים בכותרת.
const REALITY_TAG_SET = new Set(REALITY_CODE_TAGS);

// רשתות "קוד המציאות" — ערוץ וואטסאפ · אינסטגרם · פייסבוק (אייקוני מותג simple-icons)
const RC_ICONS = {
  wa: "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z",
  ig: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z",
  fb: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",
};
const REALITY_SOCIALS = [
  { k: "wa", label: "ערוץ וואטסאפ", href: "https://whatsapp.com/channel/0029Vb7CqG67Noa2cZUPug1k", bg: "linear-gradient(135deg,#25d366,#0e8a3c)" },
  { k: "ig", label: "אינסטגרם", href: "https://www.instagram.com/realitycode1820", bg: "linear-gradient(135deg,#feda75,#d62976,#962fbf,#4f5bd5)" },
  { k: "fb", label: "פייסבוק", href: "https://www.facebook.com/346556845479563", bg: "linear-gradient(135deg,#1877f2,#0a52b8)" },
];

const card = {
  display: "block", textDecoration: "none", background: "rgba(127,200,255,0.05)",
  border: "1px solid rgba(127,200,255,0.22)", borderRadius: 14, padding: 16,
  color: "#dfeaf3", transition: "border-color .2s, transform .2s",
};

// כרטיס מלא — לעדכונים הראשיים
function PostCard({ p }) {
  const excerpt = stripHtml(p.excerpt || p.content || "").slice(0, 150);
  return (
    <Link to={`/${p.slug}`} style={{ ...card, borderColor: "rgba(127,200,255,0.45)", background: "rgba(127,200,255,0.08)" }}>
      {p.image_url && (
        <div style={{ marginBottom: 12, borderRadius: 10, overflow: "hidden", maxHeight: 200 }}>
          <img src={p.image_url} alt="" style={{ width: "100%", objectFit: "cover", display: "block" }} loading="lazy" />
        </div>
      )}
      <div style={{ fontFamily: F.regal, fontSize: 19, fontWeight: 800, color: "#eaf2fa", lineHeight: 1.35, marginBottom: 6 }}>
        {p.title}
      </div>
      {excerpt && <div style={{ fontSize: 13.5, color: "#9fb4c6", lineHeight: 1.7 }}>{excerpt}…</div>}
      <div style={{ marginTop: 10, fontSize: 11.5, color: "#6f8ea1", fontFamily: F.heading, letterSpacing: 1 }}>
        {timeAgoHe(p.modified || p.date)}
      </div>
    </Link>
  );
}

// כרטיס קומפקטי — לשאר הפוסטים (קטן ונחמד)
function MiniCard({ p }) {
  return (
    <Link to={`/${p.slug}`} className="hr-mini" style={{ display: "flex", gap: 11, alignItems: "center", textDecoration: "none",
      background: "rgba(127,200,255,0.04)", border: "1px solid rgba(127,200,255,0.16)", borderRadius: 11, padding: 9,
      transition: "border-color .2s, background .2s" }}>
      {p.image_url
        ? <img src={p.image_url} alt="" style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 8, flexShrink: 0 }} loading="lazy" />
        : <span style={{ width: 48, height: 48, borderRadius: 8, flexShrink: 0, background: "rgba(127,200,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🔢</span>}
      <span style={{ color: "#bccedd", fontFamily: F.regal, fontSize: 13.5, fontWeight: 700, lineHeight: 1.4 }}>{stripHtml(p.title)}</span>
    </Link>
  );
}

export default function HomeReality() {
  const nav = useNavigate();
  const [featured, setFeatured] = useState([]);   // «מימד חמש» — העדכונים הראשיים
  const [minor, setMinor] = useState([]);          // שאר הפוסטים — קטן מתחת
  const [q, setQ] = useState("");
  const go = e => { e.preventDefault(); const v = q.trim(); if (v) nav(`/number/${encodeURIComponent(v)}`); };

  useEffect(() => {
    track("home_reality");
    applySeo({ title: "קוד המציאות — סוד 1820", description: "המספרים שמאחורי המציאות: דפוסים, צירופים והקוד שמתחת לפני השטח.", path: "/reality" });
    getRealityCodePosts(9).then(posts => setFeatured(posts || [])).catch(() => {});
    getPostsFromSupabase({ limit: 20, orderBy: "modified" }).then(({ posts }) => {
      setMinor((posts || []).filter(p => !(p.tags || []).some(t => REALITY_TAG_SET.has(t))).slice(0, 8));
    }).catch(() => {});
  }, []);

  // מעבר ל«כי לה' המלוכה» (האתר המלא) — מתועד למדידת אחוז המעבר מול ההישארות.
  // חד-כיווני בכוונה: אין כפתור חזרה מהאתר המלא לכאן (ניסוי נטישה).
  const goKingdom = () => {
    track("stream_switch", "to-kingdom", "click", { from: "reality" });
    setStream("kingdom");
    nav("/");
  };

  return (
    <div style={{ direction: "rtl", background: "#070b12", minHeight: "100vh", color: "#dfeaf3" }}>
      <style>{`
        .hr-gate { transition: transform .18s, box-shadow .18s, border-color .18s; }
        .hr-gate::before { content:""; position:absolute; inset:0; background:radial-gradient(circle at 50% 0%, rgba(232,200,74,0.16), transparent 70%); pointer-events:none; }
        .hr-gate:hover { transform: translateY(-3px); border-color: rgba(232,200,74,0.8) !important;
          box-shadow: 0 20px 56px rgba(0,0,0,0.6), 0 0 36px rgba(232,200,74,0.22), inset 0 0 46px rgba(232,200,74,0.1) !important; }
        .hr-mini:hover { border-color: rgba(127,200,255,0.4) !important; background: rgba(127,200,255,0.08) !important; }
      `}</style>

      {/* הירו — עם מטריקס-ריין מאחור */}
      <div style={{ position: "relative", overflow: "hidden", borderBottom: "1px solid rgba(127,200,255,0.12)" }}>
        <MatrixRain color={ACCENT} />
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, rgba(7,11,18,0.45) 0%, rgba(7,11,18,0.82) 70%)", pointerEvents: "none" }} />
        <div style={{ position: "relative", zIndex: 1, textAlign: "center", padding: "64px 16px 44px", maxWidth: 720, margin: "0 auto" }}>
          <div style={{ fontFamily: F.heading, fontSize: 12.5, letterSpacing: 6, color: ACCENT, textTransform: "uppercase", marginBottom: 12, opacity: 0.9 }}>
            🎬 העדשה החילונית
          </div>
          <h1 style={{ fontFamily: F.regal, fontSize: "clamp(38px,8vw,68px)", fontWeight: 900, margin: "0 0 12px", color: "#eaf2fa", textShadow: `0 0 60px rgba(127,200,255,0.45)` }}>
            קוד המציאות
          </h1>
          <p style={{ fontSize: 17, color: "#aebfcd", maxWidth: 560, margin: "0 auto 26px", lineHeight: 1.8 }}>
            מתחת לכל מספר מסתתר דפוס. אותו מנוע, אותה אמת — עדשה שמסתכלת על המציאות כעל <strong style={{ color: ACCENT }}>קוד</strong>.
          </p>
          <form onSubmit={go} style={{ display: "flex", gap: 8, maxWidth: 420, margin: "0 auto" }}>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="הקלד מספר או מילה…"
              style={{ flex: 1, padding: "12px 16px", borderRadius: 999, border: `1px solid rgba(127,200,255,0.4)`, background: "rgba(7,11,18,0.6)", color: "#eaf2fa", fontSize: 15, fontFamily: F.body, outline: "none" }} />
            <button type="submit" style={{ padding: "12px 22px", borderRadius: 999, border: "none", background: ACCENT, color: "#06121f", fontWeight: 800, fontFamily: F.heading, cursor: "pointer" }}>
              פענח
            </button>
          </form>

          {/* רשתות קוד המציאות — ערוץ וואטסאפ · אינסטגרם · פייסבוק */}
          <div style={{ marginTop: 24 }}>
            <div style={{ fontFamily: F.heading, fontSize: 11.5, letterSpacing: 3, color: "#7f97ab", textTransform: "uppercase", marginBottom: 11 }}>
              הצטרפו לקוד המציאות
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              {REALITY_SOCIALS.map(s => (
                <a key={s.k} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label}
                  style={{ display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none",
                    padding: "10px 18px", borderRadius: 999, fontFamily: F.heading, fontWeight: 800, fontSize: 14,
                    color: "#fff", background: s.bg, boxShadow: "0 4px 18px rgba(0,0,0,0.45)" }}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden><path d={RC_ICONS[s.k]} /></svg>
                  {s.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 18px 80px" }}>

        {/* עדכונים — ממורכז (פוסטי «מימד חמש», בלי להציג את השם) */}
        <section style={{ marginTop: 40 }}>
          <h2 style={{ fontFamily: F.regal, fontSize: 26, fontWeight: 900, color: "#eaf2fa", textAlign: "center", margin: "0 0 22px" }}>עדכונים</h2>
          {featured.length === 0 ? (
            <div style={{ color: "#7f97ab", padding: 20, textAlign: "center" }}>טוען…</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 16 }}>
              {featured.map(p => <PostCard key={p.id || p.wp_id} p={p} />)}
            </div>
          )}
        </section>

        {/* שאר הפוסטים — קטן ונחמד */}
        {minor.length > 0 && (
          <section style={{ marginTop: 40 }}>
            <h3 style={{ fontFamily: F.heading, fontSize: 12.5, fontWeight: 700, letterSpacing: 2, color: "#6f8ea1", textAlign: "center", marginBottom: 16, textTransform: "uppercase" }}>עוד מהאתר</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 10 }}>
              {minor.map(p => <MiniCard key={p.id || p.wp_id} p={p} />)}
            </div>
          </section>
        )}

        {/* מעבר לאתר המלא — באנר מלכותי, חד-כיווני, מתועד */}
        <div className="hr-gate" onClick={goKingdom} role="button" tabIndex={0}
          onKeyDown={e => { if (e.key === "Enter" || e.key === " ") goKingdom(); }}
          style={{ margin: "52px auto 0", maxWidth: 540, cursor: "pointer", position: "relative", overflow: "hidden",
            borderRadius: 22, padding: "32px 26px", textAlign: "center",
            background: "linear-gradient(135deg, rgba(58,44,8,0.92), rgba(18,14,5,0.96))",
            border: "1px solid rgba(232,200,74,0.45)",
            boxShadow: "0 16px 48px rgba(0,0,0,0.55), inset 0 0 46px rgba(232,200,74,0.07)" }}>
          <div style={{ fontSize: 40, marginBottom: 8, filter: "drop-shadow(0 0 16px rgba(232,200,74,0.5))" }}>👑</div>
          <div style={{ fontFamily: F.regal, fontWeight: 900, fontSize: 26, color: "#f6e27a", textShadow: "0 1px 16px rgba(232,200,74,0.3)", marginBottom: 7 }}>
            מעבר לאתר המלא
          </div>
          <div style={{ fontSize: 14, color: "#cbb87f", fontFamily: F.heading, letterSpacing: 1 }}>
            כי לה' המלוכה · עולם הגאולה והמלכות&nbsp;→
          </div>
        </div>
      </div>
    </div>
  );
}
