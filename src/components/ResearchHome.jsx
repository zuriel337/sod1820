import React from "react";
import { Link } from "react-router-dom";
import { isToolReady, FLAGSHIP_TOOLS } from "../lib/hub/ready.js";

// 🧰 בית-הכלים — מסך הפתיחה של «סביבת המחקר». מרכז את כל האפליקציות במקום אחד.
// כל כלי = כרטיס. live = נפתח בתוך השלד · open = דף קיים (פתיחה חוצה) · soon = בקרוב.
// מוסיפים כלי עתידי בשורה אחת ב-TOOLS — בלי לגעת בשלד (registry).
export const TOOLS = [
  { id: "journey", icon: "🧭", title: "מסע חיפוש", desc: "קלט אחד → כל המנועים יחד (גימטריה · דילוגים · פסוקים · מספרים) → דוח-מחקר אחד. נקודת-הפתיחה.", status: "live" },
  { id: "name", icon: "🪪", title: "סיפור השם שלך", desc: "גלה את הערך, מבנה האותיות, הפסוק וההתכנסויות של שמך — או של כל שם יקר.", status: "live" },
  { id: "family", icon: "👨‍👩‍👧", title: "הקשרים במשפחה", desc: "גלו את ההתכנסויות הנסתרות בין שמות בני המשפחה — עובדה מחושבת, לא ניחוש.", status: "live" },
  { id: "compare", icon: "🔀", title: "השוואת שניים", desc: "שני שמות זה מול זה — היכן הם נפגשים בערך (אותה שיטה = חזק · חוצה-שיטות = עקיף).", status: "live" },
  { id: "gematria", icon: "🧮", title: "מחשבון גימטריה", desc: "כל 17 השיטות, מאומת מול המנוע — רגיל · מילוי · אתב״ש · ריבוע ועוד.", status: "live" },
  { id: "els", icon: "🔡", title: "דילוגי אותיות (ELS)", desc: "מסך רשת-אותיות — מצא שם/מילה כדילוג בתורה, ראה מיקום ומרחק. עדשת חקירה.", status: "live" },
  { id: "number", icon: "🔢", title: "דף מספר", desc: "פתחו מספר וראו הכל — גימטריאות, הצלבות, התכנסויות, אירועים.", status: "open", to: "/numbers" },
  { id: "midrash", icon: "📜", title: "בית המדרש", desc: "חידושים, שיטות הלימוד והצלבות — נפתח כאן בתוך הסביבה.", status: "live" },
  { id: "life", icon: "🧬", title: "ניתוח חיים", desc: "קלט אחד → מנועים מרובים → פלט להשוואה. מפת-שדה מחושבת + חריצי AI. תשתית הזהות-בזמן.", status: "live" },
  { id: "verse", icon: "📖", title: "חיפוש בפסוקים", desc: "מצאו ביטוי או ערך גימטרי בתוך 5,846 פסוקי התורה.", status: "live" },
  { id: "import", icon: "📊", title: "ניתוח קובץ", desc: "העלו אקסל/CSV עם רשימת שמות או ביטויים — המנוע מחשב גימטריה לכולם ומוצא התכנסויות.", status: "live" },
  { id: "cross", icon: "🧬", title: "מחולל הצלבות", desc: "חברו ביטויים בעלי אותו ערך — וגלו הצלבות חדשות.", status: "soon" },
  { id: "notarikon", icon: "🔠", title: "נוטריקון / ראשי-תיבות", desc: "בנו ופרקו ראשי-תיבות, וחשבו את ערכם.", status: "soon" },
  { id: "dates", icon: "📅", title: "תאריכים עבריים", desc: "גימטריה של שנים ואירועים — חיבור ציר הזמן למספרים.", status: "soon" },
  { id: "ai", icon: "🤖", title: "ניתוח AI", desc: "נתחו את «המחקר הפעיל» — ה-AI מחבר את הקשרים בשבילכם.", status: "soon" },
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

// סדר: כלי-דגל (מספר · מחשבון · דילוגים) → פתוחים נוספים (פסוקים) → נעולים מתחת.
const rankOf = t => { const fi = FLAGSHIP_TOOLS.indexOf(t.id); return fi >= 0 ? fi : (isToolReady(t.id) ? 10 : 20); };

export default function ResearchHome({ onOpen }) {
  const ordered = [...TOOLS].sort((a, b) => rankOf(a) - rankOf(b));
  const open = ordered.filter(t => isToolReady(t.id));
  const locked = ordered.filter(t => !isToolReady(t.id));
  return (
    <div>
      <div className="rw-h1">🧭 מרכז הגילוי</div>
      <div className="rw-sub">הכלים המרכזיים שלנו למעלה — בחרו כלי, הוא נפתח כאן בתוך הסביבה, ומה שתאספו נשמר ב«המחקר הפעיל» בצד (גם כשתעברו בין כלים).</div>
      <div className="rw-tools">
        {open.map(t => <ToolCard key={t.id} t={t} onOpen={onOpen} />)}
      </div>
      {locked.length > 0 && <>
        <div className="rw-grp">עוד כלים · בשדרוג, ייפתחו בקרוב</div>
        <div className="rw-tools">
          {locked.map(t => <ToolCard key={t.id} t={t} onOpen={onOpen} />)}
        </div>
      </>}
    </div>
  );
}
