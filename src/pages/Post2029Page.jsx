import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Sod2029Shell, { FrameState, use2029Shell } from "../components/experience2029/Sod2029Shell.jsx";
import SurfaceSectionNav2029 from "../components/experience2029/SurfaceSectionNav2029.jsx";
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
  const explicitGematriaFocusRef = useRef(null);
  const [state, setState] = useState({ loading: true, projection: null, error: null });
  const [activeRegionId, setActiveRegionId] = useState(null);

  useEffect(() => {
    let live = true;
    explicitGematriaFocusRef.current = null;
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
  const sectionItems = useMemo(() => [
    { id: "post-story", label: "הסיפור", targetId: "post-story" },
    ...(regions.some((region) => Number(region.number)) ? [{ id: "post-gematria", label: "גימטריות", targetId: "post-gematria" }] : []),
    { id: "post-connections", label: "חיבורים", targetId: "post-connections" },
    { id: "post-sources", label: "מקורות", targetId: "post-sources" },
    { id: "post-next", label: "המשך", targetId: "post-next" },
  ], [regions]);

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
  const isBennettMaster = post.slug === "bennett-melach-631-78";
  const isFz1073Master = post.slug === "flydubai-fz1073-363-14000-remzei-geula";
  const isElectionsMaster = post.slug === "sharshar-elections-redemption-hints-draft";
  const heroNumbers = isElectionsMaster
    ? [631, 271, 2701, 1820, 26, 66]
    : isBennettMaster
    ? [631]
    : isFz1073Master
      ? [363, 1073, 718]
      : [...new Set(
          regions.map((region) => Number(region.number)).filter((value) => Number.isSafeInteger(value) && value > 0)
        )].slice(0, 5);
  const heroCategories = (Array.isArray(post.categories) ? post.categories : []).slice(0, 3);
  const heroDate = isBennettMaster
    ? "2026-10-01"
    : isFz1073Master
      ? "2026-09-30"
      : String(post.date || post.modified || "").slice(0, 10);
  const visibleSourceLabel = isBennettMaster
    ? "פוסט הבחירות · ציר 631"
    : isFz1073Master
      ? "טיסה FZ1073"
      : projection.sourceLabel;
  const visibleTimeline = (experience.timeline || []).map((item) => (
    isBennettMaster && item.id === "bennett-salt-golden"
      ? { ...item, label: "הפוסט פורסם", date: "2026-10-01", sourceLabel: null, note: "תאריך הפרסום של הפוסט.", current: true }
      : item
  ));
  const contextualConnections = (experience.connections || []).filter((connection) => {
    if (!activeFocus) return true;
    const focusNeedle = normalize(activeFocus.primary || activeFocus.label);
    const haystack = normalize([connection.label, connection.reason, connection.value].filter(Boolean).join(" "));
    return !focusNeedle || haystack.includes(focusNeedle) || (experience.connections || []).length <= 6;
  });
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
    shell.openInspect?.({
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

    if (isFz1073Master) {
      const legacyNumber = event.target?.closest?.(".sod-numlink[data-gem]");
      if (legacyNumber && sourceRef.current?.contains(legacyNumber)) {
        const numericValue = Number(String(legacyNumber.dataset.gem || "").replace(/,/g, ""));
        if (Number.isSafeInteger(numericValue)) {
          event.preventDefault();
          openHeroNumber(numericValue);
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
    shell.openInspect?.({
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
      <b>WIREFRAME · מבנה בלבד</b>
      <span>עכשיו בודקים רק איפה כל דבר חי: ניווט גלובלי · תוכן · Context Inspector · ציר זמן · Research Path · Raziel. עיצוב יגיע אחר כך.</span>
    </section> : null}

    <header id="post-story" className="sod29-reading-hero" data-experience-capability="post-master-hero">
      <div className="sod29-reading-hero-grid">
        <div className="sod29-reading-hero-copy">
          <div className="sod29-reading-source-badge">{visibleSourceLabel}</div>
          <h1>{post.title}</h1>
          <p className="sod29-reading-source-line">{projection.sourceLine}</p>
          <p className="sod29-reading-deck">{projection.excerpt}</p>
          <div className="sod29-reading-meta-line">
            {heroDate ? <span>{heroDate}</span> : null}
            {heroCategories.map((category) => <span key={category}>{category}</span>)}
          </div>
          {!isBennettMaster && !isFz1073Master && !isElectionsMaster ? <div className="sod29-reading-integrity">
            <span>המקור נשמר כלשונו</span>
            <span>חישוב · מקור · פרשנות נשארים שכבות נפרדות</span>
          </div> : null}
        </div>

        {heroNumbers.length ? <div id="post-gematria" className="sod29-reading-number-stage" aria-label="מספרים מרכזיים">
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
          <p>{isBennettMaster || isFz1073Master || isElectionsMaster ? "לחצו על מספר כדי לפתוח את החיבור ולחזור בדיוק לאותו מקום." : "המספרים הם נקודות כניסה למחקר. הבדיקה נפתחת באותו Contextual Sidecar ושומרת את הפוסט והדרך חזרה."}</p>
        </div> : null}
      </div>
    </header>

    <PostEvidenceMedia2029 media={experience.media} />

    {(experience.trail || []).length >= 2 ? <nav className="sod29-chain-trail" aria-label="מקומו של הפוסט בשרשרת" data-chain-trail="true">
      {experience.trail.map((step, index) => <React.Fragment key={step.id}>
        {index > 0 ? <span className="sod29-chain-trail-sep" aria-hidden="true">←</span> : null}
        {step.active
          ? <span className="sod29-chain-trail-step is-here" aria-current="page">{step.label} <small>(אתה כאן)</small></span>
          : <a className="sod29-chain-trail-step" href={step.href}>{step.label}</a>}
      </React.Fragment>)}
    </nav> : null}

    <div className="sod29-reading-layout">
      <section
        ref={sourceRef}
        className="sod29-reading-source"
        aria-label="טקסט המקור"
        onClick={handleSourceContextualFocus}
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

    </div>

    <PostTimeline2029 items={visibleTimeline} currentHref={`/post/${post.slug}`} />

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
      title: "SOD1820 · פוסט",
      description: "פוסט ורמזים בתוך SOD1820.",
      path: `/post/${slug || ""}`,
      type: "article",
      noindex: true,
    });
  }, [slug]);

  return <Sod2029Shell
    surface="post"
    symbol="✦"
    status="פוסט"
  >
    <PostReadingBody />
  </Sod2029Shell>;
}