import { pathToFileURL } from "node:url";
import { newInteractionId, safeInteractionId } from "../src/lib/research/interactionCorrelation.js";

// Preserve the live default. Select isolated dependencies BEFORE importing the
// canonical client: SUPABASE_URL alone cannot redirect that hardcoded client.
export async function resolveA3Client(env = process.env) {
  if (env.SOD_A3_MODE === "isolated") {
    const { createIsolatedA3Client } = await import("./isolation-a3/client.mjs");
    return createIsolatedA3Client(env.SOD_A3_ISOLATED_CONFIG);
  }
  if ((env.SOD_A3_MODE && env.SOD_A3_MODE !== "live")
      || env.SOD_A3_ISOLATED_CONFIG || env.SOD_CI_ISOLATION === "1") {
    throw new Error("A3 isolated execution requires SOD_A3_MODE=isolated and a guarded local config");
  }
  return (await import("../src/lib/supabase.js")).supabase;
}

export async function runA3ClientCorrelation({ client, log = console.log } = {}) {
  if (!client?.functions?.invoke) throw new Error("A3 client dependency required");

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

  const { data, error } = await client.functions.invoke("research-run", {
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

  log(
    `A3_CLIENT_CORRELATION_EVIDENCE interaction_id=${interactionId} trace_id=${traceId} status=${String(data?.status || "unknown")} error=${String(data?.error || "")}`,
  );
  return { interactionId, visitorId, traceId, data };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await runA3ClientCorrelation({ client: await resolveA3Client() });
}
