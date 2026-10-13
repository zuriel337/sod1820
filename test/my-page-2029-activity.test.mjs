import test from "node:test";
import assert from "node:assert/strict";

test("personal activity adds legacy chat only for the two exact confirmed accounts", async () => {
  const requests = [];
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    requests.push(new URL(String(input)));
    return new Response("[]", { status: 200, headers: { "content-type": "application/json", "content-range": "*/0" } });
  };
  try {
    const { fetchMyActivity2029 } = await import("../src/lib/userCenter/myActivity2029.js");
    await fetchMyActivity2029("36f5cb84-71c3-4977-a2c7-d6413e973443", { filter: "chat" });
    await fetchMyActivity2029("b6ce542a-2b07-4749-8aba-532c886f6de7", { filter: "contribution", offset: 30 });
    await fetchMyActivity2029("11111111-1111-4111-8111-111111111111");

    const sod = requests[0].searchParams.get("or");
    const yosi = requests[1].searchParams.get("or");
    const other = requests[2].searchParams.get("or");
    assert.match(sod, /author_contributor_id\.eq\.4cd9c034-0464-4600-a35d-7156f0584d9b,origin\.eq\.openweb,status\.eq\.approved/);
    assert.match(yosi, /author_contributor_id\.eq\.19936860-6b35-4386-bc44-113289858ff0,origin\.eq\.openweb,status\.eq\.approved/);
    assert.doesNotMatch(other, /author_contributor_id/);
    assert.equal(requests[0].searchParams.get("origin"), "in.(openweb,community_2029)");
    assert.equal(requests[1].searchParams.get("origin"), 'not.in.("openweb","community_2029")');
    assert.equal(requests[1].searchParams.get("offset"), "30");
  } finally {
    globalThis.fetch = previousFetch;
  }
});
