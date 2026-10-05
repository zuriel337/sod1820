import React, { useEffect, useRef, useState } from "react";
import { analyze } from "../../lib/aiAnalysis.js";
import { buildNumberAiFactPack } from "../../lib/research/numberAiFactPack2029.js";

// AI analysis capability inside the Raziel Number context — NOT a second persona.
// Zero provider calls on render; every call is an explicit click through the one canonical entry point
// (aiAnalysis.analyze → ai-analyze, kind=number). Quick = Claude fast=true (L2_FAST); Gemini = explicit compare
// over the SAME fact pack. Session memo is module-local (no new store); "another angle" reuses the `again` contract.
const sessionMemo = new Map();
const ENGINE_LABEL = Object.freeze({ claude: "Claude · מהיר", gemini: "Gemini · השוואה" });

export default function NumberAiAnalysis2029({ projection }) {
  const pack = buildNumberAiFactPack(projection);
  const packKey = pack ? pack.facts : "";
  const [results, setResults] = useState({});
  const [busy, setBusy] = useState(null);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    setResults({ claude: sessionMemo.get(`claude|${packKey}`) || null, gemini: sessionMemo.get(`gemini|${packKey}`) || null });
  }, [packKey]);
  if (!pack) return null;

  const run = async (engine, again = false) => {
    const memoKey = `${engine}|${packKey}`;
    if (!again && sessionMemo.has(memoKey)) { setResults((r) => ({ ...r, [engine]: sessionMemo.get(memoKey) })); return; }
    setBusy(engine);
    const out = await analyze({ subject: pack.subject, kind: "number", engine, fast: true, again, facts: pack.facts });
    if (out && typeof out === "string") sessionMemo.set(memoKey, out);
    if (alive.current) { setResults((r) => ({ ...r, [engine]: out || false })); setBusy(null); }
  };

  return <div className="sod29-number-ai-analysis" aria-label="ניתוח AI בהקשר רזיאל">
    <span>ניתוח AI · בהקשר רזיאל</span>
    <p>פרשנות מבוססת העובדות שמוצגות כאן — לא פרסונת רזיאל, ולא חישוב. נשלח רק בלחיצה.</p>
    <div className="sod29-number-core2029-raziel-actions">
      <button type="button" disabled={busy !== null} onClick={() => run("claude")}>{busy === "claude" ? "מנתח…" : "ניתוח מהיר"}</button>
      <button type="button" disabled={busy !== null} onClick={() => run("gemini")}>{busy === "gemini" ? "משווה…" : "השווה עם Gemini"}</button>
      {results.claude ? <button type="button" disabled={busy !== null} onClick={() => run("claude", true)}>זווית אחרת</button> : null}
    </div>
    {["claude", "gemini"].map((engine) => results[engine] === false
      ? <p key={engine} className="sod29-number-ai-analysis-miss">{ENGINE_LABEL[engine]}: אין תשובה כרגע.</p>
      : results[engine] ? <section key={engine}><small>{ENGINE_LABEL[engine]}</small><p>{results[engine]}</p></section> : null)}
  </div>;
}
