# WORLD_2029_LEGACY_PUBLIC_PARITY_V1 — public legacy content admission contract

Status: prepared on branch; NOT applied to Supabase or deployed.

## Authority
A row/asset demonstrably published on the existing SOD1820 site stays publicly readable in World 2029. This covers posts, galleries, images, topic cards, public gematria and their provenance/source links. A missing World relationship is not a reason to suppress an otherwise published item.

Personal/unpublished research, DMs, private WhatsApp submissions, drafts, person-only and owner-bound records are excluded unless independently proven to have been deliberately published. Do not infer publication from status=approved, canonical, public_candidate, author identity, or a matching number. RLS stays in force.

## Baseline (live read-only, 2026-10-12)
- posts: 1302; home_hidden=true: 25 (home visibility is not publication permission)
- gallery_images: 2561; published=1 AND curator_hidden=false: 2192
- gallery_images: published=2: 292; published=1 AND curator_hidden=true: 52; published NULL: 24; published=0: 1. Do not relabel these without checking the meaning of published=2 and curator intent.
- topic_cards: 215; approved=206; draft=3; merged=5; rejected=1.
- research_objects: 1901; private=1685; public_candidate=216; explicit public=0. The mere absence of public rows does NOT show how much legacy content is missing; it is a distinct dataset.
- Netanyahu title/name filtered: posts 15 (none home-hidden); gallery 49 (47 visible, 1 curator-hidden published, 1 unpublished); topic card 1 draft. This title matching is NOT a complete inventory of related artifacts.

## Required implementation sequence
1. READ-ONLY lineage join from legacy published post/gallery/topic records to their current world projections. Count distinct legacy public source IDs, distinct present World anchors and missing source IDs. De-duplicate by original source ID, not cross-surface appearances.
2. Verify the meaning of gallery published=2 and home_hidden, plus whether topic draft stems from a formerly public record before modifying any flag.
3. Restore missing routing/projection of published legacy sources via existing read adapters. Never bypass RLS, widen raw research_objects access, or copy unredacted private metadata into public views.
4. Test with anon session across Home, Posts, Gallery, Topic, World, Number and source context; ensure private draft/person-only are still denied.
5. Release only with counted pre/post evidence: eligible distinct legacy IDs, restored published IDs, remaining missing IDs, excluded private IDs, regression tests and deploy URL. Never report rows 'entered' without release evidence.

No DB or production change authorized by this document alone.
