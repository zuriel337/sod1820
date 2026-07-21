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

// אריח גדול — כלי-דגל בראש ההיכל. נעול → מוצג עמום עם 🔒 (לא לחיץ).
function BigTile({ t, onOpen, isAdmin }) {
  const ready = isToolReady(t.id, isAdmin) && !elsLocked(t.id);
  const base = { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 9, textAlign: "center",
    background: "var(--card,#fff)", border: "1.5px solid var(--line,#e4e7ec)", borderRadius: 18, padding: "26px 14px", minHeight: 158,
    boxShadow: "0 2px 10px rgba(20,25,40,.05)", transition: "transform .15s, border-color .15s, box-shadow .15s", cursor: ready ? "pointer" : "default", fontFamily: "inherit" };
  const inner = (
    <>
      <div style={{ fontSize: 42, lineHeight: 1 }}>{t.img ? <img src={t.img} alt="" style={{ width: 52, height: 52, borderRadius: 12, objectFit: "cover", display: "block", margin: "0 auto" }} /> : (ready ? t.icon : "🔒")}</div>
      <div style={{ fontSize: 19, fontWeight: 800, color: "var(--ink,#1b1d22)" }}>{t.title.replace(/\s*\(ELS\)/, "")}</div>
      <div style={{ fontSize: 12.5, color: "var(--ink2,#5b6472)", lineHeight: 1.55, maxWidth: 240 }}>{t.desc}</div>
      {!ready && <span style={{ fontSize: 11, fontWeight: 800, color: "#b07d12" }}>🔒 בשדרוג — בקרוב</span>}
    </>
  );
  const hov = on => e => { if (!ready) return; e.currentTarget.style.transform = on ? "translateY(-3px)" : "none"; e.currentTarget.style.borderColor = on ? "var(--acc,#2f6df6)" : "var(--line,#e4e7ec)"; e.currentTarget.style.boxShadow = on ? "0 14px 30px -12px rgba(47,109,246,.35)" : "0 2px 10px rgba(20,25,40,.05)"; };
  if (!ready) return <div style={{ ...base, opacity: 0.6 }} title="בשדרוג — ייפתח בקרוב">{inner}</div>;
  return <button style={base} onClick={() => onOpen(t.id)} onMouseEnter={hov(true)} onMouseLeave={hov(false)}>{inner}</button>;
}

export default function ResearchHome({ onOpen }) {
  // 🔑 מנהל רואה את כל הכלים הממומשים; 👁 «תצוגת משתמש» מבטלת את הרשאת-המנהל האפקטיבית.
  const { isAdmin: realAdmin, user } = useAuth();
  const isAdmin = realAdmin && !useViewAsUser();
  const navigate = useNavigate();
  const { open: openCenter } = useUserCenter();
  const [tab, setTab] = useState("tools"); // tools | lib
  // 🔎 שדה-חיפוש חופשי: מספר / מילה / ביטוי → דף-המספר בתוך ההיכל.
  const [gateQ, setGateQ] = useState("");
  const gateGo = e => { e.preventDefault(); const v = gateQ.trim(); if (v) navigate(`/research?tool=number&n=${encodeURIComponent(v)}`); };

  const bigTools = BIG.map(id => TOOLS.find(t => t.id === id)).filter(Boolean);
  const restTools = TOOLS.filter(t => !BIG.includes(t.id)); // כולל נעולים/בקרוב — קטנים מתחת

  const tabBtn = active => ({ cursor: "pointer", background: active ? "var(--acc,#2f6df6)" : "var(--card,#fff)", color: active ? "#fff" : "var(--ink2,#5b6472)",
    border: `1px solid ${active ? "var(--acc,#2f6df6)" : "var(--line,#e4e7ec)"}`, borderRadius: 999, padding: "8px 16px", fontFamily: "inherit", fontSize: 13.5, fontWeight: 800 });

  return (
    <div>
      <div className="rw-h1-row"><div className="rw-h1">🏛️ היכל הגילוי</div></div>
      {isAdmin && <div className="rw-sub" style={{ color: "#b07d12", fontWeight: 700 }}>🔑 מצב מנהל — כל הכלים הממומשים פתוחים לבדיקה (לציבור נעולים).</div>}

      {/* 🔎 חיפוש-על — מספר · שם · ביטוי */}
      <form className="rw-gate-search" onSubmit={gateGo} style={{ marginBottom: 14 }}>
        <input value={gateQ} onChange={e => setGateQ(e.target.value)} placeholder="🔎 מה תרצו לגלות? מספר · שם · ביטוי…" aria-label="חיפוש חופשי" />
        <button type="submit" disabled={!gateQ.trim()} style={!gateQ.trim() ? { opacity: 0.5 } : undefined}>גלו ←</button>
      </form>

      {/* טאבים — כלים (ברירת-מחדל) · מאגרים · אזור-אישי (אותה מגירה כמו בכל האתר) */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <button style={tabBtn(tab === "tools")} onClick={() => setTab("tools")}>🧰 הכלים</button>
        <button style={tabBtn(tab === "lib")} onClick={() => setTab("lib")}>📚 מאגרים</button>
        {/* 🧑 גשר-זהות קנוני: מחובר → מגירת «האזור האישי» · אורח → התחברות (המגירה לא מרונדרת לאורח, אחרת «מת»). */}
        <button style={tabBtn(false)} onClick={() => (user ? openCenter() : navigate("/login"))}>👤 אזור אישי</button>
        <Link to="/forum" style={{ ...tabBtn(false), textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 5 }}>🌐 פורום המחקר</Link>
      </div>

      {tab === "tools" ? (
        <>
          {/* 👑 שלושת הגדולים */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 20 }}>
            {bigTools.map(t => <BigTile key={t.id} t={t} onOpen={onOpen} isAdmin={isAdmin} />)}
          </div>
          {/* שאר הכלים — קטנים */}
          <div className="rw-cat-h" style={{ marginBottom: 8 }}><span className="rw-cat-ic">🧰</span> כל הכלים <span className="rw-cat-n">{restTools.length}</span></div>
          <div className="rw-quick-row" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {restTools.map(t => {
              const ready = isToolReady(t.id, isAdmin) && !elsLocked(t.id);
              const ic = t.img ? <img src={t.img} alt="" style={{ width: 18, height: 18, borderRadius: 4, objectFit: "cover", display: "inline-block", verticalAlign: "middle" }} /> : t.icon;
              return ready
                ? <button key={t.id} className="rw-quick-chip" onClick={() => onOpen(t.id)} title={t.desc}><span className="qc-ic">{ic}</span> {t.title}{isAdminOnlyTool(t.id, isAdmin) && <span className="qc-flag">🔑</span>}</button>
                : <span key={t.id} className="rw-quick-chip" style={{ opacity: 0.5, cursor: "default" }} title="בשדרוג — בקרוב"><span className="qc-ic">{t.img ? ic : "🔒"}</span> {t.title}</span>;
            })}
          </div>
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
