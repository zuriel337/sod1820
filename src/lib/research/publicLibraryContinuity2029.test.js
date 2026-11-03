import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  fetchPublicLibrary2029, fetchPublicLibraryItem2029, projectPublicCipher2029,
  projectPublicBook2029, publicLibraryQuery2029, publicLibraryMetadata2029, publicBookSourceAvailable2029,
} from "./publicLibraryContinuity2029.js";
import { publicBookReadingLocation2029, publicBookReadingHref2029 } from "./bookPublicReadingLocation2029.js";

const MEDIA = "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/gallery/cipher.png";
const cipher = changes => ({
  id: "c928d42b-7f29-40b1-8ea3-0f314628f529", slug: "published-cipher", title: "צופן שפורסם", search_term: "תורה", scope: "torah",
  status: "published", visibility: "public", source: "system", created_at: "2026-10-01T09:00:00Z",
  start_index: 100, skip_distance: 1820, direction: "fwd", corpus_id: "torah", image_url: MEDIA,
  author_name: "מערכת", description: "טקסט הפרסום", ...changes,
});
const book = changes => ({ id: "book-id", type: "book", label: "אהבת תורה", book_slug: "ahavat-torah", identity_key: "book:hebrewbooks:5635", is_active: true, ...changes });
const boundBook = changes => book({ source_ref_prefixes: ["book:hebrewbooks:5635", "hebrewbooks:5635"], identity_tiers: { digital_object: { mime: "application/pdf", bucket: "gallery", path: "Book/Hebrewbooks_org_5635.pdf" } }, ...changes });

test("public cipher query always requires canonical published/public and omits private/review payloads", () => {
  const list = publicLibraryQuery2029({ kind: "codes", q: ' תורה%,_(secret)" ', limit: 5000, offset: -1 });
  assert.deepEqual(list.eq, { status: "published", visibility: "public" });
  assert.equal(list.pageSize, 48); assert.equal(list.offset, 0);
  assert.equal(list.or[0], "source.is.null,source.neq.research");
  assert.ok(!list.or[1].includes("(secret)"));
  assert.doesNotMatch(list.select, /positions|engine_detail|owner_user_id|self_published/);
  const detail = publicLibraryQuery2029({ kind: "codes", slug: "published-cipher" });
  assert.equal(detail.eq.slug, "published-cipher");
  assert.equal(detail.limit, 2);
  assert.match(detail.select, /saved_shape:positions->>shapeUrl/);
  assert.doesNotMatch(detail.select, /engine_detail|owner_user_id|self_published/);
  assert.deepEqual(publicLibraryQuery2029({ collection: "research" }).eq, { status: "published", visibility: "public", source: "research" });
});

test("drafts, owner-only and self-published candidates never become public continuations", async () => {
  for (const invalid of [cipher({ status: "draft", self_published: true }), cipher({ status: "pending" }), cipher({ visibility: "private" }), cipher({ visibility: null }), cipher({ slug: "../private" })]) {
    assert.equal(projectPublicCipher2029(invalid), null);
    assert.equal(await fetchPublicLibraryItem2029("codes", "published-cipher", { readRows: async () => [invalid] }), null);
  }
  assert.equal(await fetchPublicLibraryItem2029("codes", "bad%2fslug", { readRows: () => { throw new Error("must not read"); } }), null);
});

test("one canonical record stays one source; annotations do not invent source counts or verification", () => {
  const projected = projectPublicCipher2029(cipher({
    saved_shape: MEDIA, saved_findings: [{ t: "תורה", verified: true }, { t: "תורה" }, { t: "אור", source_ref: "private" }],
    engine_detail: { verified: true, private_note: "hidden" }, owner_user_id: "hidden", positions: { quality: { verified: true, stars: 5 } },
  }), { detail: true });
  assert.equal(projected.sourceRef, "els_records:c928d42b-7f29-40b1-8ea3-0f314628f529");
  assert.deepEqual(projected.annotations, [{ term: "תורה" }, { term: "אור" }]);
  assert.equal(projected.matrixState, "saved_image");
  assert.deepEqual(projected.exactLocator, { corpusId: "torah", startIndex: 100, skip: 1820, direction: "fwd" });
  assert.doesNotMatch(JSON.stringify(projected), /private_note|verified|stars|owner_user_id|sourceCount|hidden/);
});

test("signed, private, expired-token and external media URLs are never used as saved source images", () => {
  for (const url of [MEDIA + "?token=expired", MEDIA.replace("/public/", "/sign/") + "?token=x", "https://elsewhere.example/cipher.png", "javascript:alert(1)", MEDIA + "#secret"]) {
    const projected = projectPublicCipher2029(cipher({ image_url: url, saved_shape: url }), { detail: true });
    assert.equal(projected.image, null); assert.equal(projected.matrixImage, null);
    assert.equal(projected.matrixState, "saved_matrix_image_unavailable");
  }
});

test("public list deduplicates exact identities and does not mix hidden research collection", async () => {
  const rows = [cipher(), cipher(), cipher({ id: "other", slug: "other", source: "research" })];
  const result = await fetchPublicLibrary2029({ kind: "codes", limit: 3, readRows: async () => rows });
  assert.equal(result.items.length, 1); assert.equal(result.nextOffset, 3); assert.equal(result.more, false);
  const research = await fetchPublicLibrary2029({ kind: "codes", collection: "research", readRows: async () => rows });
  assert.deepEqual(research.items.map(item => item.id), ["other"]);
});

test("missing, ambiguous and mismatched exact identities are not replaced with unrelated records", async () => {
  for (const rows of [[], [cipher(), cipher({ id: "duplicate" })], [cipher({ slug: "someone-else" })]]) {
    assert.equal(await fetchPublicLibraryItem2029("codes", "published-cipher", { readRows: async () => rows }), null);
  }
});

test("network/permission/malformed response failures remain failures; cancellation aborts stale results", async () => {
  for (const response of [() => { throw Object.assign(new Error("denied"), { code: "42501" }); }, async () => null]) {
    await assert.rejects(fetchPublicLibrary2029({ readRows: response }));
    await assert.rejects(fetchPublicLibraryItem2029("codes", "published-cipher", { readRows: response }));
  }
  const controller = new AbortController(); controller.abort();
  await assert.rejects(fetchPublicLibrary2029({ signal: controller.signal, readRows: () => { throw new Error("must not read"); } }), { name: "AbortError" });
  const later = new AbortController();
  await assert.rejects(fetchPublicLibraryItem2029("codes", "published-cipher", { signal: later.signal, readRows: async (_spec, { signal }) => {
    assert.equal(signal, later.signal); later.abort(); return [cipher()];
  } }), { name: "AbortError" });
});

test("book manifest alone cannot publish a source; only current anonymous public identity can be projected", () => {
  assert.equal(projectPublicBook2029(book({ is_active: false })), null);
  const projected = projectPublicBook2029(book());
  assert.equal(projected.readerState, "public_source_binding_unavailable");
  assert.equal(projected.manifest, null); assert.equal(projected.sourceRef, null);
  assert.doesNotMatch(JSON.stringify(projected), /Hebrewbooks_org|pdfUrl|source_ref_prefixes|identity_tiers/);
  const spec = publicLibraryQuery2029({ kind: "books", slug: "ahavat-torah" });
  assert.deepEqual(spec.eq, { type: "book", is_active: true, "metadata->>slug": "ahavat-torah" });
});

test("current public digital object must exactly match the existing reader and one source identity", () => {
  const projected = projectPublicBook2029(boundBook());
  assert.equal(projected.readerState, "source_bound");
  assert.equal(projected.sourceRef, "book:hebrewbooks:5635");
  assert.equal(projected.manifest.sourceIdentity, projected.sourceRef);
  assert.equal(projected.manifest.pdfRenderer, "controlled_page");
  assert.doesNotMatch(JSON.stringify(projected), /commentaryUrl|internalMapUrl|experience|reading_points|source_ref_prefixes|digital_object/);
  for (const invalid of [
    boundBook({ source_ref_prefixes: [] }), boundBook({ source_ref_prefixes: ["book:first", "book:other"] }),
    boundBook({ identity_tiers: { digital_object: { mime: "application/pdf", bucket: "private", path: "Book/Hebrewbooks_org_5635.pdf" } } }),
    boundBook({ identity_tiers: { digital_object: { mime: "application/pdf", url: projected.manifest.pdfUrl + "?token=expired" } } }),
    boundBook({ identity_tiers: { digital_object: { mime: "application/pdf", bucket: "gallery", path: "Book/../Hebrewbooks_org_5635.pdf" } } }),
    boundBook({ identity_tiers: { digital_object: { mime: "application/pdf", bucket: "gallery", path: "Book/Hebrewbooks_org_5635.pdf", sha256: "a".repeat(64) } } }),
  ]) {
    assert.equal(projectPublicBook2029(invalid).readerState, "public_source_binding_unavailable");
    assert.equal(projectPublicBook2029(invalid).manifest, null);
  }
});

test("public book opening checks current PDF availability after node admission and keeps failure distinct", async () => {
  let checked = 0;
  const options = { readRows: async () => [boundBook()], checkBookSource: async manifest => { checked += 1; assert.match(manifest.pdfUrl, /Hebrewbooks_org_5635/); return true; } };
  const ready = await fetchPublicLibraryItem2029("books", "ahavat-torah", options);
  assert.equal(ready.readerState, "ready"); assert.equal(checked, 1);
  const gone = await fetchPublicLibraryItem2029("books", "ahavat-torah", { ...options, readRows: async () => [] });
  assert.equal(gone, null); assert.equal(checked, 1);
  const unavailable = await fetchPublicLibraryItem2029("books", "ahavat-torah", { ...options, checkBookSource: async () => { throw new Error("file unavailable"); } });
  assert.equal(unavailable.readerState, "public_source_file_unavailable"); assert.equal(unavailable.manifest, null);
  const signal = new AbortController();
  await assert.rejects(fetchPublicLibraryItem2029("books", "ahavat-torah", { ...options, signal: signal.signal, checkBookSource: async () => { signal.abort(); return true; } }), { name: "AbortError" });
});

test("source-file check omits credentials, rejects redirect/HTML/error and never treats reachability as publication", async () => {
  const manifest = projectPublicBook2029(boundBook()).manifest;
  const source = async (type, ok = true, url = manifest.pdfUrl) => publicBookSourceAvailable2029(manifest, { fetchImpl: async (href, options) => {
    assert.equal(href, manifest.pdfUrl); assert.equal(options.method, "HEAD"); assert.equal(options.credentials, "omit"); assert.equal(options.cache, "no-store"); assert.equal(options.redirect, "error");
    return { ok, url, headers: new Headers({ "content-type": type }) };
  } });
  assert.equal(await source("application/pdf"), true);
  assert.equal(await source("text/html"), false);
  assert.equal(await source("application/pdf", false), false);
  assert.equal(await source("application/pdf", true, "https://elsewhere.example/file.pdf"), false);
});

test("external binding is preserved, but unfinished books stay closed without a source request or implied publication", async () => {
  const external = book({ book_slug: "bentov-brief-tour-higher-consciousness", source_ref_prefixes: ["book:bentov-brief-tour-higher-consciousness"],
    identity_tiers: { digital_object: { mime: "application/pdf", url: "https://avalonlibrary.net/ebooks/Itzhak%20Bentov%20-%20Brief%20Tour%20of%20Higher%20Consciousness.pdf" } } });
  const projected = projectPublicBook2029(external);
  assert.equal(projected.readerState, "source_bound");
  const currentFile = async () => ({ ok: true, url: projected.sourceHref, headers: new Headers({ "content-type": "application/pdf" }) });
  assert.equal(await publicBookSourceAvailable2029(projected.manifest, { fetchImpl: currentFile }), false);
  const item = await fetchPublicLibraryItem2029("books", external.book_slug, { readRows: async () => [external], checkBookSource: async () => assert.fail('closed book fetched source') });
  assert.equal(item.readerState, "preparation_closed");
  assert.equal(item.manifest,null);
  assert.equal(item.sourceHref, projected.sourceHref);
  assert.equal(publicLibraryMetadata2029({ kind: "books", item, detail: true }).noindex, true);
});

test("metadata stays generic/noindex until public admission and never promotes unlisted research", () => {
  const item = projectPublicCipher2029(cipher());
  assert.equal(publicLibraryMetadata2029({ item, detail: true, loading: true }).noindex, true);
  assert.notEqual(publicLibraryMetadata2029({ item, detail: true, loading: true }).title, item.title);
  assert.equal(publicLibraryMetadata2029({ item, detail: true }).noindex, false);
  assert.equal(publicLibraryMetadata2029({ item: { ...item, sourceCollection: "research" }, detail: true }).noindex, true);
  assert.equal(publicLibraryMetadata2029({ kind: "books", item: projectPublicBook2029(book()), detail: true }).noindex, true);
  assert.equal(publicLibraryMetadata2029({ detail: true, failed: true }).noindex, true);
});

const manifest = { pdfPages: 99, chapters: [{ id: "opening", from: 1, to: 8 }, { id: "letters", from: 35, to: 43 }] };
test("book page/chapter/hash locators are exact, with no page-1 fallback on invalid requests", () => {
  assert.deepEqual(publicBookReadingLocation2029(manifest, { search: "?chapter=letters&q=תורה", hash: "#kept" }), { page: 35, issue: null, q: "תורה", chapterId: "letters" });
  assert.equal(publicBookReadingLocation2029(manifest, { search: "?page=40&chapter=opening" }).page, 40);
  assert.equal(publicBookReadingLocation2029(manifest, { hash: "#p37:letters" }).page, 37);
  assert.equal(publicBookReadingLocation2029(manifest, { hash: "#pdf:42" }).page, 42);
  for (const search of ["?page=0", "?page=100", "?page=nope", "?page=3.5"]) assert.equal(publicBookReadingLocation2029(manifest, { search }).issue, "page_unavailable");
  assert.equal(publicBookReadingLocation2029(manifest, { search: "?chapter=unknown" }).issue, "chapter_unavailable");
  const href = publicBookReadingHref2029("https://sod1820.co.il/book/x?chapter=opening&q=תורה&source=post#kept", manifest, { page: 37 });
  const url = new URL(href, "https://sod1820.co.il");
  assert.equal(url.searchParams.get("chapter"), "letters"); assert.equal(url.searchParams.get("q"), "תורה");
  assert.equal(url.searchParams.get("source"), "post"); assert.equal(url.hash, "#kept");
  assert.equal(publicBookReadingHref2029(href, manifest, { page: 101 }), null);
});

test("public runtime never imports legacy engine UI or session readers; existing reader opts in without private research", async () => {
  const adapter = await readFile(new URL("./publicLibraryContinuity2029.js", import.meta.url), "utf8");
  const page = await readFile(new URL("../../pages/PublicLibraryContinuity2029Page.jsx", import.meta.url), "utf8");
  const source = await readFile(new URL("../../components/books2029/BookSourceReader2029.jsx", import.meta.url), "utf8");
  assert.match(adapter, /getPublicResearchClient\(\)\.from/);
  assert.doesNotMatch(adapter + page, /getSession\(|useAuth\(|fetchBookResearch\(|\.rpc\(|getDraftMatrices|TzofenEmbed|ElsNativeClassic2029/);
  assert.match(page, /BookSourceReader2029[^>]+publicReadOnly/);
  assert.match(source, /const commentaryUrl = publicReadOnly \? null/);
  assert.match(source, /!publicReadOnly && manifest\.experience/);
  assert.match(source, /window\.addEventListener\("popstate"/);
  assert.match(source, /abort\.abort\(\)/);
});
