const clean = (value) => value == null ? "" : String(value).trim();

export const CALCULATOR_VIRAL_PARAM = Object.freeze({
  EXPRESSION: "q",
  METHOD: "m",
  VALUE: "v",
  DISCOVERY: "d",
  SHARE_ID: "s",
});

export function makeCalculatorShareId() {
  try {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID().replace(/-/g, "").slice(0, 16);
    if (globalThis.crypto?.getRandomValues) {
      const bytes = new Uint8Array(8);
      globalThis.crypto.getRandomValues(bytes);
      return [...bytes].map((n) => n.toString(16).padStart(2, "0")).join("");
    }
  } catch { /* fall through */ }
  return `share-${Date.now().toString(36)}`;
}

export function buildCalculatorShareUrl(selection, {
  discovery = null,
  shareId = null,
  baseUrl = "https://sod1820.co.il/2029/gematria",
} = {}) {
  if (!selection?.expression || !selection?.methodKey || selection?.resultValue == null) return null;
  const url = new URL(baseUrl, "https://sod1820.co.il");
  url.search = "";
  url.searchParams.set(CALCULATOR_VIRAL_PARAM.EXPRESSION, clean(selection.expression));
  url.searchParams.set(CALCULATOR_VIRAL_PARAM.METHOD, clean(selection.methodKey));
  url.searchParams.set(CALCULATOR_VIRAL_PARAM.VALUE, String(Number(selection.resultValue)));
  if (discovery?.phrase && Number(discovery?.value) === Number(selection.resultValue)) {
    url.searchParams.set(CALCULATOR_VIRAL_PARAM.DISCOVERY, clean(discovery.phrase));
  }
  if (shareId) url.searchParams.set(CALCULATOR_VIRAL_PARAM.SHARE_ID, clean(shareId));
  return url.toString();
}

export function parseCalculatorShareState(search = "") {
  const params = search instanceof URLSearchParams ? search : new URLSearchParams(String(search || "").replace(/^\?/, ""));
  const expression = clean(params.get(CALCULATOR_VIRAL_PARAM.EXPRESSION));
  const methodKey = clean(params.get(CALCULATOR_VIRAL_PARAM.METHOD));
  const valueRaw = params.get(CALCULATOR_VIRAL_PARAM.VALUE);
  const resultValue = valueRaw != null && valueRaw !== "" && Number.isFinite(Number(valueRaw)) ? Number(valueRaw) : null;
  const discoveryPhrase = clean(params.get(CALCULATOR_VIRAL_PARAM.DISCOVERY)) || null;
  const shareId = clean(params.get(CALCULATOR_VIRAL_PARAM.SHARE_ID)) || null;
  const isShared = Boolean(expression && methodKey && resultValue != null && shareId);
  return Object.freeze({ isShared, expression, methodKey, resultValue, discoveryPhrase, shareId });
}

export function pickVerifiedShareDiscovery(projection, selection) {
  if (!projection || !selection || selection.resultValue == null) return null;
  const items = Array.isArray(projection.items) ? projection.items : [];
  const item = items.find((candidate) => (
    candidate?.phrase
    && clean(candidate.phrase) !== clean(selection.expression)
    && Number(candidate?.value) === Number(selection.resultValue)
    && candidate?.relation?.status !== "dependent"
  ));
  return item ? Object.freeze({ phrase: clean(item.phrase), value: Number(item.value) }) : null;
}
