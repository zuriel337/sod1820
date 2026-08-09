import React from "react";
import WatchButton from "./WatchButton.jsx";

// 🔔 מעקב בתחתית פוסט — subscription_funnel_law v8: «מעקב אחרי קטגוריה בלבד».
// החלטת צוריאל: אין מעקב-אחרי-כתב. מי שרוצה לעקוב אחרי כתב מסוים בלי הקטגוריה
// שובר את «העץ האחד» — לכן המעקב תמיד על הקטגוריה הראשית של הפוסט.
// זו קריאה דקה בלבד ל-WatchButton הקנוני היחיד (topic=cat:<שם>, source=post_footer).
// paletteMode=postMode כדי שאזור-המעקב יתאים לצבע-הפוסט (נעול-כהה מול מצב-אתר בהיר).
export default function PostFollowBox({ categories = [], postMode = null }) {
  const primaryCat = (categories || []).find(Boolean) || null;
  if (!primaryCat) return null;
  return (
    <WatchButton topic={`cat:${primaryCat}`} source="post_footer" gate paletteMode={postMode}
      heading={`רוצה לדעת כשמתפרסם פוסט חדש ב«${primaryCat}»?`}
      label={`עקוב אחרי «${primaryCat}»`}
      explainer="נעדכן אותך על כל פוסט חדש בקטגוריה הזו." />
  );
}
