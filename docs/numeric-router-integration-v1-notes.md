# Numeric Router Integration v1 — Verification Notes

Base: main `998240255ef364a001561c53aeebf83291dff5d8`.

This branch ports the five Numeric Research Router implementation files from the prior branch onto current main and adds the Derived Numeric Root Traversal contract.

No DB DDL. No new table/store/graph. No UI wiring. No automatic persistence/canonical promotion/publication.

Expected golden traversal:
- `1820 -> sequence:pi -> 24653 -> Numeric Root lookup(24653)`
- `233 -> sequence:fibonacci -> 13 -> Numeric Root lookup(13)`
- `337 -> sequence:fibonacci -> NOT FOUND`, therefore no derived root.

Build/test status must be verified by repository CI or a checkout with dependencies; the GPT sandbox could not resolve github.com for a local clone.
