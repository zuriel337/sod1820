import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../lib/AuthContext.jsx";
import { supabase } from "../../lib/supabase.js";
import {
  buildCorpora, executePlan, loadZviSourceRows, makeReadBack, makeReuseTargetResolver, notifyResearchAdmitted,
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

function CorpusBlock({ corpus, results, busy, onRun }) {
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
      {busy ? "מכניס…" : tally.failed || tally.pending ? "נסה שוב (בטוח)" : `הכנס READY — ${corpus.key}`}
    </button>
    <details>
      <summary>פירוט רשומות ({corpus.items.length})</summary>
      <ul>
        {corpus.items.map((it) => {
          const r = results[it.key];
          return <li key={it.key} data-state={it.state}>
            <b>{it.disposition}</b> · {it.state}{it.reason ? ` — ${it.reason}` : ""} · <small>{it.entry.note}</small>
            {r ? <em> → {r.state}{r.error ? ` (${r.error})` : ""}</em> : null}
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

  const run = useCallback(async (targets) => {
    if (!window.confirm(`להכניס את רשומות ה-READY ל-research_objects כ-candidate פרטי? (${targets.map((c) => c.key).join(", ")})`)) return;
    setBusy(true);
    let acc = results;
    try {
      for (const c of targets) {
        acc = await executePlan(c.items, {
          rpc: (name, args) => supabase.rpc(name, args),
          resolveReuseTarget: makeReuseTargetResolver(supabase),
          readBack: makeReadBack(supabase),
          previous: acc,
          onProgress: (_it, _res, _t) => setResults((cur) => ({ ...cur, ...acc })),
        });
        setResults({ ...acc });
      }
      notifyResearchAdmitted(tallyResults(acc));
    } finally { setBusy(false); }
  }, [results]);

  if (loading || !isAdmin) return null;
  const sendableCorpora = (corpora || []).filter((c) => c.items.some((i) => i.state === ITEM_STATE.EXECUTABLE || i.state === ITEM_STATE.REUSE));
  return <details className="sod29-intake-panel" data-experience-capability="research-admin-intake-batch" data-intake-batch={INTAKE_BATCH_KEY}>
    <summary>קליטת מחקר (מנהל) · {INTAKE_BATCH_KEY}</summary>
    <p><small>Dry-run קורא את טקסט המקור בלבד ואינו קורא ל-RPC. ההכנסה מתבצעת רק בלחיצה מפורשת, כ-candidate פרטי — ללא אישור/קנוניזציה/פרסום.</small></p>
    <button type="button" className="sod29-action" onClick={dryRun} disabled={busy}>Dry-run</button>
    {error ? <p role="alert">Dry-run נכשל ({error})</p> : null}
    {corpora ? <>
      {corpora.map((c) => <CorpusBlock key={c.key} corpus={c} results={results} busy={busy} onRun={run} />)}
      {sendableCorpora.length > 1 ? <button type="button" className="sod29-action primary" disabled={busy} onClick={() => run(sendableCorpora)}>הכנס את כל ה-READY</button> : null}
    </> : null}
  </details>;
}
