import {
  RESEARCH_IDENTITY_CONFIDENCE,
  RESEARCH_IDENTITY_SOURCE,
  resolveResearchIdentities,
} from "./researchIdentityResolver.js";
import { buildResearchPlanV2 } from "./researchPlanV2.js";
import {
  resolveExplicitNumericResearchSubject,
  validateRazielSemanticIntent,
} from "./razielSemanticIntentGate.js";

// Bounded conversation continuity for the EXISTING identity resolver and route grammar.
// This adapter carries canonical identities between turns. It does not define a second identity
// contract, plan, calculate, execute tools, authorize access, call a model or persist memory.

export const RAZIEL_CONVERSATION_RESOLVER_VERSION = "raziel-conversation-resolver-v1";

const SURFACE_SUBJECT_TYPES = new Set([
  "person", "book", "event", "place", "number", "name", "verse", "topic",
  "phrase", "word", "entity", "post", "source", "els", "image", "journey",
]);

const clean = (value, limit = 240) => value == null
  ? ""
  : String(value).replace(/\s+/g, " ").trim().slice(0, limit);

const grammarText = (value) => clean(value, 500)
  .replace(/[־–—-]/g, " ")
  .replace(/\s+/g, " ")
  .trim();

function numberCandidate(value) {
  const literal = clean(value, 12);
  if (!/^\d{1,6}$/.test(literal)) return null;
  const number = Number(literal);
  if (!Number.isInteger(number) || number < 1 || number > 999999) return null;
  return Object.freeze({
    type: "number",
    value: number,
    label: String(number),
    identity_key: `number:${number}`,
    source: RESEARCH_IDENTITY_SOURCE.NUMERIC_LITERAL,
    confidence: RESEARCH_IDENTITY_CONFIDENCE.EXACT,
  });
}

function explicitNumberCandidates(question) {
  const q = grammarText(question).replace(/[?؟!.]+$/g, "");
  if (/^\d{1,6}$/.test(q)) return [numberCandidate(q)].filter(Boolean);

  // A number pair is accepted only when the numerals occupy the two grammatical subject slots.
  // Do not scan through arbitrary text: that would turn years, counts or page locators into anchors.
  const pair = q.match(/^(?:(?:מה (?:ההבדל|הקשר) בין)(?: המספרים)?|(?:השווה|השווי|תשווה)(?: בין)?(?: המספרים)?)\s+(\d{1,6})\s*(?:ו|ל|לבין|מול)\s*(\d{1,6})(?:\s+(?:מצא(?:י)?(?: לי)? (?:קשרים|הצלבות)|בכל השיטות|לעומק))?$/u);
  if (pair) return [numberCandidate(pair[1]), numberCandidate(pair[2])].filter(Boolean);

  // Explicit 2029 research requests use the same bounded number identities as comparison.
  // The complete anchored grammar is intentional: numbers mentioned as years, counts, pages or
  // supporting prose are not promoted to research subjects.
  const researchPair = q.match(/^(?:(?:חקור|חקרי|תחקור|תחקירי|בדוק|בדקי|תבדוק|תבדקי)(?: את)?(?: המספרים)?\s+(\d{1,6})\s*(?:מול|לבין|עם|ל)\s*(\d{1,6})|(?:מצא|מצאי|תמצא|תמצאי)(?: לי)?(?: את)? (?:הקשר|קשר|היחס|יחס) בין\s+(\d{1,6})\s*(?:ל|לבין|מול|עם)\s*(\d{1,6}))$/u);
  if (researchPair) {
    const left = researchPair[1] ?? researchPair[3];
    const right = researchPair[2] ?? researchPair[4];
    return [numberCandidate(left), numberCandidate(right)].filter(Boolean);
  }

  // Keep the number in an exact grammatical subject slot even when a person naturally prefixes
  // the definition with "בדוק לי". This is deliberately not a free numeric scan: counts, years,
  // pages and numerals embedded in prose still cannot become research anchors.
  const definition = q.match(/^(?:(?:בדוק|בדקי|תבדוק|תבדקי)(?:\s+לי)?\s+)?(?:מה זה|מהו|מה הוא|ספר לי על|מה ידוע על)\s+(?:המספר\s+)?(\d{1,6})$/u);
  if (definition) return [numberCandidate(definition[1])].filter(Boolean);

  const singleResearch = q.match(/^(?:חקור|חקרי|תחקור|תחקירי|בדוק|בדקי|תבדוק|תבדקי)(?:\s+לי)?(?:\s+את)?\s+(?:המספר\s+)?(\d{1,6})$/u);
  if (singleResearch) return [numberCandidate(singleResearch[1])].filter(Boolean);

  const list = q.match(/^(?:(?:תן|תני|הצג|הציגי|הראה|הראי) לי .*?(?:גימטריות|ביטויים|מילים)|(?:איזה|אילו|מה) (?:ביטויים|מילים) (?:שווים|שוות) ל)\s*(?:המספר\s+)?(\d{1,6})$/u);
  if (list) return [numberCandidate(list[1])].filter(Boolean);

  // One shared structural resolver covers high-confidence natural formulations without a model.
  // It is intentionally narrower than numeric scanning and rejects years/pages/counts.
  const structural = resolveExplicitNumericResearchSubject(q);
  if (structural) return [numberCandidate(structural.value)].filter(Boolean);

  // Mixed anaphor + one new number: "תבדוק את זה מול 1820" / "ומה הקשר ל־776?".
  const mixed = q.match(/(?:זה|זאת|אותו|אותה|אותם|אותן|שלו|שלה|שלהם|שלהן).*?(?:^|\s)(?:מול|לבין|ל)\s*(\d{1,6})$/u)
    || q.match(/^(?:ומה|מה)\s+(?:הקשר|ההבדל)\s+(?:ל|עם)\s*(\d{1,6})$/u);
  return mixed ? [numberCandidate(mixed[1])].filter(Boolean) : [];
}

function trimPhrase(value) {
  return clean(value)
    .replace(/[?؟!.]+$/g, "")
    .replace(/\s+(?:בכל\s+השיטות|בגימטריה|מצא(?:י)?\s+לי\s+קשרים|מצא(?:י)?\s+קשרים)$/u, "")
    .trim();
}

function phraseCandidate(label) {
  const value = trimPhrase(label);
  if (!value || value.length > 120 || /^\d+$/.test(value)) return null;
  if (/^(?:שנת|שנה|עמוד|דף|פרק|פסוק|מקור(?:ות)?)\s+\d+$/u.test(value)) return null;
  return Object.freeze({
    type: "phrase",
    label: value,
    identity_key: `phrase:${value}`,
    source: RESEARCH_IDENTITY_SOURCE.TEXT_MATCH,
    confidence: RESEARCH_IDENTITY_CONFIDENCE.EXACT,
  });
}

function explicitPhraseCandidates(question) {
  const q = grammarText(question);
  let match = q.match(/^(?:השווה|השווי|תשווה)(?:\s+בין)?\s+(.+?)\s+(?:לבין|מול)\s+(.+)$/u);
  if (!match) match = q.match(/^(?:השווה|השווי|תשווה)(?:\s+בין)?\s+(.+?)\s+ו([^\s].+)$/u);
  if (!match) match = q.match(/^מה\s+(?:הקשר|ההבדל)\s+בין\s+(.+?)\s+(?:לבין|מול|ל)\s+(.+)$/u);
  if (match) {
    const pair = [phraseCandidate(match[1]), phraseCandidate(match[2])];
    return pair.every(Boolean) ? pair : [];
  }

  match = q.match(/^(?:מצא|מצאי|חפש|חפשי)(?:\s+לי)?\s+(?:הצלבות|קשרים)\s+(?:למילה|לביטוי)\s+(.+)$/u);
  if (match) return [phraseCandidate(match[1])].filter(Boolean);

  match = q.match(/^(?:ומה|מה)\s+הקשר\s+(?:שלו|שלה|שלהם|שלהן)\s+(?:ל|עם)\s+(.+)$/u);
  return match ? [phraseCandidate(match[1])].filter(Boolean) : [];
}

function canonicalResolutionFromMessage(message) {
  const resolution = message?.identity_resolution
    ?? message?.resolution?.identity_resolution
    ?? message?.resolution
    ?? null;
  if (Array.isArray(resolution?.identities) && resolution.identities.length) {
    return {
      candidates: resolution.identities,
      explicitTextComputation: resolution.explicit_text_computation === true,
    };
  }
  const legacyCandidates = message?.resolved_entities ?? message?.resolution?.resolved_entities ?? message?.entities;
  if (Array.isArray(legacyCandidates) && legacyCandidates.length) {
    return { candidates: legacyCandidates, explicitTextComputation: false };
  }
  return null;
}

function contextFromPriorMessage(message) {
  const canonical = canonicalResolutionFromMessage(message);
  if (canonical) return canonical;
  const text = clean(message?.text, 500);
  const numbers = explicitNumberCandidates(text);
  const phrases = explicitPhraseCandidates(text);
  const candidates = [...numbers, ...phrases];
  return candidates.length
    ? { candidates, explicitTextComputation: phrases.length > 0 }
    : null;
}

function latestPriorContext(thread) {
  const messages = Array.isArray(thread) ? thread : [];
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (!message || message.role !== "user") continue;
    const context = contextFromPriorMessage(message);
    if (context?.candidates?.length) return context;
  }
  return { candidates: [], explicitTextComputation: false };
}

function surfaceCandidate(surfaceSemantic) {
  const subject = surfaceSemantic?.subject;
  const type = clean(subject?.type, 30).toLowerCase();
  if (!subject || !SURFACE_SUBJECT_TYPES.has(type)) return null;
  if (type === "number") return numberCandidate(subject.id ?? subject.value ?? subject.label);
  const id = clean(subject.id ?? subject.ref ?? subject.identity_key, 180);
  const label = clean(subject.label ?? id, 180);
  if (!id && !label) return null;
  return {
    ...subject,
    type,
    id: id || null,
    label: label || id,
    source: RESEARCH_IDENTITY_SOURCE.SURFACE_CONTEXT,
    confidence: RESEARCH_IDENTITY_CONFIDENCE.EXACT,
  };
}

function isReferentialFollowUp(question) {
  const q = grammarText(question).replace(/[?؟!.]+$/g, "");
  if (/^(?:מה זה|מה זאת|מה איתם|מה איתן|ומה איתם|ומה איתן|מה הלאה)$/u.test(q)) return true;
  if (/(?:^|\s)(?:אותם|אותן|ביניהם|ביניהן|עליו|עליה|עליהם|בהם|בהן|שלו|שלה|שלהם|שלהן)(?:\s|$)/u.test(q)) return true;
  if (/(?:את|עם|מול|על)\s+(?:זה|זאת)(?:\s|$)/u.test(q)) return true;
  if (/^(?:ומה|מה)\s+(?:הקשר|ההבדל)\s+(?:ל|עם)\s*\d{1,6}$/u.test(q)) return true;
  // A method-only turn applies to the last explicit subject in this temporary session. Without a
  // prior/surface subject it remains unresolved; no subject is invented from the method word.
  if (/^(?:ו?ב?גימטרי[הא]|(?:בדוק|בדקי|תבדוק|תבדקי)(?:\s+לי)?\s+בגימטרי[הא])$/u.test(q)) return true;
  return /^(?:אתה\s+יכול|את\s+יכולה)?\s*(?:לבדוק|לחקור|להעמיק|להשוות)(?:\s+את\s+זה)?$/u.test(q)
    || /^אפשר\s+(?:לבדוק|לחקור|להעמיק|להשוות)(?:\s+את\s+זה)?$/u.test(q)
    || /^(?:תבדוק|בדוק|תחקור|חקור|תעמיק|העמק)(?:\s+את\s+זה)?$/u.test(q)
    || /^(?:מה|איזה|אילו)\s+(?:עוד|מהם|מהן|מהממצאים|מהקשרים)/u.test(q);
}

function identityKeys(candidates, rawInput) {
  return resolveResearchIdentities({ candidates, rawInput }).identities.map((identity) => identity.key);
}

function numberPair(resolution) {
  const numbers = (resolution?.identities || []).filter((identity) => identity.type === "number");
  if (numbers.length !== 2) return null;
  const values = numbers.map((identity) => Number(identity.value ?? identity.id ?? identity.label));
  return values.every((value) => Number.isInteger(value)) ? Object.freeze(values) : null;
}

function orderedNumberPair(candidates) {
  const values = (Array.isArray(candidates) ? candidates : [])
    .filter((candidate) => candidate?.type === "number")
    .map((candidate) => Number(candidate.value ?? candidate.id ?? candidate.label))
    .filter((value) => Number.isInteger(value) && value >= 1 && value <= 999999)
    .filter((value, index, all) => all.indexOf(value) === index);
  return values.length === 2 ? Object.freeze(values) : null;
}

export function resolveRazielConversationTurn({
  question = "",
  thread = [],
  surfaceSemantic = null,
  intent = "",
  semanticIntent = null,
} = {}) {
  const currentQuestion = clean(question, 500);
  const structuralNumericSubject = resolveExplicitNumericResearchSubject(currentQuestion);
  const explicitNumbers = explicitNumberCandidates(currentQuestion);
  // Numeric grammar owns a turn once it has matched. This prevents its grammatical scaffolding
  // (for example "המספרים 337" or "את זה") from becoming a second phrase identity.
  const explicitPhrases = explicitNumbers.length ? [] : explicitPhraseCandidates(currentQuestion);
  const deterministicCandidates = [...explicitNumbers, ...explicitPhrases];
  const referential = isReferentialFollowUp(currentQuestion);
  // Semantic fallback is considered only after deterministic/current-turn and referential grammar
  // had no answer. The gate itself is pure and exact-evidence-bound; it never calls a model.
  const semantic = !deterministicCandidates.length && !referential
    ? validateRazielSemanticIntent(semanticIntent, currentQuestion)
    : null;
  const semanticCandidates = semantic?.status === "resolved" ? semantic.candidates : [];
  const explicitCandidates = deterministicCandidates.length ? deterministicCandidates : semanticCandidates;
  const previous = referential ? latestPriorContext(thread) : { candidates: [], explicitTextComputation: false };
  const surface = referential && !previous.candidates.length ? surfaceCandidate(surfaceSemantic) : null;

  let candidates = explicitCandidates;
  let referentSource = explicitCandidates.length ? "explicit_current_turn" : "none";
  if (referential && previous.candidates.length) {
    candidates = explicitCandidates.length ? [...previous.candidates, ...explicitCandidates] : previous.candidates;
    referentSource = explicitCandidates.length ? "mixed_prior_and_explicit" : "prior_user_turn";
  } else if (referential && surface) {
    candidates = explicitCandidates.length ? [surface, ...explicitCandidates] : [surface];
    referentSource = explicitCandidates.length ? "mixed_surface_and_explicit" : "surface_subject";
  }

  const explicitTextComputation = explicitPhrases.length > 0
    || semantic?.text_computation_requested === true
    || (referential && previous.explicitTextComputation === true);
  const resolution = resolveResearchIdentities({
    candidates,
    rawInput: currentQuestion || null,
    explicitTextComputation,
  });
  // One canonical plan: the conversation resolver contributes identities and current-turn
  // continuity, then delegates action/capability planning to Research Plan V2. It does not keep a
  // parallel Raziel-only planner. This object remains temporary and execution-neutral; the bounded
  // transport projection below deliberately does not forward it as authority.
  const semanticPlanIntent = {
    understand: "understand",
    research: "deep_research",
    connect: "relation",
    continue: "continue",
  }[semantic?.action] || structuralNumericSubject?.requested_action || intent;
  const researchPlan = buildResearchPlanV2({
    question: currentQuestion,
    intent: semanticPlanIntent,
    identityResolution: resolution,
    surfaceContext: surfaceSemantic,
    contextType: "public_user",
  });
  const route = researchPlan.route_grammar;

  return Object.freeze({
    version: RAZIEL_CONVERSATION_RESOLVER_VERSION,
    question: currentQuestion,
    requested_action: route.requested_action,
    requested_by: route.requested_by,
    referential_follow_up: referential,
    referent_source: referentSource,
    explicit_identity_keys: Object.freeze(identityKeys(explicitCandidates, currentQuestion)),
    carried_identity_keys: Object.freeze(identityKeys(
      referential ? [...previous.candidates, ...(surface ? [surface] : [])] : [],
      currentQuestion,
    )),
    identity_resolution: resolution,
    research_plan: researchPlan,
    semantic_intent: semantic,
    pair: orderedNumberPair(candidates) ?? numberPair(resolution),
    guards: Object.freeze({
      semantic_resolution_only: true,
      canonical_identity_resolver: true,
      canonical_research_plan: true,
      research_plan_is_not_execution_authority: true,
      no_tool_execution: true,
      no_model_call_in_resolver: true,
      no_model_inference: semantic == null,
      semantic_intent_is_candidate_only: true,
      no_authorization_decision: true,
      server_must_reauthorize: true,
      no_persistent_memory: true,
    }),
  });
}

// Public-number-only projection across the client/server trust boundary. Rich in-memory identities
// may carry owner access/provenance; those fields deliberately never leave the temporary session.
export function projectRazielConversationResolution(resolved) {
  if (!resolved || resolved.version !== RAZIEL_CONVERSATION_RESOLVER_VERSION) return null;
  const orderedCandidates = Array.isArray(resolved.pair) && resolved.pair.length === 2
    ? resolved.pair.map((value) => ({ type: "number", value }))
    : (resolved.identity_resolution?.identities || []);
  const numbers = orderedCandidates
    .filter((identity) => identity?.type === "number")
    .map((identity) => Number(identity.value ?? identity.id ?? identity.label))
    .filter((value) => Number.isInteger(value) && value >= 1 && value <= 999999)
    .filter((value, index, values) => values.indexOf(value) === index);
  // Ambiguous 3+-subject turns require clarification. Never silently discard a research subject.
  if (numbers.length < 1 || numbers.length > 2) return null;
  return Object.freeze({
    version: RAZIEL_CONVERSATION_RESOLVER_VERSION,
    requested_action: resolved.requested_action,
    referential_follow_up: resolved.referential_follow_up === true,
    referent_source: resolved.referent_source,
    identities: Object.freeze(numbers.map((value) => Object.freeze({
      type: "number",
      value,
      identity_key: `number:${value}`,
    }))),
    pair: numbers.length === 2 ? Object.freeze([...numbers]) : null,
    guards: Object.freeze({ semantic_hint_only: true, server_must_reauthorize: true }),
  });
}

export default resolveRazielConversationTurn;
