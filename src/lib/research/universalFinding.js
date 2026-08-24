// Universal Finding helpers for the ONE existing ResearchProvider/Workspace.
// This module never computes source truth. It only serializes/projections results
// that canonical engines/graph sources already verified.

const VALID_STAGES = new Set(["candidate", "finding", "evidence", "claim", "interpretation"]);

const safePart = (v) => encodeURIComponent(String(v ?? "").trim());

export function universalFindingId({ kind, sourceIdentity, subjectKey, occurrence } = {}) {
  const occ = occurrence && typeof occurrence === "object"
    ? [occurrence.skip, occurrence.dir ?? occurrence.direction, occurrence.start].filter(v => v != null).join(":")
    : "";
  const native = typeof sourceIdentity === "string"
    ? sourceIdentity
    : sourceIdentity && typeof sourceIdentity === "object"
      ? JSON.stringify(sourceIdentity)
      : "";
  return ["uf1", kind || "other", subjectKey || "", native || occ].map(safePart).join(":");
}

export function makeUniversalFinding(input = {}) {
  const stage = VALID_STAGES.has(input.stage) ? input.stage : "finding";
  const subject = input.subject || {};
  const identity = input.identity || {};
  const id = input.id || universalFindingId({
    kind: input.kind,
    sourceIdentity: identity.sourceIdentity,
    subjectKey: subject.key || subject.label,
    occurrence: identity.occurrence,
  });
  return {
    v: 1,
    id,
    kind: input.kind || "other",
    stage,
    status: input.status || "active",
    subject: {
      type: subject.type || "entity",
      key: subject.key ?? null,
      label: subject.label || "",
      value: subject.value ?? null,
    },
    source: { engine: null, adapter: "universal-finding-v1", sourceRef: null, method: null, corpus: null, ...(input.source || {}) },
    identity: { sourceIdentity: null, occurrence: null, entityRef: null, relationRef: null, ...identity },
    evidence: { refs: [], facts: [], score: null, confidence: null, ...(input.evidence || {}) },
    provenance: {
      createdBy: "SYSTEM",
      createdAt: new Date().toISOString(),
      inputRef: null,
      parentFindingIds: [],
      researchSessionId: null,
      journeyNodeId: null,
      ...(input.provenance || {}),
    },
    projection: { anchors: [], relations: [], dimensions: {}, ...(input.projection || {}) },
    view: { color: null, pinned: false, selected: false, hidden: false, rendererHints: {}, ...(input.view || {}) },
  };
}

export function universalFindingToResearchEntity(finding) {
  if (!finding?.id) return null;
  const label = finding.subject?.label || finding.id;
  return {
    id: finding.id,
    ref: finding.id,
    type: "finding",
    title: label,
    label,
    link: finding.subject?.key ? `/research?finding=${encodeURIComponent(finding.id)}` : "/research",
    finding,
    sourceEngine: finding.source?.engine || null,
    findingKind: finding.kind || "other",
    findingStage: finding.stage || "finding",
  };
}

// ELS adapter: exact engine-owned occurrence becomes the identity.
// One universal Finding is emitted per shown exact occurrence — never label-only.
export function elsStateToUniversalFindings(engineState, options = {}) {
  if (engineState?.status !== "ok") return [];
  const corpus = engineState.scope === "tanakh" ? "tanakh" : "torah";
  const createdAt = options.createdAt || new Date().toISOString();
  const out = [];

  const parseHit = (hitId) => {
    if (typeof hitId !== "string") return null;
    const [signedSkipRaw, dirRaw, startRaw] = hitId.split("_");
    const signedSkip = Number(signedSkipRaw), dir = Number(dirRaw), start = Number(startRaw);
    if (!Number.isFinite(signedSkip) || !Number.isFinite(start) || ![1, -1].includes(dir)) return null;
    return { hitId, skip: Math.abs(signedSkip), signedSkip, dir, direction: dir === -1 ? "back" : "fwd", start };
  };

  const axisHit = parseHit(engineState.axis?.hitId);
  const axisTerm = engineState.termRaw || engineState.term || "";
  if (axisHit && axisTerm) {
    out.push(makeUniversalFinding({
      kind: "els",
      subject: { type: "phrase", key: axisTerm, label: axisTerm },
      source: { engine: "els", adapter: "els-state-v1", corpus, sourceRef: engineState.provenance?.source || null },
      identity: { sourceIdentity: axisHit.hitId, occurrence: axisHit },
      evidence: { refs: [axisHit.hitId], facts: [{ type: "els-occurrence", corpus, ...axisHit }] },
      provenance: { createdBy: "ENGINE:els", createdAt, inputRef: options.inputRef || null },
      projection: {
        anchors: Array.isArray(options.axisPositions) ? options.axisPositions.map(i => ({ space: "corpus-index", i })) : [],
        dimensions: { corpus },
      },
      view: { color: options.axisColor || "#e8c84a", rendererHints: { role: "axis" } },
    }));
  }

  for (const f of Array.isArray(engineState.findings) ? engineState.findings : []) {
    if (!f?.t) continue;
    for (const raw of Array.isArray(f.shown) ? f.shown : []) {
      const hit = parseHit(raw);
      if (!hit) continue;
      const length = Array.from(String(f.t)).length;
      const sign = hit.dir === -1 ? -1 : 1;
      const anchors = Array.from({ length }, (_, i) => ({ space: "corpus-index", i: hit.start + sign * hit.skip * i }));
      out.push(makeUniversalFinding({
        kind: "els",
        subject: { type: "word", key: f.t, label: f.t },
        source: { engine: "els", adapter: "els-state-v1", corpus, sourceRef: engineState.provenance?.source || null },
        identity: { sourceIdentity: hit.hitId, occurrence: hit },
        evidence: { refs: [hit.hitId], facts: [{ type: "els-occurrence", corpus, ...hit }] },
        provenance: { createdBy: "ENGINE:els", createdAt, inputRef: options.inputRef || axisHit?.hitId || null },
        projection: { anchors, dimensions: { corpus } },
        view: { color: f.color || null, rendererHints: { role: "finding" } },
      }));
    }
  }

  return out;
}

export function isUniversalFinding(value) {
  return Boolean(value && value.v === 1 && value.id && value.subject && value.source && value.identity && value.provenance);
}
