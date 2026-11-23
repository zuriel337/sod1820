import React from "react";
import { ELS_MATRIX_PROFILE } from "../../lib/research/els2029MatrixMode.js";

// Page-local, optional explanations. No engine instance, auth request, or expensive work.
const MODE_HELP = Object.freeze({
  [ELS_MATRIX_PROFILE.CLASSIC]: {
    title: "מתחילים בצופן התנ״כי",
    summary: "מחפשים מילה, בוחרים מופע וקוראים אותו בתוך אותיות התנ״ך.",
    steps: [
      ["כתבו מילה קצרה", "למשל דוד או שלום, ולחצו על חיפוש."],
      ["בחרו תוצאה", "ברשימת המופעים אפשר לראות דילוג, כיוון ומיקום במקור."],
      ["פתחו את המטריצה", "האותיות מסומנות בטבלה. פתחו את מקור הממצא כדי לקרוא את הפסוק, כשהאפשרות זמינה."],
    ],
    note: "לא מצאתם? נסו מילה קצרה אחרת. חיפוש מוגבל ללא תוצאות אינו קובע שאין מופע במקור.",
  },
  [ELS_MATRIX_PROFILE.RESEARCH]: {
    title: "חוקרים קשרים בין מילים",
    summary: "מתחילים במילה אחת, בודקים מופעים, ואז בוחרים הצלבה או חיפוש מתקדם.",
    steps: [
      ["מצאו ציר ראשי", "חפשו מילה ובחרו את המופע שתרצו לבדוק."],
      ["בדקו קשר", "ב״הצלבה בין צירים״ הוסיפו מונח נוסף ובחנו את המפגש ואת מקור האותיות."],
      ["העמיקו רק כשצריך", "בחיפוש מתקדם אפשר לקבוע טווח דילוגים והיקף טקסט, בהתאם להרשאות החשבון."],
    ],
    note: "מעבר בין קלאסי למחקר אינו מתחיל חיפוש חדש. חלק מכלי המחקר עדיין מוגבלים בגישה או בפיתוח.",
  },
  [ELS_MATRIX_PROFILE.GUIDED]: {
    title: "מגלים בעזרת חיפוש מודרך",
    summary: "מתארים נושא קצר והמערכת בודקת סביב ציר מאומת, בהיקף מוגבל.",
    steps: [
      ["בחרו נושא", "הקלידו סיפור או ציר שאתם רוצים לבדוק."],
      ["בדקו מופע מאומת", "המתינו לתוצאות החיפוש המקומי, ופתחו את המקור."],
      ["המשיכו לפי הצורך", "כל הרחבה של הבדיקה צריכה להיות מפורשת ומוגבלת."],
    ],
    note: "גילוי מודרך אינו מבטיח שיימצא קשר. מצב זה זמין רק כאשר ההרשאות מאפשרות זאת.",
  },
});

const panelStyle = {
  border: "1px solid var(--sod-border, rgba(167, 130, 64, .34))",
  borderRadius: "12px",
  padding: "12px 14px",
  margin: "10px 0 14px",
  maxWidth: "100%",
};

export function ElsConstructionNotice2029() {
  return <aside role="note" aria-label="מצב בניית הצופן התנ״כי" style={{ ...panelStyle, marginTop: 0 }}>
    <strong>הצופן התנ״כי נמצא בבנייה מתקדמת</strong>
    <p style={{ margin: "5px 0 0" }}>המערכת פתוחה להתנסות ולמחקר. יכולות נוספות מתווספות בהדרגה, וייתכנו שינויים בתוצאות ובתצוגה.</p>
  </aside>;
}

export default function ElsModeHelp2029({ profile }) {
  const help = MODE_HELP[profile] || MODE_HELP[ELS_MATRIX_PROFILE.CLASSIC];
  return <section aria-label="הדרכה לשימוש בצופן התנ״כי" style={panelStyle} dir="rtl">
    <strong>{help.title}</strong>
    <p style={{ margin: "5px 0 8px" }}>{help.summary}</p>
    <details key={profile}>
      <summary style={{ cursor: "pointer", fontWeight: 600 }}>איך עובדים במצב הזה? 3 צעדים קצרים</summary>
      <ol style={{ margin: "12px 0", paddingInlineStart: "24px" }}>
        {help.steps.map(([title, body]) => <li key={title} style={{ marginBottom: "9px" }}>
          <strong>{title}.</strong> {body}
        </li>)}
      </ol>
      <small>{help.note}</small>
      <p style={{ marginBottom: 0 }}>
        <abbr title="מספר האותיות הקבוע בין אות לאות ברצף" style={{ textDecoration: "underline dotted", cursor: "help" }}>דילוג</abbr>
        {" · "}
        <abbr title="המופע הראשי שנבחר לחיפוש" style={{ textDecoration: "underline dotted", cursor: "help" }}>ציר</abbr>
        {" · "}
        <abbr title="פריסת האותיות לשורות לצורך הצגת ממצאים" style={{ textDecoration: "underline dotted", cursor: "help" }}>מטריצה</abbr>
      </p>
    </details>
  </section>;
}
