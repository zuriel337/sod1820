// Bounded public fact pack for the 2029 Number AI-analysis projection.
// Reads ONLY values already projected by numberCoreProjection (root, method values, phrases, crossings).
// No numeric truth is computed here: values are passed through verbatim and the AI only interprets.
// Prompt/SYSTEM/KIND_HINT.number stay in ai-analyze; the canonical fact string comes from aiAnalysis.buildAiFacts.
import { buildAiFacts } from "../aiAnalysis.js";

export const NUMBER_AI_LIMITS = Object.freeze({ methods: 8, phrases: 12, crossings: 4 });

const text = (v) => String(v ?? "").trim();

export function buildNumberAiFactPack(projection) {
  if (!projection) return null;
  const root = projection.root;
  if (root === null || root === undefined || text(root) === "") return null;
  const methods = (Array.isArray(projection.methods) ? projection.methods : [])
    .filter((m) => m && m.computedValue !== null && m.computedValue !== undefined)
    .slice(0, NUMBER_AI_LIMITS.methods)
    .map((m) => ({ key: text(m.methodKey), value: m.computedValue }));
  const seen = new Set();
  const parallels = (Array.isArray(projection.connections) ? projection.connections : [])
    .filter((c) => c?.kind === "expression")
    .map((c) => text(c.label))
    .filter((p) => p && !seen.has(p) && seen.add(p))
    .slice(0, NUMBER_AI_LIMITS.phrases);
  const crossings = (Array.isArray(projection.crossings) ? projection.crossings : [])
    .filter((c) => c?.partner)
    .slice(0, NUMBER_AI_LIMITS.crossings)
    .map((c) => `${text(c.partner)}${Array.isArray(c.methods) && c.methods.length ? ` (${c.methods.map(text).join("/")})` : ""}`);
  const expression = text(projection.expression);
  const subject = expression && !/^\d+$/.test(expression) ? `${expression} (${root})` : String(root);
  const note = crossings.length ? `התכנסויות שהוצגו: ${crossings.join(", ")}.` : "";
  const facts = buildAiFacts({ subject, methods, parallels, note });
  return Object.freeze({ subject, facts });
}
