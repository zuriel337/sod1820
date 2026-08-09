import React from "react";
import WatchButton from "./WatchButton.jsx";

// 🔔 מעקב אחרי כתב — subscription_funnel_law v7: עכשיו דרך ה-WatchButton הקנוני היחיד.
// אין יותר לוגיקת-מעקב נפרדת (saveNotificationPrefs ישיר שלא תיעד subscribe_events) — זו
// קריאה דקה בלבד: topic=author:<name>, source=writer, מצב-אינליין (compact). הפלטה
// נלקחת מ-usePalette (ContributorPage עטוף ב-PaletteProvider=lab, אז זה תואם אוטומטית).
export default function FollowWriter({ name, compact = true }) {
  if (!name) return null;
  return (
    <WatchButton topic={`author:${name}`} source="writer" compact={compact} label="עקבו" />
  );
}
