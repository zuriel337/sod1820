# [ZURIEL-DECISION] E1 · ELS → Findings-Atlas bridge (reuse cipher_link) — 2026-08-12

**Provenance:** RESEARCHED_BY=CLAUDE (method-layer audit) → PROPOSED_BY=CLAUDE → APPROVED_BY=ZURIEL (E1 only) → BUILT_BY=CLAUDE.

Reuse, not invention: `cipher_link` already existed as a `relation_type` (in `relation_evidence` + `method_semantics`). This bridge connects the existing ELS store (`els_records`) into the findings atlas without a new relation_type, table, or engine, and without unifying `els_records` into the atlas.

Live DB change (data — effective immediately, independent of deploy).

## What was written

```sql
-- (1) relation_evidence: one row per published els_record (moderation-passed only)
insert into relation_evidence (a_phrase, b_phrase, value, method, relation_type, status, engine_verified, note, source)
select er.search_term,
       'תורה · דילוג '||er.skip_distance||' · ספר '||coalesce(er.torah_book,'—'),
       er.skip_distance, 'ELS', 'cipher_link', 'confirmed', false,
       '…full provenance: slug·skip·torah_book·importance·els_status·source·author·positions·anchors…',
       'els_record:'||er.id::text
from els_records er
where er.status='published'
  and not exists (select 1 from relation_evidence re where re.source='els_record:'||er.id::text);

-- (2) edges: cipher_link ONLY where both a term-node and a skip-number-node already exist (no node invented)
insert into edges (from_node, to_node, relation_type, metadata)
select distinct nf.id, nn.id, 'cipher_link', jsonb_build_object('els_record',er.id,'term',er.search_term,'skip',er.skip_distance,'source','els-bridge')
from els_records er
join nodes nf on nf.label=er.search_term and nf.type in ('entity','word','phrase','number')
join nodes nn on nn.label=er.skip_distance::text and nn.type='number'
where er.status='published' and nf.id<>nn.id
  and not exists (select 1 from edges e where e.from_node=nf.id and e.to_node=nn.id and e.relation_type='cipher_link');
```

## Result (verified)

| metric | value |
|--------|-------|
| els_records published (bridged) | 36 |
| els_records hidden/draft (left out — moderation respected) | 42 / 3 |
| relation_evidence cipher_link total | 37 (36 bridged + 1 pre-existing manual) |
| `atlas_findings('cipher_link')` rows | 37 |
| cipher_link edges created | 3 (only where both nodes existed; 33 skipped, no node invented) |

Every bridged relation carries full provenance in `note` (term, skip, torah_book, importance, els_status, source, author, positions, anchors) and `source='els_record:<id>'` for traceability. `engine_verified=false` and the note states: *mechanical extraction (deterministic textual presence); meaning = interpretation, not prophecy. Fact ≠ Interpretation.*

## Held (not done)

- **N1 · Notarikon** — HOLD. No relation_type chosen (`hidden`/`revealed` rejected as semantically wrong; no new `notarikon` type minted). Notarikon stays engine-only until its semantics are defined (phrase → initials/finals → derived word → Tanach evidence).
- **Anagram / גת"ם** — stay engine-only (anagram_not_novel; no 3D engine). Not in the atlas.
- No `method_semantics` write; no new relation_type/table; no `els_records` change/unification.

work_log recorded on the live DB.
