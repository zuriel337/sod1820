import React from "react";

// 📜 «כתובת החומה» — הפסוק זכריה יג,ט חקוק ברקע כל עמודי-הפנים (לא דף הבית).
// שכבה קבועה מתחת לתוכן (zIndex:0, pointerEvents:none), חקיקה עדינה בזהב/ברונזה עם תבליט,
// עובדת בשני המצבים (city_background_dual_theme_law): כהה=זהב-עמום על הקוסמוס, בהיר=ברונזה חקוקה.
// עוצמה נמוכה כדי לא לפגוע בקריאוּת. הפעימה השלישית («הוא יקרא בשמי ואני אענה») מעט בולטת — הלב.
const SERIF = "'Frank Ruhl Libre','David Libre','Times New Roman',serif";

export default function VerseBackground({ dark = true }) {
  const t = dark
    ? { color: "#e9c84a", key: "#f0d774", op: 0.055, emboss: "0 1px 0 rgba(255,240,190,0.10), 0 -1px 1px rgba(0,0,0,0.6)" }
    : { color: "#7a5410", key: "#8a5f10", op: 0.075, emboss: "0 1px 0 rgba(255,255,255,0.5), 0 -1px 1px rgba(120,90,30,0.28)" };

  const line = {
    fontSize: "clamp(30px,7.2vw,104px)",
    lineHeight: 1.12,
    fontWeight: 700,
    letterSpacing: "0.01em",
    whiteSpace: "nowrap",
    maxWidth: "100%",
    textShadow: t.emboss,
  };

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "min(4.5vh,58px)",
        textAlign: "center",
        padding: "0 4vw",
        fontFamily: SERIF,
        color: t.color,
        opacity: t.op,
      }}
    >
      <div style={line}>וּצְרַפְתִּים כִּצְרֹף אֶת־הַכֶּסֶף</div>
      <div style={line}>וּבְחַנְתִּים כִּבְחֹן אֶת־הַזָּהָב</div>
      <div style={{ ...line, color: t.key }}>הוּא יִקְרָא בִשְׁמִי וַאֲנִי אֶעֱנֶה</div>
      <div style={{ fontSize: "clamp(13px,1.5vw,20px)", letterSpacing: "0.28em", opacity: 0.7, fontWeight: 400 }}>
        זְכַרְיָה יג׳, ט׳
      </div>
    </div>
  );
}
