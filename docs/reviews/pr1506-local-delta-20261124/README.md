# PR #1506 — local delta from Codex (24.11.2026)

`pr1506-local.patch` is the exact copy of work_log `8813b7f4-f62f-4f94-8d89-d02672ae3c2b` (md5 `108ad3c85abbd3c38c1fa1fe23558c6f`, 11,539 bytes).
It is a candidate, not a fix that passed CI.

- Base: PR #1506 head `96ad2e23c2aa6c0d4cab3a21fe9c364a5080732d`. `git apply --check` passes there; the resulting blobs are `fc752b20`, `149bf733` and `37ea03ab`, as the patch index lines say.
- On `origin/main` `c7fbf96cf8e1c0f8d79c268108dd4898f2f73710`: the yml and test hunks apply. The `systemFrame2029.css` hunk does not, because it depends on #1506's own CSS changes (`--s29-sidecar-width`), which are not in main. main has not changed that CSS since `2decd034`.
- Not merged, not deployed.
