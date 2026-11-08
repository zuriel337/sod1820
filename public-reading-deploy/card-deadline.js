// Hard deadline for the share-card render (/api/card).
//
// @vercel/og's ImageResponse returns immediately and renders while its body is being read. Awaiting the handler is
// therefore not a deadline: the response object (status 200) is back at once even when the render is stuck, and the
// platform then waits for the stalled body until its own 300 s limit ("Task timed out after 300 seconds", seen five
// times on 2026-11-06). The body has to be read inside the race.
//
// A card is a small PNG (tens of KB), so the whole body is buffered. That also lets the caller decide status and cache
// headers from a finished render instead of a promise of one.

// Well above a warm render (hundreds of ms) and a cold start with font and logo loads, well below the platform limit.
export const CARD_DEADLINE_MS = 10_000;

const TIMED_OUT = Symbol('card render deadline');

// Runs `render` (a function returning the card Response) and returns { status, statusText, headers, body } with `body` a
// finished ArrayBuffer, or `null` when the deadline passed first. A render that fails before the deadline rejects, as it
// did before; a render that fails after the deadline was lost is ignored.
export async function renderWithinDeadline(render, deadlineMs = CARD_DEADLINE_MS) {
  let timer;
  const deadline = new Promise((resolve) => {
    timer = setTimeout(() => resolve(TIMED_OUT), deadlineMs);
  });
  const rendered = (async () => {
    const response = await render();
    const body = await response.arrayBuffer();
    return { status: response.status, statusText: response.statusText, headers: response.headers, body };
  })();
  // If the deadline wins, the abandoned render may still fail later; that must not surface as an unhandled rejection.
  rendered.catch(() => {});
  try {
    const result = await Promise.race([rendered, deadline]);
    return result === TIMED_OUT ? null : result;
  } finally {
    clearTimeout(timer);
  }
}

// The answer for a render that missed the deadline: tiny, plain text, never cached (the wrapper adds no-store and
// X-Robots-Tag for every non-200, so a timeout can never be stored by the CDN or a crawler's cache).
export function deadlineExceededResult(deadlineMs = CARD_DEADLINE_MS) {
  return {
    status: 504,
    statusText: 'Gateway Timeout',
    headers: new Headers({ 'Content-Type': 'text/plain; charset=utf-8' }),
    body: new TextEncoder().encode(`card render exceeded ${deadlineMs} ms`).buffer,
  };
}
