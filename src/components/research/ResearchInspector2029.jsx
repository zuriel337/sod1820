import React, { useMemo, useState } from "react";
import AskRaziel from "../AskRaziel.jsx";
import TopicConvergenceContent from "./TopicConvergenceContent.jsx";
import NumberCoreMaster2029 from "../number/NumberCoreMaster2029.jsx";
import { usePalette } from "../../lib/palette.js";

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
    ["עוגנים", anchors, "עוגנים מפורשים בהתכנסות"],
    ["ראיות", evidenceItems || "—", "קבוצות/פריטי evidence כשהם קיימים"],
  ];
  return <div className="ri29-strength">{rows.map(([label, value, note]) => <div key={label}><span>{label}</span><strong>{value}</strong><small>{note}</small></div>)}</div>;
}

function MiniList({ rows, empty, limit = 14 }) {
  if (!rows?.length) return <div className="ri29-empty">{empty}</div>;
  return <div className="ri29-list">{rows.slice(0, limit).map((row, index) => <div className="ri29-list-row" key={row?.id || `${rowLabel(row)}-${index}`}><strong>{rowLabel(row)}</strong>{rowMeta(row) ? <small>{rowMeta(row)}</small> : null}</div>)}</div>;
}

export default function ResearchInspector2029({
  card,
  finding,
  entityData,
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
  const isTopic = card?.facet === "topic";
  const isNumber = card?.facet === "number" && Number.isFinite(Number(card?.refId));
  const score = finding?.evidence?.score ?? (Number(card?.rank?.score) || null);

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
    score != null ? `מד תצוגה: ${Math.round(Number(score))}` : null,
    numberAnchors.length ? `עוגני מספר: ${numberAnchors.map(a => a.value).join(", ")}` : null,
    sources.length ? `מקורות זמינים: ${sources.length}` : null,
    researchRows.length ? `ממצאי מחקר זמינים: ${researchRows.length}` : null,
  ].filter(Boolean);

  if (loading) return <div className="ri29-state">טוען את יחידת המחקר…</div>;
  if (error) return <div className="ri29-state error">הפריט לא נטען במלואו כרגע.</div>;

  if (isNumber) {
    return <div className="ri29-number-master">
      <div className="ri29-one-master-note">אותו Number Core Master · אותה שכבת רזיאל · אותה סמנטיקת מחקר</div>
      <NumberCoreMaster2029 number={Number(card.refId)} variant="drawer" onOpenNumber={onOpenNumber} />
    </div>;
  }

  return <div className="ri29-root">
    <div className="ri29-why"><b>למה זה כאן</b><span>{whyHere}</span></div>

    <nav className="ri29-tabs" aria-label="קטגוריות מחקר">
      {TABS.map(([key, label]) => <button key={key} type="button" className={tab === key ? "active" : ""} onClick={() => setTab(key)}>{label}</button>)}
    </nav>

    {tab === "overview" && <div className="ri29-panel">
      <ResearchStrength score={score} finding={finding} entityData={entityData} />
      {isTopic && finding ? <TopicConvergenceContent finding={finding} palette={palette} /> : <>
        {card?.sub ? <p className="ri29-summary">{card.sub}</p> : null}
        <div className="ri29-actions">
          <button type="button" className="world-btn primary" onClick={onActivate}>פתח כעוגן בעולם</button>
          {card?.facet === "book" ? <button type="button" className="world-btn" onClick={onOpenBook}>פתח את הספר</button> : null}
          <button type="button" className="world-btn" onClick={onOpenHeichal}>◇ העמק בהיכל</button>
        </div>
      </>}
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
      <p>רזיאל מקבל את אותה ישות, אותו מסלול הגעה ואת הנתונים שכבר הוקרנו. הוא מפרש וממליץ על בדיקה הבאה; הוא לא ממציא אימות ולא מחשב מחדש מנועים קנוניים.</p>
      <AskRaziel
        subject={title}
        facts={facts}
        context={`World Research Inspector. Current item type: ${card?.facet || "unknown"}. Current route context: ${currentContext?.subject?.label || currentContext?.subject?.id || "World root"}. Preserve Truth-axis distinctions. Use supplied evidence/context first. Do not invent verification, canonicality or source support. Recommend one bounded next research action with highest information gain, and allow STOP/NO_ACTION when appropriate.`}
        title="רזיאל · הצעד הבא"
        subtitle="אותו מוח · אותו הקשר · אותה אמת"
        greeting={`אני בתוך «${title}». אבדוק קודם מה כבר ידוע, מה חסר, ומה הבדיקה הבאה שבאמת יכולה לשנות את התמונה.`}
        cta={false}
      />
    </div>}
  </div>;
}
