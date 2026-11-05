import React, { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { applySeo } from "../lib/seo.js";
import { use2029Palette } from "../lib/palette2029.js";
import { TYPEFACE } from "../lib/designTokens.js";

// 2029-owned not-found content (rendered inside Sod2029Shell). noindex; same copy and SEO as before.
export default function NotFound2029Page() {
  const loc = useLocation();
  const P = use2029Palette();

  useEffect(() => {
    applySeo({
      title: "העמוד לא נמצא",
      description: "הכתובת שביקשתם אינה קיימת ב-SOD1820.",
      path: loc.pathname,
      noindex: true,
    });
  }, [loc.pathname]);

  return <main style={{ direction: "rtl", minHeight: "62vh", display: "grid", placeItems: "center", padding: "48px 18px" }}>
    <section style={{ maxWidth: 680, textAlign: "center", color: P.ink }}>
      <div style={{ fontFamily: TYPEFACE.ui, fontSize: 12, letterSpacing: ".12em", color: P.accentDim }}>404 · SOD1820</div>
      <h1 style={{ fontFamily: TYPEFACE.display, fontSize: "clamp(30px,7vw,52px)", margin: "12px 0" }}>העמוד לא נמצא</h1>
      <p style={{ color: P.inkSoft, lineHeight: 1.8 }}>הכתובת שביקשתם אינה קיימת או הוחלפה.</p>
      <Link to="/" style={{ display: "inline-block", marginTop: 18, color: P.accentText, fontWeight: 800 }}>חזרה לדף הראשי</Link>
    </section>
  </main>;
}
