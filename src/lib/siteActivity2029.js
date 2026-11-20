// Traffic Intelligence v11 extension. No text, identities, queue or alternate writer.
import { captureMeasurement, measurementBody, sendMeasurement } from './measurement2029.js';
import { isBot } from './botVerdict.js';
import { isAnon } from './privacy.js';

export function startSiteActivity(action, { method, value, wordId, section, expectedUserId, expectedPath } = {}) {
  if (isBot() || isAnon()) return () => false;
  const context = captureMeasurement() || (section === 'personal' ? captureMeasurement('/personal') : null);
  const id = globalThis.crypto?.randomUUID?.();
  if (!context || !id || expectedUserId !== undefined && context.auth.userId !== expectedUserId
    || expectedPath !== undefined && globalThis.location?.pathname !== expectedPath) return () => false;
  const props = { action_version: 1, operation_id: id };
  if (['now','personal','raziel','calculator','calculator_advanced'].includes(section)) props.section = section;
  if (typeof method === 'string' && /^[a-z0-9_:-]{1,48}$/i.test(method)) props.method = method.toLowerCase();
  if (Number.isSafeInteger(value) && value > 0 && value <= 99999) props.number = value;
  if (typeof wordId === 'string' && /^[0-9a-f-]{36}$/i.test(wordId)) props.word_id = wordId;
  const body = measurementBody(context, 'activity_2029', action, props);
  let sent = false;
  return () => {
    if (sent || !body || isAnon() || isBot()) return false;
    sent = true;
    return sendMeasurement(context, body);
  };
}

export function recordSiteActivity(action, props) { return startSiteActivity(action, props)(); }
