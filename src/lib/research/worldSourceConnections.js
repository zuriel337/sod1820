// Bounded read-time projection of the reviewed source locators in work_log 0584504f.
// These are witness annotations, not cards keyed by Post slug, tags, a method registry,
// publication decisions or stored graph edges. Every source is admitted and guarded again.
import { fetchGallerySourceContext, fetchPublicWorldPostSource, fetchTopicSourceContext, fetchMethodRegistry } from './entityHubProjection.js';
import { fetchNumberSystemMethods } from './numberSystemMethods.js';
import { fetchGematriaMethodTrace } from './gematriaTrace.js';
import { numberExpressionFocusHref } from './numberExpressionFocus.js';
import { INDIA_CAPTAIN_SOURCE } from './topicSourceContext.js';

export const WORLD_SOURCE_DIRECTIONS = Object.freeze([
  { id: 'october', label: 'הקשר ל־7 באוקטובר', why: 'שני נוסחי תאריך בפוסט, אותו ערך, ומעבר מפורש לשביעי באוקטובר.' },
  { id: 'india', label: 'הודו ו־14–45', why: 'מתיעוד הודו בגלריות אל רמזי דוד, גאולה ורכבת המים.' },
  { id: 'wisdom', label: 'מה נפתח בחכמה 73', why: 'תמונת מחשבון היסטורית, שיטות שונות וחיבורים לירושלים.' },
]);
const mappingRef = 'work_log:0584504f-2b45-4f39-874b-42f8d7da41be';
const calc = (expression, method, expected) => ({ expression, method, expected });
const raw = (value, unit) => ({ value, unit });
const zero = (from, to) => ({ from, to, ruleId: 'zero_scale_law' });
const one = (from, to) => ({ from, to, ruleId: 'shitat_haechad_alef_law' });
// The exact quotation + locator is the admission guard, not ocr_numbers or numeric similarity.
export const REVIEWED_SOURCE_WITNESSES = Object.freeze([
  { id: 'date-718', direction: 'october', postMarker: 'data-fz1073-718-axis',
    title: 'שני נוסחי תאריך — והחיבור ל־718',
    guards: ['כ״ב בתשרי תשפ״ד = 1718', 'י״ט בתשרי תשפ״ז = 1718', 'שביעי באוקטובר'],
    reason: 'המחבר מחבר בין שני אירועים באמצעות נוסחי התאריכים ושיטת האחד. אימות הסכום אינו אימות התאריך בלוח השנה.',
    relationKind: 'author_comparison', topicSlug: 'gapfill-718',
    calculations: [calc('כ״ב בתשרי תשפ״ד', 'רגיל', 1718), calc('י״ט בתשרי תשפ״ז', 'רגיל', 1718), calc('שביעי באוקטובר', 'רגיל', 718)],
    relations: [one(1718, 718)] },
  { id: 'flight-wisdom', direction: 'october', postMarker: 'data-fz1073-1073-shachar',
    title: 'מספר הטיסה — והמשך לחכמה', guards: ['1073'],
    reason: '1073 הוא מספר הטיסה בפוסט; שיטת האחד מאפשרת את הקריאה 1000 ועוד 73. החיבור לחכמה הוא רמז נוסף לבדיקה, בנפרד מקריאת הדובר 10 | 7 | 3.',
    relationKind: 'proposed_rule_connection', readings: [raw(1073, 'מספר טיסה FZ1073')],
    calculations: [calc('חכמה', 'רגיל', 73)], relations: [one(1073, 73)] },
  { id: 'spoken-1202', direction: 'october', postMarker: 'data-video-spoken-hints-718', supporting: true,
    title: '1202 — אותו ערך, שיטות שונות', guards: ['חרבות ברזל', 'התגלות משיח', 'מסתתר = 1202'],
    reason: 'הפוסט מתעד השוואה פרשנית מתוך הסרטון. מסתתר מחשב הפרשים בין אותיות סמוכות; הוא אינו מילוי אותיות.',
    relationKind: 'author_comparison',
    calculations: [calc('כ״ב בתשרי תשפ״ד', 'מסתתר', 1202), calc('חרבות ברזל', 'מסתתר', 1202), calc('התגלות משיח', 'רגיל', 1202)] },
  { id: 'spoken-ofer', direction: 'october', postMarker: 'data-video-spoken-hints-718', supporting: true,
    title: 'מהשמות בפוסט אל ענף הבחירות', guards: ['עופר וינטר', 'מילוי = 1820'],
    reason: 'אותו שם מופיע בפוסט בשתי שיטות. זהו פתח מתועד לענף הבחירות; אין מכאן שוויון של כל השמות ל־1820. מיקום הסרטון 02:40–03:08 עדיין ממתין לאימות ניגון.',
    relationKind: 'documented_source_mention', calculations: [calc('עופר וינטר', 'רגיל', 631), calc('עופר וינטר', 'מילוי', 1820)] },
  { id: 'india-health', direction: 'india', galleryImageId: '6232be42-82a3-41ac-b4d3-004a21e48c7f',
    title: '״קודם 140 עכשיו 450״', guards: ['קודם 140', 'עכשיו 450'],
    reason: 'צילום היסטורי מהודו, עם שני המספרים מפורשים. זיקת האפסים מחברת ל־14 ול־45; דוד וגאולה מחושבים בנפרד. טענות הבריאות שבכיתוב הן תיעוד ופרשנות מן העבר.',
    relationKind: 'documented_source_mention', readings: [raw(140, 'חולים בדיווח ההיסטורי'), raw(450, 'מאושפזים בדיווח ההיסטורי')],
    calculations: [calc('דוד', 'רגיל', 14), calc('גאולה', 'רגיל', 45)], relations: [zero(140, 14), zero(450, 45)] },
  { id: 'water-train', direction: 'india', galleryImageId: '8940efb2-8423-4a27-a10a-d3fdd07cf595',
    title: 'רכבת המים — 216 ו־2160', guards: ['216 ק"מ', 'גדול 2160', 'יראה'],
    reason: 'מרחק הרכבת ותמונות המחשבון מופיעים באותו מקור. 216 הוא יראה ברגיל; 2160 הוא משיח יהוה במילוי גדול. זיקת האפסים מחברת ביניהם כרמז, עם שתי שיטות נפרדות.',
    relationKind: 'author_interpretation', readings: [raw(216, 'ק״מ — אורך המסלול המדווח')],
    calculations: [calc('יראה', 'רגיל', 216), calc('משיח יהוה', 'מילוי גדול', 2160), calc('משיח יהוה', 'מילוי', 950)], relations: [zero(216, 2160)] },
  { id: 'flight-descent', direction: 'india', postParagraph: true, supporting: true,
    title: 'מהמטוס: 14,000 רגל — והחיבור ל־14', guards: ['טיסת Flydubai', '14,000 רגל'],
    reason: 'הפוסט מדווח על ירידה של יותר מ־14,000 רגל. זיקת האפסים מאפשרת לקרוא את הקשר ל־14 ולדוד, בלי לשנות את יחידת הגובה ובלי לזהות את אירוע הטיסה עם האירועים ההיסטוריים בהודו.',
    relationKind: 'proposed_rule_connection', readings: [raw(14000, 'רגל — סף הירידה המדווח: יותר מ־14,000')],
    calculations: [calc('דוד', 'רגיל', 14)], relations: [zero(14000, 14)] },
  { id: 'india-tunnel', direction: 'india', galleryImageId: '96207e5d-ac80-4344-9e50-f50a8cc0a726', supporting: true,
    title: '41 פועלים ו־14 ימים', guards: ['41 פועלים', '14 ימים'],
    reason: 'התמונה מדווחת על 41 פועלים ו־14 ימים. 4.5 ק״מ וההשוואה למנהרות בישראל מגיעים מהכיתוב של עמיחי, ולא מן הצילום. קרדיט הצילום Reuters; תאריך המופיע בצילום 25.11.23.',
    relationKind: 'author_comparison', readings: [raw(41, 'פועלים'), raw(14, 'ימים')], calculations: [calc('דוד', 'רגיל', 14)] },
  { id: 'india-fighter', direction: 'india', galleryImageId: 'fcbcfb23-90ed-4b71-afd8-14cf7d1d4c3e', supporting: true,
    title: 'מטוס קרב הודי — אירוע אחר', guards: ['דור 4.5', '1.4 מיליארד דולר', 'GE-414'],
    reason: '4.5 הוא דור המטוס, 1.4 מיליארד דולר היא השקעה, ו־414 הוא דגם המנוע. זהו אירוע נפרד מטיסת FZ1073. הקריאה 14–45 בכיתוב היא פרשנות המחבר, ללא הסרת נקודה באמצעות חוק האפס.',
    relationKind: 'author_interpretation', readings: [raw('4.5', 'דור מטוס'), raw('1.4', 'מיליארד דולר השקעה'), raw('GE-414', 'דגם מנוע')] },
  { id: 'wisdom-methods', direction: 'wisdom', galleryImageId: 'c502fa89-96f1-495b-aeb7-b16deaaa96b3',
    title: 'חכמה — מה נפתח באותיות?', guards: ['חכמה', 'רגיל 73', 'מילוי בלבד גדול 1820'],
    reason: 'המחשבון ההיסטורי מציג כמה שיטות לאותו ביטוי. 1820 שייך למילוי בלבד גדול: מילוי גדול 1893 פחות האותיות המקוריות שערכן 73. הכיתוב ההיסטורי נשמר גם כשניסוחו מקוצר.',
    relationKind: 'documented_source_mention', calculations: [calc('חכמה', 'רגיל', 73), calc('חכמה', 'מילוי בלבד גדול', 1820), calc('חכמה', 'קדמי', 271), calc('חכמה', 'מילוי', 613), calc('חכמה', 'מילוי גדול', 1893), calc('חכמה', 'מילוי דמילוי', 1230), calc('חכמה', 'מסתתר', 67)] },
  { id: 'jerusalem-gate', direction: 'wisdom', galleryImageId: '5dfe5a87-702c-42da-aa36-46351dd70c4e',
    title: '730 מטרים — שער לירושלים', guards: ['730 מטרים', '28/09/2023'],
    reason: 'כיתוב המחבר מחבר את שער ירושלים לחכמה. הידיעה המצולמת היא מ־28.9.2023; ״היום״ בכותרתה שייך לאותו פרסום. 730 מטרים נפתחים ל־73 דרך זיקת האפסים.',
    relationKind: 'author_interpretation', readings: [raw(730, 'מטרים')], calculations: [calc('חכמה', 'רגיל', 73)], relations: [zero(730, 73)] },
  { id: 'jerusalem-cable', direction: 'wisdom', galleryImageId: '46987aba-4da8-4b57-bef8-3ed5bef0e48d', supporting: true,
    title: '73 קרונות — באותה גלריה', guards: ['73 קרונות', '1.4 ק"מ'],
    reason: 'הכיתוב מחבר את הרכבל לחכמה. בצילום: 73 קרונות, 1.4 ק״מ וכ־4.5 דקות. אין בו 450 נוסעים; אזכור כזה בכיתוב מאוחר אינו מאמת אותו. שיתוף הגלריה אינו זהות אירוע.',
    relationKind: 'author_interpretation', readings: [raw(73, 'קרונות'), raw('1.4', 'ק״מ'), raw('4.5', 'דקות בקירוב')], calculations: [calc('חכמה', 'רגיל', 73)] },
]);
const compact = (text) => String(text || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
export function witnessSource(spec, { gallery, india, post, topic } = {}) {
  if (spec.galleryImageId) {
    const item = [...(india?.items || []), ...(gallery?.items || [])].find((entry) => entry.access?.scope === 'public'
      && entry.occurrences?.some((occurrence) => occurrence.legacyPlacement?.galleryImageId === spec.galleryImageId));
    if (!item || !spec.guards.every((quote) => compact(item.intrinsic?.extraction?.text).includes(quote))) return null;
    return { item, text: item.intrinsic.extraction.text, sourceRef: `gallery_images:${spec.galleryImageId}`,
      href: item.imageUrl, topicHref: item.reopen.topicHref, topicSlug: item.reopen.topicHref ? india.topicSlug : null };
  }
  if (!post || !Array.isArray(post.tags) || post.tags.some((tag) => ['טיוטה', 'פורום'].includes(tag))
    || ['gpt-draft', 'web'].includes(post.source) || post.home_hidden === true) return null;
  let text;
  if (spec.postParagraph) {
    text = (String(post.content || '').match(/<p\b[^>]*>[\s\S]*?<\/p>/gi) || []).map(compact)
      .find((paragraph) => spec.guards.every((quote) => paragraph.includes(quote)));
  } else {
    const start = String(post.content || '').indexOf(`${spec.postMarker}="v1"`);
    const end = post.content.indexOf('</section>', start);
    if (start < 0 || end < 0) return null;
    text = compact(post.content.slice(post.content.indexOf('>', start) + 1, end));
  }
  if (!text || !spec.guards.every((quote) => text.includes(quote))) return null;
  return { text, sourceRef: `posts:${post.id}#${spec.postMarker || `quote-${spec.id}`}`, href: `/post/${encodeURIComponent(post.slug)}`,
    topicHref: spec.topicSlug && topic?.topicSlug === spec.topicSlug ? `/topic/${encodeURIComponent(topic.topicSlug)}` : null,
    topicSlug: spec.topicSlug && topic?.topicSlug === spec.topicSlug ? topic.topicSlug : null,
    postTitle: post.title, author: post.author,
    routePrecision: 'post_only_region_not_visible',
  };
}
export function verifiedCalculation(request, finding) {
  const trace = finding?.projection?.dimensions?.trace;
  if (!trace || trace.input !== request.expression || trace.method_key !== request.method
    || trace.verification?.parity !== true || trace.verification?.trace_value !== trace.result
    || trace.verification?.canonical_value !== trace.result || trace.method_version == null
    || !Number.isSafeInteger(trace.result) || trace.result !== request.expected) return null;
  return { ...request, value: trace.result, trace, finding,
    href: numberExpressionFocusHref(trace.result, { expression: request.expression, method: request.method }) };
}
export function governedRelation(request, result) {
  if (!Number.isSafeInteger(request.from) || !Number.isSafeInteger(request.to)) return null;
  const card = result?.cards?.find((entry) => entry.ruleId === request.ruleId && entry.value === request.from && entry.ruleVersion != null);
  const fact = card?.finding?.evidence?.facts?.[0];
  if (!fact || fact.rule_id !== request.ruleId || fact.input !== request.from || fact.rule_version !== card.ruleVersion) return null;
  const supported = request.ruleId === 'zero_scale_law'
    ? fact.output?.scale_chain?.includes(request.from) && fact.output.scale_chain.includes(request.to)
    : request.ruleId === 'shitat_haechad_alef_law' && fact.output?.remainder === request.to;
  if (!supported) return null;
  return { ...request, card, display: request.ruleId === 'shitat_haechad_alef_law' ? card.display : `${request.from} ↔ ${request.to}`,
    relationClass: 'governed_interpretive_derivation', independentEvidence: false };
}
export async function projectWorldSourceWitness(spec, source, { traceReader = fetchGematriaMethodTrace, lawReader = fetchNumberSystemMethods } = {}) {
  if (!source) return null;
  const calculations = await Promise.all((spec.calculations || []).map(async (request) => {
    try { return { ...request, verified: verifiedCalculation(request, await traceReader(request.method, request.expression)) }; }
    catch { return { ...request, verified: null }; }
  }));
  const availableValues = new Set([...(spec.readings || []).filter((r) => Number.isSafeInteger(r.value)).map((r) => r.value),
    ...calculations.filter((c) => c.verified).map((c) => c.verified.value)]);
  const relations = await Promise.all((spec.relations || []).map(async (request) => {
    if (!availableValues.has(request.from) || !availableValues.has(request.to)) return { ...request, verified: null };
    try { return { ...request, verified: governedRelation(request, await lawReader(request.from)) }; }
    catch { return { ...request, verified: null }; }
  }));
  return { ...spec, source, mappingRef, calculations, relations, anchor: `world-source-${spec.id}`,
    dependencyKey: source.item?.sourceIdentity.ref || source.sourceRef, publication: 'read_time_projection_only' };
}
export function isPublicWorldMethod(row) {
  return row?.active === true && row.in_engine === true && row.required_entitlement === 'public' && row.version != null;
}
export async function fetchWorldSourceConnections(direction, { india, postId = INDIA_CAPTAIN_SOURCE.postId } = {}) {
  const specs = REVIEWED_SOURCE_WITNESSES.filter((spec) => spec.direction === direction);
  if (!specs.length) return [];
  const [gallery, post, topic, registry] = await Promise.all([
    fetchGallerySourceContext({ imageIds: specs.map((spec) => spec.galleryImageId).filter(Boolean) }),
    specs.some((spec) => spec.postMarker || spec.postParagraph) ? fetchPublicWorldPostSource({ postId }) : null,
    specs.some((spec) => spec.topicSlug) ? fetchTopicSourceContext({ topicSlug: specs.find((spec) => spec.topicSlug).topicSlug }) : null,
    fetchMethodRegistry(specs.flatMap((spec) => (spec.calculations || []).map((entry) => entry.method))).catch(() => []),
  ]);
  // Dedupe network calculation requests within this bounded projection, never durable truth.
  const traces = new Map(), laws = new Map();
  const traceReader = (method, expression) => {
    const key = JSON.stringify([method, expression]);
    const permission = registry.find((entry) => entry.method_key === method);
    if (!isPublicWorldMethod(permission)) return Promise.resolve(null);
    if (!traces.has(key)) traces.set(key, fetchGematriaMethodTrace(method, expression).then((finding) =>
      finding?.projection?.dimensions?.trace?.method_version === permission.version ? finding : null));
    return traces.get(key);
  };
  const lawReader = (value) => { if (!laws.has(value)) laws.set(value, fetchNumberSystemMethods(value)); return laws.get(value); };
  return (await Promise.all(specs.map((spec) => projectWorldSourceWitness(spec, witnessSource(spec, { gallery, india, post, topic }), { traceReader, lawReader })))).filter(Boolean);
}
// Existing Research Context only; ordinary source selection never starts a personal Path.
export function worldWitnessContext(witness, calculation = null) {
  const source = witness.source;
  return { selection: { entityId: source.item?.galleryImageId || source.sourceRef, entityType: source.item ? 'image' : 'source',
    sourceRef: source.sourceRef, locator: `#${witness.anchor}`,
    ...(calculation ? { entityId: String(calculation.value), entityType: 'number', expression: calculation.expression, method: calculation.method,
      methodVersion: String(calculation.trace.method_version), resultValue: calculation.value, findingId: calculation.finding.id, focusKind: 'expression' } : {}),
  }, lens: calculation ? 'number' : 'world',
  dimensions: { activeSectionId: witness.anchor, readingFocus: null, surfaceFindings: calculation ? [calculation.finding] : [],
    surfaceFocus: { id: source.item?.mediaId || source.sourceRef, type: source.item ? 'image' : 'source', label: witness.title,
      reference: source.item?.sourceIdentity.ref || source.sourceRef, locator: `#${witness.anchor}`, href: `/world#${witness.anchor}`,
      sourceLabel: witness.title, reason: witness.reason },
  } };
}
