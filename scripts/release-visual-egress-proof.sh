#!/usr/bin/env bash
# Proof that the Release Visual egress guard is default-deny and fails closed. Runs in the Release Visual job BEFORE the acceptance step
# and in the proof-only workflow (release-visual-egress-proof.yml). No live network: Chromium runs behind a local tripwire proxy, so nothing
# reaches Supabase or any third party even if the guard were broken. Needs @playwright/test (and its Chromium) installed in the repo root.
set -euo pipefail
cd "$(dirname "$0")/.."
node --test test/release-visual-egress-contract.test.mjs test/release-visual-egress-guard.test.mjs
node test/release-visual-egress-guard.browser.mjs
node test/release-visual-egress-hooks.integration.mjs
