import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import CanonicalMediaFigure2029 from '../experience2029/CanonicalMediaFigure2029.jsx';
import SpatialMethodStage2029 from '../gematria2029/SpatialMethodStage2029.jsx';
import { WORLD_DISCOVERY_READINGS, REVIEWED_SOURCE_WITNESSES, DISCOVERY_TOPIC_SLUGS,
  discoveryLocation, discoveryHref, discoveryDocumentedTimeline, fetchWorldDiscovery, worldWitnessContext } from '../../lib/research/worldSourceConnections.js';
import '../../pages/topic2029.css';

const kinds = { documented_source_mention: 'מפורש במקור', author_interpretation: 'פרשנות המחבר',
  author_comparison: 'חיבור שכתב המחבר', proposed_source_connection: 'חיבור מוצע לעיון',
  proposed_method_connection: 'חיבור מוצע בין שיטות', proposed_rule_connection: 'חיבור מוצע לפי חוק' };
const label = (method) => method === 'קדמי' ? 'משולש (קדמי)' : method;

function SourceHistory({ item, remember }) {
  return <details className="sod29-discovery-history">
    <summary>הכיתובים, הקרדיטים והמיקומים המקוריים</summary>
    {item.occurrences.map((occurrence) => {
      const p = occurrence.legacyPlacement;
      if (!p) {
        const post = occurrence.postPlacement;
        return <section key={occurrence.mediaId}>
          <h4>{post?.originalTitle}</h4>
          <p>{post?.originalCaption || 'לא נשמר כיתוב נפרד לתמונה במקור.'}</p>
          <p>{[post?.originalCredit?.author, ...(post?.originalCredit?.authors || [])].filter(Boolean).join(' · ')}</p>
          <p className="sod29-discovery-note">תאריך פרסום הפוסט: {post?.publishedAt?.slice(0, 10) || 'לא צוין'}. אינו תאריך האירוע שבתמונה.</p>
          <a className="sod29-action" href={item.reopen.postHref} target="_blank" rel="noreferrer" onClick={remember}>הפוסט המקורי</a>
          <p className="sod29-discovery-note">הפוסט נפתח בשלמותו. התמונה המלאה זמינה כאן; מיקום גלוי בתוך גוף הפוסט תלוי בקורא הפוסטים.</p>
        </section>;
      }
      const route = item.reopen.galleries.find((r) => r.selection.galleryImageId === p.galleryImageId);
      return <section key={occurrence.mediaId} data-original-occurrence={p.galleryImageId}>
        <h4>{p.galleryName || `גלריה ${p.wpGalleryId}`} <span>· מיקום שמור {p.ordering}</span></h4>
        <p>{p.originalName}</p>
        <blockquote data-historical-caption>{p.originalCaption || 'לא נשמר כיתוב במקור.'}</blockquote>
        <p>{Object.values(p.originalCredit || {}).filter(Boolean).join(' · ')}</p>
        <a className="sod29-action" href={route?.href} target="_blank" rel="noreferrer" onClick={remember}>לגלריה המקורית — בסדר השמור</a>
        <p className="sod29-discovery-note">הארכיון פותח את הגלריה בשלמותה. המיקום המדויק נשמר כאן; תאריכי העלאה ותיקייה אינם תאריכי אירוע ודאיים.</p>
      </section>;
    })}
  </details>;
}

function CalculationDepth({ witness, openNumber }) {
  const verified = witness.calculations.filter((c) => c.verified);
  return <details className="sod29-discovery-depth">
    <summary>לפתוח את החישובים והשיטות <span>{verified.length}/{witness.calculations.length}</span></summary>
    {witness.calculations.map((entry) => <section key={`${entry.expression}:${entry.method}`} data-discovery-method={entry.method}>
      <h4>{entry.expression} <span>· {label(entry.method)}</span></h4>
      {entry.verified ? <>
        <p>תוצאה <b>{entry.verified.value}</b> · גרסת שיטה {entry.verified.trace.method_version} · התאמה למנוע אומתה</p>
        <SpatialMethodStage2029 expression={entry.expression} methodKey={entry.method} trace={entry.verified.trace}
          expectedValue={entry.verified.value} depth="S2" onOpenHeichal={() => openNumber(entry.verified)} />
        {entry.verified.trace.trace_kind === 'COMPOSITE' ? <p data-discovery-composite>
          רכיבי המנוע: {(entry.verified.trace.steps?.components || []).map((c) => `${c.component_method}: ${c.component_value}`).join(' · ')}
          {' · '}פעולה: {entry.verified.trace.steps?.operator} · תוצאה: {entry.verified.value}
        </p> : null}
        <button className="sod29-action" onClick={() => openNumber(entry.verified)}>להמשך בהיכל · {entry.verified.value}</button>
        <details><summary>פרטי האימות</summary><pre>{JSON.stringify(entry.verified.trace, null, 2)}</pre></details>
      </> : <p role="status">החישוב אינו זמין לאימות כעת. אין החלפה בשיטה אחרת.</p>}
    </section>)}
    {witness.clock ? <details><summary>פרטי חוק השעון והמקור</summary><pre>{JSON.stringify({ originalDisplay: witness.clock.originalDisplay,
      occurrence: witness.clock.occurrence, application: witness.clock.application }, null, 2)}</pre></details> : null}
    {witness.relations.map((r, index) => r.verified ? <details key={index}><summary>{r.verified.display} · פרטי החוק</summary>
      <pre>{JSON.stringify(r.verified.card.finding.evidence, null, 2)}</pre></details> : null)}
  </details>;
}

/** Same read-time source projection on World and three existing Topics. No new route,
 * persistence, source tagging, public Path, scoring or automatic journey creation. */
export default function WorldSourceStory({ research, shell, topicSlug = null }) {
  const location = useLocation(), navigate = useNavigate();
  const { reading, id, anchor } = discoveryLocation(location.hash, topicSlug);
  const [state, setState] = useState({ reading: null, loading: true, pack: null });
  const [retry, setRetry] = useState(0);
  const enabled = !topicSlug || DISCOVERY_TOPIC_SLUGS.includes(topicSlug);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    setState({ reading: reading.id, loading: true, pack: null });
    fetchWorldDiscovery(reading.id).then((pack) => { if (alive) setState({ reading: reading.id, loading: false, pack }); })
      .catch(() => { if (alive) setState({ reading: reading.id, loading: false, pack: null }); });
    return () => { alive = false; };
  }, [enabled, reading.id, retry]);
  const pack = state.reading === reading.id ? state.pack : null;
  const witness = pack?.items.find((w) => w.id === id);
  const pending = state.loading || state.reading !== reading.id;
  useEffect(() => {
    if (pending || location.hash !== `#${anchor}`) return;
    if (witness) research.updateResearchContext?.(worldWitnessContext(witness, null, {
      href: discoveryHref(reading.id, witness.id, topicSlug), anchor, lens: topicSlug ? 'topic' : 'world',
    }));
    else research.updateResearchContext?.({ selection: null, dimensions: { surfaceFocus: null, surfaceFindings: [], readingFocus: null } });
    const frame = requestAnimationFrame(() => {
      const element = document.getElementById(anchor);
      element?.scrollIntoView({ block: 'start', behavior: 'instant' });
      element?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [anchor, pending, location.hash, witness?.id]);
  if (!enabled) return null;
  const href = discoveryHref(reading.id, id, topicSlug);
  const patch = (w = witness, calculation = null) => worldWitnessContext(w, calculation, {
    href: discoveryHref(reading.id, w.id, topicSlug), anchor: `${topicSlug ? 'topic' : 'world'}-discovery-${reading.id}--${w.id}`, lens: topicSlug ? 'topic' : 'world' });
  const remember = () => {
    if (!witness) return;
    research.updateResearchContext?.(patch());
    if (location.hash !== `#${anchor}`) navigate(href, { replace: true });
  };
  const choose = (nextId, readingId = reading.id) => {
    const next = pack?.items.find((w) => w.id === nextId);
    if (next && readingId === reading.id) research.updateResearchContext?.(patch(next));
    else research.updateResearchContext?.({ selection: null, dimensions: { surfaceFocus: null, surfaceFindings: [], readingFocus: null } });
    navigate(discoveryHref(readingId, nextId, topicSlug));
  };
  const leave = (target, subject, calculation = null) => {
    const origin = patch();
    research.updateResearchContext?.({ ...patch(witness, calculation), subject, returnTo: {
      ...origin, href, label: witness.title,
      // A Path step needs its source-native subject as well as its locator.
      // World has no Topic subject; retain the selected source instead.
      subject: topicSlug ? { id: topicSlug, type: 'topic', label: topicSlug, href: `/topic/${topicSlug}` }
        : { id: origin.selection.entityId, type: origin.selection.entityType, label: witness.title, href },
      journey: research.context?.journey || null,
    } });
    shell.go(target, { preserve: false });
  };
  const openNumber = (entry) => leave(entry.href, { id: String(entry.value), type: 'number', label: String(entry.value), href: entry.href }, entry);
  const index = reading.steps.indexOf(id);
  const nextSpec = REVIEWED_SOURCE_WITNESSES.find((s) => s.id === reading.steps[index + 1]);
  const groupCount = witness?.source.item.occurrences.length || 0;
  const timeline = discoveryDocumentedTimeline(pack?.items);
  return <section id={topicSlug ? 'topic-discovery' : 'world-discovery'} className="sod29-connected-discovery" aria-label="רמזי גאולה — קריאה מחוברת" data-discovery-surface={topicSlug || 'world'}>
    <header className="sod29-discovery-intro">
      <div><span className="sod29-discovery-eyebrow">רמזי גאולה · מהמקור אל החיבור</span>
        <h2>{topicSlug ? 'לגלות את הציר דרך המקורות' : 'צילום אחד. כמה כיווני גילוי.'}</h2></div>
      <p>פותחים תמונה, מבינים את הרמז, וממשיכים למקור שמחובר אליה.</p>
    </header>
    <nav className="sod29-discovery-readings" aria-label="קריאות מחוברות">{WORLD_DISCOVERY_READINGS.map((r) => <button key={r.id}
      aria-pressed={reading.id === r.id} onClick={() => choose(r.steps[0], r.id)}>
      <b dir="ltr">{r.number}</b><strong>{r.title}</strong><span>{r.lead}</span>
    </button>)}</nav>
    <div className="sod29-discovery-line-head"><h3>{reading.title}</h3><span>{index + 1} / {reading.steps.length}</span></div>
    <nav className="sod29-discovery-steps" aria-label="תחנות הקריאה">{reading.steps.map((step, n) => {
      const spec = REVIEWED_SOURCE_WITNESSES.find((s) => s.id === step);
      return <button key={step} aria-current={step === id ? 'step' : undefined} onClick={() => choose(step)}>
        <span>{String(n + 1).padStart(2, '0')}</span>{spec.shortTitle || spec.title}
      </button>;
    })}</nav>
    {pending ? <div className="sod29-discovery-wait" role="status">פותח את המקורות ובודק את החיבורים…</div> : !witness ?
      <article id={anchor} tabIndex={-1} className="sod29-discovery-wait" role="status">
        <h3>המקור בתחנה הזו אינו זמין להצגה כעת</h3><p>ייתכן שהמקור השתנה או שהרשאתו אינה מאפשרת הצגה. שאר התחנות נשארות זמינות.</p>
        <button className="sod29-action" onClick={() => setRetry((r) => r + 1)}>בדיקה מחדש</button>
      </article> : <article id={anchor} tabIndex={-1} className="sod29-discovery-focus" data-discovery-witness={witness.id} data-source-identity={witness.dependencyKey}>
        <div className="sod29-discovery-media">
          <CanonicalMediaFigure2029 item={witness.source.item} alt={`פתח מקור מלא: ${witness.title}`} primary onOpen={remember} contextNote={witness.reason} />
          <p className="sod29-discovery-source-label">מקור אחד · {groupCount} {witness.source.item.postPlacement ? 'הופעה בפוסט' : 'הופעות בגלריות'} · לחיצה פותחת את התמונה בשלמותה</p>
          <SourceHistory item={witness.source.item} remember={remember} />
        </div>
        <div className="sod29-discovery-copy">
          <span className="sod29-discovery-eyebrow">{witness.eventLabel || 'מקור היסטורי · רמזי גאולה'}</span>
          <div className="sod29-discovery-number" dir="ltr">{witness.displayValue || witness.calculations[0]?.verified?.value || ''}</div>
          <h3>{witness.title}</h3><span className="sod29-discovery-kind">{kinds[witness.relationKind] || 'קשר מתועד'}</span>
          <p>{witness.reason}</p>
          {witness.readings?.length ? <ul className="sod29-discovery-readings-data">{witness.readings.map((r, n) => <li key={n}><b>{r.value}</b> {r.unit}</li>)}</ul> : null}
          {witness.clock ? <div className="sod29-discovery-law" data-discovery-clock={witness.clock.rule_version}>
            <strong dir="ltr">{witness.clock.originalDisplay} → {witness.clock.application.subject.value}</strong>
            <span>חוק השעון · גרסה {witness.clock.rule_version} · ייצוג של השעה, לא חישוב גימטריה</span>
          </div> : witness.clock === null && REVIEWED_SOURCE_WITNESSES.find((s) => s.id === id)?.clock ? <p role="status">חוק השעון אינו זמין לאימות; מוצגת תצפית המקור בלבד.</p> : null}
          {witness.numberReading ? <div className="sod29-discovery-law" data-number-reading={witness.numberReading.id}>
            <strong dir="ltr">1445 → 14 | 45</strong><span>{witness.numberReading.reading} · קריאה מתועדת במערכת, נפרדת מחוק השעון</span>
          </div> : witness.numberReading === null && id === 'clock-1445' ? <p role="status">הקריאה המתועדת 14|45 אינה זמינה כעת.</p> : null}
          {witness.relations.map((r, n) => <div key={n} className="sod29-discovery-law" data-discovery-law={r.verified?.card.ruleId || 'unavailable'}>
            {r.verified ? <><strong dir="ltr">{r.verified.display}</strong><span>{r.verified.card.title} · v{r.verified.card.ruleVersion} · נגזרת של אותו מקור</span></> : <span>החיבור לפי החוק אינו זמין לאימות כעת.</span>}
          </div>)}
          <div className="sod29-discovery-calculations">{witness.calculations.slice(0, 2).map((c) => c.verified ? <button
            key={`${c.expression}:${c.method}`} onClick={() => openNumber(c.verified)} data-open-calculation={c.expression}>
            <span>{c.expression}</span><small>{label(c.method)}</small><b>{c.verified.value}</b>
          </button> : <p key={c.expression} role="status">{c.expression} · {label(c.method)}: אין חישוב מאומת זמין</p>)}</div>
          {witness.boundary ? <p className="sod29-discovery-boundary">{witness.boundary}</p> : null}
          <CalculationDepth witness={witness} openNumber={openNumber} />
          {witness.topicLinks.length ? <div className="sod29-discovery-topics" aria-label="הבתים הקיימים של הקשר">{witness.topicLinks.filter((t) => t.slug !== topicSlug).map((t) => <button
            key={t.slug} className="sod29-action" onClick={() => leave(t.href, { id: t.slug, type: 'topic', label: t.title, href: t.href })}>
            {t.title} ←</button>)}</div> : null}
          <details className="sod29-discovery-extraction"><summary>הקטע המדויק ומצב הקשר</summary>
            <blockquote>{witness.source.text}</blockquote><code>{witness.source.sourceRef}</code>
            <p>זוהי קריאה מחוברת לעיון. אין בה שינוי של שיוכי המקור או אישורי הטופיקים.</p>
            {witness.topicLinks.map((t) => <p key={t.slug}>{t.title}: {t.association === 'stored_topic_association' ? 'שיוך תמונה כבר שמור' : 'הרחבת קריאה מוצעת; אין שיוך תמונה שמור'}</p>)}
          </details>
        </div>
      </article>}
    {nextSpec ? <div className="sod29-discovery-bridge" data-transition-to={nextSpec.id}>
      <div><span className="sod29-discovery-eyebrow">מה מחבר למקור הבא?</span><p>{reading.bridges[index]}</p></div>
      <button className="sod29-action primary" onClick={() => choose(nextSpec.id)}>המשך: {nextSpec.shortTitle || nextSpec.title} ←</button>
    </div> : <div className="sod29-discovery-bridge"><p>הקריאה הזו נפתחה. אפשר להמשיך בכיוון נוסף, עם אותם מקורות והסבר חדש.</p>
      <button className="sod29-action primary" onClick={() => { const r = WORLD_DISCOVERY_READINGS[(WORLD_DISCOVERY_READINGS.indexOf(reading) + 1) % WORLD_DISCOVERY_READINGS.length]; choose(r.steps[0], r.id); }}>לכיוון הבא ←</button>
    </div>}
    {index > 0 ? <button className="sod29-action" onClick={() => choose(reading.steps[index - 1])}>→ למקור הקודם</button> : null}
    {pack ? <details className="sod29-discovery-timeline"><summary>התיעוד לאורך הזמן</summary>
      <p>תצוגה נפרדת לפי תאריכים מתועדים. סדר הגלריות נשאר כפי שנשמר; תאריך כתבה או עדכון גלריה אינו תאריך אירוע ודאי.</p>
      <ol>{timeline.dated.map((row) => <li key={row.id}><time dateTime={row.date.value}>{row.date.value}</time>
        <button className="sod29-action" onClick={() => choose(row.id)}>{row.title}</button><span>{row.date.label}</span></li>)}</ol>
      {timeline.undated.length ? <p>בלי תאריך מאומת לתצוגה הזו: {timeline.undated.map((row) => row.title).join(' · ')}. לא הושלם תאריך מתיקייה או מהעלאה.</p> : null}
    </details> : null}
    {pack ? <p className="sod29-discovery-coverage">בקריאה הנבחרת: {pack.coverage.sources} מקורות ייחודיים · {pack.coverage.occurrences} הופעות שמורות.
      {' '}הופעות חוזרות וחישובים מאותו מקור אינם ראיות עצמאיות.
      {pack.missing.length ? ` ${pack.missing.length} תחנות ממתינות למקור זמין.` : ''}
      {pack.coverage.occurrencesTruncated ? ' יש הופעות נוספות מעבר לחלון הקריאה.' : ''}
    </p> : null}
  </section>;
}
