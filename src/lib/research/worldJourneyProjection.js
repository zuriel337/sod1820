const clean = (value) => value == null ? "" : String(value).trim();

export function normalizeWorldClassicJourneySeed(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const value = list.length ? Number(list[0]?.value) : NaN;
  if (!Number.isSafeInteger(value)) return null;

  const seen = new Set();
  const steps = [];
  for (const row of list) {
    if (Number(row?.value) !== value) continue;
    const phrase = clean(row?.phrase);
    const world = clean(row?.world);
    if (!phrase || seen.has(phrase)) continue;
    seen.add(phrase);
    steps.push({ phrase, world: world || null });
  }
  if (steps.length < 2) return null;

  return Object.freeze({
    id: `classic:${value}`,
    kind: "classic",
    value,
    steps: Object.freeze(steps),
    title: `מסע דרך ${value}`,
    summary: steps.slice(0, 3).map((step) => step.phrase).join(" · "),
    source: "journey_classic_seed",
    projectionOnly: true,
  });
}

export async function fetchWorldClassicJourneySeed() {
  const { supabase } = await import("../supabase.js");
  const { data, error } = await supabase.rpc("journey_classic_seed");
  if (error) throw error;
  return normalizeWorldClassicJourneySeed(data);
}
