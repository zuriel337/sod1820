import React from "react";
import { Link } from "react-router-dom";
import { useReporter } from "./ReporterLink.jsx";

// 👤 שם-מחבר לחיץ → דף-החוקר. בהקשר של תוכן שהמחבר כתב (חידוש/דיון/צופן) — תמיד מקשר:
// חוקר אצור → ה-slug שלו · חוקר רשום → שם-המחבר כ-slug (ContributorPage נופל לפרופיל-חוקר קל).
// עץ אחד: דף אחד לכל חוקר, אצור או אוטומטי — לא בונים מקביל.
// display (אופציונלי) — שם-תצוגה שהמשתמש בחר (users.display_name). מוצג במקום ה-name הגולמי,
// אבל הקישור/ה-slug נשארים לפי name היציב — כך «בחר שם» משתקף מיד בלי לשבור את דף-החוקר.
export default function ResearcherLink({ name, display, children, style, className, onClick }) {
  const r = useReporter(name);
  const nm = (name || "").trim();
  const shown = children ?? ((display || "").trim() || r?.name || nm);
  if (!nm) return <>{children ?? ((display || "").trim() || "")}</>;
  const to = `/community/researcher/${encodeURIComponent(r?.slug || nm)}`;
  return (
    <Link to={to} style={style} className={className} title={`לדף החוקר ${(display || "").trim() || r?.name || nm} ←`}
      onClick={(e) => { e.stopPropagation(); onClick && onClick(e); }}>
      {shown}
    </Link>
  );
}
