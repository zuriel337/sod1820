// Display-only families. Original cards and occurrence identities are retained.
const identity = member => JSON.stringify([member.term, member.hitId]);
const membersOf = card => card.members.filter(member => member.kind !== 'axis');
const priority = card => card.types.some(type => ['intersection', 'transversal'].includes(type)) ? 0
  : card.types.length === 1 && card.types[0] === 'cluster' ? 2 : 1;
const length = card => Math.max(0, ...membersOf(card).map(member => [...member.term].length));
const distance = card => Number.isFinite(card.distance) ? card.distance : Infinity;
export function presentElsStructureFamilies(cards, sort = 'diverse') {
  const compare = (a, b) => (sort === 'length' ? length(b) - length(a)
    : sort === 'distance' ? distance(a) - distance(b) : priority(a) - priority(b)) || 0;
  const pending = [...cards].sort(compare), families = [];
  while (pending.length) {
    // Choose the most shared non-axis occurrence on the first card. Never merge
    // merely equal spellings at different positions, or transitively join chains.
    const first = pending[0];
    const anchor = membersOf(first).map(member => ({ member, id: identity(member),
      count: pending.filter(card => membersOf(card).some(item => identity(item) === identity(member))).length }))
      .sort((a, b) => b.count - a.count)[0];
    const grouped = anchor ? pending.filter(card => membersOf(card).some(member => identity(member) === anchor.id)) : [first];
    const selected = new Set(grouped);
    families.push({ id: anchor?.id || first.id, member: anchor?.member, cards: grouped });
    for (let i = pending.length - 1; i >= 0; i--) if (selected.has(pending[i])) pending.splice(i, 1);
  }
  if (sort !== 'diverse') return families;
  // Round robin by displayed term: a word with many distinct occurrences cannot
  // fill the first page while other available words remain unseen.
  const buckets = new Map();
  for (const family of families) {
    const term = family.member?.term || family.id;
    if (!buckets.has(term)) buckets.set(term, []);
    buckets.get(term).push(family);
  }
  const result = [];
  while (result.length < families.length) for (const bucket of buckets.values()) if (bucket.length) result.push(bucket.shift());
  return result;
}
