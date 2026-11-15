import React, { useState } from "react";
import { Link } from "react-router-dom";
import { describeStructurePart, STRUCTURE_PART_LABEL } from "../../lib/spatialRenderModel.js";
import { razielSampleQuestions } from "../../lib/spatial/spatialLabRaziel.js";
import NavigationIcon2029 from "../experience2029/NavigationIcon2029.jsx";

// DOM controls and the selected-part panel of the S4 lab (3060). No three/WebGL import: these are plain buttons so every lab action works with a
// keyboard and a screen reader, and they reuse the stage's existing button styling (--sms-* tokens). State lives in the stage.
const PART_ORDER = ["cube", "outer", "inner", "triangles", "relation"];

export function LabControls({ sceneView, onSceneView, canStructure, view, onView, explode, onExplode, spin, onSpin, reduced, layers, onLayer, parts, onReset }) {
  return <div className="sod29-spatial-lab" data-lab-controls="true">
    <div className="sod29-spatial-lab__bar" role="toolbar" aria-label="בקרות המעבדה התלת־ממדית">
      {canStructure ? <>
        <button type="button" className="r29-chip" aria-pressed={sceneView === "structure"} data-lab-action="scene-structure" onClick={() => onSceneView("structure")}>מבנה</button>
        <button type="button" className="r29-chip" aria-pressed={sceneView === "paths"} data-lab-action="scene-paths" onClick={() => onSceneView("paths")}>מסלולים</button>
      </> : null}
      {sceneView === "structure" ? <>
        <button type="button" className="r29-chip" aria-pressed={view === "overview"} data-lab-action="view-overview" onClick={() => onView("overview")}>מבט כללי</button>
        <button type="button" className="r29-chip" aria-pressed={view === "focus"} data-lab-action="view-focus" onClick={() => onView("focus")}>מבט ממוקד</button>
        <button type="button" className="r29-chip" aria-pressed={explode} data-lab-action="explode" onClick={() => onExplode(!explode)}>{explode ? "הרכבת השכבות" : "פירוק שכבות"}</button>
        {reduced ? null : <button type="button" className="r29-chip" aria-pressed={spin} data-lab-action="spin" onClick={() => onSpin(!spin)}>סיבוב איטי</button>}
        <button type="button" className="r29-btn is-quiet" data-lab-action="reset" onClick={onReset}>איפוס הסצנה</button>
      </> : null}
    </div>
    {sceneView === "structure" ? <div className="sod29-spatial-lab__layers" role="group" aria-label="שכבות המבנה">
      {PART_ORDER.filter((part) => parts.includes(part)).map((part) => <button key={part} type="button" className="r29-chip" aria-pressed={layers[part] !== false} data-lab-layer={part}
        onClick={() => onLayer(part)}>{STRUCTURE_PART_LABEL[part]}</button>)}
    </div> : null}
  </div>;
}

export function LabPartInfo({ card, path, spec, onAskRaziel }) {
  const [copied, setCopied] = useState(null);
  if (!path) return null;
  const info = describeStructurePart(path, spec);
  const locators = (card?.source?.locators || []).slice(0, 4);
  const questions = razielSampleQuestions(path, card.value);
  const copy = async (text, i) => {
    try { await navigator.clipboard.writeText(text); setCopied(i); setTimeout(() => setCopied(null), 1600); }
    catch { setCopied(null); }
  };
  return <section className="sod29-spatial-lab__part" data-lab-part={info.part} aria-live="polite">
    <h4>{info.label} · {path.phrase || path.operand} × {path.quantity}</h4>
    <dl>
      {info.facts.map((fact) => <div key={fact.key}><dt>{fact.key}</dt><dd><bdi dir="ltr">{fact.value}</bdi> <small>({fact.origin})</small></dd></div>)}
    </dl>
    {info.note ? <p className="sod29-spatial-lab__note">{info.note}</p> : null}
    {locators.length ? <p className="sod29-spatial-lab__sources"><b>מקור:</b> {locators.map((item, i) => <React.Fragment key={item.ref}>{i ? " · " : " "}<Link to={item.href}>{item.exact ? `הופעה ${i + 1}` : `הופעה ${i + 1} (היסטורית)`}</Link></React.Fragment>)}</p> : null}
    {onAskRaziel ? <div className="sod29-spatial-lab__raziel">
      <button type="button" className="r29-btn is-primary" data-lab-action="raziel" onClick={onAskRaziel}><NavigationIcon2029 name="spark" /> שאל את רזיאל על המסלול</button>
      <details>
        <summary>שאלות לדוגמה</summary>
        <ul>{questions.map((q, i) => <li key={q}><span>{q}</span> <button type="button" onClick={() => copy(q, i)}>{copied === i ? "הועתק" : "העתקה"}</button></li>)}</ul>
        <small>רזיאל מקבל את המסלול שנבחר. את השאלה מקלידים בשיחה; ההעתקה רק חוסכת הקלדה.</small>
      </details>
    </div> : null}
  </section>;
}
