import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getPostsFromSupabase, adaptPost } from "../lib/supabase.js";
import { C, F } from "../theme.js";
import { stripHtml } from "../lib/format.js";
import { SectionHeader } from "../components/ui.jsx";
import { ELSSection } from "../features/els/Els.jsx";

function Intro() {
  return (
    <div style={{ maxWidth: 760, margin: "0 auto 8px", direction: "rtl" }}>
      <SectionHeader eyebrow="מערכת חיפוש" title='🔍 הצופן התנ"כי' />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginTop: -24, marginBottom: 36 }}>
        <div style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10, padding: "20px 22px" }}>
          <div style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 18, marginBottom: 8 }}>מהו צופן?</div>
          <div style={{ color: C.goldDim, fontFamily: F.body, fontSize: 14, lineHeight: 1.85 }}>
            דילוגי אותיות (ELS) — קריאת אותיות בטקסט התורה במרווחים קבועים. כך נחשפות מילים ואשכולות
            מונחים שאינם גלויים בקריאה רגילה.
          </div>
        </div>
        <div style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10, padding: "20px 22px" }}>
          <div style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 18, marginBottom: 8 }}>למה הוא חשוב?</div>
          <div style={{ color: C.goldDim, fontFamily: F.body, fontSize: 14, lineHeight: 1.85 }}>
            <b style={{ color: C.goldLight }}>עדות — ולא ניבוי.</b> הצופן מתעד התאמות בטקסט הקדום, ככלי לימוד
            והתבוננות. הוא אינו חיזוי עתידות ואינו הוכחה.
          </div>
        </div>
      </div>
    </div>
  );
}

function LatestCodes() {
  const [posts, setPosts] = useState([]);
  useEffect(() => {
    // ניסיון למשוך מקטגוריית "צופן"; אם ריק — הפוסטים האחרונים
    getPostsFromSupabase({ limit: 3, category: "צופן" })
      .then(({ posts: rows }) => rows?.length ? rows : getPostsFromSupabase({ limit: 3 }).then(r => r.posts))
      .then(rows => setPosts((rows || []).map(adaptPost)))
      .catch(() => {});
  }, []);
  if (!posts.length) return null;
  return (
    <div style={{ maxWidth: 880, margin: "0 auto 8px", direction: "rtl" }}>
      <div style={{ fontSize: 11, color: C.goldDim, letterSpacing: 4, fontFamily: F.heading, textTransform: "uppercase", marginBottom: 16, textAlign: "center" }}>
        צפנים ופוסטים אחרונים
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
        {posts.map(p => (
          <Link key={p.id} to={"/" + p.slug} style={{
            textDecoration: "none", background: C.surface2, border: `1px solid ${C.border}`,
            borderRadius: 10, padding: "16px 18px",
          }}>
            <div style={{ color: C.goldLight, fontFamily: F.royal, fontSize: 15, fontWeight: 700, lineHeight: 1.5 }}>
              {stripHtml(p.title || "")}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function CodePage() {
  return (
    <div style={{ direction: "rtl", padding: "56px 18px 0", position: "relative", zIndex: 1 }}>
      <Intro />
      <LatestCodes />
      <ELSSection />
      <div style={{ maxWidth: 700, margin: "0 auto 80px", direction: "rtl" }}>
        <div style={{
          background: `linear-gradient(135deg, ${C.surface2}, rgba(26,10,46,0.4))`,
          border: `1px dashed ${C.borderGold}`, borderRadius: 12, padding: "22px 26px", textAlign: "center",
        }}>
          <div style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 18, marginBottom: 10 }}>🚧 בקרוב</div>
          <div style={{ color: C.goldDim, fontFamily: F.body, fontSize: 14, lineHeight: 1.9 }}>
            חיפוש מתקדם · לימוד אינטראקטיבי · ניתוח AI של הצפנים
          </div>
        </div>
      </div>
    </div>
  );
}
