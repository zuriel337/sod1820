import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../lib/AuthContext.jsx";
import { supabase } from "../../lib/supabase.js";
import {
  batchPreview, buildCorpora, describeItem, executeOne, executePlan, loadZviSourceRows, makeReadBack, makeReuseTargetResolver, notifyResearchAdmitted,
  summarizePlan, tallyResults, ITEM_STATE, INTAKE_BATCH_KEY, ADMITTED_EVENT,
} from "../../lib/research/adminIntakeBatch.js";

// Admin Intake Batch — lives inside the existing 2029 World / Golden Projector admin experience (rendered only
// for an authenticated admin; non-admin renders nothing). DRY RUN reads source text only (no RPC). Execution is a
// separate explicit Human-Gate button per corpus, sequential and idempotent, through the signed-in admin's own
// client. Everything saved is candidate + private by the RPC; nothing here approves, canonicalizes or publishes.

/** Bumps when an admin intake completes, so the EXISTING World/Projector research loaders re-read (no second semantics layer). */
export function useResearchAdmittedEpoch() {
  const [epoch, setEpoch] = useState(0);
  useEffect(() => {
    const bump = () => setEpoch((n) => n + 1);
    window.addEventListener(ADMITTED_EVENT, bump);
    return () => window.removeEventListener(ADMITTED_EVENT, bump);
  }, []);
  return epoch;
}

const Counts = ({ obj }) => <span>{Object.entries(obj || {}).map(([k, v]) => `${k}: ${v}`).join(" · ") || "—"}</span>;

function CorpusBlock({ corpus, results, busy, onRun, onRunOne }) {
  const summary = useMemo(() => summarizePlan(corpus.items), [corpus.items]);
  const tally = tallyResults(results);
  return <section className="sod29-intake-corpus" aria-label={corpus.label}>
    <h4>{corpus.label}</h4>
    {corpus.blocker ? <p role="note"><small>{corpus.blocker}</small></p> : null}
    <p><small>
      סה״כ {summary.total} · ניתנים להכנסה {summary.executable} · REUSE {summary.reuse} · קריאה בלבד {summary.read_only} · חסומים {summary.blocked}
    </small></p>
    <p><small>לפי disposition: <Counts obj={summary.by_disposition} /></small></p>
    <p><small>לפי kind: <Counts obj={summary.by_kind} /> · אימות: <Counts obj={summary.by_verification} /></small></p>
    <p><small>הוכנסו {tally.inserted} · כבר-קיימים {tally.already_existed} · נוספה ראיה {tally.appended + tally.already_present} · ממתינים {tally.pending} · נכשלו {tally.failed}</small></p>
    <button type="button" className="sod29-action primary" disabled={busy || (summary.executable + summary.reuse) === 0} onClick={() => onRun([corpus])}>
      {busy ? "מכניס…" : tally.failed || tally.pending ? "נסה שוב (בטוח)" : `הכנס את כל READY — ${corpus.key}`}
    </button>
    <details>
      <summary>פירוט רשומות ({corpus.items.length})</summary>
      <ul>
        {corpus.items.map((it) => {
          const r = results[it.key];
          const d = describeItem(it);
          const canSave = it.state === ITEM_STATE.EXECUTABLE || it.state === ITEM_STATE.REUSE;
          return <li key={it.key} data-state={it.state} data-disposition={it.disposition}>
            <b>{it.disposition}</b> · {it.state}{it.reason ? ` — ${it.reason}` : ""} · <small>{d.candidate_class}</small>
            <dl>
              <dt>{d.source_work ? "יצירת מקור" : "תורם"}</dt><dd>{d.source_work || d.contributor || "—"}</dd>
              <dt>מקור</dt><dd dir="ltr">{d.source_ref || "—"}</dd>
              <dt>לשון המקור</dt><dd dir="rtl" style={{ whiteSpace: "pre-wrap" }}>{d.exact_source_text || "—"}</dd>
              {d.proposed ? <>
                <dt>מוצע</dt><dd>{d.proposed.kind} · {d.proposed.statement}{d.proposed.value != null ? ` · value ${d.proposed.value}` : ""}</dd>
                <dt>שיטה</dt><dd>קנונית: {d.method.canonical || "—"} · מקור-מעיד: {d.method.source_attested.join(", ") || "—"}</dd>
                <dt>אימות מנוע</dt><dd>{d.engine.state} · ביקורת: {d.engine.audit_disposition}</dd>
                <dt>נשמר כ</dt><dd>{d.saves_as}</dd>
              </> : <><dt>הערת ביקורת</dt><dd>{d.audit_note}</dd></>}
            </dl>
            {r ? <em> → {r.state}{r.error ? ` (${r.error})` : ""}</em> : null}
            {canSave ? <button type="button" className="sod29-action" disabled={busy} onClick={() => onRunOne(it)}>
              {it.state === ITEM_STATE.REUSE ? "הוסף ראיה (provenance)" : "שמור רשומה זו"}
            </button> : null}
            {it.payload ? <details><summary>payload</summary><pre dir="ltr">{JSON.stringify(it.payload, null, 2)}</pre></details> : null}
            {it.reuse ? <details><summary>reuse (provenance append only)</summary><pre dir="ltr">{JSON.stringify(it.reuse, null, 2)}</pre></details> : null}
          </li>;
        })}
      </ul>
    </details>
  </section>;
}

export default function ResearchAdminIntakePanel2029() {
  const { isAdmin, loading } = useAuth();
  const [corpora, setCorpora] = useState(null);
  const [results, setResults] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const dryRun = useCallback(async () => {
    setError(null);
    try {
      const zvi = await loadZviSourceRows(supabase);
      setCorpora(buildCorpora({ zvi }));
    } catch (e) { setError(e?.message || "dry_run_failed"); }
  }, []);

  const deps = useCallback((acc, setAcc) => ({
    rpc: (name, args) => supabase.rpc(name, args),
    resolveReuseTarget: makeReuseTargetResolver(supabase),
    readBack: makeReadBack(supabase),
    previous: acc,
    onProgress: (it, res) => setAcc((cur) => ({ ...cur, [it.key]: res })),
  }), []);

  const run = useCallback(async (targets) => {
    const previews = targets.map((c) => ({ c, p: batchPreview(c.items, results) }));
    const total = previews.reduce((n, x) => n + x.p.will_send, 0);
    if (total === 0) return;
    const lines = previews.map(({ c, p }) => `${c.key}: ${p.will_send} (${Object.entries(p.by_disposition).map(([k, v]) => `${k} ${v}`).join(", ")}) · לא נשלחים: ${p.excluded}`);
    if (!window.confirm(`להכניס ${total} רשומות READY ל-research_objects כ-candidate פרטי בלבד (ללא אישור/קנוניזציה/פרסום)?\n${lines.join("\n")}\nMISMATCH / HOLD / EXCLUDE / DUPLICATE אינם נשלחים.`)) return;
    setBusy(true);
    let acc = results;
    try {
      for (const c of targets) {
        acc = await executePlan(c.items, deps(acc, setResults));
        setResults({ ...acc });
      }
      notifyResearchAdmitted(tallyResults(acc));
    } finally { setBusy(false); }
  }, [results, deps]);

  const runOne = useCallback(async (item) => {
    const d = describeItem(item);
    if (!window.confirm(`לשמור רשומה אחת כ-candidate פרטי?\n${item.disposition} · ${d.candidate_class}\n${d.source_ref}`)) return;
    setBusy(true);
    try {
      const acc = await executeOne(item, deps(results, setResults));
      setResults((cur) => ({ ...cur, ...acc }));
      notifyResearchAdmitted(tallyResults(acc));
    } finally { setBusy(false); }
  }, [results, deps]);

  if (loading || !isAdmin) return null;
  const sendableCorpora = (corpora || []).filter((c) => c.items.some((i) => i.state === ITEM_STATE.EXECUTABLE || i.state === ITEM_STATE.REUSE));
  return <details className="sod29-intake-panel" data-experience-capability="research-admin-intake-batch" data-intake-batch={INTAKE_BATCH_KEY}>
    <summary>קליטת מחקר (מנהל) · {INTAKE_BATCH_KEY}</summary>
    <p><small>Dry-run קורא את טקסט המקור בלבד ואינו קורא ל-RPC. ההכנסה מתבצעת רק בלחיצה מפורשת, כ-candidate פרטי — ללא אישור/קנוניזציה/פרסום.</small></p>
    <button type="button" className="sod29-action" onClick={dryRun} disabled={busy}>Dry-run</button>
    {error ? <p role="alert">Dry-run נכשל ({error})</p> : null}
    {corpora ? <>
      {corpora.map((c) => <CorpusBlock key={c.key} corpus={c} results={results} busy={busy} onRun={run} onRunOne={runOne} />)}
      {sendableCorpora.length > 1 ? <button type="button" className="sod29-action primary" disabled={busy} onClick={() => run(sendableCorpora)}>הכנס את כל ה-READY</button> : null}
    </> : null}
  </details>;
}
