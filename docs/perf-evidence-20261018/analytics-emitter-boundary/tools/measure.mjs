import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const beforeDir = process.env.BEFORE_DIST;
const afterDir = process.env.AFTER_DIST;
if (!beforeDir || !afterDir) throw new Error("BEFORE_DIST and AFTER_DIST are required");

const ROUTES = {
  Home: "src/pages/Home2029Page.jsx",
  World: "src/pages/World2029Page.jsx",
  Post: "src/pages/Post2029Page.jsx",
  Number: "src/pages/Number2029Page.jsx",
};

function load(dist) {
  return {
    dist,
    manifest: JSON.parse(fs.readFileSync(path.join(dist, ".vite/manifest.json"), "utf8")),
  };
}

function closure(build, roots) {
  const found = new Set();
  function visit(key) {
    if (found.has(key)) return;
    const entry = build.manifest[key];
    if (!entry) throw new Error(`Manifest key is missing: ${key}`);
    found.add(key);
    for (const imported of entry.imports || []) visit(imported);
  }
  for (const root of roots) visit(root);
  return found;
}

function bytes(build, keys) {
  let chunks = 0;
  let raw = 0;
  let gzip = 0;
  for (const key of keys) {
    const file = build.manifest[key].file;
    if (!file.endsWith(".js")) continue;
    const body = fs.readFileSync(path.join(build.dist, file));
    chunks += 1;
    raw += body.length;
    gzip += zlib.gzipSync(body, { level: 9 }).length;
  }
  return { chunks, raw, gzip };
}

function report(build) {
  const entryKeys = closure(build, ["2029.html"]);
  const result = { entry: bytes(build, entryKeys), routes: {} };
  for (const [name, key] of Object.entries(ROUTES)) {
    result.routes[name] = bytes(build, closure(build, ["2029.html", key]));
  }
  if (build.manifest["src/lib/analyticsEmitter2029.js"]) {
    const emitter = closure(build, ["src/lib/analyticsEmitter2029.js"]);
    const extra = new Set([...emitter].filter((key) => !entryKeys.has(key)));
    result.authorizedEmitterExtra = bytes(build, extra);
  }
  return result;
}

console.log(JSON.stringify({
  schema: "analytics-emitter-boundary-2029.v1",
  measurement: "production build manifest closures; JavaScript bytes only",
  timings: "NOT_MEASURED",
  before: report(load(beforeDir)),
  after: report(load(afterDir)),
}, null, 2));
