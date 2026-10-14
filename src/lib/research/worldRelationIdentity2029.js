// Technical reader choice only. Both paths return the identity used by deepenRelation;
// the destination still loads through its existing canonical projection.
export async function resolveWorldRelationIdentity(nodeId, {
  readSwitches, resolveNode, project,
  is2029 = typeof __SOD_2029_BUILD__ !== "undefined" && __SOD_2029_BUILD__,
}) {
  let optimized = false;
  if (is2029) {
    try { optimized = (await readSwitches()).fx_world_relation_identity === true; } catch { /* retain baseline */ }
  }
  if (!optimized) {
    const target = await project({ nodeId, relationLimit: 1, researchLimit: 1, topicLimit: 1 });
    return target?.identity || null;
  }
  // Permission/lookup errors propagate: never broaden access or retry with a privileged reader.
  const node = await resolveNode({ nodeId });
  return node ? { nodeId: String(node.id), type: node.type, label: node.label } : null;
}
