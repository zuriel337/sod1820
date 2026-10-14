import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { F } from '../../theme.js';
import { usePalette } from '../../lib/palette.js';
import WatchButton from '../WatchButton.jsx';
import { INTAKE_DESTINATIONS, intakeRoute, intakeFollowSubject, projectPrivateEmailThreads } from '../../lib/research/sourceIntake.js';
import { loadEmailIntake, saveEmailIntakeRoute, resolveIntakeFollow, getIntakeCapabilities } from '../../lib/research/sourceIntakeClient.js';

function RouteActions({ row, onSaved, P, canRoute }) {
  const route = intakeRoute(row);
  const [selected, setSelected] = useState(route.destinations);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [topic, setTopic] = useState(null);
  useEffect(() => { setSelected(intakeRoute(row).destinations); }, [row]);
  useEffect(() => {
    let alive = true; setTopic(null);
    resolveIntakeFollow(intakeFollowSubject(row)).then(t => { if (alive) setTopic(t); }).catch(() => {});
    return () => { alive = false; };
  }, [row]);
  async function save() {
    setBusy(true); setNotice('');
    try { await saveEmailIntakeRoute(row, selected); await onSaved(); setNotice('היעדים נשמרו. ההודעה עדיין במרכז הקבלה ולא פורסמה.'); }
    catch (e) { setNotice(e.code === 'P0001' ? 'ההודעה עודכנה במקביל. רענן לפני שמירה.' : 'לא נשמר: ' + (e.message || 'שגיאה')); }
    finally { setBusy(false); }
  }
  const control = { minHeight:44, display:'inline-flex', alignItems:'center', gap:6, padding:'0 10px', fontSize:14 };
  return <div style={{ padding:'8px 0', borderBottom:`1px solid ${P.border}` }}>
    <div style={{ display:'flex', alignItems:'center', flexWrap:'wrap', gap:4 }}>
      <span style={{ fontSize:14 }}>יעדים מתוכננים:</span>
      {INTAKE_DESTINATIONS.map(d => <label key={d.key} style={control}>
        <input type="checkbox" checked={selected.includes(d.key)} disabled={busy}
          onChange={e => setSelected(v => e.target.checked ? [...v,d.key] : v.filter(x=>x!==d.key))} />{d.label}
      </label>)}
      <button type="button" disabled={busy || !canRoute} onClick={save} style={{ ...control, cursor:'pointer', border:`1px solid ${P.borderStrong}`, background:P.cardSoft, color:P.accentText, borderRadius:6 }}>
        {busy ? 'שומר…' : 'שמור יעדים'}
      </button>
      {topic && <WatchButton topic={topic} compact noPush source="source-intake" label="עקוב אחר הכתב" explainer="מעקב אחר עדכוני הכתב דרך מנגנון המעקב הקיים" />}
    </div>
    <div role="status" style={{ fontSize:14, color:P.inkSoft }}>{notice || (canRoute ? 'בחירת יעד נשמרת כטיוטה. פרסום הוא פעולה נפרדת.' : 'אפשר לבדוק את בחירת היעדים. השמירה עדיין אינה זמינה.')}</div>
  </div>;
}

// Legacy presentation over the shared private source projection. Existing reply
// and read actions are supplied by AdminPage; this component never duplicates them.
export default function SourceIntakeInbox({ renderMessage }) {
  const P = usePalette();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [capabilities, setCapabilities] = useState({ routing:false });
  useEffect(() => { let alive=true; getIntakeCapabilities().then(c=>{ if(alive) setCapabilities(c); }); return ()=>{alive=false;}; }, []);
  const load = useCallback(async (more = false) => {
    setBusy(true); setError('');
    try {
      const page = await loadEmailIntake({ offset:more ? rows?.length || 0 : 0, limit:50 });
      setRows(previous => more ? [...new Map([...(previous || []),...page.rows].map(r=>[String(r.id),r])).values()] : page.rows);
      setHasMore(page.hasMore);
    } catch (e) { setError(e.message || 'לא ניתן לטעון את מרכז הקבלה'); }
    finally { setBusy(false); }
  }, [rows]);
  useEffect(() => { load(); }, []); // one inbox read per mount; refresh is explicit
  const threads = useMemo(() => projectPrivateEmailThreads(rows || []), [rows]);
  return <section dir="rtl" aria-label="מרכז קבלת מידע" style={{ color:P.ink, fontFamily:F.body, display:'grid', gap:8, marginBottom:20 }}>
    <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
      <h2 style={{ fontSize:20, margin:0 }}>מרכז קבלת מידע · מיילים</h2>
      <button type="button" onClick={()=>load()} disabled={busy} style={{ minHeight:44, padding:'0 12px', border:`1px solid ${P.borderStrong}`, color:P.accentText, background:P.cardSoft, borderRadius:6 }}>רענן</button>
    </div>
    <p style={{ fontSize:14, color:P.inkSoft, margin:0 }}>כאן מתקבל המקור ונבחרים היעדים שלו. הקבלה אינה פרסום.</p>
    {error && <div role="alert">{error}</div>}
    {busy && <div role="status">טוען…</div>}
    {rows && !rows.length && !error && <p>עדיין אין מיילים במרכז הקבלה.</p>}
    {threads.map(thread => <article key={thread.id} style={{ border:`1px solid ${P.border}`, borderRadius:8, background:P.card, padding:'0 12px' }}>
      <button type="button" aria-expanded={Boolean(expanded[thread.id])} aria-controls={`intake-${thread.root.id}`}
        onClick={()=>setExpanded(v=>({...v,[thread.id]:!v[thread.id]}))}
        style={{ width:'100%', minHeight:52, display:'flex', alignItems:'center', gap:8, textAlign:'start', border:0, background:'transparent', color:P.ink, cursor:'pointer', fontFamily:F.body, fontSize:16 }}>
        <span style={{ flex:1 }}>{thread.root.subject || 'ללא נושא'}</span>
        <span style={{ color:P.inkSoft, fontSize:14 }}>{thread.rows.length} הודעות{thread.unread ? ` · ${thread.unread} חדשות` : ''}</span>
        <span aria-hidden="true">{expanded[thread.id] ? '−' : '+'}</span>
      </button>
      {(thread.missingParent || thread.ambiguousParent || thread.cyclic) && <p style={{ fontSize:14, margin:'0 0 8px', color:P.inkSoft }}>
        {thread.cyclic ? 'קישור התשובות אינו תקין; ההודעה מוצגת בנפרד.' : thread.ambiguousParent ? 'יש כמה הודעות עם אותו מזהה; הקשר לא הוכרע.' : 'ההודעה המקורית לא נמצאת ברשימה שנטענה.'}
      </p>}
      {expanded[thread.id] && <div id={`intake-${thread.root.id}`}>
        {thread.rows.map((row,index) => <div key={row.id} style={{ borderInlineStart:`2px solid ${P.borderStrong}`, paddingInlineStart:10, marginBottom:10 }}>
          <div style={{ fontSize:14, padding:'6px 0', color:P.inkSoft }}>
            {index === 0 && !thread.missingParent && !thread.ambiguousParent && !thread.cyclic ? 'הודעה ראשית' : 'עדכון בשרשור'}
            {String(row.id) === thread.latestId && !row.read && <span role="status" aria-label="העדכון האחרון חדש" style={{ color:P.accentText, marginInlineStart:8 }}>● חדש</span>}
          </div>
          <RouteActions row={row} onSaved={()=>load()} P={P} canRoute={capabilities.routing} />
          {renderMessage(row,()=>load())}
        </div>)}
      </div>}
    </article>)}
    {hasMore && <button type="button" disabled={busy} onClick={()=>load(true)} style={{ minHeight:44, color:P.accentText, background:P.cardSoft, border:`1px solid ${P.border}` }}>טען הודעות נוספות</button>}
  </section>;
}
