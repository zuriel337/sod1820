import React, { useState, useEffect } from "react";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { supabase } from "../lib/supabase.js";
import { timeAgoHe } from "../lib/format.js";
import { genAvatar } from "../lib/avatar.js";

// 👥 רצועת «הכתבים האחרונים שהתעדכנו» לעמוד-הבית — לוגו/אווטאר + סמל-החתימה (emblem) + התמחות
// + מתי התעדכנו לאחרונה. מקור-הרעננות: אחרון מבין research_contributions ו-els_records לכל כתב.
// עץ אחד: מצביע לדף-הכתב הקנוני; לא משכפל חומר.
export default function HomeWritersRail({ limit = 10 }) {
  const P = usePalette();
  const [rows, setRows] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      // רעננות לפי פעילות אחרונה — תרומות + צפנים
      const [contribs, ciphers] = await Promise.all([
        supabase.from("research_contributions").select("author_name,created_at")
          .in("status", ["approved", "published"]).not("author_name", "is", null)
          .order("created_at", { ascending: false }).limit(120),
        supabase.from("els_records").select("author_name,created_at")
          .eq("status", "published").not("author_name", "is", null)
          .order("created_at", { ascending: false }).limit(60),
      ]);
      const latest = {};
      for (const r of [...(contribs.data || []), ...(ciphers.data || [])]) {
        const n = r.author_name, t = r.created_at;
        if (!n || !t) continue;
        if (!latest[n] || t > latest[n]) latest[n] = t;
      }
      const names = Object.keys(latest);
      if (!names.length) { if (alive) setRows([]); return; }
      // רק כתבים מוגדרים (עם דף פעיל), עם פרטי-התצוגה
      const { data: cons } = await supabase.from("contributors")
        .select("display_name,slug,code,avatar_url,emblem,accent,specialty_label,vip,active,building")
        .in("display_name", names).eq("active", true);
      const list = (cons || [])
        .filter(c => !c.building)
        .map(c => ({ ...c, ts: latest[c.display_name] }))
        .sort((a, b) => String(b.ts).localeCompare(String(a.ts)))
        .slice(0, limit);
      if (alive) setRows(list);
    })();
    return () => { alive = false; };
  }, [limit]);

  if (rows !== null && rows.length === 0) return null;

  return (
    <section className="hn-wrap" style={{ padding: "0 18px 40px" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
        <h2 className="hn-h2" style={{ textAlign: "start", margin: 0 }}>👥 הכתבים שהתעדכנו לאחרונה</h2>
        <a href="/community/researchers" style={{ color: P.accentText, fontFamily: F.heading, fontSize: 13, fontWeight: 800, textDecoration: "none", whiteSpace: "nowrap" }}>שער הכתבים ←</a>
      </div>
      <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 6, scrollSnapType: "x proximity" }}>
        {(rows || Array.from({ length: 6 })).map((c, i) => {
          if (!c) return <div key={i} style={{ flex: "0 0 150px", height: 168, borderRadius: 14, background: P.card, opacity: .5 }} />;
          const acc = c.accent || P.accent;
          return (
            <a key={c.slug} href={`/community/researcher/${c.code || c.slug}`}
              style={{ flex: "0 0 150px", scrollSnapAlign: "start", textDecoration: "none", background: P.card,
                border: `1px solid ${P.border}`, borderTop: `3px solid ${acc}`, borderRadius: 14, padding: "16px 13px",
                display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 7 }}>
              <div style={{ position: "relative" }}>
                <img src={c.avatar_url || genAvatar(c.display_name)} alt={c.display_name} loading="lazy"
                  style={{ width: 58, height: 58, borderRadius: "50%", objectFit: "cover", border: `2px solid ${acc}` }} />
                {c.emblem && <span style={{ position: "absolute", bottom: -3, insetInlineEnd: -3, fontSize: 18, filter: "drop-shadow(0 2px 4px rgba(0,0,0,.5))" }}>{c.emblem}</span>}
              </div>
              <div style={{ color: P.accentText, fontFamily: F.heading, fontSize: 13.5, fontWeight: 800, lineHeight: 1.25 }}>
                {c.vip ? "👑 " : ""}{c.display_name}
              </div>
              {c.specialty_label && <div style={{ color: acc, fontFamily: F.body, fontSize: 10.5, fontWeight: 600, lineHeight: 1.35, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{c.specialty_label}</div>}
              <div style={{ marginTop: "auto", color: P.accentDim, fontFamily: F.heading, fontSize: 10, fontWeight: 700 }}>🕒 {timeAgoHe(c.ts)}</div>
            </a>
          );
        })}
      </div>
    </section>
  );
}
