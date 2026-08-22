#!/usr/bin/env python3
"""
RESEARCH SNAPSHOT / PRESERVATION PASS — build script.
Copies research artifacts from the ephemeral scratchpad into a durable repo
location, verbatim (byte-for-byte), and builds a manifest with per-file
checksums + row counts, verified against the scratchpad originals.

Read-only against Supabase / the corpus. Writes only inside the repo archive dir.
"""
import csv
import hashlib
import json
import os
import shutil
import sys

SRC = "/tmp/claude-0/-home-user-sod1820/70cec2af-b1bd-57b2-8e03-c816139f5c80/scratchpad"
DEST_ROOT = "/home/user/sod1820/docs/research-archive/2026-08-22-research-snapshot"

# (dest_subdir, filename, artifact_group, task_or_phase, status, canonical_or_candidate, notes)
FILES = [
    # --- era1: Corpus DNA — WhatsApp intake ---
    ("era1-corpus-dna-whatsapp-intake", "gematria_words_high_trust_candidates.csv", "WhatsApp high-trust candidates", "Corpus DNA — WhatsApp intake (era 1)", "SCRATCHPAD_ONLY", "candidate", ""),
    ("era1-corpus-dna-whatsapp-intake", "gematria_words_whatsapp_unconnected.csv", "WhatsApp unconnected rows", "Corpus DNA — WhatsApp intake (era 1)", "SCRATCHPAD_ONLY", "candidate", ""),
    ("era1-corpus-dna-whatsapp-intake", "gematria_words_wa_classified.csv", "WhatsApp classified rows", "Corpus DNA — WhatsApp intake (era 1)", "SCRATCHPAD_ONLY", "candidate", ""),
    ("era1-corpus-dna-whatsapp-intake", "gematria_words_whatsapp_full_audit.csv", "WhatsApp full audit trail", "Corpus DNA — WhatsApp intake (era 1)", "SCRATCHPAD_ONLY", "candidate", ""),
    # --- era1: classification batches (superseded by v3) ---
    ("era1-classification-batches-superseded", "classification_canonical_core.csv", "Classification batch: canonical-core", "Corpus DNA — component classification batches (era 1)", "SUPERSEDED", "candidate (intermediate)", "absorbed into MASTER_CLASSIFICATION_v3.csv"),
    ("era1-classification-batches-superseded", "classification_raw_docx.csv", "Classification batch: raw-docx-import", "Corpus DNA — component classification batches (era 1)", "SUPERSEDED", "candidate (intermediate)", "absorbed into MASTER_CLASSIFICATION_v3.csv"),
    ("era1-classification-batches-superseded", "classification_contrib_events.csv", "Classification batch: contribution-events", "Corpus DNA — component classification batches (era 1)", "SUPERSEDED", "candidate (intermediate)", "absorbed into MASTER_CLASSIFICATION_v3.csv"),
    ("era1-classification-batches-superseded", "classification_excel_import.csv", "Classification batch: excel-import", "Corpus DNA — component classification batches (era 1)", "SUPERSEDED", "candidate (intermediate)", "absorbed into MASTER_CLASSIFICATION_v3.csv"),
    ("era1-classification-batches-superseded", "classification_messianic_cluster.csv", "Classification batch: messianic-cluster", "Corpus DNA — component classification batches (era 1)", "SUPERSEDED", "candidate (intermediate)", "absorbed into MASTER_CLASSIFICATION_v3.csv"),
    ("era1-classification-batches-superseded", "classification_low_confidence_resolved.csv", "Classification batch: low-confidence-resolved", "Corpus DNA — component classification batches (era 1)", "SUPERSEDED", "candidate (intermediate)", "absorbed into MASTER_CLASSIFICATION_v3.csv"),
    ("era1-classification-batches-superseded", "STEP2_ambiguous62_resolved.csv", "Master Classification build step 2", "Master Classification build steps (era 1)", "SUPERSEDED", "candidate (intermediate)", "absorbed into MASTER_CLASSIFICATION_v3.csv"),
    ("era1-classification-batches-superseded", "STEP3_whatsapp_structured.csv", "Master Classification build step 3", "Master Classification build steps (era 1)", "SUPERSEDED", "candidate (intermediate)", "absorbed into MASTER_CLASSIFICATION_v3.csv"),
    ("era1-classification-batches-superseded", "method_mentions_enrichment.csv", "Method mentions enrichment (pre-classification)", "Method Mentions — Enrichment Audit (era 1)", "SUPERSEDED", "candidate (intermediate)", "absorbed into METHOD_MENTIONS_CLASSIFIED.csv"),
    # --- era1: Master Classification (v1, v2 superseded; v3 = FINAL, highest-priority artifact) ---
    ("era1-master-classification", "MASTER_CLASSIFICATION.csv", "Master Classification v1", "Corpus DNA — Master Classification (era 1)", "SUPERSEDED", "candidate", "superseded by v3"),
    ("era1-master-classification", "MASTER_CLASSIFICATION_v2.csv", "Master Classification v2", "Corpus DNA — Master Classification (era 1)", "SUPERSEDED", "candidate", "superseded by v3"),
    ("era1-master-classification", "MASTER_CLASSIFICATION_v3.csv", "Master Classification v3 (FINAL — 15,433 rows, ZERO live-DB footprint)", "Corpus DNA — Master Classification FINAL (era 1)", "SCRATCHPAD_ONLY", "candidate (extensive, unreviewed)", "single largest / highest-value artifact of the whole session; explicitly required present+reproducible per Zuriel instruction"),
    # --- era1: Human-Gate ---
    ("era1-human-gate", "HUMAN_GATE_conflicts.csv", "Human-Gate conflicts (120)", "Corpus DNA — Human-Gate (era 1)", "PARTIALLY_PERSISTED", "candidate", "counts/resolution method in work_log; per-conflict detail only here"),
    ("era1-human-gate", "HUMAN_GATE_ambiguous_enrichment.csv", "Human-Gate ambiguous enrichment (62)", "Corpus DNA — Human-Gate (era 1)", "SCRATCHPAD_ONLY", "candidate", "cited as methodological precedent in Numeric Language Phase 5"),
    ("era1-human-gate", "HUMAN_GATE_FINAL.csv", "Human-Gate closing summary", "Corpus DNA — Closing Sequence (era 1)", "PARTIALLY_PERSISTED", "awaiting Zuriel", ""),
    ("era1-human-gate", "CORPUS_DNA_GAPS.csv", "Corpus DNA gaps", "Corpus DNA — Closing Sequence (era 1)", "SCRATCHPAD_ONLY", "findings", ""),
    # --- era1: Method Mentions Phase 2/3 (reused live in era 2) ---
    ("era1-method-mentions", "METHOD_MENTIONS_CLASSIFIED.csv", "Method mentions classified (797)", "Method Mentions Phase 2 (era 1) — reused in era 2", "SCRATCHPAD_ONLY", "candidate (extensive, unreviewed)", "load-bearing: reused as source by Numeric Language Phase 5 + Methods Expansion Phase 1"),
    ("era1-method-mentions", "METHOD_MENTIONS_HUMAN_GATE.csv", "Method mentions Human-Gate flags (240)", "Method Mentions Phase 2 (era 1)", "SCRATCHPAD_ONLY", "candidate", ""),
    ("era1-method-mentions", "METHOD_CANDIDATES_RESOLVED.csv", "Method name candidates (ר\"ת/ס\"ת/ישר-והפוך)", "Method Mentions Phase 3 (era 1) — seed of Methods Expansion Phase 1", "SCRATCHPAD_ONLY", "candidate (insufficient_definition)", "only record of the ר\"ת=644 anchor-cluster finding"),
    ("era1-method-mentions", "METHOD_MISMATCH_PATTERNS.csv", "Method mismatch patterns (225)", "Method Mentions Phase 3 (era 1)", "SCRATCHPAD_ONLY", "findings", ""),
    ("era1-method-mentions", "METHOD_CLAIMS_PHASE3.csv", "Method claims Phase 3 (797)", "Method Mentions Phase 3 (era 1) — reused in era 2", "SCRATCHPAD_ONLY", "candidate", "reused as source by Numeric Language Phase 5"),
    # --- era1: numeric/year audits (reused as Phase 5 seed) ---
    ("era1-numeric-year-audits", "numeric_word_phrases_audit.csv", "Numeric word phrases audit (570)", "era 1 source data — reused as Numeric Language Phase 5 seed", "SCRATCHPAD_ONLY", "candidate", "sole source for the 75/148/776 organic-corpus rediscovery"),
    ("era1-numeric-year-audits", "year_time_audit.csv", "Year/time audit (111)", "era 1 source data — reused in Numeric Language Phase 5", "SCRATCHPAD_ONLY", "candidate", ""),
    # --- era1: messiah research package ---
    ("era1-messiah-research-package", "messiah_research_package_full.csv", "Messiah/גאולה thematic research package (1,467)", "Corpus DNA — thematic research package (era 1)", "SCRATCHPAD_ONLY", "candidate", "large, zero live footprint, not re-verified this pass"),
    # --- era1: Research DNA architecture ---
    ("era1-research-dna-architecture", "RESEARCH_DNA_ARCHITECTURE.md", "Research DNA v1 architecture proposal", "Legacy → Research DNA Crosswalk (era 1)", "PARTIALLY_PERSISTED", "design proposal, unreviewed", "returned_to_zuriel_gpt_for_decision"),
    ("era1-research-dna-architecture", "RESEARCH_DNA_PROOF_OF_MODEL.md", "Research DNA v1 proof of model (20 cases)", "Research DNA v1 — Proof of Model (era 1)", "PARTIALLY_PERSISTED", "design proposal, unreviewed", ""),
    ("era1-research-dna-architecture", "MULTIDIM_TEST_EXAMPLES.csv", "Multi-dimension test examples (20)", "Research DNA v1 (era 1)", "SCRATCHPAD_ONLY", "design-proposal supporting data", ""),
    # --- era2: Numeric Language Phase 1 ---
    ("era2-numeric-language-phase1", "anchor_union.csv", "61-anchor union list", "Numeric Language Phase 1", "SCRATCHPAD_ONLY", "derived reference list", "the 61 numbers themselves live in source tables; this is the derived union"),
    ("era2-numeric-language-phase1", "NUMERIC_LANGUAGE_ANCHORS.csv", "61-anchor generated forms + method values", "Numeric Language Phase 1", "SCRATCHPAD_ONLY", "candidate findings", ""),
    ("era2-numeric-language-phase1", "NUMERIC_LANGUAGE_PHASE1_REPORT.md", "Numeric Language Phase 1 report", "Numeric Language Phase 1", "SCRATCHPAD_ONLY", "candidate findings", ""),
    # --- era2: Numeric Language Phase 2 ---
    ("era2-numeric-language-phase2", "NUMERIC_CROSS_ANCHOR_NETWORK.csv", "Cross-anchor network (26 paths)", "Numeric Language Phase 2", "SCRATCHPAD_ONLY", "candidate findings", "decision=NOT YET; superseded in scope by Phase 3"),
    ("era2-numeric-language-phase2", "NUMERIC_CROSS_ANCHOR_NETWORK_REPORT.md", "Cross-anchor network report", "Numeric Language Phase 2", "SCRATCHPAD_ONLY", "candidate findings", ""),
    ("era2-numeric-language-phase2", "raw_cross_anchor_paths.csv", "Raw cross-anchor paths (pre-dedup)", "Numeric Language Phase 2", "SCRATCHPAD_ONLY", "candidate findings (raw)", "supporting raw data for NUMERIC_CROSS_ANCHOR_NETWORK.csv"),
    # --- era2: Numeric Language Phase 3 (final anchor-only network) ---
    ("era2-numeric-language-phase3", "NUMERIC_LANGUAGE_NETWORK_V1.csv", "Full 61-anchor directed network (FINAL anchor-only result)", "Numeric Language Phase 3", "SCRATCHPAD_ONLY", "candidate findings, decision NOT YET", "nothing later fully supersedes this"),
    ("era2-numeric-language-phase3", "NUMERIC_LANGUAGE_NETWORK_REPORT.md", "Numeric Language Phase 3 report", "Numeric Language Phase 3", "SCRATCHPAD_ONLY", "candidate findings", ""),
    # --- era2: Numeric Language Phase 4 ---
    ("era2-numeric-language-phase4", "PHASE4_SAMPLE_representative.csv", "100-number stratified representative sample (aka NUMERIC_LANGUAGE_PHASE4_SAMPLE.csv)", "Numeric Language Phase 4", "SCRATCHPAD_ONLY", "sampling frame + candidate findings", "irreplaceable without exact reseed (seed=1820)"),
    ("era2-numeric-language-phase4", "NUMERIC_LANGUAGE_RESEARCH_INTEREST_SET.csv", "63 research-interest numbers + 3 Zuriel seeds (111/222/424)", "Numeric Language Phase 4 Addendum", "SCRATCHPAD_ONLY", "candidate list", "primary answer to audit item F/G; zero live footprint as a curated set"),
    ("era2-numeric-language-phase4", "NUMERIC_LANGUAGE_PHASE4_PATHS.csv", "Phase 4 path-level evidence (representative sample)", "Numeric Language Phase 4", "SCRATCHPAD_ONLY", "candidate findings", ""),
    ("era2-numeric-language-phase4", "NUMERIC_LANGUAGE_RESEARCH_INTEREST_PATHS.csv", "Phase 4 path-level evidence (research-interest set)", "Numeric Language Phase 4 Addendum", "SCRATCHPAD_ONLY", "candidate findings", ""),
    ("era2-numeric-language-phase4", "NUMERIC_LANGUAGE_PHASE4_CONTROL.csv", "Control A baseline (fixed-offset pairing)", "Numeric Language Phase 4", "SCRATCHPAD_ONLY", "control/baseline data", "used to compute the ~9x lift finding"),
    ("era2-numeric-language-phase4", "NUMERIC_LANGUAGE_PHASE4_REPORT.md", "Numeric Language Phase 4 + Addendum report", "Numeric Language Phase 4 + Addendum", "PARTIALLY_PERSISTED", "decision report", "decision NOT YET (general) / YES-provisional (research-amplification)"),
    # --- era2: Strong Numbers method sheet ---
    ("era2-strong-numbers", "NUMERIC_LANGUAGE_STRONG_NUMBERS_METHOD_SHEET.md", "Strong Numbers method sheet (50 numbers x 2 forms x 13 methods = 1,300 values)", "Strong Numbers Method Sheet", "SCRATCHPAD_ONLY", "reference sheet", ""),
    # --- era2: Numeric Language Phase 5 (bidirectional reconciliation) ---
    ("era2-numeric-language-phase5", "NUMBER_WORDS_RECONCILED.csv", "Words→Number reconciliation (570)", "Numeric Language Phase 5", "SCRATCHPAD_ONLY", "candidate findings", "the 75/148/776 organic-corpus rediscovery"),
    ("era2-numeric-language-phase5", "NUMBER_WORDS_AMBIGUOUS.csv", "Ambiguous words→number rows (22) — ready-to-review Human-Gate list", "Numeric Language Phase 5", "SCRATCHPAD_ONLY", "candidate + specific Human-Gate list", "e.g. Shema fragment=1118, Exodus 12:6 fragment=1820"),
    ("era2-numeric-language-phase5", "NUMBER_WORDS_RESEARCH_FINDINGS.csv", "Words→number research findings (120)", "Numeric Language Phase 5", "SCRATCHPAD_ONLY", "candidate findings", ""),
    ("era2-numeric-language-phase5", "NUMBER_LANGUAGE_BIDIRECTIONAL_REPORT.md", "Bidirectional reconciliation report", "Numeric Language Phase 5", "PARTIALLY_PERSISTED", "candidate findings, decision NOT YET", ""),
    ("era2-numeric-language-phase5", "NUMWORDS_GENERATED.csv", "Generated number-word forms (Phase 5 support)", "Numeric Language Phase 5", "SCRATCHPAD_ONLY", "candidate (intermediate)", ""),
    # --- era2: Methods Expansion Phase 1 ---
    ("era2-methods-expansion", "METHOD_EXPANSION_RESOLUTION.csv", "Method expansion resolution (39: 18 רת + 18 סת + 3 ישר-והפוך)", "Methods Expansion Phase 1", "PARTIALLY_PERSISTED", "candidate (all 3 REMAIN_CANDIDATE)", "answers audit item J; decision already REMAIN_CANDIDATE, logged in work_log"),
    ("era2-methods-expansion", "METHOD_EXPANSION_REPORT.md", "Methods Expansion Phase 1 report", "Methods Expansion Phase 1", "PARTIALLY_PERSISTED", "candidate", ""),
    # --- era2: Words/Names/Aliases Phase 1 ---
    ("era2-words-names-identity", "WORDS_NAMES_IDENTITY_PROOF.csv", "35 word_aliases/language_bridge architecture-sufficiency test cases", "Words/Names/Aliases Phase 1", "PARTIALLY_PERSISTED", "architecture decision (YES) + gap finding", "spelling_variant alias_type never populated"),
    ("era2-words-names-identity", "WORDS_NAMES_IDENTITY_REPORT.md", "Words/Names/Aliases Phase 1 report", "Words/Names/Aliases Phase 1", "PARTIALLY_PERSISTED", "architecture decision", ""),
    # --- era2: Corpus Expansion Phase 1 + Gate Correction ---
    ("era2-corpus-expansion", "CORPUS_EXPANSION_INTAKE_SPEC.md", "Intake state-machine design (9 steps, A-F taxonomy)", "Corpus Expansion Phase 1 + Gate Correction", "PARTIALLY_PERSISTED", "design spec, unreviewed", "proposed intent=lexical_identity, not adopted"),
    ("era2-corpus-expansion", "INTAKE_DECISION_MATRIX.csv", "Intake decision matrix (18 scenarios)", "Corpus Expansion Phase 1 + Gate Correction", "PARTIALLY_PERSISTED", "design spec, unreviewed", ""),
    # --- era2: Hebrew Identity Phase 2 ---
    ("era2-hebrew-identity", "HEBREW_IDENTITY_FAMILIES.csv", "14 identity family candidates (29 surface-form rows)", "Hebrew Identity Phase 2", "SCRATCHPAD_ONLY", "candidate / pending Human-Gate", "see PROVENANCE_CORRECTION memo (work_log id 3dd31ed2-...) — chat discussion is NOT durable approval"),
    ("era2-hebrew-identity", "HEBREW_IDENTITY_HUMAN_GATE.csv", "10-row Human-Gate decision list", "Hebrew Identity Phase 2", "SCRATCHPAD_ONLY", "candidate / pending Human-Gate", "see PROVENANCE_CORRECTION memo (work_log id 3dd31ed2-...)"),
    ("era2-hebrew-identity", "HEBREW_IDENTITY_PHASE2_REPORT.md", "Hebrew Identity Phase 2 report", "Hebrew Identity Phase 2", "SCRATCHPAD_ONLY", "candidate / pending Human-Gate", ""),
    # --- session audit (this session's own closing deliverables) ---
    ("session-audit", "SESSION_RESEARCH_INVENTORY.csv", "Full 42-artifact session inventory (CSV)", "Session Research Persistence Audit", "PERSISTED (this snapshot)", "audit deliverable", "base input for this manifest"),
    ("session-audit", "SESSION_RESEARCH_INVENTORY.md", "Full 42-artifact session inventory (narrative)", "Session Research Persistence Audit", "PERSISTED (this snapshot)", "audit deliverable", ""),
    ("session-audit", "PERSISTENCE_GAP_REPORT.md", "SAFE/AT-RISK/NEEDS-HUMAN-DECISION risk classification", "Session Research Persistence Audit", "PERSISTED (this snapshot)", "audit deliverable", ""),
    ("session-audit", "PROPOSED_PERSISTENCE_PASS.md", "Proposed (not-yet-executed) DB persistence plan", "Session Research Persistence Audit", "PERSISTED (this snapshot)", "audit deliverable, unexecuted plan", ""),
]

# intermediate JSON/CSV caches — archived in full for completeness (row 43 of the
# inventory), but individually low-value/re-derivable from live tables.
INTERMEDIATE_GLOB_EXCLUDE = {f[1] for f in FILES} | {
    "build_snapshot.py", "audit_build.py", "SESSION_RESEARCH_PERSISTENCE_AUDIT_FILES.txt",
}

def sha256_of(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()

def row_count_of(path):
    if path.endswith(".csv"):
        with open(path, newline="", encoding="utf-8", errors="replace") as f:
            n = sum(1 for _ in csv.reader(f))
        return max(n - 1, 0)  # minus header
    if path.endswith(".json"):
        try:
            with open(path, encoding="utf-8") as f:
                data = json.load(f)
            if isinstance(data, list):
                return len(data)
            if isinstance(data, dict):
                return len(data)
        except Exception:
            return ""
        return ""
    return ""  # .md — not row-oriented

def main():
    manifest_rows = []
    missing = []

    # 1) named/classified artifacts
    for dest_subdir, filename, artifact_group, phase, status, canon, notes in FILES:
        src_path = os.path.join(SRC, filename)
        if not os.path.isfile(src_path):
            missing.append(filename)
            continue
        dest_dir = os.path.join(DEST_ROOT, dest_subdir)
        os.makedirs(dest_dir, exist_ok=True)
        dest_path = os.path.join(dest_dir, filename)
        shutil.copy2(src_path, dest_path)

        src_sha = sha256_of(src_path)
        dest_sha = sha256_of(dest_path)
        src_rows = row_count_of(src_path)
        dest_rows = row_count_of(dest_path)

        manifest_rows.append({
            "filename": filename,
            "repo_path": os.path.relpath(dest_path, "/home/user/sod1820"),
            "artifact_group": artifact_group,
            "phase_or_task": phase,
            "row_count": dest_rows,
            "research_status": status,
            "provenance": "scratchpad session " + SRC.rsplit("/", 1)[-1] + " (this session, 2026-08-22)",
            "canonical_or_candidate": canon,
            "sha256": dest_sha,
            "checksum_verified": "MATCH" if src_sha == dest_sha else "MISMATCH",
            "row_count_verified": "MATCH" if src_rows == dest_rows else "MISMATCH",
            "notes": notes,
        })

    # 2) intermediate caches — everything else under scratchpad not already covered
    #    and not itself a build artifact / this script.
    intermediate_dir = os.path.join(DEST_ROOT, "intermediate-caches")
    for fn in sorted(os.listdir(SRC)):
        full = os.path.join(SRC, fn)
        if not os.path.isfile(full):
            continue
        if fn in INTERMEDIATE_GLOB_EXCLUDE:
            continue
        if not (fn.endswith(".json") or (fn.endswith(".csv") and fn not in INTERMEDIATE_GLOB_EXCLUDE)):
            continue
        # only json here; the classified CSVs are all already handled above
        if not fn.endswith(".json"):
            continue
        os.makedirs(intermediate_dir, exist_ok=True)
        dest_path = os.path.join(intermediate_dir, fn)
        shutil.copy2(full, dest_path)
        src_sha = sha256_of(full)
        dest_sha = sha256_of(dest_path)
        src_rows = row_count_of(full)
        dest_rows = row_count_of(dest_path)
        manifest_rows.append({
            "filename": fn,
            "repo_path": os.path.relpath(dest_path, "/home/user/sod1820"),
            "artifact_group": "intermediate reference cache (cross-phase)",
            "phase_or_task": "cross-phase intermediate reference data (era 2)",
            "row_count": dest_rows,
            "research_status": "SCRATCHPAD_ONLY",
            "provenance": "scratchpad session " + SRC.rsplit("/", 1)[-1] + " (this session, 2026-08-22)",
            "canonical_or_candidate": "intermediate cache, not itself a finding",
            "sha256": dest_sha,
            "checksum_verified": "MATCH" if src_sha == dest_sha else "MISMATCH",
            "row_count_verified": "MATCH" if src_rows == dest_rows else "MISMATCH",
            "notes": "re-derivable from gematria_words/nodes/edges directly; archived for completeness only",
        })

    # 3) write manifest CSV
    manifest_csv_path = os.path.join(DEST_ROOT, "MANIFEST.csv")
    fieldnames = ["filename", "repo_path", "artifact_group", "phase_or_task", "row_count",
                  "research_status", "provenance", "canonical_or_candidate", "sha256",
                  "checksum_verified", "row_count_verified", "notes"]
    with open(manifest_csv_path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        for row in manifest_rows:
            w.writerow(row)

    print(f"Copied {len(manifest_rows)} files into {DEST_ROOT}")
    print(f"Missing (not found in scratchpad, skipped): {missing}")
    n_mismatch = sum(1 for r in manifest_rows if r["checksum_verified"] != "MATCH" or r["row_count_verified"] != "MATCH")
    print(f"Verification mismatches: {n_mismatch}")

    # Save a small json summary for the report step
    with open(os.path.join(DEST_ROOT, "_build_summary.json"), "w", encoding="utf-8") as f:
        json.dump({
            "total_files": len(manifest_rows),
            "missing": missing,
            "mismatches": n_mismatch,
        }, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    main()
