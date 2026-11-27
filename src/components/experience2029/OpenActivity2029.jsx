import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import CanonicalProgress from "../CanonicalProgress.jsx";
import { OPEN_ACTIVITY_WINDOWS, readOpenActivity, openActivityModel } from "../../lib/researchOpenActivity2029.js";

// "פעילות מצטברת" on /stats (ZURIEL 27.11.2026): what was opened, even once, for each public family. Activity is not popularity and is not machines.
// Settled days only (the server never shows today), so nothing here dates a single open. No identities, no private searches.
const STEP = 24;
const nf = n => Number(n).toLocaleString("he-IL");

function Family({ f }) {
  const [shown, setShown] = useState(STEP);
  const seen = f.seen.slice(0, shown);
  return <section className="stats29-open-family" aria-label={f.name}>
    <h3>{f.name} <b>{nf(f.items)}</b> <small>{nf(f.opens)} פתיחות</small></h3>
    {f.popular.length ? <>
      <p className="stats29-note">פופולריים: נפתחו 10 פעמים לפחות מ־5 ביקורים לפחות</p>
      <ol className="stats29-chips stats29-open-chips">{f.popular.map(x => <li key={x.href}><Link to={x.href}><b>{x.text}</b><small>{nf(x.opens)}</small></Link></li>)}</ol>
    </> : null}
    {f.seen.length ? <>
      <p className="stats29-note">נפתחו, גם פעם אחת</p>
      <ul className="stats29-chips stats29-open-chips">{seen.map(x => <li key={x.href}><Link to={x.href}><b>{x.text}</b>{x.opens > 1 ? <small>{nf(x.opens)}</small> : null}</Link></li>)}</ul>
      {f.seen.length > shown ? <button type="button" className="stats29-more" onClick={() => setShown(s => s + STEP)}>פתח עוד ({nf(f.seen.length - shown)})</button> : null}
    </> : null}
    {f.hidden > 0 ? <p className="stats29-note">ועוד {nf(f.hidden)} פריטים שנפתחו ואינם ברשימה (הרשימה מוגבלת).</p> : null}
  </section>;
}

export default function OpenActivity2029() {
  const [win, setWin] = useState("week");
  const [state, setState] = useState({ loading: true });
  useEffect(() => {
    let live = true;
    setState({ loading: true });
    readOpenActivity(win).then(d => live && setState(d ? { model: openActivityModel(d), state: d.state } : { unavailable: true }), () => live && setState({ unavailable: true })); // null = the reader is not applied yet
    return () => { live = false; };
  }, [win]);
  // Reader not applied yet, or failed: the section is not drawn at all (no zero, no empty frame).
  if (state.unavailable) return null;
  const m = state.model;
  return <section className="stats29-block" aria-labelledby="stats29-open" data-stats-open-activity="true">
    <h2 id="stats29-open">פעילות מצטברת · מה נפתח באתר</h2>
    <p className="stats29-note">כל פריט ציבורי שנפתח מופיע כאן, גם אם נפתח פעם אחת. פעילות אינה פופולריות: הדירוג מוצג רק לפריטים שעברו 10 פתיחות מ־5 ביקורים. ימים שהושלמו בלבד, בלי זהויות ובלי חיפושים פרטיים.</p>
    <div className="stats29-window" role="group" aria-label="טווח הפעילות">
      {OPEN_ACTIVITY_WINDOWS.map(([key, , short]) => <button key={key} type="button" aria-pressed={win === key} onClick={() => setWin(key)}>{short}</button>)}
    </div>
    {state.loading ? <CanonicalProgress compact title="טוען פעילות מצטברת" phase="קורא את הימים שהושלמו" /> : null}
    {!state.loading && state.state === "insufficient" ? <p className="stats29-note" role="status">בטווח הזה עוד אין מספיק פעילות כדי להציג רשימות בלי לחשוף יחידים. אפשר לבחור טווח רחב יותר.</p> : null}
    {m ? <>
      {m.families.map(f => <Family key={m.window + f.key} f={f} />)}
      <p className="stats29-note">
        {m.unknownOpens > 0 ? <>לא סווגו כאנושיים: {nf(m.unknownOpens)} פתיחות (מוצגות כסכום בלבד). </> : null}
        {m.machinesServed > 0 ? <>מכונות, לא אנשים: {nf(m.machinesServed)} דפים הוגשו לסורקים באותו טווח, ואינם נכללים למעלה. </> : null}
        {m.unmeasured.includes("topic_card") ? <>כרטיסי נושא עדיין אינם נמדדים לפי פריט.</> : null}
      </p>
    </> : null}
  </section>;
}
