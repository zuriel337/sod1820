// 🧠 AI ROUTER v1 — שכבת המפקח. מקבל פלטים בתקן האחיד מכמה מנועים (מפת-השדה הדטרמיניסטי
// + מנועי AI), מאחד אותם ל-CONSENSUS אחד, מנקד הסכמה, ומסמן סתירות.
// «האמת לא נוצרת ממודל אחד אלא מהצלבה בין מודלים על אותו גרף». ה-merge עצמו דטרמיניסטי.

// מנתח טקסט שהמשתמש הדביק מ-AI → פלט אחיד תקין, או null. סופג ```json ... ``` ורעש מסביב.
export function parseEngineOutput(text) {
  if (!text || !text.trim()) return null;
  let s = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (a >= 0 && b > a) s = s.slice(a, b + 1);
  try {
    const o = JSON.parse(s);
    if (o && (o.clusters || o.relationships_graph || o.core_axis)) return o;
  } catch { /* לא JSON תקין */ }
  return null;
}

const avg = a => (a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : 0);

// mergeEngines([{name, out}]) → consensus field map + ניקוד הסכמה + סתירות
export function mergeEngines(engines) {
  const n = engines.length;

  // core_axis — ספירת הסכמות
  const axisTally = {};
  engines.forEach(e => { const a = String(e.out.core_axis || "").trim(); if (a) axisTally[a] = (axisTally[a] || 0) + 1; });
  const core_axis = Object.entries(axisTally).map(([axis, agree]) => ({ axis, agree })).sort((a, b) => b.agree - a.agree);

  // clusters — איחוד לפי שם, ממוצע עוצמה, ספירת מנועים
  const cmap = {};
  engines.forEach(e => (e.out.clusters || []).forEach(c => {
    const k = String(c.name || "").trim(); if (!k) return;
    (cmap[k] ||= { name: k, agree: 0, strength: [], events: new Set() });
    cmap[k].agree++; if (typeof c.strength === "number") cmap[k].strength.push(c.strength);
    (c.events || []).forEach(ev => cmap[k].events.add(ev));
  }));
  const clusters = Object.values(cmap).map(c => ({ name: c.name, agree: c.agree, strength: avg(c.strength), events: [...c.events] }))
    .sort((a, b) => b.agree - a.agree || b.strength - a.strength);

  // timeline_pressure — איחוד לפי תקופה
  const pmap = {};
  engines.forEach(e => (e.out.timeline_pressure || []).forEach(t => {
    const k = String(t.period || "").trim(); if (!k) return;
    (pmap[k] ||= { period: k, agree: 0, intensity: [] });
    pmap[k].agree++; if (typeof t.intensity === "number") pmap[k].intensity.push(t.intensity);
  }));
  const timeline_pressure = Object.values(pmap).map(t => ({ period: t.period, agree: t.agree, intensity: avg(t.intensity) }))
    .sort((a, b) => b.agree - a.agree);

  // edges — איחוד לא-מכוון; סתירה = אותו זוג עם יחסים שונים
  const emap = {};
  engines.forEach(e => (e.out.relationships_graph || []).forEach(r => {
    const a = String(r.node_a || "").trim(), b = String(r.node_b || "").trim(); if (!a || !b) return;
    const k = [a, b].sort().join(" ⇄ ");
    (emap[k] ||= { a, b, relations: new Set(), agree: 0 });
    emap[k].agree++; if (r.relation) emap[k].relations.add(String(r.relation));
  }));
  const edges = Object.values(emap).map(x => ({ a: x.a, b: x.b, relations: [...x.relations], agree: x.agree, contradiction: x.relations.size > 1 }))
    .sort((a, b) => b.agree - a.agree);
  const contradictions = edges.filter(e => e.contradiction);

  // insight_level — רוב
  const lt = {}; engines.forEach(e => { const l = e.out.insight_level; if (l) lt[l] = (lt[l] || 0) + 1; });
  const insight_level = Object.entries(lt).sort((a, b) => b[1] - a[1])[0]?.[0] || "low";

  // ציון הסכמה — רק כשיש >1 מנוע. חלק היחסים/אשכולות שמופיעים ביותר ממנוע אחד
  const total = clusters.length + timeline_pressure.length + edges.length;
  const agreed = clusters.filter(c => c.agree > 1).length + timeline_pressure.filter(t => t.agree > 1).length + edges.filter(e => e.agree > 1).length;
  const agreement = n > 1 && total ? Math.round((agreed / total) * 100) : null;

  // 🟢 הרחבת הסכמה המינימלית (לא מחליפה תקן — מוסיפה): confidence · conflicts · modelContributions
  const confidence = n > 1 ? (agreement ?? 0) : ({ low: 40, medium: 60, high: 80 }[insight_level] || 40);
  const conflicts = contradictions.map(c => ({ pair: [c.a, c.b], versions: c.relations }));
  const contrib = engines.map(e => ({ model: e.name, elements: (e.out.clusters?.length || 0) + (e.out.timeline_pressure?.length || 0) + (e.out.relationships_graph?.length || 0) }));
  const sumEls = contrib.reduce((s, c) => s + c.elements, 0) || 1;
  const modelContributions = contrib.map(c => ({ model: c.model, elements: c.elements, weight: Math.round((c.elements / sumEls) * 100) / 100 }));
  // פריטים tentative — מופיעים אצל מנוע אחד בלבד כשיש כמה מנועים (confidence נמוך)
  const tentative = n > 1;

  return { engines: n, core_axis, clusters, timeline_pressure, edges, contradictions, insight_level, agreement, confidence, conflicts, modelContributions, tentative };
}
