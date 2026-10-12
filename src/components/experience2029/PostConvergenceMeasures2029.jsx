// Convergence measures on the post page: the closest public convergence cards that share numbers with the post
// (the same derivation as the Home main item). Quality stars, convergence strength and Gold/Diamond marks stay three
// separate measures (ConvergenceRatings2029). A search result over shared numbers, not a proof.
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase.js";
import { stripHtml } from "../../lib/format.js";
import { postNumbers } from "../../lib/heroUpdate2029.js";
import ConvergenceRatings2029 from "./ConvergenceRatings2029.jsx";
import "./postConvergenceMeasures2029.css";

const FIELDS = "id,slug,title,numbers,highlight_numbers,quality,meter_score";

export default function PostConvergenceMeasures2029({ tags, fallbackNumbers = [] }) {
  const numbers = postNumbers(tags).length ? postNumbers(tags) : fallbackNumbers.map(Number).filter(Number.isFinite);
  const key = numbers.join(",");
  const [state, setState] = useState({ loaded: false, cards: [] });
  useEffect(() => {
    if (!numbers.length || !supabase) { setState({ loaded: true, cards: [] }); return undefined; }
    let live = true;
    (async () => {
      let cards = [];
      try {
        const { data } = await supabase.from("topic_cards_public").select(FIELDS).overlaps("numbers", numbers)
          .order("meter_score", { ascending: false, nullsFirst: false }).limit(3);
        cards = (data || []).map((card) => ({ id: String(card.id), slug: card.slug, label: stripHtml(card.title || "").trim(), numbers: card.numbers || [],
          highlightNumbers: card.highlight_numbers || [], quality: card.quality ?? null, meterScore: card.meter_score ?? null,
          shared: (card.numbers || []).filter((n) => numbers.includes(Number(n))) }));
      } catch (_) { /* the section is simply not shown */ }
      if (live) setState({ loaded: true, cards });
    })();
    return () => { live = false; };
  }, [key]);
  if (!state.cards.length) return null;
  return <section className="k29-pcm" aria-label="מדדי ההתכנסות הקרובה לפוסט">
    <h2>מדדי ההתכנסות הקרובה לפוסט</h2>
    <p className="k29-pcm-note">נגזר ממספרים משותפים עם הפוסט. זו תוצאת חיפוש, לא הוכחה. איכות, חוזק וסימוני זהב ויהלום הם מדדים נפרדים.</p>
    <ul>
      {state.cards.map((card) => <li key={card.id}>
        <Link className="k29-pcm-title" to={`/topic/${encodeURIComponent(card.slug)}`}>{card.label}</Link>
        <span className="k29-pcm-shared">מספרים משותפים עם הפוסט: {card.shared.join(" · ") || "אין"}</span>
        <ConvergenceRatings2029 quality={card.quality} meterScore={card.meterScore} highlightNumbers={card.highlightNumbers} numbers={card.numbers} autoTiers />
      </li>)}
    </ul>
  </section>;
}
