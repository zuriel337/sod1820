import { createServer } from "node:http";
import { existsSync, statSync } from "node:fs";
import { createReadStream } from "node:fs";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createHybridRouteResolver, loadHybridRoutePolicy } from "./hybrid-preview-routing.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const defaultOutput = resolve(root, "hybrid-preview-dist");
const types = new Map([
  [".html", "text/html; charset=utf-8"], [".js", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"], [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"], [".png", "image/png"], [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"], [".webp", "image/webp"], [".woff2", "font/woff2"],
]);

export async function createHybridPreviewServer({ output = defaultOutput } = {}) {
  const policy = await loadHybridRoutePolicy();
  const route = createHybridRouteResolver(policy);
  const server = createServer((request, response) => {
    const url = new URL(request.url || "/", "http://127.0.0.1");
    let assetPath;
    try {
      assetPath = decodeURIComponent(url.pathname);
    } catch {
      response.writeHead(400).end("Bad path");
      return;
    }
    const candidate = resolve(output, `.${assetPath}`);
    const safeCandidate = candidate === output || candidate.startsWith(`${output}${sep}`);
    const directFile = safeCandidate && existsSync(candidate) && statSync(candidate).isFile();
    const resolution = directFile ? null : route(url.pathname);
    const file = directFile ? candidate : resolve(output, resolution.document);
    if (!file.startsWith(`${output}${sep}`) || !existsSync(file) || !statSync(file).isFile()) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Hybrid artifact missing");
      return;
    }
    response.writeHead(200, {
      "Content-Type": types.get(extname(file).toLowerCase()) || "application/octet-stream",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
      "X-SOD-Hybrid-Runtime": resolution?.runtime || "asset",
    });
    if (request.method === "HEAD") response.end();
    else createReadStream(file).pipe(response);
  });
  return { server, policy };
}

const invoked = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invoked) {
  if (!existsSync(resolve(defaultOutput, "hybrid-preview-build.json"))) {
    throw new Error("Run npm run build:hybrid-preview before starting the local Hybrid Preview");
  }
  const { server } = await createHybridPreviewServer();
  const portArg = process.argv.indexOf("--port");
  const port = portArg >= 0 ? Number(process.argv[portArg + 1]) : 4174;
  server.listen(port, "127.0.0.1", () => {
    console.log(`Hybrid Preview is local-only: http://127.0.0.1:${server.address().port}`);
  });
}
