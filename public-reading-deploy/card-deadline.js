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

// Upper bound on a buffered card body (largest measured story card: 268 KB).
export const CARD_BODY_MAX_BYTES = 2 * 1024 * 1024;

const TIMED_OUT = Symbol('card render deadline');

// Runs `render` (a function returning the card Response) and returns { status, statusText, headers, body } with `body` a
// finished ArrayBuffer, or `null` when the deadline passed first. A render that fails before the deadline rejects, as it
// did before; a render that fails after the deadline was lost is ignored.
export async function renderWithinDeadline(render, deadlineMs = CARD_DEADLINE_MS) {
  let timer;
  const deadline = new Promise((resolve) => {
    timer = setTimeout(() => resolve(TIMED_OUT), deadlineMs);
  });
  // The body is read through a reader this function holds, so a lost render can be cancelled (a stream locked by arrayBuffer() cannot
  // be), and its size is bounded: a card is a PNG of about 150-270 KB (measured 18.11.2026); anything past CARD_BODY_MAX_BYTES is refused.
  let reader = null;
  const rendered = (async () => {
    const response = await render();
    const chunks = [];
    let size = 0;
    if (response.body) {
      reader = response.body.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > CARD_BODY_MAX_BYTES) { reader.cancel(new Error('card body too large')).catch(() => {}); throw new Error(`card body exceeded ${CARD_BODY_MAX_BYTES} bytes`); }
        chunks.push(value);
      }
    }
    const body = new Uint8Array(size);
    let at = 0;
    for (const c of chunks) { body.set(c, at); at += c.byteLength; }
    return { status: response.status, statusText: response.statusText, headers: response.headers, body: body.buffer };
  })();
  // If the deadline wins, the abandoned render may still fail later; that must not surface as an unhandled rejection.
  rendered.catch(() => {});
  try {
    const result = await Promise.race([rendered, deadline]);
    if (result !== TIMED_OUT) return result;
    // The lost render is cancelled, not left running: cancelling the body stream stops @vercel/og from producing the image (its work
    // happens while the body is pulled). A pending font or emoji fetch inside it can no longer feed that body.
    reader?.cancel(new Error('card render deadline')).catch(() => {});
    return null;
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
