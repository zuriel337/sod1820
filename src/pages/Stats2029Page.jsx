import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Sod2029Shell from "../components/experience2029/Sod2029Shell.jsx";
import NavigationIcon2029 from "../components/experience2029/NavigationIcon2029.jsx";
import { applySeo } from "../lib/seo.js";
import CanonicalProgress from "../components/CanonicalProgress.jsx";
import { PULSE_WINDOWS, readAdaptivePulse, readResearchPulse, pulseUsable, pulseCount } from "../lib/researchPulse2029.js";
import { fetchHomeSystemPulse2029 } from "../lib/research/home2029Projection.js";
import "./stats2029.css";

// /stats (ZURIEL 21.11.2026): the public statistics page. One reader (research_pulse_2029, TI) plus the existing
// home system pulse for the corpus. Lists only above the privacy floor; people are never counted; machines
// (crawlers) are shown apart from people; a block without data is not drawn.
const BOTS = { Googlebot: "Google", Bingbot: "Bing", Applebot: "Apple", Meta: "Meta · פייסבוק ווואטסאפ", ClaudeBot: "Claude · Anthropic", GPTBot: "ChatGPT · OpenAI", CCBot: "Common Crawl", Amazonbot: "Amazon", Baidu: "Baidu", Yandex: "Yandex", DuckDuckBot: "DuckDuckGo" };
const BUCKETS = { "/number": "דפי מספר", community: "קהילה", "post/slug": "פוסטים", home: "דף הבית", posts: "רשימת הפוסטים", "/topic": "נושאים", gallery: "גלריה", research: "מחקר", index: "מפת האתר", journey: "מסע", "/cross": "הצלבות" };
const SECTIONS = { home: "בית", world: "עולם", calculator: "מחשבון", calculator_advanced: "מחשבון מתקדם", calculator_community: "מחשבון הקהילה", els: "צופן תנ״כי", cipher: "צפנים", number: "דפי מספר", posts: "פוסטים", books: "ספרים", videos: "סרטונים", community: "קהילה", now: "עכשיו" };

function Tile({ value, label, note, to }) {
  const v = typeof value === "number" ? pulseCount(value) : value;
  if (!v) return null;
  const body = <><b>{v}</b><span>{label}</span>{note ? <small>{note}</small> : null}</>;
  return to ? <Link className="stats29-tile" to={to}>{body}</Link> : <div className="stats29-tile">{body}</div>;
}

export default function Stats2029Page() {
  const [state, setState] = useState({ loading: true });
  const [corpus, setCorpus] = useState(null);
  const [manual, setManual] = useState(null);
  useEffect(() => {
    applySeo({ title: "סטטיסטיקה · מה קורה עכשיו באתר", description: "מה נחקר, נקרא ונסרק באתר: מספרים, פוסטים, מחשבונים, צפנים, קהילה ומנועי חיפוש. נתונים מצרפיים בלבד.", path: "/stats", noindex: true });
    fetchHomeSystemPulse2029().then(setCorpus, () => setCorpus(null));
  }, []);
  useEffect(() => {
    let live = true;
    setState(s => ({ ...s, loading: true }));
    const job = manual ? readResearchPulse(manual).then(data => pulseUsable(data) ? { data, hours: manual, label: PULSE_WINDOWS.find(w => w[0] === manual)[1] } : null) : readAdaptivePulse();
    job.then(r => live && setState({ result: r }), () => live && setState({ failed: true }));
    return () => { live = false; };
  }, [manual]);

  const r = state.result, d = r?.data;
  const human = d?.totals?.human || {}, unknown = d?.totals?.unknown || {};
  const crawlers = d?.crawlers;
  const added = d?.added || {};
  const sections = (d?.sections || []).filter(x => SECTIONS[x.section]);
  return <Sod2029Shell surface="stats" introVariant="none" symbol={<NavigationIcon2029 name="now" />}
    eyebrow="סטטיסטיקה" title="מה קורה ב־SOD1820" description="מה נחקר, נקרא ונסרק באתר. נתונים מצרפיים בלבד: פעולות, לא אנשים.">
    <main className="stats29" dir="rtl" data-experience-surface="stats">
      <div className="stats29-window" role="group" aria-label="טווח הנתונים">
        <span>{r && !state.loading ? `מוצג: ${r.label}` : ""}</span>
        {PULSE_WINDOWS.map(([h, , short]) => <button key={h} type="button" aria-pressed={r?.hours === h} onClick={() => setManual(h)}>{short}</button>)}
      </div>
      {state.loading ? <CanonicalProgress compact title="טוען את נתוני האתר" phase={manual ? "קורא את הטווח שנבחר" : "בוחר את הטווח הקצר ביותר שיש בו נתונים מלאים"} /> : null}
      {state.failed ? <p role="status">הנתונים אינם זמינים כרגע. אפשר לנסות שוב בעוד רגע.</p> : null}
      {d ? <>
        <section className="stats29-block" aria-labelledby="stats29-site">
          <h2 id="stats29-site">האתר במספרים</h2>
          <div className="stats29-grid">
            <Tile value={human.page_views} label="צפיות בדפים" note="גולשים שסווגו כאנושיים" />
            <Tile value={unknown.page_views} label="צפיות שלא סווגו" note="ייתכן אדם, ייתכן אוטומציה" />
            <Tile value={human.calculator} label="פעולות במחשבון" note="חישובים, בחירת תוצאות ופתיחת שיטות" />
            <Tile value={human.els_searches} label="חיפושים בצופן התנ״כי" to="/code" />
            <Tile value={crawlers?.served} label="דפים שהוגשו למנועי חיפוש ובינה מלאכותית" note={crawlers?.days > 1 ? `ב־${crawlers.days} הימים האחרונים` : "ביממה האחרונה"} />
          </div>
        </section>
        {(d.numbers?.length || d.content?.length || d.computed?.length || d.phrases?.length) ? <section className="stats29-block" aria-labelledby="stats29-hot">
          <h2 id="stats29-hot">חם עכשיו</h2>
          {d.numbers?.length ? <><h3>המספרים שנפתחים הכי הרבה</h3><ol className="stats29-chips">{d.numbers.slice(0, 12).map(x => <li key={x.n}><Link to={"/number/" + x.n}><b>{x.n.toLocaleString("he-IL")}</b><small>{pulseCount(x.events)} פתיחות</small></Link></li>)}</ol></> : null}
          {d.computed?.length ? <><h3>הערכים שמחושבים הכי הרבה</h3><ol className="stats29-chips">{d.computed.map(x => <li key={x.n}><Link to={"/number/" + x.n}><b>{x.n.toLocaleString("he-IL")}</b><small>{pulseCount(x.events)} חישובים</small></Link></li>)}</ol></> : null}
          {d.content?.length ? <><h3>הפוסטים שנקראים הכי הרבה</h3><ol className="stats29-list">{d.content.map(x => <li key={x.href}><Link to={x.href}>{x.title}</Link><small>{pulseCount(x.events)} קריאות</small></li>)}</ol></> : null}
          {d.phrases?.length ? <><h3>ביטויים מאושרים שנבחרו</h3><ol className="stats29-chips">{d.phrases.map(x => <li key={x.phrase}><span><b>{x.phrase}</b><small>{x.value} · {pulseCount(x.events)} בחירות</small></span></li>)}</ol></> : null}
        </section> : null}
        {sections.length ? <section className="stats29-block" aria-labelledby="stats29-sections">
          <h2 id="stats29-sections">מדורים לפי צפיות</h2>
          <ol className="stats29-bars">{sections.map(x => <li key={x.section}><span>{SECTIONS[x.section]}</span><i style={{ width: Math.max(4, Math.round(x.views / sections[0].views * 100)) + "%" }} /><small>{pulseCount(x.views)}</small></li>)}</ol>
        </section> : null}
        {crawlers?.by_bot?.length ? <section className="stats29-block" aria-labelledby="stats29-bots">
          <h2 id="stats29-bots">מי סורק את SOD1820</h2>
          <p className="stats29-note">מכונות, לא אנשים: דפים שהוגשו לסורקים של מנועי חיפוש ובינה מלאכותית. נספר בקצה האתר.</p>
          <ol className="stats29-bars">{crawlers.by_bot.map(x => <li key={x.bot}><span>{BOTS[x.bot] || x.bot}</span><i style={{ width: Math.max(4, Math.round(x.hits / crawlers.by_bot[0].hits * 100)) + "%" }} /><small>{pulseCount(x.hits)}</small></li>)}</ol>
          {crawlers.by_section?.length ? <><h3>מה הם סורקים</h3><ol className="stats29-bars">{crawlers.by_section.filter(x => BUCKETS[x.bucket]).map(x => <li key={x.bucket}><span>{BUCKETS[x.bucket]}</span><i style={{ width: Math.max(4, Math.round(x.hits / crawlers.by_section[0].hits * 100)) + "%" }} /><small>{pulseCount(x.hits)}</small></li>)}</ol></> : null}
        </section> : null}
        <section className="stats29-block" aria-labelledby="stats29-added">
          <h2 id="stats29-added">נוסף לאתר</h2>
          <div className="stats29-grid">
            <Tile value={added.community_messages} label="הודעות בקהילה" note={r.label} to="/community/chat" />
            <Tile value={added.contributions} label="תרומות מחקר שאושרו" note={r.label} />
            <Tile value={added.posts} label="פוסטים חדשים" note={r.label} to="/post" />
            <Tile value={added.codes} label="צפנים חדשים" note={r.label} to="/codes" />
            <Tile value={corpus?.corpusAdded7d} label="ביטויים חדשים במאגר" note="השבוע" to="/gematria" />
            <Tile value={corpus?.corpusTotal} label="ביטויים מאומתים במאגר" to="/gematria" />
            <Tile value={d.posts_total} label="פוסטים באתר" to="/post" />
            <Tile value={d.publications?.public_ciphers} label="צפנים שפורסמו" to="/codes" />
            <Tile value={d.publications?.approved_convergences} label="התכנסויות שאושרו" to="/world" />
          </div>
        </section>
        <p className="stats29-note">כל רשימה מציגה רק פריטים שעברו 10 פעולות מ־5 ביקורים לפחות, כדי ששום פריט לא יצביע על אדם אחד. מספרים הם פעולות, לא אנשים; חיפושים פרטיים אינם מוצגים לעולם.
          {d.computed_at ? " עודכן " + new Date(d.computed_at).toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" }) + "." : ""}</p>
      </> : null}
    </main>
  </Sod2029Shell>;
}
