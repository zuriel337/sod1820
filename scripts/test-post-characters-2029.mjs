import assert from "node:assert/strict";
import { postCharacterFor, matrixOpeningFor, POST_CHARACTERS } from "../src/lib/postCharacters2029.js";

assert.equal(postCharacterFor({ slug: "koach-hashtika-dim5" }), POST_CHARACTERS.quiet);
assert.equal(postCharacterFor({ slug: "some-new-post-dim5" }), POST_CHARACTERS.quiet, "a new Dimension Five post needs no list edit");
assert.equal(postCharacterFor({ slug: "chibur-bein-hasafot-mafteach-lagan" }), POST_CHARACTERS.lexicon);
assert.equal(postCharacterFor({ slug: "x", content: '<div class="sgx sgx-step">' }), POST_CHARACTERS.lexicon);
assert.equal(postCharacterFor({ slug: "matrix-506" }), POST_CHARACTERS.matrix);
assert.equal(postCharacterFor({ slug: "bennett-melach-631-78" }), POST_CHARACTERS.plain, "master posts keep their own surface");
assert.equal(postCharacterFor(null), POST_CHARACTERS.plain);
assert.deepEqual(Object.keys(matrixOpeningFor({ slug: "matrix-506" })).sort(), ["color", "featured", "headColor"]);
assert.equal(matrixOpeningFor({ slug: "koach-hashtika-dim5" }), null);
console.log("post characters 2029: PASS");
