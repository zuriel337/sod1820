// Editorial preparation projection only: never a publication/access decision.
export function bookPreparation(entry) {
  if (!entry || !Array.isArray(entry.steps) || entry.steps.length !== 5) return { percent: null, ready: false, steps: [] };
  const ids = ["source", "guides", "units", "editorial", "reader"];
  const valid = entry.steps.every((step, index) => step?.id === ids[index] && Number.isInteger(step.total) && step.total > 0 && (step.completed === null || (Number.isInteger(step.completed) && step.completed >= 0 && step.completed <= step.total)));
  if (!valid) return { percent: null, ready: false, steps: [] };
  const fraction = entry.steps.reduce((sum, step) => sum + (step.completed === null ? 0 : step.completed / step.total), 0) / entry.steps.length;
  // Unassessed gates remain null in evidence; they are not measured zeroes.
  const percent = Math.floor(fraction * 100);
  return { percent, ready: percent === 100 && entry.steps.every(step => step.completed === step.total), steps: entry.steps };
}
