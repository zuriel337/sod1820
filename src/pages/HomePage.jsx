import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getPostsFromSupabase, adaptPost } from "../lib/supabase.js";
import { C, F, calcGem } from "../theme.js";
import { stripHtml, formatDateHe, timeAgoHe } from "../lib/format.js";
import UpdatesBox from "../components/UpdatesBox.jsx";
import { useLegacyNav } from "../lib/legacyNav.js";
import VerifiedBadge from "../components/VerifiedBadge.jsx";
import VideoGallery from "../components/VideoGallery.jsx";

// רצועת מותג דקה — מעל השערים (סטטי, רגוע). כאן יושב המותג "סוד 1820".
function BrandStrip() {
  return (
    <section className="sod-brand">
      <span className="sod-brand-mark">סוד 1820</span>
      <span className="sod-brand-tag">בינה מלאכותית בשירות הגאולה</span>
    </section>
  );
}

// שערי המערכת — כרגע כל הדפים סגורים → מצב "🔒 בקרוב". הצופן = ELS (לא קשור ל-1820).
const GATES = [
  { icon: "✦", title: "ציר ההתגלות", sub: "ציר הזמן של הגאולה" },
  { icon: "🌳", title: "עץ המספרים", sub: "שורש כל מספר" },
  { icon: "📖", title: "בית המדרש", sub: "חידושי AI ומערכת" },
  { icon: "🔯", title: "הצופן התנ\"כי", sub: "דילוגי אותיות (ELS)" },
];

function GatesDeck() {
  return (
    <section className="sod-gates-wrap">
      <div className="sod-gates-eyebrow">⟡ שערי המערכת</div>
      <div className="sod-gates">
        {GATES.map(g => (
          <div key={g.title} className="sod-gate is-locked" aria-disabled="true">
            <span className="sod-gate-holo" aria-hidden />
            <span className="sod-gate-corner tl" /><span className="sod-gate-corner br" />
            <span className="sod-gate-icon">{g.icon}</span>
            <span className="sod-gate-title">{g.title}</span>
            <span className="sod-gate-sub">{g.sub}</span>
            <span className="sod-gate-go">🔒 בקרוב</span>
          </div>
        ))}
      </div>
    </section>
  );
}

// פרומו "ברוכים הבאים" — מתחת לשני הטורים. לוגו + ברכה + כפתור הרשמה (הפעולה הראשית כל עוד הכל נעול).
function WelcomePromo() {
  return (
    <section className="sod-welcome">
      <UpdatesBox
        variant="panel"
        source="home-welcome"
        title="ברוכים הבאים לעולם החדש"
        body="המסע כבר החל, ובכל יום מתווספים אליו עולמות, כלים ותגליות חדשות. תודה שאתם צועדים איתנו מההתחלה 🙏❤️ הטוב ביותר עוד לפנינו."
        cta="הצטרפו לעדכונים →"
        style={{ maxWidth: 560, margin: "0 auto" }}
      />
    </section>
  );
}

// טור ימין — 6 הפוסטים האחרונים לפי תאריך עדכון אחרון · עיצוב עתידני (HUD + זכוכית)
// תנועה: "זרקור" אוטומטי שעובר בין הכרטיסים כל 3 שניות (נעצר במעבר עכבר).
function LatestPostsRail({ posts, onPost }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || posts.length < 2) return;
    const t = setInterval(() => setActive(a => (a + 1) % posts.length), 3000);
    return () => clearInterval(t);
  }, [paused, posts.length]);

  return (
    <div style={{ direction: "rtl" }}>
      <div style={{ fontSize: 11, color: C.goldDim, letterSpacing: 4, fontFamily: F.heading, textTransform: "uppercase", marginBottom: 14, textAlign: "center" }}>
        📜 עדכונים אחרונים
      </div>
      {/* מסגרת תואמת להיכל השערים — צבע borderGold, גובה min(82vh,720px) */}
      <div className="sod-pf" style={{
        direction: "rtl", height: "min(82vh, 720px)", display: "flex", flexDirection: "column",
        borderRadius: 14, border: `1px solid ${C.borderGold}`, boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
        background: "linear-gradient(160deg, rgba(20,15,12,0.55), rgba(8,5,2,0.45))",
        padding: "16px 14px",
      }}
        onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="sod-pf-head">
        <span className="sod-pf-live"><span className="sod-pf-dot" />LIVE</span>
        <span className="sod-pf-line" />
        <span className="sod-pf-count">{String(posts.length).padStart(2, "0")}</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1, overflowY: "auto", paddingLeft: 2 }}>
        {posts.map((p, i) => {
          const image = p._embedded?.["wp:featuredmedia"]?.[0]?.source_url ?? null;
          const title = stripHtml(p.title?.rendered ?? "");
          const date = timeAgoHe(p.modified || p.date);
          const gem = calcGem(title);
          return (
            <button
              key={p.id}
              onClick={() => onPost(p)}
              className={`sod-pf-card${i === active ? " is-active" : ""}`}
              style={{ animationDelay: `${i * 90}ms` }}
            >
              <span className="sod-pf-scan" />
              <span className="sod-pf-idx">{String(i + 1).padStart(2, "0")}</span>

              <div className="sod-pf-thumb" style={{
                background: image ? `center/cover no-repeat url(${image})` : `linear-gradient(135deg, ${C.goldDeep}, ${C.faint})`,
              }}>
                {!image && <span className="sod-pf-thumb-mark">✦</span>}
                <span className="sod-pf-thumb-holo" />
                <span className="sod-pf-corner tl" /><span className="sod-pf-corner br" />
              </div>

              <div className="sod-pf-body">
                <div className="sod-pf-name">{title}</div>
                <div className="sod-pf-meta">
                  <span className="sod-pf-date" title={formatDateHe(p.modified || p.date)}>עודכן · {date}</span>
                  {gem > 0 && <span className="sod-pf-gem" title={`גימטריה: ${gem}`}>ג׳ {gem}</span>}
                </div>
              </div>
            </button>
          );
        })}
        {!posts.length && <div style={{ color: C.muted, fontSize: 13, padding: 12 }}>טוען פוסטים…</div>}
      </div>

      <Link to="/post" className="sod-pf-all">
        אל כל הפוסטים <span aria-hidden>→</span>
      </Link>
      </div>
    </div>
  );
}

// חידושי AI — בבנייה. נפתח בעוד שבוע (ספירה לאחור). מעל גלריית הסרטים.
function AiInsightsBox() {
  return (
    <section style={{ maxWidth: 1360, margin: "0 auto", padding: "8px 18px 16px", direction: "rtl" }}>
      <div style={{
        background: "linear-gradient(135deg, rgba(62,166,255,0.06), rgba(8,5,2,0.4))",
        border: `1px solid ${C.borderGold}`, borderRadius: 18, padding: "26px 22px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
          <h2 style={{ color: C.goldBright, fontFamily: F.regal, fontSize: "clamp(20px,3vw,26px)", fontWeight: 700, margin: 0 }}>
            🔵 חידושי AI
          </h2>
          <VerifiedBadge variant="ai" size={15} />
          <span style={{ flex: 1 }} />
          <span className="sod-soon">🚧 בבנייה</span>
        </div>
        <div style={{ textAlign: "center", padding: "10px 8px 4px" }}>
          <p style={{ color: C.goldDim, fontFamily: F.body, fontSize: 15.5, lineHeight: 1.9, maxWidth: 540, margin: "0 auto 22px" }}>
            החידושים החדשים שמופקים בעזרת בינה מלאכותית בדרך אליכם. נפתח בעוד שבוע:
          </p>
          <Countdown target={AI_LAUNCH} />
        </div>
      </div>
    </section>
  );
}

// ===== ספירה לאחור משותפת =====
// יעדים: חידושי AI — שבוע · ארכיון ההתגלות — שבוע. נעדכן כשנפתח לאוויר.
const AI_LAUNCH = new Date("2026-06-19T20:00:00+03:00").getTime();
const ARCHIVE_LAUNCH = new Date("2026-06-19T20:00:00+03:00").getTime();

function useCountdown(target) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const diff = Math.max(0, target - now);
  return {
    d: Math.floor(diff / 86400000),
    h: Math.floor((diff % 86400000) / 3600000),
    m: Math.floor((diff % 3600000) / 60000),
    s: Math.floor((diff % 60000) / 1000),
  };
}

function Countdown({ target }) {
  const { d, h, m, s } = useCountdown(target);
  const unit = (val, label) => (
    <div className="sod-cd-unit">
      <span className="sod-cd-num">{String(val).padStart(2, "0")}</span>
      <span className="sod-cd-lab">{label}</span>
    </div>
  );
  return (
    <div className="sod-cd">
      {unit(d, "ימים")}<span className="sod-cd-sep">:</span>
      {unit(h, "שעות")}<span className="sod-cd-sep">:</span>
      {unit(m, "דקות")}<span className="sod-cd-sep">:</span>
      {unit(s, "שניות")}
    </div>
  );
}

const ARCHIVE_FEATURES = [
  { e: "🌳", t: "לראות כל תמונה מחוברת לעץ המספרים ולערכים שלה" },
  { e: "🔍", t: "לגלות קשרים נסתרים בין גלריות, פוסטים וצפנים" },
  { e: "📜", t: "לנווט לפי שנים, אירועים, מספרי אם ונושאים" },
  { e: "🤖", t: "ליהנות מחיבורים חדשים שמופקים בעזרת בינה מלאכותית" },
  { e: "💎", t: "לפתוח שכבות עומק והפתעות שלא נחשפו מעולם" },
];

function ArchiveBox() {
  return (
    <section style={{ maxWidth: 1360, margin: "0 auto", padding: "8px 18px 56px", direction: "rtl" }}>
      <div className="sod-arch">
        <div className="sod-arch-head">
          <h2 className="sod-arch-title">🖼️ ארכיון ההתגלות</h2>
          <span className="sod-soon">🔒 בקרוב</span>
        </div>
        <p className="sod-arch-lead">עשר שנות מחקר. אלפי תמונות. אינספור רמזים, במקום אחד.</p>
        <p className="sod-arch-text">
          כאן נבנה מאגר חי שיחבר בין הגלריות הוותיקות, עץ המספרים, הגימטריות והצפנים,
          ויהפוך כל תמונה לשער לעולם שלם של משמעות.
        </p>
        <div className="sod-arch-sub">✨ בקרוב תוכלו:</div>
        <ul className="sod-arch-list">
          {ARCHIVE_FEATURES.map((f, i) => (
            <li key={i}><span className="sod-arch-emo">{f.e}</span>{f.t}</li>
          ))}
        </ul>
        <p className="sod-arch-foot">
          זו לא רק גלריה. זה ארכיון חי של התגלות, שבו כל תמונה היא רמז, וכל רמז פותח שער חדש.
        </p>
        <Countdown target={ARCHIVE_LAUNCH} />
      </div>
    </section>
  );
}

export default function HomePage() {
  const nav = useLegacyNav();
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    getPostsFromSupabase({ limit: 6, orderBy: "modified" })
      .then(({ posts: rows }) => setPosts((rows || []).map(r => ({ ...adaptPost(r), modified: r.modified, date: r.date }))))
      .catch(() => {});
  }, []);

  return (
    <div style={{ direction: "rtl" }}>
      <BrandStrip />
      <GatesDeck />

      {/* פריסת 2 טורים: פוסטים אחרונים (ימין) · היכל השערים (מרכז) */}
      <div style={{ maxWidth: 1360, margin: "0 auto", padding: "32px 18px 48px" }}>
        <div className="sod-home-grid" style={{
          display: "grid", gridTemplateColumns: "320px 1fr", gap: 24, alignItems: "start",
        }}>
          <LatestPostsRail posts={posts} onPost={(p) => nav("post", p)} />

          <div style={{ direction: "rtl" }}>
            <div style={{ borderRadius: 14, overflow: "hidden", border: `1px solid ${C.borderGold}`, boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}>
              <iframe
                src="/heichal.html"
                title="היכל השערים"
                loading="lazy"
                style={{ width: "100%", height: "min(82vh, 720px)", border: "none", display: "block" }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* פרומו ברוכים הבאים — מתחת לשני הטורים */}
      <WelcomePromo />

      {/* חידושי AI מעל גלריית הסרטים */}
      <AiInsightsBox />

      {/* גלריית הסרטים — מתחת לחידושי AI */}
      <VideoGallery />

      {/* ארכיון ההתגלות — הריבוע הגדול (מקום הגלריות) */}
      <ArchiveBox />

      <style>{`
        @media (max-width: 1080px) {
          .sod-home-grid { grid-template-columns: 1fr !important; }
        }

        /* ===== חזית הבית — רצועת מותג · שערים · פרומו ===== */

        /* ===== רצועת מותג ===== */
        .sod-brand { text-align: center; padding: 30px 20px 4px; direction: rtl; }
        .sod-brand-mark {
          display: block; font-family: ${F.cinzel}; font-size: clamp(26px, 4vw, 40px);
          font-weight: 700; letter-spacing: 6px; color: ${C.goldBright};
          text-shadow: 0 0 40px rgba(212,175,55,0.35);
        }
        .sod-brand-tag {
          display: block; margin-top: 8px; font-family: ${F.heading};
          font-size: 12px; letter-spacing: 3px; color: ${C.goldDim};
        }

        /* ===== פרומו ברוכים הבאים ===== */
        .sod-welcome { max-width: 1360px; margin: 0 auto; padding: 6px 18px 20px; text-align: center; direction: rtl; }

        /* ===== ארכיון ההתגלות — ריבוע גדול + ספירה לאחור ===== */
        .sod-arch {
          background: linear-gradient(135deg, rgba(132,88,255,0.07), rgba(62,166,255,0.05), rgba(8,5,2,0.45));
          border: 1px solid ${C.borderGold}; border-radius: 18px; padding: 44px 30px 38px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.45); text-align: center;
        }
        .sod-arch-head { display: flex; align-items: center; justify-content: center; gap: 14px; flex-wrap: wrap; margin-bottom: 14px; }
        .sod-arch-title { color: ${C.goldBright}; font-family: ${F.regal}; font-size: clamp(24px,3.6vw,34px); font-weight: 700; margin: 0; text-shadow: 0 0 40px rgba(212,175,55,0.3); }
        /* תג אחיד "בבנייה / בקרוב" לכל המדורים */
        .sod-soon {
          padding: 4px 14px; border-radius: 999px; border: 1px solid ${C.borderGold};
          background: rgba(212,175,55,0.08); color: ${C.goldBright};
          font-family: ${F.heading}; font-size: 12px; font-weight: 700; letter-spacing: 1px; white-space: nowrap;
        }
        .sod-arch-lead { color: ${C.goldLight}; font-family: ${F.regal}; font-size: clamp(16px,2.2vw,20px); font-weight: 700; margin: 0 auto 14px; max-width: 680px; line-height: 1.7; }
        .sod-arch-text { color: ${C.goldDim}; font-family: ${F.body}; font-size: 15.5px; line-height: 1.95; margin: 0 auto 24px; max-width: 680px; }
        .sod-arch-sub { color: ${C.goldBright}; font-family: ${F.heading}; font-size: 14px; font-weight: 700; letter-spacing: 1px; margin-bottom: 14px; }
        .sod-arch-list { list-style: none; margin: 0 auto 26px; padding: 0; max-width: 600px; text-align: right; display: grid; gap: 11px; }
        .sod-arch-list li { color: ${C.goldLight}; font-family: ${F.body}; font-size: 15px; line-height: 1.6; display: flex; gap: 11px; align-items: flex-start; }
        .sod-arch-emo { flex: 0 0 auto; font-size: 18px; line-height: 1.4; }
        .sod-arch-foot { color: ${C.goldDim}; font-family: ${F.regal}; font-size: clamp(15px,2vw,18px); font-style: italic; line-height: 1.8; margin: 0 auto 30px; max-width: 660px; }

        /* ספירה לאחור */
        .sod-cd { display: flex; align-items: center; justify-content: center; gap: 10px; flex-wrap: wrap; }
        .sod-cd-unit {
          display: flex; flex-direction: column; align-items: center; gap: 6px;
          min-width: 72px; padding: 14px 10px; border-radius: 12px;
          border: 1px solid ${C.borderGold}; background: rgba(8,5,2,0.55);
          box-shadow: inset 0 1px 0 rgba(246,226,122,0.06);
        }
        .sod-cd-num { font-family: ${F.mono}; font-size: clamp(26px,4vw,38px); font-weight: 800; color: ${C.goldBright}; line-height: 1; text-shadow: 0 0 18px rgba(212,175,55,0.35); }
        .sod-cd-lab { font-family: ${F.heading}; font-size: 11px; letter-spacing: 2px; color: ${C.goldDim}; }
        .sod-cd-sep { color: ${C.goldDim}; font-family: ${F.mono}; font-size: 26px; font-weight: 800; align-self: flex-start; margin-top: 10px; }
        @media (max-width: 460px) { .sod-cd-sep { display: none; } .sod-cd-unit { min-width: 64px; } }

        /* ===== שערי המערכת ===== */
        .sod-gates-wrap { max-width: 1360px; margin: 0 auto; padding: 8px 18px 6px; direction: rtl; }
        .sod-gates-eyebrow {
          text-align: center; font-size: 11px; color: ${C.goldDim}; letter-spacing: 4px;
          font-family: ${F.heading}; text-transform: uppercase; margin-bottom: 16px;
        }
        .sod-gates { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
        .sod-gate {
          position: relative; overflow: hidden; text-decoration: none;
          display: flex; flex-direction: column; align-items: center; gap: 6px;
          padding: 22px 16px 18px; border-radius: 14px;
          border: 1px solid ${C.border};
          background: linear-gradient(160deg, rgba(20,15,12,0.6), rgba(8,5,2,0.5));
          box-shadow: inset 0 1px 0 rgba(246,226,122,0.06);
          transition: transform 0.28s cubic-bezier(.2,.8,.2,1), border-color 0.28s, box-shadow 0.28s;
        }
        .sod-gate:hover {
          transform: translateY(-4px); border-color: ${C.gold};
          box-shadow: 0 16px 40px rgba(0,0,0,0.5), 0 0 26px rgba(212,175,55,0.14);
        }
        .sod-gate:focus-visible { outline: 2px solid ${C.gold}; outline-offset: 2px; }
        .sod-gate-holo {
          position: absolute; inset: 0; pointer-events: none; opacity: 0;
          background: linear-gradient(125deg, transparent 40%, rgba(246,226,122,0.10) 50%, transparent 60%);
          background-size: 220% 220%;
        }
        .sod-gate:hover .sod-gate-holo { opacity: 1; animation: sod-pf-holo 1.5s ease-in-out infinite; }
        .sod-gate-corner { position: absolute; width: 12px; height: 12px; border-color: ${C.goldBright}; opacity: 0.55; }
        .sod-gate-corner.tl { top: 8px; right: 8px; border-top: 1.5px solid; border-right: 1.5px solid; }
        .sod-gate-corner.br { bottom: 8px; left: 8px; border-bottom: 1.5px solid; border-left: 1.5px solid; }
        .sod-gate-icon { font-size: 30px; line-height: 1; filter: drop-shadow(0 0 10px rgba(212,175,55,0.4)); }
        .sod-gate-title { color: ${C.goldLight}; font-family: ${F.royal}; font-size: 16px; font-weight: 700; transition: color 0.28s; }
        .sod-gate:hover .sod-gate-title { color: ${C.goldBright}; }
        .sod-gate-sub { color: ${C.muted}; font-family: ${F.heading}; font-size: 11px; letter-spacing: 0.5px; }
        .sod-gate-go {
          margin-top: 6px; color: ${C.goldBright}; font-family: ${F.heading};
          font-size: 11px; font-weight: 700; letter-spacing: 1px;
          opacity: 0; transform: translateY(4px); transition: opacity 0.28s, transform 0.28s;
        }
        .sod-gate:hover .sod-gate-go { opacity: 1; transform: translateY(0); }
        /* מצב נעול — "בקרוב": בלי הרמה, התווית תמיד גלויה */
        .sod-gate.is-locked { cursor: default; }
        .sod-gate.is-locked:hover {
          transform: none; border-color: ${C.borderGold};
          box-shadow: inset 0 1px 0 rgba(246,226,122,0.06);
        }
        .sod-gate.is-locked:hover .sod-gate-holo { opacity: 0; animation: none; }
        .sod-gate.is-locked .sod-gate-go {
          opacity: 1; transform: none; color: ${C.muted}; letter-spacing: 0.5px;
        }
        @media (max-width: 760px) { .sod-gates { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 420px) { .sod-gates { grid-template-columns: 1fr; } }
        @media (prefers-reduced-motion: reduce) {
          .sod-gate:hover .sod-gate-holo { animation: none; }
        }

        /* ===== פוסטים אחרונים — עיצוב עתידני ===== */
        .sod-pf-head { display: flex; align-items: center; gap: 9px; margin-bottom: 18px; }
        .sod-pf-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: ${C.goldBright}; box-shadow: 0 0 10px ${C.goldBright}, 0 0 4px ${C.goldBright};
          animation: sod-pf-pulse 2.2s ease-in-out infinite;
        }
        .sod-pf-title {
          font-family: ${F.heading}; font-size: 12px; font-weight: 800;
          letter-spacing: 3px; text-transform: uppercase; color: ${C.goldBright};
        }
        .sod-pf-live {
          display: inline-flex; align-items: center; gap: 5px;
          font-family: ${F.mono}; font-size: 9px; font-weight: 800; letter-spacing: 1.5px;
          color: #ff6b6b; text-transform: uppercase;
          border: 1px solid rgba(255,107,107,0.4); border-radius: 4px; padding: 1px 6px 1px 5px;
          background: rgba(255,107,107,0.08);
        }
        .sod-pf-live .sod-pf-dot { background: #ff6b6b; box-shadow: 0 0 8px #ff6b6b, 0 0 3px #ff6b6b; }
        .sod-pf-line {
          flex: 1; height: 1px;
          background: linear-gradient(90deg, ${C.borderGold}, transparent);
        }
        .sod-pf-count {
          font-family: ${F.mono}; font-size: 11px; font-weight: 700;
          color: ${C.goldDim}; letter-spacing: 1px;
          border: 1px solid ${C.border}; border-radius: 4px; padding: 1px 6px;
        }
        @keyframes sod-pf-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.78); }
        }

        .sod-pf-card {
          position: relative; display: flex; align-items: stretch; gap: 12px;
          width: 100%; text-align: right; cursor: pointer; overflow: hidden;
          padding: 10px 12px 10px 10px; border-radius: 12px;
          background: linear-gradient(135deg, rgba(20,15,12,0.72), rgba(8,5,2,0.55));
          backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
          border: 1px solid ${C.border};
          box-shadow: inset 0 1px 0 rgba(246,226,122,0.06);
          transition: transform 0.28s cubic-bezier(.2,.8,.2,1), border-color 0.28s, box-shadow 0.28s;
          opacity: 0; transform: translateY(14px);
          animation: sod-pf-in 0.6s cubic-bezier(.2,.8,.2,1) forwards;
        }
        @keyframes sod-pf-in { to { opacity: 1; transform: translateY(0); } }
        /* קו זוהר נע בצד ההתחלה (ימין ב-RTL) */
        .sod-pf-card::before {
          content: ""; position: absolute; top: 10%; right: 0; width: 2px; height: 80%;
          background: linear-gradient(${C.goldDim}, ${C.goldBright}, ${C.goldDim});
          opacity: 0.45; transition: opacity 0.28s, box-shadow 0.28s;
        }
        .sod-pf-card:hover,
        .sod-pf-card.is-active {
          transform: translateY(-3px); border-color: ${C.gold};
          box-shadow: 0 14px 40px rgba(0,0,0,0.55), 0 0 24px rgba(212,175,55,0.14);
        }
        .sod-pf-card:hover::before,
        .sod-pf-card.is-active::before { opacity: 1; box-shadow: 0 0 14px ${C.goldBright}; }
        .sod-pf-card.is-active .sod-pf-thumb { filter: brightness(1) saturate(1.05); }
        .sod-pf-card.is-active .sod-pf-name { color: ${C.goldBright}; }
        @media (prefers-reduced-motion: reduce) {
          .sod-pf-card.is-active { transform: none; }
        }
        .sod-pf-card:focus-visible { outline: 2px solid ${C.gold}; outline-offset: 2px; }

        /* קו סריקה במעבר עכבר */
        .sod-pf-scan {
          position: absolute; inset: 0; pointer-events: none; opacity: 0;
          background: linear-gradient(180deg, transparent 0%, rgba(246,226,122,0.10) 50%, transparent 100%);
          transform: translateY(-100%);
        }
        .sod-pf-card:hover .sod-pf-scan { opacity: 1; animation: sod-pf-scan 1.1s ease-in-out; }
        @keyframes sod-pf-scan { 0% { transform: translateY(-100%); } 100% { transform: translateY(100%); } }

        .sod-pf-idx {
          position: absolute; top: 6px; left: 10px;
          font-family: ${F.mono}; font-size: 22px; font-weight: 700; line-height: 1;
          color: rgba(246,226,122,0.10); letter-spacing: -1px; pointer-events: none;
          transition: color 0.28s;
        }
        .sod-pf-card:hover .sod-pf-idx { color: rgba(246,226,122,0.22); }

        .sod-pf-thumb {
          position: relative; width: 62px; height: 62px; flex-shrink: 0;
          border-radius: 9px; overflow: hidden;
          display: flex; align-items: center; justify-content: center;
          filter: brightness(0.82) saturate(0.9);
          transition: filter 0.28s, transform 0.28s;
          border: 1px solid ${C.border};
        }
        .sod-pf-card:hover .sod-pf-thumb { filter: brightness(1) saturate(1.05); transform: scale(1.04); }
        .sod-pf-thumb-mark { color: ${C.borderGold}; font-size: 26px; font-family: ${F.body}; }
        .sod-pf-thumb-holo {
          position: absolute; inset: 0; pointer-events: none; opacity: 0.5;
          background: linear-gradient(125deg, transparent 40%, rgba(246,226,122,0.22) 50%, transparent 60%);
          background-size: 200% 200%; transition: opacity 0.28s;
        }
        .sod-pf-card:hover .sod-pf-thumb-holo { opacity: 1; animation: sod-pf-holo 1.4s ease-in-out infinite; }
        @keyframes sod-pf-holo { 0% { background-position: 0% 0%; } 100% { background-position: -200% -200%; } }
        .sod-pf-corner {
          position: absolute; width: 9px; height: 9px; pointer-events: none;
          border-color: ${C.goldBright}; opacity: 0.7;
        }
        .sod-pf-corner.tl { top: 4px; right: 4px; border-top: 1.5px solid; border-right: 1.5px solid; }
        .sod-pf-corner.br { bottom: 4px; left: 4px; border-bottom: 1.5px solid; border-left: 1.5px solid; }

        .sod-pf-body { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center; gap: 7px; padding-left: 4px; }
        .sod-pf-name {
          color: ${C.goldLight}; font-family: ${F.royal}; font-size: 14px; font-weight: 700; line-height: 1.42;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
          transition: color 0.28s;
        }
        .sod-pf-card:hover .sod-pf-name { color: ${C.goldBright}; }
        .sod-pf-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .sod-pf-date { color: ${C.muted}; font-family: ${F.heading}; font-size: 10px; letter-spacing: 0.5px; }
        .sod-pf-gem {
          font-family: ${F.mono}; font-size: 10px; font-weight: 700; letter-spacing: 0.5px;
          color: ${C.goldBright};
          background: linear-gradient(135deg, rgba(122,19,32,0.55), rgba(160,31,46,0.35));
          border: 1px solid ${C.borderGold}; border-radius: 20px; padding: 2px 8px;
          box-shadow: 0 0 0 rgba(212,175,55,0); transition: box-shadow 0.28s;
        }
        .sod-pf-card:hover .sod-pf-gem { box-shadow: 0 0 14px rgba(212,175,55,0.3); }

        .sod-pf-all {
          display: inline-flex; align-items: center; gap: 6px; margin-top: 18px;
          color: ${C.goldBright}; text-decoration: none; font-family: ${F.heading};
          font-size: 12px; font-weight: 700; letter-spacing: 1px;
          padding: 9px 16px; border-radius: 8px; border: 1px solid ${C.borderGold};
          background: rgba(20,15,12,0.5); transition: background 0.2s, gap 0.2s, box-shadow 0.2s;
        }
        .sod-pf-all:hover { background: ${C.surface2}; gap: 10px; box-shadow: 0 0 18px rgba(212,175,55,0.18); }

        @media (prefers-reduced-motion: reduce) {
          .sod-pf-card { animation: none; opacity: 1; transform: none; }
          .sod-pf-dot, .sod-pf-card:hover .sod-pf-scan, .sod-pf-card:hover .sod-pf-thumb-holo { animation: none; }
        }
      `}</style>
    </div>
  );
}
