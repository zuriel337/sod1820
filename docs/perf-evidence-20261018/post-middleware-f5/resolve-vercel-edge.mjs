// Node ESM resolve hook: lets the UNMODIFIED middleware-core.js import '@vercel/edge'
// when the repo has no node_modules (cloud review sandbox). VERCEL_EDGE_ENTRY must be
// the absolute path of an installed @vercel/edge dist/index.js. No-op when it is unset.
import { register } from "node:module";
import { pathToFileURL } from "node:url";
if (process.env.VERCEL_EDGE_ENTRY) {
  const entry = pathToFileURL(process.env.VERCEL_EDGE_ENTRY).href;
  const source = `export async function resolve(s, c, n) { return s === '@vercel/edge' ? { url: ${JSON.stringify(entry)}, shortCircuit: true } : n(s, c); }`;
  register("data:text/javascript," + encodeURIComponent(source));
}
