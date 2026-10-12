import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import Sod2029Shell, { FrameState, use2029Shell } from "../components/experience2029/Sod2029Shell.jsx";
import SurfaceSectionNav2029 from "../components/experience2029/SurfaceSectionNav2029.jsx";
import PostEvidenceMedia2029 from "../components/experience2029/PostEvidenceMedia2029.jsx";
import PostTimeline2029 from "../components/experience2029/PostTimeline2029.jsx";
import { fetchPost2029ReadingProjection, resolvePostReadingRegion } from "../lib/research/post2029ReadingProjection.js";
import { mergeContextPackWithConnections } from "../lib/research/goldenPostContextPacks.js";
import { goldenPublicSurfaceFindings } from "../lib/research/goldenProjectorModes.js";
import { useResearch } from "../lib/research/ResearchProvider.jsx";
import { applySeo } from "../lib/seo.js";
import { hardenPassiveMediaHtml } from "../lib/mediaEgressGuard.js";
import { humanContentTitle } from "../lib/presentation/contentTitle.js";
import { bilingualDateLabel } from "../lib/relativeTime2029.js";
import { provenSourceUpdatesFor, provenUpdateForHash, formatUpdateDate } from "../lib/research/postSourceUpdates2029.js";
import CanonicalMediaFigure2029 from "../components/experience2029/CanonicalMediaFigure2029.jsx";
import PostCategories2029 from "../components/experience2029/PostCategories2029.jsx";
import PostConvergenceMeasures2029 from "../components/experience2029/PostConvergenceMeasures2029.jsx";
import "./post2029-reading.css";

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
  const sourceRef = useRef(null);
  const connectionsHeadingRef = useRef(null);
  const explicitGematriaFocusRef = useRef(null);
  const entryRef = useRef(null);
  entryRef.current = { context: research.context, hash: location.hash };
  const restoredRegionRef = useRef(null);
  const [state, setState] = useState({ loading: true, projection: null, error: null });
  const [activeRegionId, setActiveRegionId] = useState(null);
  const [sourceUpdates, setSourceUpdates] = useState([]);

  useEffect(() => {
    let live = true;
    explicitGematriaFocusRef.current = null;
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
    return () => { live = false; };
  }, [slug]);

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
  const sectionItems = useMemo(() => [
    { id: "post-story", label: "הסיפור", targetId: "post-story" },
    ...(regions.some((region) => Number(region.number)) ? [{ id: "post-gematria", label: "גימטריות", targetId: `source-region-${regions.find((region) => Number(region.number)).id}` }] : []),
    ...(state.projection?.experience?.connections?.some((item) => item.href)
      ? [{ id: "post-connections", label: "חיבורים", targetId: "post-connections" }] : []),
    { id: "post-sources", label: "מקורות", targetId: "post-sources" },
    { id: "post-next", label: "המשך", targetId: "post-next" },
  ], [regions, state.projection]);

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
    for (const node of sourceRef.current.querySelectorAll("[data-gem]")) {
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
      heading.id = `source-region-${region.id}`;
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

  if (state.loading) {
    return <FrameState kind="loading" title="פותח את המקור">המילים נשארות במרכז; שכבת ההקשר נטענת מסביבן.</FrameState>;
  }
  if (state.error || !state.projection) {
    return <FrameState kind="error" title="לא הצלחתי לפתוח את הפוסט">{state.error}</FrameState>;
  }

  const { projection } = state;
  const { post } = projection;
  const coverItem = postReadingCoverItem(post);
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
  // Cover is the existing post media: prefer the persisted small derivative,
  // fall back to image_url. The original is never replaced or rewritten.
  const heroCover = /^https:\/\//i.test(String(post.thumb_url || post.image_url || ""))
    ? String(post.thumb_url || post.image_url)
    : null;
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
    shell.go(activeFocus.id === "ciphers" ? "/els" : "/world", { preserve: false });
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
    const cleanExpression = String(expression || "").trim();
    const cleanMethodKey = String(methodKey || "").trim();
    const numericResult = Number(resultValue);
    if (!cleanExpression || !cleanMethodKey || !Number.isSafeInteger(numericResult)) return;

    const targetRegion = regions.find((region) => region.id === regionId)
      || regions.find((region) => Number(region.number) === numericResult)
      || activeFocus;
    if (!targetRegion) return;

    const locator = `#source-region-${targetRegion.id}`;
    const explicitSubject = {
      id: String(numericResult),
      type: "number",
      label: String(numericResult),
      href: `/2029/number/${numericResult}`,
    };
    const explicitSelection = {
      entityId: targetRegion.id,
      entityType: "gematria_expression",
      locator,
      expression: cleanExpression,
      method: cleanMethodKey,
      resultValue: numericResult,
    };
    const explicitBottomTrail = [
      { id: "post", label: "פוסט" },
      { id: "gematria", label: "גימטריות" },
      { id: "number", label: String(numericResult), active: true },
    ];
    const explicitSurfaceFocus = {
      id: targetRegion.id,
      type: "gematria_expression",
      sectionLabel: "גימטריות",
      label: cleanExpression,
      primary: cleanExpression,
      expression: cleanExpression,
      method: cleanMethodKey,
      resultValue: numericResult,
      number: numericResult,
      signals: targetRegion.signals || [],
      sourceLabel: projection.sourceLabel,
      locator,
    };
    explicitGematriaFocusRef.current = {
      postId: String(post.id),
      subject: explicitSubject,
      selection: explicitSelection,
      bottomTrail: explicitBottomTrail,
      surfaceFocus: explicitSurfaceFocus,
    };
    setActiveRegionId(targetRegion.id);
    research.updateResearchContext?.({
      subject: explicitSubject,
      selection: explicitSelection,
      lens: "gematria",
      dimensions: {
        ...(research.context?.dimensions || {}),
        bottomTrail: explicitBottomTrail,
        surfaceFocus: explicitSurfaceFocus,
        readingFocus: {
          id: targetRegion.id,
          label: targetRegion.label,
          primary: targetRegion.primary,
          signals: targetRegion.signals || [],
          number: numericResult,
          expression: cleanExpression,
          method: cleanMethodKey,
          resultValue: numericResult,
          sourceLabel: projection.sourceLabel,
          postId: String(post.id),
          postSlug: post.slug,
          locator,
        },
      },
      returnTo: exactReturnForRegion(targetRegion),
    });
    shell.openNumber?.({
      id: `post:${post.id}:${targetRegion.id}`,
      type: "phrase",
      label: cleanExpression,
      href: `/post/${post.slug}${locator}`,
      source: "post-contextual-focus",
      expression: cleanExpression,
      method: cleanMethodKey,
      resultValue: numericResult,
      number: numericResult,
      locator,
      sourceLabel: projection.sourceLabel,
    });
  };

  const handleSourceContextualFocus = (event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
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
          const locator = activeFocus ? `#source-region-${activeFocus.id}` : "#post-story";
          research.updateResearchContext?.({
            subject: { id: String(post.id), type: "post", label: post.title, href: `/post/${post.slug}` },
            selection: { entityId: activeFocus?.id || String(post.id), entityType: "gematria_expression", locator, expression: term },
            lens: "gematria",
            returnTo: exactReturnForRegion(activeFocus),
          });
          shell.openNumber?.({ id: `post:${post.id}:${term}`, type: "phrase", label: term, expression: term,
            method: legacyNumber.dataset.method || undefined,
            source: "post-authored-gematria", locator, sourceLabel: projection.sourceLabel });
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
      sourceLabel: projection.sourceLabel,
    });
  };

  return <article
    className={`sod29-reading-post${experience.wireframe ? " is-architecture-wireframe" : ""}`}
    data-golden={projection.golden ? "true" : "false"}
    data-experience-surface="post-reading"
    data-experience-capability="post-master-reading-stage"
    data-architecture-wireframe={experience.wireframe ? "true" : undefined}
    data-post-slug={post.slug}
  >
    {experience.wireframe ? <section className="sod29-architecture-wireframe-note" aria-label="מבנה בלבד">
      <b>מבנה בלבד</b>
      <span>עכשיו בודקים רק איפה כל דבר חי: ניווט · תוכן · בדיקה מהירה · ציר זמן · חיבורים · רזיאל.</span>
    </section> : null}

    <header id="post-story" className="sod29-reading-hero" data-experience-capability="post-master-hero">
      <div className="sod29-reading-hero-grid">
        {heroCover ? <figure className="sod29-reading-cover" data-post-cover="true">
          <img
            src={heroCover}
            alt=""
            width="1200"
            height="630"
            decoding="async"
            fetchPriority="high"
          />
        </figure> : null}
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
        onClick={handleSourceContextualFocus}
        onKeyDown={(event) => {
          if ((event.key === "Enter" || event.key === " ") && event.target?.matches?.('[data-gem][role="button"]')) {
            event.preventDefault();
            handleSourceContextualFocus(event);
          }
        }}
        dangerouslySetInnerHTML={{ __html: hardenPassiveMediaHtml(post.content || "") }}
      />


    </div>

    <PostConvergenceMeasures2029 tags={post.tags} fallbackNumbers={heroNumbers} />

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
