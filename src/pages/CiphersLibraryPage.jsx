import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { applySeo } from "../lib/seo.js";
import { track } from "../lib/tracking.js";
import { getSavedMatrices } from "../lib/elsMatrices.js";
import ShareActions from "../components/ShareActions.jsx";
import { useAuth } from "../lib/AuthContext.jsx";

// 📚 ספריית הצפנים — העדשה הקנונית על כל הצפנים המאושרים (els_records published).
// unified_graph_law: מקור אחד; כל צופן = כרטיס-תמונה שמפנה לעמוד הקנוני /codes/:slug (לא משכפל).
export default function CiphersLibraryPage() {
  const P = usePalette();
  const { isAdmin } = useAuth();
  const [items, setItems] = useState(null);

  useEffect(() => {
    track("codes-library");
    applySeo({
      title: "ספריית הצפנים — דילוגי אותיות (ELS) בתורה ובתנ״ך",
      description: "כל הצפנים שנחקרו ואומתו בסוד 1820 — דילוגי אותיות (ELS) עם המונח, הדילוג והממצאים. כל צופן בעמוד משלו, עם מחקר קהילתי ותצוגת תלת-מימד. עדות — לא ניבוי.",
      path: "/codes",
      image: "https://sod1820.co.il/api/card?w=" + encodeURIComponent("ספריית הצפנים") + "&sub=" + encodeURIComponent("דילוגי אותיות · ELS") + "&cap=" + encodeURIComponent("כל הצפנים שנחקרו ואומתו"),
    });
  }, []);

  useEffect(() => { getSavedMatrices(200).then(setItems).catch(() => setItems([])); }, []);
  const list = items || [];

  return (
    <div dir="rtl" style={{ background: P.pageBg, minHeight: "100vh", position: "relative", zIndex: 1 }}>
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "26px 16px 90px" }}>
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 12, letterSpacing: 4, textTransform: "uppercase", marginBottom: 6 }}>דילוגי אותיות · ELS</div>
          <h1 style={{ color: P.accentText, fontFamily: F.regal, fontSize: "clamp(26px,5vw,42px)", fontWeight: 800, margin: "0 0 8px" }}>📚 ספריית הצפנים</h1>
          <p style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 15, lineHeight: 1.8, maxWidth: 580, margin: "0 auto 14px" }}>
            כל הצפנים שנחקרו ואומתו — כל אחד בעמוד משלו, עם מחקר קהילתי ותלת-מימד. <b style={{ color: P.accentText }}>עדות — לא ניבוי.</b>
          </p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            <ShareActions type="codes" url="https://sod1820.co.il/codes" title="📚 ספריית הצפנים — דילוגי אותיות בתורה · סוד 1820" />
            <Link to="/code" style={{ display: "inline-flex", alignItems: "center", color: P.onAccent, background: P.accentBtn, borderRadius: 999, textDecoration: "none", fontFamily: F.heading, fontSize: 13, fontWeight: 800, padding: "9px 18px", minHeight: 40 }}>🔍 חפשו צופן משלכם ←</Link>
            {/* 🔬 כניסת-אדמין דיסקרטית לתיקיית-המחקר (unlisted) — רק אדמין רואה; גולשים רגילים לא */}
            {isAdmin && <Link to="/codes/מחקר" style={{ display: "inline-flex", alignItems: "center", color: P.accentDim, border: `1px dashed ${P.border}`, borderRadius: 999, textDecoration: "none", fontFamily: F.heading, fontSize: 12.5, fontWeight: 800, padding: "9px 16px", minHeight: 40 }}>🔬 תיקיית מחקר</Link>}
          </div>
        </div>

        {items === null ? (
          <div style={{ color: P.accentDim, fontFamily: F.body, textAlign: "center", padding: 50 }}>טוען…</div>
        ) : !list.length ? (
          <div style={{ color: P.accentDim, fontFamily: F.body, textAlign: "center", padding: "60px 20px", lineHeight: 1.8 }}>
            <div style={{ fontSize: 42, marginBottom: 8, opacity: 0.7 }}>🌱</div>
            עדיין אין צפנים בספרייה — היו הראשונים לחפש ולשמור צופן.
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
                  {m.positions?.quality?.stars ? (
                    <div style={{ color: P.accentText, fontFamily: F.body, fontSize: 12.5, letterSpacing: 0.5 }} title={m.positions.quality.verified ? "מובהקות מונטה-קרלו מדודה" : "הערכת איכות"}>
                      {"★".repeat(m.positions.quality.stars)}<span style={{ opacity: 0.3 }}>{"☆".repeat(5 - m.positions.quality.stars)}</span>
                    </div>
                  ) : null}
                  {m.author_name && <div style={{ color: P.inkSoft, fontFamily: F.heading, fontSize: 11, marginTop: "auto", paddingTop: 4 }}>✍️ {m.author_name}</div>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
