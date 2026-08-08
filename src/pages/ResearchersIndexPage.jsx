import React, { useState, useEffect } from "react";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { supabase } from "../lib/supabase.js";
import { applySeo } from "../lib/seo.js";
import { genAvatar } from "../lib/avatar.js";

// 📜 רשימת הכתבים/החוקרים — /community/researchers (researcher_page_law).
// עדשה על contributors: כרטיס לכל כותב פעיל → דף-החוקר הקנוני שלו.
// הדפים עצמם נפרדים מהאתר (נגישים בקישור) — הרשימה הזו היא השער בקהילה.

// מספר הגילויים בדף (media ללא digest/scan-header) — משמש גם למיון וגם לתצוגת «💎 N גילויים».
const itemsOf = (r) => Array.isArray(r.media) ? r.media.filter(e => e.kind !== "digest" && e.kind !== "scan-header").length : 0;

// 🪜 דרגת-היררכיה (גבוה=למעלה). כתב חדש נכנס בתחתית ו«מתעורר» כלפי מעלה ככל שצובר מעמד:
//   3 = VIP (👑) · 2 = כותב עם גילויים (💎) · 1 = פעיל בלי גילויים עדיין (כאן נוחת כתב חדש) · 0 = בבנייה (🚧, בתחתית).
const tierOf = (r) => r.building ? 0 : r.vip ? 3 : itemsOf(r) > 0 ? 2 : 1;
// ⭐ כתב חדש — תיוג 'כתב חדש' ב-contributors.tags. מקבל כוכב ומוקפץ לראש הרשימה כ«פנים חדשות».
const isNewWriter = (r) => Array.isArray(r.tags) && r.tags.includes("כתב חדש");

export default function ResearchersIndexPage() {
  const P = usePalette();
  const [rows, setRows] = useState(null);

  useEffect(() => {
    applySeo({ title: "הכתבים והחוקרים", description: "רשימת הכתבים והחוקרים של סוד 1820 — דפי הגילויים האישיים", path: "/community/researchers" });
    let alive = true;
    supabase.from("contributors").select("slug,code,display_name,kind,role,vip,trusted,avatar_url,media,locked,building,created_at,tags,specialty_label,accent,emblem")
      .eq("active", true).neq("kind", "private").not("slug", "like", "r-%").neq("display_name", "sod1820")  // ⛔ פרטי + חשבון-מערכת
      .then(({ data }) => {
        if (!alive) return;
        const list = Array.isArray(data) ? data.slice() : [];
        // מיון: כתבים חדשים (⭐) בראש כ«פנים חדשות»; ואז ✓ מהימנים; אחר-כך דרגה↓, ובתוכה הוותיק ראשון.
        list.sort((a, b) => (isNewWriter(b) ? 1 : 0) - (isNewWriter(a) ? 1 : 0) || (b.trusted ? 1 : 0) - (a.trusted ? 1 : 0) || tierOf(b) - tierOf(a) || String(a.created_at || "").localeCompare(String(b.created_at || "")));
        setRows(list);
      })
      .catch(() => alive && setRows([]));
    return () => { alive = false; };
  }, []);

  // 🚪 שער-הכתבים — מסך מלא, מפואר. כל כתב = שער עם הסמל, השם וההתמחות (specialty_label) גלויים
  //    עוד לפני הכניסה (writers_page_law). ריחוף מרים וחושף «היכנס». צבע-חתימה = contributors.accent.
  return (
    <div style={{ background: P.pageBg, minHeight: "100vh", position: "relative", zIndex: 1 }}>
      <style>{`
        .wgate{transition:transform .2s ease, box-shadow .2s ease}
        .wgate:hover{transform:translateY(-6px)}
        .wgate .wenter{opacity:.38;transition:opacity .2s ease, transform .2s ease}
        .wgate:hover .wenter{opacity:1;transform:translateX(-4px)}
        @media (prefers-reduced-motion:reduce){.wgate{transition:none}.wgate:hover{transform:none}}
      `}</style>
      <div style={{ direction: "rtl", maxWidth: 1160, margin: "0 auto", padding: "40px 18px 72px" }}>
        <div style={{ textAlign: "center", marginBottom: 30 }}>
          <div style={{ fontSize: 30 }}>👑</div>
          <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: "clamp(28px,5.5vw,44px)", fontWeight: 800, marginTop: 6 }}>שער הכתבים</div>
          <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 14.5, marginTop: 8, lineHeight: 1.7, maxWidth: 520, marginInline: "auto" }}>
            לכל כתב עולם משלו — ראו את התפקיד, היכנסו למרכז. אותו שלד, חתימה אישית.
          </div>
        </div>

        {rows === null ? (
          <div style={{ textAlign: "center", color: P.inkSoft, fontFamily: F.body, padding: 40 }}>טוען…</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(232px,1fr))", gap: 16 }}>
            {rows.map(r => {
              const items = itemsOf(r);
              const isNew = isNewWriter(r);
              const acc = r.accent || P.accent;
              const center = r.specialty_label || r.role;
              return (
                <a key={r.slug} href={`/community/researcher/${r.code || r.slug}`} className="wgate"
                  style={{ position: "relative", display: "flex", flexDirection: "column", minHeight: 216,
                    background: `linear-gradient(180deg, ${acc}26, ${P.card} 72%)`,
                    border: `1px solid ${isNew ? acc : P.border}`, borderTop: `3px solid ${acc}`,
                    borderRadius: 17, padding: "18px 17px", textDecoration: "none", overflow: "hidden",
                    boxShadow: isNew ? `0 0 0 3px ${P.glow}` : "0 8px 26px rgba(0,0,0,.10)" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                    <div style={{ fontSize: 34, lineHeight: 1, filter: "drop-shadow(0 3px 8px rgba(0,0,0,.22))" }}>
                      {r.emblem || (r.vip ? "👑" : "✦")}
                    </div>
                    {r.trusted && <span title="כתב מהימן" style={{ fontFamily: F.heading, fontSize: 10.5, fontWeight: 900, color: "#3a2c00", background: "linear-gradient(135deg,#f6e27a,#d4af37)", borderRadius: 999, padding: "2px 8px" }}>✓</span>}
                  </div>
                  <div style={{ marginTop: "auto" }}>
                    {isNew && <span style={{ display: "inline-block", fontFamily: F.heading, fontSize: 10.5, fontWeight: 800, color: P.onAccent, background: P.accentBtn, borderRadius: 999, padding: "2px 9px", marginBottom: 7 }}>⭐ כתב חדש</span>}
                    <div style={{ color: P.ink, fontFamily: F.regal, fontSize: 19, fontWeight: 800 }}>
                      {r.display_name}{r.building ? " 🚧" : r.locked ? " 🔑" : ""}
                    </div>
                    {center && <div style={{ color: acc, fontFamily: F.heading, fontSize: 12.5, fontWeight: 700, marginTop: 4, lineHeight: 1.45 }}>{center}</div>}
                    {r.building
                      ? <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 11.5, marginTop: 6 }}>בבנייה — בקרוב</div>
                      : <div className="wenter" style={{ color: acc, fontFamily: F.heading, fontSize: 12, fontWeight: 800, marginTop: 10 }}>היכנס →</div>}
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
