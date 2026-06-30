import React from "react";
import { Link } from "react-router-dom";
import { isToolReady, FLAGSHIP_TOOLS } from "../lib/hub/ready.js";

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
  { id: "number", icon: "🔢", cat: "tool", title: "דף מספר", desc: "פתחו מספר וראו הכל — גימטריאות, הצלבות, התכנסויות, אירועים.", status: "live" },
  { id: "midrash", icon: "📖", cat: "midrash", title: "בית המדרש", desc: "מרחב-לימוד: כל שיטות החישוב (רגיל · מילוי · אתב״ש · אלב״ם · המסתתר…) מוסברות ומודגמות. כאן לומדים, לא רק משתמשים.", status: "live" },
  { id: "life", icon: "🧬", cat: "engine", title: "מפת שדה (ניתוח חיים)", desc: "קלט אחד → מנועים מרובים → פלט להשוואה. מפת-שדה מחושבת + חריצי AI. תשתית הזהות-בזמן.", status: "live" },
  { id: "verse", icon: "📜", cat: "tool", title: "חיפוש בפסוקים", desc: "מצאו ביטוי או ערך גימטרי בתוך 5,846 פסוקי התורה.", status: "live" },
  { id: "import", icon: "📊", cat: "tool", title: "ניתוח קובץ", desc: "העלו אקסל/CSV עם רשימת שמות או ביטויים — המנוע מחשב גימטריה לכולם ומוצא התכנסויות.", status: "live" },
  { id: "cross", icon: "✨", cat: "engine", title: "מחולל הצלבות", desc: "חברו ביטויים בעלי אותו ערך — וגלו הצלבות חדשות.", status: "soon" },
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

function ToolCard({ t, onOpen }) {
  const ready = isToolReady(t.id);
  const flag = FLAGSHIP_TOOLS.includes(t.id); // כלי-דגל — בולט
  const badge = !ready ? <span className="bg soon">🔒 בשדרוג</span>
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
const catRank = t => (isToolReady(t.id) ? 0 : 1);

export default function ResearchHome({ onOpen }) {
  return (
    <div>
      <div className="rw-h1">🏛️ מרכז המחקר</div>
      <div className="rw-sub">כל יכולות המחקר, מסודרות לפי רמה: 🧠 מנוע (מערכת שמייצרת תוצאה) · 🧰 כלי (נקודתי) · 📖 בית המדרש (לימוד) · 📚 מאגר (נתונים).</div>

      {CATS.map(c => {
        const items = TOOLS.filter(t => t.cat === c.key).sort((a, b) => catRank(a) - catRank(b));
        if (!items.length) return null;
        return (
          <div key={c.key} className="rw-cat">
            <div className="rw-cat-h"><span className="rw-cat-ic">{c.icon}</span> {c.label} <span className="rw-cat-n">{items.length}</span><span className="rw-cat-sub">{c.sub}</span></div>
            <div className="rw-tools">
              {items.map(t => <ToolCard key={t.id} t={t} onOpen={onOpen} />)}
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
