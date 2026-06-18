import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { applySeo } from "../lib/seo.js";

// ===== עמוד היכל השערים — חוויה מלאה (/היכל · /heichal) =====
// מטמיע את public/heichal.html במסך מלא (מחוץ ל-Layout — בלי ניווט/פוטר).
// הדלתות מנווטות לעמודי האתר (window.top.location בתוך heichal.html) —
// כלומר מעבר חדר-לחדר אמיתי. הפרמטר ?demo=1 ממפה את דלת המספרים
// ל"עץ המספרים → דף הסולמות" (/sulamot) כהדגמה, בלי לגעת ב-DB.
export default function HeichalPage() {
  useEffect(() => {
    applySeo({
      title: "היכל השערים — סוד 1820",
      description: "היכל השערים של סוד 1820 — מעבר חדר-לחדר בין עולמות האתר.",
      path: "/heichal",
    });
  }, []);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, background: "#06050d" }}>
      <iframe
        src="/heichal.html?demo=1"
        title="היכל השערים"
        allow="autoplay"
        style={{ width: "100%", height: "100%", border: "none", display: "block" }}
      />
      <Link to="/בית-חדש" aria-label="חזרה לעמוד הבית" style={{
        position: "fixed", top: 14, insetInlineStart: 14, zIndex: 61,
        background: "rgba(8,5,2,.72)", color: "#f6e27a",
        border: "1px solid rgba(212,175,55,.42)", borderRadius: 999,
        padding: "8px 16px", fontFamily: "'Heebo', sans-serif", fontWeight: 700,
        fontSize: 14, textDecoration: "none", backdropFilter: "blur(4px)",
      }}>← חזרה</Link>
    </div>
  );
}
