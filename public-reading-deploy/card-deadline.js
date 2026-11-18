// Hard deadline for the share-card render (/api/card).
//
// How @vercel/og (0.11.1) works, read from node_modules/@vercel/og/dist/index.edge.js: `new ImageResponse(...)` builds a ReadableStream whose
// start() renders the whole PNG (satori + resvg) and then enqueues it once. start() runs as soon as the response object is created, so the
// render is already running when the handler returns, and a status 200 response object exists long before its body has a byte. Awaiting the
// handler is therefore not a deadline; the body has to be read inside the race. The stream has no cancel hook.
//
// What a lost race does and does not stop (tested in test/api-card-request-policy-2029.test.mjs):
//   - stops: our waiting (the caller answers 504 at the deadline) and any further body bytes reaching us (the reader is cancelled);
//   - does NOT stop: the render already running in start(), or a network read it started. Those end on their own bounds: font and logo
//     8 s, the database 4 s (api/card.js), and the glyph filter + no emoji fallback keep @vercel/og's own font/emoji fetches unreachable.
// A card is a PNG of about 120-270 KB (measured 18.11.2026), so the whole body is buffered, capped at CARD_BODY_MAX_BYTES.

// Well above a warm render (hundreds of ms) and a cold start with font and logo loads, well below the platform limit.
export const CARD_DEADLINE_MS = 10_000;

// Upper bound on a buffered card body (largest measured story card: 268 KB).
export const CARD_BODY_MAX_BYTES = 2 * 1024 * 1024;

const TIMED_OUT = Symbol('card render deadline');

// Runs `render` (a function returning the card Response) and returns { status, statusText, headers, body } with `body` a
// finished ArrayBuffer, or `null` when the deadline passed first. A render that fails before the deadline rejects, as it
// did before; a render that fails after the deadline was lost is ignored. `progress` (optional) receives the phases, measured
// from the call: responseMs (the response object returned), bodyMs (the last body byte read), bytes (read so far).
export async function renderWithinDeadline(render, deadlineMs = CARD_DEADLINE_MS, progress = {}) {
  const started = Date.now();
  let timer;
  const deadline = new Promise((resolve) => {
    timer = setTimeout(() => resolve(TIMED_OUT), deadlineMs);
  });
  // The body is read through a reader this function holds, so the lost body can be released (a stream locked by arrayBuffer() cannot),
  // and its size is bounded.
  let reader = null, lost = false;
  const rendered = (async () => {
    const response = await render();
    progress.responseMs = Date.now() - started;
    const chunks = [];
    let size = 0;
    if (response.body) {
      reader = response.body.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        // A body released after the deadline ends as `done`; it never counts as a finished card or a finished body.
        if (done) { if (lost) throw new Error('card render deadline'); break; }
        size += value.byteLength;
        progress.bytes = size;
        if (size > CARD_BODY_MAX_BYTES) { reader.cancel(new Error('card body too large')).catch(() => {}); throw new Error(`card body exceeded ${CARD_BODY_MAX_BYTES} bytes`); }
        chunks.push(value);
      }
    }
    progress.bodyMs = Date.now() - started;
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
    // Stop waiting and release the body. This does not stop a render already running in @vercel/og's start() (see the header).
    lost = true;
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
