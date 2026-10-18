import React from "react";
import { relativeTimeLabel } from "../../lib/relativeTime2029.js";
import "../../pages/home-world-story2029.css";

// One display card, every source occurrence still addressable by its own ID.
export default function SourceRepeatInfo2029({ item, onSelect, anchorIds = false }) {
  if (item?.occurrenceCount < 2 || !Array.isArray(item?.occurrences)) return null;
  return <div className="sod29-world-group-source-repeats">
    <small>ההודעה הופיעה {item.occurrenceCount} פעמים באותה קבוצה. כל הופעה נשמרת כמקור נפרד.</small>
    <ul>{item.occurrences.map((event, index) => <li key={event.id}
      id={anchorIds && index ? `group-source-${event.id}` : undefined}>
      <button type="button" onClick={() => onSelect?.(event)}>
        הופעה {index + 1} · {relativeTimeLabel(event.at, "זמן לא צוין")}
      </button>
    </li>)}</ul>
  </div>;
}
