import React, { useState } from 'react';
import { FrameState } from '../experience2029/Sod2029Shell.jsx';
import NavigationIcon2029 from '../experience2029/NavigationIcon2029.jsx';
import SourceRepeatInfo2029 from './SourceRepeatInfo2029.jsx';
import '../../pages/home-world-story2029.css';
import { recentSource, readSeen, markSeen } from '../../lib/homeMotion2029.js';
import { relativeTimeLabel } from '../../lib/relativeTime2029.js';

function date(value) {
  return relativeTimeLabel(value, 'לא צוין');
}

/** One consumer of the existing public arrivals, shared by Home and World. */
export default function SourceArrivalList2029({ items = [], loading, availability, onOpen, surface = 'world', limit = 6, showNew = false }) {
  const [filter, setFilter] = useState('all');
  const [seen, setSeen] = useState(readSeen);
  const see = (key) => setSeen((current) => (current[key] ? current : markSeen(key, current)));
  const sources = items.filter(item => item.kind === 'source' && (filter === 'all' || item.sourceKind === filter)).slice(0, limit);
  return <section className="sod29-source-arrivals" id={`${surface}-sources`} aria-label="מה מגיע מן המקורות">
    <header><div className="sod29-kicker">קולות מן המקור</div><h2>מה מגיע עכשיו</h2>
      <p>דברי הכותבים והפוסטים האחרונים פתוחים לקריאה, גם לפני שנוצר מהם חיבור במחקר.</p></header>
    <div className="sod29-actions" aria-label="סוג המקורות">{[['all', 'העדכונים האחרונים'], ['group_message', 'הודעות מקור'], ['post', 'פוסטים אחרונים']].map(([key, label]) =>
      <button key={key} className={`sod29-action${filter === key ? ' primary' : ''}`} aria-pressed={filter === key} onClick={() => setFilter(key)}>{label}</button>)}</div>
    {loading ? <FrameState kind="loading" title="פותח את המקורות האחרונים" /> : null}
    {!loading && !sources.length ? <p role="status">אין כרגע מקורות זמינים בזרם הזה.</p> : null}
    {sources.map(item => {
      const group = item.sourceKind === 'group_message';
      const newKey = `source:${item.id}`;
      const latestSourceAt = group ? item.arrivalAt : item.sourceUpdatedAt || item.sourcePublishedAt || item.at;
      const updatedPost = !group && item.sourceUpdatedAt && item.sourcePublishedAt
        && Date.parse(item.sourceUpdatedAt) > Date.parse(item.sourcePublishedAt);
      const isNew = showNew && recentSource(latestSourceAt) && !seen[newKey];
      const copy = <><span className="sod29-source-arrival-icon"><NavigationIcon2029 name="source" /></span><span className="sod29-source-arrival-copy">
        <span className="sod29-source-arrival-label">{isNew ? <><i className="sod29-source-arrival-dot" aria-hidden="true" /><span className="sod29-sr-only">חדש · </span></> : null}{group ? 'מהמקור · טרם נבדק' : 'פוסט מקור'}</span>
        <strong>{item.label}</strong><span>{item.creator || 'שם הכותב לא צוין'}</span>
        <small>{group ? 'נשמר במערכת' : updatedPost ? 'הפוסט עודכן' : 'פרסום המקור'} · {date(latestSourceAt)}</small>
      </span><span className="sod29-source-arrival-open" aria-hidden="true">{group ? '↓' : '←'}</span></>;
      return group ? <details key={item.id} id={surface === 'world' ? `group-source-${item.id.slice(6)}` : undefined}
        className="sod29-world-group-source sod29-source-arrival" data-source-arrival={item.sourceRef}>
        <summary onClick={() => { if (isNew) see(newKey); }}>{copy}</summary><div className="sod29-source-arrival-body"><p>{item.fullText}</p>
          <p className="sod29-source-arrival-label">מאת: {item.creator || 'שם הכותב לא צוין'}</p>
          <p className="sod29-source-arrival-label">מועד גילוי חיבור: לא תועד בנתונים הזמינים.</p>
          <SourceRepeatInfo2029 item={item} anchorIds={surface === 'world'} onSelect={(event) => onOpen({ ...item, sourceRef: event.sourceRef, href: `/world#group-source-${event.id}` })} />
          <button className="sod29-action" onClick={() => onOpen(item)}>{surface === 'home' ? 'פתיחה בעולם' : 'שמירת ההקשר לקריאה'}</button>
        </div></details> : <article className="sod29-source-arrival" key={item.id} data-source-arrival={item.sourceRef}>
        <button className="sod29-source-arrival-link" onClick={() => { if (isNew) see(newKey); onOpen(item); }}>{copy}</button>
        {item.researchUpdatedAt ? <small className="sod29-source-arrival-update">המחקר התעדכן · {date(item.researchUpdatedAt)}</small> : null}
      </article>;
    })}
    {availability?.state !== 'connected' && availability?.message ? <p className="sod29-source-arrival-label" role="status">{availability.message}</p> : null}
    <p className="sod29-source-arrival-label">פוסטים מוצגים לפי העדכון הציבורי האחרון, עם שמירת תאריך הפרסום המקורי. הודעות מקור לפי מועד קליטתן.</p>
  </section>;
}
