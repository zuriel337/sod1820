import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
const root=path.resolve(process.env.SOD_POST_STYLE_DIST||"public-reading-deploy/dist");
const manifest=JSON.parse(fs.readFileSync(path.join(root,".vite/manifest.json"),"utf8"));
function stylesFor(key){const seen=new Set(),styles=new Set();function visit(k){if(seen.has(k))return;seen.add(k);const node=manifest[k];assert.ok(node,"missing build manifest entry "+k);for(const css of node.css||[])styles.add(css);for(const dep of node.imports||[])visit(dep)}visit(key);return [...styles].map(css=>fs.readFileSync(path.join(root,css),"utf8")).join("\n")}
for(const entry of ["src/pages/Post2029Page.jsx","src/pages/PublicContinuity2029Page.jsx"])
 test(entry+" includes the existing complete reading finish and responsive backdrop",()=>{const css=stylesFor(entry);assert.ok(css.includes("--pg-measure"),"reading finish was lost during CSS chunking");assert.ok(css.includes("--post-background-desktop"),"desktop backdrop was lost during CSS chunking");assert.ok(css.includes("--post-background-mobile"),"mobile backdrop was lost during CSS chunking");assert.ok([...css.matchAll(/\.sod29-reading-post\{([^}]+)\}/g)].some(m=>/(?:^|;)width:min\(1240px,/.test(m[1])),"bounded reading width is missing")});
for(const entry of ["2029.html","src/pages/Home2029Page.jsx"])
 test(entry+" does not eagerly acquire Post-specific styling",()=>{assert.ok(!stylesFor(entry).includes("--post-background-desktop"),"Post-only styling must wait for its reader")});
