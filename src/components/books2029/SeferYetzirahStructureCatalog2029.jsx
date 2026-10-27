import React, { useEffect, useState } from "react";
import { SEFER_YETZIRAH_SOURCE } from "../../data/seferYetzirahWorld2029.js";

export default function StructureCatalog({ onPage }) {
  const [expanded, setExpanded] = useState(false);
  const [structures, setStructures] = useState(null);
  const [error, setError] = useState(false);
  const [selectedId, setSelectedId] = useState("");
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
  const validSource = source => Number.isInteger(source?.pdf_page) && source.pdf_page > 0 && source.pdf_page <= SEFER_YETZIRAH_SOURCE.pdfPages && source.source_ref?.startsWith(`${SEFER_YETZIRAH_SOURCE.identity}#p${source.pdf_page}:`);
  return <section className="yetzirah29-map" aria-labelledby="yetzirah29-catalog-title">
    <header><div><span>לגלות את מבני הספר</span><h2 id="yetzirah29-catalog-title">קטלוג המבנים</h2></div><p>עומקים, אותיות, לוחות ופרשנים — כל מבנה מוביל אל המקום שבו הוא מופיע בכרך.</p></header>
    <button type="button" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? "סגור את קטלוג המבנים" : "פתח את קטלוג המבנים"}</button>
    {expanded && !structures && !error ? <p role="status">טוען את מבני הספר…</p> : null}
    {expanded && error ? <p role="status">הקטלוג לא נטען. הספר נשאר פתוח לקריאה במקור.</p> : null}
    {expanded && structures ? <>
      <div>{structures.map(item => <button type="button" key={item.id} aria-pressed={selectedId === item.id} onClick={() => { setSelectedId(item.id); if (validSource(item.sources?.[0])) onPage(item.sources[0].pdf_page); }}><strong>{item.title}</strong><small>{item.sources?.filter(validSource).map(source => `PDF ${source.pdf_page}`).join(" · ")}</small></button>)}</div>
      {selected ? <article className="yetzirah29-page-card"><h3>{selected.title}</h3><p><b>הסבר נלווה:</b> {selected.illustration?.proposal}</p><p>הרכיבים והקשרים כאן מתארים את המקור; לא כולם מודלים תלת־ממדיים בנויים.</p><div className="yetzirah29-letter-picker">{selected.components?.map(component => <button type="button" key={component.id} disabled={!validSource(component.source)} onClick={() => onPage(component.source.pdf_page)}>{component.label}{validSource(component.source) ? ` · PDF ${component.source.pdf_page}` : ""}</button>)}</div></article> : null}
    </> : null}
  </section>;
}
