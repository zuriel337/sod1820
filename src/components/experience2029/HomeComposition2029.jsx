// Approved Home composition (reference fa0e26f) inside the single System Frame.
// Presentation over existing public readers: latest posts, cipher posts, home videos and the
// Home projection. Existing capability components arrive as slots so none is duplicated here.
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import NavigationIcon2029 from "./NavigationIcon2029.jsx";
import { getLatestPostCards, getTzofonStories, getHomeVideos, getPostsFromSupabase } from "../../lib/supabase.js";
import { stripHtml } from "../../lib/format.js";
import "./homeComposition2029.css";

const clean = (value) => stripHtml(value == null ? "" : String(value)).trim();

function shortDate(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("he-IL", { day: "numeric", month: "numeric" });
}

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

function useHomeCompositionData() {
  const [state, setState] = useState({ loading: true, posts: [], ciphers: [], videos: [], dimensionPost: null });
  useEffect(() => {
    let live = true;
    Promise.allSettled([
      getLatestPostCards({ limit: 4 }),
      getTzofonStories({ limit: 6 }),
      getHomeVideos({ limit: 6 }),
      getPostsFromSupabase({ limit: 1, tag: "מימד חמש" }),
      getPostsFromSupabase({ limit: 8 }),
    ]).then(([posts, ciphers, videos, dimension, tagged]) => {
      if (!live) return;
      const value = (result, fallback) => (result.status === "fulfilled" && result.value) || fallback;
      const numberByTitle = new Map((value(tagged, {}).posts || []).map((post) => [clean(post.title), titleNumber(post.title, post.tags)]));
      setState({
        loading: false,
        posts: value(posts, []).map((post) => ({ ...post, number: numberByTitle.get(clean(post.title)) ?? null })),
        ciphers: value(ciphers, []),
        videos: value(videos, []),
        dimensionPost: (value(dimension, {}).posts || [])[0] || null,
      });
    });
    return () => { live = false; };
  }, []);
  return state;
}

function Media({ src, fallback, className = "" }) {
  return src
    ? <img className={`h29-media ${className}`} src={src} alt="" loading="lazy" />
    : <div className={`h29-media is-empty ${className}`}><span>{fallback}</span></div>;
}

function Section({ title, link, label, children, className = "" }) {
  return <section className={`h29-sec ${className}`} aria-label={label || title}>
    {title ? <div className="h29-sec-h"><h2>{title}</h2>{link}</div> : null}
    {children}
  </section>;
}

export default function HomeComposition2029({
  projection, loading, nowHero, story, arrivals, calculator, entry, continuity,
  selectedSlug, onSelectPost,
}) {
  const data = useHomeCompositionData();
  const now = projection?.temporalNow || null;
  const people = projection?.worldPreview?.people || [];
  const pulse = projection?.systemPulse || null;
  const lead = data.posts[0] || null;

  return <div className="h29" data-experience-capability="home-composition">
    {nowHero || (lead ? <section className="h29-hero" aria-label="העדכון האחרון">
      {lead.poster ? <img className="h29-hero-img" src={lead.poster} alt="" loading="eager" /> : null}
      <div className="h29-hero-copy">
        <div className="h29-kicker">העדכון האחרון</div>
        <h1>{clean(lead.title)}</h1>
        <div className="h29-actions">
          <Link className="h29-btn is-primary" to={postHref(lead.slug)}>לקריאה ←</Link>
          <Link className="h29-btn" to="/world">לעולם</Link>
        </div>
      </div>
    </section> : <section className="h29-hero is-loading" aria-busy="true"><div className="h29-hero-copy"><div className="h29-kicker">עכשיו</div><h1>טוען את מה שחי עכשיו…</h1></div></section>)}

    <Section title="עדכונים אחרונים" link={<Link to="/2029/posts">כל העדכונים ←</Link>}>
      <div className="h29-updates">
        {data.posts.map((post) => <article key={post.slug} className={`h29-card${selectedSlug === post.slug ? " is-selected" : ""}`}>
          <button type="button" className="h29-card-main" aria-pressed={selectedSlug === post.slug} onClick={() => onSelectPost?.(post)}>
            <Media src={post.poster} fallback={post.number || "✦"} />
            <span className="h29-card-body"><span className="h29-card-t">{clean(post.title)}</span><span className="h29-meta">{shortDate(post.modified)}{post.number ? ` · ${post.number}` : ""}</span></span>
          </button>
          <Link className="h29-card-open" to={postHref(post.slug)}>לקריאה ←</Link>
        </article>)}
        {data.loading ? <div className="h29-skel" aria-hidden="true" /> : null}
      </div>
    </Section>

    {story}

    <Section label="צפנים וסרטים">
      <div className="h29-strips">
        <div className="h29-strip">
          <div className="h29-sec-h"><h2>הצפנים האחרונים בתורה</h2><Link to="/els">כל הצפנים ←</Link></div>
          <div className="h29-strip-row">
            {data.ciphers.map((cipher) => <Link key={cipher.id} className="h29-tile" to={postHref(cipher.link_url)}>
              <Media src={cipher.thumb_url} fallback="✦" /><span>{clean(cipher.text)}</span>
            </Link>)}
            {!data.loading && !data.ciphers.length ? <p className="h29-empty">אין צפנים להצגה כרגע.</p> : null}
          </div>
        </div>
        <div className="h29-strip">
          <div className="h29-sec-h"><h2>הסרטים האחרונים</h2><a href="/archive">כל הסרטים ←</a></div>
          <div className="h29-strip-row">
            {data.videos.map((video) => <a key={video.yt || video.slug} className="h29-tile is-video" href={video.slug ? `/${video.slug}` : "/archive"}>
              <Media src={video.poster_url || (video.yt ? `https://i.ytimg.com/vi/${video.yt}/hqdefault.jpg` : null)} fallback="▶" />
              <span>{clean(video.title)}</span>
            </a>)}
            {!data.loading && !data.videos.length ? <p className="h29-empty">אין סרטים להצגה כרגע.</p> : null}
          </div>
        </div>
      </div>
    </Section>

    {arrivals}

    <Section label="מוקדי זהות">
      <div className="h29-anchors">
        <Link className="h29-anchor" to="/world"><span className="h29-glyph is-people"><NavigationIcon2029 name="community" /></span>
          <span><b>הכותבים</b><small>{people.length ? people.map((person) => person.displayName).join(" · ") : "הכותבים שמקורותיהם בעולם"}</small></span></Link>
        <Link className="h29-anchor" to={data.dimensionPost?.slug ? postHref(data.dimensionPost.slug) : "/2029/posts"}><span className="h29-glyph is-dim"><NavigationIcon2029 name="cosmos" /></span>
          <span><b>מימד חמש</b><small>{data.dimensionPost ? clean(data.dimensionPost.title) : "עשר הספירות, מפת ישראל ותודעה"}</small></span></Link>
        <a className="h29-anchor" href="/or-geula"><span className="h29-glyph is-geula"><NavigationIcon2029 name="spark" /></span>
          <span><b>אור הגאולה</b><small>רמזי הגאולה לאורך השנים</small></span></a>
      </div>
    </Section>

    <Section label="כלים וכניסות">
      <div className="h29-portions">
        {calculator}
        {now ? <Link className="h29-portion" to={`/2029/number/${now.value}`}><span className="h29-portion-h"><NavigationIcon2029 name="number" />מספר העת</span>
          <span className="h29-daynum">{now.value}</span><small>{now.yearLabel}</small></Link> : null}
        <a className="h29-portion" href="/archive"><span className="h29-portion-h"><NavigationIcon2029 name="books" />ארכיון</span><small>שנים של פוסטים, לפי שנה ונושא</small></a>
        <Link className="h29-portion" to="/2029/journey"><span className="h29-portion-h"><NavigationIcon2029 name="door" />מתחילים כאן</span><small>מסע קצר עם השם והתאריך שלכם</small></Link>
        <a className="h29-portion" href="/community"><span className="h29-portion-h"><NavigationIcon2029 name="community" />קהילה</span><small>מחקר משותף ותרומות</small></a>
      </div>
    </Section>

    {entry}
    {continuity}

    <section className="h29-quiet" aria-label="דופק ומצב בנייה">
      <span>{pulse?.corpusTotal ? `${Number(pulse.corpusTotal).toLocaleString("he-IL")} ביטויים במאגר${pulse.contributions7d ? ` · ${pulse.contributions7d} תרומות השבוע` : ""}` : loading ? "בודק מה זז עכשיו…" : "האתר מתחדש. כל אזור נפתח לציבור כשהוא בשל."}</span>
      <a href="/map">מה כבר חי ומה בדרך ←</a>
    </section>
  </div>;
}

