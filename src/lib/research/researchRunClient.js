// SOD1820 — client transport for the public Number Research Run Edge function (research-run).
//
// Thin browser boundary only. It does not compose a Research Result, run an executor, call a
// model/provider, or decide capability/entitlement — the research-run Edge function owns all of
// that server-side. This module's only job is to invoke that one Edge function with a validated-
// shape body and hand back its response untouched.
//
// Identity: uses the existing canonical Supabase client/session (Authorization is attached
// automatically by supabase.functions.invoke) and the existing canonical Browser Visitor primitive
// (getVisitorId) for anonymous callers. It never mints a second guest identity/store.
//
// This is the ONE client-side research-run invocation seam. Every surface that wants to call the
// public Number Research Run Golden goes through this function — never a second direct
// `supabase.functions.invoke("research-run", ...)` call elsewhere.

import { supabase } from "../supabase.js";
import { getVisitorId } from "../visitorId.js";
import { PUBLIC_NUMBER_RESEARCH_CAPABILITIES } from "./researchRunRequest.js";

export async function runPublicNumberResearch({
  number,
  surface,
  question = null,
  requestedCapabilities = PUBLIC_NUMBER_RESEARCH_CAPABILITIES,
  interactionId = null,
} = {}) {
  if (!supabase) return { status: "error", error: "transport_unavailable" };

  const body = {
    number,
    surface,
    requested_capabilities: requestedCapabilities,
    visitor_id: getVisitorId(),
  };
  if (question) body.question = question;
  if (interactionId) body.interaction_id = interactionId;

  try {
    const { data, error } = await supabase.functions.invoke("research-run", { body });
    if (error) return { status: "error", error: "transport_failed" };
    return data || { status: "error", error: "empty_response" };
  } catch {
    return { status: "error", error: "transport_failed" };
  }
}

export default runPublicNumberResearch;
