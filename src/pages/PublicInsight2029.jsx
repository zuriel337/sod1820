import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Sod2029Shell from "../components/experience2029/Sod2029Shell.jsx";
import { readAnonymousSourceRows2029 } from "../lib/readAnonymousSourceRows2029.js";
import { readPublicInsight2029 } from "../lib/publicInsightReading2029.js";
import { applySeo } from "../lib/seo.js";

export default function PublicInsight2029({ id, indexable }) {
  const [result, setResult] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const item = result?.item;
  const title = item?.title || "חידוש מבית המדרש";

  useEffect(() => {
    const controller = new AbortController();
    readPublicInsight2029(path => readAnonymousSourceRows2029(path, controller.signal), id).then(item => {
      if (!controller.signal.aborted) setResult({ item });
    }).catch(() => { if (!controller.signal.aborted) setResult({ failed: true }); });
    return () => controller.abort();
  }, [id, attempt]);

  useEffect(() => {
    if (result) applySeo({ title, description: item?.body.slice(0, 170) || "חידושי בית המדרש", path: item?.href || "/findings", noindex: !item || !indexable, follow: true });
  }, [title, result, item, indexable]);

  return <Sod2029Shell surface="world" title={title} introVariant="none">
    <article className="sod29-section" dir="rtl" id={item ? "comm-" + id : undefined} data-public-insight={item?.id}>
      <h1>{title}</h1>
      {item ? item.body.split(/\n\s*\n/).map((paragraph, i) => <p key={i} style={{ whiteSpace: "pre-line" }}>{paragraph}</p>)
        : result?.failed ? <div role="alert"><p>לא הצלחנו לטעון את החידוש.</p>
          <button className="sod29-action" onClick={() => { setResult(null); setAttempt(n => n + 1); }}>ניסיון נוסף</button></div>
        : <p role="status">{result ? "החידוש שבקישור אינו זמין לקריאה." : "טוען את החידוש…"}</p>}
      <Link className="sod29-action" to="/findings">לממצאים שפורסמו</Link>
    </article>
  </Sod2029Shell>;
}
