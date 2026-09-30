// Observational baseline: the CURRENT legacy browser anchor/dispersal implementation, extracted VERBATIM from
// tools/els/els-code.template.html (functions lb … findAll, incl. fwdSetup/fwdScan/fwdDisperse/fwdDisperseTopUp),
// evaluated over the same canonical letters. Not a strategy candidate; never treated as truth.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { norm, TORAH_LEN } from './corpus.mjs';

export function loadLegacy(letters, scope) {
  const src = readFileSync(new URL('../els-code.template.html', import.meta.url), 'utf8');
  const a = src.indexOf('  function lb(a,x)');
  const endMarker = '  // חיפוש בדילוגים נתונים בטווח-אותיות';
  const b = src.indexOf(endMarker);
  if (a < 0 || b < 0 || b < a) throw new Error('LEGACY_EXTRACTION_FAILED');
  let body = src.slice(a, b);
  // fwdProbePair (worker probe) sits inside the span but is not part of findAll(); harmless to keep.
  const sha = createHash('sha256').update(body).digest('hex').slice(0, 16);
  const SN = scope === 'torah' ? TORAH_LEN : letters.length;
  const factory = new Function('T', 'N', 'norm', 'st', `function scopeN(){return st.scope==="tanakh"?N:${TORAH_LEN};}\n${body}\nreturn {findAll};`);
  const api = factory(letters, letters.length, norm, { scope });
  return { findAll: api.findAll, sourceSha: sha, SN };
}
