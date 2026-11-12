// Prototype harness for external source units inside a Post (?proto=sources). It shows what the intake session has ALREADY made public
// (the public reader world_group_source_arrivals_v2, through the existing projection) and clearly labelled DEMONSTRATION units for
// sources that are still private. It never reads a private row, never changes a permission and never writes anything.
import React, { useEffect, useState } from "react";
import PostExternalSourceUnit2029 from "./PostExternalSourceUnit2029.jsx";
import { fetchGroupSourceArrivals } from "../../lib/research/worldGroupSource.js";
import { detectNumbersAndExpressions } from "../../lib/research/unitTextSuggestions2029.js";

// Sample data, labelled as such on screen. 1237 is NOT checked in the engine here (unchecked by design); the second sample states a
// wrong number on purpose to show the distinct mismatch state with the engine's real value.
export const DEMO_SOURCE_UNITS = Object.freeze([
  Object.freeze({ id: "demo-1237", demo: true, writerName: "שחר (הדגמה)", groupLabel: "הגילוי היומי", dateIso: "2026-11-11T18:00:00+02:00",
    text: "הודעת הדגמה: ביטוי שטרם נבדק במנוע.", phrase: "ביטוי לדוגמה", number: 1237, skipEngine: true, href: null }),
  Object.freeze({ id: "demo-mismatch", demo: true, writerName: "כותב לדוגמה (הדגמה)", groupLabel: "הגילוי היומי", dateIso: "2026-11-11T19:00:00+02:00",
    text: "הודעת הדגמה: מספר נטען שאינו תואם את המנוע.", phrase: "נתניהו", number: 77, href: null }),
]);

const WANT_WRITERS = ["yaniv-levi", "shachar-kandro", "tzvi-opoc"];
export default function PostExternalSourcesPreview2029() {
  const [live, setLive] = useState([]);
  useEffect(() => {
    let alive = true;
    (async () => {
      const units = [], seen = new Set();
      let before = null;
      // Public arrivals only (the reader's own gates). Page back a few times so an older approved writer is reachable.
      for (let page = 0; page < 5 && units.length < 3; page += 1) {
        const rows = await fetchGroupSourceArrivals({ limit: 40, before });
        if (!rows.length) break;
        for (const row of rows) {
          if (!WANT_WRITERS.includes(row.creatorSlug) || seen.has(row.creatorSlug)) continue;
          const claims = detectNumbersAndExpressions(row.fullText).filter((d) => d.kind === "claim");
          if (!claims.length) continue;
          seen.add(row.creatorSlug);
          units.push({ id: row.sourceRef, demo: false, writerName: row.creator, writerSlug: row.creatorSlug, writerHref: row.creatorHref, groupLabel: row.sourceGroupLabel,
            dateIso: row.arrivalAt, text: row.fullText, claims: claims.map((c) => ({ phrase: c.phrase, number: c.number, methodText: c.methodText })), href: row.href });
        }
        before = rows.at(-1)?.arrivalAt || null;
        if (!before) break;
      }
      if (alive) setLive(units);
    })().catch(() => { if (alive) setLive([]); });
    return () => { alive = false; };
  }, []);
  return <section aria-label="מקורות חיצוניים — אב־טיפוס" data-proto-sources="true">
    {live.map((source) => <PostExternalSourceUnit2029 key={source.id} source={source} />)}
    {DEMO_SOURCE_UNITS.map((source) => <PostExternalSourceUnit2029 key={source.id} source={source} />)}
  </section>;
}
