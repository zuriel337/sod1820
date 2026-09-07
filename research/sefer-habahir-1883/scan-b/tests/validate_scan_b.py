#!/usr/bin/env python3
"""Validation for Sefer HaBahir 1883 SCAN_B artifacts (PDF pages 25-48).

Run: python3 tests/validate_scan_b.py   (from the scan-b/ directory)
Exits non-zero on any failure.
"""
import json
import os
import sys

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGES_DIR = os.path.join(BASE, "pages")
EXPECTED_PAGES = list(range(25, 49))  # 25..48 inclusive

REQUIRED_TOP_KEYS = {"pdf_page", "input", "extraction", "finding", "claim", "provenance"}

failures = []
warnings = []


def fail(msg):
    failures.append(msg)


def warn(msg):
    warnings.append(msg)


# 1. manifest.json exists and is valid JSON
manifest_path = os.path.join(BASE, "manifest.json")
if not os.path.isfile(manifest_path):
    fail("manifest.json missing")
else:
    try:
        manifest = json.load(open(manifest_path, encoding="utf-8"))
        if manifest.get("pdf_pages_total_N") != 48:
            fail("manifest.json pdf_pages_total_N != 48")
        if manifest.get("half_boundary_M") != 24:
            fail("manifest.json half_boundary_M != 24")
    except Exception as e:
        fail(f"manifest.json invalid JSON: {e}")

# 2. every expected page file exists, is valid JSON, has required keys
seen_pages = set()
all_block_refs = []  # (pdf_page, block_id)

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

    blocks = d.get("input", {}).get("blocks", [])
    if not blocks:
        warn(f"p{n}: input.blocks is empty")
    block_ids = []
    for b in blocks:
        bid = b.get("block_id")
        if not bid:
            fail(f"p{n}: a block is missing block_id")
            continue
        if not bid.startswith(f"p{n}-"):
            fail(f"p{n}: block_id '{bid}' does not start with expected prefix 'p{n}-'")
        block_ids.append(bid)
        all_block_refs.append((n, bid))
    dupes = {b for b in block_ids if block_ids.count(b) > 1}
    if dupes:
        fail(f"p{n}: duplicate block_id(s) within page: {dupes}")

# 3. no gaps / no out-of-range / exact set match
expected_set = set(EXPECTED_PAGES)
if seen_pages != expected_set:
    missing = expected_set - seen_pages
    extra = seen_pages - expected_set
    if missing:
        fail(f"missing pdf_page coverage for: {sorted(missing)}")
    if extra:
        fail(f"unexpected pdf_page values found: {sorted(extra)}")

# 4. coverage.json has exactly 24 rows matching pages
coverage_path = os.path.join(BASE, "coverage.json")
if not os.path.isfile(coverage_path):
    fail("coverage.json missing")
else:
    try:
        coverage = json.load(open(coverage_path, encoding="utf-8"))
        cov_pages = {row["pdf_page"] for row in coverage}
        if len(coverage) != 24:
            fail(f"coverage.json has {len(coverage)} rows, expected 24")
        if cov_pages != expected_set:
            fail("coverage.json pdf_page set does not match expected 25..48")
    except Exception as e:
        fail(f"coverage.json invalid: {e}")

# 5. unresolved.md exists and every 'book:sefer-habahir-1883#pNN:' reference is within range
unresolved_path = os.path.join(BASE, "unresolved.md")
if not os.path.isfile(unresolved_path):
    fail("unresolved.md missing")
else:
    import re
    text = open(unresolved_path, encoding="utf-8").read()
    refs = re.findall(r"book:sefer-habahir-1883#p(\d+):", text)
    for r in refs:
        if int(r) not in expected_set:
            fail(f"unresolved.md references out-of-range PDF page {r}")

# 6. README.md and INVENTORY.md exist
for fname in ("README.md", "INVENTORY.md"):
    if not os.path.isfile(os.path.join(BASE, fname)):
        fail(f"{fname} missing")

# --- report ---
print(f"Checked {len(EXPECTED_PAGES)} expected pages (25-48).")
print(f"Pages found: {len(seen_pages)}")
print(f"Total input blocks across all pages: {len(all_block_refs)}")
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
