import React, { useEffect, useMemo, useState } from "react";
import { getWallRecent } from "../../lib/supabase.js";
import { isReadable } from "../../lib/nameMask.js";
import { dailyWordFor } from "../../lib/dailyWord.js";
import { calculateGematriaEnvelope } from "../../lib/research/gematriaCalculationContract.js";

// Words above the input: the word of the day + words visitors recently calculated (public, non-private
// wall rows only, with the same readability guard the wall uses — unreadable/masked phrases are skipped,
// never rendered as a masked placeholder here). Picking a word just fills the input; the calculator computes it as usual.
// Values: the daily word is computed by the canonical envelope; wall values are the stored regular value.
const MAX_VISITOR_WORDS = 8;

const fmt = (value) => Number.isFinite(Number(value)) ? Number(value).toLocaleString("en-US") : "";

export default function CalculatorWordsBar2029({ onPick, currentExpression = "" }) {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    let alive = true;
    getWallRecent(24)
      .then((data) => { if (alive) setRows(Array.isArray(data) ? data : []); })
      .catch(() => { if (alive) setRows([]); });
    return () => { alive = false; };
  }, []);

  const daily = useMemo(() => {
    const word = dailyWordFor();
    let value = null;
    try { value = calculateGematriaEnvelope(word, null).results.find((r) => r.key === "רגיל")?.value ?? null; } catch { value = null; }
    return { word, value };
  }, []);

  const visitor = useMemo(() => {
    const seen = new Set([daily.word, String(currentExpression || "").trim()]);
    const out = [];
    for (const row of rows) {
      const phrase = String(row?.phrase || "").trim();
      if (!phrase || seen.has(phrase) || !isReadable(phrase)) continue;
      if (phrase.replace(/[^א-תa-zA-Z0-9]/g, "").length < 2) continue; // a lone letter is not a word worth surfacing
      seen.add(phrase);
      out.push({ phrase, value: row?.ragil });
      if (out.length >= MAX_VISITOR_WORDS) break;
    }
    return out;
  }, [rows, daily.word, currentExpression]);

  return (
    <section className="sod29-calcpro-words" aria-label="מילים להתחלה" data-words-bar>
      <button type="button" className="sod29-calcpro-word-daily" onClick={() => onPick?.(daily.word, "daily")}>
        <span>מילה של היום</span>
        <strong>{daily.word}</strong>
        {daily.value != null ? <em>{fmt(daily.value)}</em> : null}
      </button>
      {visitor.length ? (
        <div className="sod29-calcpro-word-live" role="list" aria-label="מילים שגולשים חישבו לאחרונה">
          <span className="sod29-calcpro-word-live-label">חישבו לאחרונה</span>
          {visitor.map((item) => (
            <button type="button" role="listitem" key={item.phrase} dir="auto" onClick={() => onPick?.(item.phrase, "visitor")}>
              <span>{item.phrase}</span>
              {fmt(item.value) ? <em>{fmt(item.value)}</em> : null}
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
