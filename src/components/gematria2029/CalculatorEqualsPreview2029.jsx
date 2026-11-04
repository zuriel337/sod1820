import React, { useEffect, useMemo, useState } from "react";
import { getNumberLookup } from "../../lib/supabase.js";
import { collectVerifiedLookupMatches } from "../../lib/research/methodLensProjection.js";
import { pickEqualsPreview } from "../../lib/research/equalsPreview.js";
import { useAuth } from "../../lib/AuthContext.jsx";

// Lightweight S1 relation continuation: ONE verified lookup (fn_number_lookup) for the active
// method/value, no per-phrase relation RPCs, no AI. The full evidence/dependency view stays in the
// lazy Method Lens. The existing reader uses the caller JWT/RLS. Cache only a
// bounded, short-lived result for the current caller; identity changes cancel
// partial results and cannot inherit a previous caller's in-flight response.
const cache = new Map();
const inflight = new Map();
let cacheCaller = null;
let generation = 0;
const CACHE_LIMIT = 12;
const CACHE_TTL_MS = 30000;

function selectCaller(caller) {
  if (caller === cacheCaller) return;
  cacheCaller = caller; generation++;
  cache.clear(); inflight.clear();
}

function loadLookup(value, caller) {
  selectCaller(caller);
  const requestGeneration = generation;
  const key = String(value);
  const cached = cache.get(key);
  if (cached?.expiresAt > Date.now()) return Promise.resolve(cached.rows);
  cache.delete(key);
  if (!inflight.has(key)) {
    const pending = getNumberLookup(value).then((rows) => {
      // The existing helper also returns[] on a failed read. Do not retain that
      // response as an indefinitely measured empty result.
      if (requestGeneration === generation && cacheCaller === caller && Array.isArray(rows) && rows.length) {
        cache.set(key, { rows, expiresAt: Date.now() + CACHE_TTL_MS });
        if (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value);
      }
      return rows;
    }).finally(() => { if (inflight.get(key) === pending) inflight.delete(key); });
    inflight.set(key, pending);
  }
  return inflight.get(key);
}

const fmt = (value) => Number.isFinite(Number(value)) ? Number(value).toLocaleString("en-US") : "—";

export default function CalculatorEqualsPreview2029({ selection, limit = 3, onOpenExpression = null, onOpenAll = null, onShown = null }) {
  const { user, loading: authLoading } = useAuth();
  const caller = authLoading ? "pending" : user?.id || "guest";
  const [packet, setPacket] = useState(null);
  const value = selection?.resultValue;
  const key = selection ? JSON.stringify([caller, value, selection.methodKey]) : "";
  const rows = !authLoading && packet?.key === key ? packet.rows : null;

  useEffect(() => {
    setPacket(null);
    selectCaller(caller);
    if (authLoading || !selection || value == null || !Number.isFinite(Number(value))) return undefined;
    let alive = true;
    const timer = setTimeout(() => {
      loadLookup(value, caller).then((data) => { if (alive) setPacket({ key, rows: data }); })
        .catch(() => { if (alive) setPacket({ key, rows: [] }); });
    }, 350);
    return () => { alive = false; clearTimeout(timer); };
  }, [key, caller, authLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  const preview = useMemo(() => {
    if (!rows || !selection) return null;
    const matches = collectVerifiedLookupMatches(rows, { expression: selection.expression, methodKey: selection.methodKey, value });
    return pickEqualsPreview(matches, { expression: selection.expression, limit });
  }, [rows, selection, value, limit]);

  const shown = Boolean(preview?.items.length);
  useEffect(() => { if (shown) onShown?.(preview.total); }, [shown, key]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!shown) return null;
  const rest = preview.total - preview.items.length;
  return (
    <section className="sod29-calcpro-equals" aria-label="ביטויים בעלי אותו ערך" data-equals-preview={preview.total}>
      <h4>
        <span>אותו ערך · {fmt(value)} · {selection.methodLabel || selection.methodKey}</span>
        <strong>«{selection.expression}» שווה גם ל:</strong>
      </h4>
      <div className="sod29-calcpro-equals-list" role="list">
        {preview.items.map((item) => (
          <button type="button" role="listitem" key={item.phrase} dir="auto" onClick={() => onOpenExpression?.(item)} disabled={!onOpenExpression}>
            {item.phrase}
          </button>
        ))}
        {rest > 0 ? (
          <button type="button" role="listitem" className="is-more" onClick={() => onOpenAll?.(preview.total)} disabled={!onOpenAll}>+{rest} עוד</button>
        ) : null}
      </div>
      <small>התאמת ערך בשיטה הזו בלבד — עובדה מהמנוע, לא פירוש ולא ראיה עצמאית.</small>
    </section>
  );
}
