// Local, in-memory simulation of the proposal SQL (PGlite / PostgreSQL 16). Never connects to the live DB.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

export const EX = new URL("../", import.meta.url).pathname;
export const read = (p) => readFileSync(EX + p, "utf8");
export const md5 = (s) => createHash("md5").update(s, "utf8").digest("hex");

export const SCHEMA = `
create table public.nodes (
  id uuid primary key default gen_random_uuid(),
  type text not null, label text not null, description text,
  metadata jsonb default '{}'::jsonb, is_active boolean default true,
  created_at timestamptz default now(), rule_id text, rule_version integer default 1,
  depends_on text[], supersedes_version integer, weight smallint default 1 check (weight between 1 and 5),
  hebrew_date text, axis_theme text, gallery_id uuid, identity_key text);
create unique index nodes_identity_canonical_uidx on public.nodes (type, coalesce(identity_key, label)) where (type <> all (array['image','rule']));
create unique index nodes_identity_rule_uidx on public.nodes (rule_id, rule_version) where (type='rule' and rule_id is not null);
create unique index nodes_one_active_rule_per_id_uidx on public.nodes (rule_id) where (type='rule' and is_active=true and rule_id is not null);
create table public.project_codex (
  id bigserial primary key, slug text not null unique, title text not null, category text not null, body text not null,
  related_files text[] default '{}', related_tables text[] default '{}', tags text[] default '{}', priority smallint default 3,
  source text default 'ai', created_at timestamptz default now(), updated_at timestamptz default now());
create table public.system_suggestions (id bigint primary key, detector text, observed jsonb, status text, decided_at timestamptz, decision_note text);
create table public.work_log (id uuid primary key default gen_random_uuid(), session_date date, topic text, what_we_did text, status text, open_threads text,
  task_key text unique, from_actor text, to_actor text, assignment_mode text, assignment_scope text, primary_owner text, release_authorization_state text,
  dispatch_kind text, dispatch_state text, dispatch_next_attempt_at timestamptz, dispatch_context jsonb, archived boolean default false, superseded_by_id uuid,
  created_at timestamptz default now());
create function public.rd_is_admin() returns boolean language sql as $$ select true $$;
`;

export async function freshDb({ rules = [], codex = [], fns = [] } = {}) {
  const db = new PGlite();
  await db.exec(SCHEMA);
  await db.exec(read("base/fn/fn_rule_compaction_integrity_guard_v1.sql"));
  await db.exec("create trigger trg_rule_compaction_integrity_guard_v1 before insert or update of is_active, metadata, rule_id, rule_version, supersedes_version on public.nodes for each row execute function fn_rule_compaction_integrity_guard_v1();");
  for (const r of rules) {
    const meta = read(`base/meta/${r.rule_id}@v${r.v}.json`);
    const desc = read(`base/rules/${r.rule_id}@v${r.v}.txt`);
    if (r.v > 1) {
      // inactive predecessor placeholder (the guard needs an immediate predecessor row to exist)
      await db.query(
        `insert into public.nodes (type,label,description,metadata,is_active,rule_id,rule_version,supersedes_version) values ('rule',$1,$2,$3::jsonb,false,$4,$5,$6)`,
        [`${r.rule_id} predecessor`, "(simulated predecessor)", meta, r.rule_id, r.v - 1, r.v - 1 > 1 ? r.v - 2 : null]);
    }
    await db.query(
      `insert into public.nodes (type,label,description,metadata,is_active,rule_id,rule_version,supersedes_version,depends_on) values ('rule',$1,$2,$3::jsonb,true,$4,$5,$6,$7)`,
      [r.label || r.rule_id, desc, meta, r.rule_id, r.v, r.v > 1 ? r.v - 1 : null, r.depends_on || null]);
  }
  for (const c of codex) {
    await db.query(`insert into public.project_codex (id,slug,title,category,body,priority,updated_at) values ($1,$2,$3,$4,$5,$6,'2026-01-01')`,
      [c.id, c.slug, c.slug, c.category || "x", read(`base/codex/${String(c.id).padStart(2, "0")}_${c.slug}.txt`), c.priority || 3]);
  }
  for (const f of fns) await db.exec(read(`base/fn/${f}.sql`));
  return db;
}

export async function one(db, sql, params = []) { const r = await db.query(sql, params); return r.rows[0]; }
export async function all(db, sql, params = []) { const r = await db.query(sql, params); return r.rows; }

export async function tryExec(db, sql) {
  try { await db.exec(sql); return { ok: true }; }
  catch (e) { try { await db.exec("rollback"); } catch {} return { ok: false, error: String(e.message || e) }; }
}

export const results = [];
export function check(name, cond, detail = "") {
  results.push({ name, pass: !!cond, detail });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
}
