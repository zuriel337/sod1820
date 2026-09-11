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

function serverBoundedFromRows(rows, window) {
  const list = Array.isArray(rows) ? rows : [];
  const first = list[0] || null;
  const totalRaw = first?.total_count;
  const total = totalRaw == null ? (window.afterBidId ? null : list.length) : Number(totalRaw);
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
      transport: 'server_keyset',
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
    // the old page-local counts below with server-aware counts.
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
