import React, { useState, Suspense } from "react";
import { Link } from "react-router-dom";
import { C, F } from "../theme.js";

// three.js כבד — נטען עצלן, רק בכניסה לעמוד הזה (לא מנפח את שאר האתר).
const NumberTree = React.lazy(() => import("../features/numbertree/NumberTree.jsx"));

// 🌳 עץ המספרים התלת-מימדי — פשוט וברור.
// מסתובב לבד · גוררים לסיבוב · גלגלת לזום · לוחצים על מספר ונפתח פס "פתח את הדף".
export default function NumbersPage() {
  const [sel, setSel] = useState(null); // {number, label}

  return (
    <div style={{ direction: "rtl", maxWidth: 1000, margin: "0 auto", padding: "24px 16px 80px", position: "relative", zIndex: 1 }}>
      {/* כותרת + משפט אחד */}
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <h1 style={{ color: C.goldBright, fontFamily: F.regal, fontSize: "clamp(26px,5vw,40px)", fontWeight: 700, margin: "0 0 8px" }}>
          🌳 עץ המספרים
        </h1>
        <p style={{ color: C.muted, fontFamily: F.body, fontSize: 15, lineHeight: 1.7, maxWidth: 520, margin: "0 auto" }}>
          כל כדור הוא מספר-שורש, והקווים הם הקשרים ביניהם. לחצו על מספר כדי לפתוח את הדף המלא שלו.
        </p>
      </div>

      {/* העץ עצמו — נטען עצלן עם הודעת טעינה */}
      <Suspense fallback={
        <div style={{ height: "clamp(420px, 70vh, 720px)", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 12, border: `1px solid ${C.border}`, background: "radial-gradient(ellipse at 50% 40%, #0d0a14 0%, #050307 100%)", color: C.goldDim, fontFamily: F.heading, fontSize: 14 }}>
          טוען את עץ המספרים…
        </div>
      }>
        <NumberTree
          height="clamp(420px, 70vh, 720px)"
          autoRotate
          highlightNumber={1820}
          onSelectNumber={(number, node) => setSel({ number, label: node?.label })}
        />
      </Suspense>

      {/* פס פעולה ברור — מופיע כשבוחרים מספר */}
      {sel && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 14, flexWrap: "wrap",
          marginTop: 16, padding: "14px 18px", borderRadius: 14,
          border: `1px solid ${C.borderGold}`, background: "rgba(212,175,55,0.08)",
        }}>
          <span style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 22, fontWeight: 800 }}>{sel.number}</span>
          {sel.label && <span style={{ color: C.goldDim, fontFamily: F.body, fontSize: 14 }}>{sel.label}</span>}
          <Link to={`/number/${sel.number}`} style={{
            textDecoration: "none", marginInlineStart: "auto",
            background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, color: "#1a0e00",
            fontFamily: F.heading, fontSize: 14.5, fontWeight: 800, padding: "10px 20px", borderRadius: 999,
          }}>פתח את הדף המלא של {sel.number} →</Link>
        </div>
      )}

      {/* הסבר שימוש קצר */}
      <div style={{ textAlign: "center", marginTop: 18, color: C.muted, fontFamily: F.heading, fontSize: 12, letterSpacing: 1 }}>
        גררו לסיבוב · גלגלת לזום · לחצו על כדור
      </div>
    </div>
  );
}
