// Prototype harness for external source units inside a Post (?proto=sources). It shows what the intake session has ALREADY made public
// (the public reader world_group_source_arrivals_v2, through the existing projection) and clearly labelled DEMONSTRATION units for
// sources that are still private. It never reads a private row, never changes a permission and never writes anything.
import React, { useEffect, useState } from "react";
import PostExternalSourceUnit2029 from "./PostExternalSourceUnit2029.jsx";
import { fetchGroupSourceArrivals } from "../../lib/research/worldGroupSource.js";
import { extractHintClaim } from "../../lib/research/postSourceHintClaim2029.js";

// Sample data, labelled as such on screen. 1237 is NOT checked in the engine here (unchecked by design); the second sample states a
// wrong number on purpose to show the distinct mismatch state with the engine's real value.
export const DEMO_SOURCE_UNITS = Object.freeze([
  Object.freeze({ id: "demo-1237", demo: true, writerName: "שחר (הדגמה)", groupLabel: "הגילוי היומי", dateIso: "2026-11-11T18:00:00+02:00",
    text: "הודעת הדגמה: ביטוי שטרם נבדק במנוע.", phrase: "ביטוי לדוגמה", number: 1237, skipEngine: true, href: null }),
  Object.freeze({ id: "demo-mismatch", demo: true, writerName: "יניב (הדגמה)", groupLabel: "הגילוי היומי", dateIso: "2026-11-11T19:00:00+02:00",
    text: "הודעת הדגמה: מספר נטען שאינו תואם את המנוע.", phrase: "נתניהו", number: 77, href: null }),
]);

export default function PostExternalSourcesPreview2029() {
  const [live, setLive] = useState([]);
  useEffect(() => {
    let alive = true;
    fetchGroupSourceArrivals({ limit: 40 }).then((rows) => {
      if (!alive) return;
      const units = [];
      for (const row of rows) {
        const claim = extractHintClaim(row.fullText);
        if (!claim) continue;
        units.push({ id: row.sourceRef, demo: false, writerName: row.creator, writerHref: row.creatorHref, groupLabel: row.sourceGroupLabel,
          dateIso: row.arrivalAt, text: row.fullText, phrase: claim.phrase, number: claim.number, href: row.href });
        if (units.length >= 1) break;
      }
      setLive(units);
    }).catch(() => { if (alive) setLive([]); });
    return () => { alive = false; };
  }, []);
  return <section aria-label="מקורות חיצוניים — אב־טיפוס" data-proto-sources="true">
    {live.map((source) => <PostExternalSourceUnit2029 key={source.id} source={source} />)}
    {DEMO_SOURCE_UNITS.map((source) => <PostExternalSourceUnit2029 key={source.id} source={source} />)}
  </section>;
}
