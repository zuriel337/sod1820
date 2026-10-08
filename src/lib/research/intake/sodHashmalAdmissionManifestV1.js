// SOD_HASHMAL Golden Pass admission manifest — frozen SUMMARY only (work_log 760d52a7-3496-4eb7-b0d1-52e0243cd2db).
// The completed audit recorded dispositions as counts and prose; it did NOT persist a per-locus deterministic
// payload (post id + locus + statement + method) anywhere in work_log or the repository. Per the assignment
// ("do not invent entries missing deterministic payload") entries stay EMPTY until GPT/ZURIEL supply the frozen
// 40-locus list. The builder + executor path for Source Work entries is implemented and tested against fixtures.

export const SOD_HASHMAL_MANIFEST_VERSION = "SOD_HASHMAL_GOLDEN_ADMISSION_MANIFEST_V1";
export const SOD_HASHMAL_SOURCE_WORK = Object.freeze({ kind: "source_work", label: "סוד החשמל", slug: "sod-hachashmal" });

export const SOD_HASHMAL_ADMISSION_MANIFEST_V1 = Object.freeze({
  version: SOD_HASHMAL_MANIFEST_VERSION,
  source_count: 40,
  disposition_counts: Object.freeze({
    READY_ENGINE_VERIFIED: 9, READY_SOURCE_ATTESTED: 4, READY_MIXED: 6, READY_TESTED_MISMATCH: 2,
    REUSE_CLAIM_OCCURRENCE: 9, HOLD_CONTEXT_DEPENDENT: 5, EXCLUDE_NO_STANDALONE_FINDING: 5,
  }),
  entries: Object.freeze([]),
  entries_blocker: "NO_DETERMINISTIC_PAYLOAD_FROZEN: per-locus entries (post_id, locus, exact statement, method) are not persisted in the audit outputs; counts only.",
});
