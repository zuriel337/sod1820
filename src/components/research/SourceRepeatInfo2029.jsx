import React from "react";
import "../../pages/home-world-story2029.css";

const israelTime = (value) => new Date(value).toLocaleString("he-IL", {
  dateStyle: "short", timeStyle: "short", timeZone: "Asia/Jerusalem",
});

// One display card, every source occurrence still addressable by its own ID.
export default function SourceRepeatInfo2029({ item, onSelect, anchorIds = false }) {
  if (item?.occurrenceCount < 2 || !Array.isArray(item?.occurrences)) return null;
  return <div className="sod29-world-group-source-repeats">
    <small>ההודעה הופיעה {item.occurrenceCount} פעמים באותה קבוצה. כל הופעה נשמרת כמקור נפרד.</small>
    <ul>{item.occurrences.map((event, index) => <li key={event.id}
      id={anchorIds && index ? `group-source-${event.id}` : undefined}>
      <button type="button" onClick={() => onSelect?.(event)}>
        הופעה {index + 1} · {israelTime(event.at)}
      </button>
    </li>)}</ul>
  </div>;
}
