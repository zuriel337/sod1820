import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { applySeo } from "../lib/seo.js";
import { track } from "../lib/tracking.js";
import { getResearchMatrices } from "../lib/elsMatrices.js";
import ShareActions from "../components/ShareActions.jsx";

// 🔬 תיקיית-המחקר (unlisted) — עדשה על els_records where source='research'.
// לא מקושרת מהתפריט/בית/כלי; מוסתרת מ-/codes הראשי (getSavedMatrices מסנן research).
// רק מי שנכנס לכתובת רואה. noindex — לא נכנס לגוגל (share_placement/legacy_content לא רלוונטי).
export default function ResearchCodesPage() {
  const P = usePalette();
  const [items, setItems] = useState(null);

  useEffect(() => {
    track("codes-research");
    applySeo({
      title: "תיקיית המחקר — צירים ארוכים (ELS) בתנ״ך · סוד 1820",
      description: "אוסף-מחקר פנימי של דילוגי-אותיות ארוכים שנמצאו בתנ״ך. עדות — לא ניבוי.",
      path: "/codes/מחקר",
    });
    // 🙈 unlisted — לא נאנדקס בגוגל
    const meta = document.createElement("meta");
    meta.name = "robots"; meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => { try { document.head.removeChild(meta); } catch { /* noop */ } };
  }, []);

  useEffect(() => { getResearchMatrices(200).then(setItems).catch(() => setItems([])); }, []);
  const list = items || [];

  return (
    <div dir="rtl" style={{ background: P.pageBg, minHeight: "100vh", position: "relative", zIndex: 1 }}>
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "26px 16px 90px" }}>
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 12, letterSpacing: 4, textTransform: "uppercase", marginBottom: 6 }}>אוסף פנימי · unlisted</div>
          <h1 style={{ color: P.accentText, fontFamily: F.regal, fontSize: "clamp(26px,5vw,42px)", fontWeight: 800, margin: "0 0 8px" }}>🔬 תיקיית המחקר</h1>
          <p style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 15, lineHeight: 1.8, maxWidth: 600, margin: "0 auto 14px" }}>
            הצירים הארוכים ביותר שנמצאו כדילוגי-אותיות בכל התנ״ך — אוסף-מחקר שאינו מוצג בספרייה הראשית. <b style={{ color: P.accentText }}>עדות — לא ניבוי.</b>
          </p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            <Link to="/codes" style={{ display: "inline-flex", alignItems: "center", color: P.accentDim, border: `1px solid ${P.border}`, borderRadius: 999, textDecoration: "none", fontFamily: F.heading, fontSize: 12.5, fontWeight: 800, padding: "9px 16px", minHeight: 40 }}>📚 לספריית הצפנים ←</Link>
          </div>
        </div>

        {items === null ? (
          <div style={{ color: P.accentDim, fontFamily: F.body, textAlign: "center", padding: 50 }}>טוען…</div>
        ) : !list.length ? (
          <div style={{ color: P.accentDim, fontFamily: F.body, textAlign: "center", padding: "60px 20px", lineHeight: 1.8 }}>
            <div style={{ fontSize: 42, marginBottom: 8, opacity: 0.7 }}>🔬</div>
            התיקייה ריקה כרגע.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 15 }}>
            {list.map(m => (
              <Link key={m.id} to={`/codes/${encodeURIComponent(m.slug || m.id)}`}
                style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 14, overflow: "hidden", textDecoration: "none", display: "flex", flexDirection: "column", transition: "border-color .15s, transform .12s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = P.accent; e.currentTarget.style.transform = "translateY(-3px)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = P.border; e.currentTarget.style.transform = "none"; }}>
                {m.image_url ? (
                  <img src={m.image_url} alt={m.title || m.search_term} loading="lazy" style={{ width: "100%", aspectRatio: "1200 / 630", objectFit: "cover", background: "#0a0700", display: "block" }} />
                ) : (
                  <div style={{ width: "100%", aspectRatio: "1200 / 630", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, background: P.cardGrad || P.cardSoft, color: P.accentText, fontFamily: F.regal, fontSize: 22, fontWeight: 800, textAlign: "center", padding: 12 }}><img src="/els-icon.png" alt="" width="44" height="44" style={{ borderRadius: 10, objectFit: "cover" }} />{m.search_term}</div>
                )}
                <div style={{ padding: "11px 13px", display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
                  <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 15.5, fontWeight: 800 }}>{m.title || m.search_term}</div>
                  <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 12 }}>
                    {m.skip_distance ? `דילוג ${m.skip_distance}` : ""}{m.scope === "tanakh" ? " · כל התנ״ך" : m.skip_distance ? " · תורה" : ""}
                  </div>
                  {m.author_name && <div style={{ color: P.inkSoft, fontFamily: F.heading, fontSize: 11, marginTop: "auto", paddingTop: 4 }}>✍️ {m.author_name}</div>}
                </div>
              </Link>
            ))}
          </div>
        )}

        <div style={{ marginTop: 26, display: "flex", justifyContent: "center" }}>
          <ShareActions type="codes-research" url="https://sod1820.co.il/codes/מחקר" title="🔬 תיקיית המחקר — צירים ארוכים בתנ״ך · סוד 1820" />
        </div>
      </div>
    </div>
  );
}
