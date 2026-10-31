import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { fetchStoryTreeSequence2029 } from '../../lib/research/worldSourceConnections.js';

// A return locator, not a source, relation, ranking or new route.
const UUID = '[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}';
export function storyTreeReturnSelection2029(hash) {
  const match = String(hash || '').match(new RegExp(`^#story-tree-(${UUID})--post-(\\d+)$`, 'i'));
  return match ? { anchorNodeId: match[1], sourceRef: `posts:${match[2]}` } : null;
}

export default function StoryTreeSequence2029({ anchorNodeId, anchorLabel, research,
  readSequence = fetchStoryTreeSequence2029 }) {
  const location = useLocation();
  const navigate = useNavigate();
  const request = useRef(0);
  const researchRef = useRef(research);
  researchRef.current = research;
  const [state, setState] = useState({ anchor: null, status: 'idle', stories: [] });
  const [selected, setSelected] = useState(null);
  const returned = storyTreeReturnSelection2029(location.hash);
  const requestedSource = returned && returned.anchorNodeId === anchorNodeId ? returned.sourceRef : null;
  const sectionId = `story-tree-${anchorNodeId}`;
  const payload = state.anchor === anchorNodeId ? state : { status: 'idle', stories: [] };
  const stories = payload.stories || [];
  const label = anchorLabel || payload.anchorLabel;
  const sourceRef = requestedSource || selected;
  const index = sourceRef ? stories.findIndex(s => s.sourceRef === sourceRef) : 0;
  const story = stories[index];
  const selectedId = story ? `${sectionId}--post-${story.sourceRef.slice(6)}` : sectionId;

  async function load() {
    const token = ++request.current;
    setState({ anchor: anchorNodeId, status: 'loading', stories: [] });
    try {
      const result = await readSequence({ anchorNodeId });
      if (request.current === token) setState({ ...result, anchor: anchorNodeId });
    } catch {
      if (request.current === token) setState({ anchor: anchorNodeId, status: 'error', stories: [] });
    }
  }
  useEffect(() => {
    ++request.current;
    setSelected(null);
    setState({ anchor: anchorNodeId, status: 'idle', stories: [] });
    return () => { ++request.current; };
  }, [anchorNodeId, readSequence]); // A changed selection reuses this bounded snapshot.
  useEffect(() => {
    if (requestedSource && state.anchor === anchorNodeId && state.status === 'idle') void load();
  }, [requestedSource, anchorNodeId, state.anchor, state.status, readSequence]);
  useEffect(() => {
    if (!requestedSource || !story) return;
    if (/^\/(?:2029\/)?world\/?$/.test(location.pathname)) {
      const href = `${location.pathname}${location.search}#${selectedId}`;
      researchRef.current?.updateResearchContext?.({
        subject: { id: anchorNodeId, type: 'node', label: label || 'ההקשר שנבחר', href },
        selection: { entityId: story.sourceRef.slice(6), entityType: 'post', sourceRef: story.sourceRef },
        lens: 'world', returnTo: null,
      });
    }
    const frame = requestAnimationFrame(() => {
      const element = document.getElementById(selectedId);
      element?.scrollIntoView({ block: 'start' });
      element?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [requestedSource, selectedId, story, anchorNodeId, label, location.pathname, location.search]);
  if (!new RegExp(`^${UUID}$`, 'i').test(anchorNodeId || '')) return null;

  function choose(next) {
    const target = stories[next];
    if (!target) return;
    setSelected(target.sourceRef);
    navigate(`${location.pathname}${location.search}#${sectionId}--post-${target.sourceRef.slice(6)}`, { replace: true });
  }
  function remember(event) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
    const href = `${location.pathname}${location.search}#${selectedId}`;
    // Make native Back as precise as the existing research-context return action.
    window.history.replaceState(window.history.state, '', href);
    research?.updateResearchContext?.({
      subject: { id: story.sourceRef.slice(6), type: 'post', label: story.title, href: story.href },
      selection: { entityId: story.sourceRef.slice(6), entityType: 'post', sourceRef: story.sourceRef },
      returnTo: { href, label: label || 'סיפורים מחוברים',
        subject: { id: anchorNodeId, type: 'node', label: label || 'ההקשר שנבחר', href },
        selection: { entityId: story.sourceRef.slice(6), entityType: 'post', sourceRef: story.sourceRef },
        journey: research?.context?.journey || null },
    });
  }
  return <section className="sod29-section" id={sectionId} aria-label="סיפורים מחוברים לעץ" data-story-tree-sequence>
    <div className="sod29-section-head"><div><div className="sod29-kicker">סיפורים בעץ המחקר</div>
      <h2>{label ? `סיפורים מחוברים · ${label}` : 'סיפורים מחוברים'}</h2></div>
      <button type="button" className="sod29-action" disabled={payload.status === 'loading'} onClick={() => void load()}>
        {payload.status === 'idle' ? 'פתח סיפורים מחוברים' : payload.status === 'loading' ? 'טוען סיפורים…' : 'רענן סיפורים'}
      </button></div>
    <p>פוסטים ציבוריים בעלי קשר מתועד לאותו הקשר. הסדר הוא סדר התצוגה השמור, לא ציר זמן או דירוג.</p>
    <div role="status" aria-live="polite">
      {payload.status === 'error' ? <p>לא ניתן לטעון כרגע. אפשר לנסות שוב.</p> : null}
      {payload.status === 'unavailable' ? <p>ההקשר אינו זמין כעת.</p> : null}
      {['empty', 'ready', 'partial'].includes(payload.status) && !stories.length ? <p>לא נמצאו כרגע סיפורים ציבוריים עם קשר מתועד בטווח שנבדק.</p> : null}
      {requestedSource && index < 0 && ['empty', 'ready', 'partial'].includes(payload.status) ? <p>הסיפור שאליו חזרתם אינו זמין ברצף הנוכחי. לא נבחר סיפור אחר במקומו.
        {stories.length ? <button type="button" className="sod29-action" onClick={() => choose(0)}>לעיון בסיפורים הזמינים</button> : null}</p> : null}
      {payload.coverage?.partial ? <p>זוהי תצוגה חלקית; חלק מהקשרים או המקורות לא נכללו בבדיקה זו.</p> : null}
    </div>
    {story ? <article className="sod29-card" id={selectedId} tabIndex={-1} data-story-source={story.sourceRef}>
      <p>{index + 1} מתוך {stories.length} סיפורים זמינים בתצוגה</p>
      <h3>{story.title}</h3>{story.summary ? <p>{story.summary}</p> : null}
      {story.creator ? <p>{story.creator}</p> : null}
      <p>החיבור הוא להקשר המשותף בעץ; הוא אינו קובע קשר ישיר בין הסיפורים או מאמת את פרשנותם.</p>
      <details><summary>פרטי הקשר המתועד</summary><p>סוג הקשר כפי שנשמר: {story.relation.type}</p>
        <p dir="ltr">{story.relation.edgeRef}</p><p dir="ltr">{story.relation.fromNodeRef} → {story.relation.toNodeRef}</p></details>
      <div className="sod29-actions"><button className="sod29-action" type="button" disabled={index <= 0} onClick={() => choose(index - 1)}>הסיפור הקודם</button>
        <Link className="sod29-action" to={story.href} onClick={remember}>לקריאת הפוסט</Link>
        <button className="sod29-action" type="button" disabled={index >= stories.length - 1} onClick={() => choose(index + 1)}>הסיפור הבא</button></div>
    </article> : null}
  </section>;
}
