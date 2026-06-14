import React, { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { C, F, LOGO_URL } from "../theme.js";
import { SectionHeader } from "../components/ui.jsx";
import UnderConstruction from "../components/layout/UnderConstruction.jsx";
import UpdatesBox from "../components/UpdatesBox.jsx";
import { NAV } from "../routes.jsx";
import { supabase } from "../lib/supabase.js";
import { stripHtml, formatDateHe } from "../lib/format.js";
import { METHODS as GEM_METHODS, onlyHeb } from "../lib/gematria.js";
import { applySeo, SITE_URL } from "../lib/seo.js";

export function ArchivePage() {
  return <UnderConstruction emoji="🖼" title="ארכיון ההתגלות"
    description="כל התמונות, הצפנים והממצאים במקום אחד — עם סינון לפי שנה, נושא, תגית, מספר, מלחמות, צפנים, משיח ותורה, מנוע OCR, וחיבור חי לעץ המספרים."
    links={[{ to: "/numbers", label: "עץ המספרים" }, { to: "/code", label: "הצופן התנ\"כי" }]} />;
}

const MEMBER_PERKS = [
  { icon: "📜", t: "שיעורים מלאים", d: "סדרות לימוד מובנות, צעד אחר צעד" },
  { icon: "🎓", t: "קורסים מעמיקים", d: "ממבוא ועד מתקדם בשפת המספרים" },
  { icon: "🌳", t: "העץ המתקדם", d: "הרבדים הנסתרים של עץ המספרים" },
  { icon: "🔐", t: "צפנים בלעדיים", d: "דילוגים וגילויים שמורים לחברים" },
  { icon: "🔎", t: "חיפושים מורחבים", d: "כלי חקירה עמוקים בכל המאגר" },
  { icon: "⚡", t: "גישה מוקדמת", d: "כל חידוש מגיע אליכם ראשונים" },
];

export function MembersPage() {
  return (
    <div style={{ direction: "rtl", position: "relative", zIndex: 1, maxWidth: 940, margin: "0 auto", padding: "70px 22px 110px", textAlign: "center" }}>
      {/* כתר + לוגו זוהר */}
      <div style={{ position: "relative", display: "inline-block", marginBottom: 22 }}>
        <span style={{ position: "absolute", top: -22, insetInline: 0, fontSize: 30, filter: "drop-shadow(0 0 10px rgba(232,200,74,0.6))" }}>👑</span>
        <img src={LOGO_URL} alt="בני ההיכל" className="logo-animated" style={{ width: 104, height: 104, borderRadius: "50%", objectFit: "cover", border: `2px solid ${C.borderGold}`, boxShadow: "0 0 60px rgba(212,175,55,0.45)" }} />
      </div>
      <div style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 12.5, letterSpacing: 5, textTransform: "uppercase", marginBottom: 10 }}>אזור המנויים</div>
      <h1 style={{ color: C.goldBright, fontFamily: F.regal, fontSize: "clamp(32px,6.5vw,56px)", fontWeight: 800, margin: "0 0 14px", textShadow: "0 0 55px rgba(212,175,55,0.4)" }}>בני ההיכל</h1>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(212,175,55,0.08)", border: `1px solid ${C.borderGold}`, borderRadius: 999, padding: "7px 18px", color: C.goldLight, fontFamily: F.heading, fontSize: 13.5, fontWeight: 700, marginBottom: 22 }}>
        🔒 השער ייפתח בקרוב
      </div>
      <p style={{ color: C.muted, fontFamily: F.body, fontSize: 17, lineHeight: 2, maxWidth: 580, margin: "0 auto 40px" }}>
        מאחורי השער נפתח עולם שלם — לימוד עמוק, צפנים בלעדיים וכלי חקירה השמורים לבני ההיכל. אנחנו בונים אותו בקפידה, אבן אחר אבן.
      </p>

      {/* רשת ההטבות — נעולה */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 14, textAlign: "right", marginBottom: 44 }}>
        {MEMBER_PERKS.map(p => (
          <div key={p.t} style={{ position: "relative", overflow: "hidden", background: "linear-gradient(160deg, rgba(20,15,12,0.65), rgba(8,5,2,0.5))", border: `1px solid ${C.border}`, borderRadius: 16, padding: "20px 20px" }}>
            <span style={{ position: "absolute", top: 14, insetInlineStart: 14, fontSize: 12, opacity: 0.55 }}>🔒</span>
            <div style={{ fontSize: 27, marginBottom: 9 }}>{p.icon}</div>
            <div style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 18.5, fontWeight: 700, marginBottom: 5 }}>{p.t}</div>
            <div style={{ color: C.muted, fontFamily: F.body, fontSize: 13.5, lineHeight: 1.75 }}>{p.d}</div>
            <span aria-hidden style={{ position: "absolute", inset: 0, background: `radial-gradient(120% 80% at 50% -10%, rgba(212,175,55,0.10), transparent 60%)`, pointerEvents: "none" }} />
          </div>
        ))}
      </div>

      {/* גישה מוקדמת — נשאר "סגור" אבל מזמין הרשמה */}
      <UpdatesBox source="members" title="רוצים להיכנס ראשונים?" body="הירשמו עכשיו ותקבלו גישה מוקדמת לבני ההיכל ברגע שהשער ייפתח." cta="שריינו לי מקום →" />

      <div style={{ marginTop: 26 }}>
        <Link to="/beit-midrash" style={{ color: C.goldLight, textDecoration: "none", fontFamily: F.heading, fontSize: 14, fontWeight: 700 }}>← בינתיים, בקרו בבית המדרש</Link>
      </div>
    </div>
  );
}

const COMMUNITY = [
  { emoji: "💬", title: "הצ'אט הוותיק", to: "/community/chat", live: true, stat: "133.7k הודעות" },
  { emoji: "🧮", title: "מחשבון גימטריה", to: "/community/calculator", live: true, stat: "8 שיטות · שיתוף" },
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
            {c.stat && (
              <div style={{ marginTop: 6, color: C.goldLight, fontFamily: F.heading, fontSize: 13, fontWeight: 700 }}>
                <span style={{ fontFamily: F.mono }}>💬 {c.stat}</span>
              </div>
            )}
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

// ===== 🧮 מחשבון גימטריה — דף ויראלי (שם/שניים + שיתוף וואטסאפ) =====
function gemAll(name) {
  const all = GEM_METHODS.map(m => ({ key: m.key, sub: m.sub, value: m.fn(name) }));
  return { regular: all[0].value, all };
}

export function CommunityCalculatorPage() {
  const [name1, setName1] = useState("");
  const [name2, setName2] = useState("");
  const [compare, setCompare] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    applySeo({
      title: "מחשבון גימטריה",
      description: "מחשבון גימטריה חינמי ומדויק — חשבו את ערך השם או המילה ב-8 שיטות (רגיל, מילוי, מסתתר, קדמי, אתב\"ש, אלב\"ם, סידורי, גדול), השוו בין שני שמות וגלו את הסוד שמאחורי המספרים. שתפו בוואטסאפ.",
      path: "/community/calculator",
    });
  }, []);

  const r1 = onlyHeb(name1).length ? gemAll(name1) : null;
  const r2 = (compare && onlyHeb(name2).length) ? gemAll(name2) : null;
  const matches = (r1 && r2) ? r1.all.filter((a, i) => a.value === r2.all[i].value) : [];

  const shareText = !r1 ? "" : (
    r2
      ? `גימטריה: "${name1.trim()}" = ${r1.regular} · "${name2.trim()}" = ${r2.regular}${matches.length ? " ✨ יש ביניהם התאמה!" : ""}\nבדקו את שלכם במחשבון הגימטריה של סוד 1820:\n${SITE_URL}/community/calculator`
      : `הגימטריה של "${name1.trim()}" = ${r1.regular} ✨\nגלו את הסוד בשם שלכם במחשבון של סוד 1820:\n${SITE_URL}/community/calculator`
  );

  const inp = { width: "100%", background: C.surface, border: `1px solid ${C.borderGold}`, borderRadius: 10, color: C.goldBright, fontFamily: F.heading, fontSize: 20, fontWeight: 700, padding: "14px 16px", textAlign: "center", outline: "none" };

  function ResultBlock({ name, r }) {
    return (
      <div style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 14, padding: "20px 18px" }}>
        <div style={{ textAlign: "center", marginBottom: 14 }}>
          <div style={{ color: C.muted, fontFamily: F.heading, fontSize: 13, marginBottom: 2 }}>{name.trim()}</div>
          <Link to={`/number/${r.regular}`} style={{ textDecoration: "none" }}>
            <div style={{ color: C.goldBright, fontFamily: F.mono, fontSize: 54, fontWeight: 800, lineHeight: 1.1 }}>{r.regular}</div>
            <div style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 11 }}>גימטריה רגילה · לחצו לחקירה →</div>
          </Link>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(104px,1fr))", gap: 8 }}>
          {r.all.map(a => (
            <Link key={a.key} to={`/number/${a.value}`} title={a.sub} style={{ textDecoration: "none", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 6px", textAlign: "center" }}>
              <div style={{ color: C.muted, fontFamily: F.heading, fontSize: 11 }}>{a.key}</div>
              <div style={{ color: C.goldLight, fontFamily: F.mono, fontSize: 18, fontWeight: 700 }}>{a.value}</div>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ direction: "rtl", maxWidth: 760, margin: "0 auto", padding: "56px 18px 100px", position: "relative", zIndex: 1 }}>
      <SectionHeader eyebrow="כלי חינמי" title="🧮 מחשבון גימטריה" />
      <p style={{ color: C.muted, fontFamily: F.body, fontSize: 15, lineHeight: 1.9, textAlign: "center", margin: "-8px auto 26px", maxWidth: 580 }}>
        מחשבון הגימטריה של <b style={{ color: C.goldLight }}>סוד 1820</b> — הזינו שם או מילה בעברית וגלו את ערכם ב-8 שיטות. אפשר גם להשוות בין שני שמות ולמצוא התאמות נסתרות. ✨
      </p>

      <div style={{ display: "grid", gap: 12, marginBottom: 8 }}>
        <input style={inp} value={name1} onChange={e => setName1(e.target.value)} placeholder="הקלידו שם / מילה בעברית…" autoFocus />
        {compare && <input style={inp} value={name2} onChange={e => setName2(e.target.value)} placeholder="שם שני להשוואה…" />}
      </div>
      <div style={{ textAlign: "center", marginBottom: 26 }}>
        <button onClick={() => setCompare(c => !c)} style={{ cursor: "pointer", background: "none", border: "none", color: C.goldDim, fontFamily: F.heading, fontSize: 13, textDecoration: "underline" }}>
          {compare ? "− הסר השוואה" : "+ השוואת שני שמות"}
        </button>
      </div>

      {r1 && (
        <div style={{ display: "grid", gap: 16 }}>
          <ResultBlock name={name1} r={r1} />
          {r2 && <ResultBlock name={name2} r={r2} />}

          {r2 && (
            <div style={{ background: matches.length ? "rgba(212,175,55,0.12)" : C.surface2, border: `1px solid ${matches.length ? C.gold : C.border}`, borderRadius: 14, padding: "18px", textAlign: "center" }}>
              {matches.length ? (
                <>
                  <div style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 18, fontWeight: 700, marginBottom: 6 }}>✨ נמצאה התאמה!</div>
                  <div style={{ color: C.goldLight, fontFamily: F.body, fontSize: 14 }}>
                    שני השמות שווים ב{matches.length === 1 ? "שיטת" : "שיטות"}: {matches.map(m => `${m.key} (${m.value})`).join(" · ")}
                  </div>
                </>
              ) : (
                <div style={{ color: C.muted, fontFamily: F.body, fontSize: 14 }}>
                  אין התאמה ישירה. סכום שתי הגימטריות הרגילות: <b style={{ color: C.goldLight }}>{r1.regular + r2.regular}</b>
                </div>
              )}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 2 }}>
            <a href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer"
              style={{ background: "#25D366", color: "#06310f", fontFamily: F.heading, fontSize: 15, fontWeight: 800, padding: "12px 26px", borderRadius: 999, textDecoration: "none" }}>
              🟢 שתפו בוואטסאפ
            </a>
            <button onClick={() => { navigator.clipboard?.writeText(shareText); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
              style={{ cursor: "pointer", background: C.surface, color: C.goldLight, border: `1px solid ${C.borderGold}`, fontFamily: F.heading, fontSize: 15, fontWeight: 700, padding: "12px 22px", borderRadius: 999 }}>
              {copied ? "✓ הועתק" : "🔗 העתק"}
            </button>
          </div>
        </div>
      )}

      <div style={{ marginTop: 32 }}>
        <div style={{ textAlign: "center", color: C.goldDim, fontFamily: F.heading, fontSize: 12, letterSpacing: 3, textTransform: "uppercase", marginBottom: 14 }}>בקרוב במחשבון</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))", gap: 12 }}>
          {[
            { icon: "🤖", title: "ניתוח AI אישי", desc: "ה-AI ינתח שמות, ימצא מילים שוות, קשרים נסתרים ומשמעויות — והשוואות חכמות בין שני שמות." },
            { icon: "📸", title: "חיפוש מסרים מתמונה", desc: "צלמו לוחית רכב / שעון / קבלה — המספר ייקרא וינותח. (התמונה לא נשמרת — רק המספר.)" },
            { icon: "🔄", title: "סנכרוניות", desc: "חיבור המספר שלכם לאירועים אמיתיים בעולם ולרמזי הגאולה — בשפת המספרים." },
          ].map(c => (
            <div key={c.title} style={{ background: C.surface2, border: `1px dashed ${C.borderGold}`, borderRadius: 14, padding: "18px 16px", textAlign: "center" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{c.icon}</div>
              <div style={{ display: "inline-block", background: "rgba(122,19,32,0.25)", border: `1px solid ${C.borderGold}`, color: C.goldBright, borderRadius: 999, padding: "2px 10px", fontFamily: F.heading, fontSize: 10, fontWeight: 700, marginBottom: 8 }}>בקרוב</div>
              <div style={{ color: C.goldLight, fontFamily: F.regal, fontSize: 16, fontWeight: 700, marginBottom: 5 }}>{c.title}</div>
              <div style={{ color: C.muted, fontFamily: F.body, fontSize: 13, lineHeight: 1.7 }}>{c.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
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
