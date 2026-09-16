// Compatibility entry for the earlier 6-test review command.
// The prior collection-coalescing implementation and tests remain in git at 1d02fe29.
// The completion uses ordered immutable batches instead of lossy coalescing and covers
// those same behaviors plus principal races, repeat delivery, conflict and recovery.
import '../src/lib/research/researchSyncRuntime.test.js';
