# Elections source chain — working inventory

Status: branch-only research mapping; public access and graph relations require their existing
owners' checks. Source statements, calculations, derivations and interpretation remain distinct.
The two main cycles in scope are Israel Knesset 21 (2019) and Knesset 26 (2026).

| Source / moment | Source statement | Research chain | Next check |
|---|---|---|---|
| Gallery `5e84ac5a-736c-4b7c-9b8c-963aa4d5da11`, OCR | Around 1,400 votes missing for Bennett in 2019; 4,500 at an earlier count | 1,400 → 14 by zero-scale; David = 14; preserve the separately calculated 1,454 gap | Check image and its public-access boundary; preserve OCR and attribution |
| Official Knesset 21 results | 4,309,270 valid votes; New Right 138,598 | 3.25% threshold rounds up to 140,052; difference 1,454; 1,454 → 454 under leading-thousand rule is a candidate | Recheck canonical inputs and rule receipt before graph attachment |
| Gallery `2ab69212-a407-4d33-9afd-65b6a9e66f1e` | 2021 news screenshot: 450,000 envelopes; accompanying interpretation recalls 2019 and 45 | Keep the 2021 report and the author's retrospective interpretation separate | Verify original image, attribution and access |
| Gallery `466ae014-9677-4c8c-b69f-3600042ddc16`, OCR | 2021 reporting that Bennett needed to pass Saar by 14,000 votes | 14,000 → 14 by zero-scale; distinct from the 2019 1,400 statement | Confirm original screenshot and time; do not treat as a final result |
| Gallery `e207986b-3159-4f46-bf5a-c0a32fe313e6`, OCR | Poll: 14% and 45% | David = 14 and redemption = 45 are separately attributed numeric research | Verify source and preserve poll context |
| Post 5107 | Election 26 research includes 631, 1820, 271, 2701, 1000 and others | Bennett, Winter, elections and king-of-Israel values retained as named claims/calculations | Recheck each method and its exact source locus before promotion |
| Post 5098 | Winter, Amcha Israel, 631 and 1820 research | Named authorial interpretation and numeric calculations | Preserve method, source and access independently |
| Post 5113 | Bennett and salt, 78 and 631 | 2029-only Human Gate approval; source retains legacy draft marker | Verify 2029 deployment/reader and legacy guest denial before claiming live |
| ynet report 28 October 2026 | Sharshar 1,456 votes at a reported 70% count | 1,456 → 456 leading-thousand rule; פרצוף = 456 | Add later reports as separate snapshots, never overwrite this marker |
| Post 5126 | Rabbi Yosef Biton interpretation; presenter mentions Trump | Potential future bridge to US elections | Source attribution and primary corroboration remain separate; not a result |

The live `בחירות` entity had three directly observed `related` edges: Israel, kingship and
Netanyahu. The branch seed's additional relations are proposed candidates, not live graph edges.
Gallery records inspected were marked `space=lab`; this alone does not determine availability.
An anonymous check on 28 October confirmed that all six meet the 2029 media reader's explicit
`published=1`, `min_tier=0`, non-hidden and image-URL criteria. Post 5101 remains a hidden draft.
This list is scoped, not an exhaustive corpus audit.

## Source-by-source review — 28 October 2026

Six gallery image files were retrieved and visually inspected against the current gallery records.
The displayed text, the gallery description and the image's original news source are separate
evidence layers. The following is a bounded mapping, not a full-corpus search. The access labels in
the table record the initial inspection; the later anonymous 2029-reader check below resolves them
for all six exact rows.

| Gallery image | What is actually visible | Attribution and date | Existing graph state / access |
|---|---|---|---|
| `5e84ac5a-736c-4b7c-9b8c-963aa4d5da11` | 2019 election interpretation: 4,500 initially, 1,400 after envelopes; `נפתלי בנט הימין החדש = 1237 מסתתר` | Image has no visible author in the cropped file; gallery description is null. Storage path is 2022, which is not the 2019 event date. | Image node `8c620b26-4030-4cb9-8e6f-18931dd9c092` has `contains` and `mentions` edges to 1237. `space=lab`, `published=1`; public reader authorization unverified. |
| `2ab69212-a407-4d33-9afd-65b6a9e66f1e` | Screenshot headline predicts about 450,000 double envelopes on 23 March 2021; another headline cites a car price of 4.5 million. The screenshot itself does not state 1,400 or 4,500. | Gallery description begins `מאת עמיחי` and separately interprets the headlines and recalls 2019; do not attribute all source headlines to him. | Image node `cf6017f4-001e-488f-a257-ccae238e0b84` has `contains` and `mentions` edges to 14, whose source is not the headline itself. `space=lab`; public reader authorization unverified. |
| `466ae014-9677-4c8c-b69f-3600042ddc16` | Screenshot quotes Amit Segal: Bennett would need to pass Saar by 14,000 votes; post displays 14:59 on 24 March 2021. | News snapshot, not a final result. Gallery description relates it to 14 and to a previous election. | Image node `71d17976-865e-4c37-b4ad-73763df6fa78` has `contains` and `mentions` edges to 14; do not confuse those with a directly documented edge to 14,000. `space=lab`; public reader authorization unverified. |
| `e207986b-3159-4f46-bf5a-c0a32fe313e6` | Poll: 14% regard Bennett as suitable for PM; 45% satisfied and 45% dissatisfied with the government, 10% undecided. | Gallery update dated 14 July 2021; the gallery description separately interprets 14 and 45. The screenshot is not an election result. | Image node `44e54877-eeac-4a6c-841d-d0bf56087751` has a `contains` edge to 14. `space=lab`; public reader authorization unverified. |
| `01d17f7e-6ee8-41ce-9d6a-7c6f8352ce11` | WhatsApp screenshot: a headline about the 14th floor; a separate message reads `נפתלי בנט - מפתח לגאולה = 1234 רגיל` and adds `התשפב = 2021`. | The gallery description begins `מאת עמיחי`; the visible screenshot contains multiple messages and should not transfer authorship between them. | Image node `ee5cbd85-a772-461b-9463-ea328673474c` exists; its exact edges were not exhaustively checked. `space=lab`; public reader authorization unverified. |
| `5c913e47-a840-41fb-8acf-60e6252ce9e0` | Knesset 21 seat list shows Likud 35, Blue and White 35, Shas 8 and United Torah Judaism 8. | Gallery update dated 1 May 2019 interprets the pairing as 358 twice. That combination is an attributed reading over separately displayed numbers, not a printed standalone result of 358. | Gallery identity exists; no graph image node found by the exact `gallery_image_id` query. `space=lab`; public reader authorization unverified. |

### Canonical calculation checks

On 28 October 2026 the public canonical `fn_method_value` returned the following exact results;
these are individual method calculations, not verification of the entire source or interpretation:

| Method | Expression | Result |
|---|---|---:|
| רגיל | דוד | 14 |
| רגיל | גאולה | 45 |
| רגיל | אליהו | 52 |
| רגיל | חותם | 454 |
| רגיל | פרצוף | 456 |
| רגיל | תמי | 450 |
| רגיל | נפתלי בנט | 631 |
| רגיל | עופר וינטר | 631 |
| רגיל | הבחירות | 631 |
| רגיל | מלך ישראל | 631 |
| רגיל | שרשר | 1000 |
| מילוי | עופר וינטר | 1820 |
| מסתתר | נפתלי בנט הימין החדש | 1237 |

The public `fn_zero_scale` v1 returned root 14 for both 1,400 and 14,000, with the scale chain
`14, 140, 1400, 14000, 140000`. The active `shitat_haechad_alef_law` and `zero_scale_law` are
both rule version 1. A rule application is a derivation, not a source statement or equality.

The user also supplied a separate screenshot dated 28 October 2026 at 01:20, attributed in the
screenshot to Channel 14, claiming that approximately 14,000 results had been published after
three hours out of over 5.6 million voters. This is a separate 2026 reported milestone from the
2021 Bennett/Saar 14,000 headline. Its underlying report and exact publication time were not
independently verified here; retain the screenshot, attribution and quoted wording, and do not
turn the count or allegation of a failure into a verified fact or final election result.

The official Knesset 21 page was re-read and displays 4,309,270 valid votes and 138,598 for New
Right. The 140,052 threshold and 1,454 difference are calculations over these inputs, not literal
quoted values from that page. The ynet report still contains 1,456 for Sharshar at the 70% count;
its earlier snapshot remains meaningful even if later totals differ.

### Existing live connections and release boundary

- The `בחירות` entity has three observed `related` edges: מלכות, ישראל, נתניהו.
- Post node `792eb8d4-4945-4428-8220-2503e1d74c42` (5107) has `documents` edges derived from
  post tags to 26, 45, 66, 271, 450, 631, 789, 1000, 1111, 1789, 1820 and 2701. Tag edges record
  source association; they do not verify each calculation.
- Post node `fe15d4fb-386a-4505-a359-27f4ca7605d6` (5113) has `documents` edges from tags to 78,
  133, 631, 690, 756 and 836. Its source still has the legacy draft tag; separate 2029-only
  approval was implemented on this work branch.
- A 2026 election-day event node exists (`5e036b45-ec02-4c4b-9e5e-36e847838ef2`) with explicit
  contributor attribution to ציון סיבוני. Its presence does not establish an unchecked edge to
  the election root.
- **Access reconciliation, 28 October:** the six exact gallery rows were independently queried
  with the anonymous client using the existing 2029 media reader's `published=1`, `min_tier=0`
  and non-hidden filters. All six returned with image URLs. The reader does not exclude `lab`
  solely on the basis of `space`. This resolves the earlier public-reader eligibility concern
  for these six exact images, not their automatic inclusion in a specific World/Topic: relevant
  source identity, documented relation and bounded reader requirements still apply. No database
  flags were changed. Other hidden, restricted or different-publication-state rows were not
  opened by this check.
- **Version gap:** seed calculations carry `canonical-gematria-live-shape`, not an actual recorded
  engine/method version receipt. The live checks above corroborate values at this moment, but the
  seed must not be promoted as a complete replayable engine attestation until version provenance
  is supplied by the canonical owner.
- Additional 2026 posts 5111 (הרב לוי סודרי) and 5126 (הרב יוסף ביטון, with the presenter's
  mention of Trump) are identified for later source review; no election outcome follows from their
  attributed interpretations. The proposed World connector is deliberately not implemented here.
