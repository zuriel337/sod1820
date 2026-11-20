// Exercise the actual reader functions with an unapplied RPC; no network or private fallback.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function reader(path, name, supabase) {
  const source = readFileSync(new URL('../' + path, import.meta.url), 'utf8');
  const match = source.match(new RegExp('(?:export )?async function ' + name + '\\([^]*?\\n}'));
  assert.ok(match, 'actual reader exists');
  return vm.runInNewContext(match[0].replace(/^export /, '') + ';' + name, { supabase });
}

for (const code of ['PGRST202', '404', '42501']) {
  test(`unavailable aggregate ${code}: public strip refuses, wall stays empty`, async () => {
    const calls = [];
    const error = { code, message: 'Unavailable fixture' };
    const db = {
      rpc: async (name, args) => { calls.push({ name, hours: args.p_hours }); return { data: null, error }; },
      from: () => { throw Error('Raw history fallback is forbidden'); },
    };
    const pulse = reader('src/components/experience2029/ActivityPulse2029.jsx', 'readPulse', db);
    const wall = reader('src/lib/supabaseApi2029.js', 'getWallRecent', db);
    await assert.rejects(pulse(24), e => e === error);
    assert.equal((await wall()).length, 0);
    assert.deepEqual(calls, [24, 168].map(hours => ({ name: 'research_pulse_2029', hours })));
  });
}
