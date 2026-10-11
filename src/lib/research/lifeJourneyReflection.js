import { lifeRpc, readLifePersonInput } from './lifeJourneyResearch.js';
import { runNameLabReflectionRuntime } from './nameLabReflectionRuntime.js';
import { newInteractionId } from './interactionCorrelation.js';

// Same canonical reflection pipeline, explicitly requested and ephemeral.
// Never use getAiAnalysis here: its generic learning logger persists subject/content.
export function boundLifeReflectionFacts(facts, max = 1800) {
  const lines = String(facts || '').split('\n');
  const kept = [];
  let length = 0;
  for (const line of lines) {
    if (length + line.length + 1 > max) break;
    kept.push(line); length += line.length + 1;
  }
  if (!kept.some((line) => line.startsWith('- ['))) throw new Error('reflection_facts_unavailable');
  return kept.join('\n');
}

export async function runLifeJourneyReflection({ client, userId, ownerId, personRef, consent = false, signal, isCurrent = () => true }) {
  const check = () => {
    if (!userId || !ownerId || !consent || signal?.aborted || !isCurrent()) throw new Error('reflection_not_authorized');
  };
  check();
  if (personRef !== `person:${ownerId}:self`) throw new Error('self_reflection_only');
  const person = await readLifePersonInput(client, ownerId, personRef, 'word_reflection', signal);
  check();
  const bounded = async (execute) => { check(); const value = await execute(); check(); return value; };
  // Fresh first-name-only engine input. Never reuse surname/family/date result bundles.
  return runNameLabReflectionRuntime({
    name: person.first, surname: null, birthdate: null, question: null,
    nameMultiProvider: (name) => bounded(() => lifeRpc(client, 'fn_name_research_graded', {
      p_name: name, p_surname: null, p_birthdate: null, p_question: null,
    }, signal)),
    aiAnalysisProvider: ({ kind, subject, facts, operation }) => bounded(async () => {
      const { data, error } = await client.functions.invoke('ai-analyze', { body: {
        kind, subject, facts: boundLifeReflectionFacts(facts), operation,
        fast: false, long: true, surface: 'research:life-word-reflection', interaction_id: newInteractionId(),
      }, signal });
      if (error || data?.error || !data?.reflection_interpretation?.message) throw new Error('reflection_ai_unavailable');
      return data.reflection_interpretation;
    }),
    tarotProvider: () => bounded(() => lifeRpc(client, 'fn_tarot_sos', { p_cards: 3 }, signal)),
  });
}
