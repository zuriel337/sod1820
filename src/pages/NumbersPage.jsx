import React, { Suspense } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { C, F } from "../theme.js";

// three.js כבד — נטען עצלן, רק בכניסה לעמוד הזה (לא מנפח את שאר האתר).
const NumberGraph = React.lazy(() => import("../features/numbertree/NumberGraph.jsx"));

// 🕸️ עץ המספרים הממוקד — המספר במרכז, חוטים לקשרים האמיתיים שלו.
export default function NumbersPage() {
  const [sp, setSp] = useSearchParams();
  const value = Math.max(1, parseInt(sp.get("n") || "1820", 10) || 1820);
  const setCenter = n => setSp({ n: String(n) }, { replace: false });

  return (
    <div style={{ direction: "rtl", maxWidth: 1000, margin: "0 auto", padding: "24px 16px 80px", position: "relative", zIndex: 1 }}>
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <h1 style={{ color: C.goldBright, fontFamily: F.regal, fontSize: "clamp(26px,5vw,40px)", fontWeight: 700, margin: "0 0 8px" }}>
          🕸️ עץ המספרים
        </h1>
        <p style={{ color: C.muted, fontFamily: F.body, fontSize: 15, lineHeight: 1.7, maxWidth: 540, margin: "0 auto" }}>
          המספר במרכז, והחוטים הם הקשרים האמיתיים שלו: התכנסויות (✦) ומספרים שמתכנסים יחד.
          לחצו על מספר כדי למרכז אותו · על ✦ לפתוח את ההתכנסות.
        </p>
      </div>

      <Suspense fallback={
        <div style={{ height: "clamp(420px, 70vh, 720px)", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 12, border: `1px solid ${C.border}`, background: "radial-gradient(ellipse at 50% 40%, #0d0a14 0%, #050307 100%)", color: C.goldDim, fontFamily: F.heading, fontSize: 14 }}>
          טוען את עץ המספרים…
        </div>
      }>
        <NumberGraph value={value} onCenter={setCenter} height="clamp(420px, 70vh, 720px)" autoRotate />
      </Suspense>

      {/* פס פעולה ברור — תמיד מציג את המספר שבמרכז */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, flexWrap: "wrap", marginTop: 16, padding: "14px 18px", borderRadius: 14, border: `1px solid ${C.borderGold}`, background: "rgba(212,175,55,0.08)" }}>
        <span style={{ color: C.muted, fontFamily: F.heading, fontSize: 12, letterSpacing: 1 }}>במרכז</span>
        <span style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 22, fontWeight: 800 }}>{value}</span>
        <Link to={`/number/${value}`} style={{ textDecoration: "none", marginInlineStart: "auto", background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, color: "#1a0e00", fontFamily: F.heading, fontSize: 14.5, fontWeight: 800, padding: "10px 20px", borderRadius: 999 }}>
          פתח את הדף המלא של {value} →
        </Link>
      </div>
    </div>
  );
}
