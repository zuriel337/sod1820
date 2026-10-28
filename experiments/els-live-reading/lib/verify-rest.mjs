// Verification of proposals through the public engine contract (public.els_search_page_v1, the wrapper of els_search_page_core_v1 that the site itself calls with the public
// anon key) and the Torah letters. Read-only; no privilege beyond what any visitor has. Produces rows in exactly the shape of the verification SQL, so that `classify` is unchanged:
//  (1) letters_match: the letters of the Torah stream at the claimed positions equal the term. The stream is the first 304,805 letters of the page's text, whose md5 was shown equal
//      to public.torah_stream (metrics.mjs TORAH_MD5);
//  (2) for skip >= 2 the engine must return an occurrence with the same start and direction; if its first page of 100 hits is cut before the claimed start, the same function is asked for
//      the keyset continuation just before that start (recorded as `followup`); skip 1 is the plain text row (verified as plain text only).
export const RPC_URL = "https://linswmnnkjxvweumprav.supabase.co/rest/v1/rpc/els_search_page_v1";

export class EngineUnavailableError extends Error {
  constructor(message) { super(message); this.name = "EngineUnavailableError"; }
}

export function makeRpc({ anonKey, fetchImpl = fetch, retries = 3, sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)), url = RPC_URL }) {
  if (!anonKey) throw new EngineUnavailableError("no public key for the engine contract");
  return async function rpc({ term, skip, pageSize, afterSkip = null, afterStart = null, afterDir = null }) {
    const body = { p_term: term, p_scope: "torah", p_skip_min: skip, p_skip_max: skip, p_page_size: pageSize, ...(afterStart === null ? {} : { p_after_skip: afterSkip, p_after_start: afterStart, p_after_dir: afterDir }) };
    let last = null;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        const response = await fetchImpl(url, { method: "POST", headers: { apikey: anonKey, authorization: `Bearer ${anonKey}`, "content-type": "application/json" }, body: JSON.stringify(body) });
        const text = await response.text();
        if (response.ok) return JSON.parse(text);
        last = `HTTP ${response.status} ${text.slice(0, 160)}`;
        if (response.status >= 400 && response.status < 500 && response.status !== 429) break; // a malformed request will not improve by retrying
      } catch (error) { last = String(error.message || error); }
      await sleep(600 * 2 ** attempt);
    }
    throw new EngineUnavailableError(`engine contract unavailable for "${term}" at skip ${skip}: ${last}`);
  };
}

const lettersAt = (torah, item) => [...item.term].map((_, j) => torah[item.start + item.dir * item.skip * j] ?? "").join("");

export async function verifyItem(item, { torah, rpc }) {
  const dbText = lettersAt(torah, item);
  const row = { key: item.key, term: item.term, start: item.start, skip: item.skip, dir: item.dir, db_text: dbText, letters_match: dbText === item.term };
  if (item.skip < 2) return { ...row, engine: { status: "plain_text_row_not_els" } };
  const hasHit = (page) => (page.hits ?? []).some((hit) => hit.start === item.start && hit.dir === item.dir);
  const page = await rpc({ term: item.term, skip: item.skip, pageSize: 100 });
  const engine = { status: page.status, hits: (page.hits ?? []).length, found: hasHit(page), completion: page.completion };
  if (!engine.found && page.completion?.truncated) {
    const next = await rpc({ term: item.term, skip: item.skip, pageSize: 10, afterSkip: item.skip, afterStart: Math.max(0, item.start - 1), afterDir: -1 });
    if (hasHit(next)) { engine.first_page_found = false; engine.found = true; engine.followup = `first page of 100 hits was truncated before start ${item.start}; the same engine contract was asked for the keyset continuation after (skip ${item.skip}, start ${item.start - 1}, dir -1) and returned this occurrence`; }
  }
  return { ...row, engine };
}

/** All items, `concurrency` at a time, in order. Any item the engine cannot answer aborts the whole verification (EngineUnavailableError): an unanswered item must not look like "not verified". */
export async function verifyItems(items, { torah, rpc, concurrency = 4 }) {
  const rows = new Array(items.length);
  let next = 0;
  const worker = async () => { while (next < items.length) { const k = next; next += 1; rows[k] = await verifyItem(items[k], { torah, rpc }); } };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return rows;
}
