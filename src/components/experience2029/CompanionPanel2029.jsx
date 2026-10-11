// Left companion panel (desktop): a floating capsule that shows what entered the system everywhere on the site, plus the
// context of the current selection as a second tab. Slim by default (icon + quiet count), opens on hover/focus or when a
// selection exists, can be pinned open (the content moves aside). Raziel is NOT in this panel: each row asks Raziel through
// the bottom orb. Read-only over the existing stream; relative time everywhere (relative_time_display_law).
import React from "react";
import { Link } from "react-router-dom";
import { relativeTimeLabel } from "../../lib/relativeTime2029.js";
import "./companionPanel2029.css";

export default function CompanionPanel2029({ feed, mode, tab, onTab, onOpenPanel, pinned, onTogglePin, hasContext, contextNode, onOpenHref, onAsk, hoverProps }) {
  const open = mode !== "slim";
  const badge = feed.newCount > 9 ? "9+" : String(feed.newCount);
  return <aside className={`sod29-companion is-${mode}`} aria-label="מה נכנס למערכת והקשר" data-companion-mode={mode} {...hoverProps}>
    {!open ? <div className="sod29-companion-slim">
      <button type="button" className={`sod29-companion-ico${tab === "feed" ? " is-on" : ""}`} onClick={() => onOpenPanel("feed")} aria-label={feed.newCount ? `מה נכנס למערכת: ${feed.newCount} חדשים` : "מה נכנס למערכת"}>
        <i aria-hidden="true" />{feed.newCount ? <span className="sod29-companion-badge" aria-hidden="true">{badge}</span> : null}
      </button>
      {hasContext ? <button type="button" className="sod29-companion-ico is-ctx" onClick={() => onOpenPanel("ctx")} aria-label="הקשר"><span className="sod29-companion-ctx" aria-hidden="true" /></button> : null}
    </div> : <div className="sod29-companion-full">
      <div className="sod29-companion-top">
        <b>{tab === "ctx" && hasContext ? "מה מחובר עכשיו" : "מה נכנס למערכת"}</b>
        <button type="button" className="sod29-companion-pin" aria-pressed={pinned} onClick={onTogglePin}>{pinned ? "בטל נעיצה" : "נעץ"}</button>
      </div>
      {hasContext ? <div className="sod29-companion-tabs" role="group" aria-label="תצוגת הפאנל">
        <button type="button" aria-pressed={tab === "feed"} onClick={() => onTab("feed")}>מה נכנס{feed.newCount ? <em>{feed.newCount}</em> : null}</button>
        <button type="button" aria-pressed={tab === "ctx"} onClick={() => onTab("ctx")}>הקשר</button>
      </div> : null}

      {tab === "ctx" && hasContext ? <div className="sod29-companion-ctxbody">{contextNode}</div> : <div className="sod29-companion-feed">
        <div className="sod29-companion-note">חזקים קודם, ובתוכם החדשים. חדש אינו ממצא מאומת.</div>
        {feed.loading ? <p className="sod29-companion-empty" role="status">טוען את מה שנכנס…</p> : null}
        {feed.error ? <p className="sod29-companion-empty" role="status">העדכונים אינם זמינים כרגע.</p> : null}
        {!feed.loading && !feed.error && !feed.rows.length ? <p className="sod29-companion-empty" role="status">אין כרגע חידושים להצגה.</p> : null}
        <ul className="sod29-companion-list">
          {feed.rows.map((row) => <li key={row.id} className={`sod29-companion-row${row.isNew ? " is-new" : ""}`}>
            <button type="button" className="sod29-companion-open" disabled={!row.href} onClick={() => { feed.see(row); if (row.href) onOpenHref(row.href); }}>
              <span className="sod29-companion-l1">
                <span className={`sod29-companion-ty is-${row.kind}${row.strong ? " is-strong" : ""}`}>{row.typeLabel}{row.strong ? " · ◆ חזקה" : ""}</span>
                <span className="sod29-companion-time">{relativeTimeLabel(row.at, "זמן לא צוין")}</span>
                {row.isNew ? <i className="sod29-companion-dot" aria-hidden="true" /> : null}
                {row.isNew ? <span className="sod29-companion-sr">חדש</span> : null}
              </span>
              <span className="sod29-companion-t">{row.title}</span>
            </button>
            <button type="button" className="sod29-companion-ask" onClick={() => onAsk(row)}>שאל את רזיאל על זה</button>
          </li>)}
        </ul>
        <Link className="sod29-companion-all" to="/world" onClick={() => feed.rows.forEach((row) => feed.see(row))}>כל החידושים בעולם ←</Link>
      </div>}
    </div>}
  </aside>;
}
