import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import Sod2029Shell from "../components/experience2029/Sod2029Shell.jsx";
import NavigationIcon2029 from "../components/experience2029/NavigationIcon2029.jsx";
import BeitMidrashHero from "../components/beitMidrash2029/BeitMidrashHero.jsx";
import BeitMidrashLearn from "../components/beitMidrash2029/BeitMidrashLearn.jsx";
import BeitMidrashMethods from "../components/beitMidrash2029/BeitMidrashMethods.jsx";
import BeitMidrashGuided from "../components/beitMidrash2029/BeitMidrashGuided.jsx";
import BeitMidrashParticipate from "../components/beitMidrash2029/BeitMidrashParticipate.jsx";
import { fetchGematriaMethodStates } from "../lib/research/gematriaMethodRegistry.js";
import { fetchNumberMethodProfile } from "../lib/research/numberCoreProjection.js";
import { fetchGematriaMethodTrace } from "../lib/research/gematriaTrace.js";
import { fetchWorldAllResearchProjection } from "../lib/research/worldAllResearchProjection.js";
import { buildBeitMidrashLearningProjection } from "../lib/research/beitMidrashLearningProjection.js";
import { applySeo } from "../lib/seo.js";
import "../components/gematria2029/spatialMethodStage2029.css";
import "./beitMidrash2029.css";

const SAMPLE_EXPRESSION = "חכמה";
const EMPTY_PROJECTION = Object.freeze({ rows: Object.freeze([]) });

function decodeMethod(value) {
  if (!value) return "";
  try {
    return decodeURIComponent(value).trim();
  } catch {
    return String(value).trim();
  }
}

function projectMethod(row, profileByKey) {
  const profile = profileByKey.get(row.method_key) || {};
  return Object.freeze({
    ...profile,
    registry: row,
    methodKey: row.method_key,
    displayLabel: row.display_label || profile.displayLabel || row.method_key,
    category: row.category || profile.category || null,
    lifecycleActive: row.active === true,
    registered: row.registered === true,
    executable: row.executable === true,
    engineVerified: row.engine_verified === true,
    scannable: row.scannable !== false,
    executionKind: row.execution_kind || profile.executionKind || null,
    operator: row.operator || profile.operator || null,
    derivedFrom: Array.isArray(row.derived_from) ? row.derived_from : profile.derivedFrom || [],
    definitionVersion: row.method_version ?? profile.definitionVersion ?? null,
    requiredEntitlement: row.required_entitlement || profile.requiredEntitlement || null,
    unavailableReason: row.not_scannable_reason || null,
  });
}

function pickMethod(methods, requested) {
  if (!requested) return null;
  const byKey = methods.find((method) => method.methodKey === requested);
  if (byKey) return byKey;
  const byLabel = methods.filter((method) => method.displayLabel === requested);
  return byLabel.length === 1 ? byLabel[0] : null;
}

export default function BeitMidrash2029Page() {
  const { method: routeMethod } = useParams();
  const { search, hash } = useLocation();
  const requestedMethod = decodeMethod(routeMethod);
  const [methodState, setMethodState] = useState({ loading: true, registry: [], profile: [], profileError: false, error: null });
  const [world, setWorld] = useState({ loading: true, projection: EMPTY_PROJECTION, error: null });
  const [worldRetry, setWorldRetry] = useState(0);
  const [traces, setTraces] = useState({});

  useEffect(() => {
    applySeo({
      title: "בית המדרש · לומדים לגלות · SOD1820",
      description: "לומדים את דרכי החישוב, הקריאה והפענוח: שיטות, מקורות, דוגמאות מודרכות ותרגול.",
      path: "/beit-midrash",
      noindex: true,
    });
    let live = true;
    Promise.allSettled([
      fetchGematriaMethodStates(),
      fetchNumberMethodProfile(SAMPLE_EXPRESSION),
    ]).then(([registryResult, profileResult]) => {
      if (!live) return;
      const profileError = profileResult.status === "rejected";
      if (registryResult.status === "rejected") {
        setMethodState({ loading: false, registry: [], profile: [], profileError, error: registryResult.reason });
        return;
      }
      setMethodState({
        loading: false,
        registry: Array.isArray(registryResult.value) ? registryResult.value : [],
        profile: !profileError && Array.isArray(profileResult.value) ? profileResult.value : [],
        profileError,
        error: null,
      });
    });
    return () => { live = false; };
  }, []);

  // The World projection is loaded once and handed to the learning contract.
  useEffect(() => {
    let live = true;
    setWorld({ loading: true, projection: EMPTY_PROJECTION, error: null });
    fetchWorldAllResearchProjection().then((projection) => {
      if (live) setWorld({ loading: false, projection, error: null });
    }).catch((error) => {
      if (live) setWorld({ loading: false, projection: EMPTY_PROJECTION, error });
    });
    return () => { live = false; };
  }, [worldRetry]);

  const learning = useMemo(() => buildBeitMidrashLearningProjection({
    worldProjection: world.projection,
    methodKey: requestedMethod || null,
    search,
  }), [world.projection, requestedMethod, search]);
  const { manifest, location: place, guidedExamples } = learning;
  const sectionOf = (id) => manifest.sections.find((section) => section.id === id);

  const methods = useMemo(() => {
    const profileByKey = new Map(methodState.profile.map((row) => [row.methodKey, row]));
    return methodState.registry.map((row) => projectMethod(row, profileByKey));
  }, [methodState.profile, methodState.registry]);
  const activeMethods = useMemo(() => methods.filter((method) => method.lifecycleActive), [methods]);
  const unavailableMethods = useMemo(() => methods.filter((method) => method.registered && !method.lifecycleActive), [methods]);
  const selectedMethod = pickMethod(methods, place.methodKey);

  // Resume an exact section / method / example from the URL, without redirecting.
  const target = place.methodKey && !methodState.loading
    ? "bm-lesson-title"
    : place.findingId && !world.loading ? `guided-${place.guidedKind === "convergence" ? "convergence" : "crossing"}-${place.findingId}`
      : place.guidedKind ? `guided-${place.guidedKind}`
        : place.conceptId ? `number-concept-${place.conceptId}`
          : place.pathId ? `path-${place.pathId}`
        : place.section !== "start" ? place.section : "";
  useEffect(() => {
    const id = target || decodeMethod((hash || "").replace(/^#/, ""));
    if (!id) return undefined;
    const frame = requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ block: "start" });
    });
    return () => cancelAnimationFrame(frame);
  }, [target, hash]);

  const loadTrace = async () => {
    if (!selectedMethod || selectedMethod.computedValue == null) return;
    const key = selectedMethod.methodKey;
    setTraces((current) => ({ ...current, [key]: { loading: true, finding: null, error: null } }));
    try {
      const finding = await fetchGematriaMethodTrace(key, SAMPLE_EXPRESSION);
      setTraces((current) => ({
        ...current,
        [key]: finding
          ? { loading: false, finding, error: null }
          : { loading: false, finding: null, error: new Error("TRACE_UNAVAILABLE") },
      }));
    } catch (error) {
      setTraces((current) => ({ ...current, [key]: { loading: false, finding: null, error } }));
    }
  };

  const pillars = manifest.pillars;
  return <Sod2029Shell
    surface="beit-midrash"
    introVariant="none"
    symbol={<NavigationIcon2029 name="books" />}
    eyebrow={manifest.identity.eyebrow}
    title={manifest.identity.title}
    description={manifest.identity.description}
  >
    <main className="sod29-midrash" data-experience-surface="beit-midrash" data-canonical-route={manifest.identity.canonicalRoute}>
      <BeitMidrashHero identity={manifest.identity} pillars={pillars} />

      <BeitMidrashLearn
        manifest={manifest}
        focusedSection={place.section}
        focusedPath={place.pathId}
        focusedConcept={place.conceptId}
        focusedSourceStep={place.sourceStepId}
      >
        <BeitMidrashMethods
          section={sectionOf("methods")}
          focused={place.section === "methods"}
          state={methodState}
          activeMethods={activeMethods}
          unavailableMethods={unavailableMethods}
          methods={methods}
          requestedMethod={place.methodKey}
          selectedMethod={selectedMethod}
          blocks={manifest.methodLesson.blocks}
          sampleExpression={SAMPLE_EXPRESSION}
          traceState={selectedMethod ? traces[selectedMethod.methodKey] : null}
          onLoadTrace={loadTrace}
        />
      </BeitMidrashLearn>

      <div className="bm-pillar" id="bm-discover">
        <h2 className="bm-pillar-title"><span aria-hidden="true">ב</span>{pillars[1].title}</h2>
        <BeitMidrashGuided
          section={sectionOf("guided")}
          focused={place.section === "guided"}
          world={{ loading: world.loading, error: world.error, retry: () => setWorldRetry((value) => value + 1) }}
          guided={guidedExamples}
          language={manifest.language}
          mapCallout={guidedExamples.mapCallout}
        />
      </div>

      <div className="bm-pillar" id="bm-participate">
        <h2 className="bm-pillar-title"><span aria-hidden="true">ג</span>{pillars[2].title}</h2>
        <BeitMidrashParticipate manifest={manifest} focusedSection={place.section} />
      </div>
    </main>
  </Sod2029Shell>;
}
