import { useEffect, useMemo, useRef, useState } from "react";
import { fetchNumberMethodProfile } from "./numberCoreProjection.js";
import { fetchGematriaMethodTrace } from "./gematriaTrace.js";
import { buildCalculator2029FastPreview } from "./calculator2029FastPreview.js";
import { classifyCalculatorInput, filterProfileRowsForInput, isEnglishMethodKey } from "./calculator2029Input.js";
import { buildEnglishLaneRows } from "./calculator2029English.js";
import { ledgerFromFinding } from "./calculator2029Ledger.js";
import { emit } from "../events.js";
import { normalizeCalculatorMethods, buildCanonicalComputeTelemetry } from "./calculator2029Model.js";

const clean = (value) => value == null ? "" : String(value).trim();
export const CALCULATOR_ROW_SETTLE_MS = 240;
const CACHE_LIMIT = 60;

// Settled canonical results are remembered for the session so retyping a word is instant.
const profileCache = new Map();
const ledgerCache = new Map();
function remember(cache, key, value) {
  if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value);
  cache.set(key, value);
}

export function useCalculatorRow(seed = "", { telemetrySurface = "professional" } = {}) {
  const [draft, setDraft] = useState(seed);
  const [profile, setProfile] = useState({ loading: false, rows: [], error: null, expression: "" });
  const requestRef = useRef(0);
  const info = useMemo(() => classifyCalculatorInput(draft), [draft]);

  useEffect(() => {
    const phrase = info.expression;
    const id = ++requestRef.current;
    if (!phrase || !(info.hebrewApplicable || info.englishApplicable)) {
      setProfile({ loading: false, rows: [], error: null, expression: phrase });
      return undefined;
    }
    const cached = profileCache.get(phrase);
    if (cached) {
      setProfile({ loading: false, rows: cached, error: null, expression: phrase });
      return undefined;
    }
    setProfile((current) => ({ ...current, loading: true, error: null }));
    const timer = window.setTimeout(async () => {
      try {
        const rows = await fetchNumberMethodProfile(phrase);
        if (rows.length) remember(profileCache, phrase, rows);
        if (id === requestRef.current) {
          setProfile({ loading: false, rows, error: null, expression: phrase });
          const telemetry = buildCanonicalComputeTelemetry(phrase, rows);
          if (telemetry) emit("calculator_2029", "canonical_compute", { props: { ...telemetry, surface: telemetrySurface } });
        }
      } catch (error) {
        if (id === requestRef.current) setProfile({ loading: false, rows: [], error, expression: phrase });
      }
    }, CALCULATOR_ROW_SETTLE_MS);
    return () => window.clearTimeout(timer);
  }, [info.expression, info.hebrewApplicable, info.englishApplicable]);

  const canonicalSettled = Boolean(
    info.expression
    && clean(profile.expression) === info.expression
    && !profile.loading
    && !profile.error
    && profile.rows.length,
  );

  const preview = useMemo(() => buildCalculator2029FastPreview(draft), [draft]);

  const hebrewRows = useMemo(() => {
    if (!info.hebrewApplicable) return [];
    if (canonicalSettled) {
      return normalizeCalculatorMethods(
        filterProfileRowsForInput(profile.rows, info).filter((row) => !isEnglishMethodKey(row.methodKey)),
      );
    }
    return (preview.methods || []).map((row) => ({ ...row, label: row.displayLabel, category: "base" }));
  }, [info, canonicalSettled, profile.rows, preview]);

  const englishRows = useMemo(
    () => buildEnglishLaneRows(info.expression, canonicalSettled ? profile.rows : []),
    [info.expression, canonicalSettled, profile.rows],
  );

  return { draft, setDraft, info, profile, canonicalSettled, hebrewRows, englishRows };
}

// Letter ledger from the canonical trace RPC, one lazy fetch per expression+method.
export function useMethodLedger(selection) {
  const expression = selection?.expression || "";
  const methodKey = selection?.methodKey || "";
  const [state, setState] = useState({ key: null, loading: false, ledger: null, error: null });

  useEffect(() => {
    if (!expression || !methodKey) {
      setState({ key: null, loading: false, ledger: null, error: null });
      return undefined;
    }
    const key = expression + "::" + methodKey;
    const cached = ledgerCache.get(key);
    if (cached) {
      setState({ key, loading: false, ledger: cached, error: null });
      return undefined;
    }
    let alive = true;
    setState({ key, loading: true, ledger: null, error: null });
    fetchGematriaMethodTrace(methodKey, expression)
      .then((finding) => {
        if (!alive) return;
        const ledger = ledgerFromFinding(finding);
        remember(ledgerCache, key, ledger);
        setState({ key, loading: false, ledger, error: null });
      })
      .catch((error) => {
        if (alive) setState({ key, loading: false, ledger: null, error });
      });
    return () => { alive = false; };
  }, [expression, methodKey]);

  return state;
}
