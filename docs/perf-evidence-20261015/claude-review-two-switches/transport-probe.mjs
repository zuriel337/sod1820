import { createNumberLookupTransport } from '/tmp/claude-0/-home-user-sod1820/ba0202c1-881b-5461-bfd0-efa1a8555f4f/scratchpad/rv/wt-pr/src/lib/research/numberLookupTransport2029.js';
const calls = [];
const rpc = async (name, args) => { calls.push(name); return name === 'fn_number_lookup_2029_page' ? { error: { code: 'PGRST202' } } : { data: [{ total_count: 1 }] }; };
const t = createNumberLookupTransport(rpc, { is2029: true, readSwitches: async () => ({ fx_number_lookup_page: true }) });
for (let i = 0; i < 3; i++) await t('fn_number_lookup', { p_value: 7871, p_limit: 20, p_after_bid_id: null });
console.log('flag ON but candidate function MISSING: 3 lookups ->', calls.length, 'RPC requests:', calls.join(','));
