import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { applySeo } from "../lib/seo.js";
import { SUPABASE_URL, SUPABASE_ANON } from "../lib/supabase.js";

// 🚫 עמוד ההסרה מרשימת התפוצה (/unsubscribe) — מוגש מהאתר (Vercel) כדי שיירנדר כ-HTML אמיתי
// בעברית תקינה. Supabase דורס HTML מפונקציות ל-text/plain (אנטי-פישינג), לכן העמוד האנושי כאן,
// והוא קורא ל-newsletter-unsubscribe במצב-JSON (?format=json) שמאמת HMAC ומכבה active. עץ אחד:
// אותה פונקציה, בלי לשכפל לוגיקה — הדף רק מציג את התוצאה.
export default function UnsubscribePage() {
  const P = usePalette();
  const [sp] = useSearchParams();
  const [state, setState] = useState("loading"); // loading | done | invalid
  const [email, setEmail] = useState("");

  useEffect(() => { applySeo({ title: "הסרה מרשימת התפוצה · סוד 1820", description: "הסרה מרשימת הדיוור של סוד 1820.", path: "/unsubscribe", noindex: true }); }, []);

  useEffect(() => {
    const e = sp.get("e") || "";
    const t = sp.get("t") || "";
    if (!e || !t) { setState("invalid"); return; }
    const url = `${SUPABASE_URL}/functions/v1/newsletter-unsubscribe?e=${encodeURIComponent(e)}&t=${encodeURIComponent(t)}&format=json`;
    fetch(url, { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}`, accept: "application/json" } })
      .then(r => r.json().catch(() => ({ ok: false })))
      .then(d => { if (d?.ok) { setEmail(d.email || ""); setState("done"); } else setState("invalid"); })
      .catch(() => setState("invalid"));
  }, [sp]);

  const wrap = { direction: "rtl", minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 18px", position: "relative", zIndex: 1 };
  const cardS = { maxWidth: 440, width: "100%", background: P.cardGrad, border: `1px solid ${P.borderStrong}`, borderRadius: 20, padding: "40px 30px", textAlign: "center", boxShadow: "0 24px 70px rgba(0,0,0,0.28)" };

  return (
    <div style={wrap}>
      <div style={cardS}>
        {state === "loading" && (
          <>
            <div style={{ fontSize: 42, marginBottom: 10, opacity: 0.85 }}>⏳</div>
            <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 15 }}>מעבד את הבקשה…</div>
          </>
        )}
        {state === "done" && (
          <>
            <div style={{ fontSize: 46, marginBottom: 12 }}>👋</div>
            <h1 style={{ color: P.accentText, fontFamily: F.regal, fontSize: 24, fontWeight: 800, margin: "0 0 10px" }}>הוסרת מרשימת התפוצה</h1>
            <p style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 15, lineHeight: 1.9, margin: "0 0 6px" }}>
              {email ? <>הכתובת <b dir="ltr" style={{ color: P.accentText }}>{email}</b> </> : "הכתובת שלך "}
              לא תקבל עוד עדכונים. תמיד אפשר לחזור ולהירשם.
            </p>
          </>
        )}
        {state === "invalid" && (
          <>
            <div style={{ fontSize: 46, marginBottom: 12 }}>✋</div>
            <h1 style={{ color: P.accentText, fontFamily: F.regal, fontSize: 24, fontWeight: 800, margin: "0 0 10px" }}>קישור לא תקין</h1>
            <p style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 15, lineHeight: 1.9, margin: "0 0 6px" }}>
              הקישור אינו תקין או פג תוקפו. אם התכוונת להסיר את עצמך — פנה אלינו ונדאג לכך.
            </p>
          </>
        )}
        <Link to="/" style={{ display: "inline-block", marginTop: 20, background: P.accentBtn, color: P.onAccent || "#1a0e00", fontFamily: F.heading, fontSize: 14, fontWeight: 800, textDecoration: "none", borderRadius: 999, padding: "11px 28px" }}>
          ← לאתר סוד 1820
        </Link>
      </div>
    </div>
  );
}
