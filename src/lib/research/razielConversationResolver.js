import {
  RESEARCH_IDENTITY_CONFIDENCE,
  RESEARCH_IDENTITY_SOURCE,
  resolveResearchIdentities,
} from "./researchIdentityResolver.js";
import { buildResearchPlanV2 } from "./researchPlanV2.js";
import {
  resolveExplicitHebrewExpressionResearchSubject,
  resolveExplicitHebrewExpressionPairResearchSubject,
  resolveExplicitNumericPairResearchSubject,
  resolveExplicitNumericResearchSubject,
  isRazielCurrentSurfaceQuestion,
  resolveRazielExpressionContinuationDirective,
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

  // One shared client/server grammar owns explicit pairs. Never scan arbitrary prose for two
  // numerals: only complete subject slots are admitted as research identities.
  const pair = resolveExplicitNumericPairResearchSubject(q);
  if (pair) return pair.numbers.map(numberCandidate).filter(Boolean);

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
  const structuralPair = resolveExplicitHebrewExpressionPairResearchSubject(q);
  if (structuralPair) return structuralPair.expressions.map(phraseCandidate).filter(Boolean);

  let match = q.match(/^(?:השווה|השווי|תשווה)(?:\s+בין)?\s+(.+?)\s+(?:לבין|מול)\s+(.+)$/u);
  if (!match) match = q.match(/^(?:השווה|השווי|תשווה)(?:\s+בין)?\s+(.+?)\s+ו([^\s].+)$/u);
  if (!match) match = q.match(/^מה\s+(?:הקשר|ההבדל)\s+בין\s+(.+?)\s+(?:לבין|מול|ל)\s+(.+)$/u);
  if (match) {
    const pair = [phraseCandidate(match[1]), phraseCandidate(match[2])];
    return pair.every(Boolean) ? pair : [];
  }

  const expression = resolveExplicitHebrewExpressionResearchSubject(q);
  if (expression) return [phraseCandidate(expression.label)].filter(Boolean);

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
  // On the calculator the expression is the research subject and the selected numeric result is
  // its current lens. Prefer that exact expression for a "what am I seeing here" turn so Raziel
  // receives the complete canonical method profile instead of researching only one active tile.
  const surface = clean(surfaceSemantic?.surface, 40).toLowerCase();
  const calculationExpression = clean(surfaceSemantic?.number?.expression, 120);
  const calculationResult = surfaceSemantic?.number?.result;
  const calculatorSurface = ["gematria", "calculator", "calculator-pro-2029", "calculator-2029"].includes(surface);
  if (calculatorSurface) {
    if (!(calculationExpression
    && clean(surfaceSemantic?.number?.method, 60)
    && Number.isSafeInteger(calculationResult)
    && calculationResult >= 1
    && calculationResult <= 999999999999)) return null;
    const expression = phraseCandidate(calculationExpression);
    if (expression) return {
      ...expression,
      source: RESEARCH_IDENTITY_SOURCE.SURFACE_CONTEXT,
      confidence: RESEARCH_IDENTITY_CONFIDENCE.EXACT,
    };
    return null;
  }
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
  if (resolveRazielExpressionContinuationDirective(q)) return true;
  if (isRazielCurrentSurfaceQuestion(q)) return true;
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
  const expressionContinuation = resolveRazielExpressionContinuationDirective(currentQuestion);
  const structuralNumericSubject = resolveExplicitNumericResearchSubject(currentQuestion);
  const structuralExpressionSubject = resolveExplicitHebrewExpressionResearchSubject(currentQuestion);
  const structuralExpressionPair = resolveExplicitHebrewExpressionPairResearchSubject(currentQuestion);
  // A numeral beside a named expression method is the observed result, not the research subject.
  // Preserve the expression identity and let the canonical method profile verify both the
  // method and the observed value. Ordinary number questions keep the existing numeric owner.
  const explicitNumbers = structuralExpressionSubject?.requested_method
    ? []
    : explicitNumberCandidates(currentQuestion);
  // Numeric grammar owns a turn once it has matched. This prevents its grammatical scaffolding
  // (for example "המספרים 337" or "את זה") from becoming a second phrase identity.
  const explicitPhrases = explicitNumbers.length ? [] : explicitPhraseCandidates(currentQuestion);
  const deterministicCandidates = [...explicitNumbers, ...explicitPhrases];
  const referential = isReferentialFollowUp(currentQuestion);
  const currentSurfaceQuestion = isRazielCurrentSurfaceQuestion(currentQuestion);
  // Semantic fallback is considered only after deterministic/current-turn and referential grammar
  // had no answer. The gate itself is pure and exact-evidence-bound; it never calls a model.
  const semantic = !deterministicCandidates.length && !referential
    ? validateRazielSemanticIntent(semanticIntent, currentQuestion)
    : null;
  const semanticCandidates = semantic?.status === "resolved" ? semantic.candidates : [];
  const explicitCandidates = deterministicCandidates.length ? deterministicCandidates : semanticCandidates;
  // "כאן" names the visible surface, not an older turn. Other anaphors keep their existing
  // most-recent-user-turn precedence.
  const previous = referential && !currentSurfaceQuestion
    ? latestPriorContext(thread)
    : { candidates: [], explicitTextComputation: false };
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
    || expressionContinuation != null
    || (referential && previous.explicitTextComputation === true)
    || (referential && ["phrase", "word"].includes(surface?.type));
  const resolution = resolveResearchIdentities({
    candidates,
    rawInput: currentQuestion || null,
    explicitTextComputation,
  });
  // One canonical plan: the conversation resolver contributes identities and current-turn
  // continuity, then delegates action/capability planning to Research Plan V2. It does not keep a
  // parallel Raziel-only planner. This object remains temporary and execution-neutral; the bounded
  // transport projection below deliberately does not forward it as authority.
  const requestedPlanIntent = semantic?.action
    || expressionContinuation?.requested_action
    || structuralExpressionPair?.requested_action
    || structuralExpressionSubject?.requested_action
    || structuralNumericSubject?.requested_action
    || intent;
  const semanticPlanIntent = {
    understand: "understand",
    research: "deep_research",
    connect: "relation",
    continue: "continue",
  }[requestedPlanIntent] || requestedPlanIntent;
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

// Bounded public research projection across the client/server trust boundary. Rich in-memory
// identities may carry owner access/provenance; those fields deliberately never leave the temporary
// session. Text crosses only when the same shared structural grammar can re-authorize one exact
// expression, an exact two-expression relation, or one bounded continuation of the latest explicit
// expression. Only the public phrase label crosses; private metadata remains inside the session.
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
  const textIdentities = (resolved.identity_resolution?.identities || [])
    .filter((identity) => identity?.type === "phrase" || identity?.type === "word");
  const structuralExpression = resolveExplicitHebrewExpressionResearchSubject(resolved.question);
  const structuralExpressionPair = resolveExplicitHebrewExpressionPairResearchSubject(resolved.question);
  const expressionContinuation = resolveRazielExpressionContinuationDirective(resolved.question);
  const exactTextLabels = textIdentities.map((identity) => clean(identity?.label ?? identity?.value, 120));
  const exactTextKeys = textIdentities.every((identity, index) => {
    const expectedKey = `phrase:${exactTextLabels[index]}`;
    return exactTextLabels[index]
      && /[\u0590-\u05ff]/u.test(exactTextLabels[index])
      && !/[\u0000-\u001f\u007f-\u009f]/u.test(exactTextLabels[index])
      && (identity.identity_key === expectedKey || identity.key === expectedKey);
  });
  const exactStructuralSingle = textIdentities.length === 1
    && structuralExpression?.label === exactTextLabels[0]
    && structuralExpression?.requested_action === resolved.requested_action;
  const exactStructuralPair = textIdentities.length === 2
    && structuralExpressionPair?.requested_action === resolved.requested_action
    && structuralExpressionPair.expressions.every((label, index) => label === exactTextLabels[index]);
  const exactCarriedSingle = textIdentities.length === 1
    && expressionContinuation?.requested_action === resolved.requested_action
    && resolved.referential_follow_up === true
    && resolved.referent_source === "prior_user_turn";
  if (!numbers.length && textIdentities.length === 1
    && (
      (exactStructuralSingle
        && resolved.referential_follow_up === false
        && resolved.referent_source === "explicit_current_turn")
      || (["understand", "research"].includes(resolved.requested_action)
        && resolved.referential_follow_up === true
        && resolved.referent_source === "surface_subject")
      || exactCarriedSingle
    ) && exactTextKeys) {
    const identity = textIdentities[0];
    const label = clean(identity?.label ?? identity?.value, 120);
    const expectedKey = `phrase:${label}`;
    if (!label || !/[\u0590-\u05ff]/u.test(label) || /[\u0000-\u001f\u007f-\u009f]/u.test(label)) return null;
    if (identity.identity_key !== expectedKey && identity.key !== expectedKey) return null;
    return Object.freeze({
      version: RAZIEL_CONVERSATION_RESOLVER_VERSION,
      requested_action: resolved.requested_action,
      referential_follow_up: resolved.referential_follow_up === true,
      referent_source: resolved.referent_source,
      identities: Object.freeze([Object.freeze({
        type: "phrase",
        label,
        identity_key: expectedKey,
      })]),
      pair: null,
      guards: Object.freeze({ semantic_hint_only: true, server_must_reauthorize: true }),
    });
  }
  if (!numbers.length && exactStructuralPair && exactTextKeys
    && resolved.referential_follow_up === false && resolved.referent_source === "explicit_current_turn") {
    return Object.freeze({
      version: RAZIEL_CONVERSATION_RESOLVER_VERSION,
      requested_action: "connect",
      referential_follow_up: false,
      referent_source: "explicit_current_turn",
      identities: Object.freeze(textIdentities.map((identity, index) => Object.freeze({
        type: "phrase",
        label: exactTextLabels[index],
        identity_key: `phrase:${exactTextLabels[index]}`,
      }))),
      pair: null,
      guards: Object.freeze({ semantic_hint_only: true, server_must_reauthorize: true }),
    });
  }
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
