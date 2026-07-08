import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { loadReporters } from "../lib/reporters.js";

// 👤 שם-כתב לחיץ → דף הכתב הקנוני (/community/researcher/:slug), אך ורק כשקיים לו דף.
// אם אין דף (למשל כתב שעדיין לא הוקם, או קרדיט-ערוץ כמו «סוד1820») → טקסט רגיל, בלי קישור שבור.
// עץ אחד: מפנה לדף הקיים, לא בונה דף מקביל. הרמז («לדף שלו · כל העדכונים») = ההצעה להיכנס.
export default function ReporterLink({ credit, children, className, style, onClick, avatarOnly }) {
  const [slug, setSlug] = useState(null);
  useEffect(() => {
    let alive = true;
    loadReporters().then(m => { if (alive) setSlug(m.get((credit || "").trim())?.slug || null); });
    return () => { alive = false; };
  }, [credit]);

  if (!slug) return <>{children}</>;
  return (
    <Link
      to={`/community/researcher/${encodeURIComponent(slug)}`}
      className={className}
      style={style}
      title={`לדף של ${credit} · כל העדכונים שלו ←`}
      onClick={(e) => { e.stopPropagation(); onClick && onClick(e); }}
    >
      {children}
    </Link>
  );
}
