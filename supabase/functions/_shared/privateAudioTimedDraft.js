// Draft evidence only: timings come from ASR, never interpolated from text.
// Script labels describe recognized speech, not independently certified language.
const script = text => {
  const he = /[\u0590-\u05ff]/u.test(text), ru = /[\u0400-\u04ff]/u.test(text);
  return he && ru ? 'mixed' : he ? 'he' : ru ? 'ru' : 'unknown';
};
const validTime = (x, duration) => Number.isFinite(x.start) && Number.isFinite(x.end)
  && x.start >= 0 && x.end > x.start && x.end <= duration + 0.1;

export function privateAudioTimedDraft(stt) {
  const duration = Number(stt?.duration);
  const evidence = { classification: 'unknown', language_evidence: 'ASR_original_script_not_human_reviewed',
    duration_seconds: Number.isFinite(duration) ? duration : null,
    provider_language: stt?.provider_language || null, segments: [], reason: null };
  if (!stt?.ok || !Number.isFinite(duration) || duration <= 0) {
    evidence.reason = stt?.ok ? 'duration_missing' : `provider_failed_${stt?.status || 0}`;
    return evidence;
  }
  const rejected = (stt.segments || []).filter(s => Number(s.no_speech_prob) > 0.6 || Number(s.avg_logprob) < -1);
  const words = Array.isArray(stt.words) ? stt.words : [];
  const timed = words.length ? words.map(w => ({ ...w, text: String(w.word || '').trim() }))
    : (stt.segments || []).map(s => ({ ...s, text: String(s.text || '').trim() }));
  let previousEnd = 0;
  for (const item of timed) {
    if (!validTime(item, duration) || item.start < previousEnd - 0.05 || !item.text) {
      evidence.reason = 'invalid_or_overlapping_timestamps'; evidence.segments = []; return evidence;
    }
    previousEnd = item.end;
    const uncertain = rejected.some(s => item.start < s.end && item.end > s.start);
    let language = uncertain ? 'unknown' : script(item.text);
    // A mixed ASR segment without word boundaries cannot be honestly split.
    if (language === 'mixed') language = 'unknown';
    const prior = evidence.segments.at(-1);
    const text = uncertain ? '[לא ברור]' : item.text;
    if (prior && prior.language === language && item.start - prior.end <= 1 && prior.uncertain === uncertain) {
      prior.end = item.end; prior.text += ` ${text}`;
    } else evidence.segments.push({ start: item.start, end: item.end, language, text, uncertain });
  }
  const languages = new Set(evidence.segments.map(s => s.language).filter(l => l !== 'unknown'));
  evidence.classification = languages.size === 2 ? 'mixed' : [...languages][0] || 'unknown';
  if (!evidence.segments.length) evidence.reason = 'timestamped_speech_missing';
  else if (evidence.classification === 'unknown') evidence.reason = 'speech_language_unresolved';
  return evidence;
}

export function formatTimedDraft(evidence) {
  return evidence.segments.map(s => `[${s.start.toFixed(2)}–${s.end.toFixed(2)} ${s.language}] ${s.text}`).join('\n')
    || '[לא ניתן להפיק תמלול מתוזמן סביר; ראיות הבדיקה שמורות בסיכום]';
}
