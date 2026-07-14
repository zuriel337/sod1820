import React, { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "../lib/AuthContext.jsx";
import { track } from "../lib/tracking.js";
import SubscribeGate from "./SubscribeGate.jsx";

// 🔠 הצופן התנ״כי — כלי דילוגי-האותיות (ELS) העצמאי, מוטמע כ-iframe מ-public/tzofen.html.
// דפוס זהה ל-heichal.html. מקור-יחיד: אותו כלי ב-/code (מלא) ובהיכל (/research?tool=els).
//
// 🔐 שער-הרשמה (החלטת צוריאל): לא-רשום → עד 5 חיפושים רגילים · חיפוש-מוצלב = לרשומים בלבד.
//    רשום/אדמין → ללא הגבלה. הכלי (iframe) אוכף את הספירה ופולט postMessage; העוטף כאן:
//    (1) מעדכן את דרגת-המשתמש לכלי, (2) רושם כל חיפוש דרך track הקיים (events/visitor_events —
//    בלי טבלה מקבילה), (3) מציג את SubscribeGate הקיים כשמגיעים לשער.
export default function TzofenEmbed({ seed = "", full = false }) {
  const { isAdmin, verified } = useAuth();
  const tier = isAdmin ? "admin" : verified ? "registered" : "anon";
  const iframeRef = useRef(null);
  const [gate, setGate] = useState(null); // { reason: 'limit' | 'cross' }

  const src =
    "/tzofen.html?embed=1" + (seed ? "&q=" + encodeURIComponent(seed) : "");

  const postTier = useCallback(() => {
    try {
      iframeRef.current?.contentWindow?.postMessage(
        { source: "sod-host", type: "tier", tier },
        window.location.origin
      );
    } catch { /* noop */ }
  }, [tier]);

  // עדכון דרגת-המשתמש לכלי בכל שינוי אימות (הרשמה מבטלת מיד את השער)
  useEffect(() => {
    postTier();
    if (verified) setGate(null);
  }, [postTier, verified]);

  // 📏 מסך-מלא: מכוונים את גובה ה-iframe בדיוק לחלל שמתחת לסרגל — כך הדף עצמו לא נגלל,
  //    ורק הכלי (iframe) נגלל בפנים → פס-גלילה אחד במקום שניים.
  useEffect(() => {
    if (!full) return;
    const el = iframeRef.current;
    const fit = () => {
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      el.style.height = Math.max(560, Math.round(window.innerHeight - top)) + "px";
    };
    fit();
    const timers = [setTimeout(fit, 150), setTimeout(fit, 500)];
    window.addEventListener("resize", fit);
    return () => { window.removeEventListener("resize", fit); timers.forEach(clearTimeout); };
  }, [full]);

  // האזנה להודעות הכלי: לחיצת-יד (ready→שולח דרגה) + רישום חיפושים + בקשת-שער
  useEffect(() => {
    function onMsg(e) {
      if (e.origin !== window.location.origin) return;
      const d = e.data;
      if (!d || d.source !== "tzofen") return;
      if (d.type === "ready") {
        postTier();   // 🤝 הכלי מוכן — עונים לו בדרגת-המשתמש (סוגר את מרוץ-הטעינה: מנהל לא נחסם)
        return;
      }
      if (d.type === "search") {
        try {
          track("els", (d.term || "").slice(0, 80),
            d.kind === "cross" ? "cross_search" : "search",
            { kind: d.kind, skip: d.skip || 0, scope: d.scope || "torah" });
        } catch { /* noop */ }
      } else if (d.type === "gate") {
        if (!verified) setGate({ reason: d.reason || "limit" });
      }
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [verified, postTier]);

  const gateTitle =
    gate?.reason === "cross" ? "חיפוש מוצלב פתוח לרשומים"
      : gate?.reason === "tanakh" ? "חיפוש בכל התנ״ך פתוח לרשומים"
      : "סיימת 5 חיפושים חינם";
  const gateSub =
    gate?.reason === "cross"
      ? "חיפוש שני מונחים שנפגשים באותו ציר שמור לחוקרים רשומים. הרשמה חינם — ואז גם חיפוש-מוצלב וגם חיפושים ללא הגבלה."
      : gate?.reason === "tanakh"
      ? "חיפוש דילוגים בכל 24 ספרי התנ״ך (מעבר לתורה) שמור לחוקרים רשומים. הרשמה חינם פותחת אותו — וגם חיפושים ללא הגבלה."
      : "רישום חד-פעמי עם אימות במייל פותח חיפושים ללא הגבלה — וגם חיפוש-מוצלב, שמירות ושיתוף.";

  return (
    <div dir="rtl" style={{ position: "relative", width: "100%" }}>
      <iframe
        ref={iframeRef}
        onLoad={postTier}
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

      {gate && !verified && (
        <div
          style={{
            position: "absolute", inset: 0, zIndex: 20,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "18px", overflow: "auto",
            background: "rgba(6,5,13,0.82)", backdropFilter: "blur(3px)",
          }}
        >
          <div style={{ maxWidth: 520, width: "100%" }}>
            <div style={{ textAlign: "center", marginBottom: 4, color: "#f4c84a", fontSize: 34 }}>
              {gate.reason === "cross" ? "🔀" : gate.reason === "tanakh" ? "📜" : "🔓"}
            </div>
            <div style={{ textAlign: "center", color: "#f4c84a", fontFamily: "'Frank Ruhl Libre', serif", fontSize: 21, fontWeight: 800, marginBottom: 6 }}>
              {gateTitle}
            </div>
            <p style={{ textAlign: "center", color: "#c3ac7d", fontSize: 14.5, lineHeight: 1.8, margin: "0 auto 6px", maxWidth: 440 }}>
              {gateSub}
            </p>
            <SubscribeGate source="code" onUnlock={() => setGate(null)} />
            <div style={{ textAlign: "center", marginTop: 10 }}>
              <button
                onClick={() => setGate(null)}
                style={{
                  background: "transparent", border: "none", color: "#8a7850",
                  fontFamily: "inherit", fontSize: 12.5, cursor: "pointer", textDecoration: "underline",
                }}
              >
                {gate.reason === "cross" ? "חזרה לחיפוש רגיל" : "סגירה"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
