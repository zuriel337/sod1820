// node scripts/render-els-capability-register-md.mjs   → rewrites docs/els-capability-register.md from docs/els-capability-register.json.
// The JSON is the single source; test/els-capability-register.test.mjs fails when the Markdown is stale.
import { readFileSync, writeFileSync } from 'node:fs';
const root = new URL('../', import.meta.url);
const esc = value => String(value).replaceAll('|', '\\|');
export function renderRegisterMarkdown(reg) {
  const short = file => file.replace('tools/els/els-code.template.html', 'engine').replace(/^src\/(components\/experience2029|components|pages|lib\/research|lib)\//, '');
  const lines = [
    '# מפת 85 היכולות — חוזה מחייב, רכיב אחראי, תלות, בדיקה ומצב בפועל',
    '',
    `נוצר אוטומטית מ־\`docs/els-capability-register.json\` (מקור יחיד; בסיס \`${reg.base}\`, ${reg.as_of}). אין לערוך ידנית: \`node scripts/render-els-capability-register-md.mjs\`.`,
    '',
    `סיכום: ${Object.entries(reg.summary).map(([k, v]) => `${k} ${v}`).join(' · ')}. "הוכחה": code = קיים בקוד עם מסלול קריאה · fixture = בדיקה מקומית · חי = הוכחת שימוש באתר החי (נייד/מחשב), ריק עד שתתועד.`,
    '',
    '| ID | יכולת | מצב | חוזה מחייב | רכיב אחראי | תלות | בדיקה | הוכחה | זיהוי |',
    '|---|---|---|---|---|---|---|---|---|',
  ];
  for (const c of reg.capabilities) {
    const owner = c.owner.map(o => `${short(o.file)}:${o.symbol}`).join('<br>') || '—';
    const proof = [c.proof.code ? 'code' : '', c.proof.fixture_test ? 'fixture' : '', c.proof.live_desktop ? 'חי-מחשב' : '', c.proof.live_mobile ? 'חי-נייד' : ''].filter(Boolean).join(' · ') || '—';
    lines.push(`| ${c.id} | ${esc(c.name)} | ${c.disposition}${c.note ? `<br><sub>${esc(c.note)}</sub>` : ''} | ${esc(c.contracts.map(x => x.split(':')[0]).join('; '))} | ${esc(owner)} | ${esc(c.depends_on.join(', ') || '—')} | ${esc(c.tests.map(t => t.replace('test/', '')).join('<br>') || 'אין')} | ${proof} | ${c.detected_by.join(', ')} |`);
  }
  lines.push('', '## נקודות כניסה במנוע בלי שולח מהממשק (מוצהרות במכוון)', '');
  for (const e of reg.engine_only || []) lines.push(`- ${e.kind} \`${e.name}\`: ${e.reason}`);
  lines.push('');
  return lines.join('\n');
}
if (process.argv[1] && import.meta.url === new URL(process.argv[1], 'file://').href) {
  writeFileSync(new URL('docs/els-capability-register.md', root), renderRegisterMarkdown(JSON.parse(readFileSync(new URL('docs/els-capability-register.json', root), 'utf8'))));
}
