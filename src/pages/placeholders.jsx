import React, { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { C, F } from "../theme.js";
import { SectionHeader } from "../components/ui.jsx";
import UnderConstruction from "../components/layout/UnderConstruction.jsx";
import { NAV } from "../routes.jsx";
import { supabase } from "../lib/supabase.js";
import { stripHtml, formatDateHe } from "../lib/format.js";

export function ArchivePage() {
  return <UnderConstruction emoji="🖼" title="ארכיון ההתגלות"
    description="כל התמונות, הצפנים והממצאים במקום אחד — עם סינון לפי שנה, נושא, תגית, מספר, מלחמות, צפנים, משיח ותורה, מנוע OCR, וחיבור חי לעץ המספרים."
    links={[{ to: "/numbers", label: "עץ המספרים" }, { to: "/code", label: "הצופן התנ\"כי" }]} />;
}

export function MembersPage() {
  return <UnderConstruction emoji="👑" title="בני ההיכל"
    description="אזור המנויים: שיעורים מלאים, קורסים, מפות רמזים, העץ המתקדם, צפנים בלעדיים, חיפושים מורחבים וגישה מוקדמת לתכנים."
    links={[{ to: "/beit-midrash", label: "בית המדרש" }, { to: "/start", label: "כאן מתחילים" }]} />;
}

const COMMUNITY = [
  { emoji: "💬", title: "הצ'אט הוותיק", to: "/community/chat", live: true },
  { emoji: "🧮", title: "המחשבון הקהילתי", to: "/community/calculator", live: false },
  { emoji: "📝", title: "כל התגובות באתר", to: "/community/comments", live: false },
  { emoji: "✉️", title: "צור קשר", to: "/contact", live: true },
];

export function CommunityPage() {
  return (
    <div style={{ direction: "rtl", maxWidth: 980, margin: "0 auto", padding: "64px 24px 96px", position: "relative", zIndex: 1 }}>
      <SectionHeader eyebrow="מרכז הפעילות" title="💬 קהילה" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
        {COMMUNITY.map(c => (
          <Link key={c.to} to={c.to} style={{
            textDecoration: "none", background: C.surface2, border: `1px solid ${C.border}`,
            borderRadius: 12, padding: "24px 22px", position: "relative",
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>{c.emoji}</div>
            <div style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 18, fontWeight: 700 }}>{c.title}</div>
            <div style={{
              marginTop: 8, fontSize: 10, letterSpacing: 1, fontFamily: F.heading,
              color: c.live ? "#4fc78c" : C.muted,
            }}>{c.live ? "● פעיל" : "🚧 בבנייה"}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function CommunityCalculatorPage() {
  return <UnderConstruction emoji="🧮" title="המחשבון הקהילתי"
    description="מחשבון גימטריה ויראלי שמאפשר לקהילה להזין מילים ולגלות קשרים מהמאגר."
    links={[{ to: "/community", label: "קהילה" }, { to: "/numbers", label: "עץ המספרים" }]} />;
}

// סיסמת תצוגה מקדימה — הדף עדיין סגור לציבור (כמו ADMIN_PASSWORD בקוד הקיים)
const COMMENTS_PREVIEW_PASSWORD = "sod1820";

export function CommunityCommentsPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [pw, setPw] = useState("");
  const [pwError, setPwError] = useState(false);

  const [comments, setComments] = useState(null);   // null = טרם נטען
  const [postMap, setPostMap] = useState({});
  const [q, setQ] = useState("");

  // טוען את התגובות רק לאחר פתיחה (הדף סגור לציבור)
  useEffect(() => {
    if (!unlocked || comments !== null) return;
    let alive = true;
    (async () => {
      // PostgREST מגביל ~1000 שורות לבקשה — מושכים בעמודים עד שמתרוקן
      async function fetchAll(table, cols, order) {
        const CH = 1000; const out = [];
        for (let from = 0; ; from += CH) {
          let qy = supabase.from(table).select(cols).range(from, from + CH - 1);
          if (order) qy = qy.order(order, { ascending: false });
          const { data } = await qy;
          if (!data || !data.length) break;
          out.push(...data);
          if (data.length < CH) break;
        }
        return out;
      }
      const [cms, ps] = await Promise.all([
        fetchAll("comments", "wp_id,post_wp_id,author_name,date,content", "date"),
        fetchAll("posts", "wp_id,title,slug", null),
      ]);
      if (!alive) return;
      const map = {};
      ps.forEach(p => { map[p.wp_id] = { title: stripHtml(p.title || ""), slug: p.slug }; });
      setPostMap(map);
      setComments(cms);
    })();
    return () => { alive = false; };
  }, [unlocked, comments]);

  function tryUnlock(e) {
    e.preventDefault();
    if (pw.trim() === COMMENTS_PREVIEW_PASSWORD) { setUnlocked(true); setPwError(false); }
    else setPwError(true);
  }

  const filtered = useMemo(() => {
    if (!comments) return [];
    const term = q.trim();
    if (!term) return comments;
    return comments.filter(c => {
      const post = postMap[c.post_wp_id]?.title || "";
      return (stripHtml(c.content || "") + " " + (c.author_name || "") + " " + post).includes(term);
    });
  }, [comments, q, postMap]);

  // ── מסך נעילה (הדף סגור) ──
  if (!unlocked) {
    return (
      <div style={{ direction: "rtl", maxWidth: 560, margin: "0 auto", padding: "80px 24px 120px", textAlign: "center", position: "relative", zIndex: 1 }}>
        <div style={{ fontSize: 54, marginBottom: 16 }}>🔒</div>
        <h1 style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 30, fontWeight: 700, margin: "0 0 10px" }}>
          כל התגובות באתר
        </h1>
        <p style={{ color: C.goldDim, fontFamily: F.body, fontSize: 15, lineHeight: 1.9, margin: "0 0 30px" }}>
          האזור עדיין <b style={{ color: C.goldLight }}>סגור לציבור</b> — בבנייה.
          התגובות כבר סונכרנו; להצצה מוקדמת הזן סיסמת ניהול.
        </p>
        <form onSubmit={tryUnlock} style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
          <input
            type="password"
            value={pw}
            onChange={e => { setPw(e.target.value); setPwError(false); }}
            placeholder="סיסמה"
            dir="ltr"
            style={{
              width: "100%", maxWidth: 280, textAlign: "center", padding: "12px 14px",
              background: C.surface, color: C.goldLight, fontFamily: F.heading, fontSize: 15,
              border: `1px solid ${pwError ? C.danger : C.borderGold}`, borderRadius: 8, outline: "none",
            }}
          />
          {pwError && <div style={{ color: C.danger, fontSize: 13, fontFamily: F.heading }}>סיסמה שגויה</div>}
          <button type="submit" style={{
            background: `linear-gradient(135deg, ${C.crimson}, ${C.crimsonLight})`, color: C.goldBright,
            border: `1px solid ${C.goldDim}`, borderRadius: 8, padding: "11px 28px", cursor: "pointer",
            fontFamily: F.heading, fontSize: 13, fontWeight: 800, letterSpacing: 1,
          }}>תצוגה מקדימה →</button>
        </form>
        <div style={{ marginTop: 36 }}>
          <Link to="/community" style={{ color: C.goldDim, textDecoration: "none", fontFamily: F.heading, fontSize: 13 }}>← חזרה לקהילה</Link>
        </div>
      </div>
    );
  }

  // ── תצוגה מקדימה לאחר פתיחה ──
  return (
    <div style={{ direction: "rtl", maxWidth: 880, margin: "0 auto", padding: "56px 20px 100px", position: "relative", zIndex: 1 }}>
      <SectionHeader eyebrow="קהילה · תצוגה מקדימה" title="📝 כל התגובות" />

      <div style={{
        display: "flex", alignItems: "center", gap: 10, justifyContent: "center", flexWrap: "wrap",
        background: "rgba(122,19,32,0.18)", border: `1px solid ${C.borderGold}`, borderRadius: 10,
        padding: "10px 16px", margin: "-20px auto 26px", maxWidth: 560,
      }}>
        <span style={{ fontSize: 16 }}>🔒</span>
        <span style={{ color: C.goldLight, fontFamily: F.heading, fontSize: 13 }}>
          הדף עדיין <b>סגור לציבור</b> — זוהי תצוגה מקדימה לניהול.
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap", justifyContent: "space-between" }}>
        <div style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 12, letterSpacing: 1 }}>
          {comments ? `${filtered.length} מתוך ${comments.length} תגובות` : "טוען…"}
        </div>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="חיפוש בתגובות / מחבר / פוסט…"
          style={{
            flex: 1, minWidth: 220, maxWidth: 360, padding: "9px 13px",
            background: C.surface, color: C.goldLight, fontFamily: F.body, fontSize: 14,
            border: `1px solid ${C.border}`, borderRadius: 8, outline: "none",
          }}
        />
      </div>

      {!comments && <div style={{ color: C.muted, textAlign: "center", padding: 40 }}>טוען תגובות…</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {filtered.map(c => {
          const post = postMap[c.post_wp_id];
          return (
            <div key={c.wp_id} style={{
              background: C.surface2, border: `1px solid ${C.border}`,
              borderInlineStart: `3px solid ${C.borderGold}`, borderRadius: 10, padding: "14px 16px",
            }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                <span style={{ color: C.goldBright, fontFamily: F.royal, fontSize: 14, fontWeight: 700 }}>{c.author_name || "אנונימי"}</span>
                <span style={{ color: C.muted, fontFamily: F.heading, fontSize: 11 }}>{formatDateHe(c.date)}</span>
                {post && (
                  <Link to={"/" + post.slug} style={{ marginInlineStart: "auto", color: C.goldDim, textDecoration: "none", fontFamily: F.heading, fontSize: 11 }}>
                    על: {post.title} ←
                  </Link>
                )}
              </div>
              <div style={{ color: C.goldLight, fontFamily: F.body, fontSize: 14, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
                {stripHtml(c.content || "")}
              </div>
            </div>
          );
        })}
        {comments && !filtered.length && (
          <div style={{ color: C.muted, textAlign: "center", padding: 30, fontFamily: F.body }}>לא נמצאו תגובות תואמות.</div>
        )}
      </div>
    </div>
  );
}

const METHODS = NAV.find(i => i.to === "/beit-midrash")?.children || [];

export function MethodPage() {
  const { method } = useParams();
  const found = METHODS.find(m => m.to === `/beit-midrash/${method}`);
  return <UnderConstruction emoji="📚" title={found ? `בית המדרש · ${found.label}` : "בית המדרש"}
    description="הסבר השיטה, דוגמאות, מחשבון אינטראקטיבי, שאלות נפוצות וקישור לרמזים אמיתיים — בקרוב."
    links={[{ to: "/beit-midrash", label: "כל השיטות" }, { to: "/numbers", label: "עץ המספרים" }]} />;
}
