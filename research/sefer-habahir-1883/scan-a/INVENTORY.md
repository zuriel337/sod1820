# Artifact inventory

- `README.md` — scope, render protocol and fidelity contract.
- `manifest.json` — canonical source/render/truth contract.
- `coverage.json` — page-by-page coverage counts for PDF pages 1–24.
- `unresolved.md` — unresolved readings and global guardrails.
- `pages/P01_04.json` — structured Input/Extraction/Finding/Claim/Provenance for pages 1–4.
- `chunks/P05_08.json.gz`, `P09_12.json.gz`, `P13_16.json.gz`, `P17_20.json.gz`, `P21_24.json.gz` — losslessly gzip-compressed structured JSON for pages 5–24.
- `tests/validate_scan_a.py` — validates exact 1..24 coverage, required layers/provenance, and no out-of-scope pages.
- `docs/research-notes/SEFER_HABAHIR_1883_LOSSLESS_PAGE_REGISTER_P001_024_V2.json` — superseding status/register pointer; v1 remains historical provenance.

No Book node, canonical edge, Research Object, schema/RPC/UI, merge or deploy is part of this artifact set.
