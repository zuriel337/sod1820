import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { build } from "vite";

const read = (p) => fs.readFileSync(p, "utf8");
const comp = read("src/components/IssueReport.jsx").replace(/\/\/.*$/gm, "");
const gateway = read("src/components/ContactGateway.jsx");
const frame = read("src/components/experience2029/SystemFrame2029.jsx");
const css = read("src/components/experience2029/systemFrame2029.css");

// One component: exactly one IssueReport implementation in src, and no second bug/support store.
const owners = execSync("grep -rl 'export default function IssueReport' src || true", { encoding: "utf8" }).trim().split("\n").filter(Boolean);
assert.deepEqual(owners, ["src/components/IssueReport.jsx"]);
const rivals = execSync("git ls-files src | grep -i -E 'bug.?report|support.?(form|widget|ticket)|feedback.?widget' || true", { encoding: "utf8" }).trim();
assert.equal(rivals, "", "no second bug/support component");

// SystemFrame reachability: the visible ! entry opens one gateway, which delegates to the canonical owners.
assert.match(frame, /import ContactGateway from "\.\.\/ContactGateway\.jsx"/);
assert.match(frame, /TRANSIENT\.ISSUE\)[\s\S]{0,900}<ContactGateway/);
assert.match(gateway, /import IssueReport from "\.\/IssueReport\.jsx"/);
assert.match(gateway, /import ReportHint from "\.\/ReportHint\.jsx"/);
assert.match(gateway, /sendContactMessage/);
assert.match(gateway, /classifyContactIntent/);
assert.match(gateway, /buildContactGatewayContext/);
assert.match(gateway, /initialText/);
assert.match(gateway, /learnStage/);
assert.match(gateway, /actionTried/);
assert.match(frame, /sod29-header-issue/);
assert.match(frame, /closeMobileNav\(false\); openIssueReport\(\)/);

// Emits only through the existing telemetry seam; no store/attachment/direct suggestions write
assert.match(comp, /import \{ track \} from "\.\.\/lib\/tracking\.js"/);
for (const forbidden of [/system_suggestions/, /supabase/i, /\.from\(/, /\.rpc\(/, /fetch\(/, /localStorage/, /type="file"/]) {
  assert.equal(forbidden.test(comp), false, `IssueReport must not use ${forbidden}`);
}
assert.equal(execSync("git diff --name-only origin/main -- src/lib/tracking.js", { encoding: "utf8" }).trim(), "", "tracking.js untouched");

// Semantic palette only
const colorRe = /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i;
assert.equal(colorRe.test(comp), false);
assert.equal(colorRe.test(gateway), false);
assert.equal(colorRe.test(css.slice(css.indexOf("IssueReport — semantic"))), false);

// Gateway preserves semantic separation: Message/Hint/Issue/Contact are routed, never flattened into research.
assert.match(gateway, /id: "issue"/);
assert.match(gateway, /id: "hint"/);
assert.match(gateway, /id: "idea"/);
assert.match(gateway, /id: "contact"/);
assert.equal(/research_contributions|Discourse|forum/i.test(gateway), false);

// Runtime: bundle with stubs, exercise builders + emission + anonymous availability
const dir = fs.mkdtempSync(path.join(process.cwd(), "node_modules", ".ir-test-"));
const calls = [];
globalThis.__irTrack = (...args) => calls.push(args);
const stub = {
  name: "stub",
  enforce: "pre",
  resolveId(id) {
    if (/lib\/tracking\.js$/.test(id)) return "\0stub-tracking";
    if (/lib\/AuthContext\.jsx$/.test(id)) return "\0stub-auth";
    return null;
  },
  load(id) {
    if (id === "\0stub-tracking") return "export const track = (...a) => globalThis.__irTrack(...a);";
    if (id === "\0stub-auth") return "export const useAuth = () => ({ user: null });";
    return null;
  },
};
await build({
  configFile: false,
  logLevel: "silent",
  plugins: [stub],
  esbuild: { jsx: "automatic" },
  build: { ssr: "src/components/IssueReport.jsx", outDir: dir, emptyOutDir: false, minify: false, rollupOptions: { output: { entryFileNames: "ir.mjs", format: "esm" } } },
});
const outfile = path.join(dir, "ir.mjs");
const m = await import(outfile);

assert.equal(m.ISSUE_REPORT_EVENT, "issue_report");
const ctx = m.buildIssueReportContext({
  pathname: "/number/358?email=a@b.c&token=x#frag",
  surface: "number<script>", capability: "number", concept: "method<script>", learnStage: "explain", actionTried: "open_number",
  locale: "he-IL", width: 390, signedIn: false,
  interactionId: "11111111-1111-4111-8111-111111111111", now: new Date("2026-09-29T00:00:00Z"),
});
assert.deepEqual(Object.keys(ctx).sort(), ["action_tried", "at", "auth", "capability", "concept", "interaction_id", "learn_stage", "locale", "path", "surface", "viewport"]);
assert.equal(ctx.path, "/number/358");
assert.equal(ctx.surface, "numberscript");
assert.equal(ctx.concept, "methodscript");
assert.equal(ctx.learn_stage, "explain");
assert.equal(ctx.action_tried, "open_number");
assert.equal(ctx.viewport, "phone");
assert.equal(ctx.auth, "anonymous");
assert.equal(m.buildIssueReportContext({ signedIn: true }).auth, "registered");
assert.equal(m.buildIssueReportContext({ signedIn: true, isAdmin: true }).auth, "admin");
assert.equal(m.buildIssueReportContext({ isAdmin: true }).auth, "admin");
assert.equal(m.viewportClass(800), "tablet");
assert.equal(m.viewportClass(1440), "desktop");

const long = "א".repeat(5000) + "\u0000";
const payload = m.emitIssueReport(ctx, long);
assert.equal(payload.message.length, m.ISSUE_REPORT_MAX_TEXT);
assert.equal(calls.length, 1);
assert.deepEqual(calls[0].slice(0, 3), ["issue_report", "numberscript", "issue_report"]);
assert.equal(calls[0][3].auth, "anonymous");
// Text is optional
const empty = m.emitIssueReport(ctx, "   ");
assert.equal("message" in empty, false);

fs.rmSync(dir, { recursive: true, force: true });
console.log("issue-report canonical emitter: ok");
