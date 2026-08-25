# SOD1820 — Number 40 / מ׳ Research Corpus

Date: 2026-08-25
Actor: GPT / Research Agent 2
Branch: `gpt/research-number-40-mem`
Status: RESEARCH MEMO · NOT CANONICAL · NOT MERGED · NOT DEPLOYED

## Scope
Live scan of the 13 `posts` rows tagged `מ = 40 ת = 400`, spanning 2015-06-24 through 2026-03-29, anchored by wp_id 14796 (`סוד המ' והרמז # הקפצה`).

No new table/engine/tree was created. Durable research claims were written only to the existing `research_objects` store, status=`candidate`, privacy_scope=`private`. No `nodes`/`edges` promotion was performed.

## Verified engine facts
Using the canonical live function `fn_ragil`:
- מ = 40
- ולד = 40
- חלב = 40
- גזל = 40
- נשים = 400
- משכיל = 400
- חומר = 254
- חור = 214
- רוח = 214
- אמת = 441
- מת = 440

Derived verified relation: removing מ from `חומר` yields `חור`; the numeric delta is 40, and `חור = רוח = 214` in regular gematria.

## Corpus correction
The historical claim in wp_id 14796 that "the first מ in the Torah is in מים" is contradicted by the live canonical `torah_stream`: the first exact `מ` occurs at stream index 14, before `מים`. The original claim is preserved as provenance; the correction is stored separately as a FACT.

## Research layers
### FACT
Engine-computed values and the torah_stream correction only.

### CLAIM / OBSERVATION
The posts repeatedly associate 40 with:
- fetal formation / ולד
- Moses on Sinai
- Israel's wilderness period
- flood period
- lashes / purification
- age 40 / maturity
- Exodus / journeys

These are stored as source-text claims unless independently verified from primary sources.

### INTERPRETATION
Recurring interpretive motifs include:
- מ/40 as transition, maturation, purification or passage
- `משיח` read as `מ + שיח`
- sealed מ as concealment/womb/birth symbolism
- `א-מ-ת` as beginning/middle/end structure
- ת=400 as completion/end/repair

These remain hypotheses/interpretations, never Facts.

### CONVERGENCE
The strongest internal convergence is:
`מ / 40 → transition/birth → Torah/Moses → wilderness/flood/Exodus → material/spirit → sealed mem → Mashiach`

A second axis is:
`ת / 400 → end/completion → אמת / א-מ-ת → repair/reintegration`.

The corpus contains 13 tagged posts, but not all 13 contribute unique evidence. Frequency is treated as an internal convergence signal, not proof of truth.

## DB write outcome
14 new durable `research_objects` were inserted:
- all 14: `status='candidate'`
- all 14: `privacy_scope='private'`
- 5 carry `engine_verified=true` because they contain live engine/corpus verification
- remaining rows are explicit observations/hypotheses/convergences

No canonical/public promotion was performed.

## Next product use
This corpus is a test case for the approved Research Studio Number/Gematria Adapter + NumberHub path. The correct future behavior is to retrieve these objects contextually for Number 40 / מ / related entities, preserving FACT vs CLAIM vs INTERPRETATION and provenance. It should not create a separate "40 system" or a new UI-specific store.
