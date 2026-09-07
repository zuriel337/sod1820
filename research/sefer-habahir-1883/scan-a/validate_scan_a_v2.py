#!/usr/bin/env python3
import json, sys, gzip
from pathlib import Path

root=Path(__file__).resolve().parent
with gzip.open(root/"SEFER_HABAHIR_1883_SCAN_A_PAGEWISE_V2.json.gz","rt",encoding="utf-8") as fh:
    data=json.load(fh)
cov=json.loads((root/"SEFER_HABAHIR_1883_SCAN_A_COVERAGE_V2.json").read_text(encoding="utf-8"))
pages=data["pages"]
nums=[p["pdf_page"] for p in pages]

errors=[]
if nums != list(range(1,25)): errors.append(f"page sequence != 1..24: {nums}")
if len(nums)!=len(set(nums)): errors.append("duplicate PDF page assignment")
if any(n<1 or n>24 for n in nums): errors.append("out-of-scope page present")
if data["scope"]["batching"] is not False: errors.append("batching must be false")
for p in pages:
    if p["source_ref"] != f"book:sefer-habahir-1883#p{p['pdf_page']}:page":
        errors.append(f"bad page source_ref p{p['pdf_page']}")
    if not p["render"].get("individual_page_render"):
        errors.append(f"page not individually rendered p{p['pdf_page']}")
    if p["render"].get("dpi") != 220:
        errors.append(f"base render dpi != 220 p{p['pdf_page']}")
    for b in p["blocks"]:
        if not b.get("source_ref","").startswith(f"book:sefer-habahir-1883#p{p['pdf_page']}:"):
            errors.append(f"block locator drift p{p['pdf_page']} {b.get('block_id')}")
        if b.get("exact") is True and "visual_cross_check" not in b:
            errors.append(f"exact block lacks visual cross-check p{p['pdf_page']} {b.get('block_id')}")
    if p["claims"]:
        errors.append(f"claim promotion found p{p['pdf_page']}")
if cov["pages_accounted"] != 24 or cov["gaps"] or cov["duplicates"]:
    errors.append("coverage summary failed")
if cov["canonical_promotions"] or cov["research_objects_written"] or cov["canonical_edges_written"]:
    errors.append("prohibited promotion/write count nonzero")
if cov["pages_25_48_touched_as_content"]:
    errors.append("second-half content touched")

if errors:
    print("FAIL")
    for e in errors: print("-",e)
    sys.exit(1)
print("PASS: 24/24 exact PDF page assignments; no gaps/duplicates; exact blocks carry visual cross-check provenance; no out-of-scope/canonical promotion.")
print(f"blocks={cov['blocks_total']} exact_blocks={cov['exact_blocks_total']} unresolved={cov['unresolved_total']}")
