import { supabase } from "../supabase.js";
import { gematriaApiResultToFindings } from "./canonicalGematriaProjection.js";

// Browser transport over the canonical RPC. The pure result projection lives separately so the
// same canonical executor can run at the Edge without importing the browser Supabase client.
export { gematriaApiResultToFindings } from "./canonicalGematriaProjection.js";

export async function fetchCanonicalGematriaFindings(text) {
  const inputText = String(text || "").trim();
  if (!inputText) return [];

  const { data, error } = await supabase.rpc("gematria_api", { p_text: inputText });
  if (error) throw error;
  return gematriaApiResultToFindings(data, { inputText });
}
