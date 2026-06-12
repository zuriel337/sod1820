import React, { useEffect, useState } from "react";
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

// 🔒 בית המדרש סגור לחלוטין כרגע — מסך "בבנייה + הרשמה לגישה מוקדמת" בלבד.
export default function BeitMidrashPage() {
  return (
    <div style={{ direction: "rtl", maxWidth: 720, margin: "0 auto", padding: "72px 24px 110px", position: "relative", zIndex: 1, textAlign: "center" }}>
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
  );
}
