#!/usr/bin/env bash
set -euo pipefail
# Performance evidence, auth-safe early reads and bounded Home data
node --test test/perf-execution-2029.test.mjs test/perf-replay-gate-2029.test.mjs test/early-primary-read-2029.test.mjs test/home-post-cards-2029.test.mjs
# Experience Context 2029 acceptance
npm run test:experience-context
# Entry Orientation + Contextual Learn 2029 acceptance
npm run test:entry-learn-2029
# Contact Gateway canonical owner acceptance
npm run test:issue-report
# My Workspace 2029 native home acceptance
npm run test:my-workspace-2029
# No Black Box operational trace acceptance
npm run test:operational-trace
# Web Vitals metric core acceptance
node scripts/test-web-vitals-2029.mjs
# Operational Trace Runtime persistence acceptance
npm run test:operational-trace-runtime
# AI-Analyze early paid paths trace coverage acceptance
node test/ai-analyze-early-trace-coverage.test.mjs
node scripts/test-ai-analyze-service-headers.mjs
node --test test/raziel-quota-trace.test.mjs

# Replayable Golden No-Black-Box acceptance
npm run test:replayable-golden
# Server capability execution gate acceptance
npm run test:server-capability-gate
# W2 public Number research runtime acceptance
npm run test:research-run
# Package W2 research-run Edge transport
npm run package:research-run
# 2029 server SEO / AI metadata parity
npm run test:2029-server-seo-ai
# Research Path resumability runtime acceptance
npm run test:research-path-resume
# Home 2029 System Pulse acceptance
npm run test:home-2029-pulse
# 2029 cheap route/test/least-privilege hardening
npm run test:2029-cheap-hardening
# Legacy Research containment + unopened Heichal entrypoint acceptance
npm run test:legacy-research-containment
# Source isolation regression
node scripts/test-2029-isolation.mjs
# G4 source-section update / World / Companion public-read acceptance
node --test src/lib/research/postSourceUpdates2029.test.js src/lib/research/worldDiscoveryStream.test.js src/lib/systemFeed2029.test.js src/lib/heroUpdate2029.test.js
# Native System Frame acceptance
node scripts/test-2029-system-frame.mjs
# Raziel server-gated Result Bundle consumer acceptance
node --test src/lib/research/razielServerGatedConsumer.currentMain.test.js
# Canonical 2029 contract wiring acceptance
node scripts/test-2029-canonical-contract-wiring.mjs
# Person identity bridge foundation acceptance
node test/person-identity-bridge-foundation.test.mjs
# Account Person completeness foundation acceptance
node test/account-person-completeness-foundation.test.mjs
# Person public resolver foundation acceptance
node test/person-public-resolver-foundation.test.mjs
# People identity projection acceptance
node test/people-identity-review-2029-contract.test.mjs
# Person Profile 2029 projection acceptance
node test/person-profile-2029-projection.test.mjs
# People Directory 2029 projection acceptance
node test/people-directory-2029-projection.test.mjs
# Native World surface acceptance
node scripts/test-2029-world-surface.mjs
# World Convergence PR591 focused acceptance
npm run test:world-convergence-pr591
# Native Topic surface acceptance
node scripts/test-2029-topic-surface.mjs
# Native Researcher corpus acceptance
node scripts/test-2029-researcher-corpus.mjs
# Native Number preview acceptance
node scripts/test-2029-number-preview.mjs
# Native 2029 Control Plane trace drill-down acceptance
node scripts/test-2029-control-plane.mjs
# A3 isolated client-to-stored-trace correlation acceptance
node scripts/test-a3-client-correlation-live.mjs
# Production build
npm run build
# Built dependency graph isolation
node scripts/test-2029-built-graph.mjs
# 2029 load-time budget (entry + primary route graphs, deferred code stays deferred)
npm run test:2029-bundle-budget
# Verify isolated HTML artifact
test -f dist/2029.html
! grep -q "site.webmanifest" dist/2029.html
! grep -q "/logo.png" dist/2029.html

node scripts/perf-execution-2029/measurement.test.mjs
node scripts/perf-execution-2029/measurement.browser.test.mjs
node test/ci-isolation/config.test.mjs
node test/ci-isolation/egress.test.mjs
node --test test/ci-isolation/udp-write.test.mjs test/ci-isolation/snapshot-contract.test.mjs
node --test test/ci-isolation/guest-reference.test.mjs
node --test test/ci-isolation/corpus-privacy.test.mjs
# Preserve the existing post-replay source-fidelity gates even when a missing
# snapshot blocks the separate replay step before it can reach its post-hook.
node --test src/lib/research/goldenPostContextPacks.test.js src/lib/research/nasrallahPost92Golden.test.js src/components/experience2029/mobileReadingImage2029.test.js
