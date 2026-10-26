import React from "react";
import {
  formatTanakhRef,
  formatVerseGematriaSuffix,
} from "../../lib/presentation/canonicalPresentation.js";
import "./canonical-verse-cards-2029.css";

const clean = value => value == null ? "" : String(value).trim();

function verseMeta(row, variant) {
  if (variant === "name") return "פסוק לשם · אות ראשונה ואות אחרונה";
  return clean(row?.matchLabel) || "פסוק שלם · גימטריה רגילה";
}

/** One 2029 verse presentation shared by Number and private Life Journey surfaces. */
export default function CanonicalVerseCards2029({
  rows = [],
  variant = "gematria",
  compact = false,
  fallbackValue = null,
} = {}) {
  const verses = Array.isArray(rows) ? rows : [];
  if (!verses.length) return null;
  return <div className={`sod29-canonical-verse-grid${compact ? " is-compact" : ""}`} data-verse-variant={variant}>
    {verses.map((row, index) => {
      const ref = formatTanakhRef(row?.verseDisplayRef || row?.ref);
      const value = Number(row?.value ?? row?.ragil ?? fallbackValue);
      const showValue = variant === "gematria" && Number.isFinite(value);
      return <article
        key={clean(row?.verseIdentity) || clean(row?.ref) || index}
        data-verse-identity={clean(row?.verseIdentity) || undefined}
        data-canonical-book={clean(row?.canonicalBookIdentity) || undefined}
      >
        <span className="sod29-canonical-verse-ref">{ref}</span>
        <p className="sod29-canonical-verse-text">
          <span>{clean(row?.text)}</span>
          {showValue ? <strong>{formatVerseGematriaSuffix(value)}</strong> : null}
        </p>
        <small>{verseMeta(row, variant)}</small>
      </article>;
    })}
  </div>;
}
