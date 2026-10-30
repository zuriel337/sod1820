// Builds every request of EXP-24: the saved-line groups of EXP-23 (the group rule and the instruction text are EXP-23's, imported unchanged), arm A only, with the raised ceiling.
import * as M from "../../../supabase/functions/_shared/elsMatrixReading.js";
import { context } from "../../els-axis-addendum/lib/arms.mjs";
import { selectGroups } from "../../els-line-groups/lib/groups.mjs";
import { SCHEMA_A, buildGroupPrompt } from "../../els-line-groups/lib/prompts.mjs";
import { ARMS, CAP, MODEL } from "./plan.mjs";

/** Same key order and fields as EXP-23's buildGroupRequest(A), so that with cap 12 and max_tokens 10,000 the request is byte-identical to EXP-23's (pinned by a test). */
export function buildRequest({ groupLines, cap = CAP, maxTokens = MODEL.maxTokens }) {
  const prompt = buildGroupPrompt({ arm: "A", groupLines, cap });
  const request = { model: MODEL.id, max_tokens: maxTokens, system: prompt.system, messages: [{ role: "user", content: prompt.user }] };
  request.thinking = { ...M.THINKING };
  request.output_config = { effort: MODEL.effort, format: { type: "json_schema", schema: SCHEMA_A } };
  return { request, prompt };
}

export async function buildRuns() {
  const ctx = context();
  const ids = ctx.lines.map((l) => l.id);
  const groups = selectGroups(ids).filter((g) => g.role === "saved_lines");
  const byId = new Map(ctx.lines.map((l) => [l.id, l]));
  const runs = [];
  for (const group of groups) {
    const groupLines = group.ids.map((id) => byId.get(id));
    const { request, prompt } = buildRequest({ groupLines });
    runs.push({ id: `${group.id}${ARMS[0].id}`, group, arm: ARMS[0].id, groupLines, request, prompt, customId: `els-live-l24-${group.id.toLowerCase()}${ARMS[0].id.toLowerCase()}`, requestSha256: await M.requestSha256(request), lockSha256: await M.lockSha256(request) });
  }
  return { ctx, groups, runs };
}
