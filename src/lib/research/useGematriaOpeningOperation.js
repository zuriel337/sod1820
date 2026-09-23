import { useEffect, useRef, useState } from "react";
import {
  PER_WORD_PREFIX_OPENING,
  fetchGematriaOpeningOperation,
} from "./gematriaOpeningOperation.js";

export { PER_WORD_PREFIX_OPENING };

/**
 * Generic consumer hook over fetchGematriaOpeningOperation. Not Heichal-specific -- any React
 * surface (2029 Heichal, research workspace panels, future capability consumers) that needs the
 * per_word_prefix_opening result for a live phrase can use this instead of re-implementing
 * fetch/loading/stale-response handling.
 *
 * Only refetches when `input` (trimmed) or `operation` actually changes, and ignores a response
 * that resolves after a newer request has been issued.
 */
export function useGematriaOpeningOperation(input, {
  operation = PER_WORD_PREFIX_OPENING,
  maxWords,
  maxFragmentsPerWord,
  concurrency,
  fetchMethodProfile,
  enabled = true,
} = {}) {
  const [state, setState] = useState({ loading: false, result: null, error: null });
  const requestId = useRef(0);
  const trimmed = String(input ?? "").trim();

  useEffect(() => {
    if (!enabled || !trimmed) {
      setState({ loading: false, result: null, error: null });
      return undefined;
    }

    const thisRequest = ++requestId.current;
    setState((prev) => ({ ...prev, loading: true, error: null }));

    fetchGematriaOpeningOperation(trimmed, {
      operation,
      ...(maxWords != null ? { maxWords } : {}),
      ...(maxFragmentsPerWord != null ? { maxFragmentsPerWord } : {}),
      ...(concurrency != null ? { concurrency } : {}),
      ...(fetchMethodProfile ? { fetchMethodProfile } : {}),
    }).then((result) => {
      if (requestId.current !== thisRequest) return;
      setState({ loading: false, result, error: null });
    }).catch((error) => {
      if (requestId.current !== thisRequest) return;
      setState({ loading: false, result: null, error });
    });

    return undefined;
  }, [trimmed, operation, maxWords, maxFragmentsPerWord, concurrency, fetchMethodProfile, enabled]);

  return state;
}

export default useGematriaOpeningOperation;