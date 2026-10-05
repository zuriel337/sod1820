import React, { useMemo, useState } from "react";
import TzofenEmbed from "../TzofenEmbed.jsx";
import "./elsNativeClassic2029.css";

const clean = (value) => String(value ?? "").trim();
const scopeLabel = (scope) => scope === "tanakh" ? "כל התנ״ך" : "תורה";
const directionLabel = (direction) => direction === "back" ? "אחורה" : direction === "fwd" ? "קדימה" : "—";

function MatrixSnapshot({ state }) {
  const matrix = state?.matrix;
  const geometry = state?.geometry;
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

  if (!matrix?.rows?.length || !geometry) {
    return <div className="els29-native-empty">
      <div className="els29-native-empty-orb">✦</div>
      <strong>חפשו מילה קצרה כדי לפתוח את המטריצה</strong>
      <span>החיפוש רץ באותו מנוע ELS קנוני. כאן מוצגת רק הקרנה חדשה של אותה תוצאה.</span>
    </div>;
  }

  const summaryId = "els29-native-matrix-summary";
  return <div
    className="els29-native-matrix-scroll"
    role="region"
    tabIndex={0}
    aria-label={`מטריצת ELS עבור ${state.termRaw || state.term || "המונח הפעיל"}`}
    aria-describedby={summaryId}
  >
    <span id={summaryId} className="els29-native-sr-only">
      {state.termRaw || state.term || "מונח פעיל"} · דילוג {state?.axis?.skip ?? "לא ידוע"} · כיוון {directionLabel(state?.axis?.direction)} · {markSummary.axis} אותיות ציר מסומנות · {markSummary.findings} אותיות ממצאים מסומנות.
    </span>
    <div className="els29-native-matrix" aria-hidden="true" style={{ "--els29-cols": matrix.cw || geometry.cw || 1 }}>
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
            ].filter(Boolean).join(" ");
            return <span
              key={index}
              className={classes}
              data-els-index={index}
              style={mark?.type === "finding" && mark?.color ? { "--els29-mark": mark.color } : undefined}
            >{letter === " " ? "\u00a0" : letter}</span>;
          })}
        </div>;
      })}
    </div>
  </div>;
}

function FindingsRail({ state, onOpenClassic }) {
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
      <p className="els29-native-muted">הצלבות, עדשות, שמירה, תמונה, שיתוף, סרט, ניקוד וכל כלי שעוד לא הועבר ל־2029 נשאר זמין באותו כלי קלאסי.</p>
      <button className="sod29-action" type="button" onClick={onOpenClassic}>פתח את כל הכלים הקלאסיים</button>
    </div>
  </aside>;
}

export default function ElsNativeClassic2029({ initialSeed = "" }) {
  const [query, setQuery] = useState(clean(initialSeed));
  const [engineSeed, setEngineSeed] = useState(clean(initialSeed));
  const [engineState, setEngineState] = useState(null);
  const [classicOpen, setClassicOpen] = useState(false);
  const [notice, setNotice] = useState("");

  const submit = (event) => {
    event?.preventDefault?.();
    const term = clean(query);
    if (term.length < 2) {
      setNotice("כתבו לפחות שתי אותיות.");
      return;
    }
    setNotice("");
    setClassicOpen(false);
    // The canonical engine already accepts ?q=term and performs the governed search.
    // Changing the seed remounts only that same iframe/engine instance; React never calculates ELS.
    setEngineSeed(term);
  };

  const openTanakh = () => {
    setNotice("חיפוש בכל התנ״ך נשאר כרגע בכלי הקלאסי המלא עד שהשליטה הזו תעבור parity מלא ל־2029.");
    setClassicOpen(true);
  };

  return <section className="els29-native-classic" data-els-native-classic="v1">
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
          <MatrixSnapshot state={engineState} />
        </main>
        <FindingsRail state={engineState} onOpenClassic={() => setClassicOpen(true)} />
      </> : null}

      <div className={classicOpen ? "els29-classic-fallback is-open" : "els29-classic-fallback"}>
        <TzofenEmbed
          seed={engineSeed || undefined}
          full={classicOpen}
          hiddenBridge
          engineOnly={!classicOpen}
          onState={setEngineState}
          onGate={() => setClassicOpen(true)}
        />
      </div>
    </div>
  </section>;
}
