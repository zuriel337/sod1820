// Universal Finding helpers for the ONE existing ResearchProvider/Workspace.
// This module never computes source truth. It only serializes/projections results
// that canonical engines/graph sources already verified.
// Ported verbatim from gpt/research-workspace-v1 (d267e1ac) as the single canonical
// ELS-native-result -> Universal Finding -> ResearchProvider adapter (Pass 1, research_bus_reconciliation).
// elsStateToUniversalFindings() consumes the exact elsState()/postMessage state shape emitted by
// tools/els/els-code.template.html — kept read-only/no-recompute: no gematria/engine logic here.
//
// ── M1 TRUTH CONTRACT (truth_axes_foundation_law, HG-1..HG-5) ──────────────────────────────
// INVARIANT PR1  projection may REPRESENT semantic state; it may NOT INVENT it.
// INVARIANT PR2  invalid explicit semantic input is REJECTED, never silently coerced.
// INVARIANT PR3  missing semantic state stays honestly absent (null). Absent never inherits
//                institutional weight: unknown origin is not "SYSTEM", unknown governance is not
//                "active", unknown epistemic type is not "finding".
// INVARIANT PR4  "Universal Finding" names the ENVELOPE. The name does not imply stage="finding".
//                `stage` is the sole authority on epistemic type.
// Removed in this pass (all four were live fabrications on main):
//   stage   -> "finding"   on missing input, and the SAME coercion applied to INVALID input
//   status  -> "active"
//   createdBy -> "SYSTEM"
//   findingStage -> "finding" (second, redundant fabrication in the entity projector)
// Presentation-safe defaults deliberately KEPT (they are not semantic claims): empty view/projection
// containers, empty collections, display formatting, the envelope's own construction timestamp,
// and the adapter identity, which is genuinely known.
//
// verification{} / access{} adopted from PR #226 (gpt/research-studio-canonical-extension-v0,
// head 502c4b88) so the envelope can finally REPRESENT the verification and access axes.
// #226's hardcoded verification_state:"match" is NOT adopted — see HG-3 note on the adapters below.
//
// ── M1 FINAL ACCEPTANCE PATCH (GPT cross-verification of PR #236) ─────────────────────────
// One more generic fabrication removed: verification_state -> "not_tested" on MISSING input.
// PR3 applies to the VERIFICATION axis exactly as it applies to the other three — an absent
// input is unknown, not a declaration that no test occurred. "not_tested" stays a valid state
// and is still declared EXPLICITLY by adapters that genuinely know it (ELS below, canonical
// Gematria). Explicit invalid input is still rejected (PR2).

export const VALID_STAGES = Object.freeze(["candidate", "finding", "evidence", "claim", "interpretation"]);
const STAGE_SET = new Set(VALID_STAGES);

// Ratified verification vocabulary (Research DNA v1 §1 / truth_axes_foundation_law AXIS 2).
// Do not extend this list without a Human-Gate decision.
export const VALID_VERIFICATION_STATES = Object.freeze(["match", "mismatch", "method_unknown", "not_tested"]);
const VERIFICATION_SET = new Set(VALID_VERIFICATION_STATES);

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

// INVARIANT PR2/PR3. Absent stays absent; explicitly invalid is rejected loudly.
// Silent laundering of an invalid value is worse than a plain default, because a caller
// passing stage:"fact" (research_objects.kind legitimately contains "fact") used to be
// handed back stage:"finding" with no error and no trace.
function normalizeStage(stage) {
  if (stage == null || stage === "") return null;
  if (!STAGE_SET.has(stage)) {
    throw new TypeError(
      `universalFinding: invalid stage "${stage}". Allowed: ${VALID_STAGES.join(", ")}. ` +
      `Semantic state is never coerced (truth_axes_foundation_law INVARIANT PR2) — ` +
      `omit stage to leave the epistemic type honestly unknown.`
    );
  }
  return stage;
}

// INVARIANT PR2/PR3, same shape as normalizeStage().
//
// M1 FINAL ACCEPTANCE PATCH (GPT cross-verification, ZURIEL Human-Gate): the generic envelope
// used to resolve a MISSING verification_state to "not_tested". That is itself a fabricated
// semantic claim — "no claim-vs-engine test occurred" is knowledge the generic envelope does not
// have. Absence of a verification input means the CALLER SAID NOTHING, which is not the same as
// the caller stating that nothing was tested. So missing now stays honestly null, exactly like
// stage/status/createdBy.
//
// HG-3 is NOT weakened: "not_tested" remains a valid canonical verification state. It is simply
// no longer INFERRED from absence — an adapter that genuinely knows no claim-vs-engine test took
// place (the ELS adapter below, the canonical Gematria adapter) still declares it EXPLICITLY.
// Explicit invalid values keep throwing.
function normalizeVerification(verification) {
  const v = verification && typeof verification === "object" ? verification : {};
  const state = v.verification_state;
  const resolved = state == null || state === "" ? null : state;
  if (resolved !== null && !VERIFICATION_SET.has(resolved)) {
    throw new TypeError(
      `universalFinding: invalid verification_state "${state}". ` +
      `Allowed: ${VALID_VERIFICATION_STATES.join(", ")}. ` +
      `Semantic state is never coerced (truth_axes_foundation_law INVARIANT PR2) — ` +
      `omit verification_state to leave the verification axis honestly unknown.`
    );
  }
  return {
    claimed_expression: null,
    claimed_method: null,
    claimed_value: null,
    engine_method_tested: null,
    engine_result: null,
    // Language the claimed_expression was written in, when a claim is actually present.
    // Scoped narrowly to verification — most Findings have no claimed expression at all,
    // so this stays null far more often than set (contract §C).
    statement_lang: null,
    ...v,
    verification_state: resolved,
  };
}

export function makeUniversalFinding(input = {}) {
  const stage = normalizeStage(input.stage);
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
    // EPISTEMIC TYPE axis. null = honestly unknown. Never inferred from the envelope's name.
    stage,
    // GOVERNANCE axis as carried by the envelope. null = this envelope asserts nothing.
    status: input.status ?? null,
    subject: {
      type: subject.type || "entity",
      key: subject.key ?? null,
      label: subject.label || "",
      // REPRESENTATION axis only: the language subject.label is currently shown in.
      // Never the identity. subject.key/identity.entityRef must stay stable across languages
      // (Multilingual Identity Foundation Closure contract, docs/audits/SOD1820_SYSTEM_MASTER_MAP_2026-08-31.md §C).
      lang: subject.lang ?? null,
      value: subject.value ?? null,
    },
    // source.lang = language of the underlying evidence/corpus text (never changes for a given
    // Finding regardless of display language). Distinct from subject.lang (display) and
    // verification.statement_lang (a claimed expression's language) — see contract §C.
    source: { engine: null, adapter: "universal-finding-v1", sourceRef: null, method: null, corpus: null, lang: null, ...(input.source || {}) },
    identity: { sourceIdentity: null, occurrence: null, entityRef: null, relationRef: null, ...identity },
    // VERIFICATION axis (Research DNA v1 §1 shape). verification_state null = honestly unknown;
    // it is NEVER read as "not_tested" — only an adapter that knows may declare that.
    verification: normalizeVerification(input.verification),
    evidence: { refs: [], facts: [], score: null, confidence: null, ...(input.evidence || {}) },
    // PUBLICATION/ACCESS axis. null = unknown; it is NEVER read as "public".
    access: { tier: null, reason: null, ...(input.access || {}) },
    provenance: {
      // null, not "SYSTEM": unknown origin must not inherit maximum institutional weight.
      createdBy: null,
      // Presentation-safe: a true fact about when THIS envelope was constructed.
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
    // Structural ENVELOPE type for ResearchProvider's entity registry — NOT an epistemic claim
    // about the artifact (INVARIANT PR4). The epistemic type lives in `findingStage` below.
    type: "finding",
    title: label,
    label,
    link: finding.subject?.key ? `/research?finding=${encodeURIComponent(finding.id)}` : "/research",
    finding,
    sourceEngine: finding.source?.engine || null,
    findingKind: finding.kind || "other",
    // null when the source declared no epistemic type. Do NOT default this to "finding".
    findingStage: finding.stage ?? null,
    findingVerification: finding.verification?.verification_state ?? null,
  };
}

// ELS adapter: exact engine-owned occurrence becomes the identity.
// One universal Finding is emitted per shown exact occurrence — never label-only.
//
// HG-3 NOTE ON verification_state. The ELS engine returns an exact occurrence; it does not test a
// CLAIM. "match" would therefore be a fabricated verification (there is nothing it matched against),
// so the honest state is "not_tested" while the engine's actual output IS recorded in
// engine_method_tested/engine_result. This is the one place where this file deliberately diverges
// from PR #226, which hardcoded verification_state:"match" on both ELS adapters.
// This adapter builds the call itself, so it genuinely KNOWS no claim was submitted — which is
// why it may state "not_tested" EXPLICITLY. makeUniversalFinding() no longer infers that state
// from a missing input (M1 final acceptance patch); an adapter that does not know leaves it null.
// `stage` is deliberately NOT set: the epistemic type of an ELS occurrence is a semantic decision
// that belongs to the Human Gate, not to a projection adapter (INVARIANT PR1/PR3).
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
      // ELS corpus is Hebrew-only (Torah/Tanakh text) — source-original and display language
      // are the same today, declared explicitly per the Multilingual Identity Foundation
      // Closure contract §C rather than left implicit.
      subject: { type: "phrase", key: axisTerm, label: axisTerm, lang: "he" },
      source: { engine: "els", adapter: "els-state-v1", corpus, sourceRef: engineState.provenance?.source || null, lang: "he" },
      identity: { sourceIdentity: axisHit.hitId, occurrence: axisHit },
      verification: {
        claimed_expression: null,
        claimed_method: null,
        claimed_value: null,
        engine_method_tested: "els",
        engine_result: { corpus, ...axisHit },
        verification_state: "not_tested",
      },
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
        subject: { type: "word", key: f.t, label: f.t, lang: "he" },
        source: { engine: "els", adapter: "els-state-v1", corpus, sourceRef: engineState.provenance?.source || null, lang: "he" },
        identity: { sourceIdentity: hit.hitId, occurrence: hit },
        verification: {
          claimed_expression: null,
          claimed_method: null,
          claimed_value: null,
          engine_method_tested: "els",
          engine_result: { corpus, ...hit },
          verification_state: "not_tested",
        },
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
  // Legacy v1 findings created before verification/access fields were added remain readable.
  // New findings from makeUniversalFinding always carry the complete four-axis envelope.
  return Boolean(value && value.v === 1 && value.id && value.subject && value.source && value.identity && value.provenance);
}
