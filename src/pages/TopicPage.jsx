import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { C, F } from "../theme.js";
import { getTopicCardBySlug, getGalleryImagesByIds } from "../lib/supabase.js";
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

  useEffect(() => {
    let live = true;
    setCard(undefined); setImgs([]);
    getTopicCardBySlug(slug).then(async c => {
      if (!live) return;
      setCard(c);
      if (c) {
        applySeo({ title: `${c.title} — מרכז ההתכנסות`, description: c.subtitle || "מפת הקשרים של SOD1820", path: `/topic/${slug}` });
        if ((c.image_ids || []).length) {
          try { setImgs(await getGalleryImagesByIds(c.image_ids)); } catch { /* ignore */ }
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
      </div>

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
            <ul style={{ margin: 0, paddingInlineStart: 22, color: "#d4ccbf", fontFamily: F.body, fontSize: 15, lineHeight: 2 }}>
              {f.bullets.map((b, i) => <li key={i}>{b}</li>)}
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

      {/* תמונות → ארכיון */}
      {imgs.length > 0 && (
        <div style={{ ...box, marginBottom: 20 }}>
          <div style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 18, fontWeight: 700, marginBottom: 10 }}>🖼 ממצאים בגלריות ({imgs.length})</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px,1fr))", gap: 10 }}>
            {imgs.map(im => (
              <a key={im.id} href={im.image_url} target="_blank" rel="noopener noreferrer" title={(im.ocr_numbers || []).join(" · ")}
                style={{ display: "block", aspectRatio: "1", borderRadius: 10, overflow: "hidden", border: `1px solid ${C.border}`, background: `center/cover no-repeat url(${im.image_url})` }} />
            ))}
          </div>
          <Link to="/archive" style={{ display: "inline-block", marginTop: 12, color: C.goldBright, fontFamily: F.heading, fontSize: 13, textDecoration: "none" }}>לכל הארכיון →</Link>
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
