import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FrameState } from '../experience2029/Sod2029Shell.jsx';
import NavigationIcon2029 from '../experience2029/NavigationIcon2029.jsx';
import PostTimeline2029 from '../experience2029/PostTimeline2029.jsx';
import { postRowToWorldUpdate } from '../../lib/research/worldDiscoveryStream.js';
import { getPostBySlug } from '../../lib/supabase.js';
import { WORLD_FLIGHT_POST_SLUG } from '../../lib/postReadQueries2029.js';
import '../../pages/home-world-story2029.css';
import PostCategories2029 from '../experience2029/PostCategories2029.jsx';
import { relativeTimeLabel } from '../../lib/relativeTime2029.js';

const slug = WORLD_FLIGHT_POST_SLUG;
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
  const [state, setState] = useState({ loading: true, projection: null });
  const [attempt, setAttempt] = useState(0);
  const home = surface === 'home';
  const anchor = home ? 'home-plane' : 'world-plane-story';
  useEffect(() => {
    let live = true;
    setState({ loading: true, projection: null });
    // This consumer never adopts a private stage or preview snapshot as public material.
    const admit = (projection) => projection && !projection.draft && !projection.privateStage && !projection.previewSnapshot
      && postRowToWorldUpdate(projection.post);
    // Loaded on demand: the reading-projection builder is ~42KB br that must not gate the first paint of Home/World.
    const loadFull = () => import('../../lib/research/post2029ReadingProjection.js').then((m) => m.fetchPost2029ReadingProjection(slug, {
      onPrimary: (projection) => { if (live && admit(projection)) setState({ loading: false, projection, extensionsLoading: true }); },
    })).then((projection) => {
      if (live) setState({ loading: false, projection: admit(projection) ? projection : null, extensionsLoading: false });
    });
    // Home draws the post's own row (image, categories, date) and nothing of the reading projection's extension phase (timeline, verifications, method traces: they live in a
    // collapsed section that only the World surface has). So Home asks for that row, the first read the projection itself makes, and does not load the projection builder
    // or run its extension reads on every entry. A row without an image still goes through the full reader, which may supply one from the post's experience media.
    const task = !home ? loadFull() : getPostBySlug(slug).then((post) => {
      if (!live) return null;
      const draft = Array.isArray(post?.tags) && post.tags.includes('טיוטה');
      if (!post || draft || !postRowToWorldUpdate(post)) { setState({ loading: false, projection: null }); return null; }   // not public Home material: the same outcome the full reader gives
      if (!post.thumb_url && !post.image_url) return loadFull();
      setState({ loading: false, extensionsLoading: false, projection: {
        post, identity: { type: 'post', id: String(post.id), slug: post.slug, href: `/post/${post.slug}` },
        experience: { media: null, timeline: [] }, draft: false,   // the media only supplies an image when the row has none, and then the full reader is used privateStage: false, previewSnapshot: false, extensionsPending: false,
      } });
      return null;
    });
    task.catch(() => { if (live) setState((current) => current.projection
      ? { ...current, loading: false, extensionsLoading: false, extensionsError: true }
      : { loading: false, projection: null }); });
    return () => { live = false; };
  }, [attempt]);
  useEffect(() => {
    if (state.loading || location.hash !== `#${anchor}`) return;
    const frame = requestAnimationFrame(() => document.getElementById(anchor)?.scrollIntoView({ block: 'start', behavior: 'instant' }));
    return () => cancelAnimationFrame(frame);
  }, [anchor, location.hash, state.loading]);
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
      <details className="sod29-flight-time"><summary>הסיפור לאורך הזמן</summary>
        {state.extensionsLoading ? <FrameState kind="loading" title="המקור והחיבורים נטענים" />
          : state.extensionsError ? <FrameState kind="unavailable" title="החיבורים אינם זמינים כרגע">
            <button className="sod29-action" onClick={() => setAttempt(n => n + 1)}>נסה שוב</button>
          </FrameState> : <PostTimeline2029 items={experience.timeline || []} currentHref={identity.href} />}
        {post.modified && post.modified !== post.date ? <p>עדכון הפוסט: {relativeTimeLabel(post.modified)}. עדכון אינו אירוע חדש.</p> : null}
        <p>מועד גילוי החיבורים לא תועד במקור הזמין. תאריכי הפרסום, האירוע ושמירת המדיה נשמרים בנפרד.</p>
      </details>
    </> : null}
  </section>;
}
