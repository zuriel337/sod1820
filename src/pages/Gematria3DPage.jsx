import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { applySeo } from "../lib/seo.js";
import { track } from "../lib/tracking.js";
import ShareActions from "../components/ShareActions.jsx";
import ProvidenceCube from "../components/ProvidenceCube.jsx";

// ===== מדור «גימטריה תלת-ממדית» =====
// unified_graph_law: עדשה על העץ, לא מערכת מקבילה. כל דוגמה = מודל חזותי תלת-ממדי שממחיש התכנסות מאומתת.
// דוגמת-הדגל: «השגחה פרטית = 1020» — קובייה בת 6 פאות, בכל פאה «טוב» 10 פעמים → 6×10×17 = 1020.
// המנוע אימת: טוב=17 · אמונה=102 (×10=1020) · השגחה פרטית=1020. עובדה מופרדת מרמז (כבוד לרמז).

// שלב באינפוגרפיקה האנכית
function Step({ P, k, v, note, big }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{
        minWidth: 220, textAlign: "center", padding: big ? "14px 22px" : "10px 18px", borderRadius: 14,
        background: big ? P.accentBtn : P.cardSoft, border: `1px solid ${big ? "transparent" : P.border}`,
        boxShadow: big ? `0 8px 26px ${P.glow}` : "none",
      }}>
        <div style={{
          fontFamily: F.mono, fontWeight: 800, fontSize: big ? 30 : 20,
          color: big ? P.onAccent : P.accentText, lineHeight: 1.1,
        }}>{k}</div>
        {v != null && <div style={{ fontFamily: F.heading, fontSize: 13, color: big ? P.onAccent : P.inkSoft, marginTop: 3 }}>{v}</div>}
        {note && <div style={{ fontFamily: F.body, fontSize: 11.5, color: big ? P.onAccent : P.accentDim, marginTop: 2 }}>{note}</div>}
      </div>
    </div>
  );
}
function Arrow({ P }) {
  return <div aria-hidden style={{ color: P.accentDim, fontSize: 20, lineHeight: 1, margin: "4px 0" }}>↓</div>;
}

// מקטע בכרטיס-הגילוי (כותרת + תוכן)
function Block({ P, icon, title, children }) {
  return (
    <div style={{ borderTop: `1px solid ${P.border}`, paddingTop: 16, marginTop: 16 }}>
      <div style={{ fontFamily: F.heading, fontWeight: 800, fontSize: 15, color: P.accentText, marginBottom: 8 }}>
        {icon} {title}
      </div>
      <div style={{ fontFamily: F.body, fontSize: 15.5, lineHeight: 1.8, color: P.inkSoft }}>{children}</div>
    </div>
  );
}

export default function Gematria3DPage() {
  const P = usePalette();

  useEffect(() => {
    track("gematria-3d");
    applySeo({
      title: "גימטריה תלת-ממדית — השגחה פרטית = 1020 · סוד 1820",
      description: "מדור הגימטריה התלת-ממדית: לא רק מספר — מודל חזותי. הקובייה הרוחנית «השגחה פרטית = 1020»: 6 פאות, בכל פאה «טוב» 10 פעמים, 6×10×17 = 1020 = אמונה×10. עובדה מאומתת במנוע.",
      path: "/gematria-3d",
      image: "https://sod1820.co.il/api/card?w=" + encodeURIComponent("השגחה פרטית = 1020") + "&sub=" + encodeURIComponent("גימטריה תלת-ממדית") + "&cap=" + encodeURIComponent("6 פאות · 60 פעמים «טוב» · 60×17=1020"),
    });
  }, []);

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "22px 16px 60px", direction: "rtl" }}>
      {/* כותרת המדור */}
      <div style={{ textAlign: "center", marginBottom: 6 }}>
        <div style={{ fontFamily: F.heading, fontWeight: 700, fontSize: 12.5, letterSpacing: "0.18em", color: P.accentDim, textTransform: "uppercase" }}>
          גימטריה תלת-ממדית
        </div>
        <h1 style={{ fontFamily: F.royal, fontWeight: 800, fontSize: "clamp(28px,6vw,44px)", color: P.ink, margin: "6px 0 4px" }}>
          הַשְׁגָּחָה פְּרָטִית = <span style={{ color: P.heroNum, fontFamily: F.mono }}>1020</span>
        </h1>
        <p style={{ fontFamily: F.body, fontSize: 15.5, color: P.inkSoft, maxWidth: 620, margin: "0 auto", lineHeight: 1.7 }}>
          לא רק מספר — <b style={{ color: P.accentText }}>מודל חזותי</b>. סובבו את הקובייה הרוחנית והאירו את שש פאותיה,
          וראו כיצד «טוב» בונה את מעטפת האור סביב האדם.
        </p>
      </div>

      {/* הקובייה האינטראקטיבית */}
      <div style={{ margin: "18px 0" }}>
        <ProvidenceCube />
      </div>

      {/* כרטיס-הגילוי המדורג */}
      <div style={{
        background: P.cardGrad, border: `1px solid ${P.borderStrong}`, borderRadius: 18,
        padding: "22px 22px 24px", boxShadow: `0 10px 40px ${P.glow}`,
      }}>
        <Block P={P} icon="📦" title="מבנה הקובייה">
          לקובייה <b style={{ color: P.accentText }}>6 דפנות</b>. בכל דופן מופיעה המילה «<b>טוב</b>» <b style={{ color: P.accentText }}>10 פעמים</b>.
          <br />סך הכול: <b style={{ color: P.accentText, fontFamily: F.mono }}>6 × 10 = 60</b> פעמים «טוב».
        </Block>

        <Block P={P} icon="🔢" title="ערך גימטרי">
          «טוב» = <b style={{ color: P.accentText, fontFamily: F.mono }}>17</b> ברגיל, ולכן:
          <br /><b style={{ color: P.accentText, fontFamily: F.mono }}>60 × 17 = 1020</b> · ו־<b style={{ color: P.accentText, fontFamily: F.mono }}>1020 = הַשְׁגָּחָה פְּרָטִית</b>.
        </Block>

        <Block P={P} icon="✡️" title="המשמעות (רמז)">
          הקובייה מסמלת מעטפת רוחנית: שש הדפנות מקיפות את האדם מכל הכיוונים, ובכל כיוון מאירה מידת ה«טוב».
          לכן המעטפת השלמה מורכבת מ־60 הופעות של «טוב», שערכן הכולל 1020 —
          וזוהי גם «אמונה» × 10 (אמונה=102), האמונה המתפשטת דרך עשר הספירות.
        </Block>

        <Block P={P} icon="📖" title="מקור הרעיון">
          <blockquote style={{
            margin: "6px 0", padding: "10px 16px", borderInlineStart: `3px solid ${P.accent}`,
            background: P.cardSoft, borderRadius: 8, fontFamily: F.royal, fontSize: 17, color: P.ink,
          }}>
            «וַיַּרְא אֱלֹהִים אֶת הָאוֹר כִּי <b style={{ color: P.accentText }}>טוֹב</b>»
          </blockquote>
          האור האלוקי מתפשט לכל הכיוונים, והקובייה מסמלת הגנה של אור מכל ששת צדדיה.
        </Block>
      </div>

      {/* אינפוגרפיקה אנכית — הלוגיקה בשנייה */}
      <div style={{ margin: "26px auto 0", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ fontFamily: F.heading, fontWeight: 700, fontSize: 13, color: P.accentDim, marginBottom: 12 }}>הלוגיקה במבט אחד</div>
        <Step P={P} k="6 דפנות" v="פאות הקובייה" />
        <Arrow P={P} />
        <Step P={P} k="× 10 «טוב»" v="בכל דופן" />
        <Arrow P={P} />
        <Step P={P} k="60" v="פעמים «טוב»" />
        <Arrow P={P} />
        <Step P={P} k="60 × 17" v="«טוב» = 17" />
        <Arrow P={P} />
        <Step P={P} k="1020" v="הַשְׁגָּחָה פְּרָטִית" big />
      </div>

      {/* ריבוע-עובדה קנוני — התכנסות מאומתת */}
      <div style={{
        marginTop: 28, background: P.cardSoft, border: `1px solid ${P.borderStrong}`, borderRadius: 16, padding: "16px 18px",
      }}>
        <div style={{ fontFamily: F.heading, fontWeight: 800, fontSize: 14.5, color: P.accentText, marginBottom: 8 }}>
          🔢 גימטריה — עובדה מאומתת במנוע
        </div>
        <div style={{ fontFamily: F.body, fontSize: 15.5, lineHeight: 1.9, color: P.ink }}>
          <div><b style={{ color: P.heroNum, fontFamily: F.mono }}>1020</b> = הַשְׁגָּחָה פְּרָטִית = אֱמוּנָה × 10 (אמונה=102) = 60 × «טוב» (טוב=17)</div>
        </div>
        <div style={{ fontFamily: F.body, fontSize: 12.5, color: P.accentDim, marginTop: 8, lineHeight: 1.6 }}>
          העובדה: שלושת הביטויים מתכנסים ל-1020 (רגיל, מאומת במנוע הרשמי). מבנה 6×10 והמעטפת התלת-ממדית = רובד פרשני (רמז) המלביש את העובדה.
        </div>
      </div>

      {/* חיבור לעץ + שיתוף */}
      <div style={{ marginTop: 22, display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", justifyContent: "center" }}>
        <Link to="/number/1020" style={pill(P)}>1020 — דף המספר →</Link>
        <Link to={`/number/${encodeURIComponent("השגחה פרטית")}`} style={pill(P)}>השגחה פרטית — בעץ →</Link>
        <Link to={`/number/${encodeURIComponent("אמונה")}`} style={pill(P)}>אמונה →</Link>
      </div>

      <div style={{ marginTop: 18, textAlign: "center" }}>
        <ShareActions
          type="page"
          url="https://sod1820.co.il/gematria-3d"
          title="השגחה פרטית = 1020 — גימטריה תלת-ממדית · סוד 1820"
        />
      </div>

      <p style={{ fontFamily: F.body, fontSize: 12.5, color: P.accentDim, textAlign: "center", marginTop: 26, lineHeight: 1.7 }}>
        זו הדוגמה הראשונה במדור «גימטריה תלת-ממדית» — לא רק מספר, אלא מודל חזותי שממחיש את המשמעות. עוד קוביות בדרך.
      </p>
    </div>
  );
}

function pill(P) {
  return {
    textDecoration: "none", fontFamily: F.heading, fontWeight: 700, fontSize: 13,
    color: P.accentText, background: P.cardSoft, border: `1px solid ${P.border}`,
    borderRadius: 999, padding: "8px 16px",
  };
}
