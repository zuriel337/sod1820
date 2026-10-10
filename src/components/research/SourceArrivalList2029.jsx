import React, { useState } from 'react';
import { FrameState } from '../experience2029/Sod2029Shell.jsx';
import NavigationIcon2029 from '../experience2029/NavigationIcon2029.jsx';
import '../../pages/home-world-story2029.css';

function date(value) {
  if (!value || !Number.isFinite(Date.parse(value))) return 'לא צוין';
  return new Date(value).toLocaleString('he-IL', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/** One consumer of the existing public arrivals, shared by Home and World. */
export default function SourceArrivalList2029({ items = [], loading, availability, onOpen, surface = 'world' }) {
  const [filter, setFilter] = useState('all');
  const sources = items.filter(item => item.kind === 'source' && (filter === 'all' || item.sourceKind === filter)).slice(0, 6);
  return <section className="sod29-source-arrivals" id={`${surface}-sources`} aria-label="מה מגיע מן המקורות">
    <header><div className="sod29-kicker">קולות מן המקור</div><h2>מה מגיע עכשיו</h2>
      <p>דברי הכותבים והפוסטים האחרונים פתוחים לקריאה, גם לפני שנוצר מהם חיבור במחקר.</p></header>
    <div className="sod29-actions" aria-label="סוג המקורות">{[['all', 'העדכונים האחרונים'], ['group_message', 'הודעות מקור'], ['post', 'פוסטים אחרונים']].map(([key, label]) =>
      <button key={key} className={`sod29-action${filter === key ? ' primary' : ''}`} aria-pressed={filter === key} onClick={() => setFilter(key)}>{label}</button>)}</div>
    {loading ? <FrameState kind="loading" title="פותח את המקורות האחרונים" /> : null}
    {!loading && !sources.length ? <p role="status">אין כרגע מקורות זמינים בזרם הזה.</p> : null}
    {sources.map(item => {
      const group = item.sourceKind === 'group_message';
      const copy = <><span className="sod29-source-arrival-icon"><NavigationIcon2029 name="source" /></span><span className="sod29-source-arrival-copy">
        <span className="sod29-source-arrival-label">{group ? 'מהמקור · טרם נבדק' : 'פוסט מקור'}</span>
        <strong>{item.label}</strong><span>{item.creator || 'שם הכותב לא צוין'}</span>
        <small>{group ? 'נשמר במערכת' : 'פרסום המקור'} · {date(group ? item.arrivalAt : item.sourcePublishedAt || item.at)}</small>
      </span><span className="sod29-source-arrival-open" aria-hidden="true">{group ? '↓' : '←'}</span></>;
      return group ? <details key={item.id} id={surface === 'world' ? `group-source-${item.id.slice(6)}` : undefined}
        className="sod29-world-group-source sod29-source-arrival" data-source-arrival={item.sourceRef}>
        <summary>{copy}</summary><div className="sod29-source-arrival-body"><p>{item.fullText}</p>
          <p className="sod29-source-arrival-label">מועד המקור ומועד גילוי חיבור: לא תועדו בנתונים הזמינים.</p>
          <button className="sod29-action" onClick={() => onOpen(item)}>{surface === 'home' ? 'פתיחה בעולם' : 'שמירת ההקשר לקריאה'}</button>
        </div></details> : <article className="sod29-source-arrival" key={item.id} data-source-arrival={item.sourceRef}>
        <button className="sod29-source-arrival-link" onClick={() => onOpen(item)}>{copy}</button>
        {item.researchUpdatedAt ? <small className="sod29-source-arrival-update">המחקר התעדכן · {date(item.researchUpdatedAt)}</small> : null}
      </article>;
    })}
    {availability?.state !== 'connected' && availability?.message ? <p className="sod29-source-arrival-label" role="status">{availability.message}</p> : null}
    <p className="sod29-source-arrival-label">הסדר נשען על זמן המקור או הקליטה. עיבוד נוסף אינו הופך את אותו מקור לחדש.</p>
  </section>;
}
