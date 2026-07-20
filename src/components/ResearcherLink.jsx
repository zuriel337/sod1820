import React from "react";
import { Link } from "react-router-dom";
import { useReporter } from "./ReporterLink.jsx";

// 👤 שם-מחבר לחיץ → דף-החוקר. בהקשר של תוכן שהמחבר כתב (חידוש/דיון/צופן) — תמיד מקשר:
// חוקר אצור → ה-slug שלו · חוקר רשום → שם-המחבר כ-slug (ContributorPage נופל לפרופיל-חוקר קל).
// עץ אחד: דף אחד לכל חוקר, אצור או אוטומטי — לא בונים מקביל.
export default function ResearcherLink({ name, children, style, className, onClick }) {
  const r = useReporter(name);
  const nm = (name || "").trim();
  if (!nm) return <>{children ?? name ?? ""}</>;
  const to = `/community/researcher/${encodeURIComponent(r?.slug || nm)}`;
  return (
    <Link to={to} style={style} className={className} title={`לדף החוקר ${r?.name || nm} ←`}
      onClick={(e) => { e.stopPropagation(); onClick && onClick(e); }}>
      {children ?? (r?.name || nm)}
    </Link>
  );
}
