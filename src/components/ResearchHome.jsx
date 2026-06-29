import React from "react";
import { Link } from "react-router-dom";

// 🧰 בית-הכלים — מסך הפתיחה של «סביבת המחקר». מרכז את כל האפליקציות במקום אחד.
// כל כלי = כרטיס. live = נפתח בתוך השלד · open = דף קיים (פתיחה חוצה) · soon = בקרוב.
// מוסיפים כלי עתידי בשורה אחת ב-TOOLS — בלי לגעת בשלד (registry).
export const TOOLS = [
  { id: "name", icon: "🪪", title: "סיפור השם שלך", desc: "גלה את הערך, מבנה האותיות, הפסוק וההתכנסויות של שמך — או של כל שם יקר.", status: "live" },
  { id: "family", icon: "👨‍👩‍👧", title: "הקשרים במשפחה", desc: "גלו את ההתכנסויות הנסתרות בין שמות בני המשפחה — עובדה מחושבת, לא ניחוש.", status: "live" },
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
  const badge = t.status === "live" ? <span className="bg live">● פעיל</span>
    : t.status === "open" ? <span className="bg open">פתח »</span>
    : <span className="bg soon">בקרוב</span>;
  const inner = (
    <>
      <div className="ic">{t.icon}</div>
      <div className="tt">{t.title}</div>
      <div className="ds">{t.desc}</div>
      {badge}
    </>
  );
  if (t.status === "live") return <button className="rw-tool" onClick={() => onOpen(t.id)}>{inner}</button>;
  if (t.status === "open") return <Link className="rw-tool" to={t.to}>{inner}</Link>;
  return <div className="rw-tool dis">{inner}</div>;
}

export default function ResearchHome({ onOpen }) {
  return (
    <div>
      <div className="rw-h1">🧭 מרכז הגילוי</div>
      <div className="rw-sub">כל כלי המחקר במקום אחד. בחרו כלי — הוא נפתח כאן בתוך הסביבה, ומה שתאספו נשמר ב«המחקר הפעיל» בצד (גם כשתעברו בין כלים).</div>
      <div className="rw-tools">
        {TOOLS.map(t => <ToolCard key={t.id} t={t} onOpen={onOpen} />)}
      </div>
    </div>
  );
}
