import './siteActivity2029.css';
import React from 'react';
import { publicReadingCapability } from '../../lib/publicReadingRelease2029.js';

const sections = {home:'בית',now:'עכשיו',world:'עולם',calculator:'מחשבון',calculator_advanced:'מחשבון מתקדם',calculator_community:'מחשבון הקהילה',site_search:'חיפוש כללי',els:'צופן תנ״כי',cipher:'דפי צופן',number:'מספרים',posts:'פוסטים',books:'ספרים',videos:'סרטונים',community:'קהילה',journey:'מסעות',heichal:'היכל',personal:'אזור אישי',raziel:'רזיאל',other:'אחר · ללא שיוך מדור'};
// Product state comes from the existing release owner (publicReadingRelease2029), not a new flag:
// a section the public build does not open is shown as its product state, never as "no visitors".
const PRODUCT_STATE = { journey: ['/journey', '0 · טרם הושק'], heichal: ['/heichal', 'סגור זמנית · בבנייה'], raziel: ['/raziel', 'סגור זמנית · בבנייה'], personal: ['/2029/me', 'בבדיקה · פתיחה מוגבלת; פתיחה בלבד נמדדת, ללא תוכן'] };
const closedState = key => PRODUCT_STATE[key] && publicReadingCapability(PRODUCT_STATE[key][0]) ? PRODUCT_STATE[key][1] : null;
const ACTIONS = { typing: 'הקלדות', search: 'חיפושים יזומים', cross_search: 'חיפושי הצלבה', compute: 'חישובים', select: 'בחירת תוצאה', save: 'שמירות', share: 'שיתופים', view: 'פתיחות כלי' };
const CLASSES = { human: 'אדם לפי המסווג הקנוני', bot: 'בוט', unknown: 'לא ידוע' };
const number = n => n == null ? '—' : Number(n).toLocaleString('he-IL');
// Change against the same-length previous window. No previous value -> no claim of change.
function delta(now, before) {
  if (now == null || before == null) return null;
  if (before === 0) return now === 0 ? '±0' : 'חדש';
  const pct = Math.round((now - before) / before * 100);
  return (pct > 0 ? '+' : '') + pct + '%';
}
const when = value => value ? new Date(value).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' }) : 'אין בחלון';

export default function SiteActivity2029({ data }) {
  if (!data) return <section className="site-activity29"><h2>פעילות כל האתר</h2><p>הרחבת דוח הפעילות טרם זמינה במסד. אין להסיק שאין פעילות.</p></section>;
  const s = data.summary || {}, p = data.previous || null;
  const daily = data.daily || [];
  const computes = daily.reduce((n, x) => n + (x.computes || 0), 0), searches = daily.reduce((n, x) => n + (x.searches || 0), 0);
  const shares = (data.shares || []).reduce((n, x) => n + (x.shares || 0), 0);
  const ranked = Object.keys(sections).map(key => ({ key, row: data.sections?.find(x => x.section === key) || null, closed: closedState(key) }))
    .sort((a, b) => (b.row?.views || 0) + (b.row?.domain_views || 0) + (b.row?.actions || 0) - ((a.row?.views || 0) + (a.row?.domain_views || 0) + (a.row?.actions || 0)));
  return <section className="site-activity29" dir="rtl"><h2>פעילות כל האתר</h2>
    <p className="sod29-muted">מקור: events (Traffic Intelligence) · שעות ישראל · חלון: {when(data.from)} — {when(data.to)}{p ? ' · השוואה לחלון באותו אורך שלפניו' : ''}</p>
    <div className="sod29-grid">{[
      ['כניסות שנמדדו', s.entrances, p?.entrances], ['צפיות בדפים', s.views, p?.views], ['דפדפנים ייחודיים משוערים', s.browsers, p?.browsers],
      ['חישובים', computes, p?.computes], ['חיפושים יזומים', searches, p?.searches], ['שיתופים', shares, p?.shares],
      ['חשבונות בחלון', s.accounts], ['דפדפנים אורחים', s.guest_browsers], ['הרשמות שאומתו · בכל האתר', s.registered_accounts],
      ['פעילים ב־5 דקות · דפדפנים', s.active_browsers_5m], ['פעילים ב־5 דקות · חשבונות', s.active_accounts_5m],
      ['דפדפנים חדשים (לא נצפו 30 יום)', s.new_observed_browsers], ['דפדפנים חוזרים', s.returning_observed_browsers],
      ['ביקור בדף יחיד ופחות מ־15 שניות', s.single_page_unengaged_sessions],
    ].map(([label, value, before]) => { const d = delta(value, before); return <div className="sod29-card" key={label}><small>{label}</small><h3>{number(value)}</h3>{d ? <small>{d} מול התקופה הקודמת ({number(before)})</small> : null}</div>; })}</div>
    <p>דפדפן אינו אדם; חשבון אינו הוכחת נוכחות ברגע זה. מדד הדף היחיד הוא סימן התנהגותי, לא הוכחת נטישה.</p>
    <details open><summary>איכות תנועה · מדורים לפי שימוש</summary>
      {data.traffic_classes?.map(x => <p key={x.traffic_class}>{CLASSES[x.traffic_class] || x.traffic_class}: {number(x.sessions)} ביקורים · {number(x.events)} אירועים</p>)}
      <p>תנועת בוטים שנחסמה נמדדת בקצה; אפס כאן אינו אפס בוטים. אירועים בלי זהות: {number(s.unknown_identity_events)}.</p>
      {ranked.map(({ key, row, closed }) => <div className="sod29-row" key={key}><strong>{sections[key]}</strong><span>{closed ? closed
        : row ? number(row.views) + ' צפיות בדף · ' + number(row.domain_views) + ' פתיחות כלי · ' + number(row.actions) + ' פעולות · אחרון ' + when(row.latest_event)
        : key === 'journey' ? 'אין נתונים (NO_DATA) · אינו אפס'
        : key === 'personal' ? 'פרטי — פתיחה בלבד, ללא איסוף תוכן; אין דגימה בחלון'
        : 'אין דגימה בחלון; לא הוכחת כיסוי מלא'}</span></div>)}
    </details>
    <details><summary>חיפושים וחישובים · לפי מחשבון, שעה ומקור</summary>
      {(data.activity_by_section || []).map(x => <p key={x.section + '/' + x.event_type}>{sections[x.section] || x.section} · {ACTIONS[x.event_type] || x.event_type}: {number(x.events)} ({number(x.sessions)} ביקורים)</p>)}
      <p>לפי שעה (שעון ישראל):</p>
      <div className="site-activity29-hours">{(data.hourly || []).map(x => <span key={x.hour}><b>{String(x.hour).padStart(2, '0')}</b> {number(x.views)} צפיות · {number(x.computes)} חישובים · {number(x.searches)} חיפושים</span>)}</div>
      <p>לפי מקור ההגעה של הביקור:</p>
      {(data.activity_by_source || []).map(x => <p key={x.source + '/' + x.event_type}><bdi>{x.source}</bdi> · {ACTIONS[x.event_type] || x.event_type}: {number(x.events)}</p>)}
      {(data.methods || []).map(x => <p key={x.method}>שיטה <bdi>{x.method}</bdi> · {number(x.selections)} בחירות</p>)}
      <p>הקלדה, חיפוש יזום וחישוב הם מדדים נפרדים. first_compute ההיסטורי אינו סך כל החישובים.</p>
    </details>
    <details><summary>מגמות יומיות · כל הפעולות · שיתופים</summary>
      {daily.map(x => <p key={x.day}>{x.day} · {number(x.views)} צפיות · {number(x.computes)} חישובים · {number(x.searches)} חיפושים</p>)}
      {(data.actions || []).map(x => <p key={x.surface + '/' + x.event_type}><bdi>{x.surface} / {x.event_type}</bdi> · {number(x.events)}</p>)}
      {(data.shares || []).map(x => <p key={x.platform}>שיתוף · <bdi>{x.platform}</bdi>: {number(x.shares)}</p>)}
    </details>
    <details><summary>מספרים, מילים ופרסומי מחקר</summary>
      <p>דפי מספר מובילים · כל מחלקות התנועה שנמדדו:</p>
      {data.top_numbers?.map(x => <p key={x.path}><a href={x.path}>{x.path.split('/').pop()}</a> · {number(x.views)} צפיות</p>)}
      <p>מילים מאושרות שנבחרו · אין כאן חיפושים פרטיים:</p>
      {data.top_phrases?.map(x => <p key={x.phrase}>{x.phrase} · {number(x.value)} · {number(x.selections)} בחירות</p>)}
      <p>{number(data.publications?.public_ciphers)} צפנים ציבוריים · {number(data.publications?.approved_convergences)} התכנסויות שאושרו לפרסום. מספר פרסומים אינו מספר מחקרים פעילים.</p>
    </details>
    <details><summary>טריות המדידה</summary>
      <p>אירוע אחרון ב־events: {when(data.latest_event)}</p>
      <p>מקורות היסטוריים שנעצרו (אינם מדד חי ואינם נספרים כאן): search_log עד {data.legacy_search_latest || 'לא ידוע'} · קיר הגימטריה עד {data.legacy_wall_latest || 'לא ידוע'}. ההיסטוריה נשמרת פרטית בצד השרת לביקורת, ללא תצוגה וללא שחזור לחיפושים.</p>
    </details>
  </section>;
}
