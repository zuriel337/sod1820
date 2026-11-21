import { execFileSync } from "node:child_process";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { BENNETT_REVIEW_MEDIA_2029 } from "../src/lib/research/bennettReviewMedia2029.js";
import { buildPublicReadingWorker, publicReadingBootstrap } from "../public-reading-deploy/transport.js";

const target = process.argv[2];
if (!target) throw new Error("Pass the separate private review checkout.");
const output = resolve(target, "dist");
const sourceSha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const document = await readFile("dist/2029.html", "utf8");
const entry = document.match(/<script\b[^>]*type="module"[^>]*src="([^"]+)"[^>]*><\/script>/);
if (!entry) throw new Error("Missing build entry");
const html = document.replace(entry[0], publicReadingBootstrap(entry[1], sourceSha))
  .replace("</head>", '<meta name="robots" content="noindex,nofollow,noarchive"></head>');

await cp("dist", output, { recursive: true });
const mediaDirectory = resolve(output, "media");
await mkdir(mediaDirectory, { recursive: true });
for (const asset of [BENNETT_REVIEW_MEDIA_2029.highlight.src, BENNETT_REVIEW_MEDIA_2029.highlight.poster]) {
  const filename = basename(asset);
  await cp(resolve(target, "media", filename), resolve(mediaDirectory, filename));
}
for (const path of ["", "world", "post/sharshar-elections-redemption-hints-draft", "post/bennett-melach-631-78"]) {
  await mkdir(resolve(output, path), { recursive: true });
  await writeFile(resolve(output, path, "index.html"), html);
}
await writeFile(resolve(output, "404.html"), html);
await rm(resolve(output, "2029.html"), { force: true });
await writeFile(resolve(output, "sw.js"), buildPublicReadingWorker(sourceSha, { integrationReview: true }));
await writeFile(resolve(output, "robots.txt"), "User-agent: *\nDisallow: /\n");
await writeFile(resolve(target, "SOURCE.md"), `# SOD1820 private review\n\nIntegration source commit: ${sourceSha}\n`);
