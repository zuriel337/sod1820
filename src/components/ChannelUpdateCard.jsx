import React, { useState, useEffect } from "react";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { getChannelUpdates } from "../lib/supabase.js";
import { timeAgoHe } from "../lib/format.js";
import { thumb } from "../lib/img.js";

// 📡 «עדכון מהערוץ» — כרטיס השידור-החי האחרון בעמוד הבית (וריאציה 2 שאושרה).
// מקור: channel_updates (אותו מקור של «עדכון חי» בטיקר — עץ אחד). אין עדכון → לא מוצג.
// תמונה מוצגת כממוזערת ולחיצה פותחת אותה במסך מלא. שום דבר לא נכנס לזרם אוטומטית.
export default function ChannelUpdateCard() {
  const P = usePalette();
  const [u, setU] = useState(null);
  const [lb, setLb] = useState(false);

  useEffect(() => {
    let live = true;
    const load = () => getChannelUpdates(1).then(r => { if (live) setU((r || [])[0] || null); }).catch(() => {});
    load();
    const id = setInterval(() => { if (!document.hidden) load(); }, 90000);
    return () => { live = false; clearInterval(id); };
  }, []);

  if (!u) return null;

  return (
    <section className="hn-wrap" style={{ padding: "0 18px 26px" }}>
      <style>{`@keyframes cu-dot { 0%,100%{opacity:1;transform:scale(1);} 50%{opacity:.4;transform:scale(.72);} }`}</style>
      <div style={{ maxWidth: 720, margin: "0 auto", background: P.cardGrad, border: `1px solid ${P.borderStrong}`,
        borderRadius: 16, padding: "14px 18px", boxShadow: `0 8px 30px ${P.glow}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#57c98a", boxShadow: "0 0 8px #57c98a",
            animation: "cu-dot 2s ease-in-out infinite", flex: "0 0 auto" }} />
          <b style={{ color: P.accentText, fontFamily: F.heading, fontSize: 13.5 }}>📡 עדכון מהערוץ</b>
          <span style={{ marginInlineStart: "auto", color: P.inkSoft, fontFamily: F.heading, fontSize: 11 }}>
            🕒 {timeAgoHe(u.created_at)}
          </span>
        </div>
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
          <p style={{ flex: 1, minWidth: 0, margin: 0, color: P.ink, fontFamily: F.body, fontSize: 14.5, lineHeight: 1.9, whiteSpace: "pre-wrap" }}>
            {u.text}
          </p>
          {u.image_url && (
            <button onClick={() => setLb(true)} title="פתח את התמונה" style={{ flex: "0 0 auto", padding: 0, cursor: "zoom-in",
              border: `1px solid ${P.borderStrong}`, borderRadius: 10, overflow: "hidden", background: "#0a0710" }}>
              <img src={thumb(u.image_url, 360)} alt="" style={{ width: 88, height: 88, objectFit: "cover", display: "block" }} />
            </button>
          )}
        </div>
      </div>

      {lb && u.image_url && (
        <div onClick={() => setLb(false)} style={{ position: "fixed", inset: 0, zIndex: 2147483000,
          background: "rgba(3,2,8,0.93)", display: "flex", alignItems: "center", justifyContent: "center", padding: 18, cursor: "zoom-out" }}>
          <img src={u.image_url} alt="עדכון מהערוץ" style={{ maxWidth: "96vw", maxHeight: "88vh", borderRadius: 12,
            border: "1px solid rgba(212,175,55,0.5)", boxShadow: "0 20px 70px rgba(0,0,0,0.7)" }} />
        </div>
      )}
    </section>
  );
}
