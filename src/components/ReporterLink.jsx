import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { loadReporters } from "../lib/reporters.js";
import { thumb } from "../lib/img.js";

// 👤 hook — מחזיר {slug, avatar} של כתב לפי credit, אם קיים לו דף. אחרת null.
export function useReporter(credit) {
  const [r, setR] = useState(null);
  useEffect(() => {
    let alive = true;
    loadReporters().then(m => { if (alive) setR(m.get((credit || "").trim()) || null); });
    return () => { alive = false; };
  }, [credit]);
  return r;
}

// 👤 שם-כתב לחיץ → דף הכתב הקנוני (/community/researcher/:slug), אך ורק כשקיים לו דף.
// אם אין דף (כתב שלא הוקם, או קרדיט-ערוץ כמו «סוד1820») → טקסט רגיל, בלי קישור שבור.
// עץ אחד: מפנה לדף הקיים, לא בונה דף מקביל. הרמז («לדף שלו · כל העדכונים») = ההצעה להיכנס.
export default function ReporterLink({ credit, children, className, style, onClick }) {
  const r = useReporter(credit);
  if (!r?.slug) return <>{children}</>;
  return (
    <Link
      to={`/community/researcher/${encodeURIComponent(r.slug)}`}
      className={className}
      style={style}
      title={`לדף של ${credit} · כל העדכונים שלו ←`}
      onClick={(e) => { e.stopPropagation(); onClick && onClick(e); }}
    >
      {children}
    </Link>
  );
}

// 🖼 עיגול תמונת-הכתב (מוואטסאפ) — לחיץ לדף שלו כשקיים. לא מרונדר כלל אם אין תמונה.
export function ReporterAvatar({ credit, size = 22, ring }) {
  const r = useReporter(credit);
  if (!r?.avatar) return null;
  const img = (
    <img src={thumb(r.avatar, size * 2)} alt={credit || ""} loading="lazy"
      style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", display: "block",
        border: ring ? `1.5px solid ${ring}` : undefined, flex: "0 0 auto" }} />
  );
  if (!r.slug) return img;
  return (
    <Link to={`/community/researcher/${encodeURIComponent(r.slug)}`} title={`לדף של ${credit} ←`}
      onClick={(e) => e.stopPropagation()} style={{ display: "inline-flex", flex: "0 0 auto" }}>
      {img}
    </Link>
  );
}
