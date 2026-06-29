import React, { useState, useEffect } from "react";
import { sendContactMessage } from "../lib/supabase.js";

// ============================================================
//  דף "צור קשר" — נבנה מחדש, תומך מצב יום/לילה (light/dark)
//  ערכת הצבעים מוגדרת ב-CSS variables לפי data-theme; ברירת המחדל
//  לפי העדפת מערכת ההפעלה (prefers-color-scheme) ונשמרת ב-localStorage.
// ============================================================

const THEME_KEY = "sod-contact-theme";

const CONTACT_LINKS = [
  { icon: "✉", label: "אימייל", value: "yosiviner7@gmail.com", href: "mailto:yosiviner7@gmail.com" },
  { icon: "🤝", label: "וואטסאפ · שיתופי פעולה", value: "055-6651237", href: "https://wa.me/972556651237" },
  { icon: "👥", label: "קבוצת גימטריה בוואטסאפ", value: "הצטרפו לקבוצה", href: "https://chat.whatsapp.com/FaI8Nq95NMrCvZheSrW6Ql" },
  { icon: "📸", label: "אינסטגרם", value: "@zuriel7676", href: "https://www.instagram.com/zuriel7676?igsh=ZnJodWtxcnh1Y3dp" },
  { icon: "👍", label: "פייסבוק — הדף", value: "סוד 1820", href: "https://www.facebook.com/sod1820" },
  { icon: "👤", label: "פייסבוק — אישי", value: "צוריאל", href: "https://www.facebook.com/share/1ECyfiRu3e/" },
  { icon: "🌐", label: "אתר", value: "sod1820.co.il", href: "https://sod1820.co.il" },
];

const ABOUT_PARAS = [
  "מאחורי המיזם עומד צוריאל, יחד עם צוות רחב של חוקרי רמזים, גימטריה וקבלה מהארץ ומהעולם, הפועלים במשך שנים באיסוף, תיעוד ופיתוח של מאגר ידע ייחודי.",
  "במשך יותר מעשור נאספו אלפי חיבורים, מספרים, צפנים ותובנות, שהפכו בהדרגה למערכת חיה ומתפתחת המחברת בין מסורת, מחקר וטכנולוגיה מתקדמת.",
  "החזון הוא לבנות את מאגר רמזי הגאולה הגדול בעולם – מקום שבו כל פוסט, מספר, תמונה וצופן מתחברים יחד לכדי תמונה רחבה אחת, ומאפשרים לכל אדם לחקור, לגלות ולהעמיק בשפת המספרים בדרך חדשה. ✨",
];

const CSS = `
.contact-page {
  --bg:#07050E; --panel:#0d0a0e; --panel-2:#140f0c;
  --border:rgba(212,175,55,0.18); --border-gold:rgba(212,175,55,0.40);
  --gold:#d4af37; --gold-bright:#f6e27a; --gold-dim:#9a7818;
  --crimson:#a01f2e; --crimson-deep:#7a1320;
  --text:#ede4d3; --text-soft:#d8cdb8; --muted:#bdb6c4;
  --input-bg:#140f0c; --shadow:0 18px 48px rgba(0,0,0,0.55);
  --hero-glow:radial-gradient(60% 80% at 50% 0%, rgba(212,175,55,0.10), transparent 70%);
  --h1:#f6e27a;
  direction:rtl; min-height:100%;
  background:var(--bg); color:var(--text);
  transition:background .35s ease, color .35s ease;
}
.contact-page[data-theme="light"] {
  --bg:#f6f0e2; --panel:#fffdf8; --panel-2:#fbf5e8;
  --border:rgba(122,19,32,0.16); --border-gold:rgba(154,120,24,0.45);
  --gold:#9a7818; --gold-bright:#7a5c0e; --gold-dim:#8a6a14;
  --crimson:#a01f2e; --crimson-deep:#7a1320;
  --text:#2c2118; --text-soft:#4a3a28; --muted:#6b5d49;
  --input-bg:#fffdf8; --shadow:0 18px 40px rgba(90,66,18,0.14);
  --hero-glow:radial-gradient(60% 80% at 50% 0%, rgba(154,120,24,0.14), transparent 70%);
  --h1:#7a1320;
}
.contact-page__wrap { max-width:1040px; margin:0 auto; padding:56px 16px 96px; position:relative; }
.contact-page__glow { position:absolute; inset:0 0 auto 0; height:420px; background:var(--hero-glow); pointer-events:none; }

.contact-toggle {
  position:absolute; top:20px; inset-inline-start:16px; z-index:2;
  display:inline-flex; align-items:center; gap:8px;
  background:var(--panel); color:var(--gold);
  border:1px solid var(--border-gold); border-radius:999px;
  font-family:'Heebo',sans-serif; font-size:13px; font-weight:600;
  padding:8px 16px; cursor:pointer; transition:all .2s ease;
}
.contact-toggle:hover { border-color:var(--gold); box-shadow:0 0 0 3px var(--border); }

.contact-hero { text-align:center; margin-bottom:48px; position:relative; }
.contact-eyebrow { font-size:10px; color:var(--gold-dim); font-family:'Heebo',sans-serif; letter-spacing:4px; text-transform:uppercase; margin-bottom:10px; }
.contact-hero h1 { color:var(--h1); font-family:'Heebo',sans-serif; font-size:clamp(28px,6vw,52px); font-weight:800; margin:0 0 14px; letter-spacing:1px; }
.contact-hero p { color:var(--muted); font-family:'Heebo',sans-serif; font-size:16px; max-width:480px; margin:0 auto; line-height:1.7; }
.contact-divider { width:140px; height:1px; margin:22px auto 0; background:linear-gradient(90deg,transparent,var(--gold),transparent); }

.contact-about {
  max-width:820px; margin:0 auto 48px; border-radius:4px;
  background:linear-gradient(160deg, var(--panel) 0%, var(--panel-2) 100%);
  border:1px solid var(--border); border-top:3px solid var(--gold);
  padding:34px 32px; box-shadow:var(--shadow);
}
.contact-about__title { font-size:10px; color:var(--gold-dim); font-family:'Heebo',sans-serif; letter-spacing:4px; text-transform:uppercase; margin-bottom:16px; text-align:center; }
.contact-about p { color:var(--text-soft); font-family:'Heebo',sans-serif; font-size:16px; line-height:2.0; margin:0 0 14px; text-align:center; }
.contact-about p:last-child { margin-bottom:0; color:var(--gold); }

.contact-grid { display:grid; grid-template-columns:1fr 1fr; gap:32px; align-items:start; }

.contact-card { background:var(--panel); border:1px solid var(--border); border-radius:4px; box-shadow:var(--shadow); }
.contact-card--form { border-top:3px solid var(--gold); padding:34px 30px; }
.contact-card--author { border-top:3px solid var(--crimson); padding:26px 26px 22px; }

.contact-field { margin-bottom:18px; }
.contact-field label { display:block; color:var(--gold-dim); font-family:'Heebo',sans-serif; font-size:11px; letter-spacing:2px; text-transform:uppercase; margin-bottom:6px; }
.contact-field input, .contact-field textarea {
  width:100%; box-sizing:border-box; background:var(--input-bg);
  border:1px solid var(--border); border-radius:4px; color:var(--text);
  font-family:'Heebo',sans-serif; font-size:15px; padding:12px 16px;
  outline:none; direction:rtl; transition:border-color .2s, box-shadow .2s;
}
.contact-field textarea { resize:vertical; line-height:1.7; }
.contact-field input:focus, .contact-field textarea:focus { border-color:var(--gold); box-shadow:0 0 0 3px var(--border); }

.contact-submit {
  width:100%; padding:14px; border-radius:4px; cursor:pointer;
  background:linear-gradient(135deg, var(--gold), var(--gold-bright));
  color:#1a0e00; border:none;
  font-family:'Heebo',sans-serif; font-size:14px; font-weight:800; letter-spacing:2px;
  transition:transform .15s ease, opacity .2s, box-shadow .2s;
  box-shadow:0 6px 18px var(--border-gold);
}
.contact-submit:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 10px 24px var(--border-gold); }
.contact-submit:disabled { opacity:.6; cursor:default; }
.contact-error { color:var(--crimson); font-family:'Heebo',sans-serif; font-size:13px; margin:0 0 14px; }

.contact-sent { text-align:center; padding:48px 0; }
.contact-sent__mark { font-size:52px; margin-bottom:18px; color:var(--gold-bright); }
.contact-sent h2 { color:var(--h1); font-family:'Heebo',sans-serif; font-size:24px; margin:0 0 10px; }
.contact-sent p { color:var(--muted); font-family:'Heebo',sans-serif; font-size:15px; margin:0; }
.contact-sent button {
  margin-top:22px; background:none; border:1px solid var(--border-gold);
  color:var(--gold); font-family:'Heebo',sans-serif; font-size:12px; letter-spacing:2px;
  padding:10px 24px; cursor:pointer; border-radius:999px; transition:all .2s;
}
.contact-sent button:hover { border-color:var(--gold); }

.contact-side { display:flex; flex-direction:column; gap:18px; }
.contact-author__head { display:flex; gap:16px; align-items:flex-start; margin-bottom:16px; }
.contact-author__avatar {
  width:64px; height:64px; border-radius:50%; flex-shrink:0;
  background:linear-gradient(135deg, var(--gold-dim), var(--crimson));
  display:flex; align-items:center; justify-content:center;
  font-size:26px; color:#fff; border:2px solid var(--border-gold);
}
.contact-author__name { color:var(--h1); font-family:'Heebo',sans-serif; font-size:17px; font-weight:800; margin-bottom:4px; }
.contact-author__role { color:var(--muted); font-family:'Heebo',sans-serif; font-size:11px; letter-spacing:2px; text-transform:uppercase; }
.contact-author__bio { color:var(--text-soft); font-family:'Heebo',sans-serif; font-size:14px; line-height:1.85; margin:0; }

.contact-link {
  background:var(--panel); border:1px solid var(--border); border-radius:4px;
  text-decoration:none; padding:16px 20px; display:flex; gap:14px; align-items:center;
  transition:border-color .2s, transform .15s, box-shadow .2s;
}
.contact-link:hover { border-color:var(--border-gold); transform:translateX(-2px); box-shadow:var(--shadow); }
.contact-link__icon { font-size:22px; flex-shrink:0; }
.contact-link__label { color:var(--gold-dim); font-family:'Heebo',sans-serif; font-size:10px; letter-spacing:2px; text-transform:uppercase; margin-bottom:3px; }
.contact-link__value { color:var(--text); font-family:'Heebo',sans-serif; font-size:14px; }

@media (max-width:760px) {
  .contact-grid { grid-template-columns:1fr; gap:22px; }
  .contact-toggle { position:static; display:inline-flex; margin:0 0 18px; }
}
`;

function getInitialTheme() {
  if (typeof window === "undefined") return "dark";
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch { /* ignore */ }
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export default function ContactPage() {
  const [theme, setTheme] = useState(getInitialTheme);
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => { try { localStorage.setItem(THEME_KEY, theme); } catch { /* ignore */ } }, [theme]);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }
  const toggleTheme = () => setTheme(t => (t === "dark" ? "light" : "dark"));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setErr("נא למלא שם, אימייל והודעה"); return;
    }
    setSending(true); setErr("");
    try { await sendContactMessage(form); setSent(true); }
    catch { setErr("שגיאה בשליחה — נסה שוב"); }
    finally { setSending(false); }
  }

  const field = (label, key, type = "text", rows) => (
    <div className="contact-field">
      <label>{label}</label>
      {rows
        ? <textarea rows={rows} value={form[key]} onChange={e => set(key, e.target.value)} />
        : <input type={type} value={form[key]} onChange={e => set(key, e.target.value)} />}
    </div>
  );

  return (
    <div className="contact-page" data-theme={theme}>
      <style>{CSS}</style>
      <div className="contact-page__wrap">
        <div className="contact-page__glow" />

        <button className="contact-toggle" onClick={toggleTheme}
          aria-label={theme === "dark" ? "מעבר למצב יום" : "מעבר למצב לילה"}>
          {theme === "dark" ? "☀️ מצב יום" : "🌙 מצב לילה"}
        </button>

        {/* hero */}
        <div className="contact-hero">
          <div className="contact-eyebrow">יצירת קשר</div>
          <h1>נשמח לשמוע ממך</h1>
          <p>שאלות, הצעות, שיתופי פעולה — כל פנייה מתקבלת בברכה</p>
          <div className="contact-divider" />
        </div>

        {/* about */}
        <div className="contact-about">
          <div className="contact-about__title">אודות המיזם</div>
          {ABOUT_PARAS.map((para, i) => <p key={i}>{para}</p>)}
        </div>

        {/* grid */}
        <div className="contact-grid">
          {/* form */}
          <div className="contact-card contact-card--form">
            {sent ? (
              <div className="contact-sent">
                <div className="contact-sent__mark">✦</div>
                <h2>ההודעה נשלחה!</h2>
                <p>נחזור אליך בהקדם האפשרי</p>
                <button onClick={() => { setSent(false); setForm({ name: "", email: "", subject: "", message: "" }); }}>
                  שלח הודעה נוספת
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                {field("שם מלא *", "name")}
                {field("אימייל *", "email", "email")}
                {field("נושא", "subject")}
                {field("הודעה *", "message", "text", 6)}
                {err && <p className="contact-error">{err}</p>}
                <button type="submit" className="contact-submit" disabled={sending}>
                  {sending ? "שולח..." : "שלח הודעה ✦"}
                </button>
              </form>
            )}
          </div>

          {/* side */}
          <div className="contact-side">
            <div className="contact-card contact-card--author">
              <div className="contact-author__head">
                <div className="contact-author__avatar">✦</div>
                <div>
                  <div className="contact-author__name">צוריאל</div>
                  <div className="contact-author__role">מייסד ועורך — סוד 1820</div>
                </div>
              </div>
              <p className="contact-author__bio">
                חוקר גימטריה, צפנים בתורה ורמזי אחרית הימים. מפיץ תובנות על הגאולה ומתעד אירועים בזמן אמת דרך משקפת הקבלה.
              </p>
            </div>

            {CONTACT_LINKS.map(({ icon, label, value, href }) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer" className="contact-link">
                <span className="contact-link__icon">{icon}</span>
                <div>
                  <div className="contact-link__label">{label}</div>
                  <div className="contact-link__value">{value}</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
