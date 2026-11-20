import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase.js';
import './activityPulse2029.css';

const count = n => Number.isSafeInteger(n) && n >= 0 ? n.toLocaleString('he-IL') : '—';
const names = { compute: 'חישובים', search: 'חיפושים יזומים', cross_search: 'חיפושי צופן', save: 'שמירות', start: 'מסעות שהתחילו' };
export default function ActivityPulse2029({ reader = readPulse }) {
  const [hours, setHours] = useState(24);
  const [state, setState] = useState({ loading: true });
  useEffect(() => {
    let current = true;
    setState({ loading: true });
    reader(hours).then(data => current && setState({ data }), () => current && setState({ failed: true }));
    return () => { current = false; };
  }, [hours, reader]);
  const d = state.data;
  const hasCards = d && (d.numbers?.length || d.phrases?.length || d.activity?.length || d.trend?.length || d.publications?.public_ciphers || d.publications?.approved_convergences);
  return <section className="activity29" dir="rtl" aria-label="פעילות המחקר באתר">
    <div className="activity29-head"><strong>במוקד המחקר</strong><div role="group" aria-label="טווח הפעילות">
      {[[24,'יממה'],[168,'שבוע'],[720,'חודש']].map(([h,label]) => <button key={h} type="button" aria-pressed={h===hours} onClick={()=>setHours(h)}>{label}</button>)}
    </div></div>
    {state.loading ? <p role="status">בודק את פעילות המחקר…</p>
      : state.failed || !d || d.version!==1 || d.state==='refreshing' ? <p role="status">נתוני הפעילות אינם זמינים כרגע.</p>
      : <>
        {hasCards ? <div className="activity29-cards">
          {(d.numbers || []).slice(0,4).map(x => <a className="activity29-card" href={'/number/'+x.n} key={x.n}>
            <small>מספר במוקד</small><b>{count(x.n)}</b><span>{count(x.events)} פתיחות בטווח</span>
          </a>)}
          {(d.phrases || []).slice(0,2).map(x => <div className="activity29-card" key={x.phrase}>
            <small>ביטוי ציבורי מאושר</small><strong>{x.phrase}</strong><span>{count(x.events)} בחירות בטווח</span>
          </div>)}
          {(d.trend || []).slice(0,2).map(x=><div className="activity29-card" key={'trend/'+x.event_type}>
            <small>{names[x.event_type] || 'מחקר'} · שינוי</small><b>{Math.round((x.recent-x.earlier)/x.earlier*100)}%</b><span>מחצית אחרונה מול קודמת</span>
          </div>)}
          {d.publications?.public_ciphers > 0 && <a className="activity29-card" href="/codes"><small>צפנים ציבוריים</small><b>{count(d.publications.public_ciphers)}</b><span>פורסמו למחקר</span></a>}
          {d.publications?.approved_convergences > 0 && <a className="activity29-card" href="/world"><small>התכנסויות שאושרו</small><b>{count(d.publications.approved_convergences)}</b><span>לפי אישור העורך</span></a>}
          {(d.activity || []).slice(0,3).map(x => <div className="activity29-card" key={x.surface+'/'+x.event_type}>
            <small>{names[x.event_type] || 'פעולות מחקר'}</small><b>{count(x.events)}</b><span>בטווח שנבחר</span>
          </div>)}
        </div> : <p>עדיין אין מספיק פעילות מדודה להצגת מגמות בטווח הזה.</p>}
        <small className="activity29-note">{d.state==='stale' ? 'המדידה אינה עדכנית · ' : ''}
          נתונים מצרפיים בלבד · פעולות אינן מספר אנשים
          {d.computed_at && Number.isFinite(Date.parse(d.computed_at)) ? ' · עודכן '+new Date(d.computed_at).toLocaleString('he-IL',{timeZone:'Asia/Jerusalem'}) : ''}
        </small>
      </>}
  </section>;
}
async function readPulse(hours) {
  const { data, error } = await supabase.rpc('fn_ti_public_activity2029', { p_hours: hours });
  // PGRST202/404 before the approved SQL rollout is unavailable, never an old-wall fallback.
  if (error) throw error;
  return data;
}
