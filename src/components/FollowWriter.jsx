import React from "react";
import WatchButton from "./WatchButton.jsx";

// 🔔 מעקב אחרי כתב — בדף-הכתב עצמו (subscription_funnel_law). כאן מעקב-אחרי-כתב הגיוני:
// הגולש בחר להיכנס לדף של הכתב. (בתחתית-פוסט, לעומת זאת, המעקב הוא על הקטגוריה/הפוסט — v8.)
// מעטפת דקה על ה-WatchButton הקנוני היחיד: topic=author:<name>, source=writer, מצב-אינליין.
export default function FollowWriter({ name, compact = true }) {
  if (!name) return null;
  return (
    <WatchButton topic={`author:${name}`} source="writer" compact={compact} label="עקבו" />
  );
}
