// Home main item ("העדכון האחרון") with a restrained motion proposal:
//  - on entry a staged appearance of the convergence measures, then a quiet state (once per session);
//  - when a REAL update exists (the post was modified after publishing), one short pulse of light plus a
//    plain statement of what the system recorded; the mark stays static until seen;
//  - a click opens the detail of the connections and the sources.
// Only existing data: the post row (date/modified/tags) and public topic cards that share numbers with it.
// Quality stars, convergence strength and Gold/Diamond marks stay three separate measures
// (ConvergenceRatings2029). Components that are not computed yet are listed as "not computed", never active.
// Reduced motion: no entrance and no pulse animation, the same information is shown statically.
// Preview only: ?replay=1 replays the entrance; ?pulse=demo shows a clearly labelled demonstration of the update state.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase.js";
import { stripHtml } from "../../lib/format.js";
import { postNumbers, realUpdate } from "../../lib/heroUpdate2029.js";
import { relativeTimeLabel } from "../../lib/relativeTime2029.js";
import ConvergenceRatings2029 from "./ConvergenceRatings2029.jsx";
import "./homeHeroMotion2029.css";

const clean = (value) => stripHtml(value == null ? "" : String(value)).trim();
const SEEN_KEY = "sod-home-seen-updates";
const PLAYED_KEY = "sod-home-hero-played";
const TOPIC_FIELDS = "id,slug,title,numbers,highlight_numbers,quality,meter_score,approved_at";

const storage = (kind) => { try { return window[kind]; } catch (_) { return null; } };
const readSeen = () => { try { return JSON.parse(storage("localStorage")?.getItem(SEEN_KEY) || "{}") || {}; } catch (_) { return {}; } };
const writeSeen = (seen) => { try { storage("localStorage")?.setItem(SEEN_KEY, JSON.stringify(seen)); } catch (_) { /* optional */ } };


function useHeroData(lead) {
  const [state, setState] = useState({ row: null, cards: [], loaded: false });
  useEffect(() => {
    if (!lead?.slug || !supabase) { setState({ row: null, cards: [], loaded: true }); return undefined; }
    let live = true;
    (async () => {
      let row = null; let cards = [];
      try {
        const { data } = await supabase.from("posts").select("id,slug,date,modified,tags").eq("slug", lead.slug).limit(1);
        row = data?.[0] || null;
        const numbers = postNumbers(row?.tags);
        if (numbers.length) {
          const result = await supabase.from("topic_cards_public").select(TOPIC_FIELDS).overlaps("numbers", numbers)
            .order("meter_score", { ascending: false, nullsFirst: false }).limit(3);
          cards = (result.data || []).map((card) => ({ id: String(card.id), slug: card.slug, label: card.title, numbers: card.numbers || [],
            highlightNumbers: card.highlight_numbers || [], quality: card.quality ?? null, meterScore: card.meter_score ?? null,
            approvedAt: card.approved_at || null, shared: (card.numbers || []).filter((n) => numbers.includes(Number(n))) }));
        }
      } catch (_) { /* the hero stays as a plain item */ }
      if (live) setState({ row, cards, loaded: true });
    })();
    return () => { live = false; };
  }, [lead?.slug]);
  return state;
}

export default function HomeHeroMotion2029({ lead, href }) {
  const data = useHeroData(lead);
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const previewTools = import.meta.env.DEV || import.meta.env.VITE_INTEGRATED_PREVIEW === "true";
  const demo = previewTools && params.get("pulse") === "demo";
  const replay = previewTools && params.get("replay") === "1";
  const [entering] = useState(() => replay || storage("sessionStorage")?.getItem(PLAYED_KEY) !== "1");
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(readSeen);
  const heroRef = useRef(null);

  useEffect(() => {
    if (!entering) return undefined;
    const timer = setTimeout(() => { try { storage("sessionStorage")?.setItem(PLAYED_KEY, "1"); } catch (_) { /* optional */ } }, 2500);
    return () => clearTimeout(timer);
  }, [entering]);

  const update = useMemo(() => {
    if (demo) return { kind: "demo", at: new Date().toISOString(), key: "demo" };
    return data.row ? realUpdate(data.row) : null;
  }, [data.row, demo]);
  const unseen = Boolean(update) && !seen[update.key];
  const top = data.cards[0] || null;

  const openDetail = () => {
    setOpen((value) => !value);
    if (update && !seen[update.key] && update.kind !== "demo") { const next = { ...seen, [update.key]: Date.now() }; setSeen(next); writeSeen(next); }
  };

  const updateText = !update ? null
    : update.kind === "demo" ? "הדגמה, לא עדכון אמיתי: כך תופיע הודעת עדכון קצרה על הפריט הראשי."
    : `המערכת רושמת שהפוסט עודכן ${relativeTimeLabel(update.at)}.`;

  return <section ref={heroRef} className={`h29-hero h29-hero2${entering ? " is-enter" : ""}${unseen ? " is-pulse" : ""}`} aria-label="העדכון האחרון" data-hero-motion={entering ? "enter" : "quiet"}>
    {lead.poster ? <img className="h29-hero-img k29-in" style={{ "--i": 0 }} src={lead.poster} alt="" loading="eager" /> : null}
    <div className="h29-hero-copy">
      <div className="h29-kicker k29-in" style={{ "--i": 0 }}>העדכון האחרון</div>
      <h1 className="k29-in" style={{ "--i": 1 }}>{clean(lead.title)}</h1>

      {update ? <p className="h29-hero-update k29-in" style={{ "--i": 2 }} role="status">
        <span className={`h29-dot${unseen ? " is-new" : ""}`} aria-hidden="true" />
        <span>{updateText}</span>
        {update.kind === "post-modified" ? <small>המערכת עדיין לא מפרטת מה נוסף בטקסט.</small> : null}
      </p> : null}

      {top ? <div className="h29-hero-measures k29-in" style={{ "--i": 3 }}>
        <span className="h29-hero-measures-l">ההתכנסות הקרובה <em>(נגזר ממספרים משותפים עם הפוסט)</em></span>
        <Link className="h29-hero-conv" to={`/topic/${encodeURIComponent(top.slug)}`}>{clean(top.label)}</Link>
        <ConvergenceRatings2029 className="h29-hero-rate" quality={top.quality} meterScore={top.meterScore} highlightNumbers={top.highlightNumbers} numbers={top.numbers} autoTiers />
      </div> : null}

      <div className="h29-actions k29-in" style={{ "--i": 4 }}>
        <Link className="h29-btn is-primary" to={href}>לקריאה ←</Link>
        <Link className="h29-btn" to="/world">לעולם</Link>
        <button type="button" className="h29-btn h29-hero-more" aria-expanded={open} aria-controls="h29-hero-detail" onClick={openDetail}>
          {open ? "סגירת הפירוט" : "פירוט החיבורים והמקורות"}
        </button>
      </div>

      {open ? <div id="h29-hero-detail" className="h29-hero-detail" role="region" aria-label="פירוט החיבורים והמקורות">
        <h2>חיבורים</h2>
        {data.cards.length ? <ul>{data.cards.map((card) => <li key={card.id}>
          <Link to={`/topic/${encodeURIComponent(card.slug)}`}>{clean(card.label)}</Link>
          <span>מספרים משותפים עם הפוסט: {card.shared.join(" · ") || "אין"}{card.approvedAt ? ` · אושר ${relativeTimeLabel(card.approvedAt)}` : ""}</span>
        </li>)}</ul> : <p>{data.loaded ? "המערכת לא מצאה כרגע התכנסות מאושרת שחולקת מספרים עם הפוסט." : "בודק…"}</p>}
        <p className="h29-hero-fine">החיבורים נגזרים ממספרים משותפים בין תגיות הפוסט לכרטיסי ההתכנסות הציבוריים. זו תוצאת חיפוש, לא הוכחה.</p>
        <h2>מקורות</h2>
        <ul>
          <li><Link to={href}>הפוסט עצמו</Link><span>{data.row?.date ? `פורסם ${relativeTimeLabel(data.row.date)}` : ""}{data.row?.modified && data.row.modified !== data.row.date ? ` · עודכן ${relativeTimeLabel(data.row.modified)}` : ""}</span></li>
        </ul>
        <h2>רכיבים שטרם מחושבים</h2>
        <ul className="h29-hero-na" aria-label="רכיבים שהמערכת עדיין לא מחשבת">
          <li>קשר לזמן</li><li>פסוק או מקור מדויק</li><li>מקורות עצמאיים</li><li>ביטויים מאומתים אחרי הסרת כפילויות</li>
        </ul>
        <p className="h29-hero-fine">הרכיבים האלה לא מוצגים כפעילים. הם יתווספו למדד כשהמערכת תחשב אותם.</p>
      </div> : null}
    </div>
  </section>;
}
