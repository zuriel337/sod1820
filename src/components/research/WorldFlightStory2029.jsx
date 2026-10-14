import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FrameState } from '../experience2029/Sod2029Shell.jsx';
import NavigationIcon2029 from '../experience2029/NavigationIcon2029.jsx';
import PostTimeline2029 from '../experience2029/PostTimeline2029.jsx';
import { worldPainted } from '../../lib/earlyWorld.js';
import { WORLD_TIER, idleRun, WORLD_POSTS_FULL, WORLD_POSTS_OFF } from '../../lib/worldPostsMode.js';
import { postRowToWorldUpdate } from '../../lib/research/worldDiscoveryStream.js';
import '../../pages/home-world-story2029.css';
import PostCategories2029 from '../experience2029/PostCategories2029.jsx';
import { relativeTimeLabel } from '../../lib/relativeTime2029.js';

const slug = 'flydubai-fz1073-363-14000-remzei-geula';
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
    // EXPERIMENT: full = the reading projection (connections, timeline, traces); basic = one narrow
    // row for the card; off = no post request, reserved space only.
    const readNow = () => WORLD_POSTS_FULL
      ? import('../../lib/research/post2029ReadingProjection.js').then((m) => m.fetchPost2029ReadingProjection(slug))
      : WORLD_POSTS_OFF ? Promise.resolve(null)
      : import('../../lib/supabase.js').then(async ({ supabase }) => {
        const { data, error } = await supabase.from('posts').select('id,slug,title,excerpt,author,source,tags,home_hidden,date,modified,image_url,thumb_url,categories').eq('slug', slug).limit(1);
        if (error || !data?.length) return null;
        return { post: data[0], identity: { href: `/post/${encodeURIComponent(data[0].slug)}` }, experience: { timeline: [], media: null } };
      });
    const read = new Promise((resolve, reject) => { const go = () => readNow().then(resolve, reject); if (WORLD_TIER && surface === 'world') worldPainted.then(() => idleRun(go, 1500)); else go(); });
    read.then((projection) => {
      // This consumer never adopts a private stage or preview snapshot as public material.
      const admitted = projection && !projection.draft && !projection.privateStage && !projection.previewSnapshot
        && postRowToWorldUpdate(projection.post);
      if (live) setState({ loading: false, projection: admitted ? projection : null });
    }).catch(() => { if (live) setState({ loading: false, projection: null }); });
    return () => { live = false; };
  }, [attempt]);
  useEffect(() => {
    if (state.loading || location.hash !== `#${anchor}`) return;
    const frame = requestAnimationFrame(() => document.getElementById(anchor)?.scrollIntoView({ block: 'start', behavior: 'instant' }));
    return () => cancelAnimationFrame(frame);
  }, [anchor, location.hash, state.loading]);
  if (WORLD_POSTS_OFF) return <section id={anchor} className="sod29-flight-story is-world is-loading" data-world-posts-reserved aria-hidden="true" style={{ height: window.matchMedia('(max-width:760px)').matches ? 668 : 573 }} />;
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
        <PostTimeline2029 items={experience.timeline || []} currentHref={identity.href} />
        {post.modified && post.modified !== post.date ? <p>עדכון הפוסט: {relativeTimeLabel(post.modified)}. עדכון אינו אירוע חדש.</p> : null}
        <p>מועד גילוי החיבורים לא תועד במקור הזמין. תאריכי הפרסום, האירוע ושמירת המדיה נשמרים בנפרד.</p>
      </details>
    </> : null}
  </section>;
}
