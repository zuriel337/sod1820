// Unit editor of the flagship series "מפת המציאות" (ZURIEL 12.11.2026). A small ✎ on each unit, for an authorized admin only.
//   עיצוב     centring, peak moment, a palette colour — live preview, back to automatic (kept from V1).
//   מסר       a free MESSAGE, with "✓ זה המסר הראשי של העדכון": it becomes the central caption of the update in the Post and in "עכשיו".
//             Preview of both BEFORE saving. Raziel suggests (punctuation, line breaks, centring — never a changed word; spelling only on
//             an explicit request and one correction at a time); Zuriel chooses.
//   חיבורים   REAL results for a typed number/expression from the existing readers, with source and open target; the admin picks what to
//             highlight in the unit, what opens on a click and what stays on the Number page. Only canonical REFERENCES are kept.
// Saving: there is NO authorized persistence path for any of this today (no column, no table, no approved store), so "שמירה" keeps it in
// THIS browser only and says so. A main message is part of the one canonical unit record (never a second copy for "עכשיו").
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { use2029Shell } from "./Sod2029Shell.jsx";
import {
  applyUnitChoice, readLocalUnitChoices, writeLocalUnitChoice, subscribeUnitChoices, UNIT_ACCENTS,
} from "../../lib/research/postSemanticDesign2029.js";
import { suggestFormatting, detectNumbersAndExpressions, SPELLING_NEEDS_APPROVAL } from "../../lib/research/unitTextSuggestions2029.js";
import { findUnitConnections, CONNECTION_MODES } from "../../lib/research/unitConnections2029.js";
import { checkSourceHint, HINT_STATES } from "../../lib/research/postSourceHintCheck2029.js";
import { nowRowModel } from "../../lib/nowPublications2029.js";
import { SEMANTIC_LEGEND } from "../../lib/research/postSemanticDesign2029.js";

const ACCENT_LABELS = { auto: "אוטומטי", royal: "מלכותי", sapphire: "ספיר", gold: "זהב", calm: "רגוע" };
const symbolFor = (key) => SEMANTIC_LEGEND.find((item) => item.key === key)?.symbol || "";
const unitTitleOf = (unit) => (unit.querySelector("h1,h2,h3,h4")?.textContent || "").replace(/\s+/g, " ").trim().slice(0, 120);
const unitNumbersOf = (unit) => [...new Set([...unit.querySelectorAll("[data-gem]")].map((n) => n.getAttribute("data-gem")).filter((v) => /^\d+$/.test(v)))].slice(0, 12);

// ---- what the saved unit shows inside the Post: the main message and the chosen references --------------------------------
function UnitExtras({ unit, postId, shell }) {
  const unitId = unit.getAttribute("data-sod-unit");
  const [choice, setChoice] = useState(() => readLocalUnitChoices(postId)[unitId] || {});
  useEffect(() => subscribeUnitChoices((id) => { if (id === Number(postId)) setChoice(readLocalUnitChoices(postId)[unitId] || {}); }), [postId, unitId]);
  const refs = Array.isArray(choice.refs) ? choice.refs : [];
  const shown = refs.filter((r) => r.mode === "highlight"), onClick = refs.filter((r) => r.mode === "click");
  if (!(choice.primary && choice.message) && !shown.length && !onClick.length) return null;
  const open = (event, ref) => {
    if ((ref.kind === "number" || ref.kind === "tree") && shell?.openNumber) {
      const value = String(ref.ref).split(/[:>]/).pop();
      if (/^\d+$/.test(value)) { event.preventDefault(); shell.openNumber({ type: "number", id: value }); }
    }
  };
  const chip = (ref) => <a key={ref.ref} className="sod29-unit-ref" data-ref-kind={ref.kind} href={ref.href} onClick={(e) => open(e, ref)}>
    <small>{ref.kindLabel}</small> {ref.title}</a>;
  return <div className="sod29-unit-extras" data-unit-extras="true" contentEditable={false}>
    {choice.primary && choice.message ? <p className="sod29-unit-message" data-unit-message="primary"><i aria-hidden="true">{symbolFor("peak")}</i><span>{choice.message}</span></p> : null}
    {shown.length ? <p className="sod29-unit-refs">{shown.map(chip)}</p> : null}
    {onClick.length ? <details className="sod29-unit-refs-more"><summary>חיבורים ({onClick.length})</summary><p className="sod29-unit-refs">{onClick.map(chip)}</p></details> : null}
  </div>;
}

// ---- previews -------------------------------------------------------------------------------------------------------------
function PreviewPost({ message, title }) {
  return <div className="sod29-preview sod29-preview-post" data-preview="post" aria-label="תצוגה מקדימה בפוסט">
    <small>בפוסט · בראש היחידה</small>
    {message ? <p className="sod29-unit-message"><i aria-hidden="true">{symbolFor("peak")}</i><span>{message}</span></p> : <p className="sod29-preview-empty">אין מסר ראשי — היחידה מוצגת כמות שהיא</p>}
    <strong>{title}</strong>
  </div>;
}
function PreviewNow({ message, title, postId }) {
  const model = useMemo(() => nowRowModel({
    id: `preview:${postId}`, title, at: new Date().toISOString(), href: "#",
    item: { sourceKind: "post", label: title, summary: message || "", fullText: message || "", sourceUpdate: { label: title, targetId: "preview", sourceRef: `posts:${postId}` } },
  }), [message, title, postId]);
  return <div className="sod29-preview sod29-preview-now" data-preview="now" aria-label="תצוגה מקדימה ב״עכשיו״">
    <small>ב״עכשיו״</small>
    <strong>{model.title}</strong>
    {model.excerpt ? <span className="sod29-preview-excerpt">{model.excerpt}</span> : <span className="sod29-preview-empty">בלי מסר ראשי: הכיתוב הוא כותרת היחידה</span>}
    <small className="sod29-preview-meta"><span>{model.typeLabel}</span>{model.updated ? <span>עודכן</span> : null}</small>
  </div>;
}

// ---- tabs -----------------------------------------------------------------------------------------------------------------
function DesignTab({ draft, set }) {
  const radios = (name, options) => options.map(([value, label]) => <label key={value}><input type="radio" name={`d-${name}`} value={value} checked={(draft[name] || "auto") === value} onChange={() => set({ [name]: value })} />{label}</label>);
  return <>
    <fieldset><legend>מרכוז</legend>{radios("align", [["auto", "אוטומטי"], ["center", "מרכוז מלא"]])}</fieldset>
    <fieldset><legend>רגע שיא</legend>{radios("peak", [["auto", "אוטומטי"], ["on", "כן"], ["off", "לא"]])}</fieldset>
    <fieldset><legend>צבע מתוך הפלטה</legend>{radios("accent", UNIT_ACCENTS.map((key) => [key, ACCENT_LABELS[key]]))}</fieldset>
  </>;
}

function MessageTab({ draft, set, unitTitle, postId, shell, goConnections }) {
  const [formatting, setFormatting] = useState(null);
  const [detected, setDetected] = useState(null);
  const [engine, setEngine] = useState({});
  const message = draft.message || "";
  const detect = () => {
    const found = detectNumbersAndExpressions(message);
    setDetected(found);
    for (const claim of found.filter((f) => f.kind === "claim")) {
      const key = `${claim.phrase}|${claim.number}`;
      checkSourceHint({ expression: claim.phrase, stated: claim.number, methodText: claim.methodText }).then((result) => setEngine((e) => ({ ...e, [key]: result })));
    }
  };
  return <>
    <label className="sod29-unit-editor-field"><span>מסר חופשי</span>
      <textarea rows="3" maxLength="400" value={message} onChange={(e) => set({ message: e.target.value })} placeholder="כתוב כאן את הכיתוב של העדכון, בדיוק במילים שלך" />
    </label>
    <label><input type="checkbox" checked={draft.primary === true} onChange={(e) => set({ primary: e.target.checked })} disabled={!message.trim()} />
      <span>✓ זה המסר הראשי של העדכון</span></label>
    <p className="sod29-unit-editor-note">המסר הראשי הוא חלק מהיחידה הקנונית ומשמש ככיתוב המרכזי ב״עכשיו״ ובראש היחידה בפוסט. בחירתו אינה אישור פרסום ואינה עוקפת הרשאות.</p>
    <PreviewPost message={draft.primary ? message : ""} title={unitTitle} />
    <PreviewNow message={draft.primary ? message : ""} title={unitTitle} postId={postId} />
    <div className="sod29-unit-editor-row">
      <button type="button" onClick={() => setFormatting(suggestFormatting(message))} disabled={!message.trim()}>הצעת פיסוק ועימוד</button>
      <button type="button" onClick={detect} disabled={!message.trim()}>זיהוי מספרים וביטויים</button>
      <button type="button" onClick={() => shell?.openRaziel?.({ readingFocus: { postId: String(postId), id: unitTitle, label: unitTitle, primary: message.slice(0, 300) } })}
        disabled={!shell?.openRaziel || shell?.razielLocked} title={shell?.razielLocked ? "רזיאל זמין למנהל מחובר" : "פותח את רזיאל הקיים עם ההקשר של היחידה"}>שאל את רזיאל</button>
    </div>
    {shell?.razielLocked ? <p className="sod29-unit-editor-note">רזיאל זמין למנהל מחובר בלבד; כאן פועלות ההצעות הדטרמיניסטיות.</p> : null}
    {formatting ? <ul className="sod29-unit-suggestions" aria-label="הצעות עריכה">
      {formatting.filter((f) => f.kind !== "centering").length === 0 ? <li>אין מה להציע — הניסוח נקי.</li> : null}
      {formatting.map((f) => <li key={f.id}>
        <b>{f.label}</b>
        {f.kind === "centering" ? <span>המלצה: {f.centering === "center" ? "מרכוז" : "יישור לקצה הקריאה"} (לא משנה מילים)</span>
          : <span className="sod29-unit-diff"><s>{f.before}</s> → <ins>{f.after}</ins></span>}
        <em>המילים לא שונו</em>
        {f.kind === "centering" ? <button type="button" onClick={() => set({ align: f.centering === "center" ? "center" : "auto" })}>החל</button>
          : <button type="button" onClick={() => { set({ message: f.after }); setFormatting(null); }}>החל</button>}
      </li>)}
    </ul> : null}
    {detected ? <ul className="sod29-unit-suggestions" aria-label="מספרים וביטויים שזוהו">
      {detected.length === 0 ? <li>לא זוהו מספרים או ביטויים.</li> : null}
      {detected.map((d, i) => d.kind === "claim" ? <li key={i}>
        <b>{d.phrase} = {d.number}</b>{d.methodText ? <span>שיטה: {d.methodText}</span> : null}
        {(() => { const e = engine[`${d.phrase}|${d.number}`]; return <em>{e ? `${symbolFor(e.state)} ${SEMANTIC_LEGEND.find((x) => x.key === e.state)?.label}${e.state === HINT_STATES.mismatch ? ` (המנוע, שיטה ${e.method?.label || "רגילה"}: ${e.value}${e.otherMethods?.length ? `; יוצא בשיטות: ${e.otherMethods.join(", ")}` : ""})` : ""}` : `${symbolFor("unchecked")} נבדק…`}</em>; })()}
        <button type="button" onClick={() => goConnections(String(d.number))}>חפש חיבורים</button>
      </li> : <li key={i}><b>{d.value}</b><span>מספר שזוהה בטקסט</span><button type="button" onClick={() => goConnections(String(d.value))}>חפש חיבורים</button></li>)}
    </ul> : null}
    <p className="sod29-unit-editor-note">תיקוני כתיב: {SPELLING_NEEDS_APPROVAL.how}. הם אינם מוצעים אוטומטית.</p>
  </>;
}

function ConnectionsTab({ draft, set, postId, postHref, initialQuery, unitNumbers }) {
  const [query, setQuery] = useState(initialQuery || unitNumbers[0] || "");
  const [state, setState] = useState({ status: "idle", data: null });
  useEffect(() => { if (initialQuery) setQuery(initialQuery); }, [initialQuery]);
  const refs = draft.refs || [];
  const byKey = Object.fromEntries(refs.map((r) => [r.ref, r]));
  const search = async () => {
    setState({ status: "loading", data: null });
    const data = await findUnitConnections(query, { postId, postHref });
    setState({ status: "ready", data });
  };
  const toggle = (result, on) => set({ refs: on ? [...refs, { kind: result.kind, kindLabel: result.kindLabel, ref: result.ref, href: result.href, title: result.title, source: result.source, mode: "highlight" }] : refs.filter((r) => r.ref !== result.ref) });
  const mode = (ref, value) => set({ refs: refs.map((r) => r.ref === ref ? { ...r, mode: value } : r) });
  return <>
    <div className="sod29-unit-editor-row">
      <label className="sod29-unit-editor-field"><span>מספר או ביטוי</span><input type="text" inputMode="search" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); search(); } }} placeholder="למשל 1237" /></label>
      <button type="button" className="is-primary" onClick={search} disabled={!query.trim() || state.status === "loading"}>חפש</button>
    </div>
    {unitNumbers.length ? <p className="sod29-unit-editor-note">מספרים ביחידה: {unitNumbers.map((n) => <button key={n} type="button" className="sod29-unit-chip" onClick={() => { setQuery(n); }}>{n}</button>)}</p> : null}
    {state.status === "loading" ? <p role="status">מחפש במערכת…</p> : null}
    {state.data ? <>
      {state.data.errors.length ? <p className="sod29-unit-editor-note">חלק מהמקורות לא נקראו: {state.data.errors.join(", ")}.</p> : null}
      {state.data.results.length === 0 ? <p>לא נמצאו תוצאות.</p> : null}
      <ul className="sod29-unit-results" aria-label="תוצאות חיבור">
        {state.data.results.map((r) => <li key={r.key} data-result-kind={r.kind}>
          <label><input type="checkbox" checked={Boolean(byKey[r.ref])} onChange={(e) => toggle(r, e.target.checked)} /><span><small>{r.kindLabel}</small> <b>{r.title}</b></span></label>
          <span className="sod29-unit-result-meta">{r.source}{r.detail ? ` · ${r.detail}` : ""} · <a href={r.href}>יעד הפתיחה ←</a></span>
          {byKey[r.ref] ? <select aria-label="איך להציג" value={byKey[r.ref].mode} onChange={(e) => mode(r.ref, e.target.value)}>
            {Object.entries(CONNECTION_MODES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select> : null}
        </li>)}
      </ul>
    </> : null}
    {refs.length ? <p className="sod29-unit-editor-note" data-selected-refs={refs.length}>נבחרו {refs.length} הפניות קנוניות (לא תוכן מועתק).</p> : null}
  </>;
}

// ---- the dialog -----------------------------------------------------------------------------------------------------------
function UnitEditorDialog({ unit, postId, postHref, onClose, shell }) {
  const unitId = unit.getAttribute("data-sod-unit");
  const unitTitle = unitTitleOf(unit) || unitId;
  const unitNumbers = useMemo(() => unitNumbersOf(unit), [unit]);
  const saved = readLocalUnitChoices(postId)[unitId] || {};
  const [draft, setDraft] = useState(saved);
  const [tab, setTab] = useState("message");
  const [pendingQuery, setPendingQuery] = useState("");
  const [note, setNote] = useState("");
  const ref = useRef(null);
  const set = (patch) => { setNote(""); setDraft((d) => ({ ...d, ...patch })); };
  useEffect(() => { applyUnitChoice(unit, draft); }, [unit, draft]);
  useEffect(() => { ref.current?.querySelector("button,textarea,input")?.focus(); }, []);
  const revert = () => { applyUnitChoice(unit, saved); onClose(); };
  const goConnections = (q) => { setPendingQuery(q); setTab("connections"); };
  const tabs = [["message", "מסר"], ["connections", "חיבורים"], ["design", "עיצוב"]];
  return createPortal(<div className="sod29-unit-editor-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) revert(); }}>
    <div ref={ref} className="sod29-unit-editor" role="dialog" aria-modal="true" aria-label={`עריכת יחידה: ${unitTitle}`} data-unit-editor={unitId}
      onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); revert(); } }}>
      <header><strong>{unitTitle}</strong><small>{unitId}</small></header>
      <div role="tablist" aria-label="חלקי העורך" className="sod29-unit-editor-tabs">
        {tabs.map(([key, label]) => <button key={key} role="tab" type="button" aria-selected={tab === key} className={tab === key ? "is-on" : ""} onClick={() => setTab(key)}>{label}</button>)}
      </div>
      <div role="tabpanel" className="sod29-unit-editor-body">
        {tab === "message" ? <MessageTab draft={draft} set={set} unitTitle={unitTitle} postId={postId} shell={shell} goConnections={goConnections} /> : null}
        {tab === "connections" ? <ConnectionsTab draft={draft} set={set} postId={postId} postHref={postHref} initialQuery={pendingQuery} unitNumbers={unitNumbers} /> : null}
        {tab === "design" ? <DesignTab draft={draft} set={set} /> : null}
      </div>
      <div className="sod29-unit-editor-row">
        <button type="button" className="is-primary" onClick={() => { writeLocalUnitChoice(postId, unitId, draft); setNote("נשמר בדפדפן הזה בלבד"); }}>שמירה</button>
        <button type="button" onClick={() => { const none = {}; setDraft(none); writeLocalUnitChoice(postId, unitId, none); setNote("חזר לאוטומטי"); }}>חזרה לאוטומטי</button>
        <button type="button" onClick={revert}>סגירה</button>
      </div>
      <small role="status">{note || "תצוגה מקדימה חיה. ההעדפות, המסר וההפניות נשמרים בדפדפן הזה בלבד — אין כרגע מסלול קנוני מורשה לשמירה משותפת."}</small>
    </div>
  </div>, document.querySelector(".sod29-root") || document.body);
}

function UnitTools({ unit, postId, postHref, shell, editable }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef(null);
  if (!editable) return null;
  return <>
    <button ref={buttonRef} type="button" className="sod29-unit-tools-btn" aria-label="עריכת יחידה" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}><span aria-hidden="true">✎</span></button>
    {open ? <UnitEditorDialog unit={unit} postId={postId} postHref={postHref} shell={shell} onClose={() => { setOpen(false); setTimeout(() => buttonRef.current?.focus(), 0); }} /> : null}
  </>;
}

// editable = the admin editor; the extras (saved main message / references) show whenever the series experience is on.
export default function PostUnitEditors2029({ rootRef, postId, postHref = "", htmlKey, editable = true }) {
  const shell = use2029Shell();
  const [hosts, setHosts] = useState([]);
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const found = [];
    for (const unit of root.querySelectorAll("[data-sod-unit]")) {
      const make = (cls, where) => {
        let host = unit.querySelector(`:scope > .${cls}`);
        if (!host) { host = document.createElement("span"); host.className = cls; host.setAttribute("contenteditable", "false"); unit[where](host); }
        return host;
      };
      const tools = make("sod29-unit-tools", "prepend");
      const extras = make("sod29-unit-extras-host", "prepend");
      found.push({ unit, tools, extras });
      applyUnitChoice(unit, readLocalUnitChoices(postId)[unit.getAttribute("data-sod-unit")] || {});
    }
    setHosts(found);
    return () => { for (const { tools, extras } of found) { tools.remove(); extras.remove(); } setHosts([]); };
  }, [rootRef, postId, htmlKey]);
  return <>{hosts.map(({ unit, tools, extras }) => {
    const key = unit.getAttribute("data-sod-unit");
    return <React.Fragment key={key}>
      {createPortal(<UnitTools unit={unit} postId={postId} postHref={postHref} shell={shell} editable={editable} />, tools)}
      {createPortal(<UnitExtras unit={unit} postId={postId} shell={shell} />, extras)}
    </React.Fragment>;
  })}</>;
}
