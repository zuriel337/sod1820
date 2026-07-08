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
// canonical=true → מציג את השם הקנוני של הכתב (display_name) במקום ה-credit הגולמי
// (למשל «OPOC1 OPOC1» יוצג כ«צבי»).
export default function ReporterLink({ credit, children, className, style, onClick, canonical }) {
  const r = useReporter(credit);
  const label = (canonical && r?.name) ? r.name : children;
  if (!r?.slug) return <>{label}</>;
  return (
    <Link
      to={`/community/researcher/${encodeURIComponent(r.slug)}`}
      className={className}
      style={style}
      title={`לדף של ${r.name || credit} · כל העדכונים שלו ←`}
      onClick={(e) => { e.stopPropagation(); onClick && onClick(e); }}
    >
      {label}
    </Link>
  );
}

// 🖼 עיגול תמונת-הכתב (מוואטסאפ) — לחיץ לדף שלו כשקיים. לא מרונדר כלל אם אין תמונה.
// fallback: תמונת-ברירת-מחדל (למשל סמל-ערוץ «אור הגאולה» מ-BRANDS) כשאין תמונת-כתב אישית.
export function ReporterAvatar({ credit, size = 22, ring, fallback }) {
  const r = useReporter(credit);
  const src = r?.avatar || fallback || null;
  if (!src) return null;
  const img = (
    <img src={thumb(src, size * 2)} alt={credit || ""} loading="lazy"
      style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", display: "block",
        border: ring ? `1.5px solid ${ring}` : undefined, flex: "0 0 auto" }} />
  );
  if (!r?.slug) return img;
  return (
    <Link to={`/community/researcher/${encodeURIComponent(r.slug)}`} title={`לדף של ${credit} ←`}
      onClick={(e) => e.stopPropagation()} style={{ display: "inline-flex", flex: "0 0 auto" }}>
      {img}
    </Link>
  );
}
