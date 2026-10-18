import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  NUMBER_OPENING_PROJECTION_RPC,
  fetchNumberOpeningProjection,
  normalizeNumberOpeningProjection,
  projectNumberOpeningCore,
} from "../src/lib/research/numberOpeningProjection2029.js";

const { PGlite } = await import(process.env.PGLITE_MODULE || "@electric-sql/pglite");
const migrationUrl = new URL("../supabase/migrations/20261018024447_number_opening_projection_2029.sql", import.meta.url);

const IDS = Object.freeze({
  zero: "00000000-0000-4000-8000-000000000001",
  a: "00000000-0000-4000-8000-000000000002",
  b: "00000000-0000-4000-8000-000000000003",
  a2: "00000000-0000-4000-8000-000000000004",
  delta: "00000000-0000-4000-8000-000000000005",
  epsilon: "00000000-0000-4000-8000-000000000006",
  old: "00000000-0000-4000-8000-000000000007",
  secret: "00000000-0000-4000-8000-000000000008",
  draft: "00000000-0000-4000-8000-000000000009",
  v376a: "00000000-0000-4000-8000-000000000010",
  v376b: "00000000-0000-4000-8000-000000000011",
  v1820a: "00000000-0000-4000-8000-000000000012",
  v1820b: "00000000-0000-4000-8000-000000000013",
  nodeA: "10000000-0000-4000-8000-000000000001",
  nodeD: "10000000-0000-4000-8000-000000000002",
});

async function makeDb() {
  const db = new PGlite();
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role;

    create table public.gematria_words (
      id uuid primary key,
      phrase text,
      node_id uuid,
      ragil integer,
      tags text[],
      is_verified boolean,
      is_published boolean not null default false,
      is_encrypted boolean
    );
    create table public.bidim (
      method text,
      phrase text,
      value bigint,
      bid_id text,
      word_id uuid
    );
    create table public.gematria_methods (
      method_key text primary key,
      db_column text,
      display_label text not null,
      sub text,
      soul text,
      required_entitlement text not null default 'public',
      version integer not null default 1,
      category text not null default 'atomic',
      sort_order integer not null,
      active boolean not null default true,
      in_engine boolean not null default true,
      scannable boolean not null default true,
      execution_kind text,
      derived_from text[],
      operator text,
      mathematical_family text,
      order_sensitive boolean,
      word_boundary_sensitive boolean,
      final_letter_sensitive boolean
    );
    create table public.nodes (
      id uuid primary key,
      type text not null,
      label text not null,
      metadata jsonb,
      is_active boolean,
      created_at timestamptz default now()
    );

    create function public.fn_method_evidence_class(p_method text)
    returns text language sql stable as $$
      select case when p_method = 'ישן' then 'historical' else 'governed' end
    $$;
    create function public.fn_method_is_executable(p_method text)
    returns boolean language sql stable as $$ select p_method <> 'ישן' $$;
    create function public.fn_method_is_engine_verified(p_method text)
    returns boolean language sql stable as $$ select p_method <> 'ישן' $$;
    create function public.fn_composite_calc(p_method text, p_phrase text)
    returns table(component_values bigint[])
    language sql stable as $$ select array[length(p_phrase)::bigint, 20::bigint] $$;

    -- Minimal current full-source reference. It deliberately returns duplicate source rows; the
    -- compact projection must count them in source_row_count and dedupe only family phrases.
    create function public.fn_number_lookup(p_value bigint)
    returns table(method text, phrase text, bid_id text)
    language sql stable security invoker set search_path to 'public' as $$
      select b.method, b.phrase, b.bid_id
      from public.bidim b
      join public.gematria_words gw on gw.id = b.word_id
      left join public.gematria_methods gm on gm.method_key = b.method
      where b.value = p_value and gw.is_verified = true and coalesce(gw.is_published, false) = true
      order by
        (public.fn_method_evidence_class(b.method) <> 'governed'),
        (gm.category = 'composite'),
        b.method,
        b.phrase,
        b.bid_id
    $$;

    grant select on public.gematria_words, public.bidim, public.gematria_methods, public.nodes to anon, authenticated, service_role;
    grant execute on function public.fn_method_evidence_class(text), public.fn_method_is_executable(text),
      public.fn_method_is_engine_verified(text), public.fn_composite_calc(text,text), public.fn_number_lookup(bigint)
      to anon, authenticated, service_role;

    alter table public.gematria_words enable row level security;
    alter table public.bidim enable row level security;
    alter table public.gematria_methods enable row level security;
    alter table public.nodes enable row level security;
    create policy gw_public on public.gematria_words for select to anon, authenticated, service_role
      using (is_verified = true and is_published = true and is_encrypted is not true);
    create policy gw_admin on public.gematria_words for select to authenticated
      using (is_encrypted = true and current_setting('app.test_admin', true) = 'on');
    create policy bidim_public on public.bidim for select to anon, authenticated, service_role using (true);
    create policy methods_public on public.gematria_methods for select to anon, authenticated, service_role using (true);
    create policy nodes_public on public.nodes for select to anon, authenticated, service_role
      using (coalesce((metadata->>'public')::boolean, false));
  `);

  await db.query(`
    insert into public.gematria_methods
      (method_key,db_column,display_label,sub,soul,required_entitlement,version,category,sort_order,active,in_engine,scannable,execution_kind,derived_from,operator,mathematical_family,order_sensitive,word_boundary_sensitive,final_letter_sensitive)
    values
      ('רגיל','ragil','רגיל','יסוד',null,'public',4,'atomic',1,true,true,true,'sql_function',null,null,'additive',true,true,false),
      ('מילוי','milui','מילוי',null,null,'public',3,'composite',2,true,true,true,'composite_engine',array['רגיל'],'sum','expansion',true,true,true),
      ('ישן',null,'שיטה היסטורית',null,null,'public',1,'atomic',9,false,false,false,'unimplemented',null,null,null,null,null,null)
  `);
  await db.query(`
    insert into public.nodes(id,type,label,metadata,is_active) values
      ($1,'entity','alpha','{"public":true,"world":"אמת"}'::jsonb,true),
      ($2,'entity','delta','{"public":true,"world":"חיים"}'::jsonb,true),
      ('10000000-0000-4000-8000-000000000003','entity','secret','{"public":false,"world":"פרטי"}'::jsonb,true)
  `, [IDS.nodeA, IDS.nodeD]);
  await db.query(`
    insert into public.gematria_words(id,phrase,node_id,ragil,tags,is_verified,is_published,is_encrypted) values
      ($1,'zero',null,0,array['zero'],true,true,false),
      ($2,'alpha',$14,1,array['a'],true,true,false),
      ($3,'beta',null,null,null,true,true,false),
      ($4,'alpha',$14,1,array['duplicate'],true,true,false),
      ($5,'delta',$15,4,array['d'],true,true,false),
      ($6,'epsilon',null,5,null,true,true,false),
      ($7,'zeta',null,7,null,true,true,false),
      ($8,'secret',null,9,array['private'],true,true,true),
      ($9,'draft',null,8,null,true,false,false),
      ($10,'three-seven-six-a',null,376,null,true,true,false),
      ($11,'three-seven-six-b',null,376,null,true,true,false),
      ($12,'eighteen-twenty-a',null,1820,null,true,true,false),
      ($13,'eighteen-twenty-b',null,1820,null,true,true,false)
  `, [IDS.zero, IDS.a, IDS.b, IDS.a2, IDS.delta, IDS.epsilon, IDS.old, IDS.secret, IDS.draft,
    IDS.v376a, IDS.v376b, IDS.v1820a, IDS.v1820b, IDS.nodeA, IDS.nodeD]);
  await db.query(`
    insert into public.bidim(method,phrase,value,bid_id,word_id) values
      ('רגיל','zero',0,'zero-1',$1),
      ('רגיל','alpha',718,'a-1',$2),
      ('רגיל','alpha',718,'a-2',$4),
      ('רגיל','beta',718,'b-1',$3),
      ('מילוי','delta',718,'d-1',$5),
      ('מילוי','epsilon',718,'e-1',$6),
      ('ישן','zeta',718,'z-1',$7),
      ('רגיל','secret',718,'s-1',$8),
      ('רגיל','draft',718,'draft-1',$9),
      ('רגיל','three-seven-six-a',376,'376-a',$10),
      ('מילוי','three-seven-six-b',376,'376-b',$11),
      ('רגיל','eighteen-twenty-a',1820,'1820-a',$12),
      ('מילוי','eighteen-twenty-b',1820,'1820-b',$13)
  `, [IDS.zero, IDS.a, IDS.b, IDS.a2, IDS.delta, IDS.epsilon, IDS.old, IDS.secret, IDS.draft,
    IDS.v376a, IDS.v376b, IDS.v1820a, IDS.v1820b]);

  await db.exec(await readFile(migrationUrl, "utf8"));
  return db;
}

async function asRole(db, role, { admin = false, value = 718, perMethod = 12 } = {}) {
  await db.exec(`set role ${role}; set "app.test_admin" = '${admin ? "on" : "off"}'`);
  try {
    const out = await db.query(
      "select public.fn_number_opening_projection_2029($1::bigint,$2::integer) as projection",
      [String(value), perMethod],
    );
    const payload = out.rows[0].projection;
    return typeof payload === "string" ? JSON.parse(payload) : payload;
  } finally {
    await db.exec("reset role");
  }
}

async function fullReference(db, role, { admin = false, value } = {}) {
  await db.exec(`set role ${role}; set "app.test_admin" = '${admin ? "on" : "off"}'`);
  try {
    return (await db.query("select * from public.fn_number_lookup($1::bigint)", [String(value)])).rows;
  } finally {
    await db.exec("reset role");
  }
}

function referenceFamilies(rows) {
  const grouped = new Map();
  for (const row of rows) {
    if (!grouped.has(row.method)) grouped.set(row.method, new Map());
    const byPhrase = grouped.get(row.method);
    if (!byPhrase.has(row.phrase)) byPhrase.set(row.phrase, row);
  }
  return grouped;
}

test("migration smoke: exact compact parity for 0/376/718/1820 and empty negative/large inputs", async () => {
  const db = await makeDb();
  try {
    for (const value of [0, 376, 718, 1820]) {
      const [payload, full] = await Promise.all([
        asRole(db, "anon", { value, perMethod: 12 }),
        fullReference(db, "anon", { value }),
      ]);
      const expected = referenceFamilies(full);
      assert.equal(payload.source_row_count, full.length, `source row parity for ${value}`);
      assert.equal(payload.family_count, expected.size, `family count parity for ${value}`);
      assert.deepEqual(
        Object.fromEntries(payload.families.map((family) => [family.method, family.count])),
        Object.fromEntries([...expected].map(([method, phrases]) => [method, phrases.size])),
        `distinct per-method phrase counts for ${value}`,
      );
      for (const family of payload.families) {
        assert.deepEqual(
          family.phrases.map((row) => row.phrase),
          [...expected.get(family.method).keys()].sort().slice(0, 12),
          `bounded canonical sample for ${value}/${family.method}`,
        );
      }
    }
    for (const value of [-1, 99999, Number.MAX_SAFE_INTEGER]) {
      const payload = await asRole(db, "anon", { value });
      assert.deepEqual(payload.families, []);
      assert.equal(payload.source_row_count, 0);
      assert.equal(payload.depth.has_more, false);
      assert.equal(payload.depth.complete, true);
      assert.equal(payload.completeness.full_row_population, true);
      assert.equal(payload.completeness.universal_findings, true);
    }
  } finally {
    await db.close();
  }
});

test("SECURITY INVOKER preserves guest/member/admin visibility and never exposes draft rows", async () => {
  const db = await makeDb();
  try {
    const guest = await asRole(db, "anon", { perMethod: 20 });
    const member = await asRole(db, "authenticated", { perMethod: 20 });
    const admin = await asRole(db, "authenticated", { admin: true, perMethod: 20 });
    assert.deepEqual(member, guest, "ordinary signed-in member sees the same public source rows");
    assert.equal(guest.source_row_count, 6, "duplicate source row retained; encrypted + draft excluded");
    assert.equal(guest.distinct_method_phrase_count, 5, "duplicate method/phrase collapsed only for families");
    assert.equal(admin.source_row_count, 7, "authorized admin additionally sees the encrypted published row");
    assert.equal(admin.distinct_method_phrase_count, 6);
    assert.equal(JSON.stringify(guest).includes("draft"), false);
    assert.equal(JSON.stringify(admin).includes("draft"), false, "publication boundary applies to admin too");
    assert.equal(JSON.stringify(guest).includes("secret"), false);
    assert.equal(JSON.stringify(admin).includes("secret"), true);
  } finally {
    await db.close();
  }
});

test("opening order, duplicate/null handling, cursors and explicit depth completeness are stable", async () => {
  const db = await makeDb();
  try {
    const one = await asRole(db, "anon", { perMethod: 1 });
    const two = await asRole(db, "anon", { perMethod: 1 });
    assert.deepEqual(two, one, "same source snapshot yields byte-stable semantic cursors/order");
    assert.deepEqual(one.families.map((family) => family.method), ["רגיל", "מילוי", "ישן"]);
    assert.deepEqual(one.families.map((family) => family.count), [2, 2, 1]);
    assert.deepEqual(one.families.map((family) => family.phrases.length), [1, 1, 1]);
    assert.deepEqual(one.families.map((family) => family.sample.has_more), [true, true, false]);
    assert.deepEqual(one.families.map((family) => family.sample.complete), [false, false, true]);
    assert.equal(one.families[0].sample.cursor.bid_id, "a-1", "duplicate phrase keeps first stable bid_id");
    assert.deepEqual(one.families[1].phrases[0].component_values, [5, 20]);
    assert.equal(one.families[0].phrases[0].world, "אמת");
    assert.equal(one.families[2].registry.mathematical_family, null, "unknown metadata stays null");
    assert.equal(one.completeness.opening, true);
    assert.equal(one.completeness.counts, true);
    assert.equal(one.completeness.samples, false);
    assert.equal(one.completeness.full_row_population, false);
    assert.equal(one.completeness.universal_findings, false);
    assert.deepEqual(one.depth, {
      rpc: "fn_number_lookup",
      field_count: 37,
      cursor: null,
      cursor_field: "bid_id",
      has_more: true,
      complete: false,
      deferred: true,
    });
    for (const family of one.families) {
      for (const phrase of family.phrases) {
        assert.equal("word_id" in phrase, false);
        assert.equal("provenance" in phrase, false);
        assert.equal("source" in phrase, false);
      }
    }
  } finally {
    await db.close();
  }
});

test("reader performs one bounded RPC, preserves family shape and refuses a full-read fallback", async () => {
  const db = await makeDb();
  try {
    const payload = await asRole(db, "anon", { perMethod: 12 });
    const calls = [];
    const projection = await fetchNumberOpeningProjection(718, {
      perMethod: 99,
      rpc: async (name, args) => {
        calls.push({ name, args });
        return { data: payload, error: null };
      },
    });
    assert.deepEqual(calls, [{ name: NUMBER_OPENING_PROJECTION_RPC, args: { p_value: 718, p_per_method: 20 } }]);
    assert.equal(projection.families[0].phrases[0].phrase, "alpha");
    assert.equal(projection.families[0].phrases[0].bidId, "a-1");
    assert.equal(projection.families[0].phrases[1].ragil, null, "SQL NULL metadata stays null");
    assert.equal(projection.families[0].phrases[1].tags, null, "SQL NULL arrays stay null");
    assert.equal(projection.registry[0].method_key, "רגיל");
    assert.equal(projection.depth.deferred, true);

    const core = projectNumberOpeningCore(projection, {
      identity: { nodeId: "n-718", label: "718" },
      anchorProfile: { row: null },
    });
    assert.deepEqual(core.identity, { nodeId: "n-718", label: "718" });
    assert.equal(core.gematria.families.length, projection.families.length);
    assert.equal(core.numberPagePending, true);
    assert.equal(core.numberOpening.depth.rpc, "fn_number_lookup");

    let failures = 0;
    await assert.rejects(fetchNumberOpeningProjection(718, { rpc: async () => {
      failures += 1;
      return { data: null, error: { code: "PGRST202", message: "not installed" } };
    } }), (error) => error.code === "NUMBER_OPENING_RPC_FAILED");
    assert.equal(failures, 1, "no hidden fn_number_lookup fallback");
  } finally {
    await db.close();
  }
});

test("normalizer fails closed on inconsistent counts, completeness, unsafe values and null metadata remains null", () => {
  const empty = {
    v: 1,
    value: 0,
    per_method_limit: 12,
    family_count: 0,
    source_row_count: 0,
    distinct_method_phrase_count: 0,
    opening_phrase_count: 0,
    families: [],
    completeness: { opening: true, families: true, counts: true, samples: true, full_row_population: true, universal_findings: true },
    depth: { rpc: "fn_number_lookup", field_count: 37, cursor: null, cursor_field: "bid_id", has_more: false, complete: true, deferred: false },
  };
  assert.equal(normalizeNumberOpeningProjection(empty).value, 0);
  assert.throws(() => normalizeNumberOpeningProjection({ ...empty, value: 9007199254740992 }), /NUMBER_OPENING_VALUE_UNSAFE/);
  assert.throws(() => normalizeNumberOpeningProjection({ ...empty, family_count: 1 }), /NUMBER_OPENING_TOTALS_MISMATCH/);
  assert.throws(() => normalizeNumberOpeningProjection({ ...empty, depth: { ...empty.depth, has_more: true } }), /NUMBER_OPENING_DEPTH_COMPLETENESS_MISMATCH/);
  assert.throws(() => normalizeNumberOpeningProjection({ ...empty, completeness: { ...empty.completeness, samples: false } }), /NUMBER_OPENING_DEPTH_COMPLETENESS_MISMATCH/);
});
