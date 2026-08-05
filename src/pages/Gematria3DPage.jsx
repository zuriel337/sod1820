import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { applySeo } from "../lib/seo.js";
import { track } from "../lib/tracking.js";
import ShareActions from "../components/ShareActions.jsx";
import GematriaCube from "../components/GematriaCube.jsx";
import { SPATIAL_FRAMEWORK, SPATIAL_MODELS } from "../lib/spatialModels.js";

// ===== מדור «גימטריה מרחבית — הגיאומטריה של העץ» =====
// ענף מחקר data-driven (src/lib/spatialModels.js): כל מודל עובר 4 שכבות (טקסט→גימטריה→מבנה→צורה),
// עם הפרדה חדה בין ממצא מאומת לרובד פרשני. הכל מתכנס ל-1820. כל צורה עתידית מצטרפת בלי לגעת בשלד.

// שבב בעמוד-השדרה
function SpineChip({ P, icon, title, text }) {
  return (
    <div style={{ flex: "1 1 180px", minWidth: 160, textAlign: "center", background: P.cardSoft, border: `1px solid ${P.border}`, borderRadius: 14, padding: "12px 14px" }}>
      <div style={{ fontSize: 22, lineHeight: 1 }}>{icon}</div>
      <div style={{ fontFamily: F.heading, fontWeight: 800, fontSize: 14.5, color: P.accentText, marginTop: 5 }}>{title}</div>
      <div style={{ fontFamily: F.body, fontSize: 12.5, color: P.inkSoft, marginTop: 3, lineHeight: 1.5 }}>{text}</div>
    </div>
  );
}

// כותרת-שכבה בתוך כרטיס-מודל
function LayerHead({ P, icon, title }) {
  return (
    <div style={{ fontFamily: F.heading, fontWeight: 800, fontSize: 13, color: P.accentDim, letterSpacing: "0.02em", margin: "16px 0 8px", display: "flex", alignItems: "center", gap: 6 }}>
      <span>{icon}</span><span>{title}</span>
      <span style={{ flex: 1, height: 1, background: P.border, marginInlineStart: 4 }} />
    </div>
  );
}

function ModelCard({ P, m }) {
  const L = Object.fromEntries(SPATIAL_FRAMEWORK.layers.map(l => [l.key, l]));
  return (
    <section style={{ background: P.cardGrad, border: `1px solid ${P.borderStrong}`, borderRadius: 20, padding: "22px 20px 26px", boxShadow: `0 10px 40px ${P.glow}`, marginTop: 26 }}>
      {/* כותרת המודל */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontFamily: F.heading, fontSize: 12.5, fontWeight: 700, color: P.onAccent, background: P.accentBtn, borderRadius: 999, padding: "3px 12px" }}>🧊 {m.form}</span>
        <h2 style={{ fontFamily: F.royal, fontWeight: 800, fontSize: "clamp(20px,4.5vw,28px)", color: P.ink, margin: 0 }}>{m.title}</h2>
        <span style={{ marginInlineStart: "auto", fontFamily: F.mono, fontWeight: 800, fontSize: 26, color: P.heroNum }}>{m.value}</span>
      </div>
      <div style={{ fontFamily: F.body, fontSize: 14, color: P.inkSoft, marginTop: 2 }}>{m.subtitle}</div>

      {/* שכבה 1 — הטקסט */}
      <LayerHead P={P} icon={L.text.icon} title={L.text.title} />
      <blockquote style={{ margin: "0", padding: "10px 16px", borderInlineStart: `3px solid ${P.accent}`, background: P.cardSoft, borderRadius: 8, fontFamily: F.royal, fontSize: 17, color: P.ink }}>
        «{m.text.quote}»
      </blockquote>
      <div style={{ fontFamily: F.body, fontSize: 12.5, color: P.accentDim, marginTop: 5 }}>{m.text.ref}</div>

      {/* שכבה 2 — הגימטריה (מאומת) */}
      <LayerHead P={P} icon={L.gematria.icon} title={L.gematria.title} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {m.gematria.map(([w, v]) => (
          <Link key={w} to={`/number/${encodeURIComponent(w)}`} style={{ textDecoration: "none", fontFamily: F.body, fontSize: 14, color: P.ink, background: P.cardSoft, border: `1px solid ${P.border}`, borderRadius: 999, padding: "5px 12px" }}>
            {w} = <b style={{ color: P.accentText, fontFamily: F.mono }}>{v}</b>
          </Link>
        ))}
      </div>

      {/* שכבה 3 — המבנה המתמטי */}
      <LayerHead P={P} icon={L.structure.icon} title={L.structure.title} />
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {m.structure.map((s, i) => (
          <div key={i} style={{ fontFamily: F.mono, fontSize: 14.5, color: P.ink, background: P.cardSoft, border: `1px solid ${P.border}`, borderRadius: 10, padding: "8px 14px" }}>{s}</div>
        ))}
      </div>

      {/* שכבה 4 — הצורה הגיאומטרית (אינטראקטיבי) */}
      <LayerHead P={P} icon={L.form.icon} title={L.form.title} />
      {m.image && (
        <figure style={{ margin: "0 0 14px", textAlign: "center" }}>
          <img src={m.image} alt={m.title} style={{ maxWidth: 380, width: "100%", borderRadius: 14, boxShadow: `0 8px 26px ${P.glow}`, border: `1px solid ${P.border}` }} />
        </figure>
      )}
      <GematriaCube {...m.cube} />

      {/* רובד פרשני — מופרד במפורש */}
      <div style={{ marginTop: 16, background: P.cardSoft, border: `1px dashed ${P.borderStrong}`, borderRadius: 12, padding: "12px 15px" }}>
        <div style={{ fontFamily: F.heading, fontWeight: 700, fontSize: 12.5, color: P.accentDim, marginBottom: 5 }}>✡️ רובד פרשני (רמז — לא עובדת-מנוע)</div>
        <div style={{ fontFamily: F.body, fontSize: 14.5, color: P.inkSoft, lineHeight: 1.7 }}>{m.midrash}</div>
      </div>

      {/* חיבור ל-1820 / לפוסט */}
      <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        {m.to1820 && (
          <span style={{ fontFamily: F.mono, fontSize: 13.5, fontWeight: 700, color: P.onAccent, background: P.accentBtn, borderRadius: 999, padding: "6px 14px" }}>⭐ {m.to1820}</span>
        )}
        {m.postSlug && <Link to={`/${m.postSlug}`} style={pill(P)}>לפוסט המלא →</Link>}
        <Link to={`/number/${m.value}`} style={pill(P)}>דף המספר {m.value} →</Link>
      </div>
    </section>
  );
}

export default function Gematria3DPage() {
  const P = usePalette();
  const FW = SPATIAL_FRAMEWORK;

  useEffect(() => {
    track("spatial-gematria");
    applySeo({
      title: "גימטריה מרחבית — הגיאומטריה של העץ · סוד 1820",
      description: "ענף מחקר: מספר הופך לצורה, וצורה הופכת למשמעות. כל מודל עובר 4 שכבות — טקסט, גימטריה מאומתת במנוע, מבנה מתמטי וצורה גיאומטרית. קוביית טוב (השגחה פרטית=1020) וקוביית אחד (רזא דשבת=910), מתכנסות ל-1820.",
      path: "/gematria-3d",
      image: "https://sod1820.co.il/api/card?w=" + encodeURIComponent("גימטריה מרחבית") + "&sub=" + encodeURIComponent("הגיאומטריה של העץ") + "&cap=" + encodeURIComponent("מספר → צורה → משמעות · מתכנס ל-1820"),
    });
  }, []);

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "22px 16px 60px", direction: "rtl" }}>
      {/* כותרת הענף */}
      <div style={{ textAlign: "center", marginBottom: 14 }}>
        <div style={{ fontFamily: F.heading, fontWeight: 700, fontSize: 12.5, letterSpacing: "0.18em", color: P.accentDim, textTransform: "uppercase" }}>ענף מחקר</div>
        <h1 style={{ fontFamily: F.royal, fontWeight: 800, fontSize: "clamp(30px,6.5vw,48px)", color: P.ink, margin: "6px 0 2px" }}>{FW.title}</h1>
        <div style={{ fontFamily: F.heading, fontSize: 17, color: P.accentText, marginBottom: 8 }}>{FW.subtitle}</div>
        <p style={{ fontFamily: F.body, fontSize: 15.5, color: P.inkSoft, maxWidth: 620, margin: "0 auto", lineHeight: 1.7 }}>{FW.intro}</p>
      </div>

      {/* עמוד השדרה: 🌳 → 📐 → ⭐ */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", alignItems: "stretch", margin: "6px 0 10px" }}>
        {FW.spine.map((s, i) => <SpineChip key={i} P={P} {...s} />)}
      </div>

      {/* ארבע השכבות של כל מחקר */}
      <div style={{ textAlign: "center", fontFamily: F.body, fontSize: 12.5, color: P.accentDim, margin: "6px 0 2px" }}>
        כל מודל עובר ארבע שכבות:&nbsp;
        {FW.layers.map((l, i) => (
          <span key={l.key} style={{ color: P.inkSoft }}>{i ? " · " : ""}{l.icon} {l.title.replace(" — מאומת במנוע", "")}</span>
        ))}
      </div>

      {/* המודלים */}
      {SPATIAL_MODELS.map(m => <ModelCard key={m.slug} P={P} m={m} />)}

      {/* התכנסות — 1820 */}
      <section style={{ marginTop: 28, textAlign: "center", background: P.cardSoft, border: `1px solid ${P.borderStrong}`, borderRadius: 18, padding: "22px 20px" }}>
        <div style={{ fontSize: 28 }}>⭐</div>
        <h2 style={{ fontFamily: F.royal, fontWeight: 800, fontSize: "clamp(24px,5vw,34px)", color: P.heroNum, margin: "4px 0 6px" }}>1820 — שורש העץ</h2>
        <p style={{ fontFamily: F.body, fontSize: 15, color: P.inkSoft, maxWidth: 620, margin: "0 auto 10px", lineHeight: 1.7 }}>
          כל המודלים המרחביים יושבים על אותו שורש. «קוביית אחד» מגיעה אליו במפורש: <b style={{ color: P.accentText, fontFamily: F.mono }}>שרית + שרית = 1820 = סוד × יהוה</b> (70 × 26) — לב הסוד של האתר.
        </p>
        <Link to="/number/1820" style={pill(P)}>אל שורש 1820 →</Link>
      </section>

      <div style={{ marginTop: 20, textAlign: "center" }}>
        <ShareActions type="page" url="https://sod1820.co.il/gematria-3d" title="גימטריה מרחבית — הגיאומטריה של העץ · סוד 1820" />
      </div>

      <p style={{ fontFamily: F.body, fontSize: 12.5, color: P.accentDim, textAlign: "center", marginTop: 24, lineHeight: 1.7 }}>
        זו שפה, לא אוסף דוגמאות. כל צורה עתידית — כדור, פירמידה, ספירלה — תצטרף לאותו ענף ולאותן ארבע שכבות.
      </p>
    </div>
  );
}

function pill(P) {
  return { textDecoration: "none", fontFamily: F.heading, fontWeight: 700, fontSize: 13, color: P.accentText, background: P.cardSoft, border: `1px solid ${P.border}`, borderRadius: 999, padding: "8px 16px" };
}
