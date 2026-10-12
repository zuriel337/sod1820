// Approved Home composition (reference fa0e26f) inside the single System Frame.
// Presentation over existing public readers: latest posts, cipher posts, home videos and the
// Home projection. Existing capability components arrive as slots so none is duplicated here.
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import NavigationIcon2029 from "./NavigationIcon2029.jsx";
import { getLatestPostCards, getTzofonStories, getHomeVideos, getPostsFromSupabase, supabase } from "../../lib/supabase.js";
import { stripHtml } from "../../lib/format.js";
import { fetchExplorerFacetPage } from "../../lib/research/explorerFacets.js";
import { levelNumbers } from "../../lib/ratings2029.js";
import { relativeTimeLabel } from "../../lib/relativeTime2029.js";
import ConvergenceRatings2029 from "./ConvergenceRatings2029.jsx";
import HomeHeroMotion2029 from "./HomeHeroMotion2029.jsx";
import { useReveal } from "./useReveal2029.js";
import { realUpdate } from "../../lib/heroUpdate2029.js";
import { recentConvergence, readSeen, markSeen } from "../../lib/homeMotion2029.js";
import PostCategories2029 from "./PostCategories2029.jsx";
import "./homeMotion2029.css";
import "./homeComposition2029.css";

const clean = (value) => stripHtml(value == null ? "" : String(value)).trim();


function postHref(slugOrPath) {
  const slug = String(slugOrPath || "").replace(/^\/+/, "");
  return slug ? `/post/${slug}` : "/2029/posts";
}

function titleNumber(title, tags) {
  const digits = clean(title).replace(/,/g, "");
  for (const tag of Array.isArray(tags) ? tags : []) {
    if (/^\d{2,5}$/.test(String(tag)) && new RegExp(`(^|\\D)${tag}(\\D|$)`).test(digits)) return Number(tag);
  }
  return null;
}

function useHomeCompositionData({ includeWorld = true } = {}) {
  const [state, setState] = useState({ loading: true, posts: [], ciphers: [], videos: [], dimensionPost: null, notable: [] });
  useEffect(() => {
    let live = true;
    const update = (patch) => { if (live) setState((current) => ({ ...current, ...patch })); };
    getLatestPostCards({ limit: 4 }).then(async (posts) => {
      if (!live) return;
      const cards = Array.isArray(posts) ? posts : [];
      update({ loading: false, posts: cards });
      // Enrichment must not hold back the latest post and its hero.
      const slugs = cards.map((post) => post.slug).filter(Boolean);
      let rowsBySlug = {};
      try {
        if (supabase && slugs.length) {
          const { data: rows } = await supabase.from("posts").select("id,slug,date,modified,categories,source,tags,home_hidden").in("slug", slugs);
          rowsBySlug = Object.fromEntries((rows || []).map((row) => [row.slug, row]));
        }
      } catch (_) { /* the cards simply show no mark */ }
      update({ posts: cards.map((post) => ({
        ...post,
        number: titleNumber(post.title, rowsBySlug[post.slug]?.tags),
        update: realUpdate(rowsBySlug[post.slug]),
        categories: rowsBySlug[post.slug]?.categories || post.categories || [],
      })) });
    }).catch(() => update({ loading: false, posts: [] }));
    getTzofonStories({ limit: 6 }).then((ciphers) => update({ ciphers: ciphers || [] })).catch(() => {});
    if (includeWorld) {
      getHomeVideos({ limit: 6 }).then((videos) => update({ videos: videos || [] })).catch(() => {});
      getPostsFromSupabase({ limit: 1, tag: "מימד חמש" }).then((result) => update({ dimensionPost: result?.posts?.[0] || null })).catch(() => {});
      fetchExplorerFacetPage("topic", { limit: 4 }).then((result) => update({ notable: result?.cards || [] })).catch(() => {});
    }
    return () => { live = false; };
  }, [includeWorld]);
  return state;
}

function Media({ src, fallback, className = "" }) {
  return src
    ? <img className={`h29-media ${className}`} src={src} alt="" loading="lazy" />
    : <div className={`h29-media is-empty ${className}`}><span>{fallback}</span></div>;
}

function Reveal({ id, children }) {
  const [ref, reveal] = useReveal(`home:${id}`);
  return <div ref={ref} data-reveal={reveal} className="k29-reveal k29-rv-self">{children}</div>;
}

function Section({ title, link, label, children, className = "" }) {
  const [ref, reveal] = useReveal(`home:${label || title}`);
  return <section ref={ref} data-reveal={reveal} className={`h29-sec k29-reveal ${className}`} aria-label={label || title}>
    {title ? <div className="h29-sec-h"><h2>{title}</h2>{link}</div> : null}
    {children}
  </section>;
}

export default function HomeComposition2029({
  projection, loading, nowHero, story, arrivals, calculator, entry, continuity,
  selectedSlug, onSelectPost, journeyLocked = false, corePublic = false, worldOpen = false,
}) {
  const data = useHomeCompositionData({ includeWorld: !corePublic });
  const now = projection?.temporalNow || null;
  const people = projection?.worldPreview?.people || [];
  const pulse = projection?.systemPulse || null;
  const lead = data.posts[0] || null;
  const [seen, setSeen] = useState(readSeen);
  const see = (key) => setSeen((current) => (current[key] ? current : markSeen(key, current)));

  return <div className="h29" data-experience-capability="home-composition">
    {nowHero || (lead ? <HomeHeroMotion2029 lead={lead} href={postHref(lead.slug)} includeWorld={!corePublic} /> : <section className={`h29-hero${data.loading ? " is-loading" : ""}`} aria-busy={data.loading}><div className="h29-hero-copy"><div className="h29-kicker">עכשיו</div><h1>{data.loading ? "טוען את מה שחי עכשיו…" : "SOD1820"}</h1>{!data.loading ? <p>העדכונים אינם זמינים כרגע. אפשר להמשיך לצפנים, למחשבון או לצ׳אט.</p> : null}</div></section>)}

    {corePublic ? <section className="h29-quiet" aria-label="מצב האתר" data-home-launch-notice="gradual-opening">
      <strong>המערכת בבנייה, והחלקים נפתחים בהדרגה.</strong>
      <span>כבר עכשיו אפשר לקרוא פוסטים{worldOpen ? ", לגלות את העולם" : ""}, לחקור ELS, לחשב גימטריה ולהיכנס לצ׳אט הוותיק.</span>
    </section> : null}

    <Section title="עדכונים אחרונים" link={<Link to="/2029/posts">כל העדכונים ←</Link>}>
      <div className="h29-updates">
        {data.posts.map((post, index) => {
          const unseen = Boolean(post.update) && !seen[post.update.key];
          // One pulse at a time: the first card repeats the main item (which pulses itself), so only the first other unseen update pulses.
          const pulses = unseen && index === data.posts.findIndex((item, i) => i > 0 && item.update && !seen[item.update.key]);
          return <article key={post.slug} style={{ "--i": index }} className={`h29-card k29-rv${selectedSlug === post.slug ? " is-selected" : ""}${pulses ? " is-pulse" : ""}`}>
            <button type="button" className="h29-card-main" aria-pressed={selectedSlug === post.slug} onClick={() => { if (unseen) see(post.update.key); onSelectPost?.(post); }}>
              <Media src={post.poster} fallback={post.number || "✦"} />
              <span className="h29-card-body"><span className="h29-card-t">{clean(post.title)}</span><span className="h29-meta">{relativeTimeLabel(post.modified)}{post.number ? ` · ${post.number}` : ""}</span>
                {post.update ? <span className="h29-upd"><i className={`h29-dot${unseen ? " is-new" : ""}`} aria-hidden="true" />עודכן {relativeTimeLabel(post.update.at)} · {post.update.label}</span> : null}</span>
            </button>
            <PostCategories2029 categories={post.categories} max={3} className="h29-card-cats" />
            <Link className="h29-card-open" to={post.update?.targetHref || postHref(post.slug)}>{post.update?.targetHref ? "לקטע שעודכן ←" : "לקריאה ←"}</Link>
          </article>;
        })}
        {data.loading ? <div className="h29-skel" aria-hidden="true" /> : null}
        {!data.loading && !data.posts.length ? <p className="h29-empty">אין כרגע פוסטים להצגה.</p> : null}
      </div>
    </Section>

    {!corePublic && data.notable.length ? <Section title="התכנסויות בולטות" link={<Link to="/world#world-all-convergences">כל ההתכנסויות ←</Link>}>
      <p className="h29-note">מסודרות לפי מד ההתכנסות הקיים. המדדים נפרדים: איכות, חוזק וסימוני זהב ויהלום.</p>
      <div className="h29-notable">
        {data.notable.map((card, index) => {
          const fresh = recentConvergence(card.approvedAt);
          const freshKey = `topic:${card.id}:approved:${card.approvedAt}`;
          const unseen = fresh && !seen[freshKey];
          return <article className={`h29-notable-card k29-rv${unseen ? " is-pulse" : ""}`} style={{ "--i": index }} key={card.id}>
          <Link className="h29-notable-main" to={card.href} onClick={() => { if (unseen) see(freshKey); }}>
            <span className="h29-card-t">{clean(card.label)}</span>
            {card.numbers?.length ? <span className="h29-notable-nums">{levelNumbers(card.numbers, card.highlightNumbers, 4).map(({ n, level }) => <span key={n} className={`k29-num is-l${level}`}>{n}</span>)}</span> : null}
          </Link>
          {fresh ? <span className="h29-upd"><i className={`h29-dot${unseen ? " is-new" : ""}`} aria-hidden="true" />אושרה לאחרונה</span> : null}
          <ConvergenceRatings2029 quality={card.quality} meterScore={card.meterScore} highlightNumbers={card.highlightNumbers} numbers={card.numbers} autoTiers={index < 4} />
        </article>;
        })}
      </div>
    </Section> : null}

    {story ? <Reveal id="story">{story}</Reveal> : null}

    <Section label="צפנים וסרטים">
      <div className="h29-strips">
        <div className="h29-strip k29-rv">
          <div className="h29-sec-h"><h2>הצפנים האחרונים בתורה</h2><Link to="/els">כל הצפנים ←</Link></div>
          <div className="h29-strip-row">
            {data.ciphers.map((cipher) => <Link key={cipher.id} className="h29-tile" to={postHref(cipher.link_url)}>
              <Media src={cipher.thumb_url} fallback="✦" /><span>{clean(cipher.text)}</span>
            </Link>)}
            {!data.loading && !data.ciphers.length ? <p className="h29-empty">אין צפנים להצגה כרגע.</p> : null}
          </div>
        </div>
        {!corePublic ? <div className="h29-strip k29-rv">
          <div className="h29-sec-h"><h2>הסרטים האחרונים</h2><a href="/archive">כל הסרטים ←</a></div>
          <div className="h29-strip-row">
            {data.videos.map((video) => <a key={video.yt || video.slug} className="h29-tile is-video" href={video.slug ? `/${video.slug}` : "/archive"}>
              <Media src={video.poster_url || (video.yt ? `https://i.ytimg.com/vi/${video.yt}/hqdefault.jpg` : null)} fallback="▶" />
              <span>{clean(video.title)}</span>
            </a>)}
            {!data.loading && !data.videos.length ? <p className="h29-empty">אין סרטים להצגה כרגע.</p> : null}
          </div>
        </div> : null}
      </div>
    </Section>

    {arrivals ? <Reveal id="arrivals">{arrivals}</Reveal> : null}

    {!corePublic ? <Section label="מוקדי זהות">
      <div className="h29-anchors">
        <Link className="h29-anchor k29-rv" to="/world"><span className="h29-glyph is-people"><NavigationIcon2029 name="community" /></span>
          <span><b>הכותבים</b><small>{people.length ? people.map((person) => person.displayName).join(" · ") : "הכותבים שמקורותיהם בעולם"}</small></span></Link>
        <Link className="h29-anchor k29-rv" to={data.dimensionPost?.slug ? postHref(data.dimensionPost.slug) : "/2029/posts"}><span className="h29-glyph is-dim"><NavigationIcon2029 name="cosmos" /></span>
          <span><b>מימד חמש</b><small>{data.dimensionPost ? clean(data.dimensionPost.title) : "עשר הספירות, מפת ישראל ותודעה"}</small></span></Link>
        <a className="h29-anchor k29-rv" href="/or-geula"><span className="h29-glyph is-geula"><NavigationIcon2029 name="spark" /></span>
          <span><b>אור הגאולה</b><small>רמזי הגאולה לאורך השנים</small></span></a>
      </div>
    </Section> : null}

    <Section label="כלים וכניסות">
      <div className="h29-portions">
        {calculator}
        {corePublic && worldOpen ? <Link className="h29-portion k29-rv" to="/world" data-home-world="open"><span className="h29-portion-h"><NavigationIcon2029 name="cosmos" />העולם</span><small>מקורות, סיפורים וחיבורים במקום אחד</small></Link> : null}
        {!corePublic && now ? <Link className="h29-portion k29-rv" to={`/2029/number/${now.value}`}><span className="h29-portion-h"><NavigationIcon2029 name="number" />מספר העת</span>
          <span className="h29-daynum">{now.value}</span><small>{now.yearLabel}</small></Link> : null}
        {corePublic ? <a className="h29-portion k29-rv" href="/community/chat"><span className="h29-portion-h"><NavigationIcon2029 name="community" />הצ׳אט הוותיק</span><small>ממשיכים את השיחה הקיימת</small></a>
          : <a className="h29-portion k29-rv" href="/archive"><span className="h29-portion-h"><NavigationIcon2029 name="books" />ארכיון</span><small>שנים של פוסטים, לפי שנה ונושא</small></a>}
        {journeyLocked
          ? <div className="h29-portion k29-rv is-locked" aria-disabled="true" data-home-life-journey="locked"><span className="h29-portion-h"><NavigationIcon2029 name="door" />מסע החיים · נעול</span><small>ייפתח לאחר השלמת ההגדרה</small></div>
          : <Link className="h29-portion k29-rv" to="/2029/journey" data-home-life-journey="open"><span className="h29-portion-h"><NavigationIcon2029 name="door" />מתחילים כאן</span><small>מסע קצר עם השם והתאריך שלכם</small></Link>}
        <div className="h29-portion k29-rv is-locked" aria-disabled="true" data-home-user-area="locked"><span className="h29-portion-h"><NavigationIcon2029 name="community" />אזור משתמשים · נעול</span><small>ייפתח לאחר השלמת החיבור והבדיקות</small></div>
      </div>
    </Section>

    {entry}
    {continuity}

    <section className="h29-quiet" aria-label="דופק ומצב בנייה">
      <span>{pulse?.corpusTotal ? `${Number(pulse.corpusTotal).toLocaleString("he-IL")} ביטויים במאגר${pulse.contributions7d ? ` · ${pulse.contributions7d} תרומות השבוע` : ""}` : loading ? "בודק מה זז עכשיו…" : "האתר מתחדש. כל אזור נפתח לציבור כשהוא בשל."}</span>
      {!corePublic ? <a href="/map">מה כבר חי ומה בדרך ←</a> : null}
    </section>
  </div>;
}

