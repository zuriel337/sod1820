import React, { useEffect, useRef, useState } from "react";
import { getCloudNotes, saveCloudNotes } from "../../lib/auth.js";

// Existing user_notes capability in the adopted personal-area card/form kit.
// No global Legacy draft is silently assigned to an account, and no new store.
export default function PersonalNotes2029({ userId, disabled = false }) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ kind:"loading", text:"", saved:"" });
  const actor = useRef(userId), pending = useRef(false), saveAbort = useRef(null);
  actor.current = userId;
  useEffect(() => {
    const abort = new AbortController(), principal = userId;
    setState({kind:"loading",text:"",saved:""});
    getCloudNotes(principal, {strict:true,signal:abort.signal}).then(value => {
      if (!abort.signal.aborted && actor.current === principal) setState({kind:"ready",text:value || "",saved:value || ""});
    }).catch(() => { if (!abort.signal.aborted && actor.current === principal) setState({kind:"failed",text:"",saved:""}); });
    return () => { abort.abort();saveAbort.current?.abort(); };
  }, [userId,attempt]);
  useEffect(() => () => { actor.current = null; }, []);
  const dirty = state.text !== state.saved;
  useEffect(() => {
    if (!dirty) return;
    const warn = event => {event.preventDefault();event.returnValue="";};
    window.addEventListener("beforeunload",warn);return()=>window.removeEventListener("beforeunload",warn);
  }, [dirty]);
  async function save(event) {
    event.preventDefault();
    if (disabled || pending.current || ["loading","failed"].includes(state.kind)) return;
    const principal = userId, text = state.text;
    pending.current = true;saveAbort.current = new AbortController();
    setState(s=>({...s,kind:"saving"}));
    try {
      await saveCloudNotes(principal,text,{strict:true,signal:saveAbort.current.signal});
      if (actor.current === principal) setState(s=>({...s,saved:text,kind:"saved"}));
    } catch { if (actor.current === principal) setState(s=>({...s,kind:"save_failed"})); }
    finally { pending.current=false; }
  }
  return <section className="wp-card" aria-labelledby="personal-notes-title" data-personal-notes="true" aria-busy={state.kind === "loading" || state.kind === "saving"}>
    <h2 id="personal-notes-title" className="wp-h">הפנקס הפרטי שלי</h2>
    <p className="wp-muted">אותו פנקס מהחשבון הקיים. התוכן פרטי ונשמר רק בלחיצה על שמירה.</p>
    {state.kind === "loading" ? <p role="status">קורא את הפנקס מהחשבון…</p> : state.kind === "failed" ? <div role="alert"><p>לא ניתן לקרוא כרגע את הפנקס. תוכן קיים לא הוחלף בפנקס ריק.</p><button className="wp-btn" type="button" onClick={()=>setAttempt(x=>x+1)}>ניסיון קריאה נוסף</button></div> : <form onSubmit={save}>
      <label className="wp-muted" htmlFor="personal-notes-content">ההערות שלי</label>
      <textarea id="personal-notes-content" className="wp-input" rows={12} dir="auto" maxLength={30000} disabled={disabled||state.kind === "saving"} value={state.text} onChange={e=>setState(s=>({...s,text:e.target.value,kind:"ready"}))}/>
      <div className="wp-actions"><button className="wp-btn wp-primary" type="submit" disabled={disabled||pending.current||!dirty}>שמירת הפנקס</button></div>
      <p role={state.kind === "save_failed" ? "alert" : "status"}>{state.kind === "saved" ? "הפנקס נשמר בחשבון ✓" : state.kind === "saving" ? "ממתין לאישור שמירה מהשרת…" : state.kind === "save_failed" ? "לא התקבל אישור שמירה. הטקסט נשאר כאן לניסיון נוסף." : dirty ? "יש שינויים שטרם נשמרו." : "הפנקס מעודכן לפי הקריאה האחרונה."}</p>
    </form>}
  </section>;
}
