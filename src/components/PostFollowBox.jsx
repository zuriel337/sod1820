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

  const [picked, setPicked] = useState([]); // ריק — המשתמש בוחר נושא קודם, ורק אז נחשף שדה המייל
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  if (!opts.length) return null;

  const toggle = (k) => { setErr(""); setPicked(p => p.includes(k) ? p.filter(x => x !== k) : [...p, k]); };

  async function submit(e) {
    e?.preventDefault?.();
    setErr("");
    const mail = (user?.email || email).trim();
    if (!user && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) { setErr("נא להזין כתובת מייל תקינה"); return; }
    if (!picked.length) { setErr("בחרו לפחות נושא אחד"); return; }
    setBusy(true);
    try {
      if (mail) await subscribeEmail({ email: mail, source: "post-follow" });
      const id = user ? { userId: user.id } : { visitorId: getVisitorId() };
      const existing = await getNotificationPrefs(id);                       // מיזוג — לא לדרוס בחירות קודמות
      const merged = Array.from(new Set([...(existing?.topics || []), ...picked]));
      await saveNotificationPrefs({
        ...id, topics: merged,
        channels: existing?.channels?.length ? existing.channels : ["email"],
        email: mail || existing?.email || null,
      });
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

  if (done) {
    return (
      <div style={box}>
        <div style={{ color: co.goldBright || C.goldBright, fontFamily: F.regal, fontSize: 17, fontWeight: 700 }}>
          ✦ נרשמתם! נעדכן אתכם כשיֵצא חדש בנושאים שבחרתם. 🙏
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} style={box}>
      <div style={{ color: co.goldBright || C.goldBright, fontFamily: F.regal, fontSize: "clamp(17px,2.4vw,21px)", fontWeight: 700, marginBottom: 6 }}>
        🔔 רוצים לדעת כשיֵצא עוד כזה?
      </div>
      <div style={{ color: co.muted || C.muted, fontFamily: F.body, fontSize: 14, marginBottom: 16 }}>
        הירשמו לעדכונים על מה שמעניין אתכם — בלי הצפה, אפשר לבטל בכל רגע.
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 7, justifyContent: "center", marginBottom: 16 }}>
        {opts.map(o => {
          const on = picked.includes(o.key);
          return (
            <button key={o.key} type="button" onClick={() => toggle(o.key)} style={{
              cursor: "pointer", fontFamily: F.heading, fontSize: 13, fontWeight: 600, padding: "7px 14px", borderRadius: 999,
              border: `1px solid ${on ? (co.gold || C.gold) : (co.border || C.border)}`,
              background: on ? "rgba(212,175,55,0.16)" : "transparent",
              color: on ? (co.goldBright || C.goldBright) : (co.muted || C.muted),
            }}>{o.label}{on ? " ✓" : ""}</button>
          );
        })}
      </div>

      {/* רק אחרי שבחרו נושא — נחשף שדה המייל וכפתור ההרשמה (חשיפה מדורגת) */}
      {picked.length === 0 ? (
        <div style={{ color: co.muted || C.muted, fontFamily: F.heading, fontSize: 13, opacity: 0.85 }}>
          👆 בחרו נושא שמעניין אתכם — ואז תוכלו להשאיר מייל לעדכונים
        </div>
      ) : (
        <div style={{ animation: "sodFollowReveal .35s ease" }}>
          <style>{`@keyframes sodFollowReveal{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}`}</style>
          {!user && (
            <div style={{ color: co.goldLight || C.goldLight, fontFamily: F.heading, fontSize: 13.5, fontWeight: 700, marginBottom: 9 }}>
              📧 לאן לשלוח את העדכונים?
            </div>
          )}
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            {!user && (
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="האימייל שלכם" dir="ltr" autoFocus
                style={{ flex: "1 1 220px", minWidth: 200, padding: "11px 14px", borderRadius: 10,
                  background: co.bg || C.surface, border: `1px solid ${co.border || C.border}`, color: co.goldLight || C.goldLight,
                  fontFamily: F.body, fontSize: 15, textAlign: "center", outline: "none" }} />
            )}
            <button type="submit" disabled={busy} style={{
              padding: "11px 26px", borderRadius: 10, border: "none", cursor: busy ? "wait" : "pointer",
              background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, color: "#1a0e00",
              fontFamily: F.heading, fontSize: 15, fontWeight: 800, whiteSpace: "nowrap",
            }}>{busy ? "רושם…" : "עדכנו אותי →"}</button>
          </div>
        </div>
      )}
      {err && <div style={{ color: "#e0857a", fontFamily: F.body, fontSize: 13, marginTop: 12 }}>{err}</div>}
    </form>
  );
}
