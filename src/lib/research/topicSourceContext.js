// Read-time source context over admitted Topic memberships + the bounded, reviewed post
// locator from handoff e04a35a0. No tagging registry, graph writes, Journey store or new truth.
import { buildMediaEnvelope, buildStoredInterpretation, dedupeMediaEnvelopes } from "./galleryMediaEnvelope.js";
import { canonicalMediaPresentation, canonicalMediaPublicLabel } from "../presentation/canonicalPresentation.js";
import { formatGregorianDate } from "./timeline2029.js";

export const TOPIC_SOURCE_LIMIT = 64;
export const TOPIC_OCCURRENCE_LIMIT = 256;

export function storedGalleryOrderIds(rows) {
  return [...new Set((Array.isArray(rows) ? [...rows] : [])
    .filter((row) => row?.id)
    .sort((a, b) => (Number(a.ordering ?? Infinity) - Number(b.ordering ?? Infinity)) || String(a.id).localeCompare(String(b.id)))
    .map((row) => String(row.id)))];
}

// Existing 1237 pager, shared here under its source-context owner. Readers remain
// injected, unchanged, and re-admit the selected public rows on every window.
export async function loadPublicGallerySourcePage({ wpGalleryId, listGalleryImages, fetchSourceContext, offset = 0, limit = 6, orderedIds = null }) {
  if (!Number.isSafeInteger(wpGalleryId) || wpGalleryId < 1 || !Number.isSafeInteger(offset) || offset < 0
    || !Number.isSafeInteger(limit) || limit < 1 || limit > 12) throw new RangeError("Invalid bounded gallery window");
  const listed = storedGalleryOrderIds(await listGalleryImages(wpGalleryId));
  const candidates = orderedIds == null ? listed : [...new Set(orderedIds)].filter(id => listed.includes(id));
  const slice = candidates.slice(offset, offset + limit);
  const { items = [], occurrencesTruncated = false } = slice.length ? await fetchSourceContext({ imageIds: slice }) : {};
  const order = new Map(slice.map((id, index) => [id, index]));
  const admitted = [...new Map(items.filter((item) => item?.galleryImageId && (order.has(item.galleryImageId)
    || item.occurrences?.some((entry) => order.has(entry.legacyPlacement?.galleryImageId))))
    .map((item) => [item.galleryImageId, item])).values()]
    .sort((a, b) => firstPosition(a) - firstPosition(b));
  function firstPosition(item) {
    return Math.min(order.get(item.galleryImageId) ?? Infinity,
      ...(item.occurrences || []).map((entry) => order.get(entry.legacyPlacement?.galleryImageId) ?? Infinity));
  }
  const page = { wpGalleryId, items: admitted, offset, limit, scannedIds: slice,
    totalListed: candidates.length, hasMore: offset + limit < candidates.length,
    nextOffset: Math.min(offset + limit, candidates.length), occurrencesTruncated };
  // Shared objects can have several selected occurrences. They are not withheld
  // rows or independent sources merely because the reader grouped them together.
  const readableIds = new Set(admitted.flatMap((item) => [item.galleryImageId,
    ...(item.occurrences || []).filter((entry) => entry.legacyPlacement?.wpGalleryId === wpGalleryId)
      .map((entry) => entry.legacyPlacement.galleryImageId)]));
  return { ...page, withheld: slice.filter((id) => !readableIds.has(id)).length };
}

// Resolve an occurrence, not merely a shared image object.
export function resolvePublicGallerySelection(page, galleryImageId) {
  const empty = (status) => ({ status, item: null, occurrence: null, selection: null });
  if (!page || !Number.isSafeInteger(page.wpGalleryId) || page.wpGalleryId < 1
    || typeof galleryImageId !== "string" || !galleryImageId) return empty("unavailable");
  if (!page.scannedIds?.includes(galleryImageId)) return empty("not_in_loaded_window");
  const matches = [];
  for (const item of page.items || []) {
    if (item?.access?.scope !== "public" || item.access.available === false) continue;
    for (const occurrence of item.occurrences || []) {
      const p = occurrence.legacyPlacement;
      if (p?.galleryImageId === galleryImageId && p.wpGalleryId === page.wpGalleryId
        && occurrence.intrinsic?.galleryImageId === galleryImageId
        && occurrence.mediaId === occurrence.intrinsic?.mediaId
        && occurrence.intrinsic?.representation?.imageUrl === item.imageUrl
        && occurrence.provenance?.sourceRef === `gallery_images:${galleryImageId}`) matches.push({ item, occurrence });
    }
  }
  if (matches.length !== 1) return empty("unavailable");
  const { item, occurrence } = matches[0], p = occurrence.legacyPlacement;
  return { status: "ready", item, occurrence, selection: { galleryImageId, wpGalleryId: p.wpGalleryId,
    galleryId: p.galleryId, ordering: p.ordering, sourceRef: occurrence.provenance.sourceRef,
    mediaId: occurrence.mediaId, dateUse: "provenance_only" } };
}

// Same native document for any valid historical gallery ID. URLs are
// locators, never permission to render the listed row without public re-admission.
export function gallerySourceHref2029(wpGalleryId, galleryImageId = null) {
  if (!Number.isSafeInteger(wpGalleryId) || wpGalleryId < 1) return null;
  const base = `/world?view=gallery&gallery=${wpGalleryId}`;
  if (galleryImageId == null) return base;
  if (typeof galleryImageId !== "string" || !/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(galleryImageId)) return null;
  return `${base}&image=${encodeURIComponent(galleryImageId)}#gallery-source-${galleryImageId}`;
}

export function buildPublicGalleryCatalog2029(overview = {}) {
  const galleries = new Map(), ambiguous = new Set();
  let incomplete = false;
  for (const g of Array.isArray(overview.gals) ? overview.gals : []) {
    if (!g?.id || !gallerySourceHref2029(g.wp_gallery_id) || typeof g.name !== 'string' || !g.name.trim()) continue;
    if (galleries.has(g.wp_gallery_id)) { ambiguous.add(g.wp_gallery_id); incomplete = true; }
    else galleries.set(g.wp_gallery_id, g);
  }
  const images = new Map();
  for (const row of Array.isArray(overview.imgs) ? overview.imgs : []) {
    const g = galleries.get(row?.wp_gallery_id);
    if (!isPublicSourceImage(row)) continue;
    if (!row?.id || !g || ambiguous.has(g.wp_gallery_id) || row.gallery_id !== g.id) { incomplete = true; continue; }
    if (!images.has(g.wp_gallery_id)) images.set(g.wp_gallery_id, new Map());
    images.get(g.wp_gallery_id).set(row.id, row);
  }
  const safeCover = (value) => {
    try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password && !u.search && !u.hash
      && !/^\/storage\/v1\/object\/(sign|authenticated)\//.test(u.pathname); } catch { return false; }
  };
  const items = [...images].map(([wpGalleryId, byId]) => {
    const g = galleries.get(wpGalleryId), rows = [...byId.values()];
    const ordered = storedGalleryOrderIds(rows);
    const coverRow = ordered.map(id => byId.get(id)).find(row => safeCover(row.image_url));
    const cover = coverRow ? buildGallerySourceContext({ images: [{ ...coverRow,
      ocr_meta: { date_derived: coverRow.date_derived },
      thumb_url: safeCover(coverRow.thumb_url) ? coverRow.thumb_url : null }], galleries: [g] })[0] : null;
    // Candidate metadata for filtering only; never propagate signed/credential URLs.
    const entryFields=['id','name','description','ordering','primary_value','all_values','related_values','image_type'];
    const entries = ordered.map(id => Object.fromEntries(entryFields.map(key=>[key,byId.get(id)[key]])));
    const updatedAt = entries.map(row => galleryEditorialUpdate2029(row.name)?.dateTime).filter(Boolean).sort().at(-1) || null;
    return { galleryId: g.id, wpGalleryId, originalName: g.name, imageCount: rows.length, entries, updatedAt,
      href: gallerySourceHref2029(wpGalleryId), cover: cover || null };
  }).sort((a, b) => b.wpGalleryId - a.wpGalleryId);
  return { items, coverage: { partial: overview.coverage?.partial === true || incomplete } };
}

// Authored historical update heading, not arbitrary dates inside the caption/OCR.
// Exact stored text + span retained. Ambiguous/invalid dates remain unknown.
export function galleryEditorialUpdate2029(name) {
  if (typeof name !== 'string' || !/עדכון/u.test(name)) return null;
  const matches = [...name.matchAll(/(?<!\d)(\d{1,2})\s*[./-]\s*(\d{1,2})\s*[./-]\s*(\d{4}|\d{2})(?!\d)/g)];
  const dates = matches.map(m => {
    const year = m[3].length === 2 ? '20' + m[3] : m[3];
    const dateTime = `${year}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
    const label = formatGregorianDate(dateTime);
    return label?.split('.').reverse().join('-') === dateTime && Number(year)>=1900 && Number(year)<=2099
      ? { dateTime, label, basis: 'original_update_heading', originalHeader: name,
        locator: { field: 'gallery_images.name', start: m.index, end: m.index+m[0].length, quote: m[0] } } : null;
  });
  return dates.length && dates.every(Boolean) && new Set(dates.map(d=>d.dateTime)).size===1 ? dates[0] : null;
}

// Compact photo date is exclusively the authored update, never archive/path time.
export function galleryImageDatePresentation(item) {
  const update = galleryEditorialUpdate2029(item?.legacyPlacement?.originalName);
  return update ? { ...update, kind: 'עדכון', description: 'תאריך העדכון שנכתב בכותרת המקור; אינו תאריך קליטה או תאריך אירוע מאומת' } : null;
}

export function galleryReadingFilters2029(search = '') {
  const p = new URLSearchParams(search);
  const day = key => { const d=p.get(key)||'';return /^\d{4}-\d{2}-\d{2}$/.test(d)&&formatGregorianDate(d)?.split('.').reverse().join('-')===d?d:null; };
  return { q:(p.get('q')||'').slice(0,200).trim(), from:day('from'), to:day('to'),
    year:/^\d{4}$/.test(p.get('year')||'')?p.get('year'):null,
    nums:[...new Set((p.get('nums')||'').split(/[,\s]+/).filter(s=>/^\d+$/.test(s)).map(Number).filter(Number.isSafeInteger))].slice(0,12),
    mode:p.get('mode')==='and'?'and':'or', primary:p.get('primary')==='1',
    kind:['hint','gematria','method','trail','event','gallery'].includes(p.get('kind'))?p.get('kind'):null,
    order:['date','oldest','original','name','asc','desc'].includes(p.get('sort'))?p.get('sort'):'date',
    ocr:p.get('ocr')==='1', layout:p.get('layout')==='compact'?'compact':'reading' };
}

export function projectGalleryReading2029(catalog, filters, { ocrIds = [], ocrPartial = false } = {}) {
  const f=filters || galleryReadingFilters2029(), needle=f.q.normalize('NFC').toLocaleLowerCase('he');
  const ocr=new Set(ocrIds), nameOrder=new Intl.Collator('he',{numeric:true});
  const byDate=(a,b)=>{
    const da=galleryEditorialUpdate2029(a.name)?.dateTime, db=galleryEditorialUpdate2029(b.name)?.dateTime;
    return da&&db?(f.order==='oldest'?da.localeCompare(db):db.localeCompare(da)):da?-1:db?1:0;
  };
  const items=(catalog?.items||[]).flatMap(g=>{
    let entries=g.entries.filter(row=>{
      const date=galleryEditorialUpdate2029(row.name)?.dateTime;
      const ns=[row.primary_value,...(Array.isArray(row.all_values)?row.all_values:[]),...(Array.isArray(row.related_values)?row.related_values:[])].filter(Number.isSafeInteger);
      const text=`${g.originalName} ${row.name||''} ${row.description||''}`.normalize('NFC').toLocaleLowerCase('he');
      return (!needle||text.includes(needle)||(f.ocr&&ocr.has(row.id)))
        && (!f.kind||row.image_type===f.kind)
        && (!f.year||date?.startsWith(f.year+'-')) && (!f.from||date&&date>=f.from) && (!f.to||date&&date<=f.to)
        && (!f.nums.length||(f.mode==='and'?f.nums.every(n=>f.primary?row.primary_value===n:ns.includes(n)):f.nums.some(n=>f.primary?row.primary_value===n:ns.includes(n))));
    });
    if(!entries.length)return [];
    if(f.order!=='original')entries=[...entries].sort((a,b)=>byDate(a,b)||(a.ordering??Infinity)-(b.ordering??Infinity)||String(a.id).localeCompare(String(b.id)));
    const date=entries.map(row=>galleryEditorialUpdate2029(row.name)?.dateTime).filter(Boolean).sort().at(f.order==='oldest'?0:-1)||null;
    return [{...g,entries,matchingCount:entries.length,updatedAt:date}];
  });
  items.sort((a,b)=>f.order==='original'?b.wpGalleryId-a.wpGalleryId:['name','asc','desc'].includes(f.order)
    ?(f.order==='desc'?-1:1)*nameOrder.compare(a.originalName,b.originalName)||a.wpGalleryId-b.wpGalleryId
    :a.updatedAt&&b.updatedAt?(f.order==='oldest'?a.updatedAt.localeCompare(b.updatedAt):b.updatedAt.localeCompare(a.updatedAt))||a.wpGalleryId-b.wpGalleryId:a.updatedAt?-1:b.updatedAt?1:a.wpGalleryId-b.wpGalleryId);
  return { items, coverage:{partial:catalog?.coverage?.partial===true||ocrPartial}, total:items.reduce((n,g)=>n+g.matchingCount,0) };
}

// Bounded composition of the SAME existing public occurrence page reader.
// At most ten 12-row reads; every destination independently re-admitted.
export async function loadPublicGalleryReading2029({ gallery, take=12, imageId=null, fetchSourceContext }) {
  if(!gallerySourceHref2029(gallery?.wpGalleryId)||!Number.isSafeInteger(take)||take<12||take>120||take%12)throw new RangeError('Invalid reading range');
  const ids=gallery.entries.map(row=>row.id), index=imageId?ids.indexOf(imageId):-1;
  if(imageId&&index<0)return {status:'unavailable',page:null,selected:null};
  // Exact old links never expand unboundedly to reach a far locator.
  const start=index>=take?Math.floor(index/12)*12:0, end=Math.min(ids.length,start+take);
  const pages=[];
  for(let offset=start;offset<end;offset+=12)pages.push(await loadPublicGallerySourcePage({wpGalleryId:gallery.wpGalleryId,
    listGalleryImages:async()=>gallery.entries,fetchSourceContext,orderedIds:ids,offset,limit:12}));
  const page={wpGalleryId:gallery.wpGalleryId,items:pages.flatMap(p=>p.items),scannedIds:ids.slice(start,end),offset:start,limit:take,
    totalListed:ids.length,hasMore:end<ids.length,nextOffset:end,withheld:pages.reduce((n,p)=>n+p.withheld,0),occurrencesTruncated:pages.some(p=>p.occurrencesTruncated)};
  // One shared media may span two batches. Keep one identical source object with all occurrences.
  page.items=dedupeMediaEnvelopes(page.items,{bySourceObject:true});
  const selected=imageId?resolvePublicGallerySelection(page,imageId):page.scannedIds.map(id=>resolvePublicGallerySelection(page,id)).find(s=>s.status==='ready');
  return {status:selected?.status||'empty_window',page,selected:selected||null,navigation:null};
}

export function galleryReadingHref2029(search='', { galleryId=null, imageId=null, take=null }={}) {
  const current=new URLSearchParams(search), p=new URLSearchParams({view:'gallery',flow:'1'});
  for(const key of ['q','sort','from','to','year','nums','mode','primary','kind','ocr','layout'])if(current.get(key))p.set(key,current.get(key));
  if(galleryId!=null){if(!gallerySourceHref2029(galleryId,imageId))return null;p.set('gallery',String(galleryId));}
  if(take)p.set('take',String(take));
  if(imageId)p.set('image',imageId);
  return `/world?${p}${imageId?'#gallery-source-'+imageId:''}`;
}

export function galleryOccurrenceItem(selected) {
  if (selected?.status !== "ready") return null;
  const { item, occurrence } = selected;
  // Same source object/identity and complete public history, exact occurrence's
  // intrinsic text, tags and caption. Never replace one placement by its sibling.
  return { ...item, ...occurrence, id: occurrence.mediaId,
    label: occurrence.intrinsic.label, presentation: canonicalMediaPresentation(occurrence),
    galleryImageId: selected.selection.galleryImageId, sourceRef: selected.selection.sourceRef,
    imageUrl: occurrence.intrinsic.representation.imageUrl,
    thumbUrl: occurrence.intrinsic.representation.thumbUrl,
    storedNumbers: occurrence.legacyPlacement.storedNumbers,
    imageType: occurrence.legacyPlacement.imageType, description: occurrence.legacyPlacement.originalCaption,
    occurredAt: occurrence.legacyPlacement.occurredAt, createdAt: occurrence.legacyPlacement.createdAt,
    sourceIdentity: item.sourceIdentity, occurrences: item.occurrences,
    access: item.access, dateUse: "provenance_only" };
}

export async function loadPublicGallerySourceWindow({ imageId = null, offset = 0, ...options }) {
  const limit = options.limit ?? 6;
  if (!gallerySourceHref2029(options.wpGalleryId)
    || (imageId != null && !gallerySourceHref2029(options.wpGalleryId, imageId))
    || !Number.isSafeInteger(offset) || offset < 0 || !Number.isSafeInteger(limit) || limit < 1 || limit > 12) throw new RangeError("Invalid bounded gallery locator");
  const rows = await options.listGalleryImages(options.wpGalleryId);
  const ids = storedGalleryOrderIds(rows);
  const index = imageId == null ? -1 : ids.indexOf(imageId);
  if (imageId != null && index === -1) return { status: "unavailable", page: null, selected: null };
  const page = await loadPublicGallerySourcePage({ ...options, listGalleryImages: async () => rows,
    offset: index < 0 ? offset : Math.floor(index / limit) * limit, limit });
  const selected = imageId != null ? resolvePublicGallerySelection(page, imageId)
    : page.scannedIds.map((id) => resolvePublicGallerySelection(page, id)).find((row) => row.status === "ready");
  const position = selected?.status === "ready" ? ids.indexOf(selected.selection.galleryImageId) : -1;
  // Source-order locators only, not admitted destination payloads or graph edges.
  // Each destination goes through this same public reader again on navigation.
  const navigation = position < 0 ? null : {
    previous: position > 0 ? gallerySourceHref2029(options.wpGalleryId, ids[position - 1]) : null,
    next: position < ids.length - 1 ? gallerySourceHref2029(options.wpGalleryId, ids[position + 1]) : null,
  };
  return { status: selected?.status || "empty_window", page, selected: selected || null, navigation };
}

// This is one source locator, NOT permission to read its research_object/public_candidate.
// Re-read the public post and require the mapped figure + exact statement on every request.
export const INDIA_CAPTAIN_SOURCE = Object.freeze({
  topicSlug: "india-axis",
  postId: 5112,
  postSlug: "flydubai-fz1073-363-14000-remzei-geula",
  regionId: "source-region-smit-machchhar",
  imageUrl: "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/gallery/sod1820/posts/fz1073/smit-machchhar-source-20261001.jpg",
  requiredCaption: "בצילום המסך שהגיע אלינו מופיע קפטן סמיט מאצ׳הר, אזרח הודי; הפרסום מייחס לו פציעה במהלך האירוע וסיוע בהשבת השליטה ובהצלת הנוסעים. הפרטים מוצגים כאן כטענת המקור המצולם.",
  mappingRef: "work_log:e04a35a0-6083-46b4-9fc2-c5fce4073f43",
});

export function isPublicSourceImage(row) {
  return row?.published === 1 && row?.min_tier === 0
    && (row?.curator_hidden === false || row?.curator_hidden == null)
    && typeof row?.image_url === "string" && /^https:\/\//.test(row.image_url);
}

function topicRelation(topic, row, index) {
  return {
    relationKind: "stored_topic_association",
    relationType: "topic_image",
    basis: "topic_cards_public.image_ids",
    sourceRef: `topic_cards:${topic.id}#image_ids/${index}`,
    topicId: topic.id,
    topicSlug: topic.slug,
    galleryImageId: row.id,
    storedIndex: index,
    explanation: `התמונה משויכת במקור לציר „${topic.title}”. הכיתוב ההיסטורי מובא בנפרד; השיוך אינו קובע שמדובר באותו אירוע.`,
    state: "stored_association_not_event_identity",
  };
}

function captainSourceEnvelope(topic, post) {
  const source = INDIA_CAPTAIN_SOURCE;
  if (topic.slug !== source.topicSlug || post?.id !== source.postId || post?.slug !== source.postSlug) return null;
  if (!Array.isArray(post.tags) || post.tags.some((tag) => ["טיוטה", "פורום"].includes(tag))) return null;
  // Only the mapped figure is considered. Another mention elsewhere in the post cannot
  // admit an unrelated picture, a changed caption, or a stale mapping.
  const figures = String(post.content || "").match(/<figure\b[^>]*>[\s\S]*?<\/figure>/gi) || [];
  const figure = figures.find((html) => (html.match(/<img\b[^>]*\bsrc=["']([^"']+)["']/i)?.[1]) === source.imageUrl);
  const caption = figure?.match(/<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/i)?.[1];
  if (caption !== source.requiredCaption) return null;
  const mediaId = `media:post:${post.id}:${source.regionId}`;
  const sourceRef = `post:${post.slug}#${source.regionId}`;
  const label = "קפטן סמיט מאצ׳הר — המקור המצולם בפוסט";
  const intrinsic = Object.freeze({
    mediaId, nodeId: null, galleryImageId: null, label,
    representation: { imageUrl: source.imageUrl, thumbUrl: source.imageUrl, fit: "preserve-whole-image" },
    extraction: { status: null, text: null, numbers: [], state: "not_extracted_here" },
    interpretation: buildStoredInterpretation(null),
  });
  const provenance = {
    sourceRef, storedSource: `posts:${post.id}`, storedMediaKind: "screenshot",
    storedMediaKindBasis: "public_post_figure_caption", author: post.author || null,
  };
  const postPlacement = {
    postId: post.id, postSlug: post.slug, regionId: source.regionId,
    originalTitle: post.title, originalCaption: caption,
    originalCredit: { author: post.author ?? null, authors: post.authors ?? null },
    publishedAt: post.date || null, modifiedAt: post.modified || null,
    dateBasis: "posts.date_publication_not_event_date",
  };
  const contextRelation = {
    relationKind: "documented_source_mention", relationType: "explicit_indian_citizenship",
    basis: "posts.content/figure/figcaption", sourceRef, topicId: topic.id, topicSlug: topic.slug,
    quote: caption, mappingRef: source.mappingRef,
    explanation: "הפוסט מכנה את הקפטן במפורש „אזרח הודי”. זהו הקשר להודו; תיאור הפציעה וההצלה נשאר טענת המקור המצולם.",
    state: "read_time_source_context_not_stored_graph_or_topic_tag",
  };
  return {
    mediaId, nodeId: null, galleryImageId: null, intrinsic, provenance, postPlacement,
    legacyPlacement: null, contextRelation,
    relationType: contextRelation.relationType,
    projectionReason: `${contextRelation.relationKind}:${contextRelation.relationType}`,
    presentation: canonicalMediaPresentation({ ...intrinsic, provenance }),
    label, imageUrl: source.imageUrl, thumbUrl: source.imageUrl, sourceRef,
    dateUse: "provenance_only",
    access: { scope: "public", basis: "existing_public_post_reader_excluding_draft_and_forum" },
  };
}

export function topicSourceAnchor(item) {
  return `topic-source-${String(item.galleryImageId || item.mediaId).replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

export function isDocumentedIndiaCaptainPost(post) {
  return Boolean(captainSourceEnvelope({ slug: INDIA_CAPTAIN_SOURCE.topicSlug }, post));
}

// Navigation over EXISTING public memberships. An exact shared object supplies a
// reason to compare contexts, never a new graph edge or an independent evidence count.
export function topicSourceLinks(context, relatedTopics = []) {
  if (context?.access?.scope !== "public" || context.access.available === false) return { topics: [], posts: [] };
  const items = context.items || [];
  const topics = relatedTopics.filter((row) => row?.id && row.status === "approved"
    && row.slug && row.slug !== context.topicSlug).flatMap((target) => {
    const targetIds = new Set(target.image_ids || []);
    const shared = items.flatMap((item) => {
      const occurrences = (item.occurrences || []).filter((entry) => targetIds.has(entry.intrinsic?.galleryImageId));
      if (!occurrences.length) return [];
      const ids = new Set(occurrences.map((entry) => entry.intrinsic.galleryImageId));
      const targetId = target.image_ids.find((id) => ids.has(id));
      return [{ item, targetId }];
    });
    if (!shared.length) return [];
    const { item, targetId } = shared[0];
    return [{
      id: target.id, nodeId: target.node_id || null, slug: target.slug, title: target.title,
      href: `/topic/${encodeURIComponent(target.slug)}#${topicSourceAnchor({ galleryImageId: targetId })}`,
      note: shared.length === 1
        ? `אותה תמונת מקור מופיעה גם ב„${target.title}”. אפשר לקרוא שם את ההקשר הנוסף; זו אינה ראיה נוספת.`
        : `${shared.length} תמונות מקור משותפות לשני הטופיקים. אפשר לקרוא את ההקשר הנוסף; ההופעות אינן ראיות נוספות.`,
      relationKind: "shared_stored_source", sourcePath: `${context.sourceRef}#shared-source/${target.id}`,
      sourceIdentities: shared.map(({ item: source }) => source.sourceIdentity.ref),
      sourceRefs: shared.map(({ targetId: id }) => `gallery_images:${id}`),
      returnHref: item.reopen.topicHref, sourceSelection: item.reopen.selection,
    }];
  });
  const posts = items.filter((item) => item.postPlacement && item.reopen?.postHref).map((item) => ({
    id: item.postPlacement.postId, slug: item.postPlacement.postSlug, title: item.postPlacement.originalTitle,
    href: item.reopen.postHref, note: item.contextRelation.explanation,
    relationKind: item.contextRelation.relationKind, sourcePath: item.sourceRef,
    returnHref: item.reopen.topicHref, sourceSelection: item.reopen.selection,
  }));
  return { topics, posts };
}

// Reviewed HTML image locator over a freshly admitted public Post. It remains a Post
// occurrence (no invented gallery row, membership or source date). Reuses the same exact
// storage-object identity and media envelope consumed by Gallery/Topic/Lightbox.
export function buildPublicPostImageContext(post, locator) {
  if (post?.id !== locator?.postId || !Array.isArray(post.tags)
    || post.tags.some((tag) => ["טיוטה", "פורום"].includes(tag))
    || ["gpt-draft", "web"].includes(post.source) || post.home_hidden === true) return null;
  const html = String(post.content || "");
  const images = html.match(/<img\b[^>]*>/gi) || [];
  const image = images.find((tag) => tag.match(/\bsrc=["']([^"']+)["']/i)?.[1] === locator.imageUrl);
  const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (!image || !(locator.guards || []).every((quote) => text.includes(quote))) return null;
  const mediaId = `media:post:${post.id}:image:${locator.imageUrl}`;
  const sourceRef = `posts:${post.id}#image:${locator.imageUrl}`;
  const figure = (html.match(/<figure\b[^>]*>[\s\S]*?<\/figure>/gi) || []).find((part) => part.includes(image));
  const originalCaption = figure?.match(/<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/i)?.[1] ?? null;
  const intrinsic = Object.freeze({ mediaId, galleryImageId: null, nodeId: null, label: locator.label,
    representation: { imageUrl: locator.imageUrl, thumbUrl: locator.imageUrl, fit: "preserve-whole-image" },
    extraction: { text: null, status: null, numbers: [], state: "not_extracted_here" },
    interpretation: buildStoredInterpretation(null) });
  const provenance = { sourceRef, storedSource: `posts:${post.id}`, author: post.author || null };
  const item = dedupeMediaEnvelopes([{ mediaId, intrinsic, provenance, label: locator.label,
    presentation: canonicalMediaPresentation({ ...intrinsic, provenance }),
    imageUrl: locator.imageUrl, thumbUrl: locator.imageUrl, sourceRef,
    access: { scope: "public", basis: "fresh_public_post_exact_html_image" }, dateUse: "provenance_only",
    postPlacement: { postId: post.id, postSlug: post.slug, originalTitle: post.title, originalCaption,
      originalAlt: image.match(/\balt=["']([^"']*)["']/i)?.[1] ?? null,
      originalCredit: { author: post.author ?? null, authors: post.authors ?? null },
      publishedAt: post.date || null, dateBasis: "posts.date_publication_not_event_date",
      regionId: null, imageUrl: locator.imageUrl },
  }], { bySourceObject: true })[0];
  const routed = attachReopen(item, { slug: "" });
  return { ...routed, reopen: { ...routed.reopen, topicHref: null,
    postHref: `/post/${encodeURIComponent(post.slug)}`, postRoutePrecision: "post_only_exact_image_in_source_html" } };
}

function attachReopen(item, topic) {
  const anchor = topicSourceAnchor(item);
  const topicHref = `/topic/${encodeURIComponent(topic.slug)}#${anchor}`;
  const selection = {
    entityId: item.galleryImageId || item.mediaId,
    entityType: "image", sourceRef: item.provenance.sourceRef, locator: `#${anchor}`,
  };
  return {
    ...item, id: item.mediaId,
    reopen: {
      topicHref, selection, imageHref: item.imageUrl,
      postHref: item.postPlacement ? `/post/${encodeURIComponent(item.postPlacement.postSlug)}#${item.postPlacement.regionId}` : null,
      // main currently hides the original Post body containing this exact region anchor.
      // Preserve the locator for its owner; do not advertise a visible-region reopen PASS.
      postRoutePrecision: item.postPlacement ? "post_only_with_source_region_locator" : null,
      galleries: item.occurrences.filter((entry) => entry.legacyPlacement).map(({ legacyPlacement: p }) => ({
        sourceRef: `gallery_images:${p.galleryImageId}`,
        href: p.wpGalleryId != null ? `/archive?tab=galleries&gal=${encodeURIComponent(p.wpGalleryId)}` : null,
        // The current Archive route opens the gallery, not a selected image. Consumers must
        // preserve this exact target without pretending an unsupported image query works.
        routePrecision: "gallery_only",
        selection: { galleryId: p.galleryId, wpGalleryId: p.wpGalleryId, galleryImageId: p.galleryImageId, wpImageId: p.wpImageId, ordering: p.ordering },
      })),
    },
  };
}

// Exact reviewed gallery locators can be consumed outside a Topic. They do not acquire
// Topic membership or a graph relation. Reuse the same identity/history/reopen contract.
export function buildGallerySourceContext({ images = [], occurrences = [], galleries = [] } = {}) {
  const publicRows = images.filter(isPublicSourceImage);
  const urls = new Set(publicRows.map((row) => row.image_url));
  const byId = new Map([...publicRows, ...occurrences.filter((row) => isPublicSourceImage(row) && urls.has(row.image_url))]
    .map((row) => [row.id, row]));
  const galleryById = new Map(galleries.map((row) => [row.id, row]));
  return dedupeMediaEnvelopes([...byId.values()].map((row) => buildMediaEnvelope({ row,
    gallery: galleryById.get(row.gallery_id), label: canonicalMediaPublicLabel(row),
  })).filter(Boolean), { bySourceObject: true }).map((item) => {
    const withRoutes = attachReopen(item, { slug: "" });
    return { ...withRoutes, contextRelation: null, contextRelations: [], dateUse: "provenance_only",
      access: { scope: "public", basis: "published_1_min_tier_0_not_curator_hidden" },
      reopen: { ...withRoutes.reopen, topicHref: null } };
  });
}

/** Pure projection; the Entity Hub reader supplies only public-view rows and bounded reads. */
export function buildTopicSourceContext({ topic, images = [], occurrences = [], galleries = [], post = null, relatedTopics = [], occurrencesTruncated = false } = {}) {
  if (!topic?.id || !topic?.slug || topic.status !== "approved") return null;
  const imageIds = Array.isArray(topic.image_ids) ? topic.image_ids : [];
  const selectedIds = imageIds.slice(0, TOPIC_SOURCE_LIMIT);
  const byId = new Map(images.filter(isPublicSourceImage).map((row) => [row.id, row]));
  const galleryById = new Map(galleries.map((gallery) => [gallery.id, gallery]));
  const toEnvelope = (row) => buildMediaEnvelope({
    row, gallery: galleryById.get(row.gallery_id),
    label: canonicalMediaPublicLabel({ name: row.name, description: row.description }),
  });
  const selected = selectedIds.flatMap((id, index) => {
    const row = byId.get(id);
    const envelope = row && toEnvelope(row);
    if (!envelope) return [];
    const contextRelation = topicRelation(topic, row, index);
    return [{ ...envelope, contextRelation, contextRelations: [contextRelation],
      relationType: contextRelation.relationType,
      projectionReason: `${contextRelation.relationKind}:${contextRelation.relationType}`,
      dateUse: "provenance_only",
      access: { scope: "public", basis: "published_1_min_tier_0_not_curator_hidden" } }];
  });
  const selectedUrls = new Set(selected.map((item) => item.imageUrl));
  const selectedRowIds = new Set(selected.map((item) => item.galleryImageId));
  // Exact-object appearances enrich history only; they acquire no Topic membership.
  const extras = occurrences.filter((row) => isPublicSourceImage(row) && selectedUrls.has(row.image_url) && !selectedRowIds.has(row.id))
    .map(toEnvelope).filter(Boolean).map((item) => ({ ...item, contextRelation: null, contextRelations: [] }));
  const captain = captainSourceEnvelope(topic, post);
  const items = dedupeMediaEnvelopes([...selected, ...extras, ...(captain ? [captain] : [])], { bySourceObject: true })
    // An extra occurrence must never become an independent evidence card.
    .filter((item) => item.contextRelations.length)
    .map((item) => attachReopen(item, topic));
  for (const [index, item] of items.entries()) {
    item.sequence = {
      index, basis: "stored_topic_order_then_documented_post_source_not_chronology",
      previousHref: items[index - 1]?.reopen.topicHref || null,
      nextHref: items[index + 1]?.reopen.topicHref || null,
    };
  }
  const context = {
    topicId: topic.id, topicSlug: topic.slug, topicTitle: topic.title, topicNodeId: topic.node_id || null,
    sourceRef: `topic_cards:${topic.id}`, items,
    access: { available: true, scope: "public" },
    coverage: {
      storedMemberships: imageIds.length, readableMemberships: selected.length,
      sourceCount: items.length, occurrenceCount: items.reduce((sum, item) => sum + item.occurrences.length, 0),
      membershipsTruncated: imageIds.length > TOPIC_SOURCE_LIMIT, occurrencesTruncated,
      captain: topic.slug !== INDIA_CAPTAIN_SOURCE.topicSlug ? "not_requested" : captain ? "public_post_source_verified" : "source_unavailable_or_changed",
    },
    orderBasis: "stored_topic_order_not_event_chronology",
  };
  return { ...context, links: topicSourceLinks(context, relatedTopics) };
}

// Source-native selection for the EXISTING Research Context. No Journey creation or saving.
export function topicSourceContextPatch(item, topic) {
  // The existing rail still orients to the Topic and its existing anchor. Selecting media
  // must not invent a numeric media identity (the current rail treats a missing number as 0).
  // Exact source focus lives in selection + reference/locator/reason for downstream readers.
  const topicNumber = topic.heroNumber ?? topic.highlightNumbers?.[0] ?? topic.numbers?.[0];
  return {
    selection: item.reopen.selection,
    dimensions: {
      activeSectionId: "topic-sources", topicSlug: topic.slug,
      // A source selected in this Topic must not inherit the previous Post's reading focus
      // or its suggested connections. Journey/return state remains with its existing owner.
      readingFocus: null, surfaceFindings: [],
      surfaceFocus: {
        id: topic.slug, type: "topic", label: topic.displayTitle || topic.title,
        primary: topicNumber != null ? String(topicNumber) : topic.title,
        ...(topicNumber != null ? { number: topicNumber } : {}),
        sectionLabel: "מקורות", reference: item.sourceIdentity.ref,
        locator: item.reopen.selection.locator, href: item.reopen.topicHref,
        sourceLabel: topic.title, reason: item.contextRelation.explanation,
        signals: [item.contextRelation.explanation],
      },
    },
  };
}
