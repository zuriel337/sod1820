import './siteActivity2029.css';
import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase.js';

const sections = {home:'בית',now:'עכשיו',world:'עולם',calculator:'מחשבון',calculator_advanced:'מחשבון מתקדם',els:'צופן תנ״כי',cipher:'דפי צופן',number:'מספרים',posts:'פוסטים',books:'ספרים',videos:'סרטונים',community:'קהילה',journey:'מסעות',heichal:'היכל',personal:'אזור אישי',raziel:'רזיאל'};
const number = n => n == null ? '—' : Number(n).toLocaleString('he-IL');
export default function SiteActivity2029({ data, principal }) {
  if (!data) return <section className="site-activity29"><h2>פעילות כל האתר</h2><p>הרחבת דוח הפעילות טרם זמינה במסד. אין להסיק שאין פעילות.</p></section>;
  const s=data.summary || {};
  return <section className="site-activity29" dir="rtl"><h2>פעילות כל האתר</h2>
    <p className="sod29-muted">מקור: events · שעות ישראל · חלון: {new Date(data.from).toLocaleString('he-IL',{timeZone:'Asia/Jerusalem'})} — {new Date(data.to).toLocaleString('he-IL',{timeZone:'Asia/Jerusalem'})}</p>
    <div className="sod29-grid">{[
      ['כניסות שנמדדו',s.entrances],['צפיות בדפים',s.views],['דפדפנים ייחודיים משוערים',s.browsers],
      ['חשבונות בחלון',s.accounts],['הרשמות שאומתו · בכל האתר',s.registered_accounts],['חשבונות פעילים ב־5 דקות',s.active_accounts_5m],
      ['דפדפנים שלא נצפו ב־30 הימים הקודמים',s.new_observed_browsers],
      ['דפדפנים חוזרים שנצפו',s.returning_observed_browsers],
      ['ביקור בדף יחיד ופחות מ־15 שניות מעורבות',s.single_page_unengaged_sessions],
    ].map(([label,value])=><div className="sod29-card" key={label}><small>{label}</small><h3>{number(value)}</h3></div>)}</div>
    <p>דפדפן אינו אדם; חשבון אינו הוכחת נוכחות ברגע זה. מדד הדף היחיד הוא סימן התנהגותי, לא הוכחת נטישה.</p>
    <details open><summary>איכות תנועה וכיסוי מדורים</summary>
      {data.traffic_classes?.map(x=><p key={x.traffic_class}>{({human:'אדם לפי המסווג הקנוני',bot:'בוט',unknown:'לא ידוע'})[x.traffic_class]}: {number(x.sessions)} ביקורים</p>)}
      <p>תנועת בוטים שנחסמה נמדדת בקצה; אפס כאן אינו אפס בוטים. אירועים בלי זהות: {number(s.unknown_identity_events)}.</p>
      {Object.entries(sections).map(([key,label])=>{const row=data.sections?.find(x=>x.section===key);return <div className="sod29-row" key={key}><strong>{label}</strong><span>{row ? number(row.views)+' צפיות בדף · '+number(row.domain_views)+' פתיחות כלי · '+number(row.actions)+' פעולות חדשות' : ['personal','raziel'].includes(key) ? 'פרטי / כיסוי מוגבל — ללא איסוף תוכן' : 'אין דגימה בחלון; לא הוכחת כיסוי מלא'}</span></div>;})}
    </details>
    <details><summary>מגמות יומיות · פעולות · שיטות</summary>
      {data.daily?.map(x=><p key={x.day}>{x.day} · {number(x.views)} צפיות · {number(x.computes)} חישובים · {number(x.searches)} חיפושים</p>)}
      {data.actions?.map(x=><p key={x.surface+'/'+x.event_type}><bdi>{x.surface} / {x.event_type}</bdi> · {number(x.events)}</p>)}
      {data.methods?.map(x=><p key={x.method}><bdi>{x.method}</bdi> · {number(x.selections)} בחירות</p>)}
      <p>הקלדה, חיפוש יזום וחישוב הם מדדים נפרדים. first_compute ההיסטורי אינו סך כל החישובים.</p>
    </details>
    <details><summary>מספרים, מילים ופרסומי מחקר</summary>
      <p>דפי מספר מובילים · כל מחלקות התנועה שנמדדו:</p>
      {data.top_numbers?.map(x=><p key={x.path}><a href={x.path}>{x.path.split('/').pop()}</a> · {number(x.views)} צפיות</p>)}
      <p>מילים מאושרות שנבחרו · אין כאן חיפושים פרטיים:</p>
      {data.top_phrases?.map(x=><p key={x.phrase}>{x.phrase} · {number(x.value)} · {number(x.selections)} בחירות</p>)}
      <p>{number(data.publications?.public_ciphers)} צפנים ציבוריים · {number(data.publications?.approved_convergences)} התכנסויות שאושרו לפרסום. מספר פרסומים אינו מספר מחקרים פעילים.</p>
    </details>
    <details><summary>טריות והיסטוריית החיפושים</summary>
      <p>אירוע אחרון: {data.latest_event || 'אין בחלון'} · search_log: {data.legacy_search_latest || 'לא ידוע'} · קיר: {data.legacy_wall_latest || 'לא ידוע'}</p>
      <p>היסטוריה נשמרת כפי שנאספה; בקיר היו גם הקלדות. לא משחזרים ממנה חיפושים אמינים. היסטוריית ההסכמה אינה מתועדת במקור הישן. מוצגות רק רשומות שסומנו במקור כמאושרות לעיון; שאר ההיסטוריה נשמרת ואינה מוצגת.</p>
      <SearchArchive principal={principal}/>
    </details>
  </section>;
}
function SearchArchive({ principal }) {
  const [page,setPage]=useState(null),[state,setState]=useState({});
  useEffect(()=>{
    if(page===null)return;
    let live=true;const controller=new AbortController();
    setState({loading:true});
    (async()=>{
      const auth=await supabase.auth.getSession();
      if(auth.data?.session?.user?.id!==principal)throw new Error('identity_changed');
      const {data,error}=await supabase.from('search_log').select('id,term,value,created_at').eq('admin_review_approved',true).order('id',{ascending:false}).range(page*50,page*50+49).abortSignal(controller.signal);
      if(error)throw error;
      if(live)setState({rows:data || []});
    })().catch(()=>{if(live)setState({error:true});});
    return()=>{live=false;controller.abort();};
  },[page,principal]);
  return <div>{page===null ? <button type="button" className="sod29-action" onClick={()=>setPage(0)}>פתיחת ארכיון מנהל מורשה</button> : <>
    {state.loading ? <p role="status">טוען חיפושים…</p> : state.error ? <p role="alert">הארכיון אינו זמין או שאין הרשאה.</p> : state.rows?.length===0 ? <p>אין רשומות מאושרות לעיון בטווח הזה.</p> : state.rows?.map(x=><p key={x.id}>{x.term} · {x.value} · {x.created_at}</p>)}
    <button type="button" disabled={!page || state.loading} onClick={()=>setPage(x=>x-1)}>הקודם</button>
    <button type="button" disabled={state.loading || state.rows?.length!==50} onClick={()=>setPage(x=>x+1)}>הבא</button>
  </>}</div>;
}
