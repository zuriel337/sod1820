import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = p => readFileSync(new URL("../" + p, import.meta.url), "utf8");
const app = read("src/App2029.jsx");
const page = read("src/pages/ControlPlane2029Page.jsx");
const visits = read("src/lib/visits.js");
const workflow = read(".github/workflows/2029-isolation-gate.yml");
const vercel = JSON.parse(read("vercel.json"));
const frame = read("src/components/experience2029/SystemFrame2029.jsx");

assert.match(app, /ControlPlane2029Page/);
assert.match(app, /path="\/2029\/control"/);
assert.match(app, /pathname\.startsWith\("\/2029\/control"\).*return undefined/s,
  "internal Control Plane must not enter public product analytics");

assert.match(page, /useAuth\(\)/);
assert.match(page, /if \(!isAdmin\) return <Navigate replace to="\/2029" \/>/,
  "Control Plane must gate before rendering operational data");
assert.match(page, /getSystemHealth\(\)/);
assert.match(page, /getOperationalTraceList\(7, 100\)/);
assert.match(page, /getOperationalTrace\(selectedId\)/);
assert.match(page, /detail\.data\?\.rollup/);
assert.match(page, /detail\.data\?\.spans/);
assert.doesNotMatch(page, /\.from\(["']op_trace_/,
  "UI must consume canonical admin RPCs, not trace tables directly");

assert.match(visits, /rpc\("admin_op_trace_list_v1"/);
assert.match(visits, /rpc\("admin_op_trace_v1"/);
assert.match(visits, /Math\.max\(1, Math\.min\(Number\(days\).*90/s);
assert.match(visits, /Math\.max\(1, Math\.min\(Number\(limit\).*500/s);

assert.match(workflow, /Native 2029 Control Plane trace drill-down acceptance/);
const controlRewrite = (vercel.rewrites || []).filter(row => row.source === "/2029/control" && row.destination === "/2029.html");
assert.equal(controlRewrite.length, 1, "internal Control Plane must have one isolated 2029 document rewrite");
const controlHeaders = (vercel.headers || []).find(row => row.source === "/2029/control")?.headers || [];
assert.ok(controlHeaders.some(row => row.key === "X-Robots-Tag" && /noindex/.test(row.value)), "internal Control Plane must stay noindex");
assert.equal(frame.includes("/2029/control"), false, "internal Control Plane must not enter public 2029 navigation");
assert.doesNotMatch(page, /create table|create or replace function|new WebSocket|localStorage/,
  "Control Plane projection must not invent a store/runtime owner");

console.log("2029-control-plane-trace: PASS");
