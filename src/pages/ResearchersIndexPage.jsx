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

export default function ResearchersIndexPage() {
  const P = usePalette();
  const [rows, setRows] = useState(null);

  useEffect(() => {
    applySeo({ title: "הכתבים והחוקרים", description: "רשימת הכתבים והחוקרים של סוד 1820 — דפי הגילויים האישיים", path: "/community/researchers" });
    let alive = true;
    supabase.from("contributors").select("slug,code,display_name,kind,role,vip,avatar_url,media,locked,building,created_at")
      .eq("active", true).neq("kind", "private").not("slug", "like", "r-%").neq("display_name", "sod1820")  // ⛔ פרטי + חשבון-מערכת
      .then(({ data }) => {
        if (!alive) return;
        const list = Array.isArray(data) ? data.slice() : [];
        // מיון היררכי: דרגה↓, ובתוך אותה דרגה הוותיק ראשון (created_at↑) — כך כתב חדש יושב בתחתית ועולה כשהוא מתקדם בהיררכיה.
        list.sort((a, b) => tierOf(b) - tierOf(a) || String(a.created_at || "").localeCompare(String(b.created_at || "")));
        setRows(list);
      })
      .catch(() => alive && setRows([]));
    return () => { alive = false; };
  }, []);

  // רקע-דף קנוני (light_mode_background_law)
  return (
    <div style={{ background: P.pageBg, minHeight: "100vh", position: "relative", zIndex: 1 }}>
      <div style={{ direction: "rtl", maxWidth: 760, margin: "0 auto", padding: "26px 14px 60px" }}>
        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: "clamp(24px,5vw,32px)", fontWeight: 800 }}>📜 הכתבים והחוקרים</div>
          <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 13.5, marginTop: 6, lineHeight: 1.7 }}>
            לכל כותב דף-גילויים אישי — הכרטיסים, האוצרות והפוסטים שלו.
          </div>
        </div>

        {rows === null ? (
          <div style={{ textAlign: "center", color: P.inkSoft, fontFamily: F.body, padding: 30 }}>טוען…</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {rows.map(r => {
              const items = itemsOf(r);
              return (
                <a key={r.slug} href={`/community/researcher/${r.code || r.slug}`}
                  style={{ display: "flex", alignItems: "center", gap: 13, background: P.card, border: `1px solid ${P.border}`, borderRadius: 14, padding: "13px 15px", textDecoration: "none" }}>
                  <img src={r.avatar_url || genAvatar(r.display_name)} alt={r.display_name} loading="lazy" style={{ width: 54, height: 54, borderRadius: "50%", objectFit: "cover", border: `2px solid ${P.accent}`, flexShrink: 0 }} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ color: P.ink, fontFamily: F.heading, fontSize: 15.5, fontWeight: 800 }}>
                      {r.vip ? "👑 " : ""}{r.display_name}{r.building ? " 🚧" : r.locked ? " 🔑" : ""}
                    </div>
                    {r.building
                      ? <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 12 }}>בבנייה — בקרוב</div>
                      : r.role && <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 12 }}>{r.role}</div>}
                    {!r.building && items > 0 && <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 11 }}>💎 {items} גילויים בדף</div>}
                  </div>
                  <span style={{ color: P.accentDim, fontSize: 16 }}>←</span>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
