// A hint written in an external source message: "<number> בגימטריא: "<phrase>"" (also "= "<phrase>""). Extraction only — the
// number is the SOURCE's claim until postSourceHintCheck2029.js runs it through the engine. Nothing is computed here.
const CLAIM = /(?:^|\n)\s*(\d{1,6})\s*(?:בגימטרי[הא]|=)\s*[:\s]*["״“]([^"״”\n]{2,80})["״”]/u;
export function extractHintClaim(text) {
  const match = CLAIM.exec(String(text || ""));
  return match ? { number: Number(match[1]), phrase: match[2].trim() } : null;
}
