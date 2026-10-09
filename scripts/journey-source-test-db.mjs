// Test transport ONLY. Actual migrations/RLS/RPCs execute inside a disposable Docker DB.
// Never accepts a remote database URL; never imported by product code.
import { spawn } from "node:child_process";
export const TEST_USER = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
export const OTHER_USER = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const container = "sod-journey-integration";
export function sql(query) {
  return new Promise((resolve, reject) => {
    const child = spawn("docker", ["exec", "-i", container, "psql", "-U", "postgres", "-XAtq", "-v", "ON_ERROR_STOP=1"]);
    let out = "", err = "";
    child.stdout.on("data", (d) => { out += d; }); child.stderr.on("data", (d) => { err += d; });
    child.on("error", reject); child.on("close", (code) => code ? reject(new Error(err)) : resolve(out.trim()));
    child.stdin.end(query);
  });
}
const rpcNames = new Set(["research_state_snapshot_v1", "research_state_apply_ops_v1", "fn_research_path_append_v1", "fn_research_path_resume_v1"]);
const quote = (s) => `'${String(s).replaceAll("'", "''")}'`;
export async function localRpc(name, args, principal = TEST_USER) {
  if (!rpcNames.has(name) || ![TEST_USER, OTHER_USER, null].includes(principal)) throw new Error("test boundary rejected");
  const params = Object.entries(args).map(([key, value]) => {
    if (!/^p_[a-z_]+$/.test(key)) throw new Error("invalid argument");
    const literal = value == null ? "NULL" : typeof value === "number" ? String(value)
      : quote(typeof value === "object" ? JSON.stringify(value) : value);
    return `${key} => ${literal}`;
  }).join(",");
  return JSON.parse(await sql(`begin; set local role authenticated; set local "request.jwt.claim.sub" = ${quote(principal || "")}; select public.${name}(${params})::text; commit;`));
}
