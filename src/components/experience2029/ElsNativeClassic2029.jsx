import React, { useMemo, useRef, useState } from "react";
import TzofenEmbed from "../TzofenEmbed.jsx";
import "./elsNativeClassic2029.css";

const clean = (value) => String(value ?? "").trim();
const scopeLabel = (scope) => scope === "tanakh" ? "כל התנ״ך" : "תורה";
const directionLabel = (direction) => direction === "back" ? "אחורה" : direction === "fwd" ? "קדימה" : "—";
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function MatrixSnapshot({ state, onLetterClick, selectedLetterIndex }) {
  const matrix = state?.matrix;
  const geometry = state?.geometry;
  const scrollRef = useRef(null);
  const dragRef = useRef({ active: false, pointerId: null, x: 0, y: 0, left: 0, top: 0, moved: false });

  const markMap = useMemo(() => {
    const map = new Map();
    for (const mark of matrix?.marks || []) map.set(Number(mark.i), mark);
    return map;
  }, [matrix?.marks]);

  const markSummary = useMemo(() => {
    let axis = 0;
    let findings = 0;
    for (const mark of matrix?.marks || []) {
      if (mark?.type === "main") axis += 1;
      else if (mark?.type === "finding") findings += 1;
    }
    return { axis, findings };
  }, [matrix?.marks]);

  const stopDrag = (event) => {
    const el = scrollRef.current;
    const drag = dragRef.current;
    if (!drag.active) return;
    drag.active = false;
    try { if (el?.hasPointerCapture?.(event.pointerId)) el.releasePointerCapture(event.pointerId); } catch { /* noop */ }
    el?.classList.remove("is-dragging");
    setTimeout(() => { dragRef.current.moved = false; }, 0);
  };

  const onPointerDown = (event) => {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    const el = scrollRef.current;
    if (!el) return;
    dragRef.current = {
      active: true,
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      left: el.scrollLeft,
      top: el.scrollTop,
      moved: false,
    };
    try { el.setPointerCapture(event.pointerId); } catch { /* noop */ }
    el.classList.add("is-dragging");
  };

  const onPointerMove = (event) => {
    const el = scrollRef.current;
    const drag = dragRef.current;
    if (!el || !drag.active || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
    el.scrollLeft = drag.left - dx;
    el.scrollTop = drag.top - dy;
  };

  if (!matrix?.rows?.length || !geometry) {
    const candidate = state?.status === "candidate";
    const empty = state?.status === "empty";
    const title = candidate
      ? "נמצא מועמד שעדיין לא אומת"
      : empty
        ? "אין כרגע מופע מאומת להצגה"
        : "חפשו מילה קצרה כדי לפתוח את המטריצה";
    const body = candidate
      ? "המטריצה תיפתח רק אחרי שהמופע יקבל MATCH מהמנוע הקנוני."
      : empty
        ? "זה אינו קובע שהמונח לא קיים. למצב הזה אין סמכות שלילית; אפשר לשנות את החיפוש או לפתוח את הכלים הקלאסיים."
        : "החיפוש רץ באותו מנוע ELS קנוני. כאן מוצגת רק הקרנה חדשה של אותה תוצאה.";
    return <div className="els29-native-empty" data-els-native-state={state?.status || "idle"}>
      <div className="els29-native-empty-orb">✦</div>
      <strong>{title}</strong>
      <span>{body}</span>
    </div>;
  }

  const summaryId = "els29-native-matrix-summary";
  const zoom = clamp(Number(state?.ui?.zoom) || 1, 0.5, 2.8);
  const cellPx = clamp(Math.round(26 * zoom), 16, 54);
  const fit = Boolean(state?.ui?.fit);

  return <div
    ref={scrollRef}
    className="els29-native-matrix-scroll"
    role="region"
    tabIndex={0}
    aria-label={`מטריצת ELS עבור ${state.termRaw || state.term || "המונח הפעיל"}`}
    aria-describedby={summaryId}
    onPointerDown={onPointerDown}
    onPointerMove={onPointerMove}
    onPointerUp={stopDrag}
    onPointerCancel={stopDrag}
  >
    <span id={summaryId} className="els29-native-sr-only">
      {state.termRaw || state.term || "מונח פעיל"} · דילוג {state?.axis?.skip ?? "לא ידוע"} · כיוון {directionLabel(state?.axis?.direction)} · {markSummary.axis} אותיות ציר מסומנות · {markSummary.findings} אותיות ממצאים מסומנות. אפשר להשתמש בכפתור "מקור הממצא" כדי לקרוא את הפסוקים במקלדת.
    </span>
    <div
      className={`els29-native-matrix${fit ? " is-fit" : ""}`}
      aria-hidden="true"
      style={{ "--els29-cols": matrix.cw || geometry.cw || 1, "--els29-cell": `${cellPx}px` }}
    >
      {matrix.rows.map((row, rowOffset) => {
        const chars = Array.from(row);
        return <div className="els29-native-matrix-row" key={`r-${rowOffset}`}>
          {chars.map((letter, colOffset) => {
            const absoluteRow = Number(matrix.r0 ?? geometry.r0 ?? 0) + rowOffset;
            const absoluteCol = Number(matrix.c0 ?? geometry.c0 ?? 0) + colOffset;
            const index = absoluteRow * Number(matrix.S ?? geometry.S ?? 0) + absoluteCol;
            const mark = markMap.get(index);
            const classes = [
              "els29-native-cell",
              mark?.type === "main" ? "is-axis" : "",
              mark?.type === "finding" ? "is-finding" : "",
              mark?.start ? "is-start" : "",
              selectedLetterIndex === index ? "is-selected" : "",
            ].filter(Boolean).join(" ");
            return <span
              key={index}
              className={classes}
              data-els-index={index}
              title="הצג מקור ופסוק"
              onClick={() => {
                if (dragRef.current.moved) return;
                onLetterClick?.({ index, letter, mark });
              }}
              style={mark?.type === "finding" && mark?.color ? { "--els29-mark": mark.color } : undefined}
            >{letter === " " ? "\u00a0" : letter}</span>;
          })}
        </div>;
      })}
    </div>
  </div>;
}

function MatrixControls({ state, onControl }) {
  const active = state?.status === "ok" && state?.verification?.state === "MATCH";
  const count = Number(state?.occurrence?.count) || 0;
  const current = count ? (Number(state?.occurrence?.index) || 0) + 1 : 0;
  const zoom = clamp(Number(state?.ui?.zoom) || 1, 0.5, 2.8);
  const fit = Boolean(state?.ui?.fit);

  return <div className="els29-native-controls" role="group" aria-label="שליטה במטריצת ELS">
    <div className="els29-native-occ-controls">
      <button type="button" disabled={!active || count < 2} onClick={() => onControl("occurrence-prev")} aria-label="מופע קודם">‹</button>
      <span>{count ? `${current} / ${count}` : "—"}</span>
      <button type="button" disabled={!active || count < 2} onClick={() => onControl("occurrence-next")} aria-label="מופע הבא">›</button>
    </div>
    <div className="els29-native-view-controls">
      <button type="button" disabled={!active} onClick={() => onControl("zoom-out")} aria-label="הקטן מטריצה">−</button>
      <span>{Math.round(zoom * 100)}%</span>
      <button type="button" disabled={!active} onClick={() => onControl("zoom-in")} aria-label="הגדל מטריצה">+</button>
      <button type="button" disabled={!active} aria-pressed={fit} onClick={() => onControl("fit-toggle")}>
        {fit ? "גודל חופשי" : "התאם למסך"}
      </button>
    </div>
  </div>;
}

function SourceLens({ lensResult }) {
  if (!lensResult) return <p className="els29-native-muted">לחצו על אות במטריצה כדי לראות את המקור שלה, או השתמשו ב״מקור הממצא״ לקריאה נגישה של פסוקי הציר.</p>;
  if (lensResult.ok === false) return <p className="els29-native-muted">המקור לא זמין לתא הזה במצב הנוכחי.</p>;

  if (lensResult.lens === "letter-context") {
    return <div className="els29-native-source-card">
      <div className="els29-native-source-letter">{lensResult.letter || "א"}</div>
      <div>
        <strong>{lensResult?.location?.ref || lensResult?.verse?.ref || "מקור"}</strong>
        <p>{lensResult?.verse?.text || "טקסט הפסוק נטען מהמנוע הקנוני."}</p>
      </div>
    </div>;
  }

  if (lensResult.lens === "verse-context") {
    const verses = Array.isArray(lensResult.verses) ? lensResult.verses.slice(0, 4) : [];
    return <div className="els29-native-source-list">
      <strong>{lensResult?.span?.fromRef === lensResult?.span?.toRef
        ? lensResult?.span?.fromRef
        : `${lensResult?.span?.fromRef || ""} → ${lensResult?.span?.toRef || ""}`}</strong>
      {verses.map((verse) => <p key={verse.verseIndex}><b>{verse.ref}</b> · {verse.text}</p>)}
      {lensResult.truncated ? <small>מוצג חלק מטווח הפסוקים הארוך.</small> : null}
    </div>;
  }
  return null;
}

function FindingsRail({ state, lensResult, onAxisVerse, onOpenClassic }) {
  const findings = Array.isArray(state?.findings) ? state.findings : [];
  const verified = state?.verification?.state === "MATCH";
  return <aside className="els29-native-workrail" aria-label="כלי ELS והקשר המטריצה">
    <div className="els29-native-rail-section">
      <small>הממצא הפעיל</small>
      <strong>{state?.termRaw || state?.term || "עדיין לא נבחר מונח"}</strong>
      <div className="els29-native-meta-grid">
        <span><b>{verified ? "מאומת" : state?.status === "candidate" ? "מועמד" : "ממתין"}</b><small>מצב</small></span>
        <span><b>{state?.axis?.skip ?? "—"}</b><small>דילוג</small></span>
        <span><b>{directionLabel(state?.axis?.direction)}</b><small>כיוון</small></span>
        <span><b>{state?.occurrence?.count ?? "—"}</b><small>מופעים</small></span>
      </div>
    </div>

    <div className="els29-native-rail-section">
      <div className="els29-native-rail-head"><strong>מקור ופסוק</strong><small>Lens</small></div>
      <SourceLens lensResult={lensResult} />
      <button className="sod29-action" type="button" disabled={!verified || !state?.axis?.hitId} onClick={onAxisVerse}>
        מקור הממצא
      </button>
    </div>

    <div className="els29-native-rail-section">
      <div className="els29-native-rail-head"><strong>ממצאים במטריצה</strong><small>{findings.length}</small></div>
      {findings.length ? <div className="els29-native-findings">
        {findings.map((finding, index) => <div className="els29-native-finding" key={`${finding.t}-${index}`}>
          <i style={finding.color ? { "--els29-mark": finding.color } : undefined} />
          <span><b>{finding.t}</b><small>{finding.inWindow || 0} בחלון · {finding.total || 0} סה״כ</small></span>
        </div>)}
      </div> : <p className="els29-native-muted">אחרי החיפוש תוכלו להוסיף ולראות כאן ממצאים בצבעים.</p>}
    </div>

    <div className="els29-native-rail-section">
      <strong>כלים נוספים</strong>
      <p className="els29-native-muted">הצלבות, עריכת ממצאים, שמירה, תמונה, שיתוף, סרט, ניקוד וכל כלי שעוד לא הועבר ל־2029 נשאר זמין באותו כלי קלאסי.</p>
      <button className="sod29-action" type="button" onClick={onOpenClassic}>פתח את כל הכלים הקלאסיים</button>
    </div>
  </aside>;
}

export default function ElsNativeClassic2029({ initialSeed = "" }) {
  const [query, setQuery] = useState(clean(initialSeed));
  const [engineSeed, setEngineSeed] = useState(clean(initialSeed));
  const [engineState, setEngineState] = useState(null);
  const engineStateRef = useRef(null);
  const [classicOpen, setClassicOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [controlRequest, setControlRequest] = useState(null);
  const controlSeqRef = useRef(0);
  const [lensRequest, setLensRequest] = useState(null);
  const lensSeqRef = useRef(0);
  const [lensResult, setLensResult] = useState(null);
  const [selectedLetterIndex, setSelectedLetterIndex] = useState(null);

  const submit = (event) => {
    event?.preventDefault?.();
    const term = clean(query);
    if (term.length < 2) {
      setNotice("כתבו לפחות שתי אותיות.");
      return;
    }
    setNotice("");
    setLensResult(null);
    setSelectedLetterIndex(null);
    setClassicOpen(false);
    // The canonical engine already accepts ?q=term and performs the governed search.
    // Changing the seed remounts only that same iframe/engine instance; React never calculates ELS.
    setEngineSeed(term);
  };

  const openTanakh = () => {
    setNotice("חיפוש בכל התנ״ך נשאר כרגע בכלי הקלאסי המלא עד שהשליטה הזו תעבור parity מלא ל־2029.");
    setClassicOpen(true);
  };

  const handleEngineState = (next) => {
    const previous = engineStateRef.current;
    if (previous?.axis?.hitId !== next?.axis?.hitId || next?.status !== "ok") {
      setLensResult(null);
      setSelectedLetterIndex(null);
    }
    engineStateRef.current = next;
    setEngineState(next);
  };

  const requestControl = (action) => {
    if (!action) return;
    if (action === "occurrence-prev" || action === "occurrence-next") {
      setLensResult(null);
      setSelectedLetterIndex(null);
    }
    setControlRequest({ action, seq: ++controlSeqRef.current });
  };

  const requestLens = (lens, target = {}) => {
    const seq = ++lensSeqRef.current;
    setLensResult(null);
    setLensRequest({ lens, target: { ...target, nativeSeq: seq } });
  };

  const handleLetterClick = ({ index }) => {
    setSelectedLetterIndex(index);
    requestLens("letter-context", { i: index });
  };

  const requestAxisVerse = () => {
    if (!engineState?.axis?.hitId) return;
    setSelectedLetterIndex(null);
    requestLens("verse-context", { hitId: engineState.axis.hitId });
  };

  return <section className="els29-native-classic" data-els-native-classic="v2">
    <form className="els29-native-query" onSubmit={submit} aria-label="חיפוש ELS">
      <label>
        <span>מונח</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          maxLength={40}
          placeholder="למשל: משיח"
          autoComplete="off"
        />
      </label>
      <div className="els29-native-scope" aria-label="היקף החיפוש">
        <button type="button" className="is-active" aria-pressed="true">תורה</button>
        <button type="button" aria-pressed="false" onClick={openTanakh}>כל התנ״ך</button>
      </div>
      <button className="els29-native-search" type="submit">חפש</button>
      <button className="els29-native-more" type="button" onClick={() => setClassicOpen((value) => !value)}>
        {classicOpen ? "חזור לתצוגת 2029" : "כל הכלים"}
      </button>
    </form>

    {notice ? <div className="els29-native-notice" role="status">{notice}</div> : null}

    <div className={`els29-native-layout${classicOpen ? " is-classic-open" : ""}`}>
      {!classicOpen ? <>
        <main className="els29-native-stage">
          <div className="els29-native-stage-head">
            <div>
              <small>{engineState?.status === "ok" ? "מטריצה פעילה" : "ELS 2029"}</small>
              <h3>{engineState?.termRaw || engineState?.term || "הצופן הקלאסי"}</h3>
            </div>
            <div className="els29-native-stage-status">
              <span>{scopeLabel(engineState?.scope)}</span>
              {engineState?.axis?.skip != null ? <span>דילוג {engineState.axis.skip}</span> : null}
              {engineState?.occurrence?.count ? <span>מופע {(engineState.occurrence.index || 0) + 1}/{engineState.occurrence.count}</span> : null}
            </div>
          </div>
          <MatrixControls state={engineState} onControl={requestControl} />
          <MatrixSnapshot state={engineState} onLetterClick={handleLetterClick} selectedLetterIndex={selectedLetterIndex} />
        </main>
        <FindingsRail
          state={engineState}
          lensResult={lensResult}
          onAxisVerse={requestAxisVerse}
          onOpenClassic={() => setClassicOpen(true)}
        />
      </> : null}

      <div className={classicOpen ? "els29-classic-fallback is-open" : "els29-classic-fallback"}>
        <TzofenEmbed
          seed={engineSeed || undefined}
          full={classicOpen}
          hiddenBridge
          engineOnly={!classicOpen}
          onState={handleEngineState}
          onGate={() => setClassicOpen(true)}
          lensRequest={lensRequest}
          onLens={setLensResult}
          controlRequest={controlRequest}
        />
      </div>
    </div>
  </section>;
}
