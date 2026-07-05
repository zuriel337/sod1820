import React, { useState, useEffect, useRef } from "react";
import { C, F } from "../theme.js";

// 🔢 ספירה-עולה — המספר «רץ» מ-0 ליעד כשהוא נכנס למסך (אפקט-משפך חי).
function CountUp({ target, dur = 1100 }) {
  const [n, setN] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    let raf, start, seen = false;
    const run = () => {
      const tick = (t) => {
        if (!start) start = t;
        const p = Math.min((t - start) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        setN(Math.round(target * eased));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver((es) => {
      es.forEach(e => { if (e.isIntersecting && !seen) { seen = true; run(); } });
    }, { threshold: 0.4 });
    if (ref.current) io.observe(ref.current);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [target, dur]);
  return <span ref={ref}>{n.toLocaleString("he")}</span>;
}

// 🌫️ שכבת מספרים-נודדים ברקע — ambiance «משפך חי».
const FLOAT_NUMS = ["358", "1820", "102", "1020", "26", "776", "424", "541", "72"];
function FloatingNumbers() {
  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
      {FLOAT_NUMS.map((num, i) => (
        <span key={i} style={{
          position: "absolute", left: `${(i * 11 + 5) % 92}%`, bottom: -40,
          fontFamily: F.mono, fontSize: `${14 + (i % 4) * 6}px`, fontWeight: 800,
          color: "rgba(212,175,55,0.13)", whiteSpace: "nowrap",
          animation: `sodFloatUp ${9 + (i % 5) * 2.5}s linear ${i * 1.3}s infinite`,
        }}>{num}</span>
      ))}
    </div>
  );
}
import { useAuth } from "../lib/AuthContext.jsx";
import { getVisitorId } from "../lib/tracking.js";
import { subscribeEmail, getNotificationPrefs, saveNotificationPrefs } from "../lib/supabase.js";
import { resolveAuthor } from "../lib/authors.js";
import { trackSubscribe, trackConversion } from "../lib/marketing.js";

// מעקב בתוך הפוסט — הירשמו לעדכונים רק על הקטגוריה הזו / הכותב הזה.
// מקור אחד (עץ אחד): מייל ל-subscribers, נושאים דינמיים (cat:* / author:*) ל-notification_prefs.
// pc = פלטת צבעי הפוסט (כהה/תמה-מודע) כדי להשתלב.
export default function PostFollowBox({ categories = [], author = "", pc }) {
  const { user } = useAuth();
  const co = pc || C;

  // אפשרויות מעקב: קטגוריות + כותב (אם אינו "המערכת")
  const by = resolveAuthor(author);
  const opts = [];
  (categories || []).forEach(c => { if (c) opts.push({ key: `cat:${c}`, label: `📁 ${c}` }); });
  if (by.name && by.name !== "המערכת") opts.push({ key: `author:${by.name}`, label: `✍️ ${by.name}` });

  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  // 🔢 טיזר-גימטריה (ערכים מאומתים של צוריאל = נתון-מערכת). ההוק: שני ביטויים שונים = אותו ערך.
  const TEASERS = [
    { a: "אמונה", b: "מבין", v: 102, note: "אותו ערך!" },
    { a: "השגחה פרטית", v: 1020 },
  ];

  async function submit(e) {
    e?.preventDefault?.();
    setErr("");
    const mail = (user?.email || email).trim();
    if (!user && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) { setErr("נא להזין כתובת מייל תקינה"); return; }
    setBusy(true);
    try {
      if (mail) await subscribeEmail({ email: mail, source: "post-follow" });
      // עוקבים אוטומטית אחרי נושאי-הפוסט (בלי לבקש מהמשתמש לבחור — חיכוך מינימלי)
      const topics = opts.map(o => o.key);
      const id = user ? { userId: user.id } : { visitorId: getVisitorId() };
      const existing = await getNotificationPrefs(id).catch(() => null);
      const merged = Array.from(new Set([...(existing?.topics || []), ...topics]));
      await saveNotificationPrefs({
        ...id, topics: merged,
        channels: existing?.channels?.length ? existing.channels : ["email"],
        email: mail || existing?.email || null,
      }).catch(() => {});
      trackConversion("follow", { source: "post-follow" });
      if (mail) trackSubscribe({ source: "post-follow" });
      setDone(true);
    } catch {
      setErr("משהו השתבש — נסו שוב בעוד רגע");
    } finally {
      setBusy(false);
    }
  }

  const box = {
    marginTop: 52, direction: "rtl", textAlign: "center", position: "relative", overflow: "hidden",
    background: co.surface || C.surface, border: `1px solid ${co.borderGold || C.borderGold}`,
    borderRadius: 14, padding: "26px 22px",
  };
  const gold = co.goldBright || C.goldBright;
  const fx = <style>{`@keyframes sodFloatUp{0%{transform:translateY(0);opacity:0}12%{opacity:1}88%{opacity:1}100%{transform:translateY(-340px);opacity:0}}@keyframes sodTeaserIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`}</style>;

  if (done) {
    return (
      <div style={box}>
        <div style={{ color: gold, fontFamily: F.regal, fontSize: 17, fontWeight: 700 }}>
          ✦ מעולה! נשלח לכם עוד רמזים והתכנסויות מפתיעות. 🙏
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} style={box}>
      {fx}
      <FloatingNumbers />
      <div style={{ position: "relative", zIndex: 1 }}>
      {/* 🔢 הטיזר — ההוק לפני הבקשה */}
      <div style={{ color: gold, fontFamily: F.regal, fontSize: "clamp(17px,2.4vw,21px)", fontWeight: 800, marginBottom: 14 }}>
        🔢 ידעתם?
      </div>
      <div style={{ display: "grid", gap: 8, maxWidth: 420, margin: "0 auto 18px" }}>
        {TEASERS.map((t, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, flexWrap: "wrap",
            background: "rgba(212,175,55,0.08)", border: `1px solid ${co.border || C.border}`, borderRadius: 12, padding: "10px 14px",
            animation: `sodTeaserIn .5s ease ${i * 0.18}s both` }}>
            <span style={{ color: co.goldLight || C.goldLight, fontFamily: F.regal, fontSize: 17, fontWeight: 700 }}>{t.a}</span>
            {t.b && <><span style={{ color: co.muted || C.muted }}>=</span><span style={{ color: co.goldLight || C.goldLight, fontFamily: F.regal, fontSize: 17, fontWeight: 700 }}>{t.b}</span></>}
            <span style={{ color: co.muted || C.muted }}>=</span>
            <span style={{ color: gold, fontFamily: F.mono, fontSize: 20, fontWeight: 800, textShadow: "0 0 14px rgba(212,175,55,0.45)" }}><CountUp target={t.v} /></span>
            {t.note && <span style={{ color: gold, fontFamily: F.heading, fontSize: 11.5, fontWeight: 800, background: "rgba(212,175,55,0.18)", borderRadius: 999, padding: "2px 10px" }}>✦ {t.note}</span>}
          </div>
        ))}
      </div>

      {/* ✦ הפרשנות שמחברת — מבין=אמונה (102) ⇢ השגחה פרטית (1020) */}
      <div style={{ color: co.goldLight || C.goldLight, fontFamily: F.body, fontSize: "clamp(14px,2vw,16px)", lineHeight: 1.75, maxWidth: 440, margin: "0 auto 18px" }}>
        ✦ <b style={{ color: gold }}>ההבנה האמיתית היא להאמין</b> — «מבין» ו«אמונה» הם אותו ערך.<br />ומהאמונה נולדת <b style={{ color: gold }}>השגחה פרטית</b>.
      </div>

      <div style={{ color: gold, fontFamily: F.regal, fontSize: "clamp(16px,2.2vw,19px)", fontWeight: 800, marginBottom: 4 }}>
        ✨ רוצים לקבל עוד חיבורים כמו אלה?
      </div>
      <div style={{ color: co.muted || C.muted, fontFamily: F.body, fontSize: 14, marginBottom: 16 }}>
        השאירו מייל — ונשלח לכם התכנסויות ורמזים מפתיעים. בלי הצפה, אפשר לבטל בכל רגע.
      </div>

      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
        {!user && (
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="האימייל שלכם" dir="ltr"
            style={{ flex: "1 1 220px", minWidth: 200, padding: "11px 14px", borderRadius: 10,
              background: co.bg || C.surface, border: `1px solid ${co.border || C.border}`, color: co.goldLight || C.goldLight,
              fontFamily: F.body, fontSize: 16, textAlign: "center", outline: "none" }} />
        )}
        <button type="submit" disabled={busy} style={{
          padding: "11px 26px", borderRadius: 10, border: "none", cursor: busy ? "wait" : "pointer",
          background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, color: "#1a0e00",
          fontFamily: F.heading, fontSize: 15, fontWeight: 800, whiteSpace: "nowrap",
        }}>{busy ? "רושם…" : "כן, שלחו לי עוד →"}</button>
      </div>
      {err && <div style={{ color: "#e0857a", fontFamily: F.body, fontSize: 13, marginTop: 12 }}>{err}</div>}
      </div>
    </form>
  );
}
