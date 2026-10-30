// Builds every request of EXP-23: for each selected group, arm A and arm B. The window and the lines are those of EXP-22 (the product module builds them).
import * as M from "../../../supabase/functions/_shared/elsMatrixReading.js";
import { context } from "../../els-axis-addendum/lib/arms.mjs";
import { ARMS, CAP } from "./plan.mjs";
import { selectGroups } from "./groups.mjs";
import { buildGroupRequest } from "./prompts.mjs";

export async function buildRuns() {
  const ctx = context();
  const ids = ctx.lines.map((l) => l.id);
  const groups = selectGroups(ids);
  const byId = new Map(ctx.lines.map((l) => [l.id, l]));
  const runs = [];
  for (const group of groups) {
    const groupLines = group.ids.map((id) => byId.get(id));
    for (const arm of ARMS) {
      const { request, prompt } = buildGroupRequest({ arm: arm.id, groupLines, cap: CAP });
      runs.push({ id: `${group.id}${arm.id}`, group, arm: arm.id, groupLines, request, prompt, customId: `els-live-${group.id.toLowerCase()}${arm.id.toLowerCase()}`, requestSha256: await M.requestSha256(request), lockSha256: await M.lockSha256(request) });
    }
  }
  return { ctx, groups, runs };
}
