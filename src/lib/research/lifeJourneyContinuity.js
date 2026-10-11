import { lifeRpc, readLifePersonInput } from './lifeJourneyResearch.js';
import { gregorianToHebrewDateRepresentation, runPersonalDateResearch } from './personalDateResearch.js';
import { buildAccessDescriptor } from './researchPlanV2.js';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const clean = (value) => String(value ?? '').trim();
export function lifeEventWriteRequest({ ownerId, eventId, requestId, expectedRevision = 0, title, occurredOn = null, personRef, notes = '' }) {
  if (![ownerId, eventId, requestId].every((v) => uuid.test(v || ''))
      || !Number.isInteger(expectedRevision) || expectedRevision < 0
      || !clean(title) || clean(title).length > 160 || String(notes).length > 2000
      || !String(personRef || '').startsWith(`person:${ownerId}:`)) throw new Error('life_event_invalid_input');
  if (occurredOn && !gregorianToHebrewDateRepresentation(occurredOn)) throw new Error('life_event_invalid_date');
  return { p_owner: ownerId, p_event_id: eventId, p_request_id: requestId, p_expected_revision: expectedRevision,
    p_title: clean(title), p_occurred_on: occurredOn || null, p_person_ref: personRef, p_notes: String(notes) };
}

// Allocate event/request UUIDs when a draft is opened, retain through transport failures.
// A changed draft is a new request; a correction also supplies the observed revision.
export async function saveLifeEventObservation(client, draft, signal) {
  const request = lifeEventWriteRequest(draft);
  if (signal?.aborted) throw new Error('cancelled');
  let call = client.rpc('fn_person_life_event_record_v1', request);
  if (signal && typeof call.abortSignal === 'function') call = call.abortSignal(signal);
  if (signal?.aborted) throw new Error('cancelled');
  const { data, error } = await call;
  if (signal?.aborted) throw new Error('cancelled');
  if (error || !data) throw new Error('life_event_save_unavailable');
  if (data.error === 'revision_conflict') return { ok: false, error: 'revision_conflict', revision: data.revision };
  if (data.ok !== true) throw new Error('life_event_save_unavailable');
  return data;
}

function pageFrom(response, idKey, timeKey) {
  if (response.ok !== true || !Array.isArray(response.items)) throw new Error('life_page_unavailable');
  const size = Number.isInteger(response.page_size) ? response.page_size : 20;
  const items = response.items.slice(0, size);
  const last = items.at(-1);
  return { items, next: response.has_more && last ? { at: last[timeKey], id: last[idKey] } : null };
}
export async function listLifeEventObservations(client, { ownerId, eventId = null, limit = 20, cursor = null, signal }) {
  const data = await lifeRpc(client, 'fn_person_life_events_v1', { p_owner: ownerId, p_event_id: eventId,
    p_limit: limit, p_before_at: cursor?.at || null, p_before_id: cursor?.id || null }, signal);
  const page = pageFrom(data, 'record_id', 'recorded_at');
  return { ...page, items: page.items.map((item) => ({ ...item,
    dateRepresentation: gregorianToHebrewDateRepresentation(item.input?.occurred_on),
  })) };
}
export async function listLifeJourneyPaths(client, { ownerId, limit = 20, cursor = null, signal }) {
  const data = await lifeRpc(client, 'fn_person_life_paths_v1', { p_owner: ownerId,
    p_limit: limit, p_before_at: cursor?.at || null, p_before_id: cursor?.id || null }, signal);
  // Resume a selected path through ResearchProvider.resumeResearchPath(path_id), not this reader.
  return pageFrom(data, 'path_id', 'updated_at');
}

export async function researchLifeEventDate({ client, userId, ownerId, eventId, expectedRevision, consent = false, signal, isCurrent = () => true }) {
  const check = () => { if (!userId || !consent || signal?.aborted || !isCurrent()) throw new Error('event_analysis_not_authorized'); };
  check();
  const page = await listLifeEventObservations(client, { ownerId, eventId, limit: 1, signal });
  check();
  const event = page.items[0];
  if (!event || event.revision !== expectedRevision) throw new Error('event_revision_changed');
  if (!event.dateRepresentation) return { state: 'unavailable', reason: 'event_date_required' };
  const person = await readLifePersonInput(client, ownerId, event.input.person_ref, 'date_cross', signal);
  check();
  const accessDescriptor = buildAccessDescriptor({ user_ref: userId, authenticated: true,
    verified_authority: { source: 'supabase_auth', subject_verified: true } }, 'authenticated_user');
  const bundle = await runPersonalDateResearch({ name: person.first, surname: person.surname || null,
    birthdateIso: event.input.occurred_on, accessDescriptor,
    crossProvider: ({ name, surname, representation }) => {
      check(); return lifeRpc(client, 'fn_cross_research', { p_items: [name, surname, representation.hebrew.pretty].filter(Boolean) }, signal);
    },
  });
  check();
  // Memory only. Exact input is retained for this result, never replaced by a later profile/date edit.
  return { state: 'ready', bundle, dateRepresentation: event.dateRepresentation,
    source: { kind: 'user_declared_event', recordId: event.record_id, eventId, revision: event.revision },
    inputSnapshot: { person: { ...person }, event: { ...event.input } } };
}
