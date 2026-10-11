// SYNTHETIC / NON-PRODUCTION. No real sender, mailbox, message or media permission.
export const fixtureState = 'synthetic_non_production';
const base = { source_admitted: true, status: 'live', held: false, source_state: 'unverified',
  text_state: 'available', quoted_omitted: false, source_published_at: null, images: [] };
export const sourceEmailRows = [
  { ...base, id: 'demo-root', author_key: 'demo-author-a', author_display: 'כותב לדוגמה א׳',
    arrival_at: '2026-10-11T12:00:00Z', full_text: 'מקור לדוגמה לצורך הדמיה בלבד\nכאן יופיע הטקסט המלא.',
    images: [{ id: 'demo-image', state: 'unavailable', public_authorized: false }] },
  { ...base, id: 'demo-reply', parent_id: 'demo-root', author_key: 'demo-author-b', author_display: 'כותב לדוגמה ב׳',
    arrival_at: '2026-10-11T13:00:00Z', full_text: 'תשובה לדוגמה בתוך אותו שרשור.', quoted_omitted: true },
  { ...base, id: 'demo-missing', parent_id: 'missing-root', author_key: 'demo-author-a', author_display: 'כותב לדוגמה א׳',
    arrival_at: '2026-10-11T14:00:00Z', full_text: 'תשובה שמקורה אינו זמין.' },
];
