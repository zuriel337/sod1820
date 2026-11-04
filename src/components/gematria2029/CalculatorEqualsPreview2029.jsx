import React, { useEffect, useMemo, useState } from "react";
import { getNumberLookup } from "../../lib/supabase.js";
import { collectVerifiedLookupMatches } from "../../lib/research/methodLensProjection.js";
import { pickEqualsPreview } from "../../lib/research/equalsPreview.js";

// Lightweight S1 relation continuation: ONE verified lookup (fn_number_lookup) for the active
// method/value, no per-phrase relation RPCs, no AI. The full evidence/dependency view stays in the
// lazy Method Lens. Cached per value+method so retyping the same value does not refetch.
const cache = new Map();
const inflight = new Map();

function loadLookup(value) {
  const key = String(value);
  if (cache.has(key)) return Promise.resolve(cache.get(key));
  if (!inflight.has(key)) {
    inflight.set(key, getNumberLookup(value)
      .then((rows) => { cache.set(key, rows); return rows; })
      .finally(() => inflight.delete(key)));
  }
  return inflight.get(key);
}

const fmt = (value) => Number.isFinite(Number(value)) ? Number(value).toLocaleString("en-US") : "—";

export default function CalculatorEqualsPreview2029({ selection, limit = 3, onOpenExpression = null, onOpenAll = null, onShown = null }) {
  const [rows, setRows] = useState(null);
  const value = selection?.resultValue;
  const key = selection ? [value, selection.methodKey].join("::") : "";

  useEffect(() => {
    setRows(null);
    if (!selection || value == null || !Number.isFinite(Number(value))) return undefined;
    let alive = true;
    const timer = setTimeout(() => {
      loadLookup(value).then((data) => { if (alive) setRows(data); }).catch(() => { if (alive) setRows([]); });
    }, 350);
    return () => { alive = false; clearTimeout(timer); };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

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
