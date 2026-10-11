import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { runLifeJourneyReflection } from '../lib/research/lifeJourneyReflection.js';
import { listLifeEventObservations, listLifeJourneyPaths, saveLifeEventObservation, researchLifeEventDate } from '../lib/research/lifeJourneyContinuity.js';
import { resolveLifePerson } from '../lib/research/lifeJourneyResearch.js';

function useLifeTask() {
  const state = useRef({ alive: true, epoch: 0, timer: null, controller: null });
  const cancel = () => { state.current.epoch++; clearTimeout(state.current.timer); state.current.controller?.abort(); };
  useEffect(() => { state.current.alive = true; return () => { state.current.alive = false; cancel(); }; }, []);
  return {
    cancel,
    start(onTimeout, timeout = 45000) {
      cancel(); const epoch = state.current.epoch; const controller = new AbortController(); state.current.controller = controller;
      const current = () => state.current.alive && epoch === state.current.epoch && !controller.signal.aborted;
      state.current.timer = setTimeout(() => { if (current()) { controller.abort(); onTimeout(); } }, timeout);
      return { signal: controller.signal, current, finish() { if (epoch === state.current.epoch) clearTimeout(state.current.timer); } };
    },
  };
}

export function LifeJourneyReflection({ ownerId, userId, members }) {
  const [consent, setConsent] = useState(false), [state, setState] = useState('idle'), [result, setResult] = useState(null);
  const task = useLifeTask();
  const self = resolveLifePerson(members, ownerId, `person:${ownerId}:self`);
  const signature = JSON.stringify(self);
  useEffect(() => { task.cancel(); setState('idle'); setResult(null); setConsent(false); }, [signature]); // input change revokes this run's consent
  async function run() {
    const call = task.start(() => setState('error'), 60000); setState('loading'); setResult(null);
    try {
      const out = await runLifeJourneyReflection({ client: supabase, userId, ownerId, personRef: self.ref, consent,
        signal: call.signal, isCurrent: call.current });
      if (!call.current()) return;
      setResult(out.payload?.messageReflection || null); setState(out.status === 'ok' ? 'ready' : out.reason === 'zero_findings' ? 'empty' : 'error');
    } catch { if (call.current()) setState('error'); }
    finally { call.finish(); }
  }
  return <section className="life-engine-result" aria-labelledby="life-reflection-title">
    <h3 id="life-reflection-title">מסר והשתקפות מהשם שלי</h3>
    <p>המנוע חוקר את השם הפרטי כמילה. ה־AI מציע קריאה בממצאים, ואחריה שלושה קלפים להשראה. זו פרשנות, לא אבחון או תחזית; הקלפים אינם משנים את הממצאים או את המסר.</p>
    <label className="life-checkbox"><input type="checkbox" checked={consent} disabled={!self || state === 'loading'} onChange={(e) => setConsent(e.target.checked)} /><span>אני מאשר לשלוח ל־AI את שמי הפרטי ואת ממצאי המנוע לצורך ההשתקפות הזאת.</span></label>
    <p className="life-note">שם משפחה, תאריך לידה, בני משפחה ואירועים אינם נשלחים. ההשתקפות נשארת במסך הזה ואינה נשמרת במסלול.</p>
    <div className="person-journey-actions"><button type="button" disabled={!self || !consent || state === 'loading'} onClick={run}>צור מסר והשתקפות</button>
      {state === 'loading' ? <button type="button" onClick={() => { task.cancel(); setState('idle'); setResult(null); }}>עצור השתקפות</button> : null}</div>
    {state === 'loading' ? <p role="status">בודק מקורות ומכין השתקפות…</p> : null}
    {state === 'error' ? <p role="alert">ההשתקפות לא הושלמה. ייתכן שהשירות או המכסה אינם זמינים כרגע. אפשר לנסות שוב.</p> : null}
    {state === 'empty' ? <p>לא התקבלו ממצאים מתאימים להמשך. לא הופעל ניתוח AI.</p> : null}
    {state === 'ready' && result ? <div className="life-reflection-result">
      <h4>המסר מהממצאים</h4><p className="life-preserve-lines">{result.message}</p>
      {result.motifs.length ? <details><summary>הרעיונות שעלו</summary>{result.motifs.map((m) => <div key={m.key}><h4>{m.label}</h4><p>{m.summary}</p></div>)}</details> : null}
      <div className="life-methods">{result.cards.map((card) => <article key={card.position}><h4>{card.position} · {card.arcana}</h4><p>{card.meaning || card.theme || 'השתקפות סמלית בלבד'}</p></article>)}</div>
      <details><summary>הבסיס והמגבלות</summary><p>המסר נוצר לפני בחירת הקלפים. חזרה על מילה או אות בין המסר לקלפים היא דמיון לשוני בלבד.</p><p>{result.trace.source_finding_ids.length} הפניות לממצאי המנוע שימשו בבניית הסינתזה.</p></details>
    </div> : null}
  </section>;
}

export function LifeJourneyPathHistory({ ownerId, members, onResume, busy, refreshKey }) {
  const [page, setPage] = useState({ items: [], next: null }), [state, setState] = useState('idle'); const task = useLifeTask();
  async function load(cursor = null) {
    const call = task.start(() => setState('error')); setState('loading');
    try { const next = await listLifeJourneyPaths(supabase, { ownerId, cursor, signal: call.signal });
      if (call.current()) { setPage((old) => ({ items: cursor ? [...old.items, ...next.items.filter(n => !old.items.some(o => o.path_id === n.path_id))] : next.items, next: next.next })); setState('ready'); }
    } catch { if (call.current()) setState('error'); } finally { call.finish(); }
  }
  useEffect(() => { void load(); }, [ownerId, refreshKey]);
  return <section className="life-engine-result" aria-labelledby="life-paths-title"><h3 id="life-paths-title">המסלולים השמורים שלי</h3>
    <p>בחירת מסלול תטען את האדם והמנועים שנבחרו ותחשב מחדש לפי הפרטים השמורים כעת.</p>
    {state === 'loading' ? <p role="status">טוען מסלולים…</p> : null}
    {state === 'error' ? <p role="alert">לא ניתן לטעון את רשימת המסלולים כרגע.</p> : null}
    {state === 'ready' && !page.items.length ? <p>עוד לא נשמרו מסלולי חיים. אפשר לשמור מסלול אחרי קבלת תוצאות.</p> : null}
    <ul className="life-saved-list">{page.items.map((item) => { const person = resolveLifePerson(members, ownerId, item.person_ref); return <li key={item.path_id}><span>{person?.name || 'אדם שאינו זמין כעת'} · <time dateTime={item.updated_at}>{new Date(item.updated_at).toLocaleDateString('he-IL')}</time></span><button type="button" disabled={busy || !person} onClick={() => onResume(item.path_id)}>פתח מסלול</button></li>; })}</ul>
    <div className="person-journey-actions"><button type="button" disabled={state === 'loading' || busy} onClick={() => load()}>רענן מסלולים</button>{page.next ? <button type="button" disabled={state === 'loading' || busy} onClick={() => load(page.next)}>עוד מסלולים</button> : null}</div>
  </section>;
}

export function LifeJourneyEvents({ ownerId, userId, members }) {
  const [page, setPage] = useState({ items: [], next: null }), [readState, setReadState] = useState('idle');
  const [draft, setDraft] = useState(null), [saving, setSaving] = useState(false), [notice, setNotice] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const reader = useLifeTask(), writer = useLifeTask(), researcher = useLifeTask();
  const selfRef = `person:${ownerId}:self`;
  const signature = JSON.stringify(members.map(m => [m.source_ref,m.name,m.meta]));
  useEffect(() => { researcher.cancel(); setAnalysis(null); }, [signature]);
  async function load(cursor = null) {
    researcher.cancel(); setAnalysis(null);
    const call = reader.start(() => setReadState('error')); setReadState('loading');
    try { const next = await listLifeEventObservations(supabase, { ownerId, cursor, signal: call.signal });
      if (call.current()) { setPage((old) => ({ items: cursor ? [...old.items, ...next.items.filter(n => !old.items.some(o => o.event_id === n.event_id))] : next.items, next: next.next })); setReadState('ready'); }
    } catch { if (call.current()) setReadState('error'); } finally { call.finish(); }
  }
  useEffect(() => { void load(); }, [ownerId]);
  function open(item = null) {
    setNotice('');
    setDraft({ ownerId, eventId: item?.event_id || crypto.randomUUID(), requestId: crypto.randomUUID(), expectedRevision: item?.revision || 0,
      title: item?.input.title || '', occurredOn: item?.input.occurred_on || '', personRef: item?.input.person_ref || selfRef, notes: item?.input.notes || '' });
  }
  function edit(key, value) { setDraft((old) => ({ ...old, [key]: value, requestId: crypto.randomUUID() })); }
  async function save() {
    const call = writer.start(() => { setSaving(false); setNotice('לא התקבלה תשובת שמירה. אפשר לנסות שוב עם אותם פרטים.'); });
    setSaving(true); setNotice('');
    try { const result = await saveLifeEventObservation(supabase, draft, call.signal); if (!call.current()) return;
      if (!result.ok) { setNotice('האירוע עודכן בינתיים. פתחו את הגרסה העדכנית מהרשימה לפני תיקון נוסף.'); await load(); return; }
      setDraft(null); setNotice('האירוע נשמר בפרטיות כדיווח שלך.'); researcher.cancel(); setAnalysis(null); await load();
    } catch { if (call.current()) setNotice('השמירה לא הושלמה. בדקו את הפרטים והחיבור ונסו שוב.'); }
    finally { call.finish(); if (call.current()) setSaving(false); }
  }
  async function analyze(item) {
    const call = researcher.start(() => setAnalysis({ state: 'error', id: item.event_id })); setAnalysis({ state: 'loading', id: item.event_id });
    try { const result = await researchLifeEventDate({ client: supabase, userId, ownerId, eventId: item.event_id,
      expectedRevision: item.revision, consent: true, signal: call.signal, isCurrent: call.current });
      if (call.current()) setAnalysis({ ...result, id: item.event_id });
    } catch { if (call.current()) setAnalysis({ state: 'error', id: item.event_id }); } finally { call.finish(); }
  }
  const ordered = [...page.items].sort((a,b) => (b.input.occurred_on || '').localeCompare(a.input.occurred_on || ''));
  return <section id="life-events" className="person-journey-panel" aria-labelledby="life-events-title">
    <div className="person-journey-section-head"><div><small>04</small><h2 id="life-events-title">אירועים במסע שלי</h2></div><span>דיווח אישי · פרטי</span></div>
    <p>אפשר לתעד אירוע ותאריך כפי שזכורים לך. הדיווח נשמר בנפרד מתוצאות המחקר; תאריך לא ידוע יכול להישאר ריק.</p>
    <div className="person-journey-actions"><button type="button" disabled={saving || !members.length} onClick={() => open()}>הוסף אירוע אישי</button><button type="button" disabled={saving || readState === 'loading'} onClick={() => load()}>רענן אירועים</button></div>
    {notice ? <p role="status">{notice}</p> : null}
    {draft ? <form className="life-event-form" onSubmit={(e) => { e.preventDefault(); void save(); }}>
      <fieldset disabled={saving}><legend>{draft.expectedRevision ? 'תיקון הדיווח — הגרסה הקודמת נשמרת' : 'אירוע חדש'}</legend>
        <div className="person-journey-fields"><label><span>כותרת האירוע</span><input required maxLength={160} value={draft.title} onChange={(e) => edit('title',e.target.value)} /></label>
          <label><span>תאריך האירוע (רשות)</span><input type="date" dir="ltr" value={draft.occurredOn} onChange={(e) => edit('occurredOn',e.target.value)} /></label>
          <label><span>האדם שאליו האירוע מתייחס</span><select aria-label="האדם שאליו האירוע מתייחס" value={draft.personRef} onChange={(e) => edit('personRef',e.target.value)}>{members.map(m => <option key={m.source_ref} value={m.source_ref}>{m.name}</option>)}</select></label></div>
        <label><span>מה חשוב לי לזכור (רשות)</span><textarea maxLength={2000} rows={3} value={draft.notes} onChange={(e) => edit('notes',e.target.value)} /></label>
        <div className="person-journey-actions"><button type="submit" disabled={!draft.title.trim() || !members.some(m => m.source_ref === draft.personRef)}>{saving ? 'שומר אירוע…' : 'שמור אירוע פרטי'}</button><button type="button" onClick={() => setDraft(null)}>ביטול אירוע</button></div>
      </fieldset>
    </form> : null}
    {readState === 'loading' ? <p role="status">טוען אירועים…</p> : null}
    {readState === 'error' ? <p role="alert">רשימת האירועים אינה זמינה כרגע. אפשר לנסות לרענן.</p> : null}
    {readState === 'ready' && !page.items.length ? <p>עדיין אין אירועים במסע שלך.</p> : null}
    <div className="life-events-list">{ordered.map(item => <article className="life-engine-result" key={item.event_id}>
      <h3>{item.input.title}</h3><p>{members.find(m => m.source_ref === item.input.person_ref)?.name || 'אדם שאינו זמין כעת'} · {item.input.occurred_on ? <time dateTime={item.input.occurred_on}>{item.input.occurred_on}</time> : 'תאריך לא ידוע'}</p>
      {item.dateRepresentation ? <p>{item.dateRepresentation.hebrew.pretty}</p> : null}
      {item.input.notes ? <p className="life-preserve-lines">{item.input.notes}</p> : null}
      <small>דיווח שלך · גרסה {item.revision} · נשמר {new Date(item.recorded_at).toLocaleDateString('he-IL')}</small>
      <div className="person-journey-actions"><button type="button" disabled={saving} onClick={() => open(item)}>תקן דיווח</button>
        <button type="button" disabled={!item.input.occurred_on || analysis?.state === 'loading'} onClick={() => analyze(item)}>בדוק את השם והתאריך הזה</button></div>
      <p className="life-note">בדיקה מפורשת במנוע המספרי. תוכן האירוע אינו נשלח ל־AI.</p>
      {analysis?.id === item.event_id && (analysis.state !== 'ready' || analysis.source.revision === item.revision) ? <div>
        {analysis.state === 'loading' ? <p role="status">בודק את התאריך… <button type="button" onClick={() => { researcher.cancel(); setAnalysis(null); }}>עצור בדיקת אירוע</button></p> : null}
        {analysis.state === 'error' ? <p role="alert">לא ניתן להשלים את הבדיקה. ייתכן שהפרטים השתנו; רעננו ונסו שוב.</p> : null}
        {analysis.state === 'unavailable' ? <p>נדרש תאריך מלא לבדיקה.</p> : null}
        {analysis.state === 'ready' ? <><p>נבדק התאריך המדווח מול השם השמור. התאמה מספרית אינה הסבר לאירוע.</p>
          {(analysis.bundle.findings || []).filter(f => f.kind === 'date_cross').map(f => <details key={f.id}><summary>ערך בחישוב: {f.subject.value}</summary><ul>{(f.verification.engine_result.from || []).map((source,i) => <li key={i}>{source}</li>)}</ul></details>)}
          {!(analysis.bundle.findings || []).some(f => f.kind === 'date_cross') ? <p>לא התקבלו ממצאים מספריים במסלול הזה.</p> : null}</> : null}
      </div> : null}
    </article>)}</div>
    {page.next ? <button type="button" disabled={readState === 'loading'} onClick={() => load(page.next)}>עוד אירועים</button> : null}
  </section>;
}
