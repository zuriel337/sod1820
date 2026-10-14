# Preserved PR1100 experiments · 14 October 2026

Exact baseline app `5dd4afaacd9ead2fef5ff43d4c1adec4e4a0ed75`; native-image source candidate `5c990b7d6da263dfa573bfce5e0d70d0a4c8a144`, integrated as `15af7aff` in PR1100. Positive canonical-trace test receipt correction `a23cdd9d`; automatic image guard `9009b245`. These existed locally before role A resumed.

Raw JSON is losslessly gzip-compressed; manifest includes original and compressed SHA256. Scripts and rejected patches remain readable. No API response bodies, credentials or temporary share tokens committed. Source worktree and a separate complete Git bundle/archive are preserved in private scratch.

## Accepted hosted image experiment

Seven cold browser samples per route, same Chromium141/Playwright1.56.1, 390×844/DPR2/CPU4/RTT150ms/download209715.2 B/s. Real anonymous read-only Supabase; fixtures never mixed with hosted measurements. Review toolbar excluded equally. REST-complete + primary-image completion. PostgreSQL/CDN cache and runner geography uncontrolled.

| Route | LCP median before→after ms (ranges) | READY before→after ms | REST incl.OPTIONS before→after |
|---|---|---|---|
| / | 5316→5212 ([5064, 5416]; [4948, 5396]) | 3869.0→3886.9 | 123→123 |
| /world | 5012→5076 ([4944, 5236]; [4904, 5260]) | 4943.1→4996.2 | 110→110 |
| /post/seventh-to-tenth-sefirot-2027 | 5128→4396 ([5072, 6788]; [4360, 4520]) | 3641.0→3750.5 | 13→13 |

Post LCP improvement14.27%; READY regresses109.5ms (~3%). Home/World timing difference not proven beyond noise. Original213687 bytes /1586×992; existing native768×480 rendition53538 bytes. Canonical image remains original in img.src and Lightbox; no crop. Gate16 cases +58 targeted tests passed locally; CI entrypoint emulation21 contexts+16 cases+36 tests passed; negative original-sized rendition fails64KiB budget. This is not remote CI or speed closure.

## Rejected / not adopted

- c100dd61 eager/high primary images: no robust gain; reverted.
- 367ab69a Lightbox demand: no robust gain; mobile cancellation interaction failed; reverted.
- 7c053670 Contact demand: no measured improvement; browser rejected-module caching defeated retry; excluded.
- 83ce2b07 desktop Companion demand: reduced static bytes, overlapping seven-sample timing ranges; excluded.
- d8414407 admitted Nasrallah compiler: local ~127ms READY, hosted ~47ms with zero in CI; excluded.
- Previous persistent-shell/global-prefetch experiments remain rejected.

Hosted attempts with incomplete REST or an initial HEAD completion-classification bug are retained as INVALID, not accepted. Only hosted-before-rest-complete.json and hosted-mobile-image.json comprise accepted image comparison. Replay data proves functional/parity properties, not native asset bandwidth.

## Boundaries and open gates

No merge/main/Legacy/production/DB/proxy/cache change. Post LCP4.396s still misses~3.6s. Actual clicks/back/revisit/scroll are role A next scope; historical pushState results are not click latency. Physical phone/Israel, signed-in real flow and controlled cold PostgreSQL remain open. Local9009b245 is checkpoint, not an exact final hosted preview.

Rollback accepted runtime via15af7aff; tests/guard via their independent commits. No savings from separate experiments are summed.
