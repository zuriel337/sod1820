import { supabase } from "../src/lib/supabase.js";
import { newInteractionId, safeInteractionId } from "../src/lib/research/interactionCorrelation.js";
import { getVisitorId } from "../src/lib/visitorId.js";

const memory = new Map();
globalThis.localStorage = {
  getItem: (key) => memory.get(String(key)) ?? null,
  setItem: (key, value) => { memory.set(String(key), String(value)); },
  removeItem: (key) => { memory.delete(String(key)); },
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const interactionId = newInteractionId();
const visitorId = newInteractionId();

if (!safeInteractionId(interactionId) || !safeInteractionId(visitorId)) {
  throw new Error("interaction_id_not_uuid");
}

const { data, error } = await supabase.functions.invoke("research-run", {
  body: {
    number: "878",
    question: "878",
    interaction_id: interactionId,
    visitor_id: visitorId,
    requested_capabilities: ["numeric", "numeric_operators"],
    surface: "heichal",
  },
});

const traceId = String(data?.trace_id || "").trim();
if (error && !traceId) {
  throw new Error(`research_run_transport_failed:${error?.message || error}`);
}
if (!UUID_RE.test(traceId)) {
  throw new Error(
    `trace_id_missing_or_invalid status=${String(data?.status || "unknown")} error=${String(data?.error || error?.message || "")}`,
  );
}

console.log(
  `A3_CLIENT_CORRELATION_EVIDENCE interaction_id=${interactionId} trace_id=${traceId} status=${String(data?.status || "unknown")} error=${String(data?.error || "")}`,
);
