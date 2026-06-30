import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { isToolReady, isAdminOnlyTool, FLAGSHIP_TOOLS } from "../lib/hub/ready.js";
import { useAuth } from "../lib/AuthContext.jsx";

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
  { id: "els", icon: "🔡", cat: "engine", title: "דילוגי אותיות (ELS)", desc: "מסך רשת-אותיות — מצא שם/מילה כדילוג בתורה, ראה מיקום ומרחק. עדשת חקירה.", status: "live" },
  { id: "number", icon: "🔢", cat: "tool", title: "דף המספר", desc: "פתחו מספר וראו הכל — גימטריאות, הצלבות, התכנסויות, אירועים. זהו דף-המספר הקבוע של האתר, מוטמע כאן.", status: "live" },
  { id: "midrash", icon: "📖", cat: "midrash", title: "בית המדרש", desc: "מרחב-לימוד: כל שיטות החישוב (רגיל · מילוי · אתב״ש · אלב״ם · המסתתר…) מוסברות ומודגמות. כאן לומדים, לא רק משתמשים.", status: "live" },
  { id: "life", icon: "🧬", cat: "engine", title: "מפת שדה (ניתוח חיים)", desc: "קלט אחד → מנועים מרובים → פלט להשוואה. מפת-שדה מחושבת + חריצי AI. תשתית הזהות-בזמן.", status: "live" },
  { id: "verse", icon: "📜", cat: "tool", title: "חיפוש בפסוקים", desc: "מצאו ביטוי או ערך גימטרי בתוך 5,846 פסוקי התורה.", status: "live" },
  { id: "import", icon: "📊", cat: "tool", title: "ניתוח קובץ", desc: "העלו אקסל/CSV עם רשימת שמות או ביטויים — המנוע מחשב גימטריה לכולם ומוצא התכנסויות.", status: "live" },
  { id: "cross", icon: "✨", cat: "engine", title: "מחולל הצלבות", desc: "חברו ביטויים בעלי אותו ערך — וגלו הצלבות חדשות.", status: "soon" },
  { id: "notarikon", icon: "🔠", cat: "tool", title: "ראשי / אמצעי / סופי תיבות", desc: "מהביטוי → ראשי · אמצעי · סופי תיבות + ערך והתכנסות. או חיפוש הפוך: רצף-אותיות → פסוקים בתורה.", status: "live" },
  { id: "dates", icon: "📅", cat: "tool", title: "תאריכים עבריים", desc: "גימטריה של שנים ואירועים — חיבור ציר הזמן למספרים.", status: "soon" },
  { id: "ai", icon: "🤖", cat: "ai", title: "מנוע AI", desc: "נתחו את «המחקר הפעיל» — ה-AI מחבר את הקשרים בשבילכם.", status: "soon" },
];

// 📚 מאגרי מידע — לא כלים, אלא מאגרים לעיון. קישור לדפים הקיימים.
export const LIBRARIES = [
  { icon: "📖", title: "התנ״ך", desc: "טקסט התורה המלא — בסיס כל החישובים.", to: "/research?tool=verse" },
  { icon: "📜", title: "מאגר הפסוקים", desc: "5,846 פסוקים עם ערך מחושב.", to: "/research?tool=verse" },
  { icon: "🖼", title: "גלריות", desc: "מאגר התמונות והרמזים החזותיים.", to: "/archive" },
  { icon: "📰", title: "הפוסטים", desc: "כל המאמרים והרמזים שפורסמו.", to: "/post" },
  { icon: "🔢", title: "המספרים", desc: "עץ המספרים וההתכנסויות.", to: "/numbers" },
];

// סדר וכותרות הקטגוריות (טקסונומיית-ממשק). בית-המדרש = מרחב-לימוד, לא מנוע.
const CATS = [
  { key: "engine", icon: "🧠", label: "מנועי מחקר", sub: "מערכות שמייצרות תוצאה" },
  { key: "tool", icon: "🧰", label: "כלי מחקר", sub: "כלים נקודתיים" },
  { key: "midrash", icon: "📖", label: "בית המדרש", sub: "מרחב-לימוד — כאן לומדים את השיטות" },
  { key: "ai", icon: "🤖", label: "AI", sub: "ניתוח חכם" },
];

function ToolCard({ t, onOpen, isAdmin }) {
  const ready = isToolReady(t.id, isAdmin);
  const adminOnly = isAdminOnlyTool(t.id, isAdmin); // פתוח רק בזכות הרשאת-מנהל
  const flag = FLAGSHIP_TOOLS.includes(t.id); // כלי-דגל — בולט
  const badge = !ready ? <span className="bg soon">🔒 בשדרוג</span>
    : adminOnly ? <span className="bg flag">🔑 אדמין · בדיקה</span>
    : flag ? <span className="bg flag">👑 כלי מרכזי</span>
    : t.status === "open" ? <span className="bg open">פתח »</span>
    : <span className="bg live">● פעיל</span>;
  const inner = (
    <>
      <div className="ic">{ready ? t.icon : "🔒"}</div>
      <div className="tt">{t.title}</div>
      <div className="ds">{t.desc}</div>
      {badge}
    </>
  );
  const cls = "rw-tool" + (flag ? " flag" : "");
  if (!ready) return <div className="rw-tool dis" title="בשדרוג — ייפתח בקרוב">{inner}</div>;
  if (t.status === "open") return <Link className={cls} to={t.to}>{inner}</Link>;
  return <button className={cls} onClick={() => onOpen(t.id)}>{inner}</button>;
}

// בתוך קטגוריה: מוכנים תחילה, נעולים אחריהם.
const catRank = (t, isAdmin) => (isToolReady(t.id, isAdmin) ? 0 : 1);

export default function ResearchHome({ onOpen }) {
  // 🔑 מנהל רואה את כל הכלים הממומשים כפתוחים (לבדיקות); לציבור נשאר הגיטינג הרגיל.
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  // 💡 פאנל-הסבר: פתוח בכניסה ראשונה, נסגר ונזכר, ניתן לפתיחה חוזרת ב-«❓ הסבר».
  const [explainOpen, setExplainOpen] = useState(() => { try { return localStorage.getItem("rw_explain_seen") !== "1"; } catch { return true; } });
  const closeExplain = () => { setExplainOpen(false); try { localStorage.setItem("rw_explain_seen", "1"); } catch { /* noop */ } };
  // 🔎 שדה-חיפוש חופשי בשער: מספר → דף-המספר · טקסט → מחשבון הגימטריה (טעון מראש).
  const [gateQ, setGateQ] = useState("");
  const gateGo = e => {
    e.preventDefault();
    const v = gateQ.trim();
    if (!v) return;
    if (/^\d+$/.test(v)) navigate(`/research?tool=number&n=${v}`);
    else navigate(`/research?tool=midrash&tab=calc&w=${encodeURIComponent(v)}`);
  };
  return (
    <div>
      <div className="rw-h1-row">
        <div className="rw-h1">🏛️ היכל הגילוי</div>
        {!explainOpen && <button className="rw-explain-reopen" onClick={() => setExplainOpen(true)} title="מה זה היכל הגילוי?">❓ הסבר</button>}
      </div>
      <div className="rw-sub">שני שערים אל אותו גרף-ידע אחד: <b>בית המדרש</b> — להבין את התורה במספר ובטקסט · <b>חקר עצמי</b> — המסע האישי שלך (בקרוב). או פשוט חפשו למטה.</div>
      {isAdmin && <div className="rw-sub" style={{ color: "#b07d12", fontWeight: 700 }}>🔑 מצב מנהל — כל הכלים הממומשים פתוחים לבדיקה (לציבור הם עדיין נעולים).</div>}

      {/* 🚪 שער הכניסה — שתי דלתות + שדה-חיפוש. בית המדרש פתוח (ללא שינוי); חקר עצמי אטום (בקרוב). */}
      <div className="rw-gate">
        <div className="rw-doors">
          <button className="rw-door open" onClick={() => onOpen("midrash")}>
            <div className="rw-door-ic">📖</div>
            <div className="rw-door-t">בית המדרש</div>
            <div className="rw-door-d">להבין את התורה — במספר ובטקסט. כל שיטות הגימטריה, מוסברות ומודגמות. כאן לומדים.</div>
            <div className="rw-door-cta">היכנסו ←</div>
          </button>
          <div className="rw-door locked" aria-disabled="true">
            <span className="rw-door-lock">🔒</span>
            <div className="rw-door-ic">🪞</div>
            <div className="rw-door-t">חקר עצמי</div>
            <div className="rw-door-d">המסע האישי שלך במספרים — שם · חיים · משפחה. דלת זו עוד אטומה.</div>
            <div className="rw-door-cta soon">בקרוב</div>
          </div>
        </div>
        <form className="rw-gate-search" onSubmit={gateGo}>
          <input value={gateQ} onChange={e => setGateQ(e.target.value)}
            placeholder="🔎 מה אתה רוצה לגלות? מספר, שם או ביטוי…" aria-label="חיפוש חופשי" />
          <button type="submit" disabled={!gateQ.trim()} style={!gateQ.trim() ? { opacity: 0.5 } : undefined}>גלו ←</button>
        </form>
      </div>

      {/* 💡 פאנל-הסבר מתקפל — «מה זה המעבדה ואיך מתחילים» (research_workspace_law: הסבר אינטראקטיבי) */}
      {explainOpen && (
        <div className="rw-explain">
          <button className="rw-explain-x" onClick={closeExplain} aria-label="סגור הסבר">✕</button>
          <div className="rw-explain-h">👋 ברוכים הבאים — זו סביבת-מחקר אחת, לא אוסף עמודים</div>
          <div className="rw-explain-sub">כל כלי מזין את אותו «מחקר» שלך, והכל מחובר. בוחרים, חוקרים, ואוספים — וזה נשאר איתכם.</div>
          <div className="rw-explain-steps">
            <div className="rw-estep"><span className="ei">1</span><div><b>בוחרים כלי</b><span>מחשבון · דף-מספר · פסוקים · דילוגים · בית-המדרש</span></div></div>
            <div className="rw-estep"><span className="ei">2</span><div><b>חוקרים לעומק</b><span>כל תוצאה מקושרת — לוחצים וממשיכים פנימה</span></div></div>
            <div className="rw-estep"><span className="ei">3</span><div><b>אוספים</b><span>➕ הוסף למחקר · ⭐ שמור · 🔗 שתף — נשאר בצד</span></div></div>
          </div>
          <div className="rw-explain-foot">💡 אפשר לסגור — וייפתח שוב ב-<b>❓ הסבר</b> למעלה מתי שתרצו.</div>
        </div>
      )}

      {/* ✅ עובד עכשיו — רצועת-זינוק לכלים הפעילים, בולטת למעלה. המפה המלאה (הפילוח לעתיד) נשארת מתחת. */}
      {(() => {
        const working = TOOLS
          .filter(t => isToolReady(t.id, isAdmin))
          .sort((a, b) => (FLAGSHIP_TOOLS.includes(a.id) ? 0 : 1) - (FLAGSHIP_TOOLS.includes(b.id) ? 0 : 1));
        if (!working.length) return null;
        return (
          <div className="rw-quick">
            <div className="rw-quick-h">✅ עובד עכשיו · התחילו כאן</div>
            <div className="rw-quick-row">
              {working.map(t => (
                <button key={t.id} className="rw-quick-chip" onClick={() => onOpen(t.id)} title={t.desc}>
                  <span className="qc-ic">{t.icon}</span> {t.title}
                  {FLAGSHIP_TOOLS.includes(t.id) && <span className="qc-flag">👑</span>}
                </button>
              ))}
            </div>
          </div>
        );
      })()}

      {CATS.map(c => {
        const items = TOOLS.filter(t => t.cat === c.key).sort((a, b) => catRank(a, isAdmin) - catRank(b, isAdmin));
        if (!items.length) return null;
        return (
          <div key={c.key} className="rw-cat">
            <div className="rw-cat-h"><span className="rw-cat-ic">{c.icon}</span> {c.label} <span className="rw-cat-n">{items.length}</span><span className="rw-cat-sub">{c.sub}</span></div>
            <div className="rw-tools">
              {items.map(t => <ToolCard key={t.id} t={t} onOpen={onOpen} isAdmin={isAdmin} />)}
            </div>
          </div>
        );
      })}

      {/* 📚 מאגרי מידע — לא כלים, אלא מאגרים לעיון */}
      <div className="rw-cat">
        <div className="rw-cat-h"><span className="rw-cat-ic">📚</span> מאגרי מידע <span className="rw-cat-n">{LIBRARIES.length}</span><span className="rw-cat-sub">לעיון, לא לשימוש</span></div>
        <div className="rw-tools">
          {LIBRARIES.map(l => (
            <Link key={l.title} className="rw-tool" to={l.to}>
              <div className="ic">{l.icon}</div>
              <div className="tt">{l.title}</div>
              <div className="ds">{l.desc}</div>
              <span className="bg open">פתח »</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
