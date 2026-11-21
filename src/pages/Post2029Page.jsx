import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation, useParams } from "react-router-dom";
import Sod2029Shell, { FrameState, use2029Shell } from "../components/experience2029/Sod2029Shell.jsx";
import PostEvidenceMedia2029 from "../components/experience2029/PostEvidenceMedia2029.jsx";
import { fetchPost2029ReadingProjection, resolvePostReadingRegion, collectPostCalculationOccurrences2029, collectPostLegacyOccurrences2029, collectPostSourcePlacements2029, checkPostCalculation2029, revalidatePostMeasureSource, isPostEnglishExpression } from "../lib/research/post2029ReadingProjection.js";
import { useAuth } from "../lib/AuthContext.jsx";
import { mergeContextPackWithConnections } from "../lib/research/goldenPostPackClaims.js";
import { goldenPublicSurfaceFindings } from "../lib/research/goldenProjectorModes.js";
import { publicSurfaceFindingsFromConnections } from "../lib/research/post2029ExperienceProjection.js";
import { useResearch } from "../lib/research/ResearchProvider.jsx";
import { applySeo } from "../lib/seo.js";
import { publicPostHref, publicPostUnitHref, exactPostReadingHref } from "../lib/publicPostUrls.js";
import { publicPostLinkedMedia, legacySourcePath } from "../lib/research/publicPostSourceLinks2029.js";
import { postActionTarget2029, postActionUnits2029 } from "../lib/research/postActionTarget2029.js";
import { logView, logActivity } from "../lib/supabase.js";
import { track } from "../lib/tracking.js";
import { humanContentTitle } from "../lib/presentation/contentTitle.js";
import { bilingualDateLabel } from "../lib/relativeTime2029.js";
import { provenSourceUpdatesFor, provenUpdateForHash, addedDateLabel } from "../lib/research/postSourceUpdates2029.js";
import { postVoiceFor } from "../lib/postVoice2029.js";
import { postArticleSourceHtml2029, postArticleSourceKey2029 } from "../lib/research/postArticlePipeline2029.js";
import { postImageRenditionSet2029, postReadingCoverYieldsToVideo2029, POST_COVER_IMAGE_SIZES } from "../lib/research/postArticleCore2029.js";
import { postArticleByline2029 } from "../lib/research/postArticleDocument2029.js";
import { POST_ARTICLE_DOCUMENT_ID, documentArticleFor, documentImageFactsFor, documentArticleBodyMatches, readingPlace2029, samePlaceInPage2029, keepReaderInPlace2029, suspendScrollAnchoring2029 } from "../lib/research/postArticleAdoption2029.js";
import { resolveUnitMessage, subscribeUnitChoices } from "../lib/research/postSemanticDesign2029.js";
import { realityMapExperienceFor, realityMapPreviewEnabled } from "../lib/research/realityMap2029.js";
import PostSemanticLegend2029 from "../components/experience2029/PostSemanticLegend2029.jsx";
import { usePostOutline2029 } from "../lib/research/postOutlineDom2029.js";
import { markSeen } from "../lib/homeMotion2029.js";
import { seriesLatestSeenKey } from "../lib/nowPublications2029.js";
import { contentSeriesKeysForPost } from "../lib/research/contentSeries2029Identity.js";
import { previewUnitIdsFor } from "../lib/research/postPreviewUnits2029.js";
import PublishedUnitTraces2029 from "../components/experience2029/PublishedUnitTraces2029.jsx";
import { mapIntegrationReview } from "../lib/research/mapIntegrationReviewStorage.js";
import { parseNumberExpressionFocus } from "../lib/research/numberExpressionFocus.js";
import { electionsUnitTimelineHtml2029 } from "../lib/research/electionsUnitTimelinePreview2029.js";
import { compactMapUnitHtml, mapLeadId, mapUnitReading, mapWorldHref } from "../lib/research/mapUnitReading2029.js";
import { buildPostUnitModels } from "../lib/research/postUnitModel2029.js";
import { setPostUnits, setActivePostUnit, clearPostUnits, unitContextStrings } from "../lib/research/postUnitStore2029.js";
const PostExternalSourcesPreview2029 = React.lazy(() => import("../components/experience2029/PostExternalSourcesPreview2029.jsx"));
import CanonicalMediaFigure2029 from "../components/experience2029/CanonicalMediaFigure2029.jsx";
import PostCategories2029 from "../components/experience2029/PostCategories2029.jsx";
import { postClassification2029, postHierarchyContext2029, postContentEntry2029 } from "../lib/research/postsCatalog2029Projection.js";
import { publicPostCommentArchiveId } from "../components/experience2029/postComments2029.js";
import { postCharacterFor, matrixOpeningFor } from "../lib/postCharacters2029.js";
import { postBackground2029 } from "../lib/research/postBackground2029.js";
import { postsTaxonomyScope2029 } from "../lib/research/postsTaxonomy2029Route.js";
import { canonicalPostCategories } from "../lib/postCategoryIdentity.js";
import { previewPostMedia2029, previewPostSourceLinks2029 } from "../lib/research/postDesignPreview2029.js";
import { postReadingClassName } from "./postReadingStyles2029.js";

import AdSlot from "../components/AdSlot.jsx";
import { NUMBER_PAGE_BASE } from "../lib/research/numberPageAddress.js";
const normalize = (value) => String(value || "")
  .replace(/[״"']/g, "")
  .replace(/\s+/g, " ")
  .trim();

// The post's own cover (posts.image_url) is not a gallery row, so it carries no media identity.
// Sharp reading image = image_url; thumb_url is preview-only and is never used as the reading cover.
export function postReadingCoverItem(post) {
  const imageUrl = typeof post?.image_url === "string" ? post.image_url.trim() : "";
  if (!imageUrl) return null;
  const thumbUrl = typeof post?.thumb_url === "string" && post.thumb_url.trim() ? post.thumb_url.trim() : imageUrl;
  return {
    mediaId: "", galleryImageId: "", label: humanContentTitle(post.title, { max: 0 }),
    imageUrl, thumbUrl,
    intrinsic: { galleryImageId: null, mediaId: null, representation: { imageUrl, thumbUrl, fit: "preserve-whole-image" } },
  };
}

function revealReadingAnchor(node) {
  for (let parent = node?.parentElement; parent; parent = parent.parentElement) {
    if (parent.tagName === "DETAILS") parent.open = true;
  }
  return node;
}

// Stays with the page: it shares its number signals with the System Frame, and splitting it would move them into the frame every page loads
// (measured with the shell budget, 16.11.2026). It renders only once the research section is opened.
import PostConvergenceMeasures2029 from "../components/experience2029/PostConvergenceMeasures2029.jsx";
const SourceLightbox = React.lazy(() => import("../components/Lightbox.jsx"));

// The tools around the article load when they are used (OLD_POST_ARTICLE_FIRST, ZURIEL 16.11.2026: "the article first, the tools on request";
// hiding them is not enough). The article, its title, credit, date, cover and categories stay in this page's code.
// On open: the code loads when the tool is rendered (an opened research section, an opened details panel, the series-only editors).
// On approach: below the article, the code loads when the reader comes within a screen and a half of it. Both show the live loading state.
function toolOnOpen2029(load, title = null) {
  const Tool = React.lazy(load);
  return function ToolOnOpen(props) {
    return <React.Suspense fallback={title ? <FrameState kind="loading" title={title} progress={{ compact: true }} /> : null}><Tool {...props} /></React.Suspense>;
  };
}
function toolOnApproach2029(load, title) {
  const Tool = toolOnOpen2029(load, title);
  return function ToolOnApproach(props) {
    const ref = useRef(null);
    const [near, setNear] = useState(() => typeof IntersectionObserver === "undefined");
    useEffect(() => {
      if (near || !ref.current) return undefined;
      const observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) { setNear(true); observer.disconnect(); } }, { rootMargin: "150% 0px" });
      observer.observe(ref.current);
      return () => observer.disconnect();
    }, [near]);
    return near ? <Tool {...props} /> : <div ref={ref} data-tool-on-approach="pending" aria-hidden="true" />;
  };
}
// The timeline lives inside "מקורות וקשרים": it loads when that section is opened (as its measures do), or when the address points at it.
const PostTimeline2029 = toolOnOpen2029(() => import("../components/experience2029/PostTimeline2029.jsx"), "טוען את ציר הזמן");
const PostFollowBox = toolOnApproach2029(() => import("../components/PostFollowBox.jsx"), "טוען את המעקב");
const MapUnitContextReview = mapIntegrationReview
  ? toolOnOpen2029(() => import("../components/experience2029/MapUnitContext2029.jsx")) : null;
const discussionReviewEnabled = mapIntegrationReview || import.meta.env.DEV && import.meta.env.VITE_POST_DISCUSSION_REVIEW === "true";
const PostDiscussionReview2029 = discussionReviewEnabled
  ? toolOnOpen2029(() => import("../components/experience2029/PostDiscussionReview2029.jsx")) : null;
const PostComments2029 = toolOnApproach2029(() => import("../components/experience2029/PostComments2029.jsx"), "טוען את התגובות");
const PostReadingActions2029 = toolOnOpen2029(() => import("../components/experience2029/PostReadingActions2029.jsx"), "טוען פעולות");
const PostUnitEditors2029 = toolOnOpen2029(() => import("../components/experience2029/PostUnitEditors2029.jsx"));
const PreviewUnitExtras2029 = toolOnOpen2029(() => import("../components/experience2029/PreviewUnitExtras2029.jsx"));
const MatrixRain = toolOnOpen2029(() => import("../components/MatrixRain.jsx"));

function PostReadingBody({ resolvedSlug = null, sourceReader = null }) {
  const { slug: routeSlug } = useParams();
  const slug = resolvedSlug || routeSlug;
  const location = useLocation();
  const shell = use2029Shell();
  const research = useResearch();
  const latestResearchRef = useRef(research); latestResearchRef.current = research;   // the latest context for effects that must not write from a stale render
  const { user, isAdmin } = useAuth();
  // Prototype layers (semantic design, updates first, voice finish). ?proto=0 shows the page exactly as before; ?proto=sources adds sample source units.
  const protoMode = new URLSearchParams(location.search).get("proto");
  const protoOn = protoMode !== "0";
  const [sourceMediaOpen, setSourceMediaOpen] = useState(null);
  const [sourceMediaMissing, setSourceMediaMissing] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);
  const [measureSource, setMeasureSource] = useState({ claims: [], placements: [] });
  const [calculationNotice, setCalculationNotice] = useState(null);
  const [calculationFeedbackHost, setCalculationFeedbackHost] = useState(null);
  const [explorationOccurrence, setExplorationOccurrence] = useState(null);
  const calculationRequest = useRef(0);
  const sourceRef = useRef(null);
  const sourcePointerActive = useRef(false);
  const researchRef = useRef(null);
  const [researchOpen, setResearchOpen] = useState(false);
  const [researchStarted, setResearchStarted] = useState(false);
  const connectionsHeadingRef = useRef(null);
  const explicitGematriaFocusRef = useRef(null);
  const entryRef = useRef(null);
  const recordedContentEntry = useRef(null);
  entryRef.current = { context: research.context, hash: location.hash };
  const restoredRegionRef = useRef(null);
  const [discussionDraft, setDiscussionDraft] = useState(null);
  const [state, setState] = useState({ loading: true, projection: null, error: null });
  const postVoice = postVoiceFor(state.projection?.post).voice;
  // The flagship series experience (ZURIEL 12.11.2026): exact series tag, or the preview-only acceptance exception for 5107 / 5112.
  const realityMap = realityMapExperienceFor(state.projection?.post);
  // Preview-only demonstration of the admin editor where no admin can sign in: it grants nothing (no write path exists; the choice stays in
  // this browser, and Raziel keeps its own admin lock). Production builds never set the preview flag.
  const editorEnabled = realityMap.active && (isAdmin === true || (realityMapPreviewEnabled() && protoMode === "admin"));
  const [prefsTick, setPrefsTick] = useState(0);
  useEffect(() => subscribeUnitChoices(() => setPrefsTick((n) => n + 1)), []);
  const imageFacts = documentImageFactsFor(state.projection?.post?.id);   // the widths the first document was built with, if any
  const passiveSourceHtml = useMemo(() => {
    // The one article pipeline, shared with the first document (postArticlePipeline2029.js).
    const html = postArticleSourceHtml2029(state.projection?.post?.content || "", { postId: state.projection?.post?.id, voice: postVoice, annotate: protoOn, cover: state.projection?.post?.image_url || "", facts: imageFacts });
    if (import.meta.env.VITE_REALITY_MAP_PREVIEW !== "true" || !protoOn || !realityMap.active || editorEnabled) return html;
    if (mapIntegrationReview && Number(state.projection?.post?.id) === mapLeadId) return electionsUnitTimelineHtml2029(html);
    return compactMapUnitHtml(html, state.projection?.post?.id);
  }, [realityMap.active, editorEnabled, state.projection?.post?.content, state.projection?.post?.id, state.projection?.post?.image_url, postVoice, protoOn, imageFacts]);

  // The first-document article (OLD_POST_ARTICLE_FIRST, ZURIEL 16.11.2026): adopt its body nodes instead of rendering the article a second
  // time, only when they are exactly this page's article; the reader stays on the same place. Otherwise this page's article replaces it once.
  const adoptionRef = useRef(null);   // { id, html, node } once adopted; the adopted nodes stay until the article itself changes
  const documentArticle = useMemo(() => {
    const projection = state.projection;
    if (!projection?.post) return null;
    const adopted = adoptionRef.current;
    if (adopted) return adopted.id === String(projection.post.id) && adopted.html === passiveSourceHtml ? adopted.node : null;
    const node = documentArticleFor(projection.post.id);
    if (!node) return null;
    if (node.dataset.ssrSource !== postArticleSourceKey2029(projection.sourcePost?.content)) { node.dataset.ssrResult = "source-differs"; return null; }
    if (!documentArticleBodyMatches(node.querySelector('[data-ssr-body="true"]'), passiveSourceHtml)) { node.dataset.ssrResult = "output-differs"; return null; }
    return node;
  }, [state.projection, passiveSourceHtml]);
  useLayoutEffect(() => {
    const node = documentArticle, target = sourceRef.current;
    if (!node || !node.isConnected || !target || target.childNodes.length) return;
    const place = readingPlace2029(node, location.hash);
    const resume = suspendScrollAnchoring2029();
    adoptionRef.current = { id: node.dataset.ssrPost, html: passiveSourceHtml, node };
    target.append(...node.querySelector('[data-ssr-body="true"]').childNodes);
    node.remove();   // the app root's height hold ends with it (CSS :has)
    target.dataset.articleFirst = "adopted";
    const report = window.__sodArticleFirst = { result: "adopted", at: Math.round(performance.now()), place: place?.kind || null, compensated: null };
    keepReaderInPlace2029(place, samePlaceInPage2029(place, target.closest("article"), target), { resume, settled: moved => { report.compensated = moved; } });
  }, [documentArticle]);
  useLayoutEffect(() => {
    const leftover = document.getElementById(POST_ARTICLE_DOCUMENT_ID), target = sourceRef.current;
    if (!leftover || documentArticle || !target || !target.childNodes.length) return;
    const place = readingPlace2029(leftover, location.hash);
    const result = leftover.dataset.ssrResult || "not-adopted";
    const resume = suspendScrollAnchoring2029();
    leftover.remove();
    const report = window.__sodArticleFirst = { result: "replaced", reason: result, at: Math.round(performance.now()), place: place?.kind || null, compensated: null };
    keepReaderInPlace2029(place, samePlaceInPage2029(place, target.closest("article"), target), { resume, settled: moved => { report.compensated = moved; } });
  });
  // The page's own live read decides (post document freshness, ZURIEL 17.11.2026). When it answers that the Post is not public — hidden,
  // deleted or moved after the document was made; a document the CDN kept can be older than that change — the document's article is
  // withdrawn and the reader sees the page's own "not found" state, never the old article. Only when the read itself failed (the database
  // could not be asked) does the reader keep the article the server already gave; the app root is then released so the page's own state
  // shows above it. A page that is left never keeps the document article.
  useEffect(() => {
    const node = document.getElementById(POST_ARTICLE_DOCUMENT_ID);
    if (!node || state.loading || state.projection) return;
    if (state.notPublic) {
      node.remove();
      window.__sodArticleFirst = { result: "replaced", reason: "not-public", at: Math.round(performance.now()), place: null, compensated: null };
      return;
    }
    node.dataset.ssrStandalone = "true";
  }, [state.loading, state.projection, state.notPublic]);
  useEffect(() => () => { if (!adoptionRef.current) document.getElementById(POST_ARTICLE_DOCUMENT_ID)?.remove(); }, []);
  const [activeRegionId, setActiveRegionId] = useState(null);
  const [sourceUpdates, setSourceUpdates] = useState([]);

  useEffect(() => {
    let live = true;
    explicitGematriaFocusRef.current = null;
    ++calculationRequest.current;
    setMeasureSource({ claims: [], placements: [] });
    setCalculationNotice(null);
    setExplorationOccurrence(null);
    setResearchOpen(false);
    setResearchStarted(false);
    restoredRegionRef.current = null;
    setState({ loading: true, projection: null, error: null });
    fetchPost2029ReadingProjection(slug, sourceReader && reloadTick === 0 ? { readPost: sourceReader } : {})
      .then((projection) => {
        if (!live) return;
        setState({
          loading: false,
          projection,
          error: projection ? null : "הפוסט לא נמצא",
          notPublic: !projection,   // a valid answer: this address is not a public Post now (a failed read throws and is caught below)
        });
        const restored = resolvePostReadingRegion(projection, entryRef.current?.context, entryRef.current?.hash);
        restoredRegionRef.current = restored;
        setActiveRegionId(restored || projection?.defaultRegionId || null);
      })
      .catch((error) => {
        if (live) setState({ loading: false, projection: null, error: error?.message || "טעינת הפוסט נכשלה" });
      });
    return () => { live = false; ++calculationRequest.current; };
  }, [slug, user?.id, reloadTick, sourceReader]);

  useEffect(() => {
    if (!state.projection?.post) return;
    const projection = state.projection;
    applySeo({
      title: projection.post.title,
      description: projection.excerpt,
      path: publicPostHref(projection.sourcePost || projection.post),
      type: "article",
      noindex: projection.draft || projection.privateStage || projection.previewSnapshot,
    });
  }, [state.projection]);

  useEffect(() => {
    const projection = state.projection;
    const post = projection?.post;
    if (!post?.slug || projection.draft || projection.privateStage || projection.previewSnapshot) return;
    // Reuse the legacy sinks so 2029 readings count toward the same hot-post
    // view meter and signed-in reading history. logView deduplicates per session.
    void logView("post", post.slug, post.id);
    void logActivity("post", post.slug, post.title);
    // Preserve the old view/history sinks. One additional route-open carries
    // public series context through the same telemetry owner, without a new
    // visitor id, source read, preference, or automatic research/model call.
    if (import.meta.env.VITE_INTEGRATED_PREVIEW === "true" || recordedContentEntry.current === String(post.id)) return;
    const event = postContentEntry2029({ post: projection.sourcePost });
    if (event) {
      recordedContentEntry.current = String(post.id);
      track(event.section, event.slug, event.eventType, event.meta);
    }
  }, [state.projection]);

  useEffect(() => {
    if (state.loading || state.projection) return;
    applySeo({
      title: "הפוסט לא נמצא",
      description: "המקור המבוקש אינו זמין ב-SOD1820.",
      path: location.pathname,
      noindex: true,
    });
  }, [state.loading, state.projection, slug]);

  const previewSourceLinks = useMemo(() => mapIntegrationReview ? previewPostSourceLinks2029(passiveSourceHtml) : [], [passiveSourceHtml]);
  const regions = state.projection?.regions || [];
  const activeFocus = useMemo(
    () => regions.find((region) => region.id === activeRegionId) || regions[0] || null,
    [regions, activeRegionId],
  );
  const activeRegionFocus = activeFocus;
  // ONE two-level outline of the Post (sections → units / sub-headings) read from the rendered Post; a hand-written reading-region list (the flight Post, the golden Post) still wins
  const { outline: postOutline, activeId: activeOutlineId } = usePostOutline2029(sourceRef, `${state.projection?.post?.id || ""}|${passiveSourceHtml.length}`);
  const previewUnits = useMemo(() => mapIntegrationReview ? postActionUnits2029(state.projection?.post, sourceRef.current) : [],
    [state.projection?.post, postOutline]);
  const useOutline = postOutline.length > 0 && regions.length <= 1;
  // a Post with hand-written reading regions AND a stack of proven updates keeps its regions and gets "מה התחדש" (with its units) in front of them
  const outlineUpdates = postOutline.filter((item) => item.id === "post-updates" || item.parentId === "post-updates");
  const mergedUpdates = !useOutline && regions.length > 1 && outlineUpdates.length > 1;
  const commentArchiveId = publicPostCommentArchiveId(state.projection);

  useEffect(() => {
    const root = sourceRef.current;
    const cover = typeof state.projection?.post?.image_url === "string"
      ? state.projection.post.image_url.trim().split("?")[0] : "";
    if (!root || !cover) return;
    const first = root.querySelector("img");
    if (!first || (first.getAttribute("src") || "").trim().split("?")[0] !== cover) return;
    const wrap = first.parentElement !== root && first.parentElement?.children.length === 1
      && !first.parentElement.textContent.trim() ? first.parentElement : first;
    wrap.setAttribute("data-duplicate-cover", "true");
  }, [state.projection]);

  useEffect(() => {
    const params=new URLSearchParams(location.search), requested=params.get("sourceAttachment");
    setSourceMediaOpen(null);setSourceMediaMissing(false);
    if(!params.has("sourceAttachment")||!state.projection||!sourceRef.current)return;
    const binding=params.getAll("sourceAttachment").length===1?publicPostLinkedMedia(state.projection.post.content,requested):null;
    if(!binding){setSourceMediaMissing(true);return;}
    const anchor=[...sourceRef.current.querySelectorAll("a[href]")].find(a=>legacySourcePath(a.getAttribute("href"))===binding.sourcePath && a.querySelector("img")?.getAttribute("src")===binding.href);
    if(!anchor){setSourceMediaMissing(true);return;}
    const originalHref=anchor.getAttribute("href"), originalTabIndex=anchor.getAttribute("tabindex");
    anchor.dataset.legacyAttachmentFocus="true";anchor.tabIndex=-1;
    anchor.href=binding.href;anchor.dataset.sourceAttachment=binding.sourcePath;
    const hidden=[...new Set([anchor.closest('[data-duplicate-cover="true"]'),...anchor.querySelectorAll('[data-duplicate-cover="true"]')].filter(Boolean))];
    hidden.forEach(node=>node.removeAttribute("data-duplicate-cover"));
    let frame=null,released=Boolean(location.hash),observer=null,timer=null;
    const release=()=>{released=true;observer?.disconnect();};
    const land=()=>{
      if(released||frame!=null)return;
      frame=requestAnimationFrame(()=>{frame=null;if(!released)anchor.scrollIntoView({block:"center",behavior:"instant"});});
    };
    if(!released){
      anchor.focus({preventScroll:true});land();
      observer=typeof ResizeObserver!=="undefined"?new ResizeObserver(land):null;
      observer?.observe(sourceRef.current);
      sourceRef.current.addEventListener("load",land,true);
      timer=setTimeout(release,5000);
      for(const event of ["wheel","touchstart","pointerdown","keydown"])window.addEventListener(event,release,{passive:true,once:true});
    }
    const root=sourceRef.current;
    return () => {
      release();if(frame!=null)cancelAnimationFrame(frame);clearTimeout(timer);
      root.removeEventListener("load",land,true);
      for(const event of ["wheel","touchstart","pointerdown","keydown"])window.removeEventListener(event,release);
      anchor.setAttribute("href",originalHref);
      if(originalTabIndex==null)anchor.removeAttribute("tabindex");else anchor.setAttribute("tabindex",originalTabIndex);
      delete anchor.dataset.legacyAttachmentFocus;delete anchor.dataset.sourceAttachment;
      hidden.forEach(node=>node.setAttribute("data-duplicate-cover","true"));
    };
  },[state.projection,location.search,location.hash]);

  useEffect(() => {
    const reveal = targetId => {
      const target = targetId ? document.getElementById(targetId) : null;
      if (target && researchRef.current?.contains(target)) revealReadingAnchor(target);
    };
    let targetId = "";
    try { targetId = decodeURIComponent((location.hash || "").replace(/^#/, "")); } catch { /* A malformed URL fragment has no target. */ }
    reveal(targetId);
  }, [location.hash, state.projection]);

  // Entering a reality-map Post settles the "latest update" dot in "עכשיו" for this viewer (the existing per-browser seen state; a newer registered unit makes it blink again).
  useEffect(() => {
    const post = state.projection?.sourcePost || state.projection?.post;
    if (post?.id && contentSeriesKeysForPost(post).includes("reality-map")) markSeen(seriesLatestSeenKey(`post:${post.id}`));
  }, [state.projection?.sourcePost, state.projection?.post?.id]);

  useEffect(() => {
    setSourceUpdates(state.projection ? provenSourceUpdatesFor(state.projection.post?.id, sourceRef.current) : []);
  }, [state.projection]);

  // Series Posts publish their units (identity + references) for the left panel and, as plain strings, on the existing research context.
  useEffect(() => {
    const root = sourceRef.current, projection = state.projection;
    if (!protoOn || !realityMap.active || !root || !projection) {
      clearPostUnits();
      // leaving a series Post must not leave its unit references in the shared Research Context (a stale selection from the previous Post)
      const staleDims = research.context?.dimensions || {};
      if (staleDims.postUnitSeries || staleDims.activeUnitRef) research.updateResearchContext?.({ dimensions: { postUnitSeries: "", postUnitRefs: [], postUnitLinkRefs: [], activeUnitRef: "", activeUnitLabel: "" } });
      return undefined;
    }
    const post = projection.post;
    const units = buildPostUnitModels(root, { post, postHref: publicPostHref(post) });
    setPostUnits(post.id, units);
    const strings = unitContextStrings(units);
    const dims = research.context?.dimensions || {};
    if (dims.postUnitSeries !== "reality-map" || JSON.stringify(dims.postUnitRefs) !== JSON.stringify(strings.postUnitRefs)
      || JSON.stringify(dims.postUnitLinkRefs) !== JSON.stringify(strings.postUnitLinkRefs)) {
      research.updateResearchContext?.({ dimensions: { postUnitSeries: "reality-map", ...strings } });   // a partial write: the context merges it, so the active unit and the tree are not overwritten
    }
    return undefined;
  }, [state.projection, passiveSourceHtml, prefsTick, realityMap.active, protoOn]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => clearPostUnits(), []);
  // The ACTIVE unit of the Post (one identity: post > unit > item). It is written into the shared Research Context (`activeUnitRef`, `activeUnitLabel`) so the top bar,
  // the tree, the sheets and the projector read ONE selection.
  //   · reading position: the unit holding the line at 38% of the viewport (the first one above it otherwise);
  //   · a unit LINK (?unit=<id>) or a tree row the person pressed is an OPENING INTENT: it holds the active unit until the person scrolls by hand (wheel / touch / keys),
  //     so the reading line never fights the jump and the jump never overwrites a deliberate choice; after the first manual scroll the reading position takes over again.
  // The URL is the opening intent and the history entry, not a rule that the unit is always taken from it.
  useEffect(() => {
    const root = sourceRef.current;
    if (!protoOn || !realityMap.active || !root) return undefined;
    let frame = 0, last = null;
    const unitById = (id) => (id ? [...root.querySelectorAll("[data-sod-unit]")].find((unit) => unit.getAttribute("data-sod-unit") === id) || null : null);
    const wanted = new URLSearchParams(location.search).get("unit");
    let held = wanted || null;      // the unit link is an intent even before its unit is in the page (Preview units are injected after the first render)
    const labelOf = (unit) => (unit.querySelector("[data-sod-role='title'], h2, h3")?.textContent || unit.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim().slice(0, 80);
    const publish = (unit) => {
      const id = unit ? unit.getAttribute("data-sod-unit") : "";
      if (id === last) return;
      last = id;
      if (id) setActivePostUnit(id);
      latestResearchRef.current.updateResearchContext?.({ dimensions: { activeUnitRef: id, activeUnitLabel: unit ? labelOf(unit) : "" } });
    };
    const pick = () => {
      frame = 0;
      if (held) { const heldUnit = unitById(held); if (heldUnit) publish(heldUnit); return; }   // a held unit that is not in the page yet: wait for it, do not guess another
      const line = window.innerHeight * 0.38;
      let best = null;
      for (const unit of root.querySelectorAll("[data-sod-unit]")) {
        if (!unit.getClientRects().length) continue;
        const box = unit.getBoundingClientRect();
        if (box.top <= line && box.bottom >= line) { best = unit; break; }
        if (box.top <= line) best = unit;
      }
      publish(best);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(pick); };
    const release = () => { if (held) { held = null; schedule(); } };
    const onKey = (event) => { if (["PageDown", "PageUp", "ArrowDown", "ArrowUp", "Home", "End", " "].includes(event.key)) release(); };
    // a press on a tree row that points at a unit selects that unit
    const onRowPress = (event) => {
      const row = event.target?.closest?.("[data-context-map-item]");
      if (!row) return;
      const target = document.getElementById(row.getAttribute("data-context-map-item"));
      const unit = target?.matches?.("[data-sod-unit]") ? target : target?.closest?.("[data-sod-unit]");
      if (unit && root.contains(unit)) { held = unit.getAttribute("data-sod-unit"); schedule(); }
      else if (held) { held = null; schedule(); }   // a row for another part of the Post: the person chose something else
    };
    // a unit that appears later (injected / hydrated) is picked up without a scroll
    const watcher = typeof MutationObserver === "function" ? new MutationObserver((mutations) => {
      if (mutations.some((m) => [...m.addedNodes].some((n) => n.nodeType === 1 && (n.matches?.("[data-sod-unit]") || n.querySelector?.("[data-sod-unit]"))))) schedule();
    }) : null;
    watcher?.observe(root, { childList: true, subtree: true });
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("wheel", release, { passive: true });
    window.addEventListener("touchmove", release, { passive: true });
    window.addEventListener("keydown", onKey);
    document.addEventListener("click", onRowPress, true);
    pick();
    return () => {
      window.removeEventListener("scroll", schedule); window.removeEventListener("wheel", release); window.removeEventListener("touchmove", release);
      window.removeEventListener("keydown", onKey); document.removeEventListener("click", onRowPress, true);
      watcher?.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [state.projection, passiveSourceHtml, realityMap.active, protoOn, location.search]);

  const jumpToSourceUpdate = (entry) => {
    const target = sourceRef.current?.querySelector(`[id="${entry.targetId}"]`);
    if (!target) return;
    revealReadingAnchor(target);
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    // Exact entry survives refresh/share: the hash names the source unit.
    try { window.history.replaceState(window.history.state, "", `${location.pathname}${location.search}#${encodeURIComponent(entry.targetId)}`); } catch { /* hash is a convenience */ }
    target.setAttribute("tabindex", "-1");
    target.focus?.({ preventScroll: true });
    target.classList.add("sod29-update-target");
    window.setTimeout(() => target.classList.remove("sod29-update-target"), 2600);
  };

  useEffect(() => {
    // Native hash entry (refresh / shared link) into a proven source unit: land exactly on it.
    const entry = state.projection ? provenUpdateForHash(state.projection.post?.id, location.hash) : null;
    const root = sourceRef.current;
    const target = entry && root ? root.querySelector(`[id="${entry.targetId}"]`) : null;
    if (!target) return undefined;
    let frame = null;
    let released = false;
    const land = () => {
      if (released) return;
      revealReadingAnchor(target);
      target.scrollIntoView({ behavior: "instant", block: "start" });
    };
    land();
    target.setAttribute("tabindex", "-1");
    target.focus?.({ preventScroll: true });
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => {
      if (frame != null) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(land);
    });
    observer?.observe(root);
    const release = () => { released = true; observer?.disconnect(); };
    const events = ["wheel", "touchstart", "pointerdown", "keydown"];
    for (const name of events) window.addEventListener(name, release, { passive: true, once: true });
    return () => { release(); if (frame != null) cancelAnimationFrame(frame); for (const name of events) window.removeEventListener(name, release); };
  }, [state.projection, location.hash]);

  useEffect(() => {
    const id = new URLSearchParams(location.search).get("passage");
    const post = state.projection?.sourcePost;
    const root = sourceRef.current;
    if (!id || !post || !root) return undefined;
    let active = true;
    let target;
    let previousId;
    let previousTabIndex;
    let observer;
    let frame;
    let released = false;
    const release = () => {
      released = true;
      observer?.disconnect();
      if (frame != null) cancelAnimationFrame(frame);
    };
    const events = ["wheel", "touchstart", "pointerdown", "keydown"];
    Promise.all([
      import("../lib/research/contributorSourcePassages.js"),
      import("../lib/research/researchViewMode.js"),
    ]).then(async ([passages, { getPublicResearchClient }]) => {
      const anchor = passages.signedPassageAnchor(id);
      if (!active || !anchor || location.hash !== `#${anchor}`) return;
      const passage = await passages.fetchSignedSourcePassage(getPublicResearchClient(), id, "posts");
      if (!active || !passage || String(post.id) !== passage.ref.sourceId || post.content !== passage.source.content) return;
      const match = await passages.findSignedPostByline(root, passage.ref.locator);
      if (!active || !match || document.getElementById(anchor)) return;
      target = match.node;
      previousId = target.getAttribute("id");
      previousTabIndex = target.getAttribute("tabindex");
      if (!previousId) target.id = anchor;
      revealReadingAnchor(target);
      target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
      const land = () => { if (!released) target.scrollIntoView({ behavior: "instant", block: "center" }); };
      land();
      if (typeof ResizeObserver !== "undefined") {
        observer = new ResizeObserver(() => {
          if (frame != null) cancelAnimationFrame(frame);
          frame = requestAnimationFrame(land);
        });
        observer.observe(root);
        for (const name of events) window.addEventListener(name, release, { passive: true, once: true });
      }
    }).catch(() => { /* The original article remains readable if the reference is unavailable. */ });
    return () => {
      active = false;
      release();
      for (const name of events) window.removeEventListener(name, release);
      if (!target) return;
      if (!previousId) target.removeAttribute("id");
      if (previousTabIndex == null) target.removeAttribute("tabindex");
      else target.setAttribute("tabindex", previousTabIndex);
    };
  }, [state.projection, location.search, location.hash]);

  useEffect(() => {
    // The hero owns the page h1. An authored h1 inside the source stays in the
    // DOM and text is untouched; it is exposed as a level-2 heading, and when it
    // only repeats the hero title it is visually collapsed (still readable by AT).
    const root = sourceRef.current;
    if (!state.projection || !root) return;
    const heroTitle = normalize(humanContentTitle(state.projection.post?.title, { max: 0 }));
    for (const heading of root.querySelectorAll("h1")) {
      heading.setAttribute("role", "heading");
      heading.setAttribute("aria-level", "2");
      heading.setAttribute("data-source-title", normalize(heading.textContent) === heroTitle ? "duplicate" : "own");
    }
  }, [state.projection]);

  useEffect(() => {
    if (!state.projection || !sourceRef.current || !regions.length) return undefined;
    // Existing authored gematria markings remain the actionable unit. Make
    // non-link legacy markings keyboard reachable without rewriting the source.
    for (const node of sourceRef.current.querySelectorAll("[data-gem],[data-expression]")) {
      if (/^\d[\d,]*$/.test(String(node.textContent || "").trim())) node.classList.add("sod-numlink");
      if (!node.matches("a[href],button") && !node.closest("a[href],button")) {
        node.setAttribute("role", "button");
        node.tabIndex = 0;
      }
    }
    // Authored legacy number links use the same in-place Number capability.
    // Keep their href for ordinary modified-click navigation and copying.
    for (const link of sourceRef.current.querySelectorAll('a[href^="/number/"]')) {
      if (link.hasAttribute("data-gem") || link.hasAttribute("data-elections-calculation")) continue;
      try {
        const term = decodeURIComponent(link.getAttribute("href").slice("/number/".length).split(/[?#]/)[0]).trim();
        if (term) {
          link.dataset.gem = term;
          link.dataset.postNumberLink = "true";
          if (/^\d[\d,]*$/.test(String(link.textContent || "").trim())) link.classList.add("sod-numlink");
        }
      } catch { /* Keep a malformed legacy URL unchanged. */ }
    }
    const headings = [...sourceRef.current.querySelectorAll("[data-source-heading='true']"),
      ...(connectionsHeadingRef.current ? [connectionsHeadingRef.current] : [])];
    const mapped = [];

    for (const region of regions) {
      const heading = region.id === "post-story" ? sourceRef.current
        : headings.find((node) => normalize(node.textContent) === normalize(region.heading));
      if (!heading) continue;
      heading.dataset.readingRegion = region.id;
      const presentationId = `source-region-${region.id}`;
      if (!heading.id) heading.id = presentationId;
      else if (heading.id !== presentationId && ![...sourceRef.current.querySelectorAll("[id]")].some(node => node.id === presentationId)) {
        // Preserve the author's native locator. Existing region navigation gets
        // a presentation alias, never a replacement source identity.
        const alias = document.createElement("span");
        alias.id = presentationId; alias.setAttribute("aria-hidden", "true");
        alias.dataset.postPresentationAnchor = "true";
        heading.before(alias);
      }
      mapped.push({ region, heading });
    }
    // An explicitly selected source image wins over the default story region.
    // Native author hashes still keep their existing exact-return precedence.
    const selectedSource = !location.hash && sourceRef.current.querySelector('[data-legacy-attachment-focus="true"]');
    const requestedUnit = new URLSearchParams(location.search).get("unit");
    const unitLanding = location.state?.puWhole === true || Boolean(requestedUnit && (location.hash
      || postActionUnits2029(state.projection.post, sourceRef.current).some(unit => unit.id === requestedUnit)
      || previewUnitIdsFor(state.projection.post.id).includes(requestedUnit)));
    const requested = selectedSource || unitLanding ? null : resolvePostReadingRegion(state.projection, entryRef.current?.context, location.hash);
    if(selectedSource||unitLanding)restoredRegionRef.current=null;
    const restored = mapped.find(({ region }) => region.id === requested);
    let frame = null;
    // Late source images/fonts can move an already-restored heading. Keep that
    // anchor stable only until the reader explicitly takes over scrolling/focus.
    const restoreExactAnchor = () => {
      if (!restored || restoredRegionRef.current !== restored.region.id) return;
      if (frame != null) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (restoredRegionRef.current !== restored.region.id) return;
        revealReadingAnchor(restored.heading);
        restored.heading.scrollIntoView({ behavior: "instant", block: "start" });
        restored.heading.focus({ preventScroll: true });
      });
    };
    if (restored) {
      restoredRegionRef.current = restored.region.id;
      setActiveRegionId(restored.region.id);
      restored.heading.tabIndex = -1;
      restoreExactAnchor();
    } else if (requested) {
      // A stale saved region is not proof that its source anchor still exists.
      restoredRegionRef.current = null;
      setActiveRegionId(mapped[0]?.region.id || state.projection.defaultRegionId || null);
    }
    // Programmatic restoration must not let an adjacent heading overwrite the saved
    // selection. Resume passive reading focus when the reader starts scrolling.
    const sourceResizeObserver = restored && typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(restoreExactAnchor) : null;
    sourceResizeObserver?.observe(sourceRef.current);
    const resumeReading = (event) => {
      if (event.type === "keydown" && !["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "].includes(event.key)) return;
      restoredRegionRef.current = null;
    };
    for (const event of ["wheel", "touchstart", "pointerdown", "keydown"]) window.addEventListener(event, resumeReading, { passive: true });

    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      const id = visible?.target?.dataset?.readingRegion;
      if (id && !restoredRegionRef.current) setActiveRegionId(id);
    }, { rootMargin: "-16% 0px -68% 0px", threshold: [0, 1] });

    mapped.forEach(({ heading }) => observer?.observe(heading));
    return () => {
      observer?.disconnect();
      if (frame != null) cancelAnimationFrame(frame);
      sourceResizeObserver?.disconnect();
      for (const event of ["wheel", "touchstart", "pointerdown", "keydown"]) window.removeEventListener(event, resumeReading);
    };
  }, [state.projection, regions, location.search, location.hash]);

  useEffect(() => {
    // Golden Posts only (contextPack is ID-scoped to 5112/92): a legacy body without mapped regions
    // still gets one whole-post reading focus, so the Golden layer can mount. Others are unchanged.
    const activeFocus = activeRegionFocus || (state.projection?.contextPack && state.projection?.post
      ? { id: "post-story", label: "הסיפור", primary: state.projection.post.title, signals: [], number: null }
      : null);
    if (!state.projection || !activeFocus) return;
    const post = state.projection.post;
    const currentContext = research.context || null;
    const currentSelection = currentContext?.selection || null;
    // the active unit is written only by its own effect; this writer must not carry a stale copy of it back (the context merges dimensions, so leaving the keys out keeps the latest)
    const { activeUnitRef: _unitRef, activeUnitLabel: _unitLabel, ...currentDimensions } = currentContext?.dimensions || {};
    const explicitFocus = explicitGematriaFocusRef.current;
    const samePost = currentContext?.subject?.type === "post"
      && String(currentContext.subject.id) === String(post.id);
    const contextBelongsToPost = samePost
      || String(currentDimensions?.readingFocus?.postId || "") === String(post.id)
      || (currentContext?.returnTo?.subject?.type === "post"
        && String(currentContext.returnTo.subject.id) === String(post.id));
    const contextHasExplicitFocus = contextBelongsToPost
      && currentContext?.lens === "gematria"
      && currentSelection?.entityType === "gematria_expression"
      && Boolean(currentSelection?.expression)
      && Boolean(currentSelection?.method)
      && currentSelection?.resultValue != null;
    const preserveExplicitGematriaFocus = explicitFocus?.postId === String(post.id)
      || contextHasExplicitFocus;
    const protectedSubject = explicitFocus?.subject || currentContext?.subject || null;
    const protectedSelection = explicitFocus?.selection || currentSelection;
    const protectedSurfaceFocus = explicitFocus?.surfaceFocus || currentDimensions.surfaceFocus;
    const protectedBottomTrail = explicitFocus?.bottomTrail || currentDimensions.bottomTrail;

    const passiveSelection = {
      entityId: activeFocus.id,
      entityType: "post_region",
      locator: `#source-region-${activeFocus.id}`,
    };
    const passiveTrail = [
      { id: "post", label: "פוסט" },
      { id: activeFocus.id, label: activeFocus.number ? "גימטריות" : (activeFocus.label || "הסיפור") },
      ...(activeFocus.number ? [{ id: "number", label: String(activeFocus.number), active: true }] : []),
    ];
    const passiveSurfaceFocus = {
      id: activeFocus.id,
      type: activeFocus.number ? "number" : "post_region",
      sectionLabel: activeFocus.number ? "גימטריות" : (useOutline ? (postOutline.find((item) => item.id === activeOutlineId) || postOutline[0]).label : "הסיפור"),
      label: activeFocus.primary || activeFocus.label,
      primary: activeFocus.primary,
      signals: activeFocus.signals || [],
      number: activeFocus.number || null,
      sourceLabel: state.projection.sourceLabel,
      locator: `#source-region-${activeFocus.id}`,
    };

    research.updateResearchContext?.({
      subject: preserveExplicitGematriaFocus && protectedSubject ? protectedSubject : {
        id: String(post.id),
        type: "post",
        label: post.title,
        href: publicPostHref(post),
      },
      selection: preserveExplicitGematriaFocus ? protectedSelection : passiveSelection,
      lens: preserveExplicitGematriaFocus ? "gematria" : "reading",
      dimensions: {
        ...currentDimensions,
        surfaceContextHref: location.pathname + location.search,
        readingFocusSurfaceHref: location.pathname + location.search,
        bottomTrail: preserveExplicitGematriaFocus && Array.isArray(protectedBottomTrail)
          ? protectedBottomTrail
          : passiveTrail,
        surfaceSections: useOutline ? postOutline.map(({ id, label, targetId, level, parentId }) => ({ id, label, targetId, level, parentId })) : [
          ...(mergedUpdates ? outlineUpdates.map(({ id, label, targetId, level, parentId }) => ({ id, label, targetId, level, parentId })) : []),
          ...regions.map((region) => ({
            id: region.id,
            label: region.label,
            targetId: `source-region-${region.id}`,
          })),
        ],
        activeSectionId: useOutline ? (activeOutlineId || postOutline[0].id) : (mergedUpdates && outlineUpdates.some((item) => item.id === activeOutlineId) ? activeOutlineId : activeFocus.id),
        surfaceMapLabel: "בתוך הפוסט",
        surfaceFindings: state.projection.draft || state.projection.privateStage || state.projection.previewSnapshot ? [] : post.slug === "bennett-melach-631-78"
          ? (state.projection.experience?.connections || [])
            .filter((connection) => connection.id !== "bennett-631")
            .map((connection) => ({
              id: connection.id,
              label: connection.label,
              value: connection.value,
              kind: connection.kind,
              reason: connection.reason,
              href: connection.href,
              sourceLabel: connection.provenanceLabel || connection.kind,
            }))
          : state.projection.contextPack
            // Golden Posts 5112/92 only: governed pack rows + existing connections, public layer only.
            ? goldenPublicSurfaceFindings({
              rows: mergeContextPackWithConnections(state.projection.contextPack, state.projection.experience?.connections || []),
              // The active focus is the focal object, not a "connection" to itself.
              exclude: (row) => row.id === activeFocus.id
                || (activeFocus.number != null && row.value != null && String(row.value) === String(activeFocus.number)),
            })
            : publicSurfaceFindingsFromConnections(state.projection.experience?.connections),
        surfaceFindingsState: "ready",
        surfaceFocus: preserveExplicitGematriaFocus && protectedSurfaceFocus?.type === "gematria_expression"
          ? protectedSurfaceFocus
          : passiveSurfaceFocus,
        readingFocus: {
          id: activeFocus.id,
          label: activeFocus.label,
          primary: activeFocus.primary,
          signals: activeFocus.signals || [],
          number: activeFocus.number || null,
          sourceLabel: state.projection.sourceLabel,
          postId: String(post.id),
          postSlug: post.slug,
          locator: `#source-region-${activeFocus.id}`,
        },
      },
    });
  }, [activeRegionFocus?.id, state.projection?.post?.id, Boolean(state.projection?.contextPack), location.pathname, location.search, useOutline, mergedUpdates, postOutline, activeOutlineId]);

  useEffect(() => {
    if (research.context?.subject?.type === "post" && research.context?.selection?.entityType === "post_occurrence") {
      explicitGematriaFocusRef.current = null;
    }
  }, [research.context?.subject?.type, research.context?.selection?.entityType]);

  useEffect(() => {
    const sourcePost = state.projection?.sourcePost;
    let live = true;
    setMeasureSource({ claims: [], placements: [] });
    void collectPostLegacyOccurrences2029(sourcePost, sourceRef.current).then(legacyOccurrences => {
      if (live) setMeasureSource({ legacyOccurrences,
        claims: [...collectPostCalculationOccurrences2029(sourcePost, sourceRef.current, { sourceProjection: state.projection }),
          ...legacyOccurrences.filter(row => row.method && row.value != null)],
        placements: collectPostSourcePlacements2029(sourcePost, sourceRef.current),
      });
    }).catch(() => { /* Unsupported mapping fails closed; no inferred source claim. */ });
    return () => { live = false; };
  }, [state.projection]);

  useEffect(() => {
    setCalculationFeedbackHost(null);
    return () => {
      for (const host of sourceRef.current?.querySelectorAll("[data-post-calculation-feedback]") || []) host.remove();
    };
  }, [state.projection]);

  useEffect(() => {
    // The hero's Number stage is outside sourceRef. Restore its existing
    // public anchor after async source hydration, including browser reload.
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { return undefined; }
    if (id !== "post-gematria" || !state.projection) return undefined;
    const target = document.getElementById(id);
    const root = target?.closest(".sod29-reading-post");
    if (!target || !root) return undefined;
    let released = false, frame = null;
    const land = () => {
      if (released) return;
      target.scrollIntoView({ block: "start", behavior: "instant" });
    };
    const schedule = () => {
      if (frame != null) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(land);
    };
    target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
    schedule();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedule);
    observer?.observe(root);
    const release = () => { released = true; observer?.disconnect(); };
    const events = ["wheel", "touchstart", "pointerdown", "keydown"];
    for (const name of events) window.addEventListener(name, release, { passive: true, once: true });
    return () => {
      release();
      if (frame != null) cancelAnimationFrame(frame);
      for (const name of events) window.removeEventListener(name, release);
    };
  }, [state.projection?.post?.id, location.pathname, location.search, location.hash]);

  useEffect(() => {
    // A unit link (?unit=<id>) lands on that exact unit even if the fragment was dropped by a messenger (every registered unit).
    const wanted = new URLSearchParams(location.search).get("unit");
    if (!wanted || location.hash || !state.projection || !sourceRef.current) return undefined;
    // Only a public unit with a unique anchor, or the existing preview unit, can receive focus.
    if (!postActionUnits2029(state.projection.post, sourceRef.current).some(unit => unit.id === wanted)
      && !previewUnitIdsFor(state.projection.post?.id).includes(wanted)) return undefined;
    const target = [...sourceRef.current.querySelectorAll("[id]")].find((node) => node.id === wanted);
    if (!target) return undefined;
    const frame = requestAnimationFrame(() => {
      revealReadingAnchor(target);
      target.scrollIntoView({ block: "start", behavior: "instant" });
      target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [state.projection, location.search, location.hash]);

  useEffect(() => {
    // Native IDs and snapshot-bound presentation locators survive refresh/Back.
    // Legacy locators are admitted only after mapping to the unchanged source.
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
    if (!id || id.startsWith("signed-passage-") || !state.projection || !sourceRef.current) return;
    const target = id === "post-measures" || id === "post-classification" ? document.getElementById(id)
      : [...sourceRef.current.querySelectorAll("[id]")].find(node => node.id === id);
    if (!target) return;
    revealReadingAnchor(target);
    const frame = requestAnimationFrame(() => {
      target.scrollIntoView({ block: "start", behavior: "instant" });
      if (!target.matches("button,a,input,summary")) target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [state.projection, location.hash, measureSource.legacyOccurrences]);

  if (state.loading) {
    return <FrameState kind="loading" title="פותח את המקור">המילים נשארות במרכז; שכבת ההקשר נטענת מסביבן.</FrameState>;
  }
  if (state.error || !state.projection) {
    return <FrameState kind="error" title="לא הצלחתי לפתוח את הפוסט">{state.error}<button type="button" onClick={() => setReloadTick(n => n + 1)}>ניסיון קריאה נוסף</button></FrameState>;
  }

  const { projection } = state;
  const { post } = projection;
  const postActionTarget = postActionTarget2029(projection);
  const mapUnit = mapIntegrationReview ? mapUnitReading(post.id) : null;
  const worldReturn = mapUnit && location.state?.mapWorldUnit === mapUnit.key ? mapWorldHref(mapUnit.key) : null;
  const coverYields = mapIntegrationReview ? previewPostMedia2029(post).duplicateCover : postReadingCoverYieldsToVideo2029(post);
  const coverItem = coverYields ? null : postReadingCoverItem(post);
  const character = postCharacterFor(post);
  const matrixOpening = matrixOpeningFor(post);
  const background = postBackground2029(projection.sourcePost);
  const experience = projection.experience || {};
  const isBennettMaster = post.slug === "bennett-melach-631-78";
  const isFz1073Master = post.slug === "flydubai-fz1073-363-14000-remzei-geula";
  const isElectionsMaster = post.slug === "sharshar-elections-redemption-hints-draft";
  const heroNumbers = isElectionsMaster
    ? [26, 271, 2701, 1820, 631, 66]
    : isBennettMaster
    ? [631]
    : isFz1073Master
      ? [363, 1073, 718]
      : [...new Set(
          regions.map((region) => Number(region.number)).filter((value) => Number.isSafeInteger(value) && value > 0)
        )].slice(0, 5);
  const classification = postClassification2029(projection.sourcePost);
  const heroDate = isBennettMaster
    ? "2026-10-01"
    : isFz1073Master
      ? "2026-09-30"
      : String(post.date || post.modified || "").slice(0, 10);
  const visibleSourceLabel = isBennettMaster
    ? "בנט · המשך לציר הבחירות"
    : isFz1073Master
      ? "טיסה FZ1073"
      : projection.sourceLabel;
  const visibleTimeline = (experience.timeline || []).map((item) => (
    isBennettMaster && item.id === "bennett-salt-golden"
      ? { ...item, label: "הפוסט פורסם", date: "2026-10-01", sourceLabel: null, note: "תאריך הפרסום של הפוסט.", current: true }
      : item
  ));
  const contextualConnections = (experience.connections || []).filter((connection) => connection.href);
  const connectedHrefs = new Set(contextualConnections.map(item => item.href));
  const additionalLinks = previewSourceLinks.filter(item => !connectedHrefs.has(item.href));
  const researchAnchorRequested = /^#(?:post-(?:research|sources|classification|connections|measures)|source-region-post-connections|timeline)/.test(location.hash);
  const hasResearchContent = contextualConnections.length > 0 || visibleTimeline.some(item => !item.current)
    || additionalLinks.length > 0 || measureSource.claims.length > 0
    || Boolean(experience.media?.sourceCard?.href || experience.media?.fullSource?.href);
  const previewOutline = mapIntegrationReview ? postOutline.filter(item => !["post-connections", "post-sources"].includes(item.id)) : [];
  const previewCategories = mapIntegrationReview ? canonicalPostCategories(projection.sourcePost.categories).filter(name => name !== "וידאו") : [];
  const previewTags = mapIntegrationReview ? [...new Set((projection.sourcePost.tags || [])
    .map(tag => postsTaxonomyScope2029("tag", tag)).filter(scope => scope.kind === "tag").map(scope => scope.key))] : [];
  const exactReturnForRegion = (region) => ({
    href: exactPostReadingHref(post, location, `#source-region-${region?.id || projection.defaultRegionId}`),
    label: post.title,
    subject: { id: String(post.id), type: "post", label: post.title, href: publicPostHref(post) },
    selection: region ? {
      entityId: region.id,
      entityType: "post_region",
      locator: `#source-region-${region.id}`,
    } : null,
    lens: "reading",
    dimensions: research.context?.dimensions || {},
    journey: research.context?.journey || null,
  });
  const exactReturn = exactReturnForRegion(activeFocus);
  const invalidatePostSource = status => {
    ++calculationRequest.current;
    explicitGematriaFocusRef.current = null;
    setMeasureSource({ claims: [], placements: [] });
    const dimensions = { ...(research.context?.dimensions || {}) };
    for (const key of Object.keys(dimensions)) if (key.startsWith("postClaim") || key === "postMeasureSelectedCardId") dimensions[key] = null;
    research.updateResearchContext?.({ subject: null, selection: null, returnTo: null, lens: null,
      dimensions: { ...dimensions, surfaceFocus: null, readingFocus: null,
        surfaceSections: [], surfaceFindings: [], bottomTrail: [], activeSectionId: null } });
    if (status === "source_changed") {
      setState({ loading: true, projection: null, error: null });
      setReloadTick(n => n + 1); return;
    }
    setState({ loading: false, projection: null, error: status === "source_failed"
      ? "קריאת המקור נכשלה; הנתונים הקודמים הוסתרו." : "המקור אינו זמין להצגה כעת." });
  };
  const openCheckedPostCalculation = result => {
    const { claim, focus, methodVersion } = result;
    const current = research.context || {};
    const selection = { entityId: claim.id, entityType: "gematria_expression", sourceRef: claim.sourceRef,
      locator: claim.locator, versionRef: claim.sourceVersion, expression: claim.expression,
      method: focus.method, methodVersion, resultValue: focus.resultValue, focusKind: "expression" };
    const subject = { id: String(focus.root), type: "number", label: String(focus.root), href: focus.href };
    const surfaceFocus = { id: claim.id, type: "gematria_expression", label: claim.expression,
      primary: claim.expression, expression: claim.expression, method: focus.method,
      number: focus.resultValue, resultValue: focus.resultValue, locator: claim.locator, sourceLabel: projection.sourceLabel };
    const bottomTrail = [{ id: "post", label: "פוסט" }, { id: "calculation", label: "טענת חישוב" }, { id: "number", label: String(focus.root), active: true }];
    explicitGematriaFocusRef.current = { postId: String(post.id), subject, selection, surfaceFocus, bottomTrail };
    const patch = { subject, selection, lens: "gematria", dimensions: { ...(current.dimensions || {}),
      surfaceFocus, bottomTrail, postEngineExploration: false, postClaimBinding: claim.binding, postClaimResultMatch: result.resultMatch,
      postClaimSourceRef: claim.sourceRef, postClaimSourceVersion: claim.sourceVersion,
      postClaimLocator: claim.locator, postClaimMethodVersion: methodVersion,
      postClaimSteps: result.steps, postClaimSourceMethodVersion: claim.methodVersion, postClaimLanguage: claim.lang },
      returnTo: { ...exactReturnForRegion(activeFocus), href: exactPostReadingHref(post, location, `${claim.locator}`),
        selection: { ...selection, entityType: "post_occurrence" }, lens: "reading" } };
    // Browser Back from the full Number page must name the current occurrence,
    // even when a different calculation was opened earlier in this same Post.
    try { window.history.replaceState(window.history.state, "", `${location.pathname}${location.search}${claim.locator}`); }
    catch { /* Research Context still carries the explicit return target. */ }
    // Same existing activation seam as Topic: commit rich source/version context
    // after the shared activation's generic selection, in the same React batch.
    shell.openNumber?.({ id: claim.id, type: "phrase", label: claim.expression, expression: claim.expression,
      method: focus.method, resultValue: focus.resultValue, number: focus.root,
      href: exactPostReadingHref(post, location, `${claim.locator}`), locator: claim.locator, sourceLabel: projection.sourceLabel, source: "post-exact-source-claim" });
    research.updateResearchContext?.(patch);
  };
  const openPostSourceClaim = async claim => {
    const ticket = ++calculationRequest.current;
    setExplorationOccurrence(null);
    setCalculationNotice("בודק את הביטוי, השיטה והמקור…");
    const result = await checkPostCalculation2029(projection.sourcePost, claim, {
      sourceProjection: projection, sourceDocument: sourceRef.current?.ownerDocument,
    });
    if (ticket !== calculationRequest.current) return;
    if (result.status === "incomplete_claim" && claim?.expression && claim?.locator) setExplorationOccurrence(claim);
    if (result.status.startsWith("source_")) { invalidatePostSource(result.status); return; }
    if (result.status !== "ready") { setCalculationNotice(result.status === "incomplete_claim"
      ? "להופעה הזאת אין ביטוי, שיטה ותוצאה מתועדים במלואם. לא נבחרה שיטה אוטומטית."
      : result.status === "mismatch"
        ? "התוצאה במקור אינה תואמת לתוצאת המנוע בשיטה המתועדת. לא נבחרה שיטה חלופית."
        : "לא ניתן לפתוח את הטענה בשיטה ובגרסה שנבחרו. אין מעבר לשיטה חלופית."); return; }
    setCalculationNotice(null); openCheckedPostCalculation(result);
  };
  const openPostEngineExploration = async candidate => {
    const occurrence = candidate?.binding ? candidate : explorationOccurrence;
    if (!occurrence) return;
    const ticket = ++calculationRequest.current;
    const access = await revalidatePostMeasureSource(projection.sourcePost);
    if (ticket !== calculationRequest.current) return;
    if (access.status !== "ready") { invalidatePostSource(access.status); return; }
    const source = [...(sourceRef.current?.querySelectorAll("[id]") || [])].find(node => `#${node.id}` === occurrence.locator);
    if (!source) return;
    if (occurrence.binding === "saved_legacy_marking" && source.getAttribute("data-gem") !== occurrence.expression) return;
    const dimensions = { ...(research.context?.dimensions || {}) };
    for (const key of Object.keys(dimensions)) if (key.startsWith("postClaim")) dimensions[key] = null;
    const selection = { entityId: occurrence.id, entityType: "post_occurrence", expression: occurrence.expression,
      method: null, methodVersion: null, resultValue: null,
      sourceRef: occurrence.sourceRef, locator: occurrence.locator, versionRef: occurrence.sourceVersion };
    const patch = { subject: { id: occurrence.id, type: "phrase", label: occurrence.expression },
      selection, lens: "gematria", dimensions: { ...dimensions, postEngineExploration: true,
        surfaceFocus: { id: occurrence.id, type: "phrase", label: occurrence.expression, expression: occurrence.expression,
          locator: occurrence.locator, sourceLabel: "בדיקה חדשה במנוע; אינה אימות של חישוב המקור" } },
      returnTo: { ...exactReturnForRegion(activeFocus), href: exactPostReadingHref(post, location, `${occurrence.locator}`), selection,
        dimensions: { ...dimensions, postEngineExploration: false,
          surfaceFocus: { id: occurrence.id, type: "post_occurrence", label: occurrence.expression, locator: occurrence.locator } } } };
    explicitGematriaFocusRef.current = null;
    try { window.history.replaceState(window.history.state, "", `${location.pathname}${location.search}${occurrence.locator}`); }
    catch { /* Existing Research Context remains the return target. */ }
    shell.openNumber?.({ id: occurrence.id, type: "phrase", label: occurrence.expression, expression: occurrence.expression,
      href: exactPostReadingHref(post, location, `${occurrence.locator}`), locator: occurrence.locator,
      sourceLabel: "בדיקה חדשה במנוע; השיטה לא הושלמה מהמקור", source: "post-engine-exploration" });
    research.updateResearchContext?.(patch);
  };
  const openMeasureConnection = (event, href, card) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    research.updateResearchContext?.({ returnTo: { ...exactReturnForRegion(activeFocus),
      href: exactPostReadingHref(post, location, `#post-measures`), selection: { entityId: String(post.id), entityType: "post_region",
        sourceRef: `posts:${post.id}`, locator: "#post-measures", versionRef: projection.sourcePost.modified || null },
      dimensions: { ...(research.context?.dimensions || {}), postMeasureSelectedCardId: card?.id || null } } });
    shell.go(href, { preserve: false });
  };
  const openConnection = (event, href) => {
    if (!href || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const connectionRegion = regions.find((region) => region.id === "post-connections");
    research.updateResearchContext?.((current) => ({
      // This footer opens World discovery, not an entity-hub query for a local
      // Post reading region. Preserve its source in returnTo and any active Path.
      ...(href === "/world" ? {
        subject: null,
        selection: null,
        lens: "world",
        dimensions: {
          ...(current?.dimensions || {}),
          bottomTrail: [], surfaceSections: [], surfaceFindings: [],
          activeSectionId: null, surfaceMapLabel: null,
          surfaceFocus: null, readingFocus: null,
        },
      } : {}),
      returnTo: exactReturnForRegion(connectionRegion || activeFocus),
    }));
    shell.go(href, { preserve: false });
  };

  const updateFocusContext = () => {
    if (!activeFocus) return;
    research.updateResearchContext?.({
      dimensions: {
        ...(research.context?.dimensions || {}),
        readingFocus: {
          id: activeFocus.id,
          label: activeFocus.label,
          primary: activeFocus.primary,
          signals: activeFocus.signals || [],
          number: activeFocus.number || null,
          sourceLabel: projection.sourceLabel,
          postId: String(post.id),
          postSlug: post.slug,
          locator: `#source-region-${activeFocus.id}`,
        },
      },
    });
  };

  const openWorld = () => {
    if (!activeFocus) return;
    explicitGematriaFocusRef.current = null;
    updateFocusContext();
    const subject = activeFocus.number
      ? { id: String(activeFocus.number), type: "number", label: String(activeFocus.number), href: `${NUMBER_PAGE_BASE}/${activeFocus.number}` }
      : { id: String(post.id), type: "post", label: post.title, href: publicPostHref(post) };
    research.updateResearchContext?.({
      subject,
      selection: {
        entityId: activeFocus.id,
        entityType: "post_region",
        locator: `#source-region-${activeFocus.id}`,
      },
      lens: activeFocus.id === "ciphers" ? "els" : "world",
      returnTo: exactReturn,
    });
    shell.go(activeFocus.id === "ciphers" ? "/els" : "/world?focus=context", { preserve: false });
  };

  const openNumber = () => {
    if (!activeFocus?.number) return;
    explicitGematriaFocusRef.current = null;
    updateFocusContext();
    shell.openNumber?.({
      id: String(activeFocus.number),
      type: "number",
      label: String(activeFocus.number),
      href: `${NUMBER_PAGE_BASE}/${activeFocus.number}`,
    });
  };

  const askRaziel = () => {
    if (!activeFocus) return;
    updateFocusContext();
    shell.openRaziel?.({
      razielMicroIntent: "explain_reading_focus",
      readingFocus: {
        id: activeFocus.id,
        label: activeFocus.label,
        primary: activeFocus.primary,
        signals: activeFocus.signals || [],
        number: activeFocus.number || null,
        sourceLabel: projection.sourceLabel,
        locator: `#source-region-${activeFocus.id}`,
      },
    });
  };

  const askAboutPostHierarchy = (seriesKey = null) => {
    if (shell.razielLocked || !shell.openRaziel || projection.draft || projection.privateStage || projection.previewSnapshot) return;
    const patch = postHierarchyContext2029(projection.sourcePost, { seriesKey });
    if (!patch) return;
    explicitGematriaFocusRef.current = null;
    research.updateResearchContext?.({ ...patch,
      dimensions: { ...research.context?.dimensions, ...patch.dimensions, surfaceFindings: [] } });
    // Opening the existing companion never submits a question or creates a Follow.
    shell.openRaziel({ razielMicroIntent: "explain_reading_focus", readingFocus: patch.dimensions.readingFocus });
  };

  const openContext = () => {
    if (!activeFocus) return;
    explicitGematriaFocusRef.current = null;
    updateFocusContext();
    shell.openAction?.({
      id: activeFocus.number ? String(activeFocus.number) : activeFocus.id,
      type: activeFocus.number ? "number" : "post_region",
      label: activeFocus.primary,
      href: exactPostReadingHref(post, location, `#source-region-${activeFocus.id}`),
    });
  };

  const openContextualNumberFocus = ({ expression, methodKey, resultValue, regionId } = {}) => {
    const targetRegion = regions.find(region => region.id === regionId);
    if (!targetRegion || !expression || !methodKey || resultValue == null || String(resultValue).trim() === "") return;
    const numericResult = Number(resultValue);
    if (!Number.isSafeInteger(numericResult)) return;
    const locator = `#source-region-${targetRegion.id}`;
    // Existing reviewed Golden adapter, kept separate from saved annotations.
    // Recheck the source and the exact registered method before the shared sheet.
    void openPostSourceClaim({ id: `post:${post.id}:${targetRegion.id}:${expression}:${methodKey}`,
      expression, method: methodKey, methodVersion: null, value: numericResult,
      sourceRef: `posts:${post.id}`, sourceVersion: String(projection.sourcePost.modified || "").trim() || null,
      locator, locatorPrecision: "section", binding: "existing_reviewed_post_projection", lang: null });
  };

  const handleSourceContextualFocus = (event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const sourceAnchor=event.target?.closest?.('[data-legacy-attachment-focus="true"]');
    if(sourceAnchor&&sourceRef.current?.contains(sourceAnchor)){
      const binding=publicPostLinkedMedia(state.projection?.post?.content,sourceAnchor.dataset.sourceAttachment);
      if(binding){event.preventDefault();setSourceMediaOpen(binding);return;}
    }
    const previewCalculation = event.target?.closest?.("a[data-elections-calculation]");
    if (mapIntegrationReview && previewCalculation && sourceRef.current?.contains(previewCalculation)) {
      const { expression, method } = parseNumberExpressionFocus(previewCalculation.search);
      const value = Number(previewCalculation.dataset.electionsCalculation);
      if (event.button !== 0 || !expression || !method || !Number.isSafeInteger(value) || !shell.openNumber) return;
      event.preventDefault();
      // The shared sheet captures the active element for its close action, including taps.
      previewCalculation.focus({ preventScroll: true });
      const place = { top: previewCalculation.getBoundingClientRect().top };
      previewCalculation.addEventListener("focus", () => {
        if (sourceRef.current?.contains(previewCalculation)) keepReaderInPlace2029(place, previewCalculation);
      }, { once: true });
      const locator = `#${previewCalculation.id}`;
      const href = exactPostReadingHref(post, location, locator);
      shell.openNumber({ id: previewCalculation.id, type: "phrase", label: expression,
        expression, method, resultValue: value, number: value, href, locator,
        sourceLabel: projection.sourceLabel, source: "post-elections-calculation" });
      research.updateResearchContext?.({ returnTo: { ...exactReturn, href, label: expression,
        selection: { entityId: previewCalculation.id, entityType: "post_occurrence", locator } } });
      return;
    }
    const authored = event.target?.closest?.("[data-expression]");
    if (authored && sourceRef.current?.contains(authored)) {
      const rawValue = authored.getAttribute("data-result");
      const value = rawValue != null && /^\d+$/.test(rawValue.trim()) ? Number(rawValue) : null;
      const claim = measureSource.claims.find(row => row.expression === authored.getAttribute("data-expression")
        && row.method === (authored.getAttribute("data-method")?.trim() || null) && row.value === value
        && row.methodVersion === (authored.getAttribute("data-method-version")?.trim() || null)
        && (row.locator === `#${authored.id}` || row.locator === `#${authored.closest("[id]")?.id}`
          || row.locator === `#source-region-${authored.dataset.regionId}`));
      if (claim) { event.preventDefault(); void openPostSourceClaim(claim); return; }
    }
    const trigger = event.target?.closest?.("[data-contextual-number-focus='true']");
    if (trigger && sourceRef.current?.contains(trigger)) {
      event.preventDefault();
      openContextualNumberFocus({
        expression: trigger.dataset.expression,
        methodKey: trigger.dataset.method,
        resultValue: trigger.dataset.result,
        regionId: trigger.dataset.regionId,
      });
      return;
    }

    {
      const legacyNumber = event.target?.closest?.("[data-gem]");
      if (legacyNumber && sourceRef.current?.contains(legacyNumber)) {
        const term = String(legacyNumber.dataset.gem || "").trim();
        if (!term || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        // Counted on the click only; the counter loads then, never with the Post (ZURIEL 18.11.2026).
        import("../lib/postUnitActions2029.js").then((m) => m.postUnitAction2029("post_number_open")).catch(() => {});
        const numericValue = /^\d[\d,]*$/.test(term) ? Number(term.replace(/,/g, "")) : null;
        if (Number.isSafeInteger(numericValue)) {
          openHeroNumber(numericValue);
        } else {
          const occurrence = measureSource.legacyOccurrences?.find(row => row.locator === `#${legacyNumber.id}`);
          if (occurrence && isPostEnglishExpression(term) && occurrence.expression.trim() === term) {
            void openPostEngineExploration(occurrence); return;
          }
          // Reuse the existing status feedback, next to the selected source line
          // so an incomplete/mismatched claim does not fail silently off-screen.
          for (const host of sourceRef.current.querySelectorAll("[data-post-calculation-feedback]")) host.remove();
          const host = document.createElement("div"); host.dataset.postCalculationFeedback = "true";
          (legacyNumber.closest("p,div,li,td,h2,h3,h4,h5,h6") || legacyNumber).after(host);
          setCalculationFeedbackHost(host);
          if (occurrence) void openPostSourceClaim(occurrence);
          else { ++calculationRequest.current; setCalculationNotice("ההופעה הזאת עדיין אינה ממופה לחישוב מדויק במקור. לא נבחרה שיטה אוטומטית."); }
        }
      }
    }
  };

  const openHeroNumber = (number) => {
    explicitGematriaFocusRef.current = null;
    const targetRegion = regions.find((region) => Number(region.number) === Number(number)) || activeFocus;
    if (targetRegion) {
      setActiveRegionId(targetRegion.id);
      research.updateResearchContext?.({
        subject: {
          id: String(post.id),
          type: "post",
          label: post.title,
          href: publicPostHref(post),
        },
        selection: {
          entityId: targetRegion.id,
          entityType: "post_region",
          locator: `#source-region-${targetRegion.id}`,
        },
        lens: "reading",
        dimensions: {
          ...(research.context?.dimensions || {}),
          bottomTrail: state.projection?.experience?.trail || [],
          readingFocus: {
            id: targetRegion.id,
            label: targetRegion.label,
            primary: targetRegion.primary,
            signals: targetRegion.signals || [],
            number: targetRegion.number || null,
            sourceLabel: projection.sourceLabel,
            postId: String(post.id),
            postSlug: post.slug,
            locator: `#source-region-${targetRegion.id}`,
          },
        },
      });
    }
    shell.openNumber?.({
      id: String(number),
      type: "number",
      label: String(number),
      href: NUMBER_PAGE_BASE + "/" + number,
      source: "post-master-hero",
      number: Number(number),
      locator: targetRegion ? `#source-region-${targetRegion.id}` : null,
      sourceLabel: "מספר מתוך הפוסט · מעבר עקיף, ללא טענת חישוב",
    });
  };

  const cover = coverItem ? <figure className="sod29-reading-cover" data-experience-capability="post-reading-cover">
    <CanonicalMediaFigure2029 item={coverItem} primary loading="eager" fetchPriority="high"
      srcSet={postImageRenditionSet2029(coverItem.imageUrl, documentImageFactsFor(post.id)) || undefined}
      sizes={mapIntegrationReview ? "(max-width: 760px) 40px, 128px" : POST_COVER_IMAGE_SIZES}
      alt={`פתח את תמונת הפוסט: ${coverItem.label}`} contextNote={null} />
  </figure> : null;

  const researchDisclosure = <details ref={researchRef} open={researchOpen} className="sod29-post-research" id="post-research"
      data-experience-capability="post-sources-and-connections"
      onToggle={event => {
        if (event.target !== event.currentTarget) return;
        setResearchOpen(event.currentTarget.open);
        if (event.currentTarget.open) setResearchStarted(true);
      }}>
      <summary>
        <span className="sod29-post-research-title">מקורות וקשרים</span>
        {!mapIntegrationReview ? <span className="sod29-post-research-hint">מקור, חיבורים, ציר זמן ומדדים — בלי להעמיס על הקריאה</span> : null}
        <span className="sod29-post-research-chevron" aria-hidden="true">⌄</span>
      </summary>
      <div className="sod29-post-research-body">
    {!projection.draft && !projection.privateStage && !projection.previewSnapshot ? <div id="post-measures">
      {researchStarted ? <PostConvergenceMeasures2029 key={`${post.id}:${post.modified || ""}:${user?.id || "public"}`}
        sourcePost={projection.sourcePost} sourceProjection={projection} claims={measureSource.claims} placements={measureSource.placements}
        initialCardId={research.context?.subject?.type === "post" && String(research.context.subject.id) === String(post.id)
          ? research.context?.dimensions?.postMeasureSelectedCardId || null : null}
        onOpenCalculation={openCheckedPostCalculation} onNavigate={openMeasureConnection}
        onRefresh={() => invalidatePostSource("source_changed")} onSourceInvalid={invalidatePostSource} /> : null}
    </div> : null}

    {contextualConnections.length ? <section id="post-connections" className="sod29-post-continuations" aria-labelledby="source-region-post-connections" data-experience-capability="post-connected-continuations">
      <header>
        <h2 ref={connectionsHeadingRef} id="source-region-post-connections">הסיפור ממשיך מכאן</h2>
        <p>חיבורים מתוך הפוסט — כל אחד פותח כיוון נוסף. אפשר לחזור לחיבורים בפוסט בכל שלב.</p>
      </header>
      {[
        { title: null, items: contextualConnections.filter((connection) => !connection.id.startsWith("elections-history-")) },
        { title: "בחירות לאורך השנים", items: contextualConnections.filter((connection) => connection.id.startsWith("elections-history-")) },
      ].filter((group) => group.items.length).map((group) => <div key={group.title || "connections"}>
      {group.title ? <header><h3>{group.title}</h3><p>מתוך החומר שכבר פורסם בישראל ובארה״ב, לפי תאריך הפרסום. בכל חיבור אפשר לראות למה הוא מופיע כאן ולפתוח את המקור.</p></header> : null}
      <div className="sod29-post-continuation-grid">
        {group.items.map((connection) => <a
          key={connection.id}
          href={connection.href}
          className="sod29-post-continuation"
          data-post-connection={connection.id}
          onClick={(event) => openConnection(event, connection.href)}
        >
          <span className="sod29-post-continuation-type">{group.title ? connection.kind : connection.href.startsWith("/post/") ? "סיפור נוסף" : connection.href.startsWith("/topic/") ? "עיון לפי נושא" : "לגלות את המספר"}</span>
          <h3>{connection.label}</h3>
          {connection.reason ? <p>{connection.reason}</p> : null}
          <span className="sod29-post-continuation-open">לפתוח את החיבור <b aria-hidden="true">←</b></span>
        </a>)}
      </div>
      </div>)}
    </section> : null}

    {additionalLinks.length ? <section aria-label="קישורים מתוך הפוסט" className="post-design-links">
      <h3>קישורים מתוך הפוסט</h3>
      <ul>{additionalLinks.map(item => <li key={item.href}><a href={item.href}>{item.label}</a></li>)}</ul>
    </section> : null}
    {researchStarted || /timeline/i.test(location.hash || "") ? <PostTimeline2029 items={visibleTimeline} currentHref={publicPostHref(post)} /> : null}

      {!projection.draft && !projection.privateStage && !projection.previewSnapshot ? <section id="post-classification" className="sod29-post-continuations">
        <header><h2>איך הפוסט משתלב?</h2>
        <p>הפוסט הוא הסיפור; סדרה מאגדת פרסומים, ערוץ הוא בית פרסום, ונושא מחבר תכנים על אותו עניין. אלה תפקידים שיכולים לחפוף, בלי להיכפות להורה אחד.</p>
        {!mapIntegrationReview ? <p>„מימד חמש” היא סדרת תוכן של „בדרך לנצח”; „אור הגאולה” הוא ערוץ. ההשוואה ביניהם אינה משייכת את הפוסט לערוץ. ייחוס במקור אינו זיהוי אוטומטי של כתב.</p> : null}
        <p>מעקב נבחר במפורש בהמשך הפוסט. רלוונטיות והמלצה של רזיאל אינן הרשמה למעקב.</p>
        </header>
        {classification.series.length ? classification.series.map(item => <button key={item.key} type="button" className="sod29-action"
          disabled={shell.razielLocked || !shell.openRaziel} onClick={() => askAboutPostHierarchy(item.key)}>
          להבין את השיוך ל{item.name} עם רזיאל
        </button>) : <button type="button" className="sod29-action" disabled={shell.razielLocked || !shell.openRaziel} onClick={() => askAboutPostHierarchy()}>
          לברר את שיוך הפוסט עם רזיאל
        </button>}
      </section> : null}

    <footer id="post-sources" className="sod29-reading-footnote">
      <span>מקור</span>
      <strong>{projection.sourceLine}</strong>
      <p>{projection.caveat}</p>

    </footer>
      </div>
    </details>;

  return <><article
    className={postReadingClassName([experience.wireframe ? "is-architecture-wireframe" : "", protoOn && realityMap.active ? "r29" : ""].filter(Boolean).join(" "))}
    data-post-design-preview={mapIntegrationReview ? "" : undefined}
    data-golden={projection.golden ? "true" : "false"}
    data-experience-surface="post-reading"
    data-experience-capability="post-master-reading-stage"
    data-architecture-wireframe={experience.wireframe ? "true" : undefined}
    data-post-slug={post.slug}
    data-post-character={character}
    data-post-voice={protoOn ? postVoice : undefined}
    data-reality-map={protoOn && realityMap.active ? realityMap.basis : undefined}
    data-prefs-tick={prefsTick}
    data-post-background={background.key}
    style={{
      "--post-background-desktop": `url("${background.desktop}")`,
      "--post-background-mobile": `url("${background.mobile}")`,
      ...(matrixOpening ? { "--post-fx-color": matrixOpening.color, "--post-fx-head": matrixOpening.headColor } : {}),
    }}
  >
    {experience.wireframe ? <section className="sod29-architecture-wireframe-note" aria-label="מבנה בלבד">
      <b>מבנה בלבד</b>
      <span>עכשיו בודקים רק איפה כל דבר חי: ניווט · תוכן · בדיקה מהירה · ציר זמן · חיבורים · רזיאל.</span>
    </section> : null}

    <header id="post-story" className="sod29-reading-hero" data-experience-capability="post-master-hero">
      {matrixOpening ? <div className="sod29-post-opening" aria-hidden="true">
        <MatrixRain color={matrixOpening.color} headColor={matrixOpening.headColor} featured={matrixOpening.featured} />
      </div> : null}
      <div className="sod29-reading-hero-grid">
        <div className="sod29-reading-hero-copy">
          {mapIntegrationReview ? <>
          <div className="post-design-title">
            <div>
              {classification.series.length ? <div className="post-design-series" aria-label="סדרות">
                {classification.series.map(item => <a key={item.key} href={item.href} onClick={event => openConnection(event, item.href)}>סדרה: {item.name}</a>)}
              </div> : null}
              <h1>{humanContentTitle(post.title, { max: 0 })}</h1>
              {heroDate ? <time dateTime={heroDate}>{bilingualDateLabel(heroDate, heroDate)}</time> : null}
            </div>
            {cover}
          </div>
          {projection.excerpt ? <p className="post-design-opening">{projection.excerpt}</p> : null}
          <details className="sod29-post-details">
            <summary><span className="sod29-post-details-label">פרטי הפוסט <span aria-hidden="true">⌄</span></span></summary>
            <div className="sod29-post-details-body">
              {classification.credit ? <p>קרדיט · {classification.credit.name}</p> : null}
              {projection.sourceLine && projection.sourceLine !== classification.credit?.name ? <p className="sod29-reading-source-line">{projection.sourceLine}</p> : null}
              {previewCategories.length ? <div className="post-design-categories"><strong>קטגוריות</strong>
                <PostCategories2029 categories={previewCategories} max={Infinity} />
              </div> : null}
              {previewTags.length ? <div className="post-design-categories"><strong>תגיות</strong>
                <div className="post-design-series">{previewTags.map(tag => <Link key={tag} to={`/2029/posts?tag=${encodeURIComponent(tag)}`}>{tag}</Link>)}</div>
              </div> : null}
              {postActionTarget ? <PostFollowBox variant="2029" post={projection.sourcePost} source="post_details_2029" /> : null}
              {heroNumbers.length ? <p>לחיצה על מספר בתוך הפוסט פותחת את החישוב.</p> : null}
              <span className="sod29-orientation-host" ref={shell.registerOrientationHost} />
            </div>
          </details>
          </> : <>
          <h1>{humanContentTitle(post.title, { max: 0 })}</h1>
          {post.source === "wordpress" ? (() => { const byline = postArticleByline2029(post); return byline.credit || byline.date ? <p className="sod29-reading-byline">{byline.credit ? <span>{byline.credit}</span> : null}{byline.date ? <time dateTime={byline.date}>{byline.dateLabel}</time> : null}</p> : null; })() : null}
          <PostCategories2029 post={projection.sourcePost} compact max={4} />
          <span className="sod29-orientation-host" ref={shell.registerOrientationHost} />
          <details className="sod29-post-details">
            <summary>
              <span className="sod29-reading-source-badge">{visibleSourceLabel}</span>
              <span className="sod29-post-details-label">פרטי הפוסט <span aria-hidden="true">⌄</span></span>
            </summary>
            <div className="sod29-post-details-body">
              {classification.credit ? <p>{classification.credit.prefix}: {classification.credit.name}</p> : null}
              {projection.sourceLine && projection.sourceLine !== visibleSourceLabel && projection.sourceLine !== classification.credit?.name ? <p className="sod29-reading-source-line">{projection.sourceLine}</p> : null}
              {heroDate ? <p>תאריך הפוסט: <time dateTime={heroDate}>{bilingualDateLabel(heroDate, heroDate)}</time></p> : null}
              <div className="sod29-reading-meta-line">
                <PostCategories2029 post={projection.sourcePost} max={Infinity} />
              </div>
              {projection.excerpt ? <p>{projection.excerpt}</p> : null}
              {heroNumbers.length ? <p>המספרים פותחים חלונית באותו מקום. אפשר לבדוק את החישוב ולהמשיך בקריאה.</p> : null}
              {!isBennettMaster && !isFz1073Master && !isElectionsMaster ? <p>המקור נשמר כלשונו. חישוב, מקור ופרשנות נשארים שכבות נפרדות.</p> : null}
            </div>
          </details>
          </>}
        </div>

        {!mapIntegrationReview && heroNumbers.length && !isBennettMaster && !isElectionsMaster ? <div id="post-gematria" className="sod29-reading-number-stage" aria-label="מספרים מרכזיים">
          <span className="sod29-reading-number-stage-kicker">{isBennettMaster || isFz1073Master || isElectionsMaster ? "הרמזים המרכזיים" : "צירי הקריאה"}</span>
          <div className="sod29-reading-number-constellation">
            {heroNumbers.map((number, index) => <button
              key={number}
              type="button"
              className={"sod29-reading-number-signal signal-" + (index + 1)}
              data-orientation-target="post-number"
              onClick={() => openHeroNumber(number)}
              aria-label={"בדוק את מספר " + number}
            >
              <strong>{number}</strong>
              <small>{isBennettMaster || isFz1073Master || isElectionsMaster ? "פתח" : "בדיקה מהירה"}</small>
            </button>)}
          </div>
          <p>{isBennettMaster || isFz1073Master || isElectionsMaster ? "לחצו על מספר כדי לפתוח את החיבור ולחזור בדיוק לאותו מקום." : "המספרים הם נקודות כניסה למחקר. הבדיקה נפתחת בחלון צד ושומרת את הפוסט והדרך חזרה."}</p>
        </div> : null}
      </div>
      {postActionTarget ? <PostReadingActions2029 key={post.id} projection={projection} rootRef={sourceRef} articleHtml={passiveSourceHtml}
        onDraft={discussionReviewEnabled ? target => setDiscussionDraft(current => current?.postId === target.postId ? current : target) : undefined} /> : null}
      {mapIntegrationReview && (previewOutline.length || mapUnit) ? <details className="map29-mobile-post-context">
        <summary>הקשר הפוסט</summary>
        {previewOutline.length ? <nav aria-label="בתוך הפוסט">
          <div className="sod29-context-inspector-kicker">בתוך הפוסט</div>
          <ul>{previewOutline.map(item => {
            const id = item.targetId || item.id;
            const unit = previewUnits.find(candidate => candidate.id === id);
            const href = unit ? publicPostUnitHref(post, id) : `#${encodeURIComponent(id)}`;
            return <li key={item.id} data-level={item.level}><Link to={href} state={location.state}
              aria-current={activeOutlineId === item.id ? "location" : undefined}
              onClick={event => {
                if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
                event.currentTarget.closest("details").open = false;
                const target = unit && document.getElementById(unit.id);
                const depth = target && sourceRef.current?.contains(target) && target.querySelector(":scope > details[data-map-depth]");
                if (depth) depth.open = true;
              }}>{item.label}</Link></li>;
          })}</ul>
        </nav> : null}
        {mapUnit && MapUnitContextReview ? <MapUnitContextReview postId={post.id} unitKey={mapUnit.key} /> : null}
      </details> : null}
      {worldReturn ? <div className="sod29-actions" aria-label="מסלול הבדיקה">
        <Link className="sod29-action" to={worldReturn}>חזרה לאותה בחירה בעולם</Link>
      </div> : null}
    </header>

    {!mapIntegrationReview && sourceUpdates.length ? <aside className="sod29-update-strip" aria-label="עדכון במקור" data-source-update-strip="true">
      <span className="sod29-update-strip-kicker">עודכן</span>
      <button type="button" className="sod29-update-strip-link" onClick={() => jumpToSourceUpdate(sourceUpdates[0])}>
        <strong data-update-caption={resolveUnitMessage(post.id, sourceUpdates[0].targetId) ? "main-message" : "label"}>{(realityMap.active && resolveUnitMessage(post.id, sourceUpdates[0].targetId)) || sourceUpdates[0].label}</strong>
        <small>{sourceUpdates[0].attribution} · {addedDateLabel(sourceUpdates[0]) ? <time dateTime={sourceUpdates[0].updatedAt}>{addedDateLabel(sourceUpdates[0])}</time> : "תאריך ההוספה אינו מוכח"}</small>
      </button>
      {sourceUpdates.length > 1 ? <details className="sod29-update-strip-more">
        <summary>עוד {sourceUpdates.length - 1}</summary>
        <ul>
          {sourceUpdates.slice(1, 6).map((entry) => <li key={entry.id}>
            <button type="button" onClick={() => jumpToSourceUpdate(entry)}>
              <span>{entry.label}</span><small>{addedDateLabel(entry) ? <time dateTime={entry.updatedAt}>{addedDateLabel(entry)}</time> : null}</small>
            </button>
          </li>)}
        </ul>
      </details> : null}
    </aside> : null}
    {!mapIntegrationReview && protoOn && postVoice !== "original" ? <PostSemanticLegend2029 /> : null}
    {!mapIntegrationReview ? cover : null}
    {mapIntegrationReview && (hasResearchContent || researchOpen || researchAnchorRequested) ? researchDisclosure : null}

    <PostEvidenceMedia2029 media={experience.media} />
    {sourceMediaMissing ? <FrameState kind="unavailable" title="המדיה המקושרת אינה מזוהה במקור הזמין"><p>הפוסט הציבורי נשמר; לא נמצאה בו כרגע התאמה מדויקת למדיה שבקישור.</p></FrameState> : null}
    {sourceMediaOpen ? <React.Suspense fallback={null}><SourceLightbox images={[{image_url:sourceMediaOpen.href,name:sourceMediaOpen.alt}]} onClose={()=>setSourceMediaOpen(null)} note="מדיה מתוך הפוסט המקורי" /></React.Suspense> : null}

    {/* The event sequence lives in the context rail (tree) and the bottom path: no third inline copy. */}

    <div className="sod29-reading-layout">
      <section
        ref={sourceRef}
        className="sod29-reading-source"
        aria-label="טקסט המקור"
        data-public-post-id={post.id}
        onPointerDownCapture={() => { sourcePointerActive.current = true; }}
        onPointerUpCapture={() => { sourcePointerActive.current = false; }}
        onPointerCancel={() => { sourcePointerActive.current = false; }}
        onFocusCapture={event => {
          const control = event.target?.closest?.("[data-gem],[data-expression]");
          if (!control || !event.currentTarget.contains(control)) return;
          // Pointer-down focus must not move the target before pointer-up/click.
          // Keyboard and programmatic return still receive visibility restoration.
          if (sourcePointerActive.current) return;
          // A restored focus may use preventScroll while the Frame closes.
          // Keep the source control clear of its existing header/island margins.
          const box = control.getBoundingClientRect(), style = getComputedStyle(control);
          const before = parseFloat(style.scrollMarginBlockStart) || 0;
          const after = parseFloat(style.scrollMarginBlockEnd) || 0;
          if (box.top < before || box.bottom > window.innerHeight - after) {
            control.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" });
          }
        }}
        onClick={handleSourceContextualFocus}
        onKeyDown={(event) => {
          sourcePointerActive.current = false;
          if ((event.key === "Enter" || event.key === " ") && event.target?.matches?.('[data-gem][role="button"],[data-expression][role="button"]')) {
            event.preventDefault();
            handleSourceContextualFocus(event);
          }
        }}
        {...(documentArticle ? {} : { dangerouslySetInnerHTML: { __html: passiveSourceHtml } })}
      />
      {protoOn && realityMap.active ? <PostUnitEditors2029 rootRef={sourceRef} postId={post.id} postHref={publicPostHref(post)} htmlKey={passiveSourceHtml.length} editable={editorEnabled} /> : null}
      {protoOn && realityMap.active ? <PreviewUnitExtras2029 rootRef={sourceRef} post={post} htmlKey={passiveSourceHtml.length} /> : null}
      <PublishedUnitTraces2029 rootRef={sourceRef} htmlKey={passiveSourceHtml.length} />
      {protoMode === "sources" ? <React.Suspense fallback={null}><PostExternalSourcesPreview2029 /></React.Suspense> : null}


    </div>

    {calculationNotice ? (calculationFeedbackHost
      ? createPortal(<><p role="status">{calculationNotice}</p>{explorationOccurrence ? <div className="sod29-post-engine-exploration">
        <p>אפשר לבדוק את הביטוי מחדש במנוע. זו בדיקה נוספת, ואינה משלימה את התיעוד או מאמתת את חישוב המקור.</p>
        <button type="button" onClick={openPostEngineExploration}>בדיקה חדשה במנוע</button>
      </div> : null}</>, calculationFeedbackHost)
      : <p role="status">{calculationNotice}</p>) : null}
    {!mapIntegrationReview ? researchDisclosure : null}
    {!mapIntegrationReview && !projection.draft && !projection.privateStage && !projection.previewSnapshot ? <PostFollowBox variant="2029" post={projection.sourcePost} source="post_footer_2029" /> : null}
    {discussionReviewEnabled && postActionTarget ? <PostDiscussionReview2029 key={post.id} post={post} browserReview={mapIntegrationReview}
      draftTarget={discussionDraft?.postId === post.id ? discussionDraft : null} onDraftClosed={() => setDiscussionDraft(null)} />
      : commentArchiveId != null ? <PostComments2029 key={String(commentArchiveId)} postWpId={commentArchiveId} /> : null}
    {!projection.draft && !projection.privateStage && !projection.previewSnapshot ? <AdSlot place="post" /> : null}
    <nav id="post-next" className="sod29-post-next" aria-label="להמשיך לגלות">
      {classification.series.map(item => <a key={item.key} href={item.href} onClick={(event) => openConnection(event, item.href)}>עוד מ{item.name} ←</a>)}
      <a href="/2029/posts" onClick={(event) => openConnection(event, "/2029/posts")}>לכל הפוסטים ←</a>
      <a href="/world" onClick={(event) => openConnection(event, "/world")}>להמשיך לגלות בעולם ←</a>
    </nav>
  </article></>;
}

export default function Post2029Page({ resolvedSlug = null, sourceReader = null } = {}) {
  const { slug: routeSlug } = useParams();
  const slug = resolvedSlug || routeSlug;
  const location = useLocation();

  useEffect(() => {
    applySeo({
      title: "SOD1820 · פוסט",
      description: "פוסט ורמזים בתוך SOD1820.",
      path: location.pathname,
      type: "article",
      noindex: true,
    });
  }, [slug, location.pathname]);

  return <Sod2029Shell
    surface="post"
    title="פוסט"
    introVariant="none"
    symbol="✦"
    status="פוסט"
  >
    <PostReadingBody key={slug} resolvedSlug={slug} sourceReader={sourceReader} />
  </Sod2029Shell>;
}
