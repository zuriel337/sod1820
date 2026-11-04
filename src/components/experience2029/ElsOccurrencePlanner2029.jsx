import React, { useEffect, useId, useRef, useState } from "react";
import CanonicalProgress from "../CanonicalProgress.jsx";
import { ELS_CIPHER_DISCOVERY_PLAN_CONTRACT, projectElsGuidedOccurrenceCoverage } from "../../lib/research/elsAutomaticResearchPlan.js";

// One explicit, bounded UI queue over the existing canonical matrix-discovery lens.
// Results stay transient and never enter findings or replace the active matrix.
export default function ElsOccurrencePlanner2029({ results, scope, term, response, channel, onRequest, onOpen }) {
  const instance = useId();
  const sequence = useRef(0);
  const [selected, setSelected] = useState([]);
  const [run, setRun] = useState(null);
  const current = useRef(null);
  const callbacks = useRef({ onRequest });
  callbacks.current = { onRequest };
  const publish = value => { current.current = value; setRun(value); };
  const targetFor = (value, item) => ({ researchOccurrenceInspection: true, inspectionRun: value.id,
    setId: results.id, resultSetId: results.id, page: results.page, scope, hitId: item.hitId, contextTerms: [] });
  const requestNext = value => onRequest(targetFor(value, value.items[value.reports.length]));
  const stop = () => {
    const value = current.current;
    if (value?.status !== "running") return;
    publish({ ...value, status: "stopped" });
    onRequest({ ...targetFor(value, value.items[value.reports.length]), cancel: true });
  };
  useEffect(() => () => {
    const value = current.current;
    if (value?.status === "running") callbacks.current.onRequest({ researchOccurrenceInspection: true, inspectionRun: value.id, cancel: true });
  }, []);
  useEffect(() => {
    const value = current.current, target = response?.target;
    if (value?.status !== "running" || response?.lens !== "matrix-discovery"
      || target?.inspectionRun !== value.id || target.setId !== results.id || target.page !== results.page
      || target.scope !== scope || target.hitId !== value.items[value.reports.length]?.hitId) return;
    const projection = projectElsGuidedOccurrenceCoverage({ plan: { contract: ELS_CIPHER_DISCOVERY_PLAN_CONTRACT, scope, anchorTerm: term },
      occurrences: value.items, inspections: [response], resultSetId: results.id });
    const valid = projection.inspections.length === 1 && (response.ok === false || response.scope === scope && response.axis?.hitId === target.hitId);
    const report = valid ? response : { lens: "matrix-discovery", target, ok: false, reason: "invalid-report" };
    const next = { ...value, reports: [...value.reports, report] };
    next.status = next.reports.length === next.items.length ? "done" : "running";
    publish(next);
    if (next.status === "running") requestNext(next);
  }, [response]);
  useEffect(() => {
    const value = current.current;
    if (value?.status === "running" && channel?.target?.inspectionRun !== value.id) {
      publish({ ...value, status: "stopped" });
    }
  }, [channel]);
  const start = () => {
    const items = results.items.filter(item => selected.includes(item.hitId)).slice(0, 3);
    if (!items.length || current.current?.status === "running") return;
    const value = { id: `${instance}:${++sequence.current}`, items, reports: [], status: "running" };
    publish(value);
    requestNext(value);
  };
  const coverage = run ? projectElsGuidedOccurrenceCoverage({
    plan: { contract: ELS_CIPHER_DISCOVERY_PLAN_CONTRACT, scope, anchorTerm: term },
    occurrences: run.items, inspections: run.reports, resultSetId: results.id,
  }) : null;
  return <section className="els29-search-planner" aria-label="בחירת מופעים להעמקה">
    <p>בחרו עד שלושה מופעים מהעמוד הנוכחי. רק לחיצה על בדיקה תטען את אוצר הלשון הקיים ותבדוק חלון מוגבל סביב כל מופע, ללא AI.</p>
    <fieldset disabled={run?.status === "running"}><legend>מופעים לבדיקה · {selected.length}/3</legend>
      {results.items.map(item => <label className="els29-planner-choice" key={item.hitId}>
        <input type="checkbox" checked={selected.includes(item.hitId)} aria-label={`בדוק מופע ${item.ordinal}`}
          disabled={!selected.includes(item.hitId) && selected.length >= 3}
          onChange={event => setSelected(value => event.target.checked ? value.length < 3 && !value.includes(item.hitId) ? [...value, item.hitId] : value : value.filter(id => id !== item.hitId))} />
        <span>מופע {item.ordinal} · דילוג <bdi>{item.direction === "back" ? "−" : ""}{item.skip}</bdi> · {item.ref || item.book}</span>
      </label>)}
    </fieldset>
    <button type="button" disabled={!selected.length || run?.status === "running"} onClick={start}>בדוק את המופעים שנבחרו</button>
    {run?.status === "running" ? <CanonicalProgress compact title="בודק סביבות של מופעים" phase={`הסתיימו ${run.reports.length} מתוך ${run.items.length} בדיקות`}
      detail="האימות מתבצע במנוע הקיים. המטריצה הפעילה אינה משתנה." onCancel={stop} /> : null}
    {run ? <div aria-live="polite">
      <p>{run.status === "done" ? "הבדיקה המבוקשת הסתיימה" : run.status === "stopped" ? "הבדיקה הופסקה; מופעים שלא נבדקו אינם תוצאה שלילית" : "בדיקה בתהליך"} · התקבלו {run.reports.length}/{run.items.length} תשובות.</p>
      {coverage.inspections.map(item => <article className="els29-planner-report" key={item.hitId}>
        <strong>מופע {item.occurrence.ordinal} · דילוג <bdi>{item.occurrence.direction === "back" ? "−" : ""}{item.occurrence.skip}</bdi></strong>
        <p>{item.occurrence.ref}</p>
        <p>{item.status === "LENS_FAILED" ? "הבדיקה לא הושלמה — אין להסיק שאין ממצאים."
          : item.pairVerified ? `${item.supports.map(support => support.label || support.term).join(" × ")} · ${item.relation.label || "זוג מאומת"}`
            : item.verifiedFindings.length ? `ממצאים מאומתים: ${item.verifiedFindings.map(finding => finding.label || finding.term).join(" · ")}`
              : "לא אותר זוג מאומת בבדיקה המוגבלת הזאת; אין בכך קביעה על שאר המטריצה."}</p>
        <button type="button" onClick={() => { stop(); onOpen("occurrence-select", { setId: results.id, index: item.occurrence.index, hitId: item.hitId }); }}>פתח מופע {item.occurrence.ordinal} להעמקה</button>
      </article>)}
      <p>זו בחירה להמשך מחקר, לא דירוג מובהקות. שאר המופעים והאזורים שלא נבדקו נשארים פתוחים. פתיחה מציגה את הציר המדויק; הבדיקה אינה מוסיפה ממצאים אוטומטית.</p>
    </div> : null}
  </section>;
}
