// src/components/gematria2029/CubeJourneyPanel2029.jsx — the DOM of the inner exploration of a cube (1020): breadcrumb, the six faces, and ONE contextual set of doorways.
// It is also the accessible alternative of the inside view: everything the 3D inside offers is here as buttons, links and text, so a person without WebGL (or with
// reduced motion / a low-GPU fallback) loses nothing. It draws no 3D, imports no three/R3F module, calculates nothing and stores nothing:
//  - verification: the already-evaluated path (the canonical engine's trace) and the existing ledger node the stage passes in;
//  - doorways: pointers built by lib/spatial/cubeJourney.js at existing owners (Number page, Zvi model 3060, the source-bound Sefer Yetzirah reader);
//  - a book doorway that is not open in this build is LINK-ONLY: it names the source (book, page, structure) and says why it does not open.
import React, { useState } from "react";
import { semanticSummary, pathEquationText } from "../../lib/spatial/pathSemantics.js";
import { SEFER_YETZIRAH_POINTERS, directionLabel } from "../../lib/spatial/cubeJourney.js";
import "./cubeJourney2029.css";

const GROUP_LABEL = Object.freeze({ engine: "אימות", number: "המספר", research: "המחקר של צבי", book: "הספר · מקור", continue: "המשך" });
const doorKey = (id) => `cube-door-${id}`;

function Source({ source }) {
  if (!source) return null;
  return <dl className="sod29-cube-journey__source" aria-label="זהות המקור">
    <div><dt>ספר</dt><dd>{source.title}</dd></div>
    <div><dt>עמוד</dt><dd>PDF {source.page}</dd></div>
    <div><dt>מבנה במקור</dt><dd><bdi dir="ltr">{source.structureId}</bdi></dd></div>
    {source.componentId ? <div><dt>רכיב נבחר</dt><dd><bdi dir="ltr">{source.componentId.split(":component:")[1]}</bdi></dd></div> : null}
    <div><dt>הפניית מקור</dt><dd><bdi dir="ltr">{source.ref}</bdi></dd></div>
  </dl>;
}

function DirectionPicker({ dir, onDir, doorId }) {
  return <div className="sod29-cube-journey__directions" role="group" aria-label="בחירת כיוון בספר (בחירה של החוקר, לא הצמדה לפאה)">
    {SEFER_YETZIRAH_POINTERS.directions.map((item) => <button type="button" key={item.key} className="r29-chip" aria-pressed={dir === item.key} data-journey-direction={item.key}
      onClick={() => onDir(item.key, doorId)}>{item.label}</button>)}
  </div>;
}

function Door({ door, open, onToggle, onLeave, dir, onDir, ledger, calc }) {
  const id = doorKey(door.id);
  const locked = door.state === "locked";
  const isPanel = door.kind === "panel";
  const body = (
    <>
      {door.hint ? <small>{door.hint}</small> : null}
      {door.id === "verify" ? <small className="sod29-cube-journey__status" data-verified={String(door.verification.verified)}>{door.verification.verified ? `אומת במנוע: ${door.verification.word} = ${door.verification.value} (${door.verification.method})` : door.state === "pending" ? "בודק מול המנוע…" : "אימות המנוע אינו זמין — אינו נספר"}</small> : null}
    </>
  );
  return <li id={id} tabIndex={-1} data-door={door.id} data-state={door.state} className="sod29-cube-journey__door">
    {isPanel
      ? <button type="button" className="r29-btn" aria-expanded={open} aria-controls={`${id}-body`} onClick={() => onToggle(door.id)}><b>{door.label}</b>{body}</button>
      : locked
        ? <div className="sod29-cube-journey__locked" role="group" aria-label={`${door.label} — לא נפתח בגרסה זו`}><b>{door.label}</b>{body}<p role="note">{door.lockedReason}</p><Source source={door.source} /></div>
        : door.needsDirection && !door.href
          ? <div className="sod29-cube-journey__choose"><b>{door.label}</b>{body}<p className="sod29-cube-journey__note">בחרו כיוון בספר כדי לפתוח את המקור. הבחירה שלכם — אף כיוון אינו מוצמד לפאה.</p><DirectionPicker dir={dir} onDir={onDir} doorId={door.id} /></div>
          : <a className="r29-btn" href={door.href} data-journey-link={door.id} onClick={(event) => onLeave(door, event)}><b>{door.label}{door.needsDirection && dir ? ` · ${directionLabel(dir)}` : ""}</b>{body}</a>}
    {door.needsDirection && !locked && door.href ? <DirectionPicker dir={dir} onDir={onDir} doorId={door.id} /> : null}
    {door.projectionNote ? <p className="sod29-cube-journey__note" data-projection-note>{door.projectionNote}</p> : null}
    {!locked && door.source ? <Source source={door.source} /> : null}
    {isPanel && open ? <div id={`${id}-body`} className="sod29-cube-journey__panel" role="region" aria-label={door.label}>{door.id === "verify" ? ledger : calc}</div> : null}
  </li>;
}

export default function CubeJourneyPanel2029({ card, spec, path, journey, doorways, onFace, onExit, onDir, onLeave, ledger = null, reduced = false }) {
  const [open, setOpen] = useState(null);
  const faces = Array.from({ length: spec.faces }, (_, i) => i);
  const face = journey.face;
  const groups = [...new Set(doorways.map((d) => d.group))];
  const summary = path ? semanticSummary(path) : null;
  const calc = path ? <div className="sod29-cube-journey__calc">
    <strong dir="ltr"><bdi>{pathEquationText(path, { numeric: true })}</bdi></strong>
    <p>{summary?.supported ? summary.parts.map((p) => `${p.text}${p.value != null && p.role === "expression" ? ` = ${p.value}` : ""} (${p.roleLabel}: ${p.origin})`).join(" · ") : ""}</p>
    <p>המקור הכתוב של הכרטיס: {card.source?.contributor || "צבי"} · {(card.source?.refs || []).join(" · ") || "אין הפניה"} — תיעוד המודל, לא מזהה ערוץ ציבורי. החישוב מוצג כפי שמצוטט; הצורה היא המחשה שלו ואינה ראיה נוספת.</p>
  </div> : null;
  return <section id="cube-journey" className="r29 sod29-cube-journey" dir="rtl" data-cube-journey data-inside="true" data-face={face == null ? "" : String(face)} data-reduced={String(reduced)} aria-labelledby="cube-journey-title">
    <header>
      <nav aria-label="מקומכם בחקירה" className="sod29-cube-journey__crumbs">
        <ol>
          <li><button type="button" className="r29-chip" data-journey-crumb="cube" onClick={onExit}>קובייה {card.value}</button></li>
          <li aria-hidden="true">›</li>
          <li><span>בפנים</span></li>
          {face != null ? <><li aria-hidden="true">›</li><li aria-current="page"><b>פאה {face + 1} מתוך {spec.faces}</b></li></> : null}
        </ol>
      </nav>
      <button type="button" className="r29-btn" data-journey-exit onClick={onExit}>יציאה מהקובייה</button>
    </header>
    <h3 id="cube-journey-title">בתוך הקובייה · {card.title}</h3>
    <p className="sod29-cube-journey__lede">שש הפאות נושאות את אותו מונח: «{spec.word}»{spec.repetitions > 1 ? ` ${spec.repetitions} פעמים בכל פאה` : ""}. {spec.repetitions > 1 ? "החזרות הן חזרה של מונח אחד במודל — לא ממצאים נפרדים." : ""} בחרו פאה כדי לפתוח את הדלתות שלה.</p>
    <div className="sod29-cube-journey__faces" role="group" aria-label="בחירת פאה">
      {faces.map((i) => <button type="button" key={i} className="r29-chip" aria-pressed={face === i} data-journey-face={i} onClick={() => onFace(i)}><span>פאה {i + 1}</span><small>«{spec.word}»{spec.repetitions > 1 ? ` × ${spec.repetitions}` : ""}</small></button>)}
    </div>
    {face == null
      ? <p className="sod29-cube-journey__prompt" role="status">בחרו פאה — בתוך הסצנה או כאן — כדי לראות את הדלתות שלה.</p>
      : <article className="sod29-cube-journey__context" aria-labelledby="cube-journey-face-title">
        <h4 id="cube-journey-face-title">פאה {face + 1} מתוך {spec.faces} · «{spec.word}»{spec.repetitions > 1 ? ` × ${spec.repetitions}` : ""}</h4>
        {groups.map((group) => <section key={group} aria-label={GROUP_LABEL[group]} data-door-group={group}>
          <h5>{GROUP_LABEL[group]}</h5>
          <ul>{doorways.filter((d) => d.group === group).map((door) => <Door key={door.id} door={door} open={open === door.id} onToggle={(id) => setOpen((now) => (now === id ? null : id))} onLeave={onLeave} dir={journey.dir} onDir={onDir} ledger={ledger} calc={calc} />)}</ul>
        </section>)}
      </article>}
  </section>;
}
