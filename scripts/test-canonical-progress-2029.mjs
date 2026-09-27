import assert from "node:assert/strict";
import fs from "node:fs";
import {
  CANONICAL_PROGRESS_TIMING,
  canonicalProgressPercent,
  canonicalProgressTier,
} from "../src/lib/canonicalProgressModel.js";

// Real progress only: explicit percent or real current/total.
assert.equal(canonicalProgressPercent({}), null);
assert.equal(canonicalProgressPercent({ progress: null }), null);
assert.equal(canonicalProgressPercent({ progress: "" }), null);
assert.equal(canonicalProgressPercent({ progress: 0 }), 0);
assert.equal(canonicalProgressPercent({ progress: 42.5 }), 42.5);
assert.equal(canonicalProgressPercent({ progress: 101 }), null);
assert.equal(canonicalProgressPercent({ current: 2, total: 4 }), 50);
assert.equal(canonicalProgressPercent({ current: 4, total: 2 }), null);
assert.equal(canonicalProgressPercent({ current: 1, total: 0 }), null);

// Timing changes presentation depth only; it never manufactures a percentage.
assert.equal(CANONICAL_PROGRESS_TIMING.explainAfterMs, 3000);
assert.equal(CANONICAL_PROGRESS_TIMING.engageAfterMs, 12000);
assert.equal(canonicalProgressTier({ elapsedMs: 0 }), "standard");
assert.equal(canonicalProgressTier({ elapsedMs: 3000 }), "explain");
assert.equal(canonicalProgressTier({ elapsedMs: 12000 }), "engage");
assert.equal(canonicalProgressTier({ elapsedMs: 1, expectedLong: true }), "engage");
assert.equal(canonicalProgressTier({ elapsedMs: 99999, expectedLong: true, compact: true }), "compact");
assert.equal(canonicalProgressPercent({}), null);

const component = fs.readFileSync("src/components/CanonicalProgress.jsx", "utf8");
const css = fs.readFileSync("src/components/canonicalProgress.css", "utf8");
const frame = fs.readFileSync("src/components/experience2029/SystemFrame2029.jsx", "utf8");
const books = fs.readFileSync("src/pages/Books2029Page.jsx", "utf8");
const heichal = fs.readFileSync("src/pages/Heichal2029Page.jsx", "utf8");
const els = fs.readFileSync("src/pages/Els2029Page.jsx", "utf8");
const design = fs.readFileSync("SOD1820_DESIGN_CONTRACT_V1.md", "utf8");
const migration = fs.readFileSync("supabase/migrations/20260919235300_g3_canonical_long_task_progress_v1.sql", "utf8");

assert.match(component, /aria-busy="true"/);
assert.match(component, /role="progressbar"/);
assert.match(component, /data-progress-kind/);
assert.match(component, /DEFAULT_CANONICAL_PROGRESS_COPY/);
assert.match(component, /copy = null/);
assert.match(component, /שלבי פעולה מדווחים · לא חשיבה פנימית/);
assert.match(component, /אין אחוז אמיתי לדווח/);
assert.match(component, /הקטן והמשך ברקע/);
assert.match(component, /בטל פעולה/);
assert.match(css, /prefers-reduced-motion:reduce/);
assert.match(css, /min-height:/);

assert.match(frame, /kind === "loading"/);
assert.match(frame, /<CanonicalProgress/);
assert.match(frame, /progress\?\.expectedLong/);

assert.match(books, /FrameState kind="loading"/);
assert.match(heichal, /phase: "מחבר את העוגן לנתוני המחקר"/);
assert.match(heichal, /engagement:/);
assert.match(els, /FrameState kind="loading"/);

assert.match(design, /## Long-running task feedback law/);
assert.match(design, /No fake percentage/i);
assert.match(design, /Operational stages ≠ model chain-of-thought/);
assert.match(design, /ELS \/ deep research \/ batch work requirement/);
assert.match(design, /Stable geometry is mandatory/);
assert.match(design, /localization-ready copy/i);

assert.match(migration, /canonical_ui_components_law/);
assert.match(migration, /rule_version=6|rule_version,\s*6|canonical_ui_components_law v6/i);
assert.match(migration, /CanonicalProgress/);
assert.match(migration, /NO FAKE ETA/);
assert.match(migration, /CLS-STABLE SLOT/);
assert.match(migration, /LOCALIZATION READY/);
assert.doesNotMatch(migration, /create\s+table/i);
assert.doesNotMatch(migration, /alter\s+table/i);
assert.doesNotMatch(migration, /rule_id\s*=\s*'canonical_progress/i);

console.log("G3 canonical long-task progress contract: PASS");
