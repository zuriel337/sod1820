import './siteActivity2029.css';
import React from 'react';
import { publicReadingCapability } from '../../lib/publicReadingRelease2029.js';

const sections = {home:'בית',now:'עכשיו',world:'עולם',calculator:'מחשבון',calculator_advanced:'מחשבון מתקדם',calculator_community:'מחשבון הקהילה',site_search:'חיפוש כללי',els:'צופן תנ״כי',cipher:'דפי צופן',number:'מספרים',posts:'פוסטים',books:'ספרים',videos:'סרטונים',community:'קהילה',journey:'מסעות',heichal:'היכל',personal:'אזור אישי',raziel:'רזיאל',other:'אחר · ללא שיוך מדור'};
// Launch state comes from the existing release owner (publicReadingRelease2029), not a new flag.
const JOURNEY_LAUNCHED = !publicReadingCapability('/journey');
const number = n => n == null ? '—' : Number(n).toLocaleString('he-IL');
export default function SiteActivity2029({ data, unavailable = false }) {
  const journey = !JOURNEY_LAUNCHED ? '0 · טרם הושק' : unavailable || data?.journey?.state !== 'measured' ? 'לא ידוע (UNKNOWN) · אין מדידה זמינה' : number(data.journey.starts) + ' התחלות מסע שנמדדו';
  if (!data) return <section className="site-activity29"><h2>פעילות כל האתר</h2><p>הרחבת דוח הפעילות טרם זמינה במסד. אין להסיק שאין פעילות.</p><p>מסעות: {journey}</p></section>;
  const s=data.summary || {};
  return <section className="site-activity29" dir="rtl"><h2>פעילות כל האתר</h2>
    <p className="sod29-muted">מקור: events · שעות ישראל · חלון: {new Date(data.from).toLocaleString('he-IL',{timeZone:'Asia/Jerusalem'})} — {new Date(data.to).toLocaleString('he-IL',{timeZone:'Asia/Jerusalem'})}</p>
    <div className="sod29-grid">{[
      ['כניסות שסווגו כאנושיות',s.entrances],['צפיות בדפים',s.views],['דפדפנים ייחודיים משוערים',s.browsers],
      ['חשבונות בחלון',s.accounts],['הרשמות שאומתו · בכל האתר',s.registered_accounts],['חשבונות פעילים ב־5 דקות',s.active_accounts_5m],
      ['דפדפנים שלא נצפו ב־30 הימים הקודמים',s.new_observed_browsers],
      ['דפדפנים חוזרים שנצפו',s.returning_observed_browsers],
      ['ביקור בדף יחיד ופחות מ־15 שניות מעורבות',s.single_page_unengaged_sessions],
    ].map(([label,value])=><div className="sod29-card" key={label}><small>{label}</small><h3>{number(value)}</h3></div>)}</div>
    <p>דפדפן אינו אדם; חשבון אינו הוכחת נוכחות ברגע זה. מדד הדף היחיד הוא סימן התנהגותי, לא הוכחת נטישה.</p>
    <details open><summary>איכות תנועה וכיסוי מדורים</summary>
      {data.traffic_classes?.map(x=><p key={x.traffic_class}>{({human:'אדם לפי המסווג הקנוני',bot:'בוט',unknown:'לא ידוע'})[x.traffic_class]}: {number(x.sessions)} ביקורים</p>)}
      <p>תנועת בוטים שנחסמה נמדדת בקצה; אפס כאן אינו אפס בוטים. אירועים בלי זהות: {number(s.unknown_identity_events)}.</p>
      {Object.entries(sections).map(([key,label])=>{const row=data.sections?.find(x=>x.section===key);return <div className="sod29-row" key={key}><strong>{label}</strong><span>{key==='journey' ? journey : row ? number(row.views)+' צפיות בדף · '+number(row.domain_views)+' פתיחות כלי · '+number(row.actions)+' פעולות חדשות' : ['personal','raziel'].includes(key) ? 'פרטי / כיסוי מוגבל — ללא איסוף תוכן' : 'אין דגימה בחלון; לא הוכחת כיסוי מלא'}</span></div>;})}
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
    <details><summary>טריות המדידה</summary>
      <p>אירוע אחרון ב־events: {data.latest_event || 'אין בחלון'}</p>
      <p>מקורות היסטוריים שנעצרו (אינם מדד חי ואינם נספרים כאן): search_log עד {data.legacy_search_latest || 'לא ידוע'} · קיר הגימטריה עד {data.legacy_wall_latest || 'לא ידוע'}. ההיסטוריה נשמרת פרטית בצד השרת לביקורת, ללא תצוגה וללא שחזור לחיפושים.</p>
    </details>
  </section>;
}
