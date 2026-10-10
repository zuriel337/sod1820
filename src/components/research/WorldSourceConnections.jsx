import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import SpatialMethodStage2029 from '../gematria2029/SpatialMethodStage2029.jsx';
import CanonicalMediaFigure2029 from '../experience2029/CanonicalMediaFigure2029.jsx';
import { WORLD_SOURCE_DIRECTIONS, REVIEWED_SOURCE_WITNESSES, fetchWorldSourceConnections, worldWitnessContext } from '../../lib/research/worldSourceConnections.js';

// Composite operands come from the canonical nested trace. Letter rendering stays with
// the existing shared Stage; unsupported variants are never relabelled as ordinary Miluy.
function CompositeTrace({ trace }) {
  if (trace.trace_kind !== 'COMPOSITE') return null;
  return <div data-composite-trace>
    <p>פעולה מן המנוע: {trace.steps?.operator === 'diff' ? 'הפרש' : trace.steps?.operator}</p>
    {(trace.steps?.components || []).map((component, index) => <p key={index}>
      {component.component_method} · <b>{component.component_value}</b>
    </p>)}
    <p>תוצאת המנוע: <b>{trace.result}</b></p>
  </div>;
}
function Witness({ witness, research, shell, select }) {
  const { source } = witness;
  const remember = (calculation = null) => {
    select(witness);
    research.updateResearchContext?.(worldWitnessContext(witness, calculation));
  };
  const leave = (href, subject, calculation = null) => {
    const origin = worldWitnessContext(witness);
    const destination = worldWitnessContext(witness, calculation);
    if (subject.type === 'topic' && source.item) destination.selection = source.item.reopen.selection;
    research.updateResearchContext?.({ ...destination, subject, returnTo: {
      ...origin, href: `/world#${witness.anchor}`, label: witness.title,
      subject: { id: origin.selection.entityId, type: origin.selection.entityType, label: witness.title, href: `/world#${witness.anchor}` },
      journey: research.context?.journey || null,
    } });
    shell.go(href, { preserve: false });
  };
  const calculate = (entry) => leave(entry.href, { id: String(entry.value), type: 'number', label: String(entry.value), href: entry.href }, entry);
  return <article id={witness.anchor} tabIndex={-1} className="sod29-world-witness" data-witness={witness.id} data-source-identity={witness.dependencyKey}>
    <div className="sod29-world-witness-copy">
      <div className="sod29-kicker">{source.item ? 'מן הגלריה ההיסטורית' : 'מתוך פוסט המטוס'} · רמזי גאולה</div>
      <h3>{witness.title}</h3>
      <p>{witness.reason}</p>
      {witness.readings?.length ? <ul className="sod29-world-source-readings">{witness.readings.map((reading, index) => <li key={index}><b dir="auto">{reading.value}</b> {reading.unit}</li>)}</ul> : null}
      {witness.relations.map((relation, index) => <div key={index} className="sod29-world-rule" data-law={relation.verified?.card.ruleId || 'unavailable'}>
        {relation.verified ? <>
          <strong dir="ltr">{relation.verified.display}</strong>
          <span>{relation.verified.card.title} · גרסה {relation.verified.card.ruleVersion}</span>
          <small>{relation.verified.card.note}</small>
          <details><summary>איך נוצר החיבור?</summary>
            <p>הקלט המקורי: {relation.from}. יעד החיבור: {relation.to}. החוק מציע זיקה פרשנית; הוא אינו משנה את ערך המקור ואינו ראיה עצמאית נוספת.</p>
            <code>{relation.verified.card.ruleId} · v{relation.verified.card.ruleVersion}</code>
            <pre>{JSON.stringify(relation.verified.card.finding.evidence.facts[0], null, 2)}</pre>
          </details>
        </> : <p role="status">החיבור {relation.from} → {relation.to} ממתין לאימות החוק או החישוב; אינו מוצג כחיבור מאומת.</p>}
      </div>)}
      {witness.calculations.length ? <div className="sod29-world-calculations" aria-label="הביטויים והשיטות">
        {witness.calculations.slice(0, 2).map((entry, index) => <div key={index}>
          {entry.verified ? <button className="sod29-action" onClick={() => calculate(entry.verified)} data-calculation={entry.method}>
            {entry.expression} · {entry.method === 'קדמי' ? 'משולש (קדמי)' : entry.method} · {entry.verified.value}
          </button> : <p>{entry.expression} · {entry.method}: החישוב אינו זמין לאימות</p>}
        </div>)}
        <details className="sod29-world-calculation-depth"><summary>כל השיטות ופירוט החישוב</summary>
          {witness.calculations.map((entry, index) => <section key={index} data-calculation-detail={entry.method}>
            <h4>{entry.expression} · {entry.method === 'קדמי' ? 'משולש (קדמי)' : entry.method}</h4>
            {entry.verified ? <>
              <button className="sod29-action" onClick={() => calculate(entry.verified)}>לעיון בהיכל · {entry.verified.value}</button>
              <p>תוצאה {entry.verified.value} · גרסת שיטה {entry.verified.trace.method_version} · התאמה למנוע אומתה</p>
              <CompositeTrace trace={entry.verified.trace} />
              <SpatialMethodStage2029 expression={entry.expression} methodKey={entry.method}
                trace={entry.verified.trace} expectedValue={entry.verified.value} depth="S2"
                onOpenHeichal={() => calculate(entry.verified)} />
              <details><summary>פרטי המנוע והמקור</summary><code>{source.sourceRef}</code><pre>{JSON.stringify(entry.verified.trace, null, 2)}</pre></details>
            </> : <p>אין תוצאה מאומתת זמינה. הערך ההיסטורי המצוטט נשמר במקור.</p>}
          </section>)}
        </details>
      </div> : null}
      <div className="sod29-actions">
        {source.topicHref ? <button className="sod29-action primary" onClick={() => leave(source.topicHref,
          { id: source.topicSlug, type: 'topic', label: source.topicSlug, href: source.topicHref })}>
          {source.item ? 'לטופיק — באותה תמונה' : 'המשך לטופיק 718'}</button> : null}
        {!source.item ? <button className="sod29-action" onClick={() => leave(source.href,
          { id: source.href.split('/').at(-1), type: 'post', label: source.postTitle, href: source.href })}>לקריאת הפוסט המקורי</button> : null}
      </div>
    </div>
    <div className="sod29-world-witness-source">
      {source.item ? <>
        <CanonicalMediaFigure2029 item={source.item} alt={`פתח מקור: ${witness.title}`} contextNote={witness.reason} onOpen={() => remember()} />
        <p className="sod29-kicker">מקור אחד · {source.item.occurrences.length} הופעות בגלריות</p>
        <details><summary>הגלריות, הכיתובים והקרדיטים המקוריים</summary>
          {source.item.occurrences.map((occurrence, index) => {
            const p = occurrence.legacyPlacement;
            const route = source.item.reopen.galleries.find((entry) => entry.selection.galleryImageId === p?.galleryImageId);
            return p ? <section key={index}>
              <h4>{p.galleryName || `גלריה ${p.wpGalleryId}`} · מיקום שמור {p.ordering}</h4>
              <p>{p.originalName}</p><p className="sod29-world-original-caption">{p.originalCaption}</p>
              <p>{Object.values(p.originalCredit || {}).filter(Boolean).join(' · ')}</p>
              {route?.href ? <a className="sod29-action" href={route.href} target="_blank" rel="noreferrer" onClick={() => remember()}>פתח את הגלריה המקורית בשלמותה</a> : null}
              <small>הגלריה נפתחת בסדרה המקורי; מיקום התמונה נשמר כאן. תאריכי העלאה ותיקייה אינם תאריכי אירוע מאומתים.</small>
            </section> : null;
          })}
        </details>
      </> : null}
      <details><summary>{source.item ? 'הטקסט שחולץ מן התמונה' : 'הקטע המדויק מן הפוסט'}</summary>
        <blockquote>{source.text}</blockquote>
        {source.author ? <p>קרדיט שמור: {source.author}</p> : null}
        <code>{source.sourceRef}</code>
        {!source.item ? <p>הקישור פותח את הפוסט. פתיחה למקטע גלוי וזמני הניגון המדויקים עדיין בבדיקת בעל הפוסט.</p> : null}
      </details>
    </div>
  </article>;
}
export default function WorldSourceConnections({ india, research, shell, showDirectionChoices = true }) {
  const location = useLocation();
  const navigate = useNavigate();
  const selectedSpec = REVIEWED_SOURCE_WITNESSES.find((spec) => location.hash === `#world-source-${spec.id}`);
  const direction = selectedSpec?.direction || WORLD_SOURCE_DIRECTIONS.find((entry) => location.hash === `#world-direction-${entry.id}`)?.id || null;
  const [state, setState] = useState({ direction: null, loading: false, items: [], error: false });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!direction) return;
    let alive = true;
    setState({ direction, loading: true, items: [], error: false });
    fetchWorldSourceConnections(direction, { india }).then((items) => { if (alive) setState({ direction, loading: false, items, error: false }); })
      .catch(() => { if (alive) setState({ direction, loading: false, items: [], error: true }); });
    return () => { alive = false; };
  }, [direction, india, attempt]);
  useEffect(() => {
    if (!direction || state.loading || state.direction !== direction) return;
    const frame = requestAnimationFrame(() => {
      const element = document.getElementById(location.hash.slice(1));
      element?.scrollIntoView({ block: 'start', behavior: 'instant' });
      element?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [direction, state, location.hash]);
  const select = (witness) => navigate(`/world#${witness.anchor}`, { replace: true });
  const render = (witness) => <Witness key={witness.id} witness={witness} research={research} shell={shell} select={select} />;
  const activeItems = state.direction === direction ? state.items : [];
  const supporting = activeItems.filter((item) => item.supporting);
  return <section className="sod29-world-source-connections" aria-label="לאן הרמז מוביל?">
    {showDirectionChoices ? <><h3>לאן הרמז מוביל?</h3>
    <nav className="sod29-world-directions" aria-label="כיווני המשך">{WORLD_SOURCE_DIRECTIONS.map((entry) => <button key={entry.id}
      aria-pressed={direction === entry.id} onClick={() => navigate(`/world#world-direction-${entry.id}`)}>
      <strong>{entry.label}</strong><span>{entry.why}</span>
    </button>)}</nav></> : null}
    {direction ? <div id={`world-direction-${direction}`} className="sod29-world-direction-content" tabIndex={-1}>
      {state.loading || state.direction !== direction ? <p role="status">פותח מקורות ובודק את החיבורים…</p> : state.error || !activeItems.length ? <div role="status">
        <p>המקורות או החיבורים אינם זמינים כרגע.</p><button className="sod29-action" onClick={() => setAttempt((n) => n + 1)}>נסה שוב את החיבורים</button>
      </div> : <>
        {activeItems.length < REVIEWED_SOURCE_WITNESSES.filter((item) => item.direction === direction).length ? <p role="status">חלק מן המקורות השתנו או אינם זמינים להצגה; מוצגים רק מקורות שנבדקו כעת.</p> : null}
        {activeItems.filter((item) => !item.supporting).map(render)}
        {supporting.length ? <details className="sod29-world-supporting" open={selectedSpec?.supporting || undefined}>
          <summary>עוד מקורות באותו כיוון ({supporting.length})</summary>{supporting.map(render)}
        </details> : null}
        <p className="sod29-kicker">המקורות הבולטים נבחרו לפי הקשר מוסבר ומקור שניתן לפתוח. מספר משותף אינו מוכיח שזה אותו אירוע.</p>
      </>}
    </div> : null}
  </section>;
}
