# EXP-15 — a live model reads Hebrew in a bounded region of an ELS matrix (fixed before any call)

**Direction (ZURIEL).** Check whether Claude can read Hebrew from a limited area of a matrix and propose interesting things, including things nobody thought of beforehand. First case: Columbia.
Give the model the general description "אסון מעבורת החלל קולומביה, שהתפרקה בדרכה חזרה לכדור הארץ, ואנשי צוותה נספו"; do not give it the words ספינת or יכלאש; do not limit it to the disaster.
Give a bounded region around the selected occurrence with clear borders, rows, columns and diagonals in both directions, letters and identities from the existing engine (the model computes no positions or skips),
and an instruction to look for correct Hebrew words and phrases, forms of the language and construct states, with segmentations that never change, add or omit letters. Add the option to continue from a found word:
the letters before and after it, crossings, the near surroundings. Verify every proposal with the canonical engine and show separately what it verified and what it could not; do not pre-filter by dictionary, rarity or a geometric score.
Report: which model ran, exactly what it received, what it proposed before verification, what was verified, whether it found the two words, time and actual cost, and anything left out because of a size limit.
Preliminary check, not proof of general quality. No change to the engine, product or DB/RLS; no Production; a live model only in an isolated test environment over a secure connection; if that is impossible, stop and report.

## What is sent (round 1)
* The region: Torah stream, width 4545, rows 34-66, columns 3315-3355 (33 x 41 = 1,353 cells), fetched from `public.torah_stream` with the canonical SQL, checksummed per row (md5) and compared cell by cell with the second copy of the text embedded in the page (0 differences).
  The selected occurrence is the 8 cells of column C21, rows R21-R28 (region coordinates). The region is cut by the +-20 limit on top, left and right; at the bottom the stream ends (row 66).
* The lines: every row (33), column (41), down-right diagonal (69) and down-left diagonal (69) of the region with at least 3 cells (212 lines; 8 corner lines shorter than 3 cells are omitted), each in both reading directions (424 readings).
  Nothing is cut for size: the exact token count is taken before the call and the run stops if it exceeds the guard (150,000 tokens) instead of truncating.
* A grid of the same region for crossings and neighbours, the story sentence verbatim, and the task text (`review/request-round1.txt` holds the exact message; `review/request-round1.json` the exact request; both carry the same SHA-256).
* No positions, skips or widths are shown to the model; it cites a line id with direction (e.g. `D17+`) and the contiguous text. The harness finds where the text sits and derives start, skip and direction.
* The task text allows and encourages: forms of the language, construct states and phrases, prefixes and suffixes, names; an interesting segmentation of a longer run (`parts`) that adds, omits or changes nothing; **continuing from a found word** (letters before and after on the same line, the other three lines through each of its cells, the near grid) as a separate proposal
  with `from_finding` and `kind` extension or crossing; and it says explicitly that the proposals are not limited to the story or to frequent or near-axis words and that filtering happens outside the conversation.

## The model and the call
* The model id is chosen by ZURIEL and is never assumed: the `preflight` stage lists the credential's models, retrieves the chosen one (context window, maximum output, capabilities: structured outputs, adaptive thinking, the effort level) and counts the exact input tokens with `count_tokens`; any failure stops the run.
  Default candidate (not verified until the preflight): `claude-opus-5-5`. A cheaper candidate is `claude-sonnet-5-5`.
* Parameters: adaptive thinking with `display: "summarized"`, `output_config.effort: "high"`, `max_tokens: 32000`, structured output through a JSON schema, streaming, no tools, no server-side fallback (a refusal is reported as it is), no sampling parameters.
* Optional round 2: neighbourhood cards built by the harness from the region for verified proposals marked `continue_from` (at most 12), appended as a new user turn with the model's own round-1 content unchanged. It is a separate request with its own SHA-256 and approval.
* Approval: the call stages send only with `--approve <SHA-256 of the reviewed request>` and `--max-usd` not below the upper bound computed from the exact token count (input at the cache-write rate plus `max_tokens` at the output rate).
* The credential is the experiment's own, read from `ELS_EXPERIMENT_ANTHROPIC_KEY`; without it every call stage stops with exit code 2 and nothing is built or sent. There is no mock path.

## Verification (the canonical engine)
For each proposal the harness locates the text in the cited line (or, if it is not there, in any other line, reported as such), derives start, skip and direction, and runs one read-only SELECT: (1) the letters of `public.torah_stream` at the claimed positions must equal the text;
(2) for skip >= 2 the canonical engine `public.els_search_page_core_v1(term, 'torah', skip, skip, 100)` must return an occurrence with the same start and direction; skip 1 (a plain text row) is verified as plain text only, not as ELS.
Whitespace and final letters are formatting; any other difference makes the proposal not verifiable. Nothing is filtered by dictionary, rarity or geometry: the verified and the not verified lists are both shown, with the reason for each failure.
The verification SQL was self-tested against the live engine with a positive control (the selected occurrence), a negative control (start moved by one) and a plain-text row (`review/verification-selftest.json`).

## Evaluation targets (last)
`evaluation/targets.json` holds the two words. Only the report stage reads it, after the answer is saved, and reports for each: where it sits in the region, and whether a proposal is exactly it, contains it, or overlaps it on the same line (verified or not).

## Not decided here
No pass/fail threshold: this is a first look. Proposals are interpretations; Human Gate stays with ZURIEL. Whatever the result, it is one case and one model.

## Amendment 1 (recorded after ZURIEL's approval to run and before the first call; the run record is in `results/`)
* **Model.** ZURIEL chose `claude-fable-5-1` ("the strongest"); the run stops if the preflight does not list it with structured outputs and adaptive thinking. It was listed (context window 1,000,000, maximum output 128,000; exact input count 20,774 tokens).
* **Credential.** No dedicated key existed. With ZURIEL's approval the site's existing Anthropic key was used through a temporary, request-locked pass-through edge function (`edge/`): one-time token, only the SHA-256 of the canonical JSON of the approved request parameters is accepted for a batch, model allow-list, no database, no logging. Every call is a one-request Message Batch (the platform's wall-clock limit is shorter than a long thinking call). The function was replaced by a 410 stub at the end.
* **Parameters.** Attempt 1 used the pre-registered parameters (effort `high`, `max_tokens` 32,000) and returned no answer (all output tokens were thinking, `stop_reason: max_tokens`). With ZURIEL's standing approval for further attempts (up to ten, other models allowed, up to USD 40), attempt 2 used effort `medium`, `max_tokens` 64,000, same model, same input text. It succeeded, so no other model was tried. Nothing else changed: same system text, message, schema and region.
* **Round 2** was run once on the six verified proposals that asked to continue (cap 12), as its own request with its own SHA-256 and lock.
* **Verification.** Where the engine's first page (100 hits) was truncated before the claimed start, the same engine function was asked for the keyset continuation just before that start; five proposals needed it and all were confirmed (recorded as such in the report).
* The pass/fail stance is unchanged: none. The evaluation targets were read only by the report stage.
