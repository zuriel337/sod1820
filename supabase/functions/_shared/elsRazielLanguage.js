const CANDIDATE_CONTRACT = "els_language_candidate_material_v1";
const CANDIDATE_STATUS = "CANDIDATE_INPUT";
const REVIEW_CONTRACT = "els_language_review_v1";
const ORIENTATIONS = new Set(["horizontal", "vertical", "diagonal-right", "diagonal-left"]);

const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const safeInt = (value) => {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isSafeInteger(number) ? number : null;
};
const clean = (value, limit = 160) => {
  if (value == null) return null;
  const text = String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit);
  return text || null;
};
const canonicalHebrew = (value) => {
  const finals = { ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ" };
  return [...String(value ?? "")]
    .filter((letter) => letter >= "א" && letter <= "ת")
    .map((letter) => finals[letter] || letter)
    .join("");
};

export function validateElsRazielLanguageCandidateMaterial(value, surfaceSemantic = null) {
  if (!isObject(value) || !isObject(value.occurrence) || !isObject(surfaceSemantic?.els)) return null;
  const occurrence = value.occurrence;
  const surface = surfaceSemantic.els;
  const occurrenceRef = clean(occurrence.occurrenceRef, 120);
  const term = canonicalHebrew(occurrence.term);
  const scope = occurrence.scope === "tanakh" ? "tanakh" : occurrence.scope === "torah" ? "torah" : null;
  const corpusId = clean(occurrence.corpusId, 160);
  const skip = safeInt(occurrence.skip);
  const dir = safeInt(occurrence.dir);
  const start = safeInt(occurrence.start);
  if (
    value.contract !== CANDIDATE_CONTRACT
    || value.status !== CANDIDATE_STATUS
    || value.source !== "canonical_matrix_letters"
    || surfaceSemantic.surface !== "els"
    || !occurrenceRef
    || clean(surface.occurrence, 120) !== occurrenceRef
    || canonicalHebrew(surface.term) !== term
    || clean(surface.corpus, 20) !== scope
    || safeInt(surface.skip) !== skip
    || safeInt(surface.dir) !== dir
    || safeInt(surface.start) !== start
    || !term
    || !scope
    || !corpusId
    || skip == null
    || skip < 2
    || ![-1, 1].includes(dir)
    || start == null
    || start < 0
    || value.authority?.letters !== "CANONICAL"
    || value.authority?.segmentation !== "UNVERIFIED"
    || value.authority?.meaning !== "UNVERIFIED"
    || value.authority?.canonicalReplayRequired !== true
  ) return null;

  const rays = [];
  for (const raw of Array.isArray(value.rays) ? value.rays.slice(0, 24) : []) {
    const orientation = clean(raw?.orientation, 24);
    const text = canonicalHebrew(raw?.text);
    const reverseText = canonicalHebrew(raw?.reverseText);
    const rayStart = safeInt(raw?.start);
    const step = safeInt(raw?.step);
    const distance = safeInt(raw?.distance);
    const id = `${orientation}:${rayStart}:${step}:${text.length}`;
    const last = rayStart == null || step == null ? null : rayStart + step * (text.length - 1);
    if (
      !ORIENTATIONS.has(orientation)
      || clean(raw?.id, 120) !== id
      || text.length < 4
      || text.length > 24
      || reverseText !== [...text].reverse().join("")
      || rayStart == null
      || rayStart < 0
      || step == null
      || step === 0
      || Math.abs(step) > 2_147_483_647
      || last == null
      || !Number.isSafeInteger(last)
      || last < 0
      || distance == null
      || distance < 0
      || distance > 80
    ) continue;
    rays.push(Object.freeze({ id, orientation, text, reverseText, start: rayStart, step, distance }));
  }
  if (!rays.length) return null;
  return Object.freeze({
    contract: CANDIDATE_CONTRACT,
    status: CANDIDATE_STATUS,
    source: "canonical_matrix_letters",
    occurrence: Object.freeze({ occurrenceRef, term, scope, corpusId, skip, dir, start }),
    authority: Object.freeze({
      letters: "CANONICAL",
      segmentation: "UNVERIFIED",
      meaning: "UNVERIFIED",
      canonicalReplayRequired: true,
    }),
    rays: Object.freeze(rays),
  });
}

export function buildElsRazielLanguageCandidatePrompt(material) {
  if (!material || material.contract !== CANDIDATE_CONTRACT || !Array.isArray(material.rays)) return "";
  const lines = material.rays.map((ray, index) => `R${index + 1}: f=${ray.text}; r=${ray.reverseText}`).join("\n");
  return [
    "חומר ELS מועמד לשוני — אינו facts ואינו ממצא מאומת.",
    "האותיות בלבד הגיעו ממפת המטריצה הקנונית; חלוקה למילים ומשמעות עדיין אינן מאומתות.",
    "אם יש קריאה לשונית חזקה, החזר בשדה els_language_proposals עד שלושה פריטים בלבד:",
    '{"ray_id":"R1","reading":"הקריאה עם רווחים","interpretation":"הסבר קצר וזהיר"}',
    "reading חייב להכיל בדיוק את כל אותיות f או r של אותו קו ובאותו סדר. אל תציע תת־מחרוזת.",
    "אל תחשב ואל תחזיר מיקום, דילוג, כיוון או התאמה. השרת ישחזר אותם מן הקו ויאמת במנוע ELS.",
    "אם אין קריאה חזקה, החזר els_language_proposals:[] ואל תנחש.",
    lines,
  ].join("\n").slice(0, 3500);
}

function normalizeProposals(material, proposals) {
  if (!material || !Array.isArray(proposals)) return [];
  const seen = new Set();
  const normalized = [];
  for (const raw of proposals.slice(0, 3)) {
    const rayRef = clean(raw?.ray_id, 8);
    const match = /^R([1-9]|1\d|2[0-4])$/.exec(rayRef || "");
    const ray = match ? material.rays[Number(match[1]) - 1] : null;
    const reading = clean(raw?.reading, 80);
    const exactText = canonicalHebrew(reading);
    if (!ray || !reading || seen.has(rayRef) || (exactText !== ray.text && exactText !== ray.reverseText)) continue;
    seen.add(rayRef);
    const forward = exactText === ray.text;
    const step = forward ? ray.step : -ray.step;
    const start = forward ? ray.start : ray.start + ray.step * (ray.text.length - 1);
    if (!Number.isSafeInteger(start) || start < 0 || !Number.isSafeInteger(step) || Math.abs(step) < 2) continue;
    normalized.push(Object.freeze({
      rayRef,
      exactText,
      reading,
      interpretation: clean(raw?.interpretation, 240),
      request: Object.freeze({
        op: "verify",
        term: exactText,
        scope: material.occurrence.scope,
        skip: Math.abs(step),
        dir: step < 0 ? -1 : 1,
        start,
      }),
    }));
  }
  return normalized;
}

function verifiedProjection(material, proposal, response) {
  const envelope = response?.data ?? response ?? null;
  const result = envelope?.result ?? null;
  const occurrence = result?.occurrence ?? null;
  if (
    result?.contract !== "els_occurrence_replay_v1"
    || result?.status !== "OK"
    || result?.verification_state !== "MATCH"
    || canonicalHebrew(result?.input?.normalized) !== proposal.exactText
    || safeInt(occurrence?.skip) !== proposal.request.skip
    || safeInt(occurrence?.dir) !== proposal.request.dir
    || safeInt(occurrence?.start) !== proposal.request.start
  ) return null;
  const occurrenceRef = clean(occurrence?.occurrence_id, 220);
  const corpusId = clean(result?.corpus_id, 160);
  if (!occurrenceRef || !corpusId) return null;
  const end = safeInt(occurrence?.end);
  const positions = Array.isArray(occurrence?.positions)
    ? occurrence.positions.map(safeInt).filter((position) => position != null && position >= 0).slice(0, 24)
    : [];
  return Object.freeze({
    rayRef: proposal.rayRef,
    exactText: proposal.exactText,
    reading: proposal.reading,
    ...(proposal.interpretation ? { interpretation: proposal.interpretation } : {}),
    authority: Object.freeze({ exactText: "CANONICAL", reading: "PROPOSED", meaning: "INTERPRETATION" }),
    verification: Object.freeze({
      contract: "els_occurrence_replay_v1",
      state: "MATCH",
      source: "canonical_els_engine",
      occurrenceRef,
      corpusId,
      scope: material.occurrence.scope,
      skip: proposal.request.skip,
      dir: proposal.request.dir,
      start: proposal.request.start,
      end,
      positions: Object.freeze(positions),
      traceId: clean(envelope?.trace_id, 160),
    }),
  });
}

export async function reviewElsRazielLanguageProposals({ material, proposals, invokeVerify }) {
  if (!material || typeof invokeVerify !== "function") return null;
  const candidates = normalizeProposals(material, proposals);
  const verified = [];
  for (const proposal of candidates) {
    try {
      const response = await invokeVerify(proposal.request);
      const projected = verifiedProjection(material, proposal, response);
      if (projected) verified.push(projected);
    } catch { /* one failed replay must not promote or block another proposal */ }
  }
  return Object.freeze({
    contract: REVIEW_CONTRACT,
    status: verified.length ? "VERIFIED" : "NO_VERIFIED_PROPOSALS",
    source: "canonical_els_engine",
    occurrenceRef: material.occurrence.occurrenceRef,
    proposals: Object.freeze(verified),
  });
}
