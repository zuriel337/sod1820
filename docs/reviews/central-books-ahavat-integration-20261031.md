# Central Books / Ahavat integration — 2026-10-31

- Integration base: `71e9cb9061870f5e8124b25eb33fd08a8a2ba5e4` (`gpt/elections-world-seed-integration-20261030`).
- Books source: `23e03e82a478bee55c6840252b7962ffe6ba5958` (`codex/ahavat-preview-open-20261031`).
- The source handoff's last five commits were not already patch-equivalent to the base. Their book reader, data, tests and source assets also depend on the earlier books history. The complete source is therefore integrated as a merge, with the existing central branch retained as first parent; there is no separate import of the prior books branch.
- The only merge conflicts were the dependency manifests. The existing `natalengine` 1.6.0 is retained and `pdfjs-dist` 6.4.299 plus its source lockfile entries are added. Shared lockfile entries were identical. No unrelated dependency upgrade was introduced.
- The books card uses the existing canonical singular `/book/${slug}` route and matches the central isolation guard. Ahavat Torah remains open for reading in the publication-review preview, without being represented as complete.
- The spatial contract at `b352aa399fb15cde22788ef5ec6a81b6bc940d6a` was already in the central base; no second import or claim of complete compliance is made here.
- The preparation projection was regenerated from the integrated checked-in assets; it did not change. Its percentages are preparation indicators, not verified research or completed editorial acceptance.
- No World, Post, SystemFrame, Legacy application, database, RLS, migration or Edge function was changed. No production deployment or merge to main was performed.

## Verification

- Book-related static tests: 455 passed, none skipped.
- 2029 build, built graph, isolation, cheap hardening, Legacy production lock, and integrated preview auth guard passed. Eager JS gzip was 420,781 bytes, 37,961 bytes below the existing ceiling; Raziel's submit adapter and Research Plan remain lazy.
- Legacy build passed.
- Local Chromium acceptance: 6/6 passed, none skipped. This includes the library, card → reader → 1,820, responsive study layouts, navigation to explanations, research context, keyboard, source PDF and compact view. The matrix includes all three themes and phone/desktop widths; tests served a local source PDF verified against the fixture's SHA-256, not the hosted deployment.
- The public language gate reports 2 passed and 1 failed: the existing SystemFrame command-label assertion. Both the assertion and SystemFrame are byte-identical to the central base; this remains an existing cross-surface issue and was not altered as part of Books.
- `git diff --cached --check` reports inherited trailing whitespace in three source documents and the upstream Liberation font licence, plus an extra final blank line in one source test fixture. The licence and historical documents have not been rewritten solely to silence the check.

## Remaining acceptance

Editorial and reader acceptance of the complete books, source coverage, and full spatial compliance remain separate work. A successful integration test or preparation percentage does not establish those claims. This branch is an integration candidate, not a production release.
