import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { C, F } from "../theme.js";
import { SectionHeader } from "../components/ui.jsx";
import { NAV } from "../routes.jsx";
import { getInsights, getPostByWpId } from "../lib/supabase.js";
import { stripHtml } from "../lib/format.js";
import InsightCard from "../components/InsightCard.jsx";
import VerifiedBadge from "../components/VerifiedBadge.jsx";
import SubscribeGate, { useSubscribed } from "../components/SubscribeGate.jsx";
import PersonalGematriaGift from "../components/PersonalGematriaGift.jsx";

const METHODS = NAV.find(i => i.to === "/beit-midrash")?.children || [];
const FREE_LIMIT = 2;        // חוק subscribe_gate_law — 2 חידושים חינם ואז הרשמה
const FOUNDATION_WP_ID = 17; // פוסט היסוד — "שם ה' בתורה 1820 פעם" (סוד 1820 המקורי)

// פוסט היסוד — מקום של כבוד לסוד 1820 המקורי
function FoundationPost({ post }) {
  if (!post) return null;
  const href = `/${post.slug}`;
  const title = stripHtml(post.title || "");
  return (
    <Link to={href} style={{
      display: "flex", gap: 16, alignItems: "center", textDecoration: "none",
      background: `linear-gradient(135deg, ${C.surface2}, ${C.surface})`,
      border: `1px solid ${C.borderGold}`, borderRadius: 16, padding: 18,
      marginBottom: 44, boxShadow: "0 0 40px rgba(212,175,55,0.10) inset",
    }}>
      {post.image_url && (
        <img src={post.image_url} alt="" width={84} height={84}
          style={{ borderRadius: 12, objectFit: "cover", flex: "0 0 auto", border: `1px solid ${C.border}` }} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
          <span style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 11, letterSpacing: 3, textTransform: "uppercase" }}>★ פוסט היסוד</span>
          <VerifiedBadge variant="post" size={14} />
        </div>
        <div style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 18, fontWeight: 700, lineHeight: 1.5 }}>{title}</div>
        <div style={{ color: C.goldDim, fontFamily: F.body, fontSize: 13, marginTop: 6 }}>הממצא המכונן של סוד 1820 — קראו את ההתחלה ↩</div>
      </div>
    </Link>
  );
}

function SectionTitle({ emoji, title, badge, children }) {
  return (
    <div style={{ margin: "0 0 18px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <h3 style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 24, fontWeight: 700, margin: 0 }}>
          {emoji} {title}
        </h3>
        {badge}
      </div>
      {children && (
        <p style={{ color: C.goldDim, fontFamily: F.body, fontSize: 14, lineHeight: 1.8, margin: "8px 0 0" }}>
          {children}
        </p>
      )}
    </div>
  );
}

function ComingSoon({ text }) {
  return (
    <div style={{
      textAlign: "center", color: C.muted, fontFamily: F.heading, fontSize: 13,
      letterSpacing: 1, background: C.surface2, border: `1px dashed ${C.border}`,
      borderRadius: 12, padding: "28px 20px",
    }}>🚧 {text}</div>
  );
}

// רשימת חידושים עם שער המנוי (2 חינם → הרשמה)
function InsightList({ items, badgeVariant }) {
  const { subscribed, markSubscribed } = useSubscribed();
  const visible = subscribed ? items : items.slice(0, FREE_LIMIT);
  const locked = items.length - visible.length;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {visible.map(it => <InsightCard key={it.id} insight={it} badgeVariant={badgeVariant} />)}
      {!subscribed && locked > 0 && (
        <SubscribeGate lockedCount={locked} source="beit-midrash" onUnlock={markSubscribed} />
      )}
    </div>
  );
}

// ===== לוח כל החידושים — "דפים לבנים" לראות הכל ולסדר את העץ =====
// מציג את כל החידושים (AI + צוריאל) עם תגיות ומספרים. כלי עבודה לארגון.
const ORIGIN_META = {
  ai:      { label: "חידוש AI", color: "#2563eb" },
  "צוריאל": { label: "צוריאל", color: "#a01f2e" },
};
function AllInsightsBoard() {
  const [items, setItems] = useState(null);
  const [tag, setTag] = useState(null);
  const [origin, setOrigin] = useState(null);

  useEffect(() => { getInsights({ limit: 400 }).then(setItems).catch(() => setItems([])); }, []);

  const tagCounts = useMemo(() => {
    const c = {};
    for (const it of items || []) for (const t of (it.tags || [])) if (t) c[t] = (c[t] || 0) + 1;
    return Object.entries(c).map(([t, k]) => ({ t, k })).sort((a, b) => b.k - a.k);
  }, [items]);

  const filtered = useMemo(() => (items || []).filter(it =>
    (!origin || it.origin === origin) && (!tag || (it.tags || []).includes(tag))
  ), [items, origin, tag]);

  if (items === null) return <div style={{ textAlign: "center", color: C.muted, fontFamily: F.body, padding: 30 }}>טוען חידושים…</div>;

  const chip = (active) => ({
    cursor: "pointer", fontFamily: F.heading, fontSize: 12.5, fontWeight: 700, padding: "6px 13px", borderRadius: 999,
    border: `1px solid ${active ? C.gold : C.border}`, background: active ? C.gold : "rgba(20,15,12,0.6)", color: active ? "#1a0e00" : C.goldLight,
  });

  return (
    <div style={{ direction: "rtl", maxWidth: 1100, margin: "60px auto 0", textAlign: "right" }}>
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <div style={{ fontSize: 11, color: C.goldDim, letterSpacing: 4, fontFamily: F.heading, textTransform: "uppercase", marginBottom: 8 }}>הדפים הלבנים</div>
        <h2 style={{ color: C.goldBright, fontFamily: F.regal, fontSize: "clamp(22px,4vw,34px)", fontWeight: 700, margin: 0 }}>📜 כל החידושים</h2>
        <div style={{ color: C.muted, fontFamily: F.body, fontSize: 14, marginTop: 8 }}>{items.length} חידושים · ראה הכל, סנן לפי תגית, וסדר את העץ</div>
      </div>

      {/* סינון לפי מקור */}
      <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap", margin: "20px 0 12px" }}>
        <button style={chip(!origin)} onClick={() => setOrigin(null)}>הכול ({items.length})</button>
        <button style={chip(origin === "ai")} onClick={() => setOrigin(o => o === "ai" ? null : "ai")}>🔵 חידושי AI</button>
        <button style={chip(origin === "צוריאל")} onClick={() => setOrigin(o => o === "צוריאל" ? null : "צוריאל")}>✍️ שלי</button>
      </div>

      {/* תגיות */}
      {tagCounts.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", marginBottom: 22 }}>
          {tag && <button style={chip(true)} onClick={() => setTag(null)}>✕ {tag}</button>}
          {tagCounts.filter(({ t }) => t !== tag).slice(0, 30).map(({ t, k }) => (
            <button key={t} style={chip(false)} onClick={() => setTag(t)}>{t} <span style={{ opacity: 0.6, fontSize: 11 }}>{k}</span></button>
          ))}
        </div>
      )}

      {/* הדפים הלבנים */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
        {filtered.map(it => {
          const om = ORIGIN_META[it.origin] || { label: it.origin || "—", color: C.goldDim };
          const body = stripHtml(it.body || "").slice(0, 240);
          const click = it.source_ref && it.source_type === "post" ? `/${it.source_ref}` : null;
          const inner = (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                <span style={{ background: om.color, color: "#fff", fontFamily: F.heading, fontSize: 10, fontWeight: 800, padding: "2px 9px", borderRadius: 999 }}>{om.label}</span>
                {it.has_1820 && <span style={{ color: "#9a7818", fontFamily: F.mono, fontSize: 11, fontWeight: 800 }}>1820 ✓</span>}
              </div>
              <div style={{ color: "#2a2118", fontFamily: F.regal, fontSize: 18, fontWeight: 700, lineHeight: 1.45, marginBottom: 8 }}>{stripHtml(it.title || "")}</div>
              {body && <div style={{ color: "#5a4f3c", fontFamily: F.body, fontSize: 13.5, lineHeight: 1.85, marginBottom: 12 }}>{body}…</div>}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {(it.related_numbers || []).slice(0, 6).map((n, i) => (
                  <span key={"n" + i} style={{ background: "#3a2a00", color: "#f6e27a", fontFamily: F.mono, fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 999 }}>{n}</span>
                ))}
                {(it.tags || []).slice(0, 6).map((t, i) => (
                  <span key={"t" + i} onClick={click ? undefined : (e) => { e.stopPropagation(); setTag(t); }}
                    style={{ background: "#efe7d2", color: "#6b5b35", fontFamily: F.heading, fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 999, border: "1px solid #d8cca6", cursor: "pointer" }}>{t}</span>
                ))}
              </div>
            </>
          );
          const cardStyle = {
            background: "#faf6ec", border: "1px solid #e6dcc2", borderRadius: 12, padding: "18px 20px",
            boxShadow: "0 6px 22px rgba(0,0,0,0.35)", textDecoration: "none", display: "block", height: "100%", boxSizing: "border-box",
          };
          return click
            ? <Link key={it.id} to={click} style={cardStyle}>{inner}</Link>
            : <div key={it.id} style={cardStyle}>{inner}</div>;
        })}
      </div>
      {filtered.length === 0 && <div style={{ textAlign: "center", color: C.muted, fontFamily: F.body, padding: 40 }}>אין חידושים תואמים לסינון.</div>}
    </div>
  );
}

// 🔒 בית המדרש סגור לחלוטין כרגע — מסך "בבנייה + הרשמה לגישה מוקדמת" בלבד.
export default function BeitMidrashPage() {
  return (
    <>
    <div style={{ direction: "rtl", maxWidth: 720, margin: "0 auto", padding: "72px 24px 40px", position: "relative", zIndex: 1, textAlign: "center" }}>
      <div style={{ fontSize: 11, color: C.goldDim, letterSpacing: 4, fontFamily: F.heading, textTransform: "uppercase", marginBottom: 14 }}>
        🚧 בבנייה
      </div>
      <h1 style={{ color: C.goldBright, fontFamily: F.regal, fontSize: "clamp(28px,5vw,44px)", fontWeight: 700, margin: "0 0 18px", lineHeight: 1.25 }}>
        📚 בית המדרש
      </h1>
      <div style={{ display: "inline-block", margin: "0 auto 24px", padding: "8px 18px", borderRadius: 999, border: `1px solid ${C.borderGold}`, background: "rgba(212,175,55,0.08)", color: C.goldBright, fontFamily: F.heading, fontSize: 13, fontWeight: 700 }}>
        🔒 ההיכל סגור לעבודות — נפתח בקרוב
      </div>
      <p style={{ color: C.muted, fontFamily: F.body, fontSize: 16, lineHeight: 2, maxWidth: 540, margin: "0 auto 8px" }}>
        אנחנו בונים כאן <b style={{ color: C.goldLight }}>מערכת חיפוש גימטריה מתקדמת ביותר בשילוב AI</b> — שיטות הלימוד, חידושי הבינה והכלים החדשים.
      </p>
      <p style={{ color: C.muted, fontFamily: F.body, fontSize: 16, lineHeight: 2, maxWidth: 540, margin: "0 auto 30px" }}>
        הכניסה למעגל ההיכל מתחילה כאן: הפיקו את <b style={{ color: C.goldLight }}>דו״ח הכניסה האישי</b> שלכם — ותהיו הראשונים שייכנסו לבית המדרש כשייפתח.
      </p>
      <PersonalGematriaGift source="beit-midrash-gate" />
    </div>

    <div style={{ maxWidth: 1140, margin: "0 auto", padding: "0 18px 110px" }}>
      <AllInsightsBoard />
    </div>
    </>
  );
}
