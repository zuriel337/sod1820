// EXP-12 pilot: engine confirmation of every pool item through the public contract (public.els_verify_occurrence_v1, the same function the site calls with the public key).
// state MATCH = the engine itself reports this term at this start, skip and direction. Skip 1 is the plain text row (not an ELS) and is confirmed against the stream's letters only.
// An item the engine does not answer is an error (EngineUnavailableError), never "not verified".
import { SUPABASE_URL } from "./public.mjs";

export class EngineUnavailableError extends Error { constructor(message) { super(message); this.name = "EngineUnavailableError"; } }

export function makeVerifyRpc({ anonKey, fetchImpl = fetch, retries = 3, url = `${SUPABASE_URL}/rest/v1/rpc/els_verify_occurrence_v1`, sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)) }) {
  if (!anonKey) throw new EngineUnavailableError("no public key for the engine contract");
  return async function verifyRpc({ term, skip, dir, start }) {
    let last = null;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        const response = await fetchImpl(url, { method: "POST", headers: { apikey: anonKey, authorization: `Bearer ${anonKey}`, "content-type": "application/json" }, body: JSON.stringify({ p_term: term, p_scope: "torah", p_skip: skip, p_dir: dir, p_start: start }) });
        const text = await response.text();
        if (response.ok) return JSON.parse(text);
        last = `HTTP ${response.status} ${text.slice(0, 160)}`;
        if (response.status >= 400 && response.status < 500 && response.status !== 429) break;
      } catch (error) { last = String(error.message || error); }
      await sleep(600 * 2 ** attempt);
    }
    throw new EngineUnavailableError(`engine contract unavailable for "${term}" skip ${skip} start ${start}: ${last}`);
  };
}

/** Items: [{ key, term, start, skip, dir }]. torah = the stream text (checked by md5 elsewhere). Returns rows { key, letters_match, state }. */
export async function verifyItems(items, { torah, rpc, concurrency = 6 }) {
  const rows = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const k = next; next += 1;
      const item = items[k];
      const letters = [...item.term].map((_, j) => torah[item.start + item.dir * item.skip * j] ?? "").join("");
      const row = { key: item.key, letters_match: letters === item.term };
      if (item.skip < 2) rows[k] = { ...row, state: "PLAIN_TEXT_ROW" };
      else { const answer = await rpc(item); rows[k] = { ...row, state: answer.verification_state ?? answer.status ?? "UNKNOWN" }; }
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return rows;
}
export const confirmed = (row) => row.letters_match === true && (row.state === "MATCH" || row.state === "PLAIN_TEXT_ROW");
