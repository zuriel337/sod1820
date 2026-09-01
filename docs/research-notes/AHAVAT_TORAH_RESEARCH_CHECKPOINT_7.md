# אהבת תורה — Research Ledger · Checkpoint 7

> **NON-CANONICAL RESEARCH WORKING NOTE.** Research preservation only. Not publication, canonical promotion, Research Object ingestion, DB write, or blanket corpus/engine verification.
>
> Source identity: `book:hebrewbooks:5635` — *אהבת תורה*, HebrewBooks #5635.
>
> Checkpoint 7 is additive and supersedes session context only. Checkpoints 1–6 remain historical provenance and are not deleted.

## 0. Why this checkpoint exists

Checkpoint 7 preserves a stable methodological closure reached after Checkpoint 6: the recurring `פעמים + תיבות` person/group tables can now be reconstructed in multiple clean examples as attributed expression counts rather than name-occurrence counts. This is a material upgrade from the prior `INFERENCE STRONG` speech-attribution hypothesis.

This checkpoint deliberately stops before the next question: whether these tables form one continuous Torah-wide dataset and how that dataset relates to the author's whole-Torah population of 79,976 words.

## 1. OCR correction — `מרים ואהרן`

Direct visual inspection of the relevant source table corrects an earlier OCR-derived reading.

Safe reading:

`מרים ואהרן — פעם אחד — ט׳ תיבות`

The earlier provisional `כ״ב תיבות` reading is rejected as OCR error.

The attributed utterance in Numbers 12 is:

`הרק אך במשה דבר ה׳ הלא גם בנו דבר`

This contains **9 words**, matching the source row.

Classification:

- source row: `VISUALLY VERIFIED`;
- textual word-count reconstruction: `TEXT COUNT / RECONSTRUCTED`;
- independent reproduction of the author's entire dataset: `NOT DONE`.

## 2. `בנות צלפחד` — second clean reconstruction

Direct visual inspection supports the row:

`בנות צלפחד — פעם אחר — ל״ו תיבות`

Their joint argument in Numbers 27:3–4, from `אבינו מת במדבר` through `בתוך אחי אבינו`, contains **36 words** under the straightforward word segmentation used in this local reconstruction.

This is a second independent clean case in which a joint attribution subject is preserved as one source category and the source's `תיבות` count matches the words in the attributed expression.

Classification:

- source row: `VISUALLY VERIFIED`;
- local text-count match: `RECONSTRUCTED`;
- universal counting contract across every row/category: not claimed.

## 3. `בת פרעה` — multi-expression reconstruction

The source table reads:

`בת פרעה — ה׳ פעמים — י״ט תיבות`

A local reconstruction of the attributed expressions in Exodus 2 yields five expression/calling units whose word masses sum to 19:

- `מילדי העברים זה` → 3;
- `לכי` → 1;
- `היליכי את הילד הזה והינקהו לי ואני אתן את שכרך` → 10;
- the naming/calling unit `משה` → 1;
- `כי מן המים משיתיהו` → 4.

Arithmetic: `3 + 1 + 10 + 1 + 4 = 19`.

This materially supports reading `פעמים` as attributed expression units rather than occurrences of the person's name.

Caution: the inclusion of a naming/calling unit shows that the method family should not be frozen as direct quoted speech only.

## 4. `נבח` — boundary/example warning

The same table includes a compact row equivalent to:

`נבח — פעם אחד — תיבה אחת`.

This supports a broader working category than only conventional quotation speech: a naming/calling expression can be counted as an attributed unit.

Therefore the prior candidate label `SPEECH ATTRIBUTION CORPUS` is now too narrow as the primary research label.

## 5. Method-family closure

### Working research name

**`ATTRIBUTED EXPRESSION CORPUS` — קורפוס ביטויים מיוחסים**

This is GPT research terminology, not claimed as the author's own terminology and not a production taxonomy authorization.

### Reconstructed local method

`TORAH TEXT`
→ `IDENTIFY ATTRIBUTED EXPRESSION / CALLING UNIT`
→ `ASSIGN ATTRIBUTION SUBJECT`
→ `COUNT source_metric_פעמים`
→ `COUNT ATTRIBUTED WORD MASS as source_metric_תיבות`
→ `AGGREGATE by PARASHA / BOOK / TORAH`
→ optional later numerical/conceptual comparison.

### Status upgrade

For the person/group attributed-expression layer:

`INFERENCE STRONG` → **`SOURCE-METHOD RECONSTRUCTED`**

This upgrade is justified by multiple independent local matches, including both single/multiple expression cases and joint participant configurations.

It does **not** mean:

- every row in every table has been reproduced;
- every use of `פעמים` in the entire book has the same semantics;
- categories such as `דבר ה׳` / `תורה` have already been proven to use precisely the same attribution contract;
- the full corpus has been independently reproduced.

## 6. Counting-contract semantics now safe enough to retain

For this reconstructed method family:

- `פעמים` is **not** a generic name/token occurrence count;
- it tracks attributed expression/calling units in the tested person/group cases;
- `תיבות` tracks the word mass inside those attributed units;
- `attribution_subject` may be an individual, group, or combined participant/speaker set;
- a combined source row must remain first-class and must not be automatically split into its members;
- source identity and expression attribution are separate from later numerical interpretation.

Preferred neutral research fields remain:

`attribution_subject`
`attribution_subject_type`
`source_metric_פעמים`
`source_metric_תיבות`
`expression_boundary`
`scope`
`provenance`
`verification_state`

## 7. Participant configuration strengthened

`מרים ואהרן` and `בנות צלפחד` strengthen the earlier Checkpoint-6 finding that the author's attribution subject is not restricted to a single person.

Working subject types:

`PERSON | GROUP | PARTICIPANT_CONFIGURATION`

The source's joint configuration is an observation in its own right. It is not automatically equivalent to summing separate individual rows.

This is important for future digital reconstruction because splitting a source-native combined row would destroy the author's own counting regime and provenance.

## 8. Research-machine implication

The book increasingly supports the reconstruction of a manual semantic/quantitative corpus workflow rather than a collection of isolated 1,820 coincidences.

Current high-level model:

`BUILD / COUNT TEXT CORPUS`
→ `ANNOTATE / DECOMPOSE SEMANTIC UNITS`
→ `ATTRIBUTE EXPRESSIONS TO SUBJECTS`
→ `AGGREGATE BY SCOPE`
→ `QUERY / COMBINE SUBPOPULATIONS`
→ `IDENTIFY NUMERICAL STRUCTURE`
→ `INTERPRET`.

This is a research inference about the author's workflow. It does not certify every count or interpretation in the book as correct.

## 9. Truth-state discipline

Continue to preserve:

`SOURCE CLAIM ≠ AUTHOR COUNT ≠ TEXT COUNT ≠ CALCULATION ≠ ARITHMETIC VERIFIED ≠ CORPUS VERIFIED ≠ ENGINE VERIFIED ≠ INTERPRETATION ≠ INFERENCE ≠ RECOMMENDATION ≠ DECISION ≠ CANONICAL`.

And for source handling:

`VISUALLY_VERIFIED ≠ SEARCH_HIT ≠ OCR_READING ≠ INFERRED_FROM_CHECKSUM`.

Specific correction provenance must remain visible:

`OCR כ״ב` → rejected after direct visual inspection → `ט׳`.

Do not erase the correction history.

## 10. What remains open

The next decision-changing questions are no longer "does the attribution method exist?" but:

1. Do the recurring person/group tables form one continuous Torah-wide attributed-expression dataset?
2. Is the whole-Torah **79,976-word** count the population denominator/frame from which these attributed sub-populations are drawn?
3. Are `דבר ה׳`, `תורה`, persons/groups and other categories instances of one general annotation contract or several related contracts presented in one table grammar?
4. How exactly are expression boundaries chosen in edge cases?
5. Does Claude's DS-06 / pp.70–71 extraction mechanically reproduce this same method family?
6. Can book-level/Torah-level subtotals be reconciled losslessly to the local parasha rows?

Do not spend the next pass merely accumulating redundant examples of already-reconstructed clean speech cases unless a new example challenges the boundary rules.

## 11. Coordination boundary

GPT scope: method reconstruction, interpretation, cross-connections, challenge, truth classification, prioritization.

Claude parallel scope: direct visual reconstruction, exact transcription, dataset completeness, page/row reconciliation, mechanical crosswalk and lossless dossier integration.

One Source = One Dossier. Do not create competing source identities or parallel truth stores.

No overlapping writes are authorized by this checkpoint.

## 12. Where we are / next action

**WHERE WE ARE:** the attributed person/group counting layer has moved from a strong hypothesis to a source-method reconstruction supported by multiple exact local matches.

**CLOSED:** clean semantics for the tested `פעמים + תיבות` attributed-expression cases; combined participant configurations; correction of the `מרים ואהרן` OCR error; working method family `ATTRIBUTED EXPRESSION CORPUS`.

**OPEN:** Torah-wide continuity, relation to 79,976, edge-case boundaries, cross-category contract, DS-06 equivalence, full mechanical reconciliation.

**BLOCKER:** none for continued read-only research. Mechanical closure of delegated datasets remains dependent on Claude's visual handoff.

**NEXT GPT ACTION:** test the dataset architecture rather than collect redundant examples — specifically whether local attribution tables aggregate into one Torah-wide dataset and whether 79,976 is its population frame/denominator.

**DO NOT DO NOW:** no schema, no new engine/store, no UI, no canonical promotion, no merge/deploy, no claim of full independent corpus verification.

Foundation → Projection → Experience.

Preserve capability, truth and provenance — not necessarily the legacy interface.
