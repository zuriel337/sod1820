// HOME_LAYOUT_PREVIEW_V1 — isolated, unlinked, noindex preview of the Home composition from the
// unified handoff (work_log 4e8c4d18): eight Home sections, slim rails, Raziel at the physical
// center, typed "Now". Rail placement is NOT accepted product layout; it exists to be judged in use.
// Reads only through existing public readers; no writes, no new owner, no change to Home2029Page.
import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import ClaudeResearchPacket2029Page from "./ClaudeResearchPacket2029Page.jsx";
import NavigationIcon2029 from "../components/experience2029/NavigationIcon2029.jsx";
import { use2029Palette } from "../lib/palette.js";
import { setThemePreset, useThemePreset } from "../lib/themeMode.js";
import { RAZIEL_PRESENCE, TYPEFACE } from "../lib/designTokens.js";
import { getLatestPostCards, getTzofonStories, getHomeVideos, getPostsFromSupabase } from "../lib/supabase.js";
import { fetchHome2029Projection } from "../lib/research/home2029Projection.js";
import { buildCalculator2029FastPreview } from "../lib/research/calculator2029FastPreview.js";
import { applySeo } from "../lib/seo.js";
import { stripHtml } from "../lib/format.js";
import "./homePreview2029.css";

const NAV = [
  { name: "home", label: "בית", to: "/2029/home-preview", current: true },
  { name: "world", label: "העולם", to: "/world" },
  { name: "posts", label: "פוסטים", to: "/2029/posts" },
  { name: "heichal", label: "היכל", to: "/heichal" },
  { name: "els", glyph: "✦", label: "צפנים", to: "/els" },
  { name: "books", label: "ספרים", to: "/books" },
  { name: "journey", label: "מסע", to: "/2029/journey" },
  { name: "tools", label: "מחשבון", to: "/2029/gematria", divider: true },
];

const PRESETS = [
  { id: "light", label: "יום" },
  { id: "parchment", label: "קלף" },
  { id: "dark", label: "לילה" },
];

const STREAM_KIND = { source: "מקור", finding: "ממצא", convergence: "התכנסות" };

const clean = (value) => stripHtml(value == null ? "" : String(value)).trim();

function shortDate(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("he-IL", { day: "numeric", month: "numeric" });
}

function postHref(slugOrPath) {
  const slug = String(slugOrPath || "").replace(/^\/+/, "");
  return slug ? "/post/" + slug : "/2029/posts";
}

function titleNumber(title, tags) {
  const digits = clean(title).replace(/,/g, "");
  for (const tag of Array.isArray(tags) ? tags : []) {
    if (/^\d{2,5}$/.test(String(tag)) && new RegExp(`(^|\\D)${tag}(\\D|$)`).test(digits)) return Number(tag);
  }
  return null;
}

function usePreviewData() {
  const [state, setState] = useState({ loading: true });
  useEffect(() => {
    let live = true;
    Promise.allSettled([
      getLatestPostCards({ limit: 4 }),
      getTzofonStories({ limit: 6 }),
      getHomeVideos({ limit: 6 }),
      fetchHome2029Projection(),
      getPostsFromSupabase({ limit: 1, tag: "מימד חמש" }),
      getPostsFromSupabase({ limit: 8 }),
    ]).then(([posts, ciphers, videos, projection, dimension, tagged]) => {
      if (!live) return;
      const value = (result, fallback) => (result.status === "fulfilled" && result.value) || fallback;
      const numberByTitle = new Map((value(tagged, {}).posts || []).map((post) => [clean(post.title), titleNumber(post.title, post.tags)]));
      setState({
        loading: false,
        posts: value(posts, []).map((post) => ({ ...post, number: numberByTitle.get(clean(post.title)) ?? null })),
        ciphers: value(ciphers, []),
        videos: value(videos, []),
        projection: value(projection, null),
        dimensionPost: (value(dimension, {}).posts || [])[0] || null,
      });
    });
    return () => { live = false; };
  }, []);
  return state;
}

function selectionFromHero(now, lead) {
  if (now) {
    const source = now.findings?.find((finding) => finding.sourceHref) || now.findings?.[0];
    return {
      title: `${now.value} · ${now.yearLabel}`,
      value: now.value,
      related: (now.findings || []).slice(0, 3).map((finding) => ({ label: finding.expression || finding.sourceTitle, tail: String(finding.value) })),
      sourceHref: source?.sourceHref || null,
      why: now.whyNow,
    };
  }
  if (!lead) return null;
  return { title: clean(lead.title), value: lead.number, related: [], sourceHref: postHref(lead.slug), why: "העדכון האחרון באתר." };
}

function selectionFromPost(post) {
  return {
    title: clean(post.title),
    value: post.number,
    related: post.number ? [{ label: "מספר שמופיע בפוסט", tail: String(post.number) }] : [],
    sourceHref: postHref(post.slug),
    why: "נבחר מתוך העדכונים האחרונים.",
  };
}

function Hero({ now, lead, onSelect }) {
  if (now) {
    const lead0 = now.findings?.[0];
    return <section className="hp29-hero" aria-label="העת עכשיו">
      <div className="hp29-hero-num">{now.value}<small>{now.yearLabel}</small></div>
      <div className="hp29-hero-copy">
        <div className="hp29-kicker">{now.publicLabel} · חי</div>
        <h1>אותו מספר חוזר השנה בכמה מקומות שונים</h1>
        <p>{now.whyNow}</p>
        <div className="hp29-hero-src">{now.sourceCount} מקורות{lead0?.sourceTitle ? <> · <b>{lead0.sourceTitle}</b></> : null}</div>
        <div className="hp29-actions">
          <Link className="hp29-btn is-primary" to="/world">פתח את החיבור בעולם ←</Link>
          <Link className="hp29-btn" to={`/2029/number/${now.value}`}>לדף המספר</Link>
        </div>
      </div>
    </section>;
  }
  if (!lead) return <section className="hp29-hero is-loading" aria-busy="true"><div className="hp29-hero-copy"><div className="hp29-kicker">העת עכשיו</div><h1>טוען את מה שחי עכשיו…</h1></div></section>;
  return <section className="hp29-hero" aria-label="העדכון האחרון">
    {lead.poster ? <img className="hp29-hero-img" src={lead.poster} alt="" loading="eager" /> : null}
    <div className="hp29-hero-copy">
      <div className="hp29-kicker">העדכון האחרון</div>
      <h1>{clean(lead.title)}</h1>
      <div className="hp29-actions">
        <Link className="hp29-btn is-primary" to={postHref(lead.slug)} onClick={() => onSelect(selectionFromPost(lead))}>לקריאה ←</Link>
        <Link className="hp29-btn" to="/world">לעולם</Link>
      </div>
    </div>
  </section>;
}

function Section({ title, link, children, label }) {
  return <section className="hp29-sec" aria-label={label || title}>
    {title ? <div className="hp29-sec-h"><h2>{title}</h2>{link}</div> : null}
    {children}
  </section>;
}

function Media({ src, fallback }) {
  return src
    ? <img className="hp29-media" src={src} alt="" loading="lazy" />
    : <div className="hp29-media is-empty"><span>{fallback}</span></div>;
}

function Calculator() {
  const [text, setText] = useState("שלום");
  const preview = useMemo(() => buildCalculator2029FastPreview(text), [text]);
  const regular = preview.methods.find((method) => method.methodKey === "רגיל");
  return <div className="hp29-portion is-calc">
    <div className="hp29-portion-h"><NavigationIcon2029 name="tools" />מחשבון</div>
    <div className="hp29-calc">
      <label className="hp29-sr" htmlFor="hp29-calc-in">מילה או ביטוי</label>
      <input id="hp29-calc-in" value={text} onChange={(event) => setText(event.target.value)} dir="rtl" autoComplete="off" />
      <output htmlFor="hp29-calc-in">{regular?.computedValue || "—"}</output>
    </div>
    <small>תצוגה מהירה בשיטה הרגילה. <Link to={`/2029/gematria?q=${encodeURIComponent(text)}`}>לחישוב המלא ←</Link></small>
  </div>;
}

function NowBar({ tab, setTab, world, selection }) {
  const firstWorld = world?.[0];
  const messages = {
    world: firstWorld ? `${STREAM_KIND[firstWorld.kind] || "עדכון"}: ${clean(firstWorld.label)}` : "אין עדכון חדש בעולם כרגע",
    me: "התחברו כדי לראות עדכונים בשבילכם",
    rz: selection?.value ? `רזיאל מציע: להמשיך מ־${selection.value} לדף המספר` : "רזיאל מציע: לבחור פריט כדי להתחיל",
  };
  return <div className="hp29-now">
    <span className="hp29-now-msg" aria-live="polite">{messages[tab]}</span>
    <div className="hp29-now-tabs" role="tablist" aria-label="עכשיו">
      {[["world", "בעולם"], ["me", "בשבילי"], ["rz", "רזיאל מציע"]].map(([id, label]) => <button
        key={id} type="button" role="tab" aria-label={label} aria-selected={tab === id} onClick={() => setTab(id)} className={`is-${id}`}
      ><span className="hp29-dot" /><span className="hp29-now-t">{label}</span></button>)}
    </div>
  </div>;
}

function SelectionPanel({ selection, razielOpen, onClose }) {
  return <aside className={`hp29-sel${razielOpen ? " is-raziel" : ""}`} aria-label="הבחירה שלך">
    <button className="hp29-sel-close" type="button" onClick={onClose} aria-label="סגירה">✕</button>
    {selection ? <>
      <div><div className="hp29-lbl">הבחירה שלך</div><h3>{selection.title}</h3></div>
      {selection.related?.length ? <div>
        <div className="hp29-lbl">למה קשורה</div>
        <ul className="hp29-rel">{selection.related.map((row, index) => <li key={index}><span>{row.label}</span><em>{row.tail}</em></li>)}</ul>
      </div> : null}
      <div className="hp29-next">
        <div className="hp29-lbl">מקור והמשך</div>
        {selection.sourceHref ? <Link to={selection.sourceHref}><NavigationIcon2029 name="posts" />למקור</Link> : null}
        <Link to="/world"><NavigationIcon2029 name="world" />לחיבור בעולם</Link>
        {selection.value ? <Link to={`/2029/number/${selection.value}`}><NavigationIcon2029 name="number" />לדף המספר {selection.value}</Link> : null}
      </div>
    </> : <div><div className="hp29-lbl">הבחירה שלך</div><h3>בחרו פריט בבית כדי לראות את ההקשר שלו</h3></div>}
    <div className="hp29-rz">
      <div className="hp29-lbl is-rz">רזיאל על הבחירה</div>
      <p>{selection?.why || "רזיאל יכול להסביר קשר, להראות את המקור ולהציע המשך."}</p>
      {razielOpen ? <Link className="hp29-btn is-primary" to="/heichal">שיחה עם רזיאל בהיכל ←</Link> : <small>לחצו על רזיאל בסרגל התחתון</small>}
    </div>
  </aside>;
}

// ?tool=claude opens the standalone Claude research packet (engine values only; no Raziel session, no model, no network).

export default function HomePreview2029Page() {
  const { search } = useLocation();
  return new URLSearchParams(search).get("tool") === "claude"
    ? <ClaudeResearchPacket2029Page />
    : <HomePreview2029Body />;
}

function HomePreview2029Body() {
  const palette = use2029Palette();
  const preset = useThemePreset();
  const data = usePreviewData();
  const [selection, setSelection] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [razielOpen, setRazielOpen] = useState(false);
  const [nowTab, setNowTab] = useState("world");

  useEffect(() => {
    applySeo({ title: "בית · תצוגה מקדימה", description: "תצוגה מקדימה פנימית של הרכב הבית.", path: "/2029/home-preview", noindex: true });
  }, []);

  const now = data.projection?.temporalNow || null;
  const lead = data.posts?.[0] || null;
  const world = data.projection?.worldPreview?.research || [];
  const people = data.projection?.worldPreview?.people || [];
  const pulse = data.projection?.systemPulse || null;
  const active = selection || selectionFromHero(now, lead);

  const select = (next) => { setSelection(next); setSheetOpen(true); };

  const style = {
    "--s29-page": palette.pageBg, "--s29-panel": palette.card, "--s29-panel-soft": palette.cardSoft,
    "--s29-line": palette.border, "--s29-line-strong": palette.borderStrong, "--s29-accent": palette.accent,
    "--s29-accent-text": palette.accentText, "--s29-accent-secondary": palette.accentSecondary,
    "--s29-discovery": palette.accentDiscovery, "--s29-focus-ring": palette.focusRing,
    "--s29-warm-accent": palette.warmAccent, "--s29-brand-sapphire": palette.brandSapphire, "--s29-brand-gold": palette.brandGold,
    "--s29-brand-glow": palette.brandGlow, "--s29-hero": palette.heroNum, "--s29-ink": palette.ink,
    "--s29-muted": palette.inkSoft, "--s29-on-accent": palette.onAccent, "--s29-accent-btn": palette.accentBtn,
    "--s29-font-ui": TYPEFACE.ui, "--s29-font-body": TYPEFACE.body, "--s29-font-numeric": TYPEFACE.numeric,
    "--s29-raziel-blue": RAZIEL_PRESENCE.blue, "--s29-raziel-indigo": RAZIEL_PRESENCE.indigo,
    "--s29-raziel-violet": RAZIEL_PRESENCE.violet, "--s29-raziel-glow": RAZIEL_PRESENCE.glow,
    "--s29-raziel-cycle": `${RAZIEL_PRESENCE.cycleMs}ms`,
  };

  return <div className="hp29" dir="rtl" lang="he" style={style} data-preset={palette.preset}>
    <div className="hp29-flag">תצוגה מקדימה פנימית · לא האתר החי · מיקום הסרגלים לבחינה בשימוש</div>

    <header className="hp29-top">
      <button className="hp29-icon-btn hp29-menu" type="button" aria-label="תפריט" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>☰</button>
      <div className="hp29-brand"><span className="hp29-crown" aria-hidden="true">1820</span><div><b>כי לה׳ המלוכה</b><small>סוד 1820</small></div></div>
      <span className="hp29-crumb">בית · העת עכשיו</span>
      <Link className="hp29-search" to="/world"><NavigationIcon2029 name="search" /><span>חיפוש<span className="hp29-search-long"> מילה, שם או מספר</span></span></Link>
      <div className="hp29-presets" role="group" aria-label="פלטה">
        {PRESETS.map((item) => <button key={item.id} type="button" aria-pressed={preset === item.id} onClick={() => setThemePreset(item.id)}>{item.label}</button>)}
      </div>
    </header>

    <div className="hp29-mid">
      <nav className={`hp29-rail${menuOpen ? " is-open" : ""}`} aria-label="ניווט כללי">
        {NAV.map((item) => <React.Fragment key={item.name}>
          {item.divider ? <hr /> : null}
          <Link to={item.to} className={item.current ? "is-on" : undefined} aria-current={item.current ? "page" : undefined} onClick={() => setMenuOpen(false)}>
            <NavigationIcon2029 name={item.name} /><span>{item.label}</span>
          </Link>
        </React.Fragment>)}
      </nav>

      <main className="hp29-main">
        <Hero now={now} lead={lead} onSelect={select} />

        <Section title="עדכונים אחרונים" link={<Link to="/2029/posts">כל העדכונים ←</Link>}>
          <div className="hp29-updates">
            {(data.posts || []).map((post) => <button key={post.slug} type="button" className="hp29-card" onClick={() => select(selectionFromPost(post))}>
              <Media src={post.poster} fallback={post.number || "✦"} />
              <span className="hp29-card-body"><span className="hp29-card-t">{clean(post.title)}</span><span className="hp29-meta">{shortDate(post.modified)}</span></span>
            </button>)}
            {data.loading ? <div className="hp29-skel" /> : null}
          </div>
        </Section>

        <Section label="צפנים וסרטים">
          <div className="hp29-strips">
            <div className="hp29-strip">
              <div className="hp29-sec-h"><h2>הצפנים האחרונים בתורה</h2><Link to="/els">כל הצפנים ←</Link></div>
              <div className="hp29-strip-row">
                {(data.ciphers || []).map((cipher) => <Link key={cipher.id} className="hp29-tile" to={postHref(cipher.link_url)}>
                  <Media src={cipher.thumb_url} fallback="✦" /><span>{clean(cipher.text)}</span>
                </Link>)}
                {!data.loading && !data.ciphers?.length ? <p className="hp29-empty">אין צפנים להצגה כרגע.</p> : null}
              </div>
            </div>
            <div className="hp29-strip">
              <div className="hp29-sec-h"><h2>הסרטים האחרונים</h2><a href="/archive">כל הסרטים ←</a></div>
              <div className="hp29-strip-row">
                {(data.videos || []).map((video) => <a key={video.yt || video.slug} className="hp29-tile is-video" href={video.slug ? "/" + video.slug : "/archive"}>
                  <Media src={video.poster_url || (video.yt ? `https://i.ytimg.com/vi/${video.yt}/hqdefault.jpg` : null)} fallback="▶" />
                  <span>{clean(video.title)}</span>
                </a>)}
                {!data.loading && !data.videos?.length ? <p className="hp29-empty">אין סרטים להצגה כרגע.</p> : null}
              </div>
            </div>
          </div>
        </Section>

        <Section title="אוצרות הגילוי" link={<Link to="/world">לכל האוצרות בעולם ←</Link>}>
          {now?.treasures?.length ? <div className="hp29-treasures">
            {now.treasures.map((treasure) => <div className="hp29-treasure" key={treasure.id}>
              <div className="hp29-treasure-v">{treasure.expression} <em>{treasure.value}</em></div>
              <div className="hp29-why"><b>למה כאן:</b> {treasure.whyHere}</div>
            </div>)}
          </div> : <p className="hp29-empty">{data.loading ? "טוען אוצרות…" : "האוצרות מופיעים רק כשיש להם עוגן מאומת. כרגע אין אוצר שמתאים לעת הזאת."}</p>}
        </Section>

        <Section label="זרם המציאות">
          <div className="hp29-stream">
            <div className="hp29-stream-vis"><span className="hp29-live">חי עכשיו</span><b>זרם המציאות</b><small>מקורות, ממצאים והתכנסויות מהעולם</small></div>
            <ul className="hp29-arrivals">
              {world.slice(0, 4).map((item) => <li key={item.id}>
                <span className={`hp29-kind is-${item.kind}`}>{STREAM_KIND[item.kind] || "עדכון"}</span>
                <span className="hp29-arr-t">{clean(item.label)}</span>
                <time>{shortDate(item.at)}</time>
              </li>)}
              {!data.loading && !world.length ? <li className="hp29-empty">אין הגעות חדשות כרגע.</li> : null}
              <li className="hp29-arr-cta"><Link className="hp29-btn" to="/world">כניסה לזרם המלא בעולם ←</Link></li>
            </ul>
          </div>
        </Section>

        <Section label="מוקדי זהות">
          <div className="hp29-anchors">
            <Link className="hp29-anchor" to="/world"><span className="hp29-glyph is-people"><NavigationIcon2029 name="community" /></span>
              <span><b>הכותבים</b><small>{people.length ? people.map((person) => person.displayName).join(" · ") : "הכותבים שמקורותיהם בעולם"}</small></span></Link>
            <Link className="hp29-anchor" to={data.dimensionPost?.slug ? postHref(data.dimensionPost.slug) : "/2029/posts"}><span className="hp29-glyph is-dim"><NavigationIcon2029 name="books" /></span>
              <span><b>מימד חמש</b><small>{data.dimensionPost ? clean(data.dimensionPost.title) : "עשר הספירות, מפת ישראל ותודעה"}</small></span></Link>
            <a className="hp29-anchor" href="/or-geula"><span className="hp29-glyph is-geula"><NavigationIcon2029 name="now" /></span>
              <span><b>אור הגאולה</b><small>רמזי הגאולה לאורך השנים</small></span></a>
          </div>
        </Section>

        <Section label="כלים וכניסות">
          <div className="hp29-portions">
            <Calculator />
            {now ? <Link className="hp29-portion" to={`/2029/number/${now.value}`}><span className="hp29-portion-h"><NavigationIcon2029 name="number" />מספר העת</span>
              <span className="hp29-daynum">{now.value}</span><small>{now.yearLabel}</small></Link>
              : <Link className="hp29-portion" to={active?.value ? `/2029/number/${active.value}` : "/2029/gematria"}><span className="hp29-portion-h"><NavigationIcon2029 name="number" />דף המספר</span>
              <span className="hp29-daynum">{active?.value || "123"}</span><small>{active?.value ? "המספר מהבחירה שלכם" : "כל מספר עם השיטות שלו"}</small></Link>}
            <a className="hp29-portion" href="/archive"><span className="hp29-portion-h"><NavigationIcon2029 name="books" />ארכיון</span><small>שנים של פוסטים, לפי שנה ונושא</small></a>
            <Link className="hp29-portion" to="/2029/journey"><span className="hp29-portion-h"><NavigationIcon2029 name="personal" />מתחילים כאן</span><small>מסע קצר עם השם והתאריך שלכם</small></Link>
            <a className="hp29-portion" href="/community"><span className="hp29-portion-h"><NavigationIcon2029 name="community" />קהילה</span><small>מחקר משותף ותרומות</small></a>
          </div>
        </Section>

        <section className="hp29-quiet" aria-label="דופק ומצב בנייה">
          <span>{pulse?.corpusTotal ? `${pulse.corpusTotal.toLocaleString("he-IL")} ביטויים במאגר${pulse.contributions7d ? ` · ${pulse.contributions7d} תרומות השבוע` : ""}` : "האתר מתחדש. כל אזור נפתח לציבור כשהוא בשל."}</span>
          <a href="/map">מה כבר חי ומה בדרך ←</a>
        </section>
      </main>

      <div className={`hp29-sel-wrap${sheetOpen || razielOpen ? " is-sheet-open" : ""}`}>
        <SelectionPanel selection={active} razielOpen={razielOpen} onClose={() => { setSheetOpen(false); setRazielOpen(false); }} />
      </div>
    </div>

    <footer className="hp29-bottom">
      <div className="hp29-ctx">
        <Link className="hp29-btn is-primary" to={active?.value ? `/2029/number/${active.value}` : "/world"}><NavigationIcon2029 name="action" />{active?.value ? "פתח את המספר" : "פתח בעולם"}</Link>
        <span className="hp29-where">אתם ב<b>בית</b>{active ? <> · בחרתם <b>{active.value || "פוסט"}</b></> : null}</span>
      </div>
      <div className="hp29-rz-slot">
        <button className="hp29-raziel" type="button" aria-label="רזיאל" aria-pressed={razielOpen} onClick={() => setRazielOpen((open) => !open)}><span className="hp29-raziel-core" aria-hidden="true" /></button>
      </div>
      <NowBar tab={nowTab} setTab={setNowTab} world={world} selection={active} />
    </footer>
  </div>;
}
