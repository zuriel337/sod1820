import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Sod2029Shell, { FrameState, use2029Shell } from "../components/experience2029/Sod2029Shell.jsx";
import { fetchPost2029Projection } from "../lib/research/post2029Projection.js";
import { useResearch } from "../lib/research/ResearchProvider.jsx";
import { fetchGematriaMethodTrace } from "../lib/research/gematriaTrace.js";
import { applySeo } from "../lib/seo.js";
import "./post2029.css";

const clean = (value) => value == null ? "" : String(value).trim();

function formatDate(value, withTime = false) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("he-IL", withTime
    ? { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jerusalem" }
    : { dateStyle: "medium", timeZone: "Asia/Jerusalem" }
  ).format(date);
}

function UnitLabel({ role }) {
  const labels = {
    source: "מקור",
    source_representation: "תמלול",
    system_analysis: "נוסף אחר כך",
  };
  return <span className={`sod29-post-role role-${role || "unknown"}`}>{labels[role] || role || "יחידה"}</span>;
}

function SourceMediaUnit({ unit }) {
  const media = unit.media || {};
  return <section className="sod29-post-unit sod29-post-media-unit" id={unit.id}>
    <div className="sod29-post-unit-head">
      <div><UnitLabel role={unit.role} /><h2>{unit.title}</h2><small>{unit.sourceLabel}</small></div>
    </div>
    <div className="sod29-post-video-frame">
      <video controls playsInline preload="metadata" poster={media.poster || undefined}>
        <source src={media.src} />
        {(media.tracks || []).map((track) => <track
          key={track.src}
          kind={track.kind || "subtitles"}
          src={track.src}
          srcLang={track.lang || undefined}
          label={track.label || track.lang || "כתוביות"}
          default={!!track.default}
        />)}
      </video>
    </div>
  </section>;
}

function HtmlUnit({ unit, collapsible = false }) {
  const [open, setOpen] = useState(!collapsible);
  return <section className={`sod29-post-unit sod29-post-html-unit ${collapsible ? "is-collapsible" : ""}`} id={unit.id}>
    <div className="sod29-post-unit-head">
      <div><UnitLabel role={unit.role} /><h2>{unit.title}</h2>{unit.sourceLabel ? <small>{unit.sourceLabel}</small> : null}</div>
      {collapsible ? <button type="button" className="sod29-post-toggle" aria-expanded={open} onClick={() => setOpen((value) => !value)}>{open ? "סגור" : "פתח"}</button> : null}
    </div>
    {open ? <div className="sod29-post-authored" dangerouslySetInnerHTML={{ __html: unit.html }} /> : <p className="sod29-post-collapsed-note">התמלול נשמר כחלק מהמקור, אבל לא תופס את המסך עד שבוחרים לפתוח אותו.</p>}
  </section>;
}

function CalculationCard({ row, traceState, onOpenHint }) {
  const state = traceState?.[row.expression + "|" + row.methodKey] || null;
  const actual = state?.finding?.verification?.engine_result;
  const verified = Number.isFinite(actual) && actual === row.claimedValue;
  return <article className="sod29-post-calc">
    <div className="sod29-post-calc-top">
      <span>{row.methodLabel}</span>
      <span className={verified ? "is-verified" : state?.loading ? "is-loading" : "is-pending"}>{verified ? "אומת ✓" : state?.loading ? "בודק…" : state?.error ? "לא אומת" : "ממתין"}</span>
    </div>
    <button type="button" className="sod29-post-expression" onClick={() => onOpenHint(row)} aria-label={`פתח את הרמז של ${row.expression}`}>{row.expression}</button>
    <button type="button" className="sod29-post-value" onClick={() => onOpenHint(row)} aria-label={`פתח את ${row.claimedValue} עם הביטוי והשיטה`}>{row.claimedValue}</button>
    {row.readings?.map((reading) => <div className="sod29-post-reading" key={reading.id || reading.digit_sequence}>
      <span>רמז יסוד</span>
      <strong>{row.claimedValue} → {reading.digit_sequence}</strong>
      <p>{reading.reading}</p>
    </div>)}
    <small>לחץ על הביטוי או על המספר כדי לפתוח אותו בדיוק בשיטה הזאת.</small>
  </article>;
}

function ResearchUpdateUnit({ unit, traceState, onOpenHint }) {
  return <section className="sod29-post-unit sod29-post-update-unit" id={unit.id}>
    <div className="sod29-post-update-marker" aria-hidden="true" />
    <div className="sod29-post-unit-head sod29-post-update-head">
      <div>
        <UnitLabel role={unit.role} />
        <h2>{unit.title}</h2>
        <small>{unit.contributor ? `תרומה · ${unit.contributor}` : "תוספת מערכת"}{unit.addedAt ? ` · ${formatDate(unit.addedAt, true)}` : ""}</small>
      </div>
      <span className="sod29-post-time-basis" title="ב־Golden Preview הזמן נגזר מ־posts.modified">נוסף אחרי הפרסום</span>
    </div>

    <div className="sod29-post-update-source">
      <div className="sod29-kicker">מה נוסף</div>
      <div className="sod29-post-authored" dangerouslySetInnerHTML={{ __html: unit.html }} />
    </div>

    {unit.calculations?.length ? <div className="sod29-post-calc-block">
      <div className="sod29-section-head">
        <div><div className="sod29-kicker">רמזים במספרים</div><h3>מה נפתח כאן?</h3></div>
        <span className="sod29-chip">{unit.calculations.length}</span>
      </div>
      <div className="sod29-post-calc-grid">
        {unit.calculations.map((row) => <CalculationCard
          key={row.expression + row.methodKey + row.claimedValue}
          row={row}
          traceState={traceState}
          onOpenHint={onOpenHint}
        />)}
      </div>
    </div> : null}
  </section>;
}

function PostPageBody() {
  const { slug } = useParams();
  const shell = use2029Shell();
  const research = useResearch();
  const [state, setState] = useState({ loading: true, projection: null, error: null });
  const [traceState, setTraceState] = useState({});

  useEffect(() => {
    let live = true;
    setState({ loading: true, projection: null, error: null });
    fetchPost2029Projection(slug)
      .then((projection) => { if (live) setState({ loading: false, projection, error: projection ? null : "הפוסט לא נמצא" }); })
      .catch((error) => { if (live) setState({ loading: false, projection: null, error: error?.message || "טעינת הפוסט נכשלה" }); });
    return () => { live = false; };
  }, [slug]);

  const calculations = useMemo(() => state.projection?.units?.flatMap((unit) => unit.calculations || []) || [], [state.projection]);

  useEffect(() => {
    let live = true;
    if (!calculations.length) return () => { live = false; };
    for (const row of calculations) {
      const key = row.expression + "|" + row.methodKey;
      setTraceState((current) => current[key] ? current : { ...current, [key]: { loading: true, finding: null, error: null } });
      fetchGematriaMethodTrace(row.methodKey, row.expression)
        .then((finding) => { if (live) setTraceState((current) => ({ ...current, [key]: { loading: false, finding, error: null } })); })
        .catch((error) => { if (live) setTraceState((current) => ({ ...current, [key]: { loading: false, finding: null, error: error?.message || "trace failed" } })); });
    }
    return () => { live = false; };
  }, [calculations]);

  if (state.loading) return <FrameState kind="loading" title="פותח את המקור והרמזים שנוספו">המקור נשאר במקומו; התוספות נטענות אחריו.</FrameState>;
  if (state.error || !state.projection) return <FrameState kind="error" title="לא הצלחתי לפתוח את הפוסט">{state.error}</FrameState>;

  const { projection } = state;
  const { post } = projection;
  const mediaUnit = projection.units.find((unit) => unit.type === "source_media");
  const storyUnit = projection.units.find((unit) => unit.type === "authored_content");
  const transcriptUnit = projection.units.find((unit) => unit.type === "transcript");
  const updateUnits = projection.units.filter((unit) => unit.type === "research_update");

  const openHint = (row) => {
    const value = Number(row?.claimedValue);
    if (!Number.isSafeInteger(value)) return;
    const subject = { id: String(value), type: "number", label: String(value), href: `/2029/number/${value}` };
    const selection = {
      entityId: String(value),
      entityType: "number",
      expression: row.expression,
      method: row.methodKey,
      resultValue: value,
    };
    research?.setResearchContext?.({
      subject,
      selection,
      lens: "post",
      returnTo: {
        href: projection.identity.previewHref,
        label: post.title,
        subject: { id: String(post.id), type: "post", label: post.title, href: projection.identity.previewHref },
        selection: null,
        lens: "post",
        dimensions: {},
        journey: null,
      },
    });
    shell.openNumber?.(subject);
  };

  return <div className="sod29-post-page">
    <header className="sod29-post-hero">
      <div className="sod29-post-eyebrow">מקור · תוספות · רמזים</div>
      <h1>{post.title}</h1>
      <p>{projection.excerpt}</p>
      <div className="sod29-post-meta">
        {post.author ? <span>מאת {post.author}</span> : null}
        {post.date ? <span>{formatDate(post.date)}</span> : null}
        <span>{projection.medium === "video" ? "וידאו + קריאה" : "קריאה"}</span>
      </div>
      <div className="sod29-post-hero-actions">
        <a className="sod29-action primary" href="#primary-media">למקור</a>
        <a className="sod29-action" href="#research-update">מה נוסף?</a>
        <Link className="sod29-action" to={projection.identity.canonicalHref}>לגרסה הציבורית</Link>
      </div>
    </header>

    {mediaUnit ? <SourceMediaUnit unit={mediaUnit} /> : null}
    {storyUnit ? <HtmlUnit unit={storyUnit} /> : null}
    {transcriptUnit ? <HtmlUnit unit={transcriptUnit} collapsible /> : null}

    {updateUnits.length ? <div className="sod29-post-updates">
      <div className="sod29-post-updates-title"><span>מאז הפרסום</span><h2>רמזים שנוספו אחרי המקור</h2></div>
      {updateUnits.map((unit) => <ResearchUpdateUnit key={unit.id} unit={unit} traceState={traceState} onOpenHint={openHint} />)}
    </div> : null}

    <section className="sod29-section sod29-post-boundary">
      <div className="sod29-kicker">חשוב לדעת</div>
      <h2>מה אומת ומה נשאר רמז</h2>
      {projection.caveats.map((text) => <p key={text}>{text}</p>)}
    </section>
  </div>;
}

export default function Post2029Page() {
  const { slug } = useParams();

  useEffect(() => {
    applySeo({
      title: "Post 2029 · Golden Preview",
      description: "Golden Preview למבנה הפוסט החדש של SOD1820.",
      path: `/2029/post/${slug || ""}`,
      type: "article",
      noindex: true,
    });
  }, [slug]);

  return <Sod2029Shell surface="post" symbol="↟" status="פוסט חי · תצוגת ניסיון">
    <PostPageBody />
  </Sod2029Shell>;
}
