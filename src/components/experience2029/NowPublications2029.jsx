import React, { useEffect, useMemo, useState } from "react";
import { recordTimeLabel } from "../../lib/relativeTime2029.js";
import { availableNowLenses, defaultNowLens, filterNowModels, nowLensCounts, nowModels, nowSecondaryChoices, nowSeriesHref } from "../../lib/nowPublications2029.js";
import NowMetricsSlot2029 from "./NowMetricsSlot2029.jsx";
import "./nowPublications2029.css";

// Compact "Now" publications window over the ONE shared system feed (feed.expandedRows).
// No reader, store, polling or ranking of its own: the same rows power the left rail and this sheet.
const PAGE = 12;

function Thumb({ model }) {
  return model.thumb
    ? <img className="sod29-nowpub-thumb" src={model.thumb} alt="" loading="lazy" decoding="async" />
    : <span className="sod29-nowpub-thumb is-glyph" aria-hidden="true">{model.video ? "▶" : model.unverified ? "✦" : "◈"}</span>;
}

// Visible preview inside the row: never autoplays. A video without a poster shows its first frame (metadata only).
function RowPreview({ model }) {
  const poster = model.thumb;
  return <span className={`sod29-nowpub-preview is-${model.previewKind}`} aria-hidden="true">
    {model.previewKind === "video" && !poster && model.mediaHref
      ? <video src={`${model.mediaHref}#t=0.1`} preload="metadata" muted playsInline tabIndex={-1} />
      : poster ? <img src={poster} alt="" loading="lazy" decoding="async" /> : null}
    {model.previewKind === "video" ? <span className="sod29-nowpub-playmark">▶</span> : null}
  </span>;
}

function RowHead({ model, timeMode }) {
  const when = recordTimeLabel(model.at, timeMode, "זמן לא צוין");
  const rich = Boolean(model.previewKind);
  return <>
    {rich ? <RowPreview model={model} /> : <Thumb model={model} />}
    <span className="sod29-nowpub-text">
      {model.excerptIsLead ? null : <strong className="sod29-nowpub-title">{model.title}</strong>}
      {model.excerpt ? <span className={`sod29-nowpub-excerpt${model.excerptIsLead ? " is-lead" : ""}`}>{model.excerpt}</span> : null}
      <small className="sod29-nowpub-meta">
        {model.byline.length ? <span>{model.byline.join(" · ")}</span> : null}
        <span className={model.unverified ? "is-unverified" : undefined}>{model.typeLabel}</span>
        <time dateTime={model.at || undefined}>{when}</time>
      </small>
    </span>
  </>;
}

function VideoOnDemand({ model }) {
  const [armed, setArmed] = useState(false);
  if (armed) return <video className="sod29-nowpub-video" src={model.mediaHref} poster={model.thumb || undefined} controls preload="metadata" playsInline aria-label={`סרטון · ${model.title}`} />;
  return <button type="button" className="sod29-nowpub-play" onClick={() => setArmed(true)} aria-label={`הצג את הנגן · ${model.title}`}>
    {model.thumb ? <img src={model.thumb} alt="" loading="lazy" decoding="async" /> : null}<span aria-hidden="true">▶</span>
  </button>;
}

function RowDetail({ model, onOpen, feed }) {
  const seriesHref = nowSeriesHref(model);
  const fullHref = model.href;
  const open = href => () => { feed?.see?.(model.row); onOpen?.(href); };
  return <div className="sod29-nowpub-detail">
    {model.video && model.mediaHref ? <VideoOnDemand model={model} /> : model.image && model.mediaHref
      ? <img className="sod29-nowpub-image" src={model.mediaHref} alt={`תמונה · ${model.title}`} loading="lazy" decoding="async" /> : null}
    {model.fullText && model.fullText !== model.title ? <p className="sod29-nowpub-body">{model.fullText}</p> : null}
    {model.item.fullTextTruncated ? <small>זהו קטע תחום מהעדכון הציבורי.</small> : null}
    {model.unverified ? <small className="is-unverified">מקור · טרם נבדק. זו הודעת מקור כפי שנשמרה ולא ממצא מאומת.</small> : null}
    <div className="sod29-nowpub-actions">
      {fullHref ? <button type="button" className="sod29-action primary" onClick={open(fullHref)}>{model.unverified ? "למקור" : "לפרסום המלא"}</button> : <small>אין קישור מדויק לפריט; הוא מוצג כאן במלואו.</small>}
      {seriesHref ? <button type="button" className="sod29-action" onClick={open(seriesHref)}>לסדרה{model.seriesLabel ? ` · ${model.seriesLabel}` : ""}</button> : null}
      {model.creatorHref ? <button type="button" className="sod29-action" data-now-action="creator-profile" onClick={open(model.creatorHref)}>לפרופיל · {model.item.creator}</button> : null}
    </div>
  </div>;
}

function Row({ model, onOpen, feed, timeMode }) {
  const className = `sod29-nowpub-row is-${model.media}${model.previewKind ? " has-preview" : ""}${model.unverified ? " is-source" : ""}${model.row.isNew ? " is-new" : ""}`;
  if (model.canExpand) return <li><details className={className} onToggle={event => { if (event.currentTarget.open) feed?.see?.(model.row); }}>
    <summary><RowHead model={model} timeMode={timeMode} /></summary>
    <RowDetail model={model} onOpen={onOpen} feed={feed} />
  </details></li>;
  return <li><button type="button" className={`${className} is-link`} disabled={!model.href}
    onClick={() => { feed?.see?.(model.row); if (model.href) onOpen?.(model.href); }}>
    <RowHead model={model} timeMode={timeMode} />
  </button></li>;
}

// Desktop (>= 761px): list + detail side by side (ZURIEL 5.11.2026). Phone keeps the single list with inline expansion.
const WIDE_QUERY = "(min-width: 761px)";
function useWide() {
  const read = () => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(WIDE_QUERY).matches;
  const [wide, setWide] = useState(read);
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return undefined;
    const query = window.matchMedia(WIDE_QUERY), update = () => setWide(query.matches);
    update(); query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);
  return wide;
}

function WideRow({ model, selected, onSelect, timeMode }) {
  const className = `sod29-nowpub-row is-${model.media}${model.previewKind ? " has-preview" : ""}${model.unverified ? " is-source" : ""}${model.row.isNew ? " is-new" : ""} is-link${selected ? " is-selected" : ""}`;
  return <li><button type="button" className={className} aria-pressed={selected} onClick={() => onSelect(model)}><RowHead model={model} timeMode={timeMode} /></button></li>;
}

function WideDetail({ model, onOpen, feed, timeMode }) {
  if (!model) return <p className="sod29-nowpub-empty" role="status">בחרו פרסום מהרשימה.</p>;
  const when = recordTimeLabel(model.at, timeMode, "זמן לא צוין");
  return <article className="sod29-nowpub-pane" aria-label={model.title}>
    <h3 className="sod29-nowpub-pane-title">{model.title}</h3>
    <small className="sod29-nowpub-meta">
      {model.byline.length ? <span>{model.byline.join(" · ")}</span> : null}
      <span className={model.unverified ? "is-unverified" : undefined}>{model.typeLabel}</span>
      <time dateTime={model.at || undefined}>{when}</time>
    </small>
    <RowDetail key={model.id} model={model} onOpen={onOpen} feed={feed} />
  </article>;
}

export default function NowPublications2029({ feed, onOpen, timeMode }) {
  const [lens, setLens] = useState(null), [series, setSeries] = useState(""), [source, setSource] = useState(""), [media, setMedia] = useState("");
  const [count, setCount] = useState(PAGE);
  const wide = useWide();
  const [selectedId, setSelectedId] = useState(null);
  useEffect(() => { feed?.requestNowDetails?.(); }, [feed?.requestNowDetails]);
  const rows = Array.isArray(feed?.expandedRows) ? feed.expandedRows : Array.isArray(feed?.rows) ? feed.rows : [];
  const models = useMemo(() => nowModels(rows), [rows]);
  const lenses = useMemo(() => availableNowLenses(models), [models]);
  // Entries per lens among the rows already loaded here: a count of loaded entries, never a site-wide total.
  const counts = useMemo(() => nowLensCounts(models), [models]);
  const choices = useMemo(() => nowSecondaryChoices(models), [models]);
  // Until the reader picks, the window opens on "all" (ZURIEL 6.11.2026), in time order.
  const activeLens = lens ?? defaultNowLens(models);
  const shown = useMemo(() => filterNowModels(models, { lens: activeLens, series, source, media }), [models, activeLens, series, source, media]);
  const selected = wide ? (shown.find(model => model.id === selectedId) || shown[0] || null) : null;
  const select = model => { setSelectedId(model.id); feed?.see?.(model.row); };
  const secondaryActive = Boolean(series || source || media);
  // A lens/choice that stopped existing (refresh, retry) must not leave an invisible empty filter.
  useEffect(() => {
    if (lens && lens !== "all" && !lenses.some(item => item.id === lens)) setLens(null);
    if (series && !choices.series.some(item => item.id === series)) setSeries("");
    if (source && !choices.sources.some(item => item.id === source)) setSource("");
    if (media && !choices.media.some(item => item.id === media)) setMedia("");
  }, [lenses, choices, lens, series, source, media]);
  const pick = setter => value => { setter(value); setCount(PAGE); };
  const additionalLoading = Boolean(feed?.nowSources && (!feed.nowSources.requested || feed.nowSources.loading));
  // An approved series occurrence that is no longer public reads as "access_filtered" by design (not a read failure).
  const additionalUnavailable = Boolean(feed?.nowSources?.error || feed?.nowSources?.sourceStates?.some(item => item.status === "failed"
    || item.status === "access_filtered" && !String(item.source || "").startsWith("series:")));
  const partial = Array.isArray(feed?.unavailableSources) && feed.unavailableSources.length > 0;
  const initialLoading = Boolean(feed?.loading && !models.length);
  // Nothing readable AND something failed: say so; never present a failed read as an empty world.
  const hardError = Boolean(!models.length && !initialLoading && !additionalLoading && (feed?.error || additionalUnavailable || partial));
  const clear = () => { setLens("all"); setSeries(""); setSource(""); setMedia(""); setCount(PAGE); };

  return <section className="sod29-nowpub" aria-label="פרסומים" aria-busy={initialLoading || additionalLoading}>
    <NowMetricsSlot2029 />
    <div className="sod29-nowpub-filters" role="group" aria-label="סינון פרסומים">
      {lenses.map(item => <button key={item.id} type="button" className="sod29-nowpub-chip" aria-pressed={activeLens === item.id}
        aria-label={`${item.label}, ${counts[item.id]} פרסומים שנטענו בחלונית`} title={`${counts[item.id]} פרסומים שנטענו בחלונית`}
        onClick={() => pick(setLens)(item.id)}>{item.label}<span className="sod29-nowpub-chip-count" aria-hidden="true">{counts[item.id]}</span></button>)}
    </div>
    {choices.series.length + choices.sources.length > 1 || choices.media.length > 1 ? <details className="sod29-nowpub-more" open={secondaryActive || undefined}>
      <summary>מסננים נוספים{secondaryActive ? " · פעיל" : ""}</summary>
      <div className="sod29-nowpub-selects">
        {choices.series.length > 0 ? <label>סדרה<select value={series} onChange={event => pick(setSeries)(event.target.value)}><option value="">כל הסדרות</option>{choices.series.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label> : null}
        {choices.sources.length > 1 ? <label>מקור<select value={source} onChange={event => pick(setSource)(event.target.value)}><option value="">כל המקורות</option>{choices.sources.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label> : null}
        {choices.media.length > 1 ? <label>מדיה<select value={media} onChange={event => pick(setMedia)(event.target.value)}><option value="">כל סוגי המדיה</option>{choices.media.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label> : null}
      </div>
    </details> : null}

    <div className="sod29-nowpub-status" aria-live="polite">
      {initialLoading ? <p role="status">טוען פרסומים…</p> : null}
      {additionalLoading && !initialLoading ? <p role="status">קורא פרסומים נוספים…</p> : null}
      {hardError ? <p role="alert">הפרסומים אינם זמינים כרגע. <button type="button" className="sod29-nowpub-link" onClick={feed?.refreshNowDetails}>ניסיון נוסף</button></p> : null}
      {!hardError && models.length > 0 && (additionalUnavailable || partial) ? <p role="status">חלק מהמקורות לא נקראו. <button type="button" className="sod29-nowpub-link" onClick={feed?.refreshNowDetails}>ניסיון נוסף</button></p> : null}
      {feed?.groupArrivals && feed.groupArrivals.state !== "connected" ? <p role="status">{feed.groupArrivals.message}</p> : null}
    </div>

    {!initialLoading && !hardError && !additionalLoading && !shown.length
      ? <p className="sod29-nowpub-empty" role="status">{models.length ? "אין פרסומים בסינון הזה." : "אין כרגע פרסומים להצגה."}
        {models.length && (activeLens !== "all" || secondaryActive) ? <> <button type="button" className="sod29-nowpub-link" onClick={clear}>הצג הכול</button></> : null}</p> : null}

    {wide
      ? <div className="sod29-nowpub-split">
        <ul className="sod29-nowpub-list">{shown.slice(0, count).map(model => <WideRow key={model.id} model={model} selected={selected?.id === model.id} onSelect={select} timeMode={timeMode} />)}</ul>
        {shown.length ? <WideDetail model={selected} onOpen={onOpen} feed={feed} timeMode={timeMode} /> : null}
      </div>
      : <ul className="sod29-nowpub-list">
        {shown.slice(0, count).map(model => <Row key={model.id} model={model} onOpen={onOpen} feed={feed} timeMode={timeMode} />)}
      </ul>}
    {count < shown.length ? <button type="button" className="sod29-action sod29-nowpub-more-btn" onClick={() => setCount(n => n + PAGE)}>עוד · {Math.min(count, shown.length)} מתוך {shown.length}</button> : null}
    <button type="button" className="sod29-action sod29-nowpub-world" onClick={() => onOpen?.("/world")}>לחידושים בעולם ←</button>
  </section>;
}
