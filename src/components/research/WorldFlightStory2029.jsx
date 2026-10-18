import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FrameState } from '../experience2029/Sod2029Shell.jsx';
import NavigationIcon2029 from '../experience2029/NavigationIcon2029.jsx';
import PostTimeline2029 from '../experience2029/PostTimeline2029.jsx';
import { createOnDemandLoader } from '../experience2029/onDemandLoader2029.js';
import { getPostCardBySlug } from '../../lib/supabase.js';
import { isPublicWorldPostRow, WORLD_FLIGHT_POST_SLUG } from '../../lib/postReadQueries2029.js';
import '../../pages/home-world-story2029.css';
import PostCategories2029 from '../experience2029/PostCategories2029.jsx';
import { relativeTimeLabel } from '../../lib/relativeTime2029.js';

const slug = WORLD_FLIGHT_POST_SLUG;
const loadPostReadingProjection = createOnDemandLoader(() => import('../../lib/research/post2029ReadingProjection.js'));
// A loader failure without a same-origin module URL, or a failed recovery URL,
// cannot be repaired inside the current document. Remember that terminal state
// across World remounts so navigation never turns it into an implicit request
// loop; a document reload creates a fresh module instance.
let projectionModuleNeedsReload = false;
const admitProjection = (projection) => projection && !projection.draft && !projection.privateStage && !projection.previewSnapshot
  && isPublicWorldPostRow(projection.post);
const compactProjection = (post, extensionsPending = false) => ({
  post,
  identity: { type: 'post', id: String(post.id), slug: post.slug, href: `/post/${post.slug}` },
  experience: { media: null, timeline: [] },
  draft: false,
  privateStage: false,
  previewSnapshot: false,
  extensionsPending,
});
const directions = [
  { id: 'people', icon: 'community', label: 'האנשים והמקומות', value: 'הודו',
    reason: 'צילום המקור מזהה את הקפטן כאזרח הודי. מכאן נפתח התיעוד ההיסטורי של הודו.', href: '/world#world-plane-india' },
  { id: 'time', icon: 'time', label: 'המספר והזמן', value: '1073 · 718',
    reason: 'מספר הטיסה, שני נוסחי תאריך והקריאה שמחברת אותם לשביעי באוקטובר.', href: '/world#world-direction-october' },
  { id: 'wisdom', icon: 'number', label: 'חכמה וירושלים', value: '73',
    reason: 'חכמה מופיעה בסרטון. המילה נפתחת בשיטות שונות, לצד צילומי המקור מירושלים.', href: '/world#world-direction-wisdom' },
];

/** Bounded Home/World invitation to an existing public Post reader. No content copy,
 * new source identity, publication decision or automatic Research Path start. */
export default function WorldFlightStory2029({ surface = 'world', research, shell }) {
  const location = useLocation(), navigate = useNavigate();
  const [state, setState] = useState({ loading: true, projection: null, extensionsStatus: 'idle', extensionsRecovery: 'none' });
  const [attempt, setAttempt] = useState(0);
  const lifecycleRef = useRef({ active: false, generation: 0 });
  const fullLoadRef = useRef(null);
  const fullStatusRef = useRef('idle');
  const home = surface === 'home';
  const anchor = home ? 'home-plane' : 'world-plane-story';

  const requestFullProjection = useCallback(({ allowRecovery = false } = {}) => {
    const generation = lifecycleRef.current.generation;
    const current = () => lifecycleRef.current.active && lifecycleRef.current.generation === generation;
    if (!current() || fullStatusRef.current === 'ready') return fullLoadRef.current || Promise.resolve(null);
    if (fullLoadRef.current) return fullLoadRef.current;
    if (projectionModuleNeedsReload) {
      fullStatusRef.current = 'terminal-error';
      setState((value) => value.projection
        ? { ...value, loading: false, extensionsStatus: 'error', extensionsRecovery: 'reload' }
        : { loading: false, projection: null, extensionsStatus: 'error', extensionsRecovery: 'reload' });
      return Promise.resolve(null);
    }
    if (loadPostReadingProjection.recovery?.().canRetry && !allowRecovery) {
      fullStatusRef.current = 'retryable-error';
      setState((value) => value.projection
        ? { ...value, loading: false, extensionsStatus: 'error', extensionsRecovery: 'retry' }
        : { loading: false, projection: null, extensionsStatus: 'error', extensionsRecovery: 'retry' });
      return Promise.resolve(null);
    }

    fullStatusRef.current = 'loading';
    setState((value) => value.projection
      ? { ...value, extensionsStatus: 'loading', extensionsRecovery: 'none' }
      : value);
    let moduleReady = false;
    let request;
    request = loadPostReadingProjection()
      .then((module) => {
        if (!current()) return null;
        moduleReady = true;
        projectionModuleNeedsReload = false;
        return module.fetchPost2029ReadingProjection(slug, {
          onPrimary: (projection) => {
            if (!current()) return;
            if (!admitProjection(projection)) {
              fullStatusRef.current = 'rejected';
              setState({ loading: false, projection: null, extensionsStatus: 'idle', extensionsRecovery: 'none' });
              return;
            }
            setState({ loading: false, projection, extensionsStatus: 'loading', extensionsRecovery: 'none' });
          },
        });
      })
      .then((projection) => {
        if (!current()) return null;
        if (!admitProjection(projection)) {
          fullStatusRef.current = 'rejected';
          setState({ loading: false, projection: null, extensionsStatus: 'idle', extensionsRecovery: 'none' });
          return null;
        }
        fullStatusRef.current = 'ready';
        setState({ loading: false, projection, extensionsStatus: 'ready', extensionsRecovery: 'none' });
        return projection;
      })
      .catch(() => {
        const canRetry = Boolean(loadPostReadingProjection.recovery?.().canRetry);
        const recovery = canRetry ? 'retry' : 'reload';
        // The shared module loader settles independently of this React mount.
        // Record a terminal module failure even when navigation unmounted the
        // story while the request was in flight; only component/UI state is
        // lifecycle-bound. Otherwise a remount can accidentally request the
        // same failed importer (or a second recovery URL) again.
        if (!moduleReady && !canRetry) projectionModuleNeedsReload = true;
        if (!current()) return null;
        fullStatusRef.current = canRetry ? 'retryable-error' : 'terminal-error';
        setState((value) => value.projection
          ? { ...value, loading: false, extensionsStatus: 'error', extensionsRecovery: recovery }
          : { loading: false, projection: null, extensionsStatus: 'error', extensionsRecovery: recovery });
        return null;
      })
      .finally(() => { if (fullLoadRef.current === request) fullLoadRef.current = null; });
    fullLoadRef.current = request;
    return request;
  }, []);

  const retryFullProjection = useCallback(() => {
    if (!loadPostReadingProjection.recovery?.().canRetry) {
      projectionModuleNeedsReload = true;
      fullStatusRef.current = 'terminal-error';
      setState((value) => ({ ...value, extensionsStatus: 'error', extensionsRecovery: 'reload' }));
      return;
    }
    requestFullProjection({ allowRecovery: true });
  }, [requestFullProjection]);

  useEffect(() => {
    let live = true;
    const generation = lifecycleRef.current.generation + 1;
    lifecycleRef.current = { active: true, generation };
    fullLoadRef.current = null;
    fullStatusRef.current = 'idle';
    setState({ loading: true, projection: null, extensionsStatus: 'idle', extensionsRecovery: 'none' });
    // Home's established missing-image fallback stays intact, including its existing direct module request.
    const loadFullForHome = () => import('../../lib/research/post2029ReadingProjection.js').then((m) => m.fetchPost2029ReadingProjection(slug, {
      onPrimary: (projection) => { if (live && admitProjection(projection)) setState({ loading: false, projection, extensionsStatus: 'loading', extensionsRecovery: 'none' }); },
    })).then((projection) => {
      if (live) setState({ loading: false, projection: admitProjection(projection) ? projection : null, extensionsStatus: 'ready', extensionsRecovery: 'none' });
    });
    // Home draws the post's own row (image, categories, date) and nothing of the reading projection's extension phase (timeline, verifications, method traces: they live in a
    // collapsed section that only the World surface has). So Home asks for that row's card columns (not the body: the same lookup as the projection's first read, narrower),
    // and does not load the projection builder or run its extension reads on every entry. A row without an image still goes through the full reader, which may supply one from the post's experience media.
    const task = getPostCardBySlug(slug).then((post) => {
      if (!live) return null;
      const draft = Array.isArray(post?.tags) && post.tags.includes('טיוטה');
      if (!post || draft || !isPublicWorldPostRow(post)) { setState({ loading: false, projection: null }); return null; }   // not public Home material: the same outcome the full reader gives
      if (home && !post.thumb_url && !post.image_url) return loadFullForHome();
      setState({ loading: false, projection: compactProjection(post, !home), extensionsStatus: 'idle', extensionsRecovery: 'none' });
      // World displays image_url, not the card thumbnail. If that field is
      // absent, including a thumb-only row, retain the full-reader media
      // fallback. Home can render either field and falls back only when both
      // are absent.
      if (!home && !post.image_url) return requestFullProjection();
      return null;
    });
    task.catch(() => { if (live) setState((current) => current.projection
      ? { ...current, loading: false, extensionsStatus: 'error', extensionsRecovery: 'reload' }
      : { loading: false, projection: null, extensionsStatus: 'error', extensionsRecovery: 'reload' }); });
    return () => {
      live = false;
      if (lifecycleRef.current.generation === generation) lifecycleRef.current = { active: false, generation };
    };
  }, [attempt, home, requestFullProjection]);
  useEffect(() => {
    if (state.loading || location.hash !== `#${anchor}`) return;
    const frame = requestAnimationFrame(() => document.getElementById(anchor)?.scrollIntoView({ block: 'start', behavior: 'instant' }));
    return () => cancelAnimationFrame(frame);
  }, [anchor, location.hash, state.loading]);
  const openTimeline = (event) => {
    if (event.currentTarget.open && fullStatusRef.current === 'idle') requestFullProjection();
  };
  if (state.loading) return <section id={anchor} className={home ? 'sod29-flight-story is-home is-loading' : 'sod29-flight-story is-world is-loading'} aria-label="סיפור המטוס נטען">
    <FrameState kind="loading" title="פותח את סיפור המטוס">המקור והחיבורים נטענים.</FrameState>
  </section>;
  if (!state.projection) return <FrameState kind="unavailable" title="סיפור המטוס אינו זמין כרגע">
    <button className="sod29-action" onClick={() => setAttempt(n => n + 1)}>נסה שוב את המקור</button>
  </FrameState>;
  const { post, identity, experience } = state.projection;
  const media = experience.media?.highlight;
  const image = (home ? post.thumb_url : post.image_url) || post.image_url || media?.poster;
  const openWorld = () => {
    research.updateResearchContext?.({ subject: null, selection: null, lens: 'world',
      returnTo: { href: '/#home-plane', label: 'סיפור המטוס בבית', subject: null,
        selection: null, lens: 'home', dimensions: {}, journey: research.context?.journey || null } });
    shell.go('/world#world-plane-story', { preserve: false });
  };
  const openPost = () => {
    research.updateResearchContext?.({ subject: { id: String(post.id), type: 'post', label: post.title, href: identity.href },
      selection: { entityId: String(post.id), entityType: 'post', sourceRef: `posts:${post.id}` }, lens: 'reading',
      returnTo: { href: `/world#${anchor}`, label: 'כיווני הגילוי במטוס',
        subject: null, selection: null, lens: 'world', dimensions: {}, journey: research.context?.journey || null } });
    shell.go(identity.href, { preserve: false });
  };
  const date = post.date ? relativeTimeLabel(post.date) : null;
  return <section id={anchor} className={`sod29-flight-story is-${surface}`} data-flight-story={surface} aria-label="סיפור המטוס וכיווני הגילוי">
    {!home ? <div className="sod29-flight-breadcrumb"><button onClick={() => shell.go('/#home-plane')}>הבית</button><span aria-hidden="true">/</span><span>סיפור המטוס בעולם</span></div> : null}
    <div className="sod29-flight-feature">
      <div className="sod29-flight-copy">
        <div className="sod29-kicker">רמזי גאולה · מתוך המקור</div>
        <h2>{home ? 'טיסה אחת. כמה כיווני גילוי.' : 'לאן סיפור המטוס מוביל?'}</h2>
        <p className="sod29-flight-lead">{home
          ? 'מספר על צילום, שמו של הקפטן, מקום הנחיתה. מתוך סיפור טיסה 1073 נפתחים חיבורים לאנשים, לזמן ולמקורות שכבר פגשנו.'
          : 'מתחילים בסיפור ובצילום. בוחרים חיבור שמסקרן אותנו, פותחים את המקור, ומעמיקים בקצב שלנו.'}</p>
        {!home ? <p className="sod29-flight-lead" data-source-interpretation="zuriel-787">
          <strong>787 · השנה, החג וההודיה.</strong> לפי קריאת המערכת, המפגש בין השנה המסוימת, ״ושמחת בחגך״ ונוסח ההודיה מאיר את סיפור ההצלה בכמה רבדים. זו קריאה פרשנית של החיבור, ולא עדות שהברכה נאמרה בטיסה.
        </p> : null}
        <div className="sod29-flight-meta"><PostCategories2029 categories={post.categories} /><span>FZ1073</span>{date ? <span>פורסם באתר · {date}</span> : null}</div>
        <div className="sod29-actions"><button className="sod29-action primary" onClick={home ? openWorld : openPost}>
          {home ? 'לגלות את החיבורים ב־World' : 'לקריאת פוסט המטוס'} <span aria-hidden="true">←</span>
        </button></div>
      </div>
      {image ? <figure className="sod29-flight-media">
        <img src={image} alt="תמונת המקור מתוך פוסט טיסה 1073" fetchPriority={home ? 'high' : 'auto'} />
        <figcaption>מתוך פוסט המטוס · תמונת המקור בשלמותה</figcaption>
      </figure> : null}
    </div>
    {!home ? <>
      <div className="sod29-flight-directions" aria-label="שלושה כיווני גילוי">
        {directions.map(direction => <button key={direction.id} type="button" aria-pressed={location.hash === direction.href.slice(direction.href.indexOf('#'))}
          onClick={() => navigate(direction.href)}>
          <span className="sod29-flight-direction-icon"><NavigationIcon2029 name={direction.icon} /></span>
          <span className="sod29-flight-direction-value" dir="auto">{direction.value}</span>
          <strong>{direction.label}</strong><span>{direction.reason}</span><em>פתיחת המקורות ←</em>
        </button>)}
      </div>
      <details className="sod29-flight-time" onToggle={openTimeline}><summary>הסיפור לאורך הזמן</summary>
        {state.extensionsStatus === 'loading' ? <FrameState kind="loading" title="המקור והחיבורים נטענים" />
          : state.extensionsStatus === 'error' ? <FrameState kind="unavailable" title="החיבורים אינם זמינים כרגע">
            {state.extensionsRecovery === 'retry'
              ? <button className="sod29-action" onClick={retryFullProjection}>נסה שוב</button>
              : <button className="sod29-action" onClick={() => window.location.reload()}>רענן את הדף</button>}
          </FrameState> : state.extensionsStatus === 'ready'
            ? <PostTimeline2029 items={experience.timeline || []} currentHref={identity.href} /> : null}
        {post.modified && post.modified !== post.date ? <p>עדכון הפוסט: {relativeTimeLabel(post.modified)}. עדכון אינו אירוע חדש.</p> : null}
        <p>מועד גילוי החיבורים לא תועד במקור הזמין. תאריכי הפרסום, האירוע ושמירת המדיה נשמרים בנפרד.</p>
      </details>
    </> : null}
  </section>;
}
