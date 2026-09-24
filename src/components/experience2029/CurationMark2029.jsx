import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { usePalette } from "../../lib/palette.js";
import "./curationMark2029.css";

const ICON = Object.freeze({
  diamond_core: "💎",
  gold_core: "✦",
  gold_anchor: "✦",
  crown_anchor: "♛",
});

const LABEL = Object.freeze({
  diamond_core: "יהלום",
  gold_core: "זהב",
  gold_anchor: "עוגן זהב",
  crown_anchor: "כתר",
});

function groupTitle(key) {
  if (key === "diamonds") return "יהלומים";
  if (key === "gold") return "זהב";
  return "עוגני מספר";
}

function kindNote(kind) {
  if (kind === "diamond_core") return "חתימת כתר נדירה שמחזיקה מקום מיוחד בתוך 1820.";
  if (kind === "gold_core") return "זהות ליבה מרכזית בתוך משפחת הזהב.";
  if (kind === "gold_anchor") return "מספר שהוא מרכז של חיבורים רבים, לא רק ערך של ביטוי.";
  if (kind === "crown_anchor") return "מרכז כתר 1820. העוגן עצמו אינו יהלום שלישי.";
  return "אוצר מחקר.";
}

function TreasureGroups({ catalog }) {
  const groups = useMemo(() => ([
    ["diamonds", catalog?.diamonds || []],
    ["gold", catalog?.gold || []],
    ["anchors", catalog?.anchors || []],
  ]), [catalog]);

  return <div className="sod29-treasure-groups" data-curation-treasure-catalog="true">
    {groups.map(([key, items]) => <section key={key} className="sod29-treasure-group">
      <header>
        <span>{key === "diamonds" ? "💎" : key === "gold" ? "✦" : "⌾"}</span>
        <strong>{groupTitle(key)}</strong>
        <small>{items.length}</small>
      </header>
      <div className="sod29-treasure-list">
        {items.length ? items.map((item) => <article key={item.id}>
          <span aria-hidden="true">{ICON[item.kind] || "✦"}</span>
          <div>
            <strong>{item.label}</strong>
            <small>{item.value != null ? `${item.value} · ` : ""}{LABEL[item.kind] || "אוצר"}</small>
          </div>
        </article>) : <p>אין כרגע פריטים בקבוצה הזאת.</p>}
      </div>
    </section>)}
  </div>;
}

export default function CurationMark2029({
  item,
  related = [],
  witnessCount = 0,
  catalog = null,
  compact = false,
} = {}) {
  const palette = usePalette();
  const [open, setOpen] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const kind = item?.kind || null;

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);

  const vars = {
    "--curation-gold": palette.accent,
    "--curation-gold-text": palette.accentText,
    "--curation-diamond": palette.heroNum,
    "--curation-ink": palette.ink,
    "--curation-muted": palette.inkSoft,
    "--curation-panel": palette.card,
    "--curation-panel-soft": palette.cardSoft,
    "--curation-line": palette.border,
    "--curation-line-strong": palette.borderStrong,
    "--curation-glow": palette.glow,
  };
  const title = LABEL[kind] || "אוצר";
  const icon = ICON[kind] || "✦";
  if (!kind) return null;

  const disclosure = open && typeof document !== "undefined" ? createPortal(<div className="sod29-curation-overlay" role="presentation" style={vars} onMouseDown={() => setOpen(false)}>
      <section
        className="sod29-curation-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={`${title}: ${item.label}`}
        data-curation-treasure-disclosure="true"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="sod29-curation-sheet-head">
          <div className={`sod29-curation-hero is-${kind}`}>
            <span aria-hidden="true">{icon}</span>
            <div>
              <small>{title}</small>
              <strong>{item.label}</strong>
            </div>
          </div>
          <button type="button" className="sod29-curation-close" onClick={() => setOpen(false)} aria-label="סגור">×</button>
        </header>

        {!catalogOpen ? <>
          <p className="sod29-curation-plain">{kindNote(kind)}</p>
          <p className="sod29-curation-reason">{item.reason}</p>
          {item.axisTheme ? <div className="sod29-curation-axis"><small>הציר</small><strong>{item.axisTheme}</strong></div> : null}
          {related.length ? <div className="sod29-curation-related">
            <small>החיבורים המרכזיים כאן</small>
            <div>{related.slice(0, 3).map((row) => <span key={row.id}>{ICON[row.kind] || "✦"} {row.label}</span>)}</div>
          </div> : null}
          {witnessCount > 0 ? <div className="sod29-curation-witness-count">{witnessCount} עדים מסומנים בציר · העדים אינם יורשים את דרגת הליבה</div> : null}
          <div className="sod29-curation-actions">
            <button type="button" onClick={() => setCatalogOpen(true)}>כל האוצרות</button>
            <button type="button" className="ghost" onClick={() => setOpen(false)}>הבנתי</button>
          </div>
        </> : <>
          <div className="sod29-curation-catalog-head">
            <div><small>אוצרות SOD1820</small><strong>יהלומים · זהב · עוגני מספר</strong></div>
            <button type="button" onClick={() => setCatalogOpen(false)}>חזרה להסבר</button>
          </div>
          <TreasureGroups catalog={catalog} />
          <p className="sod29-curation-boundary">העדים נשארים בתוך הציר שאליו הם שייכים. כסף אינו מוצג כאן עד שהמשמעות שלו תיקבע.</p>
        </>}
      </section>
    </div>, document.body) : null;

  return <>
    <button
      type="button"
      className={`sod29-curation-mark is-${kind}${compact ? " is-compact" : ""}`}
      data-curation-mark={kind}
      aria-label={`${title}: ${item.label}. פתח הסבר`}
      aria-haspopup="dialog"
      onClick={(event) => {
        event.stopPropagation();
        setCatalogOpen(false);
        setOpen(true);
      }}
      style={vars}
    >
      <span aria-hidden="true">{icon}</span>
      {!compact ? <small>{title}</small> : null}
    </button>

    {disclosure}
  </>;
}
