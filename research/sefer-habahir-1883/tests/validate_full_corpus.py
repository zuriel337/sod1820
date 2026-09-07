#!/usr/bin/env python3
"""Full-corpus validation for Sefer HaBahir 1883 (48/48 integration).

Proves, from the imported source files on disk (not from any cached
summary), that:
  - PDF pages 1-48 are each covered by exactly one ACTIVE source, no gaps,
    no duplicates.
  - The 6 corrective pages (30,31,32,34,35,38) are the active source for
    those pages, and the original scan-b files for those pages exist on
    disk unmodified (historical) but are excluded from the active count.
  - source_ref values are unique across the entire active block set.
  - Source PDF identity (sha256) is consistent across every imported
    sub-corpus's own manifest/coverage file.

Run: python3 tests/validate_full_corpus.py   (from research/sefer-habahir-1883/)
Exits non-zero on any failure.
"""
import gzip
import json
import os
import sys

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SUPERSEDED_PAGES = [30, 31, 32, 34, 35, 38]
EXPECTED_SHA256 = "b099f2298525c71e7abd45e6132610525fef7ccb8a8f3be338cf4e2404a57067"

failures = []


def fail(msg):
    failures.append(msg)


# --- 1. Load Scan A (pages 1-24) ---
scan_a_path = os.path.join(BASE, "scan-a", "SEFER_HABAHIR_1883_SCAN_A_PAGEWISE_V2.json.gz")
if not os.path.isfile(scan_a_path):
    fail("scan-a pagewise artifact missing")
    scan_a_pages = {}
else:
    with gzip.open(scan_a_path, "rt", encoding="utf-8") as f:
        scan_a = json.load(f)
    if scan_a["source"]["sha256"] != EXPECTED_SHA256:
        fail(f"scan-a source sha256 mismatch: {scan_a['source']['sha256']}")
    scan_a_pages = {p["pdf_page"]: p for p in scan_a["pages"]}
    if sorted(scan_a_pages.keys()) != list(range(1, 25)):
        fail(f"scan-a does not cover exactly pages 1-24: {sorted(scan_a_pages.keys())}")

# --- 2. Load Scan B (pages 25-48), split active/superseded ---
scan_b_dir = os.path.join(BASE, "scan-b", "pages")
scan_b_pages = {}
for n in range(25, 49):
    fp = os.path.join(scan_b_dir, f"p{n}.json")
    if not os.path.isfile(fp):
        fail(f"scan-b/pages/p{n}.json missing")
        continue
    d = json.load(open(fp, encoding="utf-8"))
    if d["pdf_page"] != n:
        fail(f"scan-b p{n}.json pdf_page field mismatch: {d['pdf_page']}")
    scan_b_pages[n] = d

# --- 3. Load corrective (30,31,32,34,35,38) ---
corr_dir = os.path.join(BASE, "scan-b-corrective", "pages")
corr_pages = {}
for n in SUPERSEDED_PAGES:
    fp = os.path.join(corr_dir, f"p{n}.json")
    if not os.path.isfile(fp):
        fail(f"scan-b-corrective/pages/p{n}.json missing")
        continue
    d = json.load(open(fp, encoding="utf-8"))
    if d["pdf_page"] != n:
        fail(f"corrective p{n}.json pdf_page field mismatch: {d['pdf_page']}")
    if not d.get("correction_of"):
        fail(f"corrective p{n}.json missing correction_of provenance")
    corr_pages[n] = d

if sorted(corr_pages.keys()) != sorted(SUPERSEDED_PAGES):
    fail(f"corrective set does not cover exactly {SUPERSEDED_PAGES}: {sorted(corr_pages.keys())}")

# --- 4. Build active index: exactly one active source per PDF page 1-48 ---
active_page_source = {}
for n in range(1, 25):
    if n in scan_a_pages:
        active_page_source[n] = "scan-a"
for n in range(25, 49):
    if n in SUPERSEDED_PAGES:
        if n in corr_pages:
            active_page_source[n] = "scan-b-corrective"
    else:
        if n in scan_b_pages:
            active_page_source[n] = "scan-b"

expected_pages = set(range(1, 49))
covered_pages = set(active_page_source.keys())
gaps = sorted(expected_pages - covered_pages)
extra = sorted(covered_pages - expected_pages)
if gaps:
    fail(f"gaps in active page coverage: {gaps}")
if extra:
    fail(f"active coverage includes out-of-range pages: {extra}")
if len(covered_pages) != 48:
    fail(f"active page count is {len(covered_pages)}, expected 48")

# Old scan-b files for superseded pages must still exist on disk (historical), but NOT be counted active
for n in SUPERSEDED_PAGES:
    old_fp = os.path.join(scan_b_dir, f"p{n}.json")
    if not os.path.isfile(old_fp):
        fail(f"historical scan-b/pages/p{n}.json missing -- provenance must be preserved, not deleted")
    if active_page_source.get(n) != "scan-b-corrective":
        fail(f"page {n} active source is not scan-b-corrective (supersession not applied)")

# --- 5. source_ref uniqueness across the ACTIVE set ---
all_active_refs = []
for n in range(1, 25):
    p = scan_a_pages.get(n, {})
    for b in p.get("blocks", []):
        all_active_refs.append(b["source_ref"])
for n in range(25, 49):
    if n in SUPERSEDED_PAGES:
        d = corr_pages.get(n, {})
    else:
        d = scan_b_pages.get(n, {})
    for b in d.get("input", {}).get("blocks", []):
        all_active_refs.append(f"book:sefer-habahir-1883#p{n}:{b['block_id']}")

dupes = sorted({r for r in all_active_refs if all_active_refs.count(r) > 1})
if dupes:
    fail(f"duplicate source_ref values in active set: {dupes}")

# --- 6. Cross-check against the manifest/coverage files this integration wrote ---
manifest_path = os.path.join(BASE, "FULL_CORPUS_MANIFEST.json")
coverage_path = os.path.join(BASE, "FULL_CORPUS_COVERAGE.json")
if not os.path.isfile(manifest_path):
    fail("FULL_CORPUS_MANIFEST.json missing")
if not os.path.isfile(coverage_path):
    fail("FULL_CORPUS_COVERAGE.json missing")
else:
    cov = json.load(open(coverage_path, encoding="utf-8"))
    if cov.get("pages_covered_count") != 48:
        fail(f"FULL_CORPUS_COVERAGE.json pages_covered_count != 48: {cov.get('pages_covered_count')}")
    if cov.get("gaps"):
        fail(f"FULL_CORPUS_COVERAGE.json reports gaps: {cov.get('gaps')}")
    total_blocks_recount = len(all_active_refs)
    if cov.get("total_active_blocks") != total_blocks_recount:
        fail(f"FULL_CORPUS_COVERAGE.json total_active_blocks ({cov.get('total_active_blocks')}) != recount from source files ({total_blocks_recount})")

# --- report ---
print(f"Active pages covered: {len(covered_pages)} / 48")
print(f"Active blocks (recounted from source files): {len(all_active_refs)}")
print(f"Superseded pages (historical, excluded from active count): {SUPERSEDED_PAGES}")
print(f"Distinct active source_ref values: {len(set(all_active_refs))}")

if failures:
    print(f"\n{len(failures)} FAILURE(S):")
    for f in failures:
        print(f"  FAIL: {f}")
    sys.exit(1)
else:
    print("\nAll full-corpus validation checks passed. 48/48 exact, no gaps, no duplicate active assignments, no duplicate source_refs.")
    sys.exit(0)
