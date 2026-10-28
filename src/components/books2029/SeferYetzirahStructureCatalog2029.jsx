import React, { lazy, Suspense, useEffect, useState } from "react";
import { SEFER_YETZIRAH_SOURCE } from "../../data/seferYetzirahWorld2029.js";

const MODELS = {
  "sy-structure:ten-depths": lazy(() => import("./yetzirahModels/TenDepthsModel2029.jsx")),
  "sy-structure:five-against-five": lazy(() => import("./yetzirahModels/FiveAgainstFiveModel2029.jsx")),
  "sy-structure:letter-families": lazy(() => import("./yetzirahModels/LetterFamiliesModel2029.jsx")),
  "sy-structure:five-mouth-groups": lazy(() => import("./yetzirahModels/PhoneticGroupsModel2029.jsx")),
  "sy-structure:six-seals-synoptic": lazy(() => import("./yetzirahModels/SynopticSealsModel2029.jsx")),
  "sy-structure:six-seals-gra-edition": lazy(() => import("./yetzirahModels/GraSealsModel2029.jsx")),
  "sy-structure:mothers-world-year-soul": lazy(() => import("./yetzirahModels/MothersCorrespondencesModel2029.jsx")),
  "sy-structure:doubles-synoptic": lazy(() => import("./yetzirahModels/SynopticDoublesModel2029.jsx")),
  "sy-structure:doubles-gra-distinction": lazy(() => import("./yetzirahModels/GraDoublesModel2029.jsx")),
  "sy-structure:stones-houses": lazy(() => import("./yetzirahModels/StonesHousesModel2029.jsx")),
  "sy-structure:twelve-boundaries-gra": lazy(() => import("./yetzirahModels/TwelveBoundariesModel2029.jsx")),
  "sy-structure:three-kings": lazy(() => import("./yetzirahModels/ThreeKingsModel2029.jsx")),
};

export default function StructureCatalog({ onPage, structureId, componentId, onStructure, onComponent, onOpenSource }) {
  const [expanded, setExpanded] = useState(Boolean(structureId));
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState("all");
  const [structures, setStructures] = useState(null);
  const [error, setError] = useState(false);
  const selectedId = structureId || "";
  useEffect(() => {
    if (!expanded || structures) return;
    const controller = new AbortController();
    setError(false);
    fetch("/book-data/sefer-yetzirah.structures.json", { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error("unavailable");
      const data = await response.json();
      if (data.schema_version !== "sefer-yetzirah-structures.v1" || data.source_identity !== SEFER_YETZIRAH_SOURCE.identity || !Array.isArray(data.structures)) throw new Error("foreign source");
      if (!controller.signal.aborted) setStructures(data.structures);
    }).catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [expanded, structures]);
  const selected = structures?.find(item => item.id === selectedId);
  const Model = MODELS[selectedId];
  const topics = [["all", "כל הנושאים"], ["letters", "אותיות"], ["space", "כיוונים ועומקים"], ["other", "משלים ומניינים"]];
  const category = item => /letter|mouth|mothers|doubles/.test(item.id) ? "letters" : /depth|seals|boundaries/.test(item.id) ? "space" : "other";
  const visible = structures?.filter(item => MODELS[item.id] && ((topic === "all" || category(item) === topic) && `${item.title} ${item.components.map(c => c.label_he || c.label).join(" ")}`.includes(query.trim()) || item.id === selectedId));
  const validSource = source => Number.isInteger(source?.pdf_page) && source.pdf_page > 0 && source.pdf_page <= SEFER_YETZIRAH_SOURCE.pdfPages && source.source_ref?.startsWith(`${SEFER_YETZIRAH_SOURCE.identity}#p${source.pdf_page}:`);
  return <section className="yetzirah29-map" aria-labelledby="yetzirah29-catalog-title">
    <header><div><span>לגלות את מבני הספר</span><h2 id="yetzirah29-catalog-title">קטלוג המבנים</h2></div><p>עומקים, אותיות, לוחות ופרשנים — כל מבנה מוביל אל המקום שבו הוא מופיע בכרך.</p></header>
    <button type="button" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? "סגור את קטלוג המבנים" : "פתח את קטלוג המבנים"}</button>
    {expanded && !structures && !error ? <p role="status">טוען את מבני הספר…</p> : null}
    {expanded && error ? <p role="status">הקטלוג לא נטען. הספר נשאר פתוח לקריאה במקור.</p> : null}
    {expanded && structures ? <>
      <div className="yetzirah29-catalog-filters"><label>חיפוש מבנה או רכיב <input value={query} onChange={event => setQuery(event.target.value)} /></label><label>נושא <select value={topic} onChange={event => setTopic(event.target.value)}>{topics.map(([id,label]) => <option key={id} value={id}>{label}</option>)}</select></label></div>
      {selected && !((topic === "all" || category(selected) === topic) && `${selected.title} ${selected.components.map(c => c.label_he || c.label).join(" ")}`.includes(query.trim())) && <p role="status">המבנה שנפתח בקישור נשאר מוצג גם כשהוא מחוץ למסנן.</p>}
      {visible.length === 0 && <p role="status">לא נמצאו מבנים במסנן הזה.</p>}
      <div className="yetzirah29-catalog-grid">{visible.map(item => <article key={item.id}><h3>{item.title}</h3><p>{item.source_acceptance?.legend_he}</p><p>{item.components.map(c => c.label_he || c.label).join(" · ")}</p><small>{[...new Set(item.sources?.filter(validSource).map(source => `PDF ${source.pdf_page}`))].join(" · ")}</small><button type="button" aria-pressed={selectedId === item.id} onClick={() => onStructure(item.id, item.sources?.[0]?.pdf_page)}>למדו את המבנה</button></article>)}</div>
      {selected && Model && <article id="yetzirah29-structure-learning" tabIndex={-1}><Suspense fallback={<p role="status">טוען את המבנה…</p>}><Model key={selectedId} selectedId={componentId || undefined} onSelect={onComponent} onOpenSource={onOpenSource} /></Suspense></article>}

    </> : null}
  </section>;
}
