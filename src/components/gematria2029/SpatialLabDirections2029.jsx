import React, { useState } from "react";
import { Link } from "react-router-dom";
import { STRUCTURE_PART_LABEL } from "../../lib/spatialRenderModel.js";
import { buildRevealSteps } from "../../lib/spatial/labRows.js";
import { LAB_PRIMARY_ACTIONS, ROYAL_LAB_DIRECTIONS, ROYAL_LAB_DIRECTION_ORDER } from "../../lib/spatial/royalLabDirections.js";
import { razielSampleQuestions } from "../../lib/spatial/spatialLabRaziel.js";
import NavigationIcon2029 from "../experience2029/NavigationIcon2029.jsx";

// DOM chrome of the Royal V2 lab directions. NO three/WebGL import; every control is a real <button> (keyboard + screen reader).
// All three directions render the SAME rows (lib/spatial/labRows.js) over the SAME scene: they differ in what is shown first and how much,
// never in what is true. Hebrew words use the UI face; only the numbers/equations carry the numeric face (Design V2).
const PART_ORDER = ["cube", "outer", "inner", "triangles", "relation"];
const Num = ({ children }) => <bdi dir="ltr" className="sod29-lab-num">{children}</bdi>;

export function DirectionSwitcher({ direction, onChange }) {
  return <div className="sod29-lab-directions" role="group" aria-label="כיווני עיצוב לניסוי (תצוגה בלבד)" data-lab-directions="true">
    <span className="sod29-lab-directions__label">כיוון עיצוב</span>
    {ROYAL_LAB_DIRECTION_ORDER.map((id) => {
      const item = ROYAL_LAB_DIRECTIONS[id];
      return <button key={id} type="button" className="r29-chip" aria-pressed={direction === id} data-lab-direction={id} title={item.brief} onClick={() => onChange(id)}>
        <b>{item.letter}</b> {item.label}
      </button>;
    })}
  </div>;
}

// The three primary actions (and nothing else) before the scene. "עוד כלים" opens the secondary control.
export function LabPrimaryBar({ sceneView, onSceneView, explode, onExplode, canStructure, children }) {
  const [explore, expl, paths] = LAB_PRIMARY_ACTIONS;
  return <div className="sod29-lab-primary" role="toolbar" aria-label="בקרות המעבדה התלת־ממדית" data-lab-primary="true">
    {canStructure ? <button type="button" className="r29-chip" aria-pressed={sceneView === "structure"} data-lab-action="scene-structure" onClick={() => onSceneView("structure")}>{explore.label}</button> : null}
    {canStructure ? <button type="button" className="r29-chip" aria-pressed={explode} data-lab-action="explode" onClick={() => onExplode(!explode)}>{explode ? expl.labelOn : expl.label}</button> : null}
    <button type="button" className="r29-chip" aria-pressed={sceneView === "paths"} data-lab-action="scene-paths" onClick={() => onSceneView("paths")}>{paths.label}</button>
    {children}
  </div>;
}

export function LabMoreMenu({ view, onView, spin, onSpin, reduced, layers, onLayer, parts, onReset, sceneView }) {
  return <details className="sod29-lab-more" data-lab-more="true">
    <summary>עוד כלים</summary>
    <div className="sod29-lab-more__body">
      {sceneView === "structure" ? <div className="sod29-lab-more__row" role="group" aria-label="מבט">
        <button type="button" className="r29-chip" aria-pressed={view === "overview"} data-lab-action="view-overview" onClick={() => onView("overview")}>מבט כללי</button>
        <button type="button" className="r29-chip" aria-pressed={view === "focus"} data-lab-action="view-focus" onClick={() => onView("focus")}>מבט ממוקד</button>
        {reduced ? null : <button type="button" className="r29-chip" aria-pressed={spin} data-lab-action="spin" onClick={() => onSpin(!spin)}>סיבוב איטי</button>}
      </div> : null}
      {sceneView === "structure" ? <div className="sod29-lab-more__row" role="group" aria-label="שכבות המבנה">
        {PART_ORDER.filter((part) => parts.includes(part)).map((part) => <button key={part} type="button" className="r29-chip" aria-pressed={layers[part] !== false} data-lab-layer={part}
          onClick={() => onLayer(part)}>{STRUCTURE_PART_LABEL[part]}</button>)}
      </div> : null}
      <div className="sod29-lab-more__row"><button type="button" className="r29-btn is-quiet" data-lab-action="reset" onClick={onReset}>איפוס הסצנה</button></div>
    </div>
  </details>;
}

// Which facts come from where, per path — quantity (the model's declared property), phrase (the canonical engine), document (card-level only).
export function PathSourceBlock({ row }) {
  const { quantity, phrase, document } = row.source;
  return <dl className="sod29-lab-source" data-lab-source={row.part}>
    <div><dt>ערך הביטוי</dt><dd>{phrase ? (phrase.verified ? <>אומת במנוע הקנוני <small>(gematria_method_trace)</small></> : "לא אומת במנוע — לא נספר") : "אין ביטוי מאומת למספר הזה"}</dd></div>
    <div><dt>הכמות <Num>{quantity.value}</Num></dt><dd>{quantity.state === "declared" ? <>{quantity.origin} <small>(<Num>{quantity.key}</Num>)</small></> : quantity.state === "ambiguous" ? "המודל מכיל כמה מאפיינים באותו ערך — לא משויך" : "המקור לא צוין במודל"}</dd></div>
    <div><dt>המקור הכתוב</dt><dd>
      {document.locators.length ? document.locators.map((item, i) => <React.Fragment key={item.ref}>{i ? " · " : ""}<Link to={item.href}>{item.exact ? `הופעה ${i + 1}` : `הופעה ${i + 1} (היסטורית)`}</Link></React.Fragment>) : "אין מקור כתוב מקושר"}
      <small className="sod29-lab-source__scope"> {document.note}</small>
    </dd></div>
  </dl>;
}

function PartFacts({ row }) {
  const info = row.info;
  if (!info) return null;
  return <>
    <dl className="sod29-lab-facts">{info.facts.map((fact) => <div key={fact.key}><dt>{fact.key}</dt><dd><Num>{fact.value}</Num> <small>({fact.origin})</small></dd></div>)}</dl>
    {info.note ? <p className="sod29-lab-note">{info.note}</p> : null}
  </>;
}

function RazielBlock({ row, value, onAskRaziel }) {
  const [copied, setCopied] = useState(null);
  if (!onAskRaziel) return null;
  const questions = razielSampleQuestions({ operand: row.operand, quantity: row.quantity }, value);
  const copy = async (text, i) => { try { await navigator.clipboard.writeText(text); setCopied(i); setTimeout(() => setCopied(null), 1600); } catch { setCopied(null); } };
  return <div className="sod29-lab-raziel">
    <button type="button" className="r29-btn is-primary" data-lab-action="raziel" onClick={onAskRaziel}><NavigationIcon2029 name="spark" /> שאל את רזיאל על המסלול</button>
    <details>
      <summary>שאלות לדוגמה</summary>
      <ul>{questions.map((q, i) => <li key={q}><span>{q}</span> <button type="button" className="r29-btn is-quiet" onClick={() => copy(q, i)}>{copied === i ? "הועתק" : "העתקה"}</button></li>)}</ul>
      <small>רזיאל מקבל את המסלול שנבחר. את השאלה מקלידים בשיחה; ההעתקה רק חוסכת הקלדה.</small>
    </details>
  </div>;
}

function PathMedals({ rows, index, onPick, hint }) {
  return <div className="sod29-lab-medals" role="group" aria-label="בחירת מסלול" data-lab-medals="true">
    {rows.map((row) => <button key={row.id} type="button" className="sod29-lab-medal" data-path-index={row.index} data-status={row.status} aria-pressed={row.index === index}
      aria-label={`${STRUCTURE_PART_LABEL[row.part]}: ${row.phrase || "ללא ביטוי"}, ${row.operand} כפול ${row.quantity}. ${row.statusLabel}`} onClick={() => onPick(row.index)}>
      <span className="sod29-lab-medal__qty">× <Num>{row.quantity}</Num></span>
      <span className="sod29-lab-medal__part">{STRUCTURE_PART_LABEL[row.part]}</span>
    </button>)}
    {hint ? <p className="sod29-lab-hint">{hint}</p> : null}
  </div>;
}

const EQUATION = (row) => <Num>{row.operand} × {row.quantity} = {row.result}</Num>;

// ---------------------------------------------------------------- A · Royal Museum
export function MuseumPanel({ rows, index, onPick, value, onAskRaziel }) {
  const row = rows[index];
  if (!row) return null;
  return <section className="sod29-museum" data-direction-panel="museum" aria-live="polite">
    <PathMedals rows={rows} index={index} onPick={onPick} />
    <figure className="sod29-museum__cartouche" data-status={row.status}>
      <figcaption>{STRUCTURE_PART_LABEL[row.part]}</figcaption>
      <p className="sod29-museum__phrase">{row.phrase || "ללא ביטוי מאומת"}</p>
      <p className="sod29-museum__equation">{EQUATION(row)}</p>
      <p className="sod29-museum__status">{row.verified ? "אומת במנוע · נספר" : `${row.statusLabel} · לא נספר`}</p>
    </figure>
    <details className="sod29-lab-more sod29-museum__details">
      <summary>מקור ופירוט</summary>
      <PartFacts row={row} />
      <PathSourceBlock row={row} />
      <RazielBlock row={row} value={value} onAskRaziel={onAskRaziel} />
    </details>
  </section>;
}

// ---------------------------------------------------------------- B · Royal Discovery
export function DiscoveryPanel({ rows, index, discover, onDiscover, onPick, value, onAskRaziel, ledger }) {
  const row = rows[index];
  const steps = buildRevealSteps(row);
  const started = discover >= 0;
  const shown = started ? steps.slice(0, discover + 1) : [];
  const done = started && discover >= steps.length - 1;
  return <section className="sod29-discovery" data-direction-panel="discovery" data-discover-step={discover} aria-live="polite">
    <PathMedals rows={rows} index={started ? index : -1} onPick={onPick} hint={started ? null : "בחרו צורה במבנה התלת־ממדי (או מדליון) כדי להתחיל את הגילוי."} />
    {started && row ? <>
      <header className="sod29-discovery__head">
        <b>{STRUCTURE_PART_LABEL[row.part]}</b>
        <span className="sod29-discovery__dots" aria-label={`שלב ${discover + 1} מתוך ${steps.length}`}>{steps.map((s, i) => <i key={s.id} data-on={i <= discover ? "true" : "false"} />)}</span>
      </header>
      <ol className="sod29-discovery__steps">
        {shown.map((step, i) => <li key={step.id} data-kind={step.kind} data-latest={i === shown.length - 1 ? "true" : "false"}>
          <small>{i + 1} · {step.title}</small>
          <strong>{step.kind === "text" || step.kind === "missing" ? step.text : <Num>{step.kind === "quantity" ? `× ${step.text}` : step.text}</Num>}</strong>
          {step.note ? <em>{step.note}</em> : null}
        </li>)}
      </ol>
      {done ? <p className="sod29-discovery__final">{EQUATION(row)} <span>{row.verified ? "· אומת ונספר" : "· לא אומת, לא נספר"}</span></p> : null}
      <div className="sod29-discovery__actions">
        {!done ? <button type="button" className="r29-btn is-primary" data-discover-action="next" onClick={() => onDiscover(discover + 1)}>{`הבא: ${steps[discover + 1]?.title}`}</button> : null}
        {!done ? <button type="button" className="r29-btn is-quiet" data-discover-action="all" onClick={() => onDiscover(steps.length - 1)}>הצג הכול</button> : null}
        <button type="button" className="r29-btn is-quiet" data-discover-action="restart" onClick={() => onDiscover(-1)}>חזרה להתחלה</button>
      </div>
      {done ? <details className="sod29-lab-more"><summary>מקור ופירוט</summary><PartFacts row={row} /><PathSourceBlock row={row} />{ledger}<RazielBlock row={row} value={value} onAskRaziel={onAskRaziel} /></details> : null}
    </> : null}
  </section>;
}

// ---------------------------------------------------------------- C · Royal Spatial Lab
const TABS = [{ id: "calc", label: "חישוב" }, { id: "source", label: "מקור" }, { id: "data", label: "נתונים" }];

export function ResearchPanel({ rows, index, onPick, value, onAskRaziel, ledger }) {
  const [tab, setTab] = useState("calc");
  const row = rows[index];
  if (!row) return null;
  return <section className="sod29-research" data-direction-panel="lab" aria-live="polite">
    <div className="sod29-research__tabs" role="tablist" aria-label="לוח המחקר">
      {TABS.map((item) => <button key={item.id} type="button" role="tab" id={`lab-tab-${item.id}`} aria-selected={tab === item.id} aria-controls="lab-tabpanel" className="r29-chip" data-lab-tab={item.id} onClick={() => setTab(item.id)}>{item.label}</button>)}
    </div>
    <div id="lab-tabpanel" role="tabpanel" aria-labelledby={`lab-tab-${tab}`} className="sod29-research__panel">
      {tab === "calc" ? <>
        <div className="sod29-research__scroll"><table className="sod29-research__table">
          <caption>המסלולים ל־<Num>{value}</Num></caption>
          <thead><tr><th scope="col">חלק</th><th scope="col">ביטוי</th><th scope="col">ערך (מנוע)</th><th scope="col">כמות</th><th scope="col">תוצאה</th><th scope="col">מצב</th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r.id} data-status={r.status} data-selected={r.index === index ? "true" : "false"}>
            <th scope="row"><button type="button" className="sod29-research__pick" data-path-index={r.index} aria-pressed={r.index === index} onClick={() => onPick(r.index)}>{STRUCTURE_PART_LABEL[r.part]}</button></th>
            <td data-label="ביטוי">{r.phrase || "—"}</td><td data-label="ערך (מנוע)"><Num>{r.operand}</Num></td><td data-label="כמות"><Num>{r.quantity}</Num></td><td data-label="תוצאה"><Num>{r.result}</Num></td><td data-label="מצב">{r.verified ? "אומת · נספר" : `${r.statusLabel} · לא נספר`}</td>
          </tr>)}</tbody>
        </table></div>
        <p className="sod29-research__eq">{EQUATION(row)}</p>
        {ledger}
      </> : null}
      {tab === "source" ? <PathSourceBlock row={row} /> : null}
      {tab === "data" ? <PartFacts row={row} /> : null}
    </div>
    <RazielBlock row={row} value={value} onAskRaziel={onAskRaziel} />
  </section>;
}
