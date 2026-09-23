import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");

const app = read("src/App.jsx");
const research = read("src/pages/ResearchPage.jsx");
const home = read("src/components/ResearchHome.jsx");
const frame = read("src/components/experience2029/SystemFrame2029.jsx");
const topic = read("src/pages/Topic2029Page.jsx");
const books = read("src/pages/Books2029Page.jsx");
const number = read("src/pages/Number2029Page.jsx");
const drawer = read("src/components/number2029/NumberDrawer2029.jsx");
const contextual = read("src/lib/research/contextualCapabilities.js");

assert.match(app, /<Locked flag="lock_research"><ResearchPage \/><\/Locked>/, "legacy /research must consume canonical registered-only site flag");
assert.match(research, /legacyPublicToolBlocked\s*=\s*!isAdmin\s*&&\s*!!tool\s*&&\s*tool\s*!==\s*"number"/, "registered non-admin users must be contained to Number");
assert.match(research, /\(isAdmin \|\| t\.id === "number"\)/, "legacy Research subnav must hide non-Number tools from registered users");
assert.match(home, /visibleBigIds\s*=\s*containedUser\s*\?\s*\["number", "els"\]/, "legacy landing must show Number plus closed ELS only");
assert.match(home, /דף המספר · פתוח/);
assert.match(home, /הצופן התנ״כי · סגור/);

for (const [name, source] of [
  ["SystemFrame2029", frame],
  ["Topic2029", topic],
  ["Books2029", books],
  ["Number2029", number],
  ["NumberDrawer2029", drawer],
]) {
  assert.equal(source.includes('to="/heichal"'), false, `${name} must not link to unopened Heichal 2029`);
  assert.equal(source.includes('navigate("/heichal")'), false, `${name} must not navigate to unopened Heichal 2029`);
  assert.equal(source.includes('go("/heichal"'), false, `${name} must not navigate to unopened Heichal 2029`);
  assert.equal(source.includes('go?.("/heichal"'), false, `${name} must not navigate to unopened Heichal 2029`);
}

assert.equal(frame.includes('{ to: "/heichal", label: "היכל"'), false, "2029 shell nav must not expose Heichal");
assert.equal(contextual.includes('label: "◇ העמק בהיכל"'), false, "context actions must not expose Heichal");
assert.equal(contextual.includes('deepenTool()'), false, "context tools must not generate Heichal deepen entries");

console.log("Legacy research containment + Heichal 2029 entrypoint cleanup: PASS");
