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
    '| ID | יכולת | מצב | חוזה מחייב | רכיב אחראי | תלות | תלות Legacy | בדיקה | הוכחה | זיהוי |',
    '|---|---|---|---|---|---|---|---|---|---|',
  ];
  for (const c of reg.capabilities) {
    const owner = c.owner.map(o => `${short(o.file)}:${o.symbol}`).join('<br>') || '—';
    const proof = [c.proof.code ? 'code' : '', c.proof.fixture_test ? 'fixture' : '', c.proof.live_desktop ? 'חי-מחשב' : '', c.proof.live_mobile ? 'חי-נייד' : ''].filter(Boolean).join(' · ') || '—';
    lines.push(`| ${c.id} | ${esc(c.name)} | ${c.disposition}${c.note ? `<br><sub>${esc(c.note)}</sub>` : ''} | ${esc(c.contracts.map(x => x.split(':')[0]).join('; '))} | ${esc(owner)} | ${esc(c.depends_on.join(', ') || '—')} | ${c.legacy_dependency ? `${c.legacy_dependency.class}${c.legacy_dependency.surface.length ? `<br><sub>${c.legacy_dependency.surface.join(', ')} · ${c.legacy_dependency.removal}</sub>` : ''}` : '—'} | ${esc(c.tests.map(t => t.replace('test/', '')).join('<br>') || 'אין')} | ${proof} | ${c.detected_by.join(', ')} |`);
  }
  if (reg.legacy_dependency_findings) {
    lines.push('', '## תלות Legacy בתוך הצופן', '', `סיכום: ${Object.entries(reg.legacy_dependency_summary).map(([k, v]) => `${k} ${v}`).join(' · ')}. המנוע החישובי הקנוני נשמר; מה שניתן להוציא הוא ממשק Legacy בלבד, ורק אחרי העברה ואימות שאין אובדן יכולות.`, '');
    for (const e of reg.legacy_dependency_findings) lines.push(`- **${e.id} · ${e.area}** (${e.removal}): ${e.finding}`);
  }
  if (reg.legacy_removal_plan) {
    lines.push('', '## תוכנית מדורגת: איחוד הציור והוצאת ממשק Legacy', '', reg.legacy_removal_plan.principle, '');
    for (const sl of reg.legacy_removal_plan.slices) lines.push(`- **${sl.id} · ${sl.title}** — ${sl.scope}. שער: ${sl.gate}. מוציא: ${sl.removes}.`);
    const rows = reg.capabilities.filter(c => c.legacy_dependency?.plan);
    lines.push('', '| יכולת | שלב | הערה |', '|---|---|---|', ...rows.map(c => `| ${c.id} ${esc(c.name)} | ${c.legacy_dependency.plan.slice} | ${esc(c.legacy_dependency.plan.note)} |`));
  }
  lines.push('', '## נקודות כניסה במנוע בלי שולח מהממשק (מוצהרות במכוון)', '');
  for (const e of reg.engine_only || []) lines.push(`- ${e.kind} \`${e.name}\`: ${e.reason}`);
  lines.push('');
  return lines.join('\n');
}
if (process.argv[1] && import.meta.url === new URL(process.argv[1], 'file://').href) {
  writeFileSync(new URL('docs/els-capability-register.md', root), renderRegisterMarkdown(JSON.parse(readFileSync(new URL('docs/els-capability-register.json', root), 'utf8'))));
}
