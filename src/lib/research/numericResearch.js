// Canonical Numeric Research entrypoint.
//
// The released W2.2b router implementation lives unchanged in numericResearchBase.js. This entrypoint
// keeps every existing export while strengthening fn_number_lookup transport: W2 passes an explicit
// server-side keyset page BEFORE rows cross the wire, then replaces the old client-window metadata
// with the server's honest total/remaining counts. There is still one Numeric Research Router and
// one fn_number_lookup contract.

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

function serverBoundedFromRows(rows, window) {
  const list = Array.isArray(rows) ? rows : [];
  const first = list[0] || null;
  const totalRaw = first?.total_count;
  const remainingRaw = first?.remaining_count;
  const total = totalRaw == null ? (window.afterBidId ? null : list.length) : Number(totalRaw);
  const remaining = remainingRaw == null ? null : Number(remainingRaw);
  const returned = list.length;
  const truncated = Number.isFinite(remaining) ? remaining > 0 : (Number.isFinite(total) ? returned < total : false);
  const lastBidId = returned ? clean(list[returned - 1]?.bid_id) : null;

  return {
    total_count: Number.isFinite(total) ? total : null,
    returned_count: returned,
    truncated,
    window: {
      limit: window.limit,
      after_bid_id: window.afterBidId,
      transport: 'server_keyset',
    },
    ordering: 'governed_first__then_atomic_before_composite__then_method__phrase__bid_id',
    continuation: truncated && lastBidId
      ? {
          lens: 'number_lookup',
          after_bid_id: lastBidId,
          limit: window.limit,
          remaining: Number.isFinite(remaining) ? remaining : null,
        }
      : null,
    source_exhaustive: !truncated,
    remaining_count: Number.isFinite(remaining) ? remaining : null,
  };
}

export async function researchNumber(numberInput, options = {}) {
  const originalRpc = options.rpc;
  const window = normalizedLookupWindow(options.lookupWindow || {});

  const rpc = typeof originalRpc !== 'function'
    ? originalRpc
    : async (name, args) => {
        if (name !== 'fn_number_lookup') return originalRpc(name, args);
        return originalRpc(name, {
          ...(args || {}),
          p_limit: window.limit,
          p_after_bid_id: window.afterBidId,
        });
      };

  const result = await researchNumberBase(numberInput, {
    ...options,
    rpc,
    // The base router still applies its deterministic order/window as a defensive second boundary.
    // Since the server already returned <= limit rows and excludes the cursor row, this does not
    // refetch or widen anything; it preserves compatibility while the canonical entrypoint replaces
    // the old page-local counts below with server counts.
    lookupWindow: { limit: window.limit, afterBidId: window.afterBidId },
  });

  const lookup = result?.per_lens?.number_lookup;
  if (lookup?.status === 'ok' && Array.isArray(lookup.data)) {
    const bounded = serverBoundedFromRows(lookup.data, window);
    lookup.bounded = bounded;
    result.bounds = { ...(result.bounds || {}), number_lookup: bounded };
  }
  return result;
}
