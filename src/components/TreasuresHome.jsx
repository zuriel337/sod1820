import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { getTreasures } from "../lib/supabase.js";
import MuseumGallery from "./MuseumGallery.jsx";
import Lightbox from "./Lightbox.jsx";
import { useAuth } from "../lib/AuthContext.jsx";
import ImageEditModal from "./ImageEditModal.jsx";
import { setImageCuration } from "../lib/supabase.js";

// 👑 «אוצרות הגילוי» בעמוד הבית — ציר-הערך מעל ציר-הזמן (החלטת צוריאל):
// תערוכת-מוזיאון של הבחירות הגדולות (treasure=true). אוצר אחד = Hero+שלט; כל אוצר
// נוסף שיסומן נכנס למניפה שמתחתיו אוטומטית. עתיד: הבית של הסטים («עת ההתגלות»…).
// אין אוצרות → הסקציה לא מוצגת כלל. אי-חיתוך תמיד (חוק).
export default function TreasuresHome() {
  const { isAdmin } = useAuth();
  const [treasures, setTreasures] = useState(null);
  const [lb, setLb] = useState(null);
  const [editImg, setEditImg] = useState(null);

  useEffect(() => {
    let live = true;
    getTreasures(8).then(t => { if (live) setTreasures(t || []); }).catch(() => live && setTreasures([]));
    return () => { live = false; };
  }, []);

  if (!treasures || !treasures.length) return null;

  return (
    <section style={{ position: "relative", overflow: "hidden", background: "#0f0b08", colorScheme: "dark", padding: "44px 18px 50px" }}>
      {/* הילת-במה עדינה מאחורי התערוכה */}
      <div aria-hidden style={{ position: "absolute", inset: 0, background: "radial-gradient(70% 45% at 50% 0%, rgba(212,175,55,0.09), transparent 65%)", pointerEvents: "none" }} />
      <div style={{ position: "relative", maxWidth: 1000, margin: "0 auto", direction: "rtl" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, maxWidth: 640, margin: "0 auto 6px" }}>
            <span style={{ flex: 1, height: 1, background: "linear-gradient(90deg,transparent,rgba(212,175,55,.45),transparent)" }} />
            <h2 style={{ color: "#e8c84a", fontFamily: F.regal, fontSize: "clamp(21px,3.4vw,29px)", fontWeight: 800, margin: 0, textShadow: "0 0 34px rgba(232,200,74,.3)" }}>👑 אוצרות הגילוי</h2>
            <span style={{ flex: 1, height: 1, background: "linear-gradient(90deg,transparent,rgba(212,175,55,.45),transparent)" }} />
          </div>
          <div style={{ color: "#a99a7c", fontFamily: F.body, fontSize: 13.5 }}>הגילויים שאסור לפספס — לא לפי זמן, לפי ערך.</div>
        </div>

        <MuseumGallery hints={treasures} onOpen={i => setLb(i)} onEdit={isAdmin ? h => setEditImg(h) : null} />

        <div style={{ textAlign: "center", marginTop: 26 }}>
          <Link to="/archive?tab=cascade" style={{ display: "inline-block", background: "linear-gradient(135deg,#e9c84a,#9a7818)", color: "#231603",
            textDecoration: "none", fontFamily: F.heading, fontWeight: 800, fontSize: 14, borderRadius: 999, padding: "11px 28px",
            boxShadow: "0 10px 28px -10px rgba(184,144,31,.6)" }}>👑 לכל אוצרות הגילוי ←</Link>
        </div>
      </div>

      {lb != null && (
        <Lightbox images={treasures} initialIndex={lb} onClose={() => setLb(null)}
          onEdit={isAdmin ? h => { setLb(null); setEditImg(h); } : null} />
      )}
      {editImg && (
        <ImageEditModal image={editImg} onClose={() => setEditImg(null)}
          onSave={async patch => {
            if (Object.keys(patch).length) {
              try {
                await setImageCuration(editImg.id, patch);
                setTreasures(ts => (ts || []).map(t => t.id === editImg.id ? { ...t, ...patch } : t).filter(t => t.treasure !== false && t.curator_hidden !== true));
              } catch (e) { alert("שגיאה בשמירה: " + (e.message || e)); return; }
            }
            setEditImg(null);
          }}
          onDelete={id => { setTreasures(ts => (ts || []).filter(t => t.id !== id)); setEditImg(null); }}
        />
      )}
    </section>
  );
}
