# Raziel content / simple Follow handoff — first bounded implementation

31 October 2026. Actor GPT. Passive delivery to ZURIEL only.

## Source, base and ownership

- Requested handoff: `work_log_current` **3196fb17-3ce1-4b41-a959-eeb193888d3c**,
  `RAZIEL_CONTENT_AUDIENCES_SIMPLE_FOLLOW_BRIEF_20261031`.
- Exact implementation base: `gpt/els-raziel-verified-followup-20261031`,
  **25177b717ed59deb0bab7bc7d306b5af7efd47ab**, verified against origin before writing.
- Isolated branch: `gpt/raziel-content-comparison-follow-handoff-20261031`.
- Source Posts handoff: `gpt/posts-integrated-backgrounds-20261030`,
  **015c0269c566804ae3d6933e96339a58f69afdb1**, also verified at origin.
  Its `posts-content-world-evidence-20261031.md` and companion overlap SQL were read.
  **No import/merge/cherry-pick of that branch.** The audience-overlap query was not rerun.
- Live main at check: `2195c9784c5c9f0b1ec3cd3c1137fbd76045845b`; not the base.
  Divergence from the implementation base was 480 / 8 commits. No reset to main.
- Read AGENTS, CLAUDE, owner index and current Raziel Companion v3 / Routing v2 /
  AI execution v2 owners; relevant Follow v21 and Person v6 clauses also checked.
- Bounded live ownership reads found no active overlapping writer on this slice.
  Earlier Raziel/session/server claims were reconciled against their AFTER releases,
  including `291b6598`, `9069d0c0`, `5c002306` and `2c290079`.
  Posts releases `c63dd140`, `3e58e3e9`, `6e1b2e11` do not authorize a global import.
  The broader World continuation remains out of scope.
- Final ownership recheck also found `24cd20ce-4b44-4383-856f-cc561dac85d7`, an
  independent active Follow-series release-acceptance task (disposable SQL/tests/docs
  only). None of its paths or release work was touched.
- The connection is the dedicated read-only Supabase connection (verified read-only
  transaction). **No BEFORE/AFTER row was written or invented.** This receipt is for
  the existing authorized coordinator; dispatch remains NULL, recipient ZURIEL.

## Proven failure and repair

Before the change, `מה ההבדל בין מימד חמש לאור הגאולה?` produced an
`expression_pair`, with `explicit_text_computation=true`, and the session sent both
names as calculation subjects. The same happened to unrelated series/channel names
and names containing a numeral. Conversely, the explicit wording
`מה ההבדל בגימטריה בין חכמה לבינה?` was not recognized.

The existing shared semantic gate now distinguishes a bounded explanatory comparison
from a calculation request. No content names, audience labels, weights or special
cases were added to production code. Explicit gematria modifiers are removed from
the subject slots, while the existing numeric-pair and relation grammars remain.
Explicit negation (`לא בגימטריה`, `בלי גימטריה`) is not calculation consent.

The existing conversation resolver does not let a classifier, an earlier numeric
turn, an unrelated surface, or a stale saved identity turn that explanation back
into arithmetic. A later general “deepen” stays conversational; a new explicit
calculation still works. The server repeats this classification from the question,
not from client authority. On the opted-in 2029 path it bypasses the Legacy
deterministic calculator and the numeric classifier for this intent. A forged/stale
calculation envelope still fails closed under the existing rejection guard.

One short instruction in the existing synthesis prompt distinguishes source / series /
channel / topic, Follow / inferred interest / recommendation, and unknown context.
It does **not** supply or invent content memberships, personal preferences, current
follow state, or consent. Public reading focus continues through the existing seam;
unrecognized private audience fields are not projected. There is no new reader,
Provider, chat, memory, graph, transport, subscription, notification or persistent
audience model. Legacy requests without the 2029 opt-in remain unchanged.

## What this does and does not complete

| Area | State / existing owner |
| --- | --- |
| Explanatory “difference between” routing | Implemented and tested in shared gate, session and real handler (fake external I/O). |
| Explicit gematria / numeric research | Existing canonical route preserved; no local calculator. |
| Public content focus | Existing bounded context consumed and tested; not proof that the model knows all editorial distinctions without source context. |
| Simple Follow | Existing `WatchButton` / `WatchControl2029` and Follow Center retained, not duplicated. Explicit acknowledgment, guest identity step and separate channel consent remain. |
| Posts classification/events/simple series Follow | Source branch above, **not imported**. Current base still has its earlier PostFollowBox; it must not be represented as the later Posts handoff. Inactive exact series targets cannot be silently replaced with category/publisher targets. |
| Private relevance | **Not implemented here.** Existing server personal reader uses caller JWT for `research_state_snapshot_v1` / `fn_research_path_resume_v1`; it does not currently compose the new content activity and explicit Follow signals. |
| Proactive recommendations / delivery | Not enabled. No new event producer, dispatcher, channel, weights or automatic subscription. |
| Live answer quality / release | Not checked with a live model. No Edge, Preview, main or Production deployment. Server change needs a separately authorized coordinated release. |

Audience-overlap totals from the handoff are measurement diagnostics, never a person's
preferences. Absence of measured activity is unknown, not disinterest. A public
`readingFocus` is not an authorized channel for a private profile. A later personal
consumer must preserve principal, provenance, time window, coverage and unknown/error
states; account changes/revocation must discard stale data before composition.

## Verification

- Nine focused contract/runtime tests cover explanatory and explicit calculation
  wordings, numeral-in-name, negation, stale conversation/classifier/envelope,
  public-focus projection and Legacy non-opt-in behavior. External I/O is synthetic.
- Before implementation, five of the initial six tests failed. The initial runtime
  test fixture was then corrected to use caller credentials for engine admission and
  the existing contract's actual fields (not an invented `related_expression` field).
- Broad Raziel/ELS/Follow non-browser regression: **743 tests, 733 pass, 10 fail,
  zero skips/cancellations** on final code.
  All ten failure titles reproduced exactly on clean base `25177b717` in six old
  source-assertion suites (Phase B/C/D/I/K/L); 91 base tests, 81 pass / 10 fail.
  No expected values or old source tests were weakened to conceal these failures.
- Built-app Browser, real global Provider: **320 and 1440 px**, navigation makes zero
  AI requests; each explicitly submitted comparison makes one intercepted request,
  with no calculation envelope; same chat and in-app navigation, no horizontal overflow.
  Fixed the new test's wait to await the rendered answer (Send is disabled for an empty
  input) and accept the transport's existing omission of null optional fields.
- Existing Follow Center Browser: **38 cases**, all pass, no page errors/unexpected
  requests/live writes. Includes 320/390/1440 × light/parchment/dark, account changes,
  delayed private reads/mutations, missing vs measured-empty state, guest boundaries
  and strict acknowledgments. Playwright printed a cancellation warning while closing
  a deliberately held route; the result has no failing cases.
- Both actual Legacy and 2029 builds pass, **no dependency stub**. Built dependency
  graph, lazy submit/resolver/plan gate, 2029 isolation, cheap hardening and Legacy
  Production lock pass. Eager JS gzip: 419,913 bytes; submit/resolver remains lazy.
  Existing chunk/dynamic-import warnings remain. `git diff --check` passes.
- No paid model call, real follow mutation, mail, push, event ingestion or private
  audience inspection was used for validation.

## Next bounded continuation

1. Integrate the later Posts source slice with this shared routing fix on the central
   approved HEAD, after another ownership/patch-equivalence check. Preserve both the
   exact series identity and this branch's ELS/Raziel work; do not merge an old branch wholesale.
2. Test explanations with the actual authorized Post/series/source context, including
   unknown or revoked source. This is distinct from routing and from live model quality.
3. Only then extend the **existing** authorized personal reader/consumer, after its
   source and permission contract is verified, to labeled explicit Follow and bounded
   activity signals. No private profile in public context, automatic opt-in, interest
   scoring or proactive alerts. Missing upstream capability is reported, not replaced
   by a new table/reader/Provider.

Status: IMPLEMENTED / TESTED on isolated branch; integration and live release remain open.
