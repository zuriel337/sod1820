import React from "react";
import WatchButton from "./WatchButton.jsx";
import { resolveAuthor } from "../lib/authors.js";

// 🔔 מעקב בתחתית פוסט — subscription_funnel_law v7: «PostFollowBox → WatchButton».
// אין יותר מנגנון-מעקב נפרד לפוסט (טיזר-מייל + auto-follow-הכל הוסרו). זהו קריאה
// דקה בלבד ל-WatchButton הקנוני היחיד: בוחרים יעד אחד ברור ומעבירים לו את ה-topic.
//   • כותב אמיתי → author:<שם> («עקוב אחרי הכתב» — פוסטים חדשים ממנו)
//   • אין כותב (=«המערכת») → הקטגוריה הראשית cat:<שם>
// In-App, source=post_footer. paletteMode=postMode כדי שאזור-המעקב יתאים לצבע-הפוסט
// (פוסט נעול-כהה מול מצב-אתר בהיר). מייל/Push נכנסים רק דרך «מרכז העדכונים» (שלב ב').
export default function PostFollowBox({ categories = [], author = "", postMode = null }) {
  const by = resolveAuthor(author);
  const hasWriter = by.name && by.name !== "המערכת";
  const primaryCat = (categories || []).find(Boolean) || null;

  if (hasWriter) {
    return (
      <WatchButton topic={`author:${by.name}`} source="post_footer" gate paletteMode={postMode}
        heading={`רוצה לדעת כשמתפרסם פוסט חדש מאת ${by.name}?`}
        label={`עקוב אחרי ${by.name}`}
        explainer={`נעדכן אותך על כל פוסט חדש מאת ${by.name}.`} />
    );
  }
  if (primaryCat) {
    return (
      <WatchButton topic={`cat:${primaryCat}`} source="post_footer" gate paletteMode={postMode}
        heading={`רוצה לדעת כשמתפרסם פוסט חדש ב«${primaryCat}»?`}
        label={`עקוב אחרי «${primaryCat}»`}
        explainer="נעדכן אותך על כל פוסט חדש בקטגוריה הזו." />
    );
  }
  return null;
}
