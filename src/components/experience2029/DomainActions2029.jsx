import React, { useEffect, useState } from "react";
import { DOMAIN_WINDOWS, readDomainActions, domainActionsModel } from "../../lib/domainActions2029.js";

// Administration centre (S3, 27.11.2026): what people DID in the product (the truth is in the domain tables) and how the load is spread.
// Four things stay apart: session, visitor, identified person, activity. A heavy visitor is information, never a bot and never a block.
const nf = n => n == null ? "—" : Number(n).toLocaleString("he-IL");

export default function DomainActions2029() {
  const [win, setWin] = useState("week");
  const [state, setState] = useState({ loading: true });
  useEffect(() => {
    let live = true;
    setState({ loading: true });
    readDomainActions(win).then(d => live && setState({ model: domainActionsModel(d) }), () => live && setState({ unavailable: true }));
    return () => { live = false; };
  }, [win]);
  if (state.unavailable || (!state.loading && !state.model)) return null; // not applied yet, or not an administrator: the block is not drawn
  const m = state.model;
  return <section className="site-activity29" aria-labelledby="domain-actions29" data-domain-actions="true">
    <h2 id="domain-actions29">פעולות מהותיות · מהטבלאות</h2>
    <p>כל פעולה נספרת מהטבלה שמחזיקה את האמת שלה, כסיכום בלבד: בלי זהות ובלי טקסט. ימים שהושלמו.</p>
    <div role="group" aria-label="טווח">{DOMAIN_WINDOWS.map(([key, label]) => <button key={key} type="button" aria-pressed={win === key} onClick={() => setWin(key)}>{label}</button>)}</div>
    {state.loading ? <p role="status">טוען…</p> : <>
      {m.rows.map(r => <p key={r.key}>{r.label}: <b>{nf(r.value)}</b></p>)}
      <h3>איך העומס מתפזר (ארבעה דברים נפרדים)</h3>
      <p>מבקרים (דפדפנים): <b>{nf(m.load.visitors)}</b> · סשנים: <b>{nf(m.load.sessions)}</b> · אנשים מזוהים: <b>{nf(m.load.identified)}</b> · צפיות: <b>{nf(m.load.views)}</b></p>
      <p>המבקר המוביל: {m.load.top1 == null ? "—" : m.load.top1 + "%"} מהצפיות · שלושת המובילים: {m.load.top3 == null ? "—" : m.load.top3 + "%"}. התפלגות לידיעה בלבד: אינה סיווג ואינה חשד.</p>
    </>}
  </section>;
}
