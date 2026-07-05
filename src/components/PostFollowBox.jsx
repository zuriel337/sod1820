import React, { useState } from "react";
import { C, F } from "../theme.js";
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
    marginTop: 52, direction: "rtl", textAlign: "center",
    background: co.surface || C.surface, border: `1px solid ${co.borderGold || C.borderGold}`,
    borderRadius: 14, padding: "26px 22px",
  };
  const gold = co.goldBright || C.goldBright;

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
      {/* 🔢 הטיזר — ההוק לפני הבקשה */}
      <div style={{ color: gold, fontFamily: F.regal, fontSize: "clamp(17px,2.4vw,21px)", fontWeight: 800, marginBottom: 14 }}>
        🔢 ידעתם?
      </div>
      <div style={{ display: "grid", gap: 8, maxWidth: 420, margin: "0 auto 18px" }}>
        {TEASERS.map((t, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, flexWrap: "wrap",
            background: "rgba(212,175,55,0.08)", border: `1px solid ${co.border || C.border}`, borderRadius: 12, padding: "10px 14px" }}>
            <span style={{ color: co.goldLight || C.goldLight, fontFamily: F.regal, fontSize: 17, fontWeight: 700 }}>{t.a}</span>
            {t.b && <><span style={{ color: co.muted || C.muted }}>=</span><span style={{ color: co.goldLight || C.goldLight, fontFamily: F.regal, fontSize: 17, fontWeight: 700 }}>{t.b}</span></>}
            <span style={{ color: co.muted || C.muted }}>=</span>
            <span style={{ color: gold, fontFamily: F.mono, fontSize: 19, fontWeight: 800 }}>{t.v}</span>
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
    </form>
  );
}
