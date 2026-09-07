import React, { useCallback, useEffect, useMemo, useState } from "react";
import GematriaCalculator from "./GematriaCalculator.jsx";
import { calculateGematriaEnvelope } from "../lib/research/gematriaCalculationContract.js";
import { fetchGematriaMethodStates } from "../lib/research/gematriaMethodRegistry.js";

// Thin projection adapter over the existing professional calculator.
// It does not own calculations or UI; it enriches the calculator's settled result with the
// canonical method/representation/provenance envelope for Research Context and future consumers.
export default function CanonicalGematriaCalculator({ onResult, ...props }) {
  const [methodStates, setMethodStates] = useState(null);
  const [lastWord, setLastWord] = useState("");

  useEffect(() => {
    let live = true;
    fetchGematriaMethodStates()
      .then(rows => { if (live) setMethodStates(rows); })
      .catch(() => { if (live) setMethodStates(null); });
    return () => { live = false; };
  }, []);

  const calculation = useMemo(
    () => (lastWord ? calculateGematriaEnvelope(lastWord, methodStates) : null),
    [lastWord, methodStates],
  );

  const handleResult = useCallback((legacyResult) => {
    const word = String(legacyResult?.word || "").trim();
    setLastWord(word);
    const envelope = word ? calculateGematriaEnvelope(word, methodStates) : null;
    onResult?.({ ...legacyResult, calculation: envelope });
  }, [methodStates, onResult]);

  // `calculation` is intentionally computed even when no parent callback exists: this component
  // is the first projection consumer of the shared contract. No UI/number changes in v1.
  void calculation;

  return <GematriaCalculator {...props} onResult={handleResult} />;
}
