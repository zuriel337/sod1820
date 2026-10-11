import test from "node:test";
import assert from "node:assert/strict";
import { post2029ReadingInternals as I } from "../src/lib/research/post2029ReadingProjection.js";

test("explicit old equality chains retain authored colors/text and expose every operand independently", () => {
  const source = '<h5>קרובים = <span style="color:#ffff00">358</span> = משיח<br>רחוקים = 364 = בני ברק</h5><p>358 = משיח</p>';
  const html = I.markLegacyEqualityLines(source);
  for (const term of ["קרובים", "358", "משיח", "רחוקים", "364", "בני ברק"]) assert.ok(html.includes(`data-gem="${term}"`));
  assert.equal(I.stripTags(html), I.stripTags(source));
  assert.match(html, /<span style="color:#ffff00"><button/);
  assert.doesNotMatch(html, /data-result|data-contextual-number-focus|verified/);
  assert.equal(I.markLegacyEqualityLines(html), html);
});

test("existing interactive annotations, media, code and ordinary narrative are not reinterpreted", () => {
  const source = '<a href="/number/358">קרובים = 358</a><button data-gem="משיח">משיח</button><img src="https://example.com/original.jpg" alt="קרובים = 358"><pre>קרובים = 358</pre><p>באותו יום היו 358 משתתפים</p><p>מספר הטיסה 1073</p>';
  assert.equal(I.markLegacyEqualityLines(source), source);
});
