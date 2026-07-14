import React from "react";

// 🔠 הצופן התנ״כי — כלי דילוגי-האותיות (ELS) העצמאי, מוטמע כ-iframe מ-public/tzofen.html.
// דפוס זהה ל-heichal.html (HeichalPage). מקור-יחיד — «מציירים פעם אחת, מפנים מכל מקום»:
// אותו כלי מוצג ב-/code (עמוד מלא) ובהיכל/סביבת-המחקר (/research?tool=els).
// הכלי נטען-מהיר (נתונים דחוסים, פענוח בעצלתיים) ומכיל את כל התנ״ך.
// seed → נזרע לתוך שדה-החיפוש של הכלי (?q=). embed=1 מקצץ את ההירו הכפול (הסרגל של האתר כבר ממתג).
export default function TzofenEmbed({ seed = "", full = false }) {
  const src =
    "/tzofen.html?embed=1" + (seed ? "&q=" + encodeURIComponent(seed) : "");
  return (
    <iframe
      key={seed || "els"}
      src={src}
      title="הצופן התנ״כי — דילוגי אותיות (ELS)"
      loading="lazy"
      allow="clipboard-write; clipboard-read"
      style={{
        width: "100%",
        height: full ? "calc(100dvh - 58px)" : "calc(100dvh - 130px)",
        minHeight: 620,
        border: "none",
        display: "block",
        borderRadius: full ? 0 : 14,
        background: "transparent",
      }}
    />
  );
}
