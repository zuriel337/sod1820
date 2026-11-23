import test from "node:test";
import assert from "node:assert/strict";
import { getBookReaderManifest } from "../src/data/bookReader2029.js";
import {
  SIBONI_GATE50_SLUG, SIBONI_GATE50_SOURCE,
  SIBONI_GATE50_GATES, SIBONI_GATE50_APPENDICES,
} from "../src/data/siboniGate50Journey2029.js";

test("eight distinct source gates reuse the existing Book reader and exact PDF positions", () => {
  const manifest = getBookReaderManifest(SIBONI_GATE50_SLUG);
  assert.equal(SIBONI_GATE50_GATES.length, 8);
  assert.deepEqual(SIBONI_GATE50_GATES.map(g => g.from), [8, 16, 21, 28, 36, 53, 67, 78]);
  for (const gate of SIBONI_GATE50_GATES) {
    const readerChapter = manifest.chapters.find(c => c.id === gate.id);
    assert.ok(readerChapter, gate.id);
    assert.equal(gate.from, readerChapter.from);
    assert.equal(gate.to, readerChapter.to);
    assert.equal(gate.href, `/book/${SIBONI_GATE50_SLUG}?page=${gate.from}`);
  }
  assert.deepEqual(SIBONI_GATE50_APPENDICES.map(a => [a.from, a.to]), [[94,95],[96,97],[98,110]]);
  for (const appendix of SIBONI_GATE50_APPENDICES) {
    const readerChapter = manifest.chapters.find(c => c.id === appendix.id);
    assert.equal(readerChapter?.from, appendix.from);
    assert.equal(readerChapter?.to, appendix.to);
  }
});

test("all numeric links are authored motifs, not approved engine results", () => {
  for (const gate of SIBONI_GATE50_GATES) {
    for (const item of gate.numberLinks) {
      assert.match(item.href, /^\/number\/[1-9]\d*$/);
      assert.equal(item.verification, "authored_motif_not_engine_verified");
    }
  }
});

test("original PDF and source identity never drift from the second email", () => {
  const manifest = getBookReaderManifest(SIBONI_GATE50_SLUG);
  assert.equal(SIBONI_GATE50_SOURCE.emailSourceId, 113);
  assert.equal(SIBONI_GATE50_SOURCE.pdfUrl, manifest.pdfUrl);
  assert.equal(SIBONI_GATE50_SOURCE.pdfSha256, manifest.pdfSha256);
  assert.equal(SIBONI_GATE50_SOURCE.pdfPages, manifest.pdfPages);
  assert.equal(SIBONI_GATE50_SOURCE.pdfBytes, manifest.pdfBytes);
});
