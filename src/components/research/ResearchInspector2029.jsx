import React, { useEffect, useMemo, useState } from "react";
import AskRaziel from "../AskRaziel.jsx";
import TopicConvergenceContent from "./TopicConvergenceContent.jsx";
import { usePalette } from "../../lib/palette.js";
import { fetchEntityHubProjection } from "../../lib/research/entityHubProjection.js";

const TABS = [
  ["overview", "סקירה"],
  ["evidence", "ראיות"],
  ["relations", "קשרים"],
  ["sources", "מקורות"],
  ["time", "זמן"],
  ["raziel", "רזיאל"],
];

function asArray(value) { return Array.isArray(value) ? value : []; }
function rowLabel(row, fallback = "פריט") {
  return row?.statement || row?.subject?.label || row?.label || row?.title || row?.ref || row?.kind || fallback;
}
function rowMeta(row) {
  return row?.verification?.verification_state || row?.stage || row?.kind || row?.ref || "";
}

function ResearchStrength({ score, finding, entityData }) {
  const verification = finding?.verification?.verification_state || finding?.engine_detail?.verification_state || null;
  const sources = asArray(entityData?.sources).length || asArray(finding?.sources).length || asArray(finding?.evidence?.sources).length;
  const anchors = asArray(finding?.projection?.anchors).length;
  const evidenceItems = asArray(finding?.evidence?.items).length || asArray(finding?.evidence?.groups).length;
  const rows = [
    ["מד תצוגה", score != null ? Math.round(Number(score)) : "—", "דירוג תצוגה, לא ציון אמת"],
    ["אימות", verification || "לא צוין", "מצב האימות כפי שהמקור החזיר"],
    ["מקורות", sources, "מקורות זמינים בהקרנה"],
    ["עוגנים", anchors, "עוגנים מפורשים כשקיימים"],
    ["ראיות", evidenceItems || "—", "קבוצות/פריטי evidence כשהם קיימים"],
  ];
  return <div className="ri29-strength">{rows.map(([label, value, note]) => <div key={label}><span>{label}</span><strong>{value}</strong><small>{note}</small></div>)}</div>;
}

function MiniList({ rows, empty, limit = 14 }) {
  if (!rows?.length) return <div className="ri29-empty">{empty}</div>;
  return <div className="ri29-list">{rows.slice(0, limit).map((row, index) => <div className="ri29-list-row" key={row?.id || `${rowLabel(row)}-${index}`}><strong>{rowLabel(row)}</strong>{rowMeta(row) ? <small>{rowMeta(row)}</small> : null}</div>)}</div>;
}

function EntityOverview({ card, entityData, onActivate, onOpenBook, onOpenHeichal }) {
  const methods = asArray(entityData?.gematria?.families);
  const topics = asArray(entityData?.topics?.rows);
  const relations = asArray(entityData?.graph?.relations);
  const researchRows = asArray(entityData?.research?.findings).length ? asArray(entityData?.research?.findings) : asArray(entityData?.research?.rows);
  const sources = asArray(entityData?.sources);
  const timeline = asArray(entityData?.timeline);
  const zeroScale = asArray(entityData?.zeroScale?.scale_chain);

  return <>
    {card?.sub ? <p className="ri29-summary">{card.sub}</p> : null}
    <div className="ri29-actions">
      <button type="button" className="world-btn primary" onClick={onActivate}>פתח כעוגן בעולם</button>
      {card?.facet === "book" ? <button type="button" className="world-btn" onClick={onOpenBook}>פתח את הספר</button> : null}
      <button type="button" className="world-btn" onClick={onOpenHeichal}>◇ העמק בהיכל</button>
    </div>
    <section className="ri29-block">
      <div className="ri29-label">פרופיל חי</div>
      <div className="ri29-gap-grid">
        <span>{relations.length} קשרים</span>
        <span>{researchRows.length} ממצאים</span>
        <span>{sources.length} מקורות</span>
        <span>{topics.length} התכנסויות</span>
        {methods.length ? <span>{methods.length} שיטות</span> : null}
        {timeline.length ? <span>{timeline.length} נקודות זמן</span> : null}
        {zeroScale.length ? <span>{zeroScale.length} נגזרות scale</span> : null}
      </div>
    </section>
    {methods.length ? <section className="ri29-block"><div className="ri29-label">שיטות פעילות</div><div className="world-chip-row">{methods.slice(0, 10).map((method, index) => <span key={method.method || index} className="world-chip static">{method.registry?.display_label || method.method || "שיטה"} · {method.count ?? method.phrases?.length ?? 0}</span>)}</div></section> : null}
  </>;
}

export default function ResearchInspector2029({
  card,
  finding,
  entityData: suppliedEntityData,
  loading,
  error,
  currentContext,
  onOpenNumber,
  onActivate,
  onOpenBook,
  onOpenHeichal,
}) {
  const palette = usePalette();
  const [tab, setTab] = useState("overview");
  const [local, setLocal] = useState({ loading: false, data: null, error: null });
  const isTopic = card?.facet === "topic";
  const score = finding?.evidence?.score ?? (Number(card?.rank?.score) || null);

  useEffect(() => {
    let live = true;
    setTab("overview");
    setLocal({ loading: false, data: null, error: null });
    if (!card || isTopic || suppliedEntityData || !card.refId) return () => { live = false; };
    setLocal({ loading: true, data: null, error: null });
    fetchEntityHubProjection({ type: card.facet, key: card.refId, relationLimit: 90, researchLimit: 50, topicLimit: 14 })
      .then(data => { if (live) setLocal({ loading: false, data, error: null }); })
      .catch(fetchError => { if (live) setLocal({ loading: false, data: null, error: fetchError }); });
    return () => { live = false; };
  }, [card?.facet, card?.refId, isTopic, suppliedEntityData]);

  const entityData = suppliedEntityData || local.data;
  const effectiveLoading = Boolean(loading || local.loading);
  const effectiveError = error || local.error;
  const researchRows = asArray(entityData?.research?.findings).length ? asArray(entityData?.research?.findings) : asArray(entityData?.research?.rows);
  const relations = asArray(entityData?.graph?.relations);
  const sources = asArray(entityData?.sources);
  const timeline = asArray(entityData?.timeline);
  const anchors = useMemo(() => asArray(finding?.projection?.anchors), [finding]);
  const numberAnchors = anchors.filter(anchor => anchor?.type === "number" && Number.isFinite(Number(anchor?.value)));

  const title = finding?.subject?.label || entityData?.identity?.label || card?.label || "מחקר";
  const whyHere = currentContext?.subject
    ? `הפריט מוצג מתוך ההקשר של ${currentContext.subject.label || currentContext.subject.id}. ההקשר מנווט את ההקרנה; הוא אינו משנה את האמת של הפריט.`
    : `הפריט נפתח מתוך ${card?.facet === "topic" ? "רשימת ההתכנסויות" : "העולם החי"}. הסיבה להופעה נשמרת כהקשר ניווט, לא כראיה.`;

  const facts = [
    card?.label ? `נושא: ${card.label}` : null,
    card?.facet ? `סוג: ${card.facet}` : null,
    score != null ? `מד תצוגה: ${Math.round(Number(score))}` : null,
    numberAnchors.length ? `עוגני מספר: ${numberAnchors.map(a => a.value).join(", ")}` : null,
    sources.length ? `מקורות זמינים: ${sources.length}` : null,
    researchRows.length ? `ממצאי מחקר זמינים: ${researchRows.length}` : null,
    relations.length ? `קשרים זמינים: ${relations.length}` : null,
  ].filter(Boolean);

  if (effectiveLoading) return <div className="ri29-state">טוען את יחידת המחקר…</div>;
  if (effectiveError) return <div className="ri29-state error">הפריט לא נטען במלואו כרגע.</div>;

  return <div className="ri29-root">
    <div className="ri29-why"><b>למה זה כאן</b><span>{whyHere}</span></div>

    <nav className="ri29-tabs" aria-label="קטגוריות מחקר">
      {TABS.map(([key, label]) => <button key={key} type="button" className={tab === key ? "active" : ""} onClick={() => setTab(key)}>{label}</button>)}
    </nav>

    {tab === "overview" && <div className="ri29-panel">
      <ResearchStrength score={score} finding={finding} entityData={entityData} />
      {isTopic && finding ? <TopicConvergenceContent finding={finding} palette={palette} /> : <EntityOverview card={card} entityData={entityData} onActivate={onActivate} onOpenBook={onOpenBook} onOpenHeichal={onOpenHeichal} />}
      {numberAnchors.length ? <section className="ri29-block"><div className="ri29-label">עוגני מספר</div><div className="world-chip-row">{numberAnchors.map(anchor => <button className="world-chip primary" type="button" key={anchor.value} onClick={() => onOpenNumber?.(Number(anchor.value))}>{anchor.value} · פתח</button>)}</div></section> : null}
    </div>}

    {tab === "evidence" && <div className="ri29-panel">
      <ResearchStrength score={score} finding={finding} entityData={entityData} />
      <section className="ri29-block"><div className="ri29-label">Evidence / Research</div><MiniList rows={researchRows.length ? researchRows : asArray(finding?.evidence?.items)} empty="אין כרגע Evidence מפורט נוסף בהקרנה הזאת. היעדר פירוט אינו הופך את החומר למאומת." /></section>
      <section className="ri29-block"><div className="ri29-label">פערים גלויים</div><div className="ri29-gap-grid"><span>{sources.length ? "יש מקורות זמינים" : "אין מקורות מפורשים בהקרנה"}</span><span>{finding?.verification?.verification_state ? `אימות: ${finding.verification.verification_state}` : "מצב אימות לא סופק"}</span><span>{anchors.length ? `${anchors.length} עוגנים מפורשים` : "אין עוגנים מפורשים"}</span></div></section>
    </div>}

    {tab === "relations" && <div className="ri29-panel"><MiniList rows={relations.length ? relations : anchors} empty="לא הוחזרו קשרים מפורשים בהקרנה הזאת." /></div>}
    {tab === "sources" && <div className="ri29-panel"><MiniList rows={sources.length ? sources : asArray(finding?.sources)} empty="אין כרגע רשימת מקורות מפורשת בהקרנה." /></div>}
    {tab === "time" && <div className="ri29-panel"><MiniList rows={timeline} empty="אין כרגע ציר זמן מפורש לפריט הזה." /></div>}

    {tab === "raziel" && <div className="ri29-panel ri29-raziel">
      <div className="ri29-label">רזיאל · אותו Research Context</div>
      <p>רזיאל מקבל את אותה ישות, אותו מסלול הגעה ואת הנתונים שכבר הוקרנו. הוא מפרש, מאתר פערים וממליץ על הבדיקה הבאה; הוא לא ממציא אימות ולא מחשב מחדש מנועים קנוניים.</p>
      <AskRaziel
        subject={title}
        facts={facts}
        context={`Shared 2029 Research Inspector. Current item type: ${card?.facet || "unknown"}. Current route context: ${currentContext?.subject?.label || currentContext?.subject?.id || "World root"}. Preserve Truth-axis distinctions. Use supplied evidence/context first. Do not invent verification, canonicality or source support. Recommend one bounded next research action with highest information gain, and allow STOP/NO_ACTION when appropriate. Adapt the research plan to the domain owner rather than forcing Number semantics onto other entity types.`}
        title="רזיאל · הצעד הבא"
        subtitle="אותה משפחה · אותו מוח · הקרנה מותאמת לסוג"
        greeting={`אני בתוך «${title}». אבדוק מה כבר ידוע, מה חסר, ואיזה צעד מחקרי באמת יכול לשנות את התמונה.`}
        cta={false}
      />
    </div>}
  </div>;
}
