#!/usr/bin/env python3
"""Validation for Sefer HaBahir 1883 Scan B corrective batch (PDF pages 30,31,32,34,35,38).

Run: python3 tests/validate_corrective.py   (from the scan-b-corrective/ directory)
Exits non-zero on any failure.
"""
import json
import os
import sys

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGES_DIR = os.path.join(BASE, "pages")
EXPECTED_PAGES = [30, 31, 32, 34, 35, 38]

REQUIRED_TOP_KEYS = {"pdf_page", "input", "extraction", "finding", "claim", "provenance", "correction_of", "correction_method"}

failures = []
warnings = []


def fail(msg):
    failures.append(msg)


def warn(msg):
    warnings.append(msg)


seen_pages = set()
for n in EXPECTED_PAGES:
    fp = os.path.join(PAGES_DIR, f"p{n}.json")
    if not os.path.isfile(fp):
        fail(f"missing pages/p{n}.json")
        continue
    try:
        d = json.load(open(fp, encoding="utf-8"))
    except Exception as e:
        fail(f"pages/p{n}.json invalid JSON: {e}")
        continue

    missing_keys = REQUIRED_TOP_KEYS - set(d.keys())
    if missing_keys:
        fail(f"pages/p{n}.json missing top-level keys: {missing_keys}")

    pdf_page = d.get("pdf_page")
    if pdf_page != n:
        fail(f"pages/p{n}.json pdf_page field is {pdf_page}, expected {n}")
    seen_pages.add(pdf_page)

    if not d.get("correction_of"):
        fail(f"p{n}: missing correction_of provenance field")
    if not d.get("correction_method"):
        fail(f"p{n}: missing correction_method field")

    blocks = d.get("input", {}).get("blocks", [])
    if not blocks:
        fail(f"p{n}: input.blocks is empty")
    block_ids = []
    for b in blocks:
        bid = b.get("block_id")
        if not bid:
            fail(f"p{n}: a block is missing block_id")
            continue
        if not bid.startswith(f"p{n}-"):
            fail(f"p{n}: block_id '{bid}' does not start with expected prefix 'p{n}-'")
        block_ids.append(bid)
    dupes = {b for b in block_ids if block_ids.count(b) > 1}
    if dupes:
        fail(f"p{n}: duplicate block_id(s) within page: {dupes}")

expected_set = set(EXPECTED_PAGES)
if seen_pages != expected_set:
    missing = expected_set - seen_pages
    extra = seen_pages - expected_set
    if missing:
        fail(f"missing pdf_page coverage for: {sorted(missing)}")
    if extra:
        fail(f"unexpected pdf_page values found (out of corrective scope): {sorted(extra)}")

# coverage.json
coverage_path = os.path.join(BASE, "coverage.json")
if not os.path.isfile(coverage_path):
    fail("coverage.json missing")
else:
    try:
        coverage = json.load(open(coverage_path, encoding="utf-8"))
        cov_pages = {row["pdf_page"] for row in coverage}
        if len(coverage) != 6:
            fail(f"coverage.json has {len(coverage)} rows, expected 6")
        if cov_pages != expected_set:
            fail("coverage.json pdf_page set does not match expected corrective batch {30,31,32,34,35,38}")
    except Exception as e:
        fail(f"coverage.json invalid: {e}")

# unresolved.md
unresolved_path = os.path.join(BASE, "unresolved.md")
if not os.path.isfile(unresolved_path):
    fail("unresolved.md missing")
else:
    import re
    text = open(unresolved_path, encoding="utf-8").read()
    refs = re.findall(r"book:sefer-habahir-1883#p(\d+):", text)
    for r in refs:
        if int(r) not in expected_set:
            fail(f"unresolved.md references out-of-scope PDF page {r}")

# required docs
for fname in ("README.md", "DISCREPANCY_REPORT.md"):
    if not os.path.isfile(os.path.join(BASE, fname)):
        fail(f"{fname} missing")

# out-of-scope guard: no other page files present in this directory
all_page_files = [f for f in os.listdir(PAGES_DIR) if f.startswith("p") and f.endswith(".json")]
extra_files = [f for f in all_page_files if int(f[1:-5]) not in expected_set]
if extra_files:
    fail(f"unexpected page files present (out of corrective scope): {extra_files}")

print(f"Checked {len(EXPECTED_PAGES)} corrective-batch pages: {EXPECTED_PAGES}")
print(f"Pages found: {sorted(seen_pages)}")

if warnings:
    print(f"\n{len(warnings)} warning(s):")
    for w in warnings:
        print(f"  WARN: {w}")

if failures:
    print(f"\n{len(failures)} FAILURE(S):")
    for f in failures:
        print(f"  FAIL: {f}")
    sys.exit(1)
else:
    print("\nAll validation checks passed.")
    sys.exit(0)
