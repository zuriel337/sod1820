// PREPARED FOR DECISION (ZURIEL 18.11.2026): the link handed to others carries no persistent device id and no tracking keys; identity kept.
import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";

// propagation.js reads Vite's import.meta.env through its imports; bundle it with an empty env, as other tests do.
const { outputFiles } = await build({ entryPoints: [fileURLToPath(new URL("../src/lib/propagation.js", import.meta.url))], bundle: true,
  format: "esm", platform: "browser", write: false, logLevel: "silent", define: { "import.meta.env": "{}" } });
const { taggedShareUrl } = await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString("base64")}`);

test("a shared link carries only src=<channel>: no rid, no tracking keys", () => {
  const out = new URL(taggedShareUrl("https://sod1820.co.il/post/x?rid=old&src=wa&utm_source=fb&utm_campaign=c&fbclid=F&gclid=G&via=v&sid=s&nlid=n", "copy"));
  assert.deepEqual([...out.searchParams.keys()], ["src"]);
  assert.equal(out.searchParams.get("src"), "copy");
  assert.ok(!out.toString().includes("rid="), "no persistent device id");
});

test("identity and context keys survive, and the anchor too", () => {
  const cases = [
    ["https://sod1820.co.il/post/x?unit=u7#u7", ["unit"]],
    ["https://sod1820.co.il/community/chat?thread=t&reply=r&path=p&utm_medium=x", ["thread", "reply", "path"]],
    ["https://sod1820.co.il/world?view=gallery&gallery=3&image=abc#gallery-source-abc", ["view", "gallery", "image"]],
    ["https://sod1820.co.il/gematria?q=%D7%A9%D7%9D&m=ragil&v=340", ["q", "m", "v"]],
    ["https://sod1820.co.il/?p=123", ["p"]],
  ];
  for (const [url, keys] of cases) {
    const out = new URL(taggedShareUrl(url, "whatsapp"));
    assert.deepEqual([...out.searchParams.keys()].filter((k) => k !== "src"), keys, url);
    assert.equal(out.searchParams.get("src"), "wa");
    assert.equal(out.hash, new URL(url).hash);
  }
});
