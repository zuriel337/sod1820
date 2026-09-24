import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Sod2029Shell, { FrameState, use2029Shell } from "../components/experience2029/Sod2029Shell.jsx";
import ReadingContextRail2029 from "../components/experience2029/ReadingContextRail2029.jsx";
import { fetchPost2029ReadingProjection } from "../lib/research/post2029ReadingProjection.js";
import { useResearch } from "../lib/research/ResearchProvider.jsx";
import { applySeo } from "../lib/seo.js";
import "./post2029-reading.css";

const normalize = (value) => String(value || "")
  .replace(/[״"']/g, "")
  .replace(/\s+/g, " ")
  .trim();

function PostReadingBody() {
  const { slug } = useParams();
  const shell = use2029Shell();
  const research = useResearch();
  const sourceRef = useRef(null);
  const [state, setState] = useState({ loading: true, projection: null, error: null });
  const [activeRegionId, setActiveRegionId] = useState(null);

  useEffect(() => {
    let live = true;
    setState({ loading: true, projection: null, error: null });
    fetchPost2029ReadingProjection(slug)
      .then((projection) => {
        if (!live) return;
        setState({
          loading: false,
          projection,
          error: projection ? null : "הפוסט לא נמצא",
        });
        setActiveRegionId(projection?.defaultRegionId || null);
      })
      .catch((error) => {
        if (live) setState({ loading: false, projection: null, error: error?.message || "טעינת הפוסט נכשלה" });
      });
    return () => { live = false; };
  }, [slug]);

  const regions = state.projection?.regions || [];
  const activeFocus = useMemo(
    () => regions.find((region) => region.id === activeRegionId) || regions[0] || null,
    [regions, activeRegionId],
  );

  useEffect(() => {
    if (!state.projection || !sourceRef.current || !regions.length) return undefined;
    const headings = [...sourceRef.current.querySelectorAll("[data-source-heading='true']")];
    const mapped = [];

    for (const region of regions) {
      const heading = headings.find((node) => normalize(node.textContent) === normalize(region.heading));
      if (!heading) continue;
      heading.dataset.readingRegion = region.id;
      heading.id = `source-region-${region.id}`;
      mapped.push({ region, heading });
    }
    if (!mapped.length || typeof IntersectionObserver === "undefined") return undefined;

    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      const id = visible?.target?.dataset?.readingRegion;
      if (id) setActiveRegionId(id);
    }, { rootMargin: "-16% 0px -68% 0px", threshold: [0, 1] });

    mapped.forEach(({ heading }) => observer.observe(heading));
    return () => observer.disconnect();
  }, [state.projection, regions]);

  useEffect(() => {
    if (!state.projection || !activeFocus) return;
    const post = state.projection.post;
    research.updateResearchContext?.({
      subject: {
        id: String(post.id),
        type: "post",
        label: post.title,
        href: `/post/${post.slug}`,
      },
      selection: {
        entityId: activeFocus.id,
        entityType: "post_region",
        locator: `#source-region-${activeFocus.id}`,
      },
      lens: "reading",
      dimensions: {
        ...(research.context?.dimensions || {}),
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
  }, [activeFocus?.id, state.projection?.post?.id]);

  if (state.loading) {
    return <FrameState kind="loading" title="פותח את המקור">המילים נשארות במרכז; שכבת ההקשר נטענת מסביבן.</FrameState>;
  }
  if (state.error || !state.projection) {
    return <FrameState kind="error" title="לא הצלחתי לפתוח את הפוסט">{state.error}</FrameState>;
  }

  const { projection } = state;
  const { post } = projection;
  const exactReturn = {
    href: `/post/${post.slug}#source-region-${activeFocus?.id || projection.defaultRegionId}`,
    label: post.title,
    subject: { id: String(post.id), type: "post", label: post.title, href: `/post/${post.slug}` },
    selection: activeFocus ? {
      entityId: activeFocus.id,
      entityType: "post_region",
      locator: `#source-region-${activeFocus.id}`,
    } : null,
    lens: "reading",
    dimensions: research.context?.dimensions || {},
    journey: research.context?.journey || null,
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
    updateFocusContext();
    const subject = activeFocus.number
      ? { id: String(activeFocus.number), type: "number", label: String(activeFocus.number), href: `/2029/number/${activeFocus.number}` }
      : { id: activeFocus.primary, type: "phrase", label: activeFocus.primary, href: "/world" };
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
    updateFocusContext();
    shell.openAction?.({
      id: activeFocus.number ? String(activeFocus.number) : activeFocus.id,
      type: activeFocus.number ? "number" : "post_region",
      label: activeFocus.primary,
      href: `/post/${post.slug}#source-region-${activeFocus.id}`,
    });
  };

  return <article className="sod29-reading-post" data-golden={projection.golden ? "true" : "false"}>
    <header className="sod29-reading-hero">
      <div className="sod29-reading-source-badge">{projection.sourceLabel}</div>
      <h1>{post.title}</h1>
      <p className="sod29-reading-source-line">{projection.sourceLine}</p>
      <p className="sod29-reading-deck">{projection.excerpt}</p>
      <div className="sod29-reading-integrity">
        <span>המקור נשמר כלשונו</span>
        {projection.draft ? <span>Golden · טיוטה פרטית</span> : null}
      </div>
    </header>

    <div className="sod29-reading-layout">
      <section
        ref={sourceRef}
        className="sod29-reading-source"
        aria-label="טקסט המקור"
        dangerouslySetInnerHTML={{ __html: post.content || "" }}
      />

      <nav className="sod29-reading-spine" aria-label="עומק זמין לאורך המקור">
        <span className="sod29-reading-spine-line" aria-hidden="true" />
        {regions.map((region) => <button
          key={region.id}
          type="button"
          className={region.id === activeFocus?.id ? "is-active" : ""}
          onClick={() => {
            setActiveRegionId(region.id);
            document.getElementById(`source-region-${region.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
          }}
          aria-label={`עבור אל ${region.label}`}
          aria-current={region.id === activeFocus?.id ? "true" : undefined}
        ><span /></button>)}
      </nav>

      <ReadingContextRail2029
        focus={activeFocus}
        onOpenWorld={openWorld}
        onOpenNumber={openNumber}
        onAskRaziel={askRaziel}
        onOpenContext={openContext}
      />
    </div>

    <footer className="sod29-reading-footnote">
      <span>מקור</span>
      <strong>{projection.sourceLine}</strong>
      <p>{projection.caveat}</p>
    </footer>
  </article>;
}

export default function Post2029Page() {
  const { slug } = useParams();

  useEffect(() => {
    applySeo({
      title: "SOD1820 · Post 2029 Golden",
      description: "Golden Preview למשטח הקריאה החדש של SOD1820.",
      path: `/post/${slug || ""}`,
      type: "article",
      noindex: true,
    });
  }, [slug]);

  return <Sod2029Shell
    surface="post"
    symbol="✦"
    status="Post 2029 · GOLDEN"
  >
    <PostReadingBody />
  </Sod2029Shell>;
}