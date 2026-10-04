import React, { createContext, useContext } from "react";
import { SOURCE_NAMES, numeric, sourceFreshness } from "../../lib/admin/controlPlaneProjection.js";
import "./adminOperations2029.css";

export const MetricSourceContext = createContext(null);
export const formatNumber = (value, decimals = 0) => numeric(value) == null ? "לא ידוע" : new Intl.NumberFormat("he-IL", { maximumFractionDigits: decimals }).format(Number(value));
export const formatTime = value => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" }) : "לא ידוע";
const STATUS = { fresh: "נקרא לאחרונה", stale: "נתון ישן", unknown: "טרם נקרא", loading: "קריאה בתהליך", error: "הקריאה נכשלה" };
export const BASIS = { EXACT: "מדויק לפי המקור", OBSERVED: "נצפה", OBSERVED_SNAPSHOT: "צילום מצב", ESTIMATED: "הערכה", UNKNOWN: "לא ידוע", EXACT_BILLING_HISTORY: "חיוב היסטורי", OBSERVED_STORAGE_LOGS: "יומני תעבורה שנצפו", ESTIMATED_FROM_API_PRICING: "אומדן מתעריפים" };

export function SourceStamp({ source, name, basis = "OBSERVED", measuredAt, now, compact = false }) {
  const meta = sourceFreshness(measuredAt ? { ...source, data: { generated_at: measuredAt } } : source, now);
  const valid = source?.status === "ready" || (source?.status === "loading" && source?.data != null);
  return <div className={`sod29-admin-source ${compact ? "compact" : ""}`}>
    <span className="sod29-chip">{valid ? BASIS[basis] || basis : BASIS.UNKNOWN}</span>
    <span className={`sod29-admin-status ${meta.state}`}>{STATUS[meta.state]}</span>
    <small>{SOURCE_NAMES[name] || name || "מקור לא ידוע"}</small>
    <small>{meta.measuredAt ? `מועד המקור: ${formatTime(meta.measuredAt)}` : "מועד המדידה לא נמסר"} · נקרא: {formatTime(meta.readAt)}</small>
  </div>;
}
export function AdminMetric({ label, value, note, source: ownSource, name: ownName, basis = "OBSERVED", measuredAt }) {
  const inherited = useContext(MetricSourceContext);
  const source = ownSource || inherited?.source;
  const name = ownName || inherited?.name;
  const available = source?.status === "ready" || (source?.status === "loading" && source?.data != null);
  return <div className="sod29-card">
    <div className="sod29-kicker">{label}</div><h3>{available ? value : "לא ידוע"}</h3>
    {note ? <p className="sod29-muted">{note}</p> : null}
    <SourceStamp source={source} name={name} basis={String(value).includes("לא ידוע") || value === "—" || value === "UNKNOWN" ? "UNKNOWN" : basis} measuredAt={measuredAt} compact />
  </div>;
}
export function SourceState({ source, name, onRetry }) {
  if (source?.status === "ready" || source?.status === "loading" && source.data != null) return null;
  return <div className="sod29-admin-empty" role={source?.status === "error" ? "alert" : "status"}>
    <strong>{source?.status === "loading" ? "טוען נתונים…" : source?.status === "error" ? "המקור אינו זמין" : "המקור טרם נקרא"}</strong>
    <p>{SOURCE_NAMES[name] || name}{source?.error ? ` · ${source.error}` : ""}</p>
    <small>היעדר נתון אינו אפס ואינו תור ריק.</small>
    {onRetry ? <button className="sod29-action" disabled={source?.status === "loading"} onClick={onRetry}>נסה לקרוא שוב</button> : null}
  </div>;
}

export function AdminSources2029({ sources, now, onRefresh }) {
  return <details className="sod29-section">
    <summary>מקורות ועדכניות — כל נתון עם המקור שלו</summary>
    <p className="sod29-muted">מועד המקור ומועד הקריאה מוצגים בנפרד. נתון בן יותר משעה מסומן כישן; זהו סף תצוגה בלבד. מקורות נוספים נקראים כשפותחים את הלשונית שלהם.</p>
    <div className="sod29-admin-sources">{Object.entries(sources).map(([name, source]) => <div key={name}>
      <strong>{SOURCE_NAMES[name]}</strong><SourceStamp source={source} name={name} now={now} />
      {source.error ? <p role="alert">{source.error}</p> : null}
      <button className="sod29-action" onClick={() => onRefresh([name])} disabled={source.status === "loading"}>קרא מקור זה</button>
    </div>)}</div>
  </details>;
}
