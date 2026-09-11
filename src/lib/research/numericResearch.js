// Canonical Numeric Research entrypoint.
//
// The released W2.2b router implementation lives unchanged in numericResearchBase.js. This entrypoint
// keeps every existing export while strengthening fn_number_lookup transport: W2 passes an explicit
// server-side keyset page BEFORE rows cross the wire, then replaces the old client-window metadata
// with server-aware page metadata. There is still one Numeric Research Router and one
// fn_number_lookup contract.

import {
  DEFAULT_NUMBER_LOOKUP_WINDOW,
  researchNumber as researchNumberBase,
} from './numericResearchBase.js';

export * from './numericResearchBase.js';

function clean(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

function normalizedLookupWindow(input = {}) {
  const limit = Math.max(1, Math.min(
    Number(input.limit) || DEFAULT_NUMBER_LOOKUP_WINDOW.limit,
    DEFAULT_NUMBER_LOOKUP_WINDOW.maxLimit,
  ));
  return {
    limit,
    afterBidId: clean(input.afterBidId ?? input.after_bid_id),
  };
}

function serverBoundedFromRows(rows, window, legacyBounded = null, transportFallback = false) {
  const list = Array.isArray(rows) ? rows : [];
  const first = list[0] || null;
  const serverTotalRaw = first?.total_count;
  const legacyTotalRaw = legacyBounded?.total_count;
  const total = serverTotalRaw != null
    ? Number(serverTotalRaw)
    : legacyTotalRaw != null
      ? Number(legacyTotalRaw)
      : (window.afterBidId ? null : list.length);
  const returned = list.length;
  // On page 1, total_count gives an exact truncation answer. On later keyset pages the absolute
  // total does not reveal how many rows were consumed before the cursor, so use the safe keyset
  // rule: a full page MAY have more rows and gets a continuation; a short page is exhaustive.
  // This can request one harmless empty page when the final page is exactly `limit`, but can never
  // falsely claim source exhaustion.
  const truncated = window.afterBidId
    ? returned === window.limit
    : (Number.isFinite(total) ? returned < total : returned === window.limit);
  const lastBidId = returned ? clean(list[returned - 1]?.bid_id) : null;

  return {
    total_count: Number.isFinite(total) ? total : null,
    returned_count: returned,
    truncated,
    window: {
      limit: window.limit,
      after_bid_id: window.afterBidId,
      // Honest transport: a legacy fallback is NOT server paging and must not be reported as if
      // the rows had been bounded before they crossed the wire.
      transport: transportFallback
        ? 'client_window_legacy_fallback'
        : serverTotalRaw != null ? 'server_keyset' : 'server_keyset_compat_fallback',
    },
    ordering: 'governed_first__then_atomic_before_composite__then_method__phrase__bid_id',
    continuation: truncated && lastBidId
      ? {
          lens: 'number_lookup',
          after_bid_id: lastBidId,
          limit: window.limit,
          remaining: window.afterBidId ? null : (Number.isFinite(total) ? Math.max(0, total - returned) : null),
        }
      : null,
    source_exhaustive: !truncated,
  };
}

export async function researchNumber(numberInput, options = {}) {
  const originalRpc = options.rpc;
  const window = normalizedLookupWindow(options.lookupWindow || {});

  // MERGE-ORDER SAFETY (W2.2d closure). The server-side keyset page lives in migration
  // 20260911..._number_lookup_keyset_and_gematria_controls_v1, which adds the optional p_limit /
  // p_after_bid_id arguments. Until that migration is applied, the canonical DB exposes ONLY
  // fn_number_lookup(p_value bigint) and PostgREST rejects the extra named arguments with PGRST202
  // — which took the whole numeric capability to FAILED with zero findings (verified against the
  // live function catalogue: to_regprocedure for the 3-argument form is NULL today).
  //
  // Code and migration must therefore not depend on deployment ORDER. If the paged call reports
  // that the function/arguments do not exist, fall back ONCE to the legacy one-argument contract
  // and let the base router's client-side window bound the rows. Capability is preserved, the
  // boundary is unchanged, and the transport is reported honestly rather than silently downgraded.
  let transportFallback = false;
  const looksLikeMissingOverload = (error) => {
    if (!error) return false;
    const code = String(error.code || '');
    const message = String(error.message || error);
    return code === 'PGRST202'
      || /could not find the function/i.test(message)
      || /function .* does not exist/i.test(message);
  };

  const rpc = typeof originalRpc !== 'function'
    ? originalRpc
    : async (name, args) => {
        if (name !== 'fn_number_lookup') return originalRpc(name, args);
        const legacyArgs = { ...(args || {}) };
        if (transportFallback) return originalRpc(name, legacyArgs);
        let paged;
        try {
          paged = await originalRpc(name, {
            ...legacyArgs,
            p_limit: window.limit,
            p_after_bid_id: window.afterBidId,
          });
        } catch (error) {
          if (!looksLikeMissingOverload(error)) throw error;
          transportFallback = true;
          return originalRpc(name, legacyArgs);
        }
        if (paged?.error && looksLikeMissingOverload(paged.error)) {
          transportFallback = true;
          return originalRpc(name, legacyArgs);
        }
        return paged;
      };

  const result = await researchNumberBase(numberInput, {
    ...options,
    rpc,
    // The base router still applies its deterministic order/window as a defensive second boundary.
    // Since the real server now returns <= limit rows and excludes the cursor row, this does not
    // refetch or widen anything. For legacy/mock readers that ignore the new args, the base window
    // continues to protect memory and its total_count is preserved below.
    lookupWindow: { limit: window.limit, afterBidId: window.afterBidId },
  });

  const lookup = result?.per_lens?.number_lookup;
  if (lookup?.status === 'ok' && Array.isArray(lookup.data)) {
    const legacyBounded = result?.bounds?.number_lookup || lookup.bounded || null;
    const bounded = serverBoundedFromRows(lookup.data, window, legacyBounded, transportFallback);
    lookup.bounded = bounded;
    result.bounds = { ...(result.bounds || {}), number_lookup: bounded };
  }
  return result;
}
