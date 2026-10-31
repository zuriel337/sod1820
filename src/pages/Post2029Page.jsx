import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useParams } from "react-router-dom";
import Sod2029Shell, { FrameState, use2029Shell } from "../components/experience2029/Sod2029Shell.jsx";
import SurfaceSectionNav2029 from "../components/experience2029/SurfaceSectionNav2029.jsx";
import PostEvidenceMedia2029 from "../components/experience2029/PostEvidenceMedia2029.jsx";
import PostTimeline2029 from "../components/experience2029/PostTimeline2029.jsx";
import { fetchPost2029ReadingProjection, resolvePostReadingRegion, collectPostCalculationOccurrences2029, collectPostLegacyOccurrences2029, collectPostSourcePlacements2029, checkPostCalculation2029, revalidatePostMeasureSource, postReadingHtml2029 } from "../lib/research/post2029ReadingProjection.js";
import { useAuth } from "../lib/AuthContext.jsx";
import { mergeContextPackWithConnections } from "../lib/research/goldenPostContextPacks.js";
import { goldenPublicSurfaceFindings } from "../lib/research/goldenProjectorModes.js";
import { useResearch } from "../lib/research/ResearchProvider.jsx";
import { applySeo } from "../lib/seo.js";
import { logView, logActivity } from "../lib/supabase.js";
import { hardenPassiveMediaHtml } from "../lib/mediaEgressGuard.js";
import { humanContentTitle } from "../lib/presentation/contentTitle.js";
import { bilingualDateLabel } from "../lib/relativeTime2029.js";
import { provenSourceUpdatesFor, provenUpdateForHash, formatUpdateDate } from "../lib/research/postSourceUpdates2029.js";
import CanonicalMediaFigure2029 from "../components/experience2029/CanonicalMediaFigure2029.jsx";
import PostCategories2029 from "../components/experience2029/PostCategories2029.jsx";
import PostConvergenceMeasures2029 from "../components/experience2029/PostConvergenceMeasures2029.jsx";
import PostComments2029 from "../components/experience2029/PostComments2029.jsx";
import { publicPostCommentArchiveId } from "../components/experience2029/postComments2029.js";
import MatrixRain from "../components/MatrixRain.jsx";
import { postCharacterFor, matrixOpeningFor } from "../lib/postCharacters2029.js";
import { postBackground2029 } from "../lib/research/postBackground2029.js";
import "./post2029-reading.css";
import "./post2029-legacy-grade.css";

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

function PostReadingBody() {
  const { slug } = useParams();
  const location = useLocation();
  const shell = use2029Shell();
  const research = useResearch();
  const { user } = useAuth();
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
  entryRef.current = { context: research.context, hash: location.hash };
  const restoredRegionRef = useRef(null);
  const [state, setState] = useState({ loading: true, projection: null, error: null });
  const passiveSourceHtml = useMemo(() => hardenPassiveMediaHtml(postReadingHtml2029(state.projection?.post?.content || "")),
    [state.projection?.post?.content]);
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
    fetchPost2029ReadingProjection(slug)
      .then((projection) => {
        if (!live) return;
        setState({
          loading: false,
          projection,
          error: projection ? null : "הפוסט לא נמצא",
        });
        const restored = resolvePostReadingRegion(projection, entryRef.current?.context, entryRef.current?.hash);
        restoredRegionRef.current = restored;
        setActiveRegionId(restored || projection?.defaultRegionId || null);
      })
      .catch((error) => {
        if (live) setState({ loading: false, projection: null, error: error?.message || "טעינת הפוסט נכשלה" });
      });
    return () => { live = false; ++calculationRequest.current; };
  }, [slug, user?.id, reloadTick]);

  useEffect(() => {
    if (!state.projection?.post) return;
    const projection = state.projection;
    applySeo({
      title: projection.post.title,
      description: projection.excerpt,
      path: `/post/${projection.post.slug}`,
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
    void logView("post", post.slug);
    void logActivity("post", post.slug, post.title);
  }, [state.projection]);

  useEffect(() => {
    if (state.loading || state.projection) return;
    applySeo({
      title: "הפוסט לא נמצא",
      description: "המקור המבוקש אינו זמין ב-SOD1820 2029.",
      path: `/post/${slug || ""}`,
      noindex: true,
    });
  }, [state.loading, state.projection, slug]);

  const regions = state.projection?.regions || [];
  const activeFocus = useMemo(
    () => regions.find((region) => region.id === activeRegionId) || regions[0] || null,
    [regions, activeRegionId],
  );
  const activeRegionFocus = activeFocus;
  const commentArchiveId = publicPostCommentArchiveId(state.projection);
  const sectionItems = useMemo(() => [
    { id: "post-story", label: "הסיפור", targetId: "post-story" },
    ...(regions.some((region) => Number(region.number)) ? [{ id: "post-gematria", label: "גימטריות", targetId: `source-region-${regions.find((region) => Number(region.number)).id}` }] : []),
    ...(state.projection?.experience?.connections?.some((item) => item.href)
      ? [{ id: "post-connections", label: "חיבורים", targetId: "post-connections" }] : []),
    { id: "post-sources", label: "מקורות", targetId: "post-sources" },
    ...(commentArchiveId != null ? [{ id: "post-comments", label: "תגובות", targetId: "post-comments" }] : []),
    { id: "post-next", label: "המשך", targetId: "post-next" },
  ], [regions, state.projection, commentArchiveId]);

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
    const reveal = targetId => {
      const target = targetId ? document.getElementById(targetId) : null;
      if (target && researchRef.current?.contains(target)) revealReadingAnchor(target);
    };
    const onMapClick = event => {
      const button = event.target?.closest?.(".sod29-surface-tabs button");
      if (!button) return;
      const item = sectionItems.find(entry => entry.label === (button.textContent || "").trim());
      if (item) reveal(item.targetId || item.id);
    };
    let targetId = "";
    try { targetId = decodeURIComponent((location.hash || "").replace(/^#/, "")); } catch { /* A malformed URL fragment has no target. */ }
    reveal(targetId);
    document.addEventListener("click", onMapClick, true);
    return () => document.removeEventListener("click", onMapClick, true);
  }, [sectionItems, location.hash, state.projection]);

  useEffect(() => {
    setSourceUpdates(state.projection ? provenSourceUpdatesFor(state.projection.post?.id, sourceRef.current) : []);
  }, [state.projection]);

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
      if (!node.matches("a,button") && !node.closest("a,button")) {
        node.setAttribute("role", "button");
        node.tabIndex = 0;
      }
    }
    // Authored legacy number links use the same in-place Number capability.
    // Keep their href for ordinary modified-click navigation and copying.
    for (const link of sourceRef.current.querySelectorAll('a[href^="/number/"]')) {
      if (link.hasAttribute("data-gem")) continue;
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
    const requested = resolvePostReadingRegion(state.projection, entryRef.current?.context, location.hash);
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
  }, [state.projection, regions, location.hash]);

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
    const currentDimensions = currentContext?.dimensions || {};
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
      sectionLabel: activeFocus.number ? "גימטריות" : "הסיפור",
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
        href: `/post/${post.slug}`,
      },
      selection: preserveExplicitGematriaFocus ? protectedSelection : passiveSelection,
      lens: preserveExplicitGematriaFocus ? "gematria" : "reading",
      dimensions: {
        ...currentDimensions,
        bottomTrail: preserveExplicitGematriaFocus && Array.isArray(protectedBottomTrail)
          ? protectedBottomTrail
          : passiveTrail,
        surfaceSections: regions.map((region) => ({
          id: region.id,
          label: region.label,
          targetId: `source-region-${region.id}`,
        })),
        activeSectionId: activeFocus.id,
        surfaceMapLabel: "בתוך הפוסט",
        surfaceFindings: post.slug === "bennett-melach-631-78"
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
            : [],
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
  }, [activeRegionFocus?.id, state.projection?.post?.id, Boolean(state.projection?.contextPack)]);

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
    // Native IDs and snapshot-bound presentation locators survive refresh/Back.
    // Legacy locators are admitted only after mapping to the unchanged source.
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
    if (!id || !state.projection || !sourceRef.current) return;
    const target = id === "post-measures" ? document.getElementById("post-measures")
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
  const coverItem = postReadingCoverItem(post);
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
  // One cover only: the sharp whole-image reading cover below the header (shared media kit). No second thumbnail above the title.
  const heroCategories = (Array.isArray(post.categories) ? post.categories : []).slice(0, 3);
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
  const exactReturnForRegion = (region) => ({
    href: `/post/${post.slug}#source-region-${region?.id || projection.defaultRegionId}`,
    label: post.title,
    subject: { id: String(post.id), type: "post", label: post.title, href: `/post/${post.slug}` },
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
      returnTo: { ...exactReturnForRegion(activeFocus), href: `/post/${post.slug}${claim.locator}`,
        selection: { ...selection, entityType: "post_occurrence" }, lens: "reading" } };
    // Browser Back from the full Number page must name the current occurrence,
    // even when a different calculation was opened earlier in this same Post.
    try { window.history.replaceState(window.history.state, "", `${location.pathname}${location.search}${claim.locator}`); }
    catch { /* Research Context still carries the explicit return target. */ }
    // Same existing activation seam as Topic: commit rich source/version context
    // after the shared activation's generic selection, in the same React batch.
    shell.openNumber?.({ id: claim.id, type: "phrase", label: claim.expression, expression: claim.expression,
      method: focus.method, resultValue: focus.resultValue, number: focus.root,
      href: `/post/${post.slug}${claim.locator}`, locator: claim.locator, sourceLabel: projection.sourceLabel, source: "post-exact-source-claim" });
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
  const openPostEngineExploration = async () => {
    const occurrence = explorationOccurrence;
    if (!occurrence) return;
    const ticket = ++calculationRequest.current;
    const access = await revalidatePostMeasureSource(projection.sourcePost);
    if (ticket !== calculationRequest.current) return;
    if (access.status !== "ready") { invalidatePostSource(access.status); return; }
    const source = [...(sourceRef.current?.querySelectorAll("[id]") || [])].find(node => `#${node.id}` === occurrence.locator);
    if (!source) return;
    const dimensions = { ...(research.context?.dimensions || {}) };
    for (const key of Object.keys(dimensions)) if (key.startsWith("postClaim")) dimensions[key] = null;
    const selection = { entityId: occurrence.id, entityType: "post_occurrence", expression: occurrence.expression,
      method: null, methodVersion: null, resultValue: null,
      sourceRef: occurrence.sourceRef, locator: occurrence.locator, versionRef: occurrence.sourceVersion };
    const patch = { subject: { id: occurrence.id, type: "phrase", label: occurrence.expression },
      selection, lens: "gematria", dimensions: { ...dimensions, postEngineExploration: true,
        surfaceFocus: { id: occurrence.id, type: "phrase", label: occurrence.expression, expression: occurrence.expression,
          locator: occurrence.locator, sourceLabel: "בדיקה חדשה במנוע; אינה אימות של חישוב המקור" } },
      returnTo: { ...exactReturnForRegion(activeFocus), href: `/post/${post.slug}${occurrence.locator}`, selection,
        dimensions: { ...dimensions, postEngineExploration: false,
          surfaceFocus: { id: occurrence.id, type: "post_occurrence", label: occurrence.expression, locator: occurrence.locator } } } };
    explicitGematriaFocusRef.current = null;
    try { window.history.replaceState(window.history.state, "", `${location.pathname}${location.search}${occurrence.locator}`); }
    catch { /* Existing Research Context remains the return target. */ }
    shell.openNumber?.({ id: occurrence.id, type: "phrase", label: occurrence.expression, expression: occurrence.expression,
      href: `/post/${post.slug}${occurrence.locator}`, locator: occurrence.locator,
      sourceLabel: "בדיקה חדשה במנוע; השיטה לא הושלמה מהמקור", source: "post-engine-exploration" });
    research.updateResearchContext?.(patch);
  };
  const openMeasureConnection = (event, href, card) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    research.updateResearchContext?.({ returnTo: { ...exactReturnForRegion(activeFocus),
      href: `/post/${post.slug}#post-measures`, selection: { entityId: String(post.id), entityType: "post_region",
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
      ? { id: String(activeFocus.number), type: "number", label: String(activeFocus.number), href: `/2029/number/${activeFocus.number}` }
      : { id: String(post.id), type: "post", label: post.title, href: `/post/${post.slug}` };
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
      href: `/2029/number/${activeFocus.number}`,
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

  const openContext = () => {
    if (!activeFocus) return;
    explicitGematriaFocusRef.current = null;
    updateFocusContext();
    shell.openAction?.({
      id: activeFocus.number ? String(activeFocus.number) : activeFocus.id,
      type: activeFocus.number ? "number" : "post_region",
      label: activeFocus.primary,
      href: `/post/${post.slug}#source-region-${activeFocus.id}`,
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
        const numericValue = /^\d[\d,]*$/.test(term) ? Number(term.replace(/,/g, "")) : null;
        if (Number.isSafeInteger(numericValue)) {
          openHeroNumber(numericValue);
        } else {
          const occurrence = measureSource.legacyOccurrences?.find(row => row.locator === `#${legacyNumber.id}`);
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
          href: `/post/${post.slug}`,
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
      href: "/2029/number/" + number,
      source: "post-master-hero",
      number: Number(number),
      locator: targetRegion ? `#source-region-${targetRegion.id}` : null,
      sourceLabel: "מספר מתוך הפוסט · מעבר עקיף, ללא טענת חישוב",
    });
  };

  return <article
    className={`sod29-reading-post${experience.wireframe ? " is-architecture-wireframe" : ""}`}
    data-golden={projection.golden ? "true" : "false"}
    data-experience-surface="post-reading"
    data-experience-capability="post-master-reading-stage"
    data-architecture-wireframe={experience.wireframe ? "true" : undefined}
    data-post-slug={post.slug}
    data-post-character={character}
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
          <h1>{humanContentTitle(post.title, { max: 0 })}</h1>
          <span className="sod29-orientation-host" ref={shell.registerOrientationHost} />
          <details className="sod29-post-details">
            <summary>
              <span className="sod29-reading-source-badge">{visibleSourceLabel}</span>
              {heroCategories.length ? <PostCategories2029 categories={heroCategories} max={2} nested className="sod29-post-category" /> : null}
              <span className="sod29-post-details-label">פרטי הפוסט <span aria-hidden="true">⌄</span></span>
            </summary>
            <div className="sod29-post-details-body">
              {post.author ? <p>מאת {post.author}</p> : null}
              <p className="sod29-reading-source-line">{projection.sourceLine}</p>
              {heroDate ? <p>תאריך הפוסט: <time dateTime={heroDate}>{bilingualDateLabel(heroDate, heroDate)}</time></p> : null}
              <div className="sod29-reading-meta-line">
                <PostCategories2029 categories={post.categories} max={8} />
              </div>
              {projection.excerpt ? <p>{projection.excerpt}</p> : null}
              {heroNumbers.length ? <p>המספרים פותחים חלונית באותו מקום. אפשר לבדוק את החישוב ולהמשיך בקריאה.</p> : null}
              {!isBennettMaster && !isFz1073Master && !isElectionsMaster ? <p>המקור נשמר כלשונו. חישוב, מקור ופרשנות נשארים שכבות נפרדות.</p> : null}
            </div>
          </details>
        </div>

        {heroNumbers.length && !isBennettMaster && !isElectionsMaster ? <div id="post-gematria" className="sod29-reading-number-stage" aria-label="מספרים מרכזיים">
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
    </header>

    {sourceUpdates.length ? <aside className="sod29-update-strip" aria-label="עדכון במקור" data-source-update-strip="true">
      <span className="sod29-update-strip-kicker">עודכן</span>
      <button type="button" className="sod29-update-strip-link" onClick={() => jumpToSourceUpdate(sourceUpdates[0])}>
        <strong>{sourceUpdates[0].label}</strong>
        <small>{sourceUpdates[0].attribution} · <time dateTime={sourceUpdates[0].updatedAt}>{formatUpdateDate(sourceUpdates[0].updatedAt)}</time></small>
      </button>
      {sourceUpdates.length > 1 ? <details className="sod29-update-strip-more">
        <summary>עוד {sourceUpdates.length - 1}</summary>
        <ul>
          {sourceUpdates.slice(1, 6).map((entry) => <li key={entry.id}>
            <button type="button" onClick={() => jumpToSourceUpdate(entry)}>
              <span>{entry.label}</span><small><time dateTime={entry.updatedAt}>{formatUpdateDate(entry.updatedAt)}</time></small>
            </button>
          </li>)}
        </ul>
      </details> : null}
    </aside> : null}
    {coverItem ? <figure className="sod29-reading-cover" data-experience-capability="post-reading-cover">
      <CanonicalMediaFigure2029 item={coverItem} primary alt={`פתח את תמונת הפוסט: ${coverItem.label}`} contextNote={null} />
    </figure> : null}

    <SurfaceSectionNav2029 items={sectionItems} ariaLabel="בתוך הפוסט" />

    <PostEvidenceMedia2029 media={experience.media} />

    {/* The event sequence lives in the context rail (tree) and the bottom path: no third inline copy. */}

    <div className="sod29-reading-layout">
      <section
        ref={sourceRef}
        className="sod29-reading-source"
        aria-label="טקסט המקור"
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
        dangerouslySetInnerHTML={{ __html: passiveSourceHtml }}
      />


    </div>

    {calculationNotice ? (calculationFeedbackHost
      ? createPortal(<><p role="status">{calculationNotice}</p>{explorationOccurrence ? <div className="sod29-post-engine-exploration">
        <p>אפשר לבדוק את הביטוי מחדש במנוע. זו בדיקה נוספת, ואינה משלימה את התיעוד או מאמתת את חישוב המקור.</p>
        <button type="button" onClick={openPostEngineExploration}>בדיקה חדשה במנוע</button>
      </div> : null}</>, calculationFeedbackHost)
      : <p role="status">{calculationNotice}</p>) : null}
    <details ref={researchRef} open={researchOpen} className="sod29-post-research" id="post-research"
      data-experience-capability="post-sources-and-connections"
      onToggle={event => {
        if (event.target !== event.currentTarget) return;
        setResearchOpen(event.currentTarget.open);
        if (event.currentTarget.open) setResearchStarted(true);
      }}>
      <summary>
        <span className="sod29-post-research-title">מקורות וקשרים</span>
        <span className="sod29-post-research-hint">מקור, חיבורים, ציר זמן ומדדים — בלי להעמיס על הקריאה</span>
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

    <PostTimeline2029 items={visibleTimeline} currentHref={`/post/${post.slug}`} />

    <footer id="post-sources" className="sod29-reading-footnote">
      <span>מקור</span>
      <strong>{projection.sourceLine}</strong>
      <p>{projection.caveat}</p>
    </footer>
      </div>
    </details>
    {commentArchiveId != null ? <PostComments2029 key={String(commentArchiveId)} postWpId={commentArchiveId} /> : null}
    <nav id="post-next" className="sod29-post-next" aria-label="להמשיך לגלות">
      <a href="/2029/posts" onClick={(event) => openConnection(event, "/2029/posts")}>לכל הפוסטים ←</a>
      <a href="/world" onClick={(event) => openConnection(event, "/world")}>להמשיך לגלות בעולם ←</a>
    </nav>
  </article>;
}

export default function Post2029Page() {
  const { slug } = useParams();

  useEffect(() => {
    applySeo({
      title: "SOD1820 · פוסט",
      description: "פוסט ורמזים בתוך SOD1820.",
      path: `/post/${slug || ""}`,
      type: "article",
      noindex: true,
    });
  }, [slug]);

  return <Sod2029Shell
    surface="post"
    title="פוסט"
    introVariant="none"
    symbol="✦"
    status="פוסט"
  >
    <PostReadingBody />
  </Sod2029Shell>;
}
