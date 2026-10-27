// Loads the PRODUCT's own language reader, unmodified, out of public/tzofen.html (the canonical engine page) so it can be measured.
// Nothing is re-implemented: the function bodies are cut out of the page by brace matching and evaluated in an isolated context that holds only the
// page globals they read (the embedded letters, the lexicon asset, a few constants). The page, src/ and the asset are READ ONLY here.
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import vm from "node:vm";

const FUNCTIONS = [
  "scopeN", "guidedDynamicLexiconSkeleton", "guidedMatrixDisplayTerm", "guidedMatrixBox", "guidedLanguageReadings", "guidedLanguageBoundaryScore",
  "guidedLanguageRelations", "guidedLanguageBoundaryHypotheses", "guidedMatrixLanguageInspection", "guidedDynamicLexiconAsset", "guidedLoadDynamicLexicon",
];
const sha256 = (text) => createHash("sha256").update(text, "utf8").digest("hex");

/** The source text of `function name(...) {...}` (or `async function`), found by brace matching. Syntax is checked by compiling it. */
export function cutFunction(html, name) {
  const plain = html.indexOf(`function ${name}(`);
  if (plain < 0) throw new Error(`function ${name} not found in the page`);
  const start = html.slice(Math.max(0, plain - 6), plain) === "async " ? plain - 6 : plain;
  const open = html.indexOf("{", plain);
  let depth = 0;
  let end = open;
  for (; end < html.length; end += 1) {
    const char = html[end];
    if (char === "{") depth += 1;
    else if (char === "}") { depth -= 1; if (depth === 0) break; }
  }
  const text = html.slice(start, end + 1);
  new vm.Script(text, { filename: `tzofen.html#${name}` }); // throws on a mismatch
  return text;
}

const cutStatement = (html, pattern, label) => {
  const match = pattern.exec(html);
  if (!match) throw new Error(`${label} not found in the page`);
  return match[0];
};

export function loadProductReader({ htmlPath, lexiconPath }) {
  const html = readFileSync(htmlPath, "utf8");
  const lexiconText = readFileSync(lexiconPath, "utf8");
  const data = /<script id="torah-data" type="text\/plain">([\s\S]*?)<\/script>/.exec(html);
  if (!data) throw new Error("embedded letters not found");
  const letters = gunzipSync(Buffer.from(data[1].trim(), "base64")).toString("utf8");
  const cuts = Object.fromEntries(FUNCTIONS.map((name) => [name, cutFunction(html, name)]));
  const statements = [
    cutStatement(html, /const FIN=\{[^}]*\};/, "FIN"),
    cutStatement(html, /const norm=s=>\{[^}]*\}[^;]*;/, "norm"),
    cutStatement(html, /const hitKey=h=>[^;]*;/, "hitKey"),
    cutStatement(html, /const GUIDED_MATRIX_DISCOVERY_CONTRACT=[^;]*;/, "contracts"),
    cutStatement(html, /GUIDED_DYNAMIC_LEXICON_ASSET="[^"]*",GUIDED_DYNAMIC_LEXICON_ASSET_SHA256="[0-9a-f]{64}",GUIDED_DYNAMIC_LEXICON_ASSET_BYTES=\d+;/, "asset constants").replace(/^/, "const "),
    cutStatement(html, /const TORAH_LANGUAGE_PROFILE=JSON\.parse\(atob\("[A-Za-z0-9+/=]+"\)\);/, "boundary profile"),
    "let _guidedDynamicLexiconPromise=null;",
  ];
  const torahN = Number(/const TORAH_N=(\d+);/.exec(html)?.[1]);
  const sandbox = {
    atob, TextEncoder, TextDecoder, URL, console, performance, crypto: globalThis.crypto,
    location: { href: "file:///tzofen.html" },
    inflate: async (b64) => gunzipSync(Buffer.from(String(b64 || "").trim(), "base64")).toString("utf8"),
    fetch: async () => ({ ok: true, text: async () => lexiconText }),
    st: { scope: "tanakh" }, T: letters, N: letters.length, TORAH_N: torahN,
  };
  const context = vm.createContext(sandbox);
  vm.runInContext([...statements, ...Object.values(cuts)].join("\n"), context, { filename: "tzofen-extract.js" });
  const evaluate = (code) => vm.runInContext(code, context);
  return Object.freeze({
    letters, torahLetters: torahN, streamLetters: letters.length,
    provenance: Object.freeze({
      page: { sha256: sha256(html), bytes: html.length }, lexiconAsset: { sha256: sha256(lexiconText.trim()), bytes: lexiconText.trim().length },
      functions: Object.fromEntries(Object.entries(cuts).map(([name, text]) => [name, sha256(text)])),
    }),
    setScope: (scope) => { context.st.scope = scope; },
    newMap: () => evaluate("new Map()"),
    loadLexicon: () => context.guidedLoadDynamicLexicon(),
    box: (axis) => context.guidedMatrixBox(axis),
    readSurface: (surface, hints, lexicon) => context.guidedLanguageReadings(surface, hints, lexicon),
    inspect: (axis, box, hints, lexicon) => context.guidedMatrixLanguageInspection(axis, box, hints, lexicon),
  });
}
