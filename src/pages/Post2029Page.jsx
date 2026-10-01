import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Sod2029Shell, { FrameState, use2029Shell } from "../components/experience2029/Sod2029Shell.jsx";
import ReadingContextRail2029 from "../components/experience2029/ReadingContextRail2029.jsx";
import PostEvidenceMedia2029 from "../components/experience2029/PostEvidenceMedia2029.jsx";
import PostTimeline2029 from "../components/experience2029/PostTimeline2029.jsx";
import { fetchPost2029ReadingProjection } from "../lib/research/post2029ReadingProjection.js";
import { useResearch } from "../lib/research/ResearchProvider.jsx";
import { applySeo } from "../lib/seo.js";
import { hardenPassiveMediaHtml } from "../lib/mediaEgressGuard.js";
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
        bottomTrail: state.projection?.experience?.trail || [],
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
  const experience = projection.experience || {};
  const heroNumbers = [...new Set(
    regions.map((region) => Number(region.number)).filter((value) => Number.isSafeInteger(value) && value > 0)
  )].slice(0, 5);
  const heroCategories = (Array.isArray(post.categories) ? post.categories : []).slice(0, 3);
  const heroDate = String(post.modified || post.date || "").slice(0, 10);
  const contextualConnections = (experience.connections || []).filter((connection) => {
    if (!activeFocus) return true;
    const focusNeedle = normalize(activeFocus.primary || activeFocus.label);
    const haystack = normalize([connection.label, connection.reason, connection.value].filter(Boolean).join(" "));
    return !focusNeedle || haystack.includes(focusNeedle) || (experience.connections || []).length <= 6;
  });
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

  return <article
    className={`sod29-reading-post${experience.wireframe ? " is-architecture-wireframe" : ""}`}
    data-golden={projection.golden ? "true" : "false"}
    data-experience-surface="post-reading"
    data-experience-capability="post-master-reading-stage"
    data-architecture-wireframe={experience.wireframe ? "true" : undefined}
  >
    {experience.wireframe ? <section className="sod29-architecture-wireframe-note" aria-label="מבנה בלבד">
      <b>WIREFRAME · מבנה בלבד</b>
      <span>עכשיו בודקים רק איפה כל דבר חי: ניווט גלובלי · תוכן · Context Inspector · ציר זמן · Research Path · Raziel. עיצוב יגיע אחר כך.</span>
    </section> : null}

    <header className="sod29-reading-hero" data-experience-capability="post-master-hero">
      <div className="sod29-reading-hero-grid">
        <div className="sod29-reading-hero-copy">
          <div className="sod29-reading-source-badge">{projection.sourceLabel}</div>
          <h1>{post.title}</h1>
          <p className="sod29-reading-source-line">{projection.sourceLine}</p>
          <p className="sod29-reading-deck">{projection.excerpt}</p>
          <div className="sod29-reading-meta-line">
            {heroDate ? <span>{heroDate}</span> : null}
            {heroCategories.map((category) => <span key={category}>{category}</span>)}
          </div>
          <div className="sod29-reading-integrity">
            <span>המקור נשמר כלשונו</span>
            <span>חישוב · מקור · פרשנות נשארים שכבות נפרדות</span>
            {projection.previewSnapshot ? <span>Golden · Preview</span> : projection.draft ? <span>Golden · טיוטה פרטית</span> : null}
          </div>
        </div>

        {heroNumbers.length ? <div className="sod29-reading-number-stage" aria-label="מספרים מרכזיים">
          <span className="sod29-reading-number-stage-kicker">צירי הקריאה</span>
          <div className="sod29-reading-number-constellation">
            {heroNumbers.map((number, index) => <Link
              key={number}
              to={"/2029/number/" + number}
              className={"sod29-reading-number-signal signal-" + (index + 1)}
              aria-label={"פתח את מספר " + number}
            >
              <strong>{number}</strong>
              <small>פתח במספר</small>
            </Link>)}
          </div>
          <p>המספרים מודגשים כנקודות כניסה למחקר — לא כציון אמת או חשיבות.</p>
        </div> : null}
      </div>
    </header>

    <PostEvidenceMedia2029 media={experience.media} />

    <div className="sod29-reading-layout">
      <section
        ref={sourceRef}
        className="sod29-reading-source"
        aria-label="טקסט המקור"
        dangerouslySetInnerHTML={{ __html: hardenPassiveMediaHtml(post.content || "") }}
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
        connections={contextualConnections}
      />
    </div>

    <PostTimeline2029 items={experience.timeline || []} />

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