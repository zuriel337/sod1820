// Reviewed Post regions found by authored text only: the 787 block in post 5112 and image 30691 next to the
// "1202 מסתתר" text in post 233. HTML excerpts are real public content; nothing here edits a post.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { REVIEWED_POST_LOCATORS, REVIEWED_SOURCE_WITNESSES, postLocatorSpec, renderedLocatorOf, witnessSource } from './worldSourceConnections.js';
import { locatePostBlock, locateImageNearGuards, resolveRenderedLocator, locatorIdFromHash, sourceLocatorHash, guardKey, htmlBlocks } from './topicSourceContext.js';

const fixture = JSON.parse(fs.readFileSync(new URL('../../../test/fixtures/post-locators-5112-233.json', import.meta.url)));
const spec787 = postLocatorSpec('plane-787-year-joy');
const spec233 = postLocatorSpec('kotel-233-date-image');
const p5112 = fixture.post5112, p233 = fixture.post233;

test('787 block: one adjacent run of paragraphs, found without any marker, id or content edit', () => {
  assert.equal(spec787.postMarker, undefined);
  const found = locatePostBlock(p5112.content, { ...spec787.postBlock, guards: spec787.guards });
  assert.equal(found.count, 6);
  for (const quote of ['תשפ״ז = 787', 'ושמחת בחגך = 787', 'מי שגמלך כל טוב הוא יגמלך כל טוב סלה = 787', 'לחזור מתוך הודיה']) assert.ok(guardKey(found.text).includes(guardKey(quote)), quote);
  assert.ok(!found.text.includes('רמזים נוספים מן הסרטון'), 'the run stops at the block end');
});

test('787 block is rejected when adjacency, an expression or its value changes', () => {
  const g = { ...spec787.postBlock, guards: spec787.guards };
  const withFigure = p5112.content.replace('<p style="font-size:clamp(1.35rem,5vw,2.2rem);margin:5px 0;font-weight:850"><span class="sod-gemlink" data-gem="ושמחת', '<figure><img src="x.png"></figure><p style="margin:5px 0"><span class="sod-gemlink" data-gem="ושמחת');
  assert.equal(locatePostBlock(withFigure, g), null);
  assert.equal(locatePostBlock(p5112.content.replace('ושמחת בחגך</span> = <b class="sod-numlink" data-gem="787">787', 'ושמחת בחגך</span> = <b>788'), g), null);
  assert.equal(locatePostBlock(p5112.content.replace('לחזור מתוך הודיה', 'לחזור'), g), null);
  assert.equal(locatePostBlock(p5112.content, { ...g, maxBlocks: 3 }), null);
  assert.equal(locatePostBlock('<p>תשפ״ז = 787</p>', g), null);
});

test('witnessSource opens the 787 block with a rendered-region route, and never for drafts or hidden posts', () => {
  const source = witnessSource(spec787, { post: p5112 });
  assert.equal(source.sourceRef, 'posts:5112#block:plane-787-year-joy');
  assert.equal(source.routePrecision, 'post_region_resolved_in_rendered_html');
  assert.equal(source.href, `/post/${p5112.slug}#source-locator-plane-787-year-joy`);
  assert.equal(source.block.count, 6);
  for (const patch of [{ tags: ['טיוטה'] }, { source: 'gpt-draft' }, { home_hidden: true }, { id: 5113 }]) assert.equal(witnessSource(spec787, { post: { ...p5112, ...patch } }), null);
});

test('233 image-only locator needs no postMarker, paragraph or heading', () => {
  assert.equal(spec233.postMarker, undefined); assert.equal(spec233.postParagraph, undefined); assert.equal(spec233.postHeading, undefined);
  const source = witnessSource(spec233, { post: p233 });
  assert.ok(source, 'the previous route returned null for an image spec without a marker');
  assert.equal(source.sourceRef, `posts:233#image:${p233.imageUrl}`);
  assert.equal(source.routePrecision, 'post_region_resolved_in_rendered_html');
  assert.equal(source.href, `/post/${encodeURIComponent(p233.slug)}#source-locator-kotel-233-date-image`);
  assert.equal(source.item.postPlacement.dateBasis, 'posts.date_publication_not_event_date');
  assert.equal(source.item.postPlacement.adjacency.distance, 2);
  assert.ok(source.text.includes('1202 מסתתר'));
});

test('233 requires the 1202 text NEXT to the image, not merely somewhere in the post', () => {
  const far = p233.content.replace('<span style="color: #ff0000;">1202</span> מסתתר!!!', 'הערה').concat('<p>1202 מסתתר</p>');
  assert.equal(witnessSource(spec233, { post: { ...p233, content: far } }), null);
  const farBefore = '<p>1202 מסתתר</p><p>א</p><p>ב</p><p>ג</p>' + p233.content.replace('<span style="color: #ff0000;">1202</span> מסתתר!!!', 'הערה');
  assert.equal(witnessSource(spec233, { post: { ...p233, content: farBefore } }), null);
  assert.equal(witnessSource(spec233, { post: { ...p233, content: p233.content.replace('data-attachment-id="30691"', 'data-attachment-id="1"') } }), null);
  assert.equal(witnessSource(spec233, { post: { ...p233, content: p233.content.replace(p233.imageUrl, 'https://example.test/other.jpg') } }), null);
  assert.equal(witnessSource(spec233, { post: { ...p233, tags: ['פורום'] } }), null);
  assert.equal(locateImageNearGuards(p233.content, { imageUrl: p233.imageUrl, guards: ['1202 מסתתר'], radius: 1 }), null);
});

test('reviewed locators are not World directions, so the World reading and existing witnesses are untouched', () => {
  const ids = new Set(REVIEWED_SOURCE_WITNESSES.map((w) => w.id));
  for (const spec of REVIEWED_POST_LOCATORS) { assert.ok(!ids.has(spec.id)); assert.equal(spec.direction, undefined); }
  assert.equal(witnessSource(REVIEWED_SOURCE_WITNESSES.find((w) => w.id === 'flight-descent'), { post: { id: 5112, slug: 'plane', tags: [], source: 'ai', content: '<p>טיסת Flydubai ירדה ביותר מ־14,000 רגל.</p>' } }).sourceRef, 'posts:5112#quote-flight-descent');
});

// Minimal DOM double: the resolver only needs textContent, querySelectorAll, getAttribute and parentElement.
const el = (tag, text, { src = null, parent = null } = {}) => {
  const node = { tag, textContent: text, parentElement: parent, imgs: src ? [{ getAttribute: () => src }] : [] };
  node.querySelectorAll = (q) => (q === 'img' ? node.imgs : []);
  node.querySelector = (q) => (q === 'img' ? node.imgs[0] || null : null);
  return node;
};
const rootOf = (nodes) => ({ querySelectorAll: () => nodes });
const domOf = (html) => rootOf(htmlBlocks(html).map((b) => el(b.tag, b.text.replace(/\s+/g, ' '), { src: b.images[0] })));

test('rendered resolver applies the same rule to the DOM and lands on the first block or the image', () => {
  const block = resolveRenderedLocator(domOf(p5112.content), renderedLocatorOf(spec787));
  assert.equal(block.elements.length, 6);
  assert.ok(block.element.textContent.includes('רמזי תשפ״ז'));
  const image = resolveRenderedLocator(domOf(p233.content), renderedLocatorOf(spec233));
  assert.equal(image.element.getAttribute('src'), p233.imageUrl);
  assert.equal(resolveRenderedLocator(domOf(p5112.content.replace('לחזור מתוך הודיה', 'x')), renderedLocatorOf(spec787)), null);
  assert.equal(resolveRenderedLocator(domOf(p233.content.replace('1202', '1203')), renderedLocatorOf(spec233)), null);
  assert.equal(resolveRenderedLocator(null, renderedLocatorOf(spec787)), null);
});

test('only an exact #source-locator-<id> hash names a reviewed region', () => {
  assert.equal(locatorIdFromHash(sourceLocatorHash('plane-787-year-joy')), 'plane-787-year-joy');
  assert.equal(locatorIdFromHash('#source-locator-'), null);
  assert.equal(locatorIdFromHash('#topic-source-abc'), null);
  assert.equal(locatorIdFromHash('#source-locator-a b'), null);
  assert.equal(locatorIdFromHash('%E0%A4%A'), null);
});
