import React, { useMemo, useState } from "react";
import { FrameState } from "../experience2029/Sod2029Shell.jsx";
import {
  CANONICAL_PUBLIC_UI_COPY,
  PUBLIC_ACTIVITY_KIND,
  canonicalPublicActivityPresentation,
} from "../../lib/presentation/canonicalPresentation.js";
import { bilingualDateLabel } from "../../lib/relativeTime2029.js";

const EMPTY_ROWS = Object.freeze([]);
const FILTERS = Object.freeze([
  ["all", "הכול"],
  ["sources", "מקורות"],
  ["updated", "מקורות שעודכנו"],
  ["writers", "דפי כתבים"],
  ["topics", "נושאים"],
  ["findings", "ממצאים"],
]);

function writerActivity(person) {
  if (!person?.slug || !person?.displayName) return null;
  return {
    id: `writer:${person.slug}`,
    kind: "writer",
    label: person.displayName,
    creator: person.role || "דף כתב ציבורי",
    updatedAt: person.updatedAt || null,
    href: person.href || null,
  };
}

function activityType(item, activity) {
  if (item.kind === "writer") return "writers";
  if (item.kind === "convergence") return "topics";
  if (item.kind === "finding") return "findings";
  if (activity.key === PUBLIC_ACTIVITY_KIND.SOURCE_UPDATED) return "updated";
  return "sources";
}

function mergeActivity({ items, arrivals, people }) {
  const rows = new Map();
  for (const item of Array.isArray(items) ? items : []) {
    if (item?.id) rows.set(item.id, item);
  }
  for (const item of Array.isArray(arrivals) ? arrivals : []) {
    if (!item?.id) continue;
    rows.set(item.id, { ...(rows.get(item.id) || {}), ...item });
  }
  for (const person of Array.isArray(people) ? people : []) {
    const item = writerActivity(person);
    if (item) rows.set(item.id, item);
  }
  return [...rows.values()].map((item) => ({
    item,
    activity: canonicalPublicActivityPresentation(item),
  })).sort((left, right) => {
    const a = left.activity.at ? Date.parse(left.activity.at) : 0;
    const b = right.activity.at ? Date.parse(right.activity.at) : 0;
    return b - a || String(left.item.id).localeCompare(String(right.item.id), "he");
  });
}

function actionLabel(item) {
  if (item.kind === "writer") return CANONICAL_PUBLIC_UI_COPY.action.writer;
  if (item.kind === "convergence") return CANONICAL_PUBLIC_UI_COPY.action.topic;
  if (item.kind === "finding") return CANONICAL_PUBLIC_UI_COPY.action.finding;
  return CANONICAL_PUBLIC_UI_COPY.action.source;
}

/** One public activity projection over readers already used by World. No reader, cache or truth state is created here. */
export default function WorldPublicUpdates2029({
  items = EMPTY_ROWS, arrivals = EMPTY_ROWS, people = EMPTY_ROWS, loading = false, error = null, availability = null, onOpen, initialLimit = 12,
}) {
  const [filter, setFilter] = useState("all");
  const [limit, setLimit] = useState(initialLimit);
  const activity = useMemo(() => mergeActivity({ items, arrivals, people }), [items, arrivals, people]);
  const filtered = activity.filter((row) => filter === "all" || activityType(row.item, row.activity) === filter
    || (filter === "sources" && row.item.kind === "source"));
  const visible = filtered.slice(0, limit);

  return <section className="sod29-world-public-updates" id="world-public-updates" aria-label="עדכונים ציבוריים אחרונים">
    <header>
      <div className="sod29-kicker">עדכונים ציבוריים</div>
      <h2>חדש בעולם</h2>
      <p>מקורות, דפי כתבים, נושאים וממצאים ציבוריים לפי מועד הפרסום, העדכון או האישור המתועד.</p>
    </header>
    <div className="sod29-world-update-filters" role="group" aria-label="סינון העדכונים הציבוריים">
      {FILTERS.map(([key, label]) => <button type="button" key={key} aria-pressed={filter === key}
        onClick={() => { setFilter(key); setLimit(initialLimit); }}>{label}</button>)}
    </div>
    {loading ? <FrameState kind="loading" title="העדכונים הציבוריים נטענים" /> : null}
    {error ? <p role="status">העדכונים הציבוריים אינם זמינים כרגע.</p> : null}
    {availability?.state !== "connected" && availability?.message
      ? <p className="sod29-world-update-note" role="status">{availability.message}</p>
      : null}
    {!loading && !error && !visible.length ? <p role="status">אין עדכונים זמינים במסנן הזה.</p> : null}
    {!loading && !error && visible.length ? <>
      <p className="sod29-world-update-count">מוצגים {visible.length} מתוך {filtered.length} עדכונים ציבוריים</p>
      <div className="sod29-world-update-grid">
        {visible.map(({ item, activity: state }) => <article key={item.id}>
          <div className="sod29-world-update-meta">
            <span className={`sod29-world-update-state is-${state.tone}`}>{state.label}</span>
            <time dateTime={state.at || undefined}>{state.at
              ? `${state.dateLabel} · ${bilingualDateLabel(state.at)}`
              : "אין נתון"}</time>
          </div>
          <h3>{item.label}</h3>
          {item.creator ? <p className="sod29-world-update-creator">{item.creator}</p> : null}
          {item.summary ? <p>{item.summary}</p> : null}
          <button type="button" onClick={() => onOpen?.(item)}>{actionLabel(item)} ←</button>
        </article>)}
      </div>
      {visible.length < filtered.length ? <button type="button" className="sod29-action"
        onClick={() => setLimit((value) => value + 12)}>{CANONICAL_PUBLIC_UI_COPY.action.more} ({filtered.length - visible.length})</button> : null}
    </> : null}
    <p className="sod29-world-update-note">הסימון מתאר פעילות ותאריך בלבד; הוא אינו ציון אמת, איכות או חוזק מחקרי.</p>
  </section>;
}
