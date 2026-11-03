// Content preparation only. Reuses the canonical matcher; never publishes or writes product data.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(dir, '../../..');
const source = JSON.parse(readFileSync(resolve(dir, 'materials-source.json'), 'utf8'));
const template = readFileSync(resolve(root, 'tools/els/els-code.template.html'), 'utf8');
const T = readFileSync(resolve(root, 'tools/els/data/tk-letters.txt'), 'utf8');
assert.equal(T.length, 1204583);
const corpusSha256 = createHash('sha256').update(T).digest('hex');
const matcherStart = template.indexOf('  function findAtSkips(');
const matcherEnd = template.indexOf('\n  const PALETTE=', matcherStart);
assert(matcherStart >= 0 && matcherEnd > matcherStart);
const ctx = vm.createContext({ T, scopeN: () => 304805 });
vm.runInContext(template.match(/  const FIN=.*\n/)[0] + template.match(/  const norm=.*\n/)[0] + template.slice(matcherStart, matcherEnd), ctx);
const esc = s => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const reports = [];

for (const item of source.cases) {
  const findings = [...item.findings, ...(item.source_context ? [item.source_context] : [])].map(f => {
    ctx.query = f;
    const hits = JSON.parse(JSON.stringify(vm.runInContext('findAtSkips(query.term,[query.skip],0,304805,10000)', ctx)));
    const hit = hits.find(h => h.start === f.start && h.dir === f.dir);
    assert(hit, `${item.id}: canonical replay failed for ${f.term}`);
    assert.equal(hit.positions.map(p => T[p]).join(''), f.term);
    for (const p of hit.positions) {
      const row = Math.floor(p / item.width), col = p % item.width;
      assert(row >= item.box.r0 && row <= item.box.r1 && col >= item.box.c0 && col <= item.box.c1, `${f.term}: outside displayed crop`);
    }
    return { ...f, positions: hit.positions, localExactReplay: true, kind: f.kind || 'els', serverVerified: false };
  });
  reports.push({ ...item, findings });
  const marks = new Map();
  for (const f of findings) for (const p of f.positions) marks.set(p, [...(marks.get(p) || []), f]);
  const { r0, r1, c0, c1 } = item.box;
  const cell = 24, rows = r1 - r0 + 1, cols = c1 - c0 + 1, width = cols * cell + 32, height = rows * 30 + 32;
  let cells = '';
  for (let row = r0; row <= r1; row++) for (let col = c0; col <= c1; col++) {
    const p = row * item.width + col, x = 16 + (c1 - col) * cell, y = 16 + (row - r0) * 30, m = marks.get(p) || [];
    if (m.length) cells += `<rect x="${x}" y="${y}" width="23" height="29" rx="3" fill="${m[0].color}"${m[1] ? ` stroke="${m[1].color}" stroke-width="3"` : ''}/>`;
    cells += `<text x="${x + 12}" y="${y + 22}" text-anchor="middle" fill="${m.length ? '#101827' : '#c6d3e7'}" font-weight="${m.length ? 700 : 400}"><title>${p}: ${esc(m.map(f => f.label).join(' / '))}</title>${T[p]}</text>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" lang="he" role="img" aria-labelledby="title desc" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"><title id="title">${esc(item.title)} — שחזור מקומי</title><desc id="desc">רוחב ${item.width}; שורות ${r0}–${r1}; עמודות ${c0}–${c1}. כל מיקום מתחיל באפס.</desc><rect width="100%" height="100%" fill="#111c2e"/><g font-family="Arial, sans-serif" font-size="22">${cells}</g></svg>`;
  writeFileSync(resolve(dir, `matrices/${item.id}.svg`), svg);
}
const systemFindings = (source.system_interpretation?.additional_findings || []).map(f => {
  ctx.query = f;
  const hits = JSON.parse(JSON.stringify(vm.runInContext('findAtSkips(query.term,[query.skip],0,304805,10000)', ctx)));
  const hit = hits.find(h => h.start === f.start && h.dir === f.dir);
  assert(hit, `System addition: canonical replay failed for ${f.term}`);
  assert.deepEqual(hit.positions, f.positions);
  assert.equal(hit.positions.map(p => T[p]).join(''), f.term);
  return { ...f, localExactReplay: true };
});
writeFileSync(resolve(dir, 'findings.json'), JSON.stringify({ scope: 'torah', corpusSha256, corpusLetters: T.length, scopeLetters: 304805, matcher: 'tools/els/els-code.template.html::findAtSkips', verification: 'local exact letter replay only; no historical authorship or statistical significance verification', cases: reports, systemFindings }, null, 2) + '\n');

const sections = reports.map(item => `<section id="${item.id}" data-source-heading="true"><h2>${esc(item.title)}</h2><p class="credit">החומר נמסר על ידי ${esc(item.material_provider)}. ${item.id === 'ramon-rips' ? 'לפי איגור: ממצא של פרופ׳ אליהו ריפס ז״ל.' : 'ייחוס הגילוי: איגור, על פי דבריו.'}</p><div class="pair"><figure><img src="matrices/${item.id}.svg" alt="${esc(item.title)} — שחזור המטריצה מתוך אותיות התורה"/><figcaption>שחזור מקומי של המטריצה מתוך קורפוס התורה; אינו צילום מהפריוויו.</figcaption><ul>${item.findings.filter(f => f.kind === 'els').map(f => `<li><span class="dot" style="background:${f.color}"></span>${esc(f.label)} · דילוג <bdi>${f.dir * f.skip}</bdi></li>`).join('')}</ul></figure><div class="story"><h3>דברי איגור</h3>${item.quote_keys.map(k => `<blockquote data-quote-key="${k}">${esc(source.quotes[k])}</blockquote>`).join('')}${item.english_quote_key ? `<details><summary>הנוסח המקורי באנגלית</summary><blockquote lang="en" dir="ltr" data-quote-key="${item.english_quote_key}">${esc(source.quotes[item.english_quote_key])}</blockquote></details>` : ''}<details><summary>התצלום המקורי שנמסר</summary><img class="original" src="${item.original}" alt="תצלום המקור של ${esc(item.title)}" loading="lazy"/></details></div></div></section>`).join('\n');
writeFileSync(resolve(dir, 'post-content.html'), sections + '\n');
const checkingAddition = `<aside class="addition"><h2>הערות בדיקה של המערכת</h2><p>אלה הערות נפרדות מדברי איגור. רצפי האותיות והדילוגים שוחזרו מקומית; השחזור אינו בודק ניבוי, משמעות או מובהקות סטטיסטית. סיפור קולומביה נמסר כעדות בדיעבד. לא אומתו קשרי הטלפון המתוארים או האפשרות למנוע את האסון, ואין מהשחזור בסיס לייחס לאיגור אחריות לאסון.</p><p>נשמר הכתיב המקורי: „קולמביה” ו„אמן הטיס”. ההדגשה „משם על פני כל הארץ” בתצלום קולומביה היא טקסט רציף מבראשית י״א, ח׳, ולא צופן נוסף בדילוג.</p><p>לפי <a href="https://www.nasa.gov/mission/sts-107/">NASA</a>, משימת STS-107 נמשכה כ־16 יום והסתיימה באסון ב־1 בפברואר 2003. <a href="https://www.nasa.gov/wp-content/uploads/2016/01/ramon.pdf">הביוגרפיה של רמון</a> מאשרת שפיקד על טייסת F-16, ומתארת מחקר מסביב לשעון בשתי משמרות. הטענה שכל איש צוות עבד 16 שעות ביום לא אומתה.</p><p>זמן הנחיתה המתוכנן היה <a href="https://www.nasa.gov/history/columbia-chronology/">09:16 לפי EST</a> — <a href="https://www.walla.co.il/news/environment-science/343645">16:16 בישראל</a>, ולא 16:16 בשעון המקומי בפלורידה. כ־16 הקפות ביממה תואמות <a href="https://eol.jsc.nasa.gov/Tools/orbitTutorial.htm">הקפה של כ־90 דקות</a>; זהו קירוב כללי. הקשרים למספר 16 הם פרשנות בדיעבד.</p><p>בממצא הבחירות: מ״א = 41, נ״ג = 53; „התשפז” מפורש כאן כסימון השנה ה׳תשפ״ז (5787). אין בכך אימות לטענות הפוליטיות שבציטוט. התאריך בהודעות נמסר ללא שנה.</p><p>ההמשכים בני שתי המילים שנמצאו בסריקה המקומית נשמרו בתיקיית derived עם קרדיט נפרד לבדיקה של המערכת. הם אינם מיוחסים לאיגור כגילוי שלו.</p></aside>`;
const interpretation = source.system_interpretation;
const interpretiveAddition = interpretation ? `<aside class="addition" id="system-interpretation" data-author="המערכת"><h2>${esc(interpretation.title)}</h2>${interpretation.paragraphs.map(p => `<p>${esc(p)}</p>`).join('')}<details><summary>הרעיון המקורי שהציע צוריאל</summary><blockquote>${esc(interpretation.user_original)}</blockquote></details></aside>` : '';
const addition = interpretiveAddition + checkingAddition;
writeFileSync(resolve(dir, 'ai-addition.html'), addition + '\n');
const css = `*{box-sizing:border-box}body{margin:0;background:#0b1322;color:#e5edf9;font:17px/1.8 Arial,sans-serif}main{max-width:1440px;margin:auto;padding:32px}header{padding:20px 0 28px;border-bottom:1px solid #31425f}h1{margin:0;font-size:36px}h2{font-size:25px;margin:0 0 8px}h3{margin:0 0 12px}p{margin:8px 0}section{padding:32px 0;border-bottom:1px solid #31425f}.pair{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(0,1fr);gap:28px;align-items:start}.credit,figcaption{color:#a9bbd5;font-size:14px}figure{margin:0;min-width:0}figure img{display:block;width:100%;height:auto;border:1px solid #31425f;border-radius:10px}#ramon-rips figure img{max-width:430px;margin:auto}blockquote{margin:0 0 16px;padding:12px 16px;background:#142138;border-right:3px solid #647c9f;white-space:pre-wrap;overflow-wrap:anywhere}ul{list-style:none;padding:0;display:flex;gap:8px 18px;flex-wrap:wrap;font-size:15px}.dot{display:inline-block;width:12px;height:12px;border-radius:3px;margin-left:8px}details{margin-top:16px}summary{cursor:pointer;color:#b9d6ff}img.original{display:block;max-width:100%;height:auto;margin-top:12px}.addition{padding:30px 0;font-size:15px}a{color:#a9ceff}.badge{color:#f5c857}@media(max-width:760px){main{padding:16px}.pair{grid-template-columns:minmax(0,1fr)}h1{font-size:28px}h2{font-size:22px}section{padding:24px 0}}`;
writeFileSync(resolve(dir, 'preview.html'), `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>איגור פיסיצקי — חומרים לדף</title><style>${css}</style></head><body><main><header><p class="badge">טיוטה שמורה · טרם פורסמה</p><h1>${esc(source.display_name)}</h1><p>שלושה ממצאים וסיפור לצד כל מטריצה, מוכנים לדף שתפתח.</p></header>${sections}${addition}</main></body></html>\n`);
writeFileSync(resolve(dir, 'post-draft.json'), JSON.stringify({ status: 'draft', author: source.display_name, author_id: null, source: 'ai', lang: 'he', title: 'איגור פיסיצקי — ממצאים וסיפורים', proposed_slug: 'igor-pisitsky-cipher-stories', content_file: 'post-content.html', ai_addition_file: 'ai-addition.html', attachment_paths: source.cases.flatMap(c => [c.original, `matrices/${c.id}.svg`]), publication: source.publication, note: 'Preparation manifest only; not an API payload. Upload assets and resolve existing author/taxonomy records when the user opens the page.' }, null, 2) + '\n');
console.log(JSON.stringify({ cases: reports.length, originalElsFindingsReplayed: reports.flatMap(c => c.findings).filter(f => f.kind === 'els').length, sourceContextsReplayed: reports.flatMap(c => c.findings).filter(f => f.kind !== 'els').length, corpusSha256, publication: source.publication.state }));
