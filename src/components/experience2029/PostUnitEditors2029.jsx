// Small edit button on each unit, for an authorized admin only (ZURIEL 12.11.2026, decision 9).
// Actions: centring, peak moment, a palette accent from the canonical palette, live preview, save, back to automatic.
// A manual choice outranks the automatic suggestion. There is NO authorized persistence path for this preference today (no column,
// no table; a new one needs ZURIEL's decision), so "שמירה" keeps it in THIS browser only and says so. Nothing here edits the Post.
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { applyUnitChoice, readLocalUnitChoices, writeLocalUnitChoice, UNIT_ACCENTS } from "../../lib/research/postSemanticDesign2029.js";

const ACCENT_LABELS = { auto: "אוטומטי", royal: "מלכותי", sapphire: "ספיר", gold: "זהב", calm: "רגוע" };

function UnitEditor({ unit, postId }) {
  const unitId = unit.getAttribute("data-sod-unit");
  const saved = readLocalUnitChoices(postId)[unitId] || {};
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ align: saved.align || "auto", peak: saved.peak || "auto", accent: saved.accent || "auto" });
  const [note, setNote] = useState("");
  const buttonRef = useRef(null);
  useEffect(() => { applyUnitChoice(unit, draft); }, [unit, draft]);
  const close = () => { setOpen(false); const s = readLocalUnitChoices(postId)[unitId] || {}; setDraft({ align: s.align || "auto", peak: s.peak || "auto", accent: s.accent || "auto" }); buttonRef.current?.focus(); };
  const set = (name) => (event) => { setNote(""); setDraft((d) => ({ ...d, [name]: event.target.value })); };
  const radios = (name, options) => options.map(([value, label]) => <label key={value}>
    <input type="radio" name={`${unitId}-${name}`} value={value} checked={draft[name] === value} onChange={set(name)} />{label}</label>);
  return <>
    <button ref={buttonRef} type="button" className="sod29-unit-tools-btn" aria-label="עריכת יחידה" aria-expanded={open} onClick={() => setOpen((v) => !v)}><span aria-hidden="true">✎</span></button>
    {open ? <div className="sod29-unit-editor" role="dialog" aria-label="עריכת תצוגת היחידה" onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); close(); } }}>
      <fieldset><legend>מרכוז</legend>{radios("align", [["auto", "אוטומטי"], ["center", "מרכוז מלא"]])}</fieldset>
      <fieldset><legend>רגע שיא</legend>{radios("peak", [["auto", "אוטומטי"], ["on", "כן"], ["off", "לא"]])}</fieldset>
      <fieldset><legend>צבע מתוך הפלטה</legend>{radios("accent", UNIT_ACCENTS.map((key) => [key, ACCENT_LABELS[key]]))}</fieldset>
      <div className="sod29-unit-editor-row">
        <button type="button" className="is-primary" onClick={() => { writeLocalUnitChoice(postId, unitId, draft); setNote("נשמר בדפדפן הזה בלבד"); }}>שמירה</button>
        <button type="button" onClick={() => { const none = { align: "auto", peak: "auto", accent: "auto" }; setDraft(none); writeLocalUnitChoice(postId, unitId, none); setNote("חזר לאוטומטי"); }}>חזרה לאוטומטי</button>
        <button type="button" onClick={close}>סגירה</button>
      </div>
      <small role="status">{note || "תצוגה מקדימה חיה. ההעדפה נשמרת בדפדפן הזה בלבד — אין כרגע מסלול מורשה לשמירה משותפת."}</small>
    </div> : null}
  </>;
}

export default function PostUnitEditors2029({ rootRef, postId, htmlKey }) {
  const [hosts, setHosts] = useState([]);
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const found = [];
    for (const unit of root.querySelectorAll("[data-sod-unit]")) {
      let host = unit.querySelector(":scope > .sod29-unit-tools");
      if (!host) { host = document.createElement("span"); host.className = "sod29-unit-tools"; host.setAttribute("contenteditable", "false"); unit.prepend(host); }
      found.push({ unit, host });
      applyUnitChoice(unit, readLocalUnitChoices(postId)[unit.getAttribute("data-sod-unit")] || {});
    }
    setHosts(found);
    return () => { for (const { host } of found) host.remove(); setHosts([]); };
  }, [rootRef, postId, htmlKey]);
  return <>{hosts.map(({ unit, host }) => createPortal(<UnitEditor unit={unit} postId={postId} />, host, unit.getAttribute("data-sod-unit")))}</>;
}
