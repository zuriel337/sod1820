import assert from "node:assert/strict";
import test from "node:test";
import { firstWordsHtml2029 } from "../public-reading-deploy/first-words.js";
import { publicReadingDocumentHandler } from "../public-reading-deploy/api/public-document.js";
import { buildWorldPublicPeopleIndex } from "../src/lib/research/worldPublicPeopleIndex.js";
import { publicPeopleSlice2029 } from "../src/lib/publicContinuityReaders2029.js";
import { automaticContributorSlug2029 } from "../src/lib/research/contributorProfileAddress2029.js";
import { writerFirstWorks2029 } from "../src/lib/research/writerFirstWorks2029.js";

test("the directory uses unique visible identities across pages, preserving numeric addresses and exact links", () => {
  const rows = Array.from({ length: 31 }, (_, i) => ({ id: String(i + 1), slug: "writer-" + i, display_name: "name " + i, active: true }));
  rows[0].code = "445";
  const { people } = buildWorldPublicPeopleIndex([...rows, rows[1], { ...rows[0], slug: "hidden", locked: true }]);
  const first = publicPeopleSlice2029(people, 1, ""), second = publicPeopleSlice2029(people, 2, "");
  assert.equal(first.visible.length, 20); assert.equal(second.visible.length, 11);
  assert.equal(new Set([...first.visible, ...second.visible].map(person => person.href)).size, 31);
  for (const [data, page] of [[first, 1], [second, 2]]) {
    const doc = firstWordsHtml2029({ kind: "writers", people: data.visible, page, hasMore: data.hasMore });
    assert.match(doc, /<h1>הכתבים והחוקרים<\/h1>/);
    assert.equal([...doc.matchAll(/href="\/community\/researcher\//g)].length, data.visible.length);
    assert.ok(doc.includes(page === 1 ? 'rel="next" href="/community/researchers?page=2"' : 'rel="prev" href="/community/researchers"'));
  }
  assert.ok(people.some(person => person.href === "/community/researcher/445"));
  assert.equal(publicPeopleSlice2029(people, 3, "").visible.length, 0);
});

test("the bounded writer excerpt uses stable addresses and distinguishes an upload from a writing", async () => {
  const reader = async (identity, { previewLimit }) => {
    assert.equal(previewLimit, 4);
    return { posts: { rows: [{ id: 1, title: "A & B", source: "sod1820", slug: "article", author: "Jane" }] },
      ciphers: { rows: [{ slug: "shared", title: "Shared", status: "published", visibility: "public", attributionBasis: "account_without_author_credit" },
        { slug: "secret", title: "Hidden", status: "draft", visibility: "private" }] } };
  };
  const works = await writerFirstWorks2029({ id: "1", slug: "writer", display_name: "Jane" }, { client: {}, reader, sourceReader: async () => [] });
  const doc = firstWordsHtml2029({ kind: "writer", name: "<Jane>", bio: "", works });
  assert.match(doc, /<h1>&lt;Jane&gt;<\/h1>/);
  assert.match(doc, /href="\/post\/article">A &amp; B/); assert.match(doc, /צופן שהועלה/);
  assert.doesNotMatch(doc, /Hidden|secret/);
  assert.match(doc, /href="\/community\/researchers"/);
  assert.ok(automaticContributorSlug2029("r-0000000000000000")); assert.ok(!automaticContributorSlug2029("r-real-writer"));
});

test("public response agrees on metadata, indexing directives, schema and the automatic slug even for numeric addresses", async () => {
  const shell = '<html><head><title>SOD</title></head><body><div id="root"><div><div><span class="sod29-opening-status" role="status">טוען</span></div></div></div></body></html>';
  const handler = publicReadingDocumentHandler({ authorized: () => true, indexable: () => true, readDocument: async () => shell });
  const original = globalThis.fetch;
  globalThis.fetch = async input => {
    const url = new URL(input);
    let rows = [];
    if (url.pathname.endsWith("/contributors") && url.searchParams.get("select")?.includes("bio")) {
      assert.ok(url.searchParams.get("or").includes("visibility.eq.public"));
      assert.equal(url.searchParams.get("active"),"eq.true"); assert.equal(url.searchParams.get("locked"),"not.is.true");
      const key=url.searchParams.get("slug") || url.searchParams.get("code");
      if (key !== "eq.missing") rows = [{ id:"abc", slug:key==="eq.532"?"r-1000000000000000":"regular", code:key==="eq.532"?"532":null, display_name:"Writer", bio:"Original prose." }];
    }
    if (url.pathname.endsWith("/contributors") && url.searchParams.get("select")?.includes("public_avatar") && !url.searchParams.get("select").includes("bio")) {
      rows = Array.from({length: 31}, (_, i) => ({ id: String(i + 1), slug: "writer-" + i, display_name: "Writer " + i, active: true }));
    }
    return new Response(JSON.stringify(rows), { headers: { "content-type": "application/json" } });
  };
  try {
    for (const [key, status, robots] of [["regular",200,"index, follow"],["532",200,"noindex, nofollow"],["missing",404,"noindex, nofollow, noarchive"]]) {
      const url = "/community/researcher/" + key;
      const res = { headers:{}, setHeader(k,v){this.headers[k.toLowerCase()]=v;}, status(v){this.code=v;return this;}, send(v){this.body=v;} };
      await handler({method:"GET",url,headers:{host:"sod1820.co.il"}},res);
      assert.equal(res.code,status);
      assert.equal(res.headers["x-robots-tag"],robots);
      assert.ok(res.body.includes('name="robots" content="'+robots+'"'));
      if (status===200) { assert.match(res.body,/<h1>Writer<\/h1>/);assert.ok(res.body.includes('rel="canonical" href="https://sod1820.co.il'+url+'"')); }
      if(key==="regular") assert.match(res.body,/"@type":"ProfilePage".*"mainEntity":\{"@type":"Person","name":"Writer"/);
      else assert.doesNotMatch(res.body,/"@type":"ProfilePage"/);
    }
    for (const path of ["/community/researchers?page=2", "/members?page=2", "/members", "/community/researchers?q=Writer"]) {
      const res = { headers:{}, setHeader(k,v){this.headers[k.toLowerCase()]=v;}, status(v){this.code=v;return this;}, send(v){this.body=v;} };
      await handler({ method:"GET", url:path, query:Object.fromEntries(new URL(path, "https://sod1820.co.il").searchParams), headers:{host:"sod1820.co.il"} }, res);
      const paginated = path.includes("page=2");
      const canonical = "https://sod1820.co.il/community/researchers" + (paginated ? "?page=2" : "");
      assert.equal(res.code,200);
      assert.ok(res.body.includes('rel="canonical" href="'+canonical+'"'),path);
      if (path.includes("?")) assert.equal(res.headers["x-robots-tag"],"noindex, follow");
      if (paginated) assert.match(res.body,/rel="prev" href="\/community\/researchers"/);
    }
  } finally { globalThis.fetch = original; }
});

test("a stalled optional catalogue yields the already available source and never holds the person's document", async () => {
  const controller = new AbortController();
  const stall = setTimeout(() => controller.abort(), 15);
  const source = { href: "/world?view=sources", label: "Published source" };
  try {
    const works = await writerFirstWorks2029({ id: "a", slug: "writer" }, { client: {}, signal: controller.signal,
      reader: async () => new Promise(() => {}), sourceReader: async () => [source] });
    assert.deepEqual(works, [source]);
    assert.match(firstWordsHtml2029({kind:"writer",name:"Known name",bio:"Published biography",works}), /Published biography/);
  } finally { clearTimeout(stall); }
});
