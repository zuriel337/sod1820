// The database half of the Claude research packet. It reuses exactly what Raziel's server reads and composes — the existing
// research-run contracts (public-expression-crossing-run-v1 for the expression, public-number-research-run-v1 for the regular
// value and the אתבש / מילוי / מסתתר values), the Result Bundle consumer and the grounded source composer — and returns the same
// "תיק פרשנות" dossier. It is presentation only: no new engine, endpoint, store or Bundle, no write, no model call, no Raziel session.
import { buildRazielResultBundleConsumer } from "./razielResultBundleConsumer.js";
import { buildRazielGroundedSourceComposer, razielMethodLayerNumbers } from "./razielGroundedSourceComposer.js";

export const CLAUDE_PACKET_EXPRESSION_CONTRACT = "public-expression-crossing-run-v1";
export const CLAUDE_PACKET_NUMBER_CONTRACT = "public-number-research-run-v1";

// Same coverage rule the server applies before a Bundle may be used.
function coverageOk(projection) {
  const coverage = projection?.model_input?.coverage;
  return Boolean(coverage && typeof coverage === "object" && (coverage.complete === true || coverage.partial === true));
}

async function readBundle(invoke, { contract, expression, number, visitorId }) {
  try {
    const body = {
      contract,
      ...(expression != null ? { expression } : { number }),
      question: expression != null ? "חיפוש הצלבות קנוני במאגר הציבורי" : String(number),
      visitor_id: visitorId || null,
      interaction_id: globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `claude-packet-${Date.now().toString(36)}`,
      requested_capabilities: expression != null ? ["gematria", "crossings"] : ["numeric", "numeric_operators"],
      surface: expression != null ? "raziel" : "number",
    };
    const { data, error } = await invoke("research-run", { body });
    if (error || data?.status !== "ok" || data?.contract !== contract || !data?.bundle) return null;
    const projection = buildRazielResultBundleConsumer(data.bundle);
    return coverageOk(projection) ? projection : null;
  } catch {
    return null;
  }
}

// Returns { ok: true, brief, reads } or { ok: false, reason }. Never throws.
export async function fetchClaudePacketDossier(expression, { invoke, visitorId = null } = {}) {
  if (typeof invoke !== "function" || !expression) return { ok: false, reason: "unavailable" };
  const expressionProjection = await readBundle(invoke, { contract: CLAUDE_PACKET_EXPRESSION_CONTRACT, expression, visitorId });
  if (!expressionProjection) return { ok: false, reason: "no_bundle" };
  const reads = [{ subject: { type: "expression", value: expression }, projection: expressionProjection }];
  const anchor = buildRazielGroundedSourceComposer(reads).primary_expression_anchor;
  if (Number.isSafeInteger(anchor?.value) && anchor.value >= 1 && anchor.value <= 999999) {
    const numberProjection = await readBundle(invoke, { contract: CLAUDE_PACKET_NUMBER_CONTRACT, number: anchor.value, visitorId });
    if (numberProjection) reads.push({ subject: { type: "number", value: anchor.value }, projection: numberProjection });
  }
  const have = new Set(reads.filter((read) => read.subject.type === "number").map((read) => read.subject.value));
  const layerReads = (await Promise.all(razielMethodLayerNumbers(expressionProjection)
    .filter(({ value }) => !have.has(value))
    .map(async ({ value }) => {
      const projection = await readBundle(invoke, { contract: CLAUDE_PACKET_NUMBER_CONTRACT, number: value, visitorId });
      return projection ? { subject: { type: "number", value }, projection } : null;
    }))).filter(Boolean);
  const composition = buildRazielGroundedSourceComposer(reads, { layerReads });
  if (!composition.exploratory_brief) return { ok: false, reason: "no_brief" };
  return { ok: true, brief: composition.exploratory_brief, reads: reads.length + layerReads.length };
}

// A bare number: the same Number research-run contract and composer, subject = the number itself.
export async function fetchClaudeNumberDossier(number, { invoke, visitorId = null } = {}) {
  if (typeof invoke !== "function" || !Number.isSafeInteger(number) || number < 1 || number > 999999) return { ok: false, reason: "unavailable" };
  const projection = await readBundle(invoke, { contract: CLAUDE_PACKET_NUMBER_CONTRACT, number, visitorId });
  if (!projection) return { ok: false, reason: "no_bundle" };
  const composition = buildRazielGroundedSourceComposer([{ subject: { type: "number", value: number }, projection }]);
  return composition.exploratory_brief ? { ok: true, brief: composition.exploratory_brief, reads: 1 } : { ok: false, reason: "no_brief" };
}
