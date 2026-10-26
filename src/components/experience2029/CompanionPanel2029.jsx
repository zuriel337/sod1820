// Left companion panel (desktop): a floating capsule that shows what entered the system everywhere on the site, plus the
// context of the current selection as a second tab. Slim by default (icon + quiet count), opens on hover/focus or when a
// selection exists, can be pinned open (the content moves aside). Raziel reuses the same panel in quiet, contextual-hint and
// open-chat presentations while the existing bottom orb remains available. Read-only over the existing stream.
import React from "react";
import { Link } from "react-router-dom";
import { recordTimeLabel } from "../../lib/relativeTime2029.js";
import OrGeulaStoryColumn from "../OrGeulaStoryColumn.jsx";
import "./companionPanel2029.css";

export default function CompanionPanel2029({ feed, mode, tab, onTab, onOpenPanel, pinned, onTogglePin, hasContext, contextNode, hasSequence = false, sequenceNode = null, onOpenHref, razielNode, razielView = "quiet", onRazielView, razielHint = "מה שמולך עכשיו", hoverProps, timeMode = "bilingual" }) {
  const open = mode !== "slim";
  const badge = feed.newCount > 9 ? "9+" : String(feed.newCount);
  return <aside className={`sod29-companion is-${mode}`} aria-label="עדכונים, הקשר ורצף האירועים" data-companion-mode={mode} {...hoverProps}>
    {!open ? <div className="sod29-companion-slim">
      <button type="button" className={`sod29-companion-ico${tab === "feed" ? " is-on" : ""}`} onClick={() => onOpenPanel("feed")} aria-label={feed.newCount ? `עדכונים: ${feed.newCount} חדשים` : "עדכונים"}>
        <i aria-hidden="true" />{feed.newCount ? <span className="sod29-companion-badge" aria-hidden="true">{badge}</span> : null}
      </button>
      {hasContext ? <button type="button" className="sod29-companion-ico is-ctx" onClick={() => onOpenPanel("ctx")} aria-label="הקשר"><span className="sod29-companion-ctx" aria-hidden="true" /></button> : null}
      {hasSequence ? <button type="button" className={`sod29-companion-ico is-seq${tab === "seq" ? " is-on" : ""}`} onClick={() => onOpenPanel("seq")} aria-label="רצף האירועים"><span className="sod29-companion-seq" aria-hidden="true">⋮</span></button> : null}
      <div className="sod29-companion-source-quick is-slim" aria-label="מקורות ציבוריים">
        <OrGeulaStoryColumn variant="shortcut" limit={12} />
        <button type="button" className="sod29-companion-source-link" onClick={() => onOpenHref("/world?subjectSource=zvi#world-all-convergences")} aria-label="מקורות ציבוריים של צבי"><span aria-hidden="true">צ</span></button>
        <button type="button" className="sod29-companion-source-link" onClick={() => onOpenHref("/world?subjectSource=hashmal#world-all-convergences")} aria-label="ספריית סוד החשמל"><span aria-hidden="true">⚡</span></button>
      </div>
    </div> : <div className="sod29-companion-full">
      <div className="sod29-companion-top">
        <b>{tab === "seq" && hasSequence ? "רצף האירועים" : tab === "ctx" && hasContext ? "הקשר" : "עדכונים"}</b>
        <button type="button" className="sod29-companion-pin" aria-pressed={pinned} onClick={onTogglePin} title={pinned ? "בטל נעיצה" : "נעץ את הפאנל פתוח"}>{pinned ? "בטל נעיצה" : "נעץ"}</button>
      </div>
      {hasContext || hasSequence ? <div className="sod29-companion-tabs" role="group" aria-label="תצוגת הפאנל: עדכונים, הקשר או רצף האירועים">
        <button type="button" aria-pressed={tab === "feed"} onClick={() => onTab("feed")}>עדכונים{feed.newCount ? <em>{feed.newCount}</em> : null}</button>
        {hasContext ? <button type="button" aria-pressed={tab === "ctx"} onClick={() => onTab("ctx")}>הקשר</button> : null}
        {hasSequence ? <button type="button" aria-pressed={tab === "seq"} onClick={() => onTab("seq")}>רצף האירועים</button> : null}
      </div> : null}

      {tab === "seq" && hasSequence ? <div className="sod29-companion-seqbody">{sequenceNode}</div> : tab === "ctx" && hasContext ? <div className="sod29-companion-ctxbody">{contextNode}</div> : <div className="sod29-companion-feed">
        <div className="sod29-companion-source-quick is-expanded" aria-label="ערוצי מקור ציבוריים">
          <OrGeulaStoryColumn variant="shortcut" limit={12} />
          <button type="button" className="sod29-companion-source-link" onClick={() => onOpenHref("/world?subjectSource=zvi#world-all-convergences")} aria-label="לקריאת מקורות צבי"><span className="sod29-companion-source-icon" aria-hidden="true">צ</span><span>צבי · הנושאים</span></button>
          <button type="button" className="sod29-companion-source-link" onClick={() => onOpenHref("/world?subjectSource=hashmal#world-all-convergences")} aria-label="לקריאת סוד החשמל"><span className="sod29-companion-source-icon" aria-hidden="true">⚡</span><span>סוד החשמל · הנושאים</span></button>
        </div>
        <div className="sod29-companion-note">חזקים קודם, ובתוכם החדשים. חדש אינו ממצא מאומת.</div>
        {feed.loading ? <p className="sod29-companion-empty" role="status">טוען את מה שנכנס…</p> : null}
        {feed.error ? <p className="sod29-companion-empty" role="status">העדכונים אינם זמינים כרגע.</p> : null}
        {!feed.loading && !feed.error && !feed.rows.length ? <p className="sod29-companion-empty" role="status">אין כרגע חידושים להצגה.</p> : null}
        <ul className="sod29-companion-list">
          {feed.rows.map((row) => <li key={row.id} className={`sod29-companion-row${row.isNew ? " is-new" : ""}`}>
            <button type="button" className="sod29-companion-open" disabled={!row.href} onClick={() => { feed.see(row); if (row.href) onOpenHref(row.href); }}>
              <span className="sod29-companion-l1">
                <span className={`sod29-companion-ty is-${row.kind}${row.strong ? " is-strong" : ""}`}>{row.typeLabel}{row.strong ? " · ◆ חזקה" : ""}</span>
                <span className="sod29-companion-time">{recordTimeLabel(row.at, timeMode, "זמן לא צוין")}</span>
                {row.isNew ? <i className="sod29-companion-dot" aria-hidden="true" /> : null}
                {row.isNew ? <span className="sod29-companion-sr">חדש</span> : null}
              </span>
              <span className="sod29-companion-t">{row.title}</span>
            </button>
          </li>)}
        </ul>
        <Link className="sod29-companion-all" to="/world" onClick={() => feed.rows.forEach((row) => feed.see(row))}>כל החידושים בעולם ←</Link>
      </div>}
    </div>}
    {razielNode && razielView === "quiet" ? <button type="button" className="sod29-companion-raziel-quiet" data-raziel-companion-quiet="true" onClick={() => onRazielView?.("hints")} aria-label="הצג רמז מרזיאל" title="רזיאל">
      <span aria-hidden="true">✦</span>
    </button> : null}
    {razielNode && razielView !== "quiet" ? <section className={`sod29-companion-raziel is-${razielView}`} aria-label="רזיאל" data-raziel-companion-view={razielView} hidden={!open}>
      <div className="sod29-companion-raziel-view" role="group" aria-label="תצוגת רזיאל">
        <button type="button" aria-pressed={razielView === "quiet"} onClick={() => onRazielView?.("quiet")}>שקט</button>
        <button type="button" aria-pressed={razielView === "hints"} onClick={() => onRazielView?.("hints")}>רמזים</button>
        <button type="button" aria-pressed={razielView === "open"} onClick={() => onRazielView?.("open")}>פתוח</button>
      </div>
      {razielView === "hints" ? <div className="sod29-companion-raziel-hint" data-raziel-hint="deterministic">
        <small>אפשר להמשיך מכאן</small>
        <p>רזיאל רואה את ההקשר: <bdi>{razielHint}</bdi></p>
        <button type="button" onClick={() => onRazielView?.("open")}>פתח שיחה</button>
      </div> : razielNode}
    </section> : null}
  </aside>;
}
