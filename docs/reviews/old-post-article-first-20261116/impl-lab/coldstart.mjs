// Cold start of the server article path in a FRESH process: module graph of the document handler, jsdom import, its window, the first
// article, then warm articles. Prints one JSON line. Usage: node coldstart.mjs <worktree> <rows.json>
const [root, rowsFile] = process.argv.slice(2);
const { readFileSync } = await import("node:fs");
const rows = JSON.parse(readFileSync(rowsFile, "utf8"));
const t0 = performance.now();
const handler = await import(root + "/public-reading-deploy/api/public-document.js");
const t1 = performance.now();
const af = await import(root + "/public-reading-deploy/api/article-first.js");
const t2 = performance.now();
await af.loadArticleFirstRenderer();
const t3 = performance.now();
const template = readFileSync(root + "/public-reading-deploy/.generated/2029.html", "utf8");
const { postArticleSourceKey2029 } = await import(root + "/src/lib/research/postArticlePipeline2029.js");
const timeOne = row => { const s = performance.now(); const out = af.withArticleFirst2029(template, { path: "/" + row.slug, status: 200, post: row, proven: { [String(row.id)]: postArticleSourceKey2029(row.content) } }); return { ms: performance.now() - s, state: out.state, bytes: out.html.length - template.length }; };
const first = timeOne(rows[0]);
const warm = [];
for (let i = 0; i < 5; i++) for (const row of rows) warm.push(timeOne(row).ms);
warm.sort((a, b) => a - b);
console.log(JSON.stringify({ handlerImportMs: Math.round(t1 - t0), articleModuleMs: Math.round(t2 - t1), jsdomLoadMs: Math.round(t3 - t2), firstArticleMs: Math.round(first.ms), firstState: first.state,
  warmMedianMs: Math.round(warm[Math.floor(warm.length / 2)] * 10) / 10, warmMaxMs: Math.round(warm.at(-1) * 10) / 10, addedBytes: first.bytes, rssMB: Math.round(process.memoryUsage().rss / 1e6) }));
