// Approved Home composition (reference fa0e26f) inside the single System Frame.
// Presentation over existing public readers: latest posts, cipher posts, home videos and the
// Home projection. Existing capability components arrive as slots so none is duplicated here.
import React, { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Link } from "react-router-dom";
import NavigationIcon2029 from "./NavigationIcon2029.jsx";
import { getLatestPostCards, getPostsFromSupabase, supabase } from "../../lib/supabase.js";
import { HOME_LATEST_POST_LIMIT_2029 } from "../../lib/postReadQueries2029.js";
import { stripHtml } from "../../lib/format.js";
import { levelNumbers } from "../../lib/ratings2029.js";
import { relativeTimeLabel } from "../../lib/relativeTime2029.js";
import ConvergenceRatings2029 from "./ConvergenceRatings2029.jsx";
import HomeHeroMotion2029 from "./HomeHeroMotion2029.jsx";
import { useReveal } from "./useReveal2029.js";
import { realUpdate } from "../../lib/heroUpdate2029.js";
import { recentConvergence, readSeen, markSeen } from "../../lib/homeMotion2029.js";
import PostCategories2029 from "./PostCategories2029.jsx";
import DiscoveryGateways2029 from "./DiscoveryGateways2029.jsx";
import { useSettledBox } from "./useSettledBox2029.js";
import HomeBuildSignup2029 from "./HomeBuildSignup2029.jsx";
import HomeReadNotice2029 from "./HomeReadNotice2029.jsx";
import { claimHomeItems, reserveHomePost } from "../../lib/research/homePlacement2029.js";
import { primaryContentState } from "../../lib/homeReadiness2029.js";
import "./homeMotion2029.css";
import "./homeComposition2029.css";

// data-scroll-anchor marks the blocks the scroll restorer remembers the reading place in (src/lib/scrollRestore2029.js): on a return to Home the person is put back at the same
// place in the same block, and kept there while the layout settles (late content, a held box collapsing because its read failed or came back empty). Attribute only, no visual effect.
const clean = (value) => stripHtml(value == null ? "" : String(value)).trim();
const HOME_UPDATE_SLOTS = 4;       // latest-updates cards shown
// The convergence strip is secondary to the Hero and latest updates. Begin its reader shortly
// before the strip's position reaches the viewport instead of competing with the opening path.
export const HOME_NOTABLE_ROOT_MARGIN = "500px 0px";
// World arrivals and people are farther down the page and fan out to several public readers.
// Give that projection a longer lead, while keeping it out of the cold opening path.
export const HOME_WORLD_PREVIEW_ROOT_MARGIN = "800px 0px";
// Presentation memory only (never data): how many cards the strips showed the last time Home was on screen in this
// session, so a return to Home reserves the same rows while its reads repeat. null = not seen yet (cold load): the updates strip reserves
// the standard four cards (the strip is in the first screen on a wide page: without them everything below it jumps when the cards arrive),
// which is safe because an empty or failed read keeps that box with its message instead of collapsing it. The notable strip and the
// gateways reserve nothing without evidence: they are below the first screen, and a strip that may not exist at all must not leave a gap.
// After a read that came back empty or failed the memory is 0: a retry does not reserve cards that were not there.
const shownBefore = { updates: null, notable: null };
const NBSP = "\u00a0";


function postHref(slugOrPath) {
  const slug = String(slugOrPath || "").replace(/^\/+/, "");
  return slug ? `/post/${slug}` : "/posts";
}

function titleNumber(title, tags) {
  const digits = clean(title).replace(/,/g, "");
  for (const tag of Array.isArray(tags) ? tags : []) {
    if (/^\d{2,5}$/.test(String(tag)) && new RegExp(`(^|\\D)${tag}(\\D|$)`).test(digits)) return Number(tag);
  }
  return null;
}

function useHomeCompositionData({ includeWorld = true, loadNotable = false } = {}) {
  // enriched: the secondary Post-row read (categories / update mark) has settled; notableDone: the strip's reader has settled.
  const [state, setState] = useState({ loading: true, failed: false, enriched: false, notableDone: false, posts: [], notable: [] });
  // A retry repeats the same reads with the same arguments (nothing else changes): the block goes back to its loading state, which keeps the box it holds.
  const [attempt, setAttempt] = useState({ posts: 0, notable: 0 });
  const retryPosts = useCallback(() => {
    setState((current) => ({ ...current, loading: true, failed: false, enriched: false }));
    setAttempt((current) => ({ ...current, posts: current.posts + 1 }));
  }, []);
  const retryNotable = useCallback(() => {
    setState((current) => ({ ...current, notableDone: false }));
    setAttempt((current) => ({ ...current, notable: current.notable + 1 }));
  }, []);
  useEffect(() => {
    let live = true;
    const update = (patch) => { if (live) setState((current) => ({ ...current, ...patch })); };
    getLatestPostCards({ limit: HOME_LATEST_POST_LIMIT_2029 }).then(async (posts) => {
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
      update({ enriched: true, posts: cards.map((post) => ({
        ...post,
        number: titleNumber(post.title, rowsBySlug[post.slug]?.tags),
        update: realUpdate(rowsBySlug[post.slug]),
        categories: rowsBySlug[post.slug]?.categories || post.categories || [],
      })) });
    }).catch(() => update({ loading: false, failed: true, enriched: true, posts: [] }));
    return () => { live = false; };
  }, [attempt.posts]);
  useEffect(() => {
    if (!includeWorld || !loadNotable) return;
    let live = true;
    // Secondary strip below the latest updates: its reader (and the entity-hub/topic projections it
    // imports) loads with this same trigger instead of being part of Home's code before the first cards.
    // Same read, arguments and result; a failed module load stays silent like a failed read (strip hidden).
    // Owner switch fx_home_convergences (freeze): ON = read and keep a copy; OFF = show the last kept copy, no request, no update.
    import("../../lib/runtimeSwitches2029.js")
      .then(async (switches) => {
        if (!(await switches.isRuntimeSwitchOn("fx_home_convergences"))) return { cards: switches.readFrozenSnapshot("fx_home_convergences") || [] };
        const { fetchExplorerFacetPage } = await import("../../lib/research/explorerFacets.js");
        const fresh = await fetchExplorerFacetPage("topic", { limit: 4 });
        if (Array.isArray(fresh?.cards) && fresh.cards.length) switches.saveFrozenSnapshot("fx_home_convergences", fresh.cards);
        return fresh;
      })
      .then((result) => { if (live) setState((current) => ({ ...current, notableDone: true, notable: result?.cards || [] })); })
      .catch(() => { if (live) setState((current) => ({ ...current, notableDone: true })); });
    return () => { live = false; };
  }, [includeWorld, loadNotable, attempt.notable]);
  return { ...state, retryPosts, retryNotable };
}

// Loading slots reuse the loaded cards' own markup/classes, so their geometry follows the same CSS (no fixed heights).
function UpdateCardSlot() {
  return <article className="h29-card is-loading" aria-hidden="true">
    <div className="h29-card-main">
      <div className="h29-media is-empty"><span>{NBSP}</span></div>
      <span className="h29-card-body"><span className="h29-card-t">{NBSP}<br />{NBSP}</span><span className="h29-meta">{NBSP}</span></span>
    </div>
    <span className="k29-cats h29-card-cats"><span className="k29-cat">{NBSP}</span></span>
    <span className="h29-card-open">{NBSP}</span>
  </article>;
}

function NotableCardSlot() {
  return <article className="h29-notable-card is-loading" aria-hidden="true">
    <span className="h29-notable-main"><span className="h29-card-t">{NBSP}<br />{NBSP}</span><span className="h29-notable-nums"><span className="k29-num">{NBSP}</span></span></span>
    <div className="k29-rate"><ul className="k29-rate-row"><li><span className="k29-rate-l">{NBSP}</span></li></ul></div>
  </article>;
}

function Media({ src, fallback, className = "" }) {
  return src
    ? <img className={`h29-media ${className}`} src={src} alt="" loading="lazy" />
    : <div className={`h29-media is-empty ${className}`}><span>{fallback}</span></div>;
}

function Reveal({ id, children, remember = false }) {
  const [ref, reveal] = useReveal(`home:${id}`);
  // The block inside draws its own message when it cannot load (a frame state with its own retry): the slot keeps the box that block held, bounded like any other
  // area's (the settled-box hook's `keep`), so the message appears in the place of the block instead of collapsing the page under the person.
  const [unavailable, setUnavailable] = useState(false);
  // A slot that wraps a self-loading block keeps the box that block settled to (same width), so its own loading and image arrival do not move the page.
  const box = useSettledBox(`reveal:${id}`, { settled: (node) => Boolean(node.firstElementChild?.matches(".sod29-flight-story:not(.is-loading)"))
    && [...node.querySelectorAll("img")].every((image) => image.complete), keep: remember && unavailable });
  const attach = box.ref;
  const setRef = useCallback((node) => { ref.current = node; attach(node); }, [ref, attach]);
  useEffect(() => {
    const node = ref.current;
    if (!remember || !node || typeof MutationObserver === "undefined") return undefined;
    const failed = () => Boolean(node.querySelector(":scope > .sod29-frame-state.state-unavailable"));
    // synchronously: the message is drawn in the same frame the block swaps to its own message, so no frame shows the slot collapsed
    const observer = new MutationObserver(() => flushSync(() => setUnavailable(failed())));
    observer.observe(node, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });   // the block may swap its element or only its class
    setUnavailable(failed());
    return () => observer.disconnect();
  }, [ref, remember]);
  return <div ref={setRef} data-reveal={reveal} data-h29-hold-block={remember ? "" : undefined} data-scroll-anchor={`home:reveal:${id}`} className="k29-reveal k29-rv-self">{children}</div>;
}

function Section({ title, link, label, children, className = "" }) {
  const [ref, reveal] = useReveal(`home:${label || title}`);
  return <section ref={ref} data-reveal={reveal} data-scroll-anchor={`home:${label || title}`} className={`h29-sec k29-reveal ${className}`} aria-label={label || title}>
    {title ? <div className="h29-sec-h"><h2>{title}</h2>{link}</div> : null}
    {children}
  </section>;
}

export default function HomeComposition2029({
  projection, loading, nowHero, story, arrivals, calculator, entry, continuity,
  selectedSlug, onSelectPost, onOpenWorkspace, onWorldPreviewApproach, journeyLocked = false, corePublic = false, worldOpen = false, worldPending,
}) {
  const [notableRequested, setNotableRequested] = useState(false);
  const notableTriggerRef = useRef(null);
  useEffect(() => {
    if (!worldOpen || notableRequested) return undefined;
    const node = notableTriggerRef.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      // Compatibility/accessibility fallback: the strip remains available in older browsers.
      setNotableRequested(true);
      return undefined;
    }
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      setNotableRequested(true);
    }, { rootMargin: HOME_NOTABLE_ROOT_MARGIN });
    observer.observe(node);
    return () => observer.disconnect();
  }, [worldOpen, notableRequested]);
  const data = useHomeCompositionData({ includeWorld: worldOpen, loadNotable: notableRequested });
  const [worldPreviewRequested, setWorldPreviewRequested] = useState(false);
  const worldPreviewTriggerRef = useRef(null);
  useEffect(() => {
    // The initial skeleton is shorter than the settled Hero/update cards. Observing that temporary
    // geometry can arm a far-below section and then have it pushed away by the real cards.
    if (worldPreviewRequested || data.loading || !data.enriched) return undefined;
    const node = worldPreviewTriggerRef.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setWorldPreviewRequested(true);
      onWorldPreviewApproach?.();
      return undefined;
    }
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      setWorldPreviewRequested(true);
      onWorldPreviewApproach?.();
    }, { rootMargin: HOME_WORLD_PREVIEW_ROOT_MARGIN });
    observer.observe(node);
    return () => observer.disconnect();
  }, [data.enriched, data.loading, onWorldPreviewApproach, worldPreviewRequested]);
  const now = projection?.temporalNow || null;
  const people = projection?.worldPreview?.people || [];
  const lead = data.posts[0] || null;
  const heroPostSlug = nowHero ? null : lead?.slug;
  const showFixedStory = Boolean(story) && heroPostSlug !== "flydubai-fz1073-363-14000-remzei-geula";

  // Display priority, shared across all Home blocks: Hero > dedicated story > updates
  // > source arrivals > discovery gateways. Same Post = one representation on Home.
  let reserved = new Set();
  if (heroPostSlug) reserved = reserveHomePost(reserved, lead);
  if (showFixedStory) reserved = reserveHomePost(reserved, { slug: "flydubai-fz1073-363-14000-remzei-geula" });
  const latestPlacement = claimHomeItems(data.posts, reserved, HOME_UPDATE_SLOTS);
  const visiblePosts = latestPlacement.items;
  const sourceRows = projection?.worldPreview?.arrivals || projection?.worldPreview?.items || [];
  const sourcePlacement = claimHomeItems(sourceRows.filter(item => item.kind === "source"), latestPlacement.reserved, 4);
  const homeArrivals = sourcePlacement.items;
  const reservedPostKeys = [...sourcePlacement.reserved];
  // The strip's loading slots appear as soon as the parent says the world gate is still being resolved (worldPending, the gate's own
  // loading state: never the projection's), or once it is open and the strip's reader is pending, so the strip does not appear
  // above the reading position later. An unset worldPending means "not pending".
  const notableSlots = shownBefore.notable || 0;   // unknown or 0 = the strip was not on screen before: reserve nothing
  // notableHeld: this visit started with evidence that the strip belongs here (it was on screen before). If its read then comes back empty or fails, a message
  // stands in the strip's place (with a retry) instead of the whole section disappearing from under the person.
  const [notableHeld] = useState(() => (shownBefore.notable || 0) > 0);
  const notableWaiting = (notableSlots > 0 || notableHeld) && !data.notable.length && (worldOpen ? !data.notableDone : worldPending === true);
  const notableUnavailable = worldOpen && notableHeld && data.notableDone && !data.notable.length;
  const notableShown = (worldOpen && data.notable.length > 0) || notableWaiting || notableUnavailable;
  useEffect(() => {
    if (!data.loading) shownBefore.updates = visiblePosts.length;
    if (worldOpen && data.notableDone) shownBefore.notable = data.notable.length;
    else if (!worldOpen && worldPending === false) shownBefore.notable = 0;   // the parent resolved the gate as closed
  }, [data.loading, data.notableDone, data.notable.length, visiblePosts.length, worldOpen, worldPending]);
  // Returning to Home: each strip keeps the box it settled to while it loads again (see useSettledBox).
  // The hero keeps its settled box while it loads / enriches, for the same lead Post as last time (its own enrichment lives in HomeHeroMotion2029).
  const heroBox = useSettledBox("home:hero", { pending: data.loading, settled: Boolean(lead), count: lead?.slug || "", keep: !data.loading && !lead });
  const updatesPending = data.loading || !data.enriched;
  // No posts after the read settled: a message stands in the strip's place and keeps the box the strip held (nothing below it moves); an empty strip is not remembered.
  const updatesEmpty = !data.loading && !data.posts.length;
  const updatesBox = useSettledBox("home:updates", { pending: updatesPending && !updatesEmpty, settled: !updatesPending && visiblePosts.length > 0, count: visiblePosts.length, keep: updatesEmpty });
  const notableBox = useSettledBox("home:notable", { pending: notableWaiting, settled: data.notableDone && data.notable.length > 0, count: data.notable.length, keep: notableUnavailable });
  const [seen, setSeen] = useState(readSeen);
  const see = (key) => setSeen((current) => (current[key] ? current : markSeen(key, current)));

  // Non-visual: real hero or real update cards decide ready; loading slots and the loading hero never do; a settled outcome
  // without content is explicit (empty / error).
  const primary = primaryContentState({ loading: data.loading, failed: data.failed, hasHero: Boolean(nowHero) || Boolean(lead), postCount: visiblePosts.length });
  return <div className="h29" data-experience-capability="home-composition" data-h29-primary={primary}>
    {nowHero || <div className="h29-hero-slot" ref={heroBox.ref} data-h29-hold={heroBox.hold} data-scroll-anchor="home:hero">
      {lead ? <HomeHeroMotion2029 lead={lead} href={postHref(lead.slug)} includeWorld={worldOpen} /> : <section className={`h29-hero${data.loading ? " is-loading" : " is-unavailable"}`} aria-busy={data.loading}><div className="h29-hero-copy"><div className="h29-kicker">עכשיו</div><h1>{data.loading ? "טוען את מה שחי עכשיו…" : "SOD1820"}</h1>{!data.loading ? <p>העדכונים אינם זמינים כרגע. אפשר להמשיך לצפנים, למחשבון או לצ׳אט.</p> : null}{!data.loading ? <div className="h29-actions"><button type="button" className="h29-btn" onClick={data.retryPosts}>נסו שוב</button></div> : null}</div></section>}
    </div>}

    {corePublic ? <section className="h29-quiet" aria-label="מצב האתר" data-home-launch-notice="gradual-opening" data-scroll-anchor="home:launch-notice">
      <strong>המערכת בבנייה, והחלקים נפתחים בהדרגה.</strong>
      <span>כבר עכשיו אפשר לקרוא פוסטים{worldOpen ? ", לגלות את העולם" : ""}, לחקור ELS, לחשב גימטריה ולהיכנס לצ׳אט.</span>
    </section> : null}

    <Section title="עדכונים אחרונים" link={<Link to="/posts">כל העדכונים ←</Link>}>
      <div className="h29-updates" ref={updatesBox.ref} data-h29-hold={updatesBox.hold} data-h29-loading={data.loading && updatesBox.held ? "" : undefined} data-h29-notice={updatesEmpty ? "" : undefined}>
        {visiblePosts.map((post, index) => {
          const unseen = Boolean(post.update) && !seen[post.update.key];
          // One pulse at a time, only among visible updates (never the featured Hero).
          const pulses = unseen && index === visiblePosts.findIndex(item => item.update && !seen[item.update.key]);
          return <article key={post.slug} style={{ "--i": index }} className={`h29-card k29-rv${selectedSlug === post.slug ? " is-selected" : ""}${pulses ? " is-pulse" : ""}`}>
            <button type="button" className="h29-card-main" aria-pressed={selectedSlug === post.slug} onClick={() => { if (unseen) see(post.update.key); onSelectPost?.(post); }}>
              <Media src={post.poster} fallback={post.number || "✦"} />
              <span className="h29-card-body"><span className="h29-card-t">{clean(post.title)}</span><span className="h29-meta">{relativeTimeLabel(post.modified)}{post.number ? ` · ${post.number}` : ""}</span>
                {post.update ? <span className="h29-upd"><i className={`h29-dot${unseen ? " is-new" : ""}`} aria-hidden="true" />עודכן {relativeTimeLabel(post.update.at)} · {post.update.label}</span>
                  : null}</span>
            </button>
            {!data.enriched && !(post.categories || []).length ? <span className="k29-cats h29-card-cats is-slot" aria-hidden="true"><span className="k29-cat">{NBSP}</span></span>
              : <PostCategories2029 categories={post.categories} max={3} className="h29-card-cats" />}
            <Link className="h29-card-open" to={post.update?.targetHref || postHref(post.slug)}>{post.update?.targetHref ? "לקטע שעודכן ←" : "לקריאה ←"}</Link>
          </article>;
        })}
        {data.loading && !updatesBox.held ? Array.from({ length: shownBefore.updates ?? HOME_UPDATE_SLOTS }, (_, index) => <UpdateCardSlot key={`slot-${index}`} />) : null}
        {updatesEmpty ? <HomeReadNotice2029 onRetry={data.retryPosts}>{data.failed ? "העדכונים האחרונים אינם זמינים כרגע." : "אין כרגע פוסטים להצגה."}</HomeReadNotice2029> : null}
      </div>
    </Section>

    <div ref={notableTriggerRef} className="h29-notable-trigger" data-h29-notable-load-state={notableRequested ? "armed" : "deferred"}>
    {notableShown ? <Section title="התכנסויות בולטות" link={<Link to="/world#world-all-convergences">כל ההתכנסויות ←</Link>}>
      <p className="h29-note">מסודרות לפי מד ההתכנסות הקיים. המדדים נפרדים: איכות, חוזק וסימוני זהב ויהלום.</p>
      <div className="h29-notable" ref={notableBox.ref} data-h29-hold={notableBox.hold} data-h29-loading={notableWaiting && notableBox.held ? "" : undefined} data-h29-notice={notableUnavailable ? "" : undefined} aria-busy={notableWaiting ? "true" : undefined}>
        {notableUnavailable ? <HomeReadNotice2029 onRetry={data.retryNotable}>ההתכנסויות הבולטות אינן זמינות כרגע.</HomeReadNotice2029> : null}
        {notableWaiting && !notableBox.held ? Array.from({ length: notableSlots }, (_, index) => <NotableCardSlot key={`slot-${index}`} />) : null}
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
    </div>

    {story && showFixedStory ? <Reveal id="story" remember>{story}</Reveal> : null}

    <div ref={worldPreviewTriggerRef} className="h29-world-preview-trigger" data-h29-world-preview-load-state={worldPreviewRequested ? "armed" : "deferred"} />
    <DiscoveryGateways2029 excludedPostKeys={reservedPostKeys} />

    {arrivals ? <Reveal id="arrivals">{typeof arrivals === "function" ? arrivals(homeArrivals) : arrivals}</Reveal> : null}

    <Section label="כותבים וערוצים">
      <div className="h29-anchors">
        <Link className="h29-anchor k29-rv" to="/world"><span className="h29-glyph is-people"><NavigationIcon2029 name="community" /></span>
          <span><b>הכותבים</b><small>{people.length ? people.map((person) => person.displayName).join(" · ") : "הכותבים שמקורותיהם בעולם"}</small></span></Link>
        <a className="h29-anchor k29-rv" href="/or-geula"><span className="h29-glyph is-geula"><NavigationIcon2029 name="spark" /></span>
          <span><b>אור הגאולה</b><small>רמזי הגאולה לאורך השנים</small></span></a>
      </div>
    </Section>

    <Section label="כלים וכניסות">
      <div className="h29-portions">
        {calculator}
        {corePublic && worldOpen ? <Link className="h29-portion k29-rv" to="/world" data-home-world="open"><span className="h29-portion-h"><NavigationIcon2029 name="cosmos" />העולם</span><small>מקורות, סיפורים וחיבורים במקום אחד</small></Link> : null}
        {!corePublic && now ? <Link className="h29-portion k29-rv" to={`/number/${now.value}`}><span className="h29-portion-h"><NavigationIcon2029 name="number" />מספר העת</span>
          <span className="h29-daynum">{now.value}</span><small>{now.yearLabel}</small></Link> : null}
        {corePublic ? <a className="h29-portion k29-rv" href="/community/chat"><span className="h29-portion-h"><NavigationIcon2029 name="community" />צ׳אט</span><small>לשיחות הקהילה</small></a>
          : <a className="h29-portion k29-rv" href="/archive"><span className="h29-portion-h"><NavigationIcon2029 name="books" />ארכיון</span><small>שנים של פוסטים, לפי שנה ונושא</small></a>}
        {journeyLocked
          ? <div className="h29-portion k29-rv is-locked" aria-disabled="true" data-home-life-journey="locked"><span className="h29-portion-h"><NavigationIcon2029 name="door" />מסע החיים · נעול</span><small>ייפתח לאחר השלמת ההגדרה</small></div>
          : <Link className="h29-portion k29-rv" to="/journey" data-home-life-journey="open"><span className="h29-portion-h"><NavigationIcon2029 name="door" />מתחילים כאן</span><small>מסע קצר עם השם והתאריך שלכם</small></Link>}
        <button className="h29-portion k29-rv" type="button" onClick={onOpenWorkspace} data-home-user-area="open"><span className="h29-portion-h"><NavigationIcon2029 name="community" />האזור האישי שלי</span><small>חשבון, פרופיל והדברים ששמרתם</small></button>
      </div>
    </Section>

    <HomeBuildSignup2029 />

    {entry}
    {continuity}

  </div>;
}

