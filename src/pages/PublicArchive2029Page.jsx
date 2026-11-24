import NavigationIcon2029 from "../components/experience2029/NavigationIcon2029.jsx";
import React, { useEffect, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { legacyArchiveContinuation2029 } from "../lib/legacyArchiveContinuation2029.js";
import Sod2029Shell from "../components/experience2029/Sod2029Shell.jsx";
import { PUBLIC_ARCHIVE_2029, publicArchiveHref2029, readPublicArchive2029 } from "../lib/research/publicArchive2029.js";
import { readAnonymousSourceRows2029 } from "../lib/readAnonymousSourceRows2029.js";
import { applySeo } from "../lib/seo.js";

export default function PublicArchive2029Page() {
  const { pathname, search, hash } = useLocation();
  const target = legacyArchiveContinuation2029(pathname, search, hash);
  return target ? <Navigate to={target} replace /> : <ArchiveReader search={search} />;
}

function ArchiveReader({ search }) {
  const [result, setResult] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const data = result?.search === search ? result.data : null;
  const failed = result?.search === search && result.failed;
  const { title, description } = PUBLIC_ARCHIVE_2029;
  const tab = new URLSearchParams(search).get("tab");
  const imageTab = tab === "pool" || tab === "cascade" ? tab : null;
  const firstYear = data?.collections.find(collection => collection.key.startsWith("year-"));
  const firstTopic = data?.collections.find(collection => collection.key.startsWith("topic-"));

  useEffect(() => {
    applySeo({ title, description, path: "/archive", noindex: Boolean(search), follow: true });
  }, [title, description, search]);

  useEffect(() => {
    const controller = new AbortController();
    const readRows = path => readAnonymousSourceRows2029(path, controller.signal);
    readPublicArchive2029(readRows, search).then(data => {
      if (!controller.signal.aborted) setResult({ search, data });
    }).catch(() => {
      if (!controller.signal.aborted) setResult({ search, failed: true });
    });
    return () => controller.abort();
  }, [search, attempt]);

  return <Sod2029Shell surface="world" symbol={<NavigationIcon2029 name="journal" />} title={title} introVariant="none">
    <article data-public-archive dir="rtl">
      <header className="sod29-section">
        <h1>{title}</h1>
        <p>{description}</p>
        <form key={search} className="sod29-input-row" action="/archive" method="get">
          {imageTab && <input type="hidden" name="tab" value={imageTab} />}
          <label>שנת התיעוד <input name="year" type="number" min="1000" max="9998" required
            placeholder="2025" defaultValue={new URLSearchParams(search).get("year") || ""} /></label>
          <button className="sod29-action" type="submit">הצגת השנה</button>
        </form>
        <nav className="sod29-actions" aria-label="עיון במקורות">
          {firstYear && <a className="sod29-action" href={`#archive-${firstYear.key}`}>לפי שנה</a>}
          {firstTopic && <a className="sod29-action" href={`#archive-${firstTopic.key}`}>לפי נושא</a>}
          {search && <Link className="sod29-action" to="/archive">לארכיון המלא</Link>}
          {imageTab !== "pool" && <Link className="sod29-action" to="/archive?tab=pool">מאגר התמונות</Link>}
          {imageTab !== "cascade" && <Link className="sod29-action" to="/archive?tab=cascade">אוצרות הגילוי</Link>}
          <Link className="sod29-action" to="/gallery">לגלריות ולתמונות</Link>
          <Link className="sod29-action" to="/post">לכל הפוסטים</Link>
          <Link className="sod29-action" to="/reality">לזרם המציאות</Link>
        </nav>
      </header>
      {failed ? <div className="sod29-section" role="alert"><p>לא ניתן לטעון את האוספים כרגע.</p>
        <button className="sod29-action" onClick={() => { setResult(null); setAttempt(n => n + 1); }}>ניסיון נוסף</button></div>
        : !data ? <p role="status">טוען אוספים…</p> : <>
          {data.selectionNotice && <p className="sod29-section" role="status">{data.selectionNotice}</p>}
          {!data.collections.length && !data.selectionNotice && <p className="sod29-section" role="status">לא נמצא תיעוד בבחירה זו.</p>}
          {data.collections.map(collection => <section key={collection.key} id={`archive-${collection.key}`} className="sod29-section" data-archive-collection={collection.key}>
            <h2>{collection.title}</h2>
            <ul className="sod29-list">{collection.items.map(item =>
              <li key={item.href}><Link className="sod29-row" to={item.href}>{item.title}</Link></li>)}</ul>
            {!data.year && collection.key.startsWith("year-") && <Link className="sod29-action"
              to={publicArchiveHref2029(collection.title)}>לכל התיעוד משנת {collection.title}</Link>}
          </section>)}
          {data.partialMedia && <p role="status">לא ניתן לטעון כרגע את קישורי התמונות שבנושאים.</p>}
          {!data.selectionNotice && (data.hasMore || data.page > 1) && <nav className="sod29-actions" aria-label="עמודי פרסומים בארכיון">
            {data.page > 1 && <Link className="sod29-action" to={publicArchiveHref2029(data.year, data.page - 1, data.tab)}>לעמוד הקודם</Link>}
            {data.hasMore && <Link className="sod29-action" to={publicArchiveHref2029(data.year, data.page + 1, data.tab)}>לעמוד הבא</Link>}
          </nav>}
        </>}
    </article>
  </Sod2029Shell>;
}
