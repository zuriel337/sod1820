import React from "react";
import { Link } from "react-router-dom";
import { bilingualDateLabel } from "../../lib/relativeTime2029.js";

function CatalogLink({ href, children }) {
  if (!href) return <span>{children}</span>;
  return href.startsWith("/")
    ? <Link to={href}>{children}</Link>
    : <a href={href} target="_blank" rel="noreferrer">{children}</a>;
}

function datePrefix(row) {
  if (row?.dateKind === "updated") return "עודכן · ";
  if (row?.dateKind === "published") return "פורסם · ";
  return "";
}

export default function WorldCatalogCards2029({
  items = [],
  labels = {},
  focusedSourceRef = null,
  focusedCardRef = null,
  onOpen = null,
}) {
  return <div className="sod29-world-public-material-grid">
    {items.map((row) => {
      const focused = focusedSourceRef === row.sourceRef;
      return <article key={row.sourceRef || row.id} data-source-ref={row.sourceRef}
        ref={focused ? focusedCardRef : null}
        tabIndex={focused ? -1 : undefined}
        id={focused ? `source-occurrence-${String(row.sourceRef).split(":").pop()}` : undefined}>
        <div><span>{row.label || labels[row.type] || "חומר ציבורי"}</span>
          {row.date ? <time dateTime={row.date}>{datePrefix(row)}{bilingualDateLabel(row.date)}</time> : <time>אין נתון</time>}
        </div>
        {row.mediaUrl ? row.mediaType === "video"
          ? <video className="sod29-world-catalog-media" src={row.mediaUrl} controls preload="none" aria-label={row.title} />
          : <img className="sod29-world-catalog-media" src={row.mediaUrl} alt={row.title} loading="lazy" width="560" height="340" />
          : null}
        <h3>{row.title}</h3>
        {row.summary ? <p>{row.summary}</p> : null}
        {row.number != null ? <strong className="sod29-world-material-number">{row.number}</strong> : null}
        {row.meta?.sourceRecordCount > 1 ? <small>{row.meta.sourceRecordCount} הופעות מקור נשמרו ללא כפילות מקור.</small> : null}
        {onOpen ? <button className="sod29-world-catalog-open" type="button" onClick={() => onOpen(row)}>קריאה כאן ←</button>
          : <CatalogLink href={row.href}>{row.href ? "פתיחה מדויקת ←" : "אין קישור ציבורי מאומת"}</CatalogLink>}
      </article>;
    })}
  </div>;
}
