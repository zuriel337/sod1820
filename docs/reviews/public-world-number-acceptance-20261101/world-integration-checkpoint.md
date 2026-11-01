# World integration checkpoint — hosted acceptance pending

Merged only the three-commit World delta ending at
`b2f18b366bc80628a5b83a7749a49f355caee0a9` into the saved Number branch.
Integration commit: `9f29cae891de64cfb6fefb86db46ec6c4721f5e5`.
Number, Community and the reviewed 248-finding manifest were not replaced.
The six Preview binding conflicts were resolved by the union of exact accepted
branch names plus this unified branch, without changing worker operations.

Subsequent bounded completion:

- The existing `writer_public_contributions_page_v1` is called with Supabase's
  `get: true`. The live read-only function inspection is retained in
  `reviewed-writer-read.json`: STABLE SQL SELECT, same public writer eligibility,
  same approved/published root records and existing limits. No RPC, role, worker
  exception or server/DB change was introduced.
- Writer Post inventory now carries source provenance to the existing public
  Post address adapter. Imported durable URLs remain unchanged; native posts
  use the approved `/post/slug` policy. No date-based migration is inferred.
- Pending/failed World search or writer reads no longer claim successful
  emptiness. Retry is tested against an intercepted outage, separately from
  actual public material checks.
- The existing source-scoped finding reader is connected for other public
  writers as well. Channel sources use the same bounded existing map assembly;
  an absent source cannot acquire a finding or a fabricated tree edge. Zvi's
  reviewed reader remains in place. Other supported source families reuse the
  existing generic public reader, without pretending a missing map action works.
- Number source presentation groups already-admitted findings by canonical
  source reference. Distinct findings and exact occurrence links remain
  accessible through the shared finding component. Same-number or similar-text
  sources are never merged.

Checks completed locally:

- World merge unit suite: 43 passed; later writer/map/source unit suite: 41
  passed (overlapping suites, not 84 distinct tests).
- World synthetic browser suite: 3 passed, including 320/390/1440 widths,
  writer filtering, identical wording with retained occurrences, private-row
  rejection, exact shared anchors, reader failure, pending state and retry.
- Actual public World browser: 4 passed at 390/1440. Zvi source
  `channel_updates:bc0aa8ce-30fc-4a22-b42d-113a456f5e58` opens to its real text,
  eligible findings and map; direct finding reload and Back/Forward preserve
  the exact source. Hashmal full text, word search, source Post reload, stored
  Topic → Number → return also passed. Writer RPC traffic was GET only.
- Actual public Post → existing Number tool → full page → exact source-region
  return: both widths passed. Home river → exact public gallery image → reload,
  Back/Forward: both widths passed. A loading-component replacement required a
  synchronous scroll in the test, followed by waiting on the real image.
- Existing Frame browser suite: all 38 passed, including passive/intentional
  context, protected roles, hidden Companion, shared Now feed, personal button
  geometry and theme/dock checks. Account/role cases are explicitly synthetic.
- Number suite after source grouping: all 14 passed. Canonical method values,
  exact returns, five-width geometry, enlarged prose, failures and stale
  navigation remain covered.
- Preview guard suites: 10 passed. The generated worker SHA-256 remains
  `989e1cc315d8b42ae1cc01c57f44bbe6cd2ff4b90b6eb4e9453090008d57f2fb`.
  Builder/One Tree, Legacy Production lock and diff whitespace checks passed.

One initial browser harness disposed its additional public GET context while
late reads were still in flight. That teardown failure was fixed by draining
only that handler's pending reads behind the unchanged independent barrier;
the four real World scenarios then passed. This is not a server permission fix.

Unthrottled timestamped layout diagnostics passed their reading actions; their
largest per-route measured sum was below 0.1 in that run. This does not close
the repeat/slow-network CLS concern. Final matched public-route timing, the
exact hosted Preview, safe GitHub gates, permanent evidence and the additive
Doc37 update remain pending. No whole-site or full Isolation acceptance is
claimed by this checkpoint. The historical source gaps remain documented
without invented links or global launch blocking.
