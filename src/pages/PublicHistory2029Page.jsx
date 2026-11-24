import NavigationIcon2029 from "../components/experience2029/NavigationIcon2029.jsx";
import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Sod2029Shell from "../components/experience2029/Sod2029Shell.jsx";
import { readAnonymousSourceRows2029 } from "../lib/readAnonymousSourceRows2029.js";
import { PUBLIC_HISTORY_READING, readPublicHistory2029 } from "../lib/publicHistoryReading2029.js";
import { applySeo } from "../lib/seo.js";

export default function PublicHistory2029Page({ path }) {
  const { search, hash } = useLocation();
  const focusedItem = useRef(null);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState(null);
  const address = path + search + hash;
  const { title, description } = PUBLIC_HISTORY_READING[path];
  const data = result?.address === address ? result.data : null;
  const failed = result?.address === address && result.failed;
  const empty = data && !data.sections.some(section => section.items.length);

  useEffect(() => {
    applySeo({ title, description, path, noindex: Boolean(search || empty || failed), follow: true });
  }, [title, description, path, search, empty, failed]);

  useEffect(() => {
    const controller = new AbortController();
    const readRows = source => readAnonymousSourceRows2029(source, controller.signal);
    readPublicHistory2029(readRows, path, search, hash).then(data => {
      if (!controller.signal.aborted) setResult({ address, data });
    }).catch(() => {
      if (!controller.signal.aborted) setResult({ address, failed: true });
    });
    return () => controller.abort();
  }, [address, path, search, hash, attempt]);

  useEffect(() => {
    if (data?.focusedId) focusedItem.current?.scrollIntoView({ block: "center" });
  }, [data]);

  return <Sod2029Shell surface="world" symbol={<NavigationIcon2029 name={path === "/timeline" ? "now" : "video"} />} title={title} introVariant="none">
    <article dir="rtl" data-public-history={path.slice(1)}>
      <header className="sod29-section"><h1>{title}</h1><p>{description}</p></header>
      {failed ? <div className="sod29-section" role="alert">
        <p>טעינת המקורות נכשלה.</p>
        <button className="sod29-action" onClick={() => { setResult(null); setAttempt(n => n + 1); }}>ניסיון נוסף</button>
      </div> : !data ? <p role="status">טוען מקורות…</p> : <>
        {data.notice && <p className="sod29-section" role="status">{data.notice}</p>}
        {empty && !data.notice && <p className="sod29-section" role="status">אין פריטים בבחירה הזו.</p>}
        {data.sections.map(section => <section className="sod29-section" key={section.title}>
          <h2>{section.title}</h2>
          <ul className="sod29-list">{section.items.map(item => <li key={item.id || item.href} id={item.id}
            ref={item.id && item.id === data.focusedId ? focusedItem : undefined}>
            {item.href ? <Link className="sod29-row" to={item.href}>{item.title}</Link> : <strong>{item.title}</strong>}
            {item.detail && <p>{item.detail}</p>}
          </li>)}</ul>
        </section>)}
        {(data.previousHref || data.nextHref) && <nav className="sod29-actions" aria-label="דפדוף בפרסומים">
          {data.previousHref && <Link className="sod29-action" to={data.previousHref}>לעמוד הקודם</Link>}
          {data.nextHref && <Link className="sod29-action" to={data.nextHref}>לעמוד הבא</Link>}
        </nav>}
      </>}
    </article>
  </Sod2029Shell>;
}
