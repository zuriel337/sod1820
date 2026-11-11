// A disposable local PostgreSQL for the simulations. Refuses anything that is not a loopback server, creates one database per
// scenario (sod_sim_<pid>_<n>) and drops them all on close. The live database is never reachable from here.
import pg from "pg";

const LOOPBACK = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);

export async function localServer(url) {
  const u = new URL(url);
  if (!LOOPBACK.has(u.hostname)) throw new Error(`refusing a non-local database host: ${u.hostname}`);
  const admin = new pg.Client({ connectionString: url });
  await admin.connect();
  const addr = (await admin.query("select coalesce(host(inet_server_addr()), 'socket') a")).rows[0].a;
  if (!["127.0.0.1", "::1", "socket"].includes(addr)) { await admin.end(); throw new Error(`server is not on loopback: ${addr}`); }
  const created = [];
  const clients = [];
  let seq = 0;
  const urlFor = (name) => { const v = new URL(url); v.pathname = "/" + name; return v.toString(); };
  async function connect(name) {
    const c = new pg.Client({ connectionString: urlFor(name) });
    c.on("notice", () => {});
    await c.connect();
    clients.push(c);
    return c;
  }
  const adapter = (c, name) => ({
    name, client: c,
    query: (sql, params = []) => c.query(sql, params),
    exec: (sql) => c.query(sql),
    connect: () => connect(name),
  });
  return {
    async freshDb() {
      const name = `sod_sim_${process.pid}_${++seq}`;
      await admin.query(`create database ${name}`);
      created.push(name);
      return adapter(await connect(name), name);
    },
    async activity(name) {
      return (await admin.query(
        "select pid, state, wait_event_type, left(query, 120) q from pg_stat_activity where datname=$1 and pid <> pg_backend_pid()", [name])).rows;
    },
    version: async () => (await admin.query("show server_version")).rows[0].server_version,
    async close() {
      for (const c of clients) { try { await c.end(); } catch {} }
      for (const name of created) { try { await admin.query(`drop database if exists ${name} with (force)`); } catch {} }
      await admin.end();
    },
  };
}
