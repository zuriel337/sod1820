import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { isToolReady, isAdminOnlyTool, FLAGSHIP_TOOLS, ELS_LOGO, ELS_PUBLIC } from "../lib/hub/ready.js";

// 🔒 ELS עדיין לא ציבורי — בהיכל הוא מוצג כאריח-תצוגה בלבד, לא-לחיץ (גם למנהל).
// כש-ELS_PUBLIC יהפוך ל-true — האריח נפתח אוטומטית, בלי שינוי קוד נוסף.
const elsLocked = id => id === "els" && !ELS_PUBLIC;
import { useViewAsUser } from "../lib/hub/viewAs.js";
import { useAuth } from "../lib/AuthContext.jsx";
import { useUserCenter } from "../lib/userCenter/UserCenterContext.jsx";

// 🧰 בית-הכלים — מסך הפתיחה של «סביבת המחקר». מרכז את כל האפליקציות במקום אחד.
// כל כלי = כרטיס. live = נפתח בתוך השלד · open = דף קיים (פתיחה חוצה) · soon = בקרוב.
// מוסיפים כלי עתידי בשורה אחת ב-TOOLS — בלי לגעת בשלד (registry).
// cat = רמת הישות (טקסונומיית-ממשק, לא חוק): engine=מנוע · tool=כלי · midrash=לימוד · ai
export const TOOLS = [
  { id: "journey", icon: "🧭", cat: "engine", title: "מסע חיפוש", desc: "קלט אחד → כל המנועים יחד (גימטריה · דילוגים · פסוקים · מספרים) → דוח-מחקר אחד. נקודת-הפתיחה.", status: "live" },
  { id: "name", icon: "🪪", cat: "engine", title: "מנוע השמות", desc: "גלה את הערך, מבנה האותיות, הפסוק וההתכנסויות של שמך — או של כל שם יקר.", status: "live" },
  { id: "family", icon: "👨‍👩‍👧", cat: "tool", title: "הקשרים במשפחה", desc: "גלו את ההתכנסויות הנסתרות בין שמות בני המשפחה — עובדה מחושבת, לא ניחוש.", status: "live" },
  { id: "compare", icon: "🔀", cat: "tool", title: "השוואת מילים", desc: "שני ביטויים זה מול זה — היכן הם נפגשים בערך (אותה שיטה = חזק · חוצה-שיטות = עקיף).", status: "live" },
  { id: "gematria", icon: "🧮", cat: "engine", title: "מחשבון גימטריה", desc: "כל 17 השיטות, מאומת מול המנוע — רגיל · מילוי · אתב״ש · ריבוע ועוד.", status: "live" },
  { id: "maftech", icon: "🔑", cat: "engine", title: "שיטת המפתח", desc: "עדשת פירוק-אותיות (lab): כל מילה נפתחת לשכבותיה — עובדת-מנוע מופרדת מהשערה. מודגם על מילים אמיתיות.", status: "live" },
  { id: "christina", icon: "🔤", cat: "engine", title: "מפענח האותיות של כריסטינה", desc: "המחשבון שכריסטינה בנתה: כל אות נושאת משמעות בשיטה שלה — הקלידו מילה וכל אות תיפתח למשמעותה. שיטה פרשנית (lab).", status: "live" },
  { id: "els", icon: "🔡", img: ELS_LOGO, cat: "engine", title: "דילוגי אותיות (ELS)", desc: "מסך רשת-אותיות — מצא שם/מילה כדילוג בתורה, ראה מיקום ומרחק. עדשת חקירה.", status: "live" },
  { id: "number", icon: "🔢", cat: "tool", title: "דף המספר", desc: "פתחו מספר וראו הכל — גימטריאות, הצלבות, התכנסויות, אירועים. זהו דף-המספר הקבוע של האתר, מוטמע כאן.", status: "live" },
  { id: "midrash", icon: "📖", cat: "midrash", title: "בית המדרש", desc: "מרחב-לימוד: כל שיטות החישוב (רגיל · מילוי · אתב״ש · אלב״ם · המסתתר…) מוסברות ומודגמות. כאן לומדים, לא רק משתמשים.", status: "live" },
  { id: "life", icon: "🧬", cat: "engine", title: "מפת שדה (ניתוח חיים)", desc: "קלט אחד → מנועים מרובים → פלט להשוואה. מפת-שדה מחושבת + חריצי AI. תשתית הזהות-בזמן.", status: "live" },
  { id: "verse", icon: "📜", cat: "tool", title: "חיפוש בפסוקים", desc: "מצאו ביטוי או ערך גימטרי בתוך 5,846 פסוקי התורה.", status: "live" },
  { id: "import", icon: "📊", cat: "tool", title: "ניתוח קובץ", desc: "העלו אקסל/CSV עם רשימת שמות או ביטויים — המנוע מחשב גימטריה לכולם ומוצא התכנסויות.", status: "live" },
  { id: "cross", icon: "✨", cat: "engine", title: "מחולל הצלבות", desc: "חברו ביטויים בעלי אותו ערך — וגלו הצלבות חדשות.", status: "soon" },
  { id: "notarikon", icon: "🔠", cat: "tool", title: "נוטריקון", desc: "מהביטוי → ראשי · אמצעי · סופי תיבות + ערך והתכנסות. או חיפוש הפוך: רצף-אותיות → פסוקים בתורה.", status: "live" },
  { id: "dates", icon: "📅", cat: "tool", title: "תאריכים עבריים", desc: "תאריך לועזי → התאריך העברי המקביל + הגימטריה שלו. חיבור ציר הזמן למספרים.", status: "live" },
  { id: "ai", icon: "🤖", cat: "ai", title: "מנוע AI", desc: "נתחו את «המחקר הפעיל» — ה-AI מחבר את הקשרים בשבילכם.", status: "soon" },
];

// 📚 מאגרי מידע — לא כלים, אלא מאגרים לעיון. קישור לדפים הקיימים.
export const LIBRARIES = [
  { icon: "📖", title: "התנ״ך", desc: "טקסט התורה המלא — בסיס כל החישובים.", to: "/research?tool=verse" },
  { icon: "📜", title: "מאגר הפסוקים", desc: "5,846 פסוקים עם ערך מחושב.", to: "/research?tool=verse" },
  { icon: "🖼", title: "גלריות", desc: "מאגר התמונות והרמזים החזותיים.", to: "/archive" },
  { icon: "📰", title: "הפוסטים", desc: "כל המאמרים והרמזים שפורסמו.", to: "/post" },
  { icon: "🔢", title: "המספרים", desc: "עץ המספרים וההתכנסויות.", to: "/numbers" },
  { icon: "🌍", title: "קשרים בין שפות", desc: "אשף מחקר — קשרים בין עברית לשפות אחרות, מסווגים לפי סוג (תעתוק/תרגום/שורש/רעיון). הזינו וצפו.", to: "/languages" },
];

// 👑 שלושת הכלים הגדולים בראש (החלטת צוריאל): בית המדרש · דילוגי אותיות · דף המספר.
const BIG = ["midrash", "els", "number"];

// 🃏 כרטיס-דגל בראש ההיכל — מדליון-אייקון + כותרת + תיאור, כניסה מדורגת (fade+rise) וריחוף-הרמה.
// נעול → עמום עם 🔒 (לא לחיץ). i = אינדקס → משהה-אנימציה מדורג ("המערכת חיה").
function FlagCard({ t, i, onOpen, isAdmin }) {
  const ready = isToolReady(t.id, isAdmin) && !elsLocked(t.id);
  const ic = t.img
    ? <img src={t.img} alt="" className="hh-tool-img" />
    : <span className="hh-tool-ic">{ready ? t.icon : "🔒"}</span>;
  const inner = (
    <>
      <span className="hh-tool-medal">{ic}</span>
      <span className="hh-tool-tt">{t.title.replace(/\s*\(ELS\)/, "")}</span>
      <span className="hh-tool-ds">{t.desc}</span>
      {!ready && <span className="hh-tool-lock">🔒 בשדרוג — בקרוב</span>}
    </>
  );
  const style = { animationDelay: `${i * 80}ms` };
  if (!ready) return <div className="hh-tool dis" style={style} title="בשדרוג — ייפתח בקרוב">{inner}</div>;
  return <button className="hh-tool" style={style} onClick={() => onOpen(t.id)}>{inner}</button>;
}

// 🎨 עיצוב «ההיכל» — scoped ל-.hh בלבד (לא נוגע בשאר סביבת-המחקר). משתמש במשתני ה-RW
// (--acc/--card/--line/--ink…) שכבר קיימים בשלד → נשאר נאמן ל-research_workspace_law (בהיר-נקי-מודרני),
// ומוסיף עומק: רקע-עיר בהיר (city_background_dual_theme_law) + זוהַר-זהב עדין + כניסה מדורגת.
const HH_CSS = `
  .hh{--gold:#c9a23a}
  .hh-hero{position:relative;overflow:hidden;border-radius:24px;border:1px solid var(--line);
    margin:0 0 18px;padding:clamp(24px,5vw,42px) clamp(18px,3.5vw,36px);background:var(--card);
    box-shadow:0 24px 56px -30px rgba(47,109,246,.4);animation:hhRise .55s ease both}
  .hh-hero-bg{position:absolute;inset:0;background:url(/city-bg.jpg) center/cover;
    filter:grayscale(.45) brightness(1.55) contrast(.85);opacity:.16}
  .hh-hero-glow{position:absolute;inset:0;
    background:radial-gradient(115% 90% at 88% -12%,rgba(201,162,58,.30),transparent 55%),
      radial-gradient(95% 85% at -5% 118%,rgba(47,109,246,.20),transparent 60%),
      linear-gradient(180deg,rgba(255,255,255,.30),var(--card) 94%)}
  .hh-hero-in{position:relative}
  .hh-eyebrow{font-size:12px;font-weight:800;letter-spacing:.14em;color:var(--acc);margin-bottom:8px;opacity:.92}
  .hh-title{font-weight:800;font-size:clamp(30px,7.4vw,50px);line-height:1.04;color:var(--ink);margin:0 0 9px;
    text-shadow:0 2px 12px rgba(20,25,40,.07)}
  .hh-sub{font-size:clamp(13.5px,2.3vw,16px);color:var(--ink2);line-height:1.65;margin:0 0 18px;max-width:560px}
  .hh-search{display:flex;gap:8px;align-items:center;background:var(--card);border:1.5px solid var(--line);
    border-radius:999px;padding:6px 6px 6px 16px;max-width:600px;
    box-shadow:0 12px 30px -18px rgba(60,46,16,.4);transition:border-color .14s,box-shadow .14s}
  .hh-search:focus-within{border-color:var(--acc);box-shadow:0 0 0 4px var(--accS),0 12px 30px -18px rgba(47,109,246,.45)}
  .hh-search-ic{font-size:18px;opacity:.7;flex:none}
  .hh-search input{flex:1;min-width:0;border:none;background:none;outline:none;color:var(--ink);
    font-family:inherit;font-size:16px;padding:11px 2px}
  .hh-search input::placeholder{color:var(--ink3)}
  .hh-search button{flex:none;border:none;background:linear-gradient(135deg,var(--acc),#5b8cff);color:#fff;
    border-radius:999px;padding:12px 22px;font-weight:800;font-size:15px;cursor:pointer;font-family:inherit;
    min-height:44px;transition:filter .14s,transform .14s}
  .hh-search button:not(:disabled):hover{filter:brightness(1.08);transform:translateY(-1px)}
  .hh-search button:disabled{opacity:.5;cursor:default}
  .hh-stats{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}
  .hh-stats span{font-size:12px;font-weight:700;color:var(--ink2);background:rgba(255,255,255,.68);
    border:1px solid var(--line);border-radius:999px;padding:6px 12px;backdrop-filter:blur(6px)}
  .hh-admin{font-size:12.5px;font-weight:800;color:#a97a12;background:#fbf3dd;border:1px solid #ecdca6;
    border-radius:12px;padding:9px 13px;margin:0 0 16px}
  .hh-tabs{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 18px}
  .hh-tab{display:inline-flex;align-items:center;gap:6px;cursor:pointer;text-decoration:none;background:var(--card);
    color:var(--ink2);border:1px solid var(--line);border-radius:999px;padding:9px 16px;font-family:inherit;
    font-size:13.5px;font-weight:800;min-height:42px;transition:.12s}
  .hh-tab:hover{border-color:var(--acc);color:var(--acc);background:var(--accS)}
  .hh-tab.on{background:var(--acc);border-color:var(--acc);color:#fff}
  .hh-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin:0 0 22px}
  @media(min-width:640px){.hh-grid{grid-template-columns:repeat(3,1fr)}}
  @media(max-width:639px){.hh-grid>:last-child:nth-child(odd){grid-column:1 / -1}}
  .hh-tool{position:relative;display:flex;flex-direction:column;align-items:center;text-align:center;gap:9px;
    background:linear-gradient(180deg,var(--accS),var(--card) 74%);border:1.5px solid var(--acc);border-radius:18px;
    padding:20px 13px 18px;min-height:150px;cursor:pointer;font-family:inherit;color:var(--ink);
    box-shadow:0 14px 32px -18px rgba(47,109,246,.34);animation:hhRise .5s ease both;
    transition:transform .16s,box-shadow .16s,border-color .16s}
  .hh-tool:before{content:"";position:absolute;top:0;inset-inline:26px;height:2px;border-radius:2px;
    background:linear-gradient(90deg,transparent,var(--gold),transparent);opacity:.7}
  .hh-tool:hover{transform:translateY(-4px);box-shadow:0 22px 44px -18px rgba(47,109,246,.5);border-color:var(--acc)}
  .hh-tool.dis{opacity:.6;cursor:default;background:var(--bg);border:1.5px dashed var(--line);box-shadow:none;animation:none}
  .hh-tool.dis:before{display:none}
  .hh-tool.dis:hover{transform:none;box-shadow:none}
  .hh-tool-medal{width:60px;height:60px;border-radius:50%;display:flex;align-items:center;justify-content:center;
    background:radial-gradient(circle at 32% 28%,#fff,var(--accS));border:1px solid var(--line);
    box-shadow:0 8px 18px -9px rgba(47,109,246,.5)}
  .hh-tool-ic{font-size:32px;line-height:1}
  .hh-tool-img{width:46px;height:46px;border-radius:12px;object-fit:cover;display:block}
  .hh-tool-tt{font-weight:800;font-size:16px;color:var(--ink)}
  .hh-tool-ds{font-size:12px;color:var(--ink2);line-height:1.5;max-width:230px;
    display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
  .hh-tool-lock{font-size:11px;font-weight:800;color:#a97a12}
  @keyframes hhRise{from{opacity:0;transform:translateY(11px)}to{opacity:1;transform:none}}
  @media(prefers-reduced-motion:reduce){.hh-hero,.hh-tool{animation:none}}
`;

export default function ResearchHome({ onOpen }) {
  // 🔑 מנהל רואה את כל הכלים הממומשים; 👁 «תצוגת משתמש» מבטלת את הרשאת-המנהל האפקטיבית.
  const { isAdmin: realAdmin, user } = useAuth();
  const isAdmin = realAdmin && !useViewAsUser();
  const navigate = useNavigate();
  const { open: openCenter } = useUserCenter();
  const [tab, setTab] = useState("tools"); // tools | lib
  // 🔎 שדה-חיפוש חופשי: מספר / מילה / ביטוי → דף-המספר בתוך ההיכל.
  const [gateQ, setGateQ] = useState("");
  const [showSoon, setShowSoon] = useState(false); // כלים-בבנייה מקופלים כברירת-מחדל (פשוט-קודם)
  const gateGo = e => { e.preventDefault(); const v = gateQ.trim(); if (v) navigate(`/research?tool=number&n=${encodeURIComponent(v)}`); };

  const bigTools = BIG.map(id => TOOLS.find(t => t.id === id)).filter(Boolean);
  const restTools = TOOLS.filter(t => !BIG.includes(t.id));
  // 🪜 Progressive Disclosure (research_workspace_law): הכלים הפתוחים גלויים תמיד;
  //    הכלים-בבנייה/נעולים נשארים כמפת-דרך אך מקופלים תחת «בקרוב ▾» — לא מציפים את המסך.
  const isReady = t => isToolReady(t.id, isAdmin) && !elsLocked(t.id);
  const restReady = restTools.filter(isReady);
  const restSoon = restTools.filter(t => !isReady(t));

  return (
    <div className="hh">
      <style>{HH_CSS}</style>

      {/* 🏛️ HERO — תחושת-מקום מיד: כותרת גדולה + חיפוש-גיבור + רצועת-הוכחה, על רקע-עיר בהיר (city_background_dual_theme_law) */}
      <section className="hh-hero">
        <div className="hh-hero-bg" aria-hidden />
        <div className="hh-hero-glow" aria-hidden />
        <div className="hh-hero-in">
          <div className="hh-eyebrow">סביבת המחקר של סוד 1820</div>
          <h1 className="hh-title">🏛️ ההיכל</h1>
          <p className="hh-sub">כל מנועי המחקר במקום אחד — גימטריה, דילוגים, פסוקים ומספרים. הקלידו מילה, שם או מספר וצאו למסע.</p>
          {/* 🔎 חיפוש-על — מספר · שם · ביטוי */}
          <form className="hh-search" onSubmit={gateGo}>
            <span className="hh-search-ic" aria-hidden>🔎</span>
            <input value={gateQ} onChange={e => setGateQ(e.target.value)} placeholder="מה תרצו לגלות? מספר · שם · ביטוי…" aria-label="חיפוש חופשי" />
            <button type="submit" disabled={!gateQ.trim()}>גלו ←</button>
          </form>
          <div className="hh-stats">
            <span>🧮 17 שיטות חישוב</span><span>📜 5,846 פסוקים</span><span>🔡 כל התנ״ך</span><span>✨ הצלבות חיות</span>
          </div>
        </div>
      </section>

      {isAdmin && <div className="hh-admin">🔑 מצב מנהל — כל הכלים הממומשים פתוחים לבדיקה (לציבור נעולים).</div>}

      {/* טאבים — כלים (ברירת-מחדל) · מאגרים · אזור-אישי · פורום (שורה אחת נקייה מתחת ל-Hero) */}
      <div className="hh-tabs">
        <button className={`hh-tab${tab === "tools" ? " on" : ""}`} onClick={() => setTab("tools")}>🧰 הכלים</button>
        <button className={`hh-tab${tab === "lib" ? " on" : ""}`} onClick={() => setTab("lib")}>📚 מאגרים</button>
        {/* 🧑 גשר-זהות קנוני: מחובר → מגירת «האזור האישי» · אורח → התחברות (המגירה לא מרונדרת לאורח, אחרת «מת»). */}
        <button className="hh-tab" onClick={() => (user ? openCenter() : navigate("/login"))}>👤 אזור אישי</button>
        <Link className="hh-tab" to="/forum">🌐 פורום המחקר</Link>
      </div>

      {tab === "tools" ? (
        <>
          {/* 👑 שלושת הגדולים — כרטיסי-דגל */}
          <div className="hh-grid">
            {bigTools.map((t, i) => <FlagCard key={t.id} t={t} i={i} onOpen={onOpen} isAdmin={isAdmin} />)}
          </div>
          {/* שאר הכלים הפתוחים — גלויים תמיד (עוד כלי-מחקר פעילים) */}
          <div className="rw-cat-h" style={{ marginBottom: 8 }}><span className="rw-cat-ic">🧰</span> עוד כלים <span className="rw-cat-n">{restReady.length}</span></div>
          <div className="rw-quick-row" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {restReady.map(t => {
              const ic = t.img ? <img src={t.img} alt="" style={{ width: 18, height: 18, borderRadius: 4, objectFit: "cover", display: "inline-block", verticalAlign: "middle" }} /> : t.icon;
              return <button key={t.id} className="rw-quick-chip" onClick={() => onOpen(t.id)} title={t.desc}><span className="qc-ic">{ic}</span> {t.title}{isAdminOnlyTool(t.id, isAdmin) && <span className="qc-flag">🔑</span>}</button>;
            })}
          </div>
          {/* 🔜 כלים-בבנייה — מפת-דרך מקופלת (נראים כשמבקשים, לא מציפים את הפתיחה) */}
          {restSoon.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <button onClick={() => setShowSoon(s => !s)} style={{ cursor: "pointer", background: "none", border: "none", padding: 0, color: "var(--ink2,#5b6472)", fontFamily: "inherit", fontSize: 12.5, fontWeight: 800 }}>
                {showSoon ? "▴ הסתר" : "▾ עוד"} כלים בבנייה <span className="rw-cat-n">{restSoon.length}</span>
              </button>
              {showSoon && (
                <div className="rw-quick-row" style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                  {restSoon.map(t => {
                    const ic = t.img ? <img src={t.img} alt="" style={{ width: 18, height: 18, borderRadius: 4, objectFit: "cover", display: "inline-block", verticalAlign: "middle" }} /> : "🔒";
                    return <span key={t.id} className="rw-quick-chip" style={{ opacity: 0.5, cursor: "default" }} title="בשדרוג — בקרוב"><span className="qc-ic">{ic}</span> {t.title}</span>;
                  })}
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        /* 📚 מאגרי מידע — לעיון (הישן, מוסתר בטאב) */
        <div className="rw-quick-row" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {LIBRARIES.map(l => (
            <Link key={l.title} className="rw-quick-chip" to={l.to} title={l.desc}><span className="qc-ic">{l.icon}</span> {l.title}</Link>
          ))}
        </div>
      )}
    </div>
  );
}
