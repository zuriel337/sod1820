// Attribute the bytes an old-address Post loads before its text: entry graph, System Frame, and the Post page graph (static closures from the manifest),
// per original source module (source maps), with gzip per chunk. Usage: node attribute.cjs <dist dir>
const fs = require("fs"), path = require("path"), zlib = require("zlib");
const { SourceMapConsumer } = require("/home/user/sod1820/node_modules/source-map-js");
const dist = process.argv[2];
const manifest = JSON.parse(fs.readFileSync(path.join(dist, ".vite/manifest.json"), "utf8"));
const entryKey = Object.keys(manifest).find(k => manifest[k].isEntry);
const closure = (keys) => { const seen = new Set(), q = [...keys]; while (q.length) { const k = q.shift(); if (!k || seen.has(k) || !manifest[k]) continue; seen.add(k); q.push(...(manifest[k].imports || [])); } return seen; };
const keyOf = src => Object.keys(manifest).find(k => k === src);
const entry = closure([entryKey]);
const frameKey = Object.keys(manifest).find(k => manifest[k].name === "Sod2029Shell" && !manifest[k].isEntry);
const frame = new Set([...closure([frameKey])].filter(k => !entry.has(k)));
const addressKey = keyOf("src/pages/PublicPostAddress2029Page.jsx");
const postKey = keyOf("src/pages/Post2029Page.jsx");
const page = new Set([...closure([addressKey, postKey].filter(Boolean))].filter(k => !entry.has(k) && !frame.has(k)));
function perModule(keys) {
  const out = new Map(); let raw = 0, gz = 0, files = 0, css = 0;
  for (const k of keys) {
    const file = manifest[k].file; if (!file.endsWith(".js")) continue;
    const code = fs.readFileSync(path.join(dist, file)); files++; raw += code.length; const g = zlib.gzipSync(code, { level: 9 }).length; gz += g;
    for (const c of manifest[k].css || []) css += zlib.gzipSync(fs.readFileSync(path.join(dist, c)), { level: 9 }).length;
    const mapFile = path.join(dist, file + ".map"); if (!fs.existsSync(mapFile)) continue;
    const consumer = new SourceMapConsumer(JSON.parse(fs.readFileSync(mapFile, "utf8")));
    const lines = code.toString("utf8").split("\n"); const bytes = new Map();
    let prev = null;
    consumer.eachMapping(m => {
      if (prev) { const len = prev.line === m.generatedLine ? m.generatedColumn - prev.col : (lines[prev.line - 1]?.length || 0) - prev.col; if (prev.src && len > 0) bytes.set(prev.src, (bytes.get(prev.src) || 0) + len); }
      prev = { line: m.generatedLine, col: m.generatedColumn, src: m.source };
    });
    const total = [...bytes.values()].reduce((a, b) => a + b, 0) || 1;
    for (const [src, b] of bytes) { const s = src.replace(/^.*?(node_modules\/|src\/)/, "$1"); const e = out.get(s) || { raw: 0, gz: 0, chunk: file }; e.raw += b; e.gz += g * b / total; out.set(s, e); }
  }
  return { out, raw, gz, files, css };
}
const report = {};
for (const [name, keys] of [["entry", entry], ["frame", frame], ["postPage", page]]) {
  const { out, raw, gz, files, css } = perModule(keys);
  report[name] = { files, raw, gz: Math.round(gz), cssGz: css, modules: [...out.entries()].sort((a, b) => b[1].gz - a[1].gz).map(([m, v]) => ({ m, raw: v.raw, gz: Math.round(v.gz) })) };
}
fs.writeFileSync(process.argv[3] || "/dev/stdout", JSON.stringify(report, null, 1));
for (const name of Object.keys(report)) console.error(name, report[name].files, "files", report[name].raw, "raw", report[name].gz, "gz js", report[name].cssGz, "gz css");
