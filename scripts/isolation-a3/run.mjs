#!/usr/bin/env node
// Disposable real Auth -> JWT -> Edge Runtime -> PostgREST -> PostgreSQL A3.
// Never reads .env, production credentials, private content or remote databases.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import net from "node:net";
import { fileURLToPath } from "node:url";
import { execFile as execFileCallback, spawn } from "node:child_process";
import { promisify } from "node:util";
import { randomBytes, randomUUID, createHmac, createHash } from "node:crypto";
const execFile = promisify(execFileCallback);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const source = path.join(root, "scripts/isolation-a3");
const runId = `sod-a3-${Date.now().toString(36)}-${randomBytes(3).toString("hex")}`;
const temp = fs.mkdtempSync(path.join(os.tmpdir(), `${runId}-`));
fs.chmodSync(temp, 0o700);
const network = `${runId}-net`;
const volume = `${runId}-pgdata`;
const codeVolume = `${runId}-code`;
const names = [];
let createdNetwork = false;
let createdVolume = false;
let createdCodeVolume = false;
const dockerEnv = { ...process.env };
for (const key of ["DOCKER_HOST", "DOCKER_CONTEXT", "DOCKER_TLS", "DOCKER_TLS_VERIFY", "DOCKER_CERT_PATH"]) delete dockerEnv[key];
const command = async (exe, args, options = {}) => (await execFile(exe, args, {
  cwd: root, maxBuffer: 4 * 1024 * 1024, timeout: 60000, ...options,
})).stdout.trim();
const docker = (args, options = {}) => command("docker", ["--host=unix:///var/run/docker.sock", ...args], { env: dockerEnv, ...options });
const dockerInput = (args,input) => new Promise((resolve,reject)=>{
  const child=spawn("docker",["--host=unix:///var/run/docker.sock",...args],{env:dockerEnv,stdio:["pipe","pipe","pipe"]});
  let stdout="",stderr="";
  child.stdout.on("data",chunk=>stdout+=chunk);child.stderr.on("data",chunk=>stderr+=chunk);
  child.on("error",reject);child.on("close",code=>code===0?resolve(stdout.trim()):reject(new Error(`isolated container command failed: ${stderr}`)));
  child.stdin.end(input);
});
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const sha = content => createHash("sha256").update(content).digest("hex");
const images = {
  db: "postgres:17@sha256:31ba9c94a03ada9988f2bb493a22a75eef3a185884533e5cdbcd498ea835b08f",
  auth: "supabase/gotrue:v2.197.0@sha256:1736a63078f5922b198c4cbe50f80ab9a2d3b54fe8b7b6cfb2e9dc5dbbc12c6b",
  rest: "postgrest/postgrest:v14.18@sha256:c7cd7e265a85b05248abf53f4473fcec7e327c282d0bd0cf60f1551996d09fcf",
  edge: "supabase/edge-runtime:v1.77.4@sha256:ad45164b7548bf5820ed7be714789c17ac2865edce79a09cfb4c3756c3d365a8",
  gateway: "node:24.21.0-bookworm-slim@sha256:d6aa754f16b3197301076f047b5def2f02ea1dbbc2ca920407d46d7ec7f87b20",
};
const receipt = { runId, startedAt: new Date().toISOString(), scope: "original A3 plus persisted local correlation; not entire 2029 workflow", images, checks: {} };
let receiptPath;
const writePrivate = (name, text) => {
  const file = path.join(temp, name); fs.writeFileSync(file, text, { mode: 0o600 }); return file;
};
const envFile = (name, values) => writePrivate(`${name}.env`, Object.entries({
  HTTP_PROXY: "", HTTPS_PROXY: "", ALL_PROXY: "", http_proxy: "", https_proxy: "", all_proxy: "", NO_PROXY: "*", no_proxy: "*",
  ...values,
}).map(([key, value]) => `${key}=${value}`).join("\n") + "\n");
// Docker's proxy defaults are appended after --env-file. Explicit --env flags
// suppress that automatic injection, including duplicate differently cased keys.
const isolatedProxyArgs=Object.entries({HTTP_PROXY:"",HTTPS_PROXY:"",ALL_PROXY:"",http_proxy:"",https_proxy:"",all_proxy:"",NO_PROXY:"*",no_proxy:"*"}).flatMap(([key,value])=>["--env",`${key}=${value}`]);
const waitFor = async (label, fn) => {
  for (let i = 0; i < 50; i++) {
    try { if (await fn()) return; } catch { /* service starting */ }
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  throw new Error(`isolated service did not become ready: ${label}`);
};
const run = async (kind, env, extra = [], args = []) => {
  const name = `${runId}-${kind}`;
  names.push(name);
  await docker(["run", "-d", "--name", name, "--label", `sod.isolation-a3=${runId}`,
    "--network", network, "--network-alias", kind, "--cap-drop", "ALL", "--security-opt", "no-new-privileges",
    "--read-only", "--tmpfs", "/tmp:rw,noexec,nosuid,size=64m", "--env-file", envFile(kind, env),
    ...isolatedProxyArgs, ...extra, images[kind], ...args]);
  return name;
};
async function verifyStackIsolation() {
  const networkInfo=JSON.parse(await docker(["network","inspect",network]))[0];
  assert.equal(networkInfo.Internal,true);
  const services=JSON.parse(await docker(["inspect",...names]));
  for(const service of services){
    assert.equal(service.Config.Labels["sod.isolation-a3"],runId);
    assert.deepEqual(Object.keys(service.NetworkSettings.Networks),[network]);
    assert.ok(Object.values(service.HostConfig.PortBindings||{}).flat().every(port=>port.HostIp==="127.0.0.1"));
    const proxyVars=service.Config.Env.filter(line=>/^(?:HTTP_PROXY|HTTPS_PROXY|ALL_PROXY|http_proxy|https_proxy|all_proxy)=/.test(line));
    assert.ok(proxyVars.every(line=>line.endsWith("=")),"Docker defaults injected an outbound proxy into the isolated stack");
  }
  return {internal:true,onlyNetwork:true,publishedBindings:"127.0.0.1 only",proxyEnvironmentEmpty:true,
    clientLocation:"original A3 CLI bundled from current source, running on gateway container loopback"};
}
const sql = async content => {
  // Stream directly into psql; Docker cp cannot target a read-only rootfs even
  // when /tmp is a writable mount. No SQL or secrets appear in process arguments.
  return new Promise((resolve,reject)=>{
    const child=spawn("docker",["--host=unix:///var/run/docker.sock","exec","-i",`${runId}-db`,"psql","-X","-v","ON_ERROR_STOP=1","-U","postgres","-d","postgres","-At"],{env:dockerEnv,stdio:["pipe","pipe","pipe"]});
    let stdout="",stderr="";
    child.stdout.on("data",chunk=>stdout+=chunk); child.stderr.on("data",chunk=>stderr+=chunk);
    child.on("error",reject); child.on("close",code=>code===0 ? resolve(stdout.trim()) : reject(new Error(`isolated SQL failed: ${stderr}`)));
    child.stdin.end(content);
  });
};
const definitions = [];
function addDefinition(file, name) {
  const text = read(file);
  const re = new RegExp(`create(?:\\s+or\\s+replace)?\\s+function\\s+public\\.${name}\\(`, "i");
  const start = text.search(re);
  assert.ok(start >= 0, `missing original SQL: ${name}`);
  const tail = text.slice(start);
  const marker = /\bas\s+(\$[a-z0-9_]*\$)/i.exec(tail);
  assert.ok(marker, `missing function body: ${name}`);
  const end = tail.indexOf(marker[1], marker.index + marker[0].length) + marker[1].length;
  assert.ok(end > marker.index);
  const definition = tail.slice(0, end) + ";\n";
  definitions.push({ file, name, sha256: sha(definition) });
  return definition;
}
const jwtSecret = randomBytes(48).toString("hex");
const password = randomBytes(32).toString("hex");
const jwt = role => {
  const encode = value => Buffer.from(JSON.stringify(value)).toString("base64url");
  const unsigned = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({
    iss: "sod1820-isolation-a3", ref: runId, role, iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000)+3600,
  })}`;
  return `${unsigned}.${createHmac("sha256", jwtSecret).update(unsigned).digest("base64url")}`;
};
const anonKey = jwt("anon"), serviceKey = jwt("service_role");
let origin;
const request = async (route, { token = anonKey, body, method, ...options } = {}) => {
  const input = JSON.stringify({url:`${origin}${route}`,options:{
    method: method || (body === undefined ? "GET" : "POST"), redirect: "error",
    headers: { apikey: anonKey, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }), ...options,
  }});
  return JSON.parse(await dockerInput(["exec","-i",`${runId}-gateway`,"node","--input-type=module","-e",`
    let text='';for await(const chunk of process.stdin)text+=chunk;
    const input=JSON.parse(text); const response=await fetch(input.url,{...input.options,signal:AbortSignal.timeout(10000)});
    const raw=await response.text();let data;try{data=JSON.parse(raw)}catch{data=null};console.log(JSON.stringify({status:response.status,data}));
  `],input));
};

try {
  console.log(`A3 isolated stack starting: ${runId}`);
  receipt.sourceHead = await command("git", ["rev-parse", "HEAD"]);
  await docker(["info", "--format", "{{.ServerVersion}}"]);
  // Pulls are an explicit preparation step using the managed daemon's proxy/CA.
  // No networked package installation occurs inside the isolated test stack.
  for (const image of Object.values(images)) await docker(["image", "inspect", image, "--format", "{{.Id}}"]);
  const { build, version } = await import("esbuild");
  assert.equal(version, "0.28.2");
  const functions = path.join(temp, "functions");
  fs.mkdirSync(path.join(functions, "main"), { recursive: true, mode: 0o755 });
  fs.mkdirSync(path.join(functions, "research-run"), { mode: 0o755 });
  fs.copyFileSync(path.join(source, "edge-main.ts"), path.join(functions, "main/index.ts"));
  const bundle = await build({ entryPoints: [path.join(root, "supabase/functions/research-run/index.ts")],
    bundle: true, platform: "neutral", format: "esm", target: "es2022", write: false, metafile: true,
    define: { window: "undefined", __SOD_2029_BUILD__: "false", __SOD_RESEARCH_EDGE__: "true" } });
  fs.writeFileSync(path.join(functions, "research-run/index.ts"), bundle.outputFiles[0].text);
  receipt.bundleSha256 = sha(bundle.outputFiles[0].text);
  receipt.sources = Object.keys(bundle.metafile.inputs).sort().map(file => {
    assert.ok(!file.includes("node_modules") && !file.endsWith("src/lib/supabase.js"), `unexpected Edge dependency ${file}`);
    return { file, sha256: sha(read(file)) };
  });
  // Bundle the ORIGINAL A3 CLI with its local dependency injection. The live
  // module is external and absent from the stack; local mode never imports it.
  const clientBundle = await build({entryPoints:[path.join(root,"scripts/test-a3-client-correlation-live.mjs")],
    bundle:true,platform:"node",format:"esm",target:"node24",write:false,metafile:true,
    banner:{js:'import { createRequire as __a3CreateRequire } from "node:module"; const require = __a3CreateRequire(import.meta.url);'},
    plugins:[{name:"exclude-canonical-client",setup(build){build.onResolve({filter:/src\/lib\/supabase\.js$/},args=>({path:args.path,external:true}));}}],
  });
  assert.ok(!Object.keys(clientBundle.metafile.inputs).some(file=>file.endsWith("src/lib/supabase.js")));
  receipt.clientBundleSha256=sha(clientBundle.outputFiles[0].text);
  await docker(["network", "create", "--internal", "--label", `sod.isolation-a3=${runId}`, network]);
  createdNetwork = true;
  await docker(["volume", "create", "--label", `sod.isolation-a3=${runId}`, volume]);
  assert.equal(JSON.parse(await docker(["volume","inspect",volume]))[0].Labels["sod.isolation-a3"],runId);
  createdVolume = true;
  await docker(["volume", "create", "--label", `sod.isolation-a3=${runId}`, codeVolume]);
  assert.equal(JSON.parse(await docker(["volume","inspect",codeVolume]))[0].Labels["sod.isolation-a3"],runId);
  createdCodeVolume = true;
  // The managed Docker daemon does not share this executor's bind-mount paths.
  // Copy only these explicit source bytes through stdin to an offline preparer.
  const prepareName = `${runId}-prepare`;
  names.push(prepareName);
  await docker(["run","-d","--name",prepareName,"--label",`sod.isolation-a3=${runId}`,"--network","none","--cap-drop","ALL","--security-opt","no-new-privileges", "--mount",`type=volume,src=${codeVolume},dst=/code`,images.gateway,"node","-e","setInterval(()=>{},1000)"]);
  await new Promise((resolve,reject)=>{
    const child=spawn("docker",["--host=unix:///var/run/docker.sock","exec","-i",prepareName,"node","--input-type=module","-e",`import fs from 'node:fs'; let text='';for await(const chunk of process.stdin)text+=chunk;for(const [name,content]of Object.entries(JSON.parse(text))){const file='/code/'+name;fs.mkdirSync(file.slice(0,file.lastIndexOf('/')),{recursive:true});fs.writeFileSync(file,content)}`],{env:dockerEnv,stdio:["pipe","pipe","pipe"]});
    let stderr=""; child.stderr.on("data",chunk=>stderr+=chunk);child.on("error",reject);child.on("close",code=>code===0?resolve():reject(new Error(`offline code delivery failed: ${stderr}`)));
    child.stdin.end(JSON.stringify({"main/index.ts":fs.readFileSync(path.join(source,"edge-main.ts"),"utf8"),"research-run/index.ts":bundle.outputFiles[0].text,"gateway.mjs":fs.readFileSync(path.join(source,"gateway.mjs"),"utf8"),"a3-client.mjs":clientBundle.outputFiles[0].text}));
  });
  await docker(["rm","-f",prepareName]); names.splice(names.indexOf(prepareName),1);
  await run("db", { POSTGRES_PASSWORD: password, PGDATA: "/var/lib/postgresql/data/pgdata" }, [
    "--memory", "384m", "--mount", `type=volume,src=${volume},dst=/var/lib/postgresql/data`, "--tmpfs", "/var/run/postgresql:rw,nosuid,size=16m",
    // Postgres entrypoint needs setuid/chown while initializing its own tmpfs.
    "--cap-add", "CHOWN", "--cap-add", "SETUID", "--cap-add", "SETGID", "--cap-add", "DAC_OVERRIDE",
  ]);
  await waitFor("postgres", async () => (await docker(["exec", `${runId}-db`, "pg_isready", "-h", "127.0.0.1", "-U", "postgres"])).includes("accepting"));
  let bootstrap = read("scripts/isolation-a3/bootstrap.sql");
  bootstrap += `\nalter role authenticator password '${password}';\nalter role supabase_auth_admin password '${password}';\n`;
  await sql(bootstrap);
  await sql(read("scripts/isolation-a3/entitlement.sql") + read("scripts/isolation-a3/live-schema-functions.sql"));
  const governance = "supabase/migrations/20260829151530_engine_governance_predicates_and_composite_engine.sql";
  let numeric = ["fn_method_is_executable", "fn_method_is_engine_verified", "fn_method_is_scannable", "fn_composite_calc"].map(name => addDefinition(governance,name)).join("\n");
  const evidence = "supabase/migrations/20260829172431_blocker_eg1_public_read_governance_rank_dont_hide.sql";
  numeric += ["fn_method_evidence_class", "fn_method_is_governed_evidence"].map(name => addDefinition(evidence,name)).join("\n");
  numeric += addDefinition("supabase/migrations/20260911134000_w2_2d_number_lookup_keyset_and_gematria_controls_v1.sql", "fn_number_lookup");
  numeric += addDefinition("supabase/migrations/20260913154800_g2_p0_number_dossier_root_of_trust_v1.sql", "fn_number_dossier");
  numeric += addDefinition("supabase/migrations/20260911113557_w2_2b_publication_boundary_hardening_v1.sql", "fn_number_journey");
  await sql(numeric);
  for (const file of ["supabase/migrations/20260922191500_operational_trace_runtime_v1.sql", "supabase/migrations/20260922194500_server_capability_execution_gate_v1.sql"]) {
    const text = read(file); await sql(text); definitions.push({ file, name: "complete migration", sha256: sha(text) });
  }
  // Match the existing public read policy: zero-scale runs as caller, not definer.
  await sql(read("scripts/isolation-a3/zero-scale.sql") + ";\n" + read("supabase/migrations/20260905123600_fn_zero_scale_public_rls_safe_access_v1.sql"));
  await run("auth", { GOTRUE_API_HOST: "0.0.0.0", GOTRUE_API_PORT: "9999", API_EXTERNAL_URL: "http://gateway:8000/auth/v1",
    GOTRUE_SITE_URL: "http://gateway:8000", GOTRUE_DB_DRIVER: "postgres", GOTRUE_DB_DATABASE_URL: `postgres://supabase_auth_admin:${password}@db:5432/postgres`,
    GOTRUE_JWT_SECRET: jwtSecret, GOTRUE_JWT_AUD: "authenticated", GOTRUE_JWT_DEFAULT_GROUP_NAME: "authenticated", GOTRUE_JWT_ADMIN_ROLES: "service_role",
    GOTRUE_JWT_EXP: "3600", GOTRUE_EXTERNAL_EMAIL_ENABLED: "true", GOTRUE_MAILER_AUTOCONFIRM: "true", GOTRUE_DISABLE_SIGNUP: "false",
    GOTRUE_SMTP_HOST: "127.0.0.1", GOTRUE_SMTP_PORT: "1", GOTRUE_HOOK_SEND_EMAIL_ENABLED: "false", GOTRUE_HOOK_SEND_SMS_ENABLED: "false",
    GOTRUE_EXTERNAL_PHONE_ENABLED: "false", GOTRUE_LOG_LEVEL: "error",
  }, ["--memory", "192m"]);
  await run("rest", { PGRST_DB_URI: `postgres://authenticator:${password}@db:5432/postgres`, PGRST_DB_SCHEMAS: "public",
    PGRST_DB_ANON_ROLE: "anon", PGRST_JWT_SECRET: jwtSecret, PGRST_SERVER_PORT: "3000", PGRST_LOG_LEVEL: "error",
  }, ["--memory", "128m"]);
  // Allocate a loopback port without touching existing listeners/containers.
  const listener = net.createServer(); await new Promise(resolve => listener.listen(0,"127.0.0.1",resolve));
  const port = listener.address().port; await new Promise(resolve => listener.close(resolve));
  origin = "http://127.0.0.1:8000";
  await run("gateway", {}, ["--memory", "128m", "--publish", `127.0.0.1:${port}:8000`, "--mount", `type=volume,src=${codeVolume},dst=/gateway,readonly`], ["node", "/gateway/gateway.mjs"]);
  const gatewayInfo=JSON.parse(await docker(["inspect",`${runId}-gateway`]))[0];
  const gatewayIp=gatewayInfo.NetworkSettings.Networks[network].IPAddress;
  await run("edge", { JWT_SECRET: jwtSecret, SUPABASE_URL: `http://${gatewayIp}:8000`, SUPABASE_ANON_KEY: anonKey,
    SUPABASE_SERVICE_ROLE_KEY: serviceKey, DENO_DIR: "/tmp/deno",
  }, ["--memory", "512m", "--mount", `type=volume,src=${codeVolume},dst=/functions,readonly`], ["start", "--main-service", "/functions/main"]);
  receipt.network=await verifyStackIsolation();
  receipt.checks.stackIsolationInspectedBeforeA3=true;
  await waitFor("auth", async () => (await request("/auth/v1/health")).status === 200);
  await waitFor("postgrest", async () => (await request("/rest/v1/")).status === 200);
  await waitFor("edge", async () => (await request("/functions/v1/research-run", { token:"invalid", body:{} })).status === 401);
  const signup = await request("/auth/v1/signup", { body: { email: `${runId}@example.invalid`, password: randomBytes(24).toString("hex") } });
  if(signup.status!==200)writePrivate("signup-error.json",JSON.stringify(signup));
  assert.equal(signup.status, 200, `local signup failed (${signup.status})`);
  const accessToken = signup.data.access_token;
  assert.ok(accessToken, "GoTrue did not issue a signed JWT");
  const user = await request("/auth/v1/user", { token: accessToken });
  assert.equal(user.status, 200); assert.match(user.data.id, /^[0-9a-f-]{36}$/);
  await sql(`insert into public.users(id,role) values('${user.data.id}','user'); insert into public.profiles(user_id,tier) values('${user.data.id}',0);`);
  receipt.checks.realAuthUserAndJwt = true;
  assert.ok([401,403].includes((await request("/auth/v1/user", { token:"invalid" })).status));
  assert.equal((await request("/rest/v1/op_trace_roots", { token:"invalid" })).status,401);
  receipt.checks.invalidJwtRejectedByAuthPostgrestAndEdge = true;
  const preflightId=randomUUID();
  const preflight=await request("/rest/v1/rpc/op_trace_begin_v1",{token:serviceKey,body:{p_trace_id:preflightId,p_root_span_id:randomUUID(),p_context:{},p_started_at:new Date().toISOString()}});
  assert.equal(preflight.status,200,`real PostgREST trace RPC preflight: ${JSON.stringify(preflight.data)}`);
  await sql(`delete from public.op_trace_roots where trace_id='${preflightId}';`);
  const witnesses = [];
  for (const [identityClass, token] of [["public_user", null],["authenticated_user", accessToken]]) {
    const configPath = `/tmp/client-${identityClass}.json`;
    await dockerInput(["exec","-i",`${runId}-gateway`,"node","--input-type=module","-e",`import fs from 'node:fs';let text='';for await(const chunk of process.stdin)text+=chunk;fs.writeFileSync('${configPath}',text,{mode:0o600});`],JSON.stringify({url:origin,runId,anonKey,...(token?{accessToken:token}:{})}));
    const output = await docker(["exec","-e","SOD_A3_MODE=isolated","-e",`SOD_A3_ISOLATED_CONFIG=${configPath}`,`${runId}-gateway`,"node","/gateway/a3-client.mjs"]);
    console.log(output);
    const match = /interaction_id=([\w-]+) trace_id=([\w-]+) status=(\w+)/.exec(output);
    assert.ok(match); assert.equal(match[3],"ok", "local A3 must execute the actual allowed composer path");
    const roots = await request(`/rest/v1/op_trace_roots?trace_id=eq.${match[2]}`, { token:serviceKey });
    assert.equal(roots.status,200); assert.equal(roots.data.length,1);
    const trace = roots.data[0];
    assert.equal(trace.interaction_id,match[1]); assert.equal(trace.identity_class,identityClass);
    assert.ok(trace.ended_at && trace.outcome, "trace must be finalized in PostgreSQL");
    const spans = await request(`/rest/v1/op_trace_spans?trace_id=eq.${match[2]}`, { token:serviceKey });
    assert.equal(spans.status,200);
    for (const name of ["research-run","fn_capability_execution_gate_v1","composeResearchW2","w2:numeric","w2:numeric_operators"]) assert.ok(spans.data.some(span=>span.name===name),`missing persisted span ${name}`);
    assert.equal(spans.data.find(span=>span.name==="fn_capability_execution_gate_v1").outcome,"success");
    assert.equal(spans.data.find(span=>span.name==="w2:numeric").outcome,"success", "real numeric SQL reads must execute successfully");
    assert.ok(spans.data.every(span=>span.ended_at && span.redaction_applied && !span.raw_private_payload_logged));
    assert.ok(spans.data.every(span=>span.kind!=="model_call" && span.provider===null && span.model===null && span.cost_certainty==="not_billable"));
    const denied = await request(`/rest/v1/op_trace_roots?trace_id=eq.${match[2]}`, { token:token || anonKey });
    assert.ok([401,403].includes(denied.status), "caller must not read service trace tables");
    witnesses.push({ identityClass,interactionId:match[1],traceId:match[2],outcome:trace.outcome,
      spans:spans.data.map(({name,kind,outcome,parent_span_id,span_id})=>({name,kind,outcome,hasParent:!!parent_span_id,spanId:span_id})) });
  }
  receipt.checks.originalA3Assertions = true;
  receipt.checks.persistedInteractionTraceCorrelationBothIdentities = true;
  receipt.checks.fullRootGateComposerCapabilitySpanTree = true;
  receipt.checks.traceTablesDenyCallerReads = true;
  receipt.checks.noModelProviderSpansAndAllCostNotBillable=true;
  receipt.witnesses = witnesses;
  // Internal-only Docker networking is the enforcement boundary for every
  // runtime service. Test egress from the same network without weakening TLS.
  await verifyStackIsolation();
  const egress = await docker(["exec",`${runId}-gateway`,"node","--input-type=module","-e",`
    import net from 'node:net';import fs from 'node:fs';
    const noDefaultRoute=!fs.readFileSync('/proc/net/route','utf8').trim().split('\\n').slice(1).some(line=>line.split(/\\s+/)[1]==='00000000');
    if(!noDefaultRoute)throw Error('isolated stack unexpectedly has default route');
    const hosts=['linswmnnkjxvweumprav.supabase.co','api.openai.com','api.resend.com','1.1.1.1'];
    for(const host of hosts){ let connected=false; await new Promise(resolve=>{const s=net.connect({host,port:443}); s.setTimeout(1500); s.on('connect',()=>{connected=true;s.destroy();resolve()}); s.on('error',resolve); s.on('timeout',()=>{s.destroy();resolve()})}); if(connected)throw Error('egress unexpectedly available'); }
    console.log(JSON.stringify({blocked:hosts,noDefaultRoute}));
  `]);
  receipt.network.egressProbe=JSON.parse(egress);
  receipt.checks.runtimeEgressDenied = true;
  // Restart the actual database container and prove this is durable database
  // persistence, not an in-memory gateway response.
  await docker(["restart",`${runId}-db`]);
  await waitFor("postgres restart",async()=> (await docker(["exec",`${runId}-db`,"pg_isready","-h","127.0.0.1","-U","postgres"])).includes("accepting"));
  const count = await sql("select count(*) from public.op_trace_roots where ended_at is not null;");
  assert.equal(count,"2");
  assert.equal(await sql("select (select count(*) from public.ai_token_log)+(select count(*) from public.ai_usage);"),"0");
  receipt.checks.noAiTokenOrQuotaWrites=true;
  receipt.checks.tracesSurviveDatabaseRestart = true;
  receipt.sqlProvenance = definitions;
  receipt.status = "PASS";
  const receiptArg = process.argv.indexOf("--receipt");
  receiptPath = receiptArg >= 0 ? path.resolve(process.argv[receiptArg+1]) : path.join(temp,"receipt.json");
  receipt.priorHarnessFailures="docs/reviews/public-launch-closure-20261102/a3/startup-history.json";
} catch (error) {
  // Service logs contain only synthetic data but remain private outside Git.
  for (const name of names) {
    try {
      const logs=await execFile("docker",["--host=unix:///var/run/docker.sock","logs","--tail","100",name],{env:dockerEnv,maxBuffer:1024*1024});
      writePrivate(`${name}.log`,logs.stdout+logs.stderr);
    } catch { /* preserve primary failure */ }
  }
  receipt.status="FAIL"; receipt.error=error.message;
  writePrivate("failure-receipt.json",JSON.stringify(receipt,null,2));
  console.error(`A3_ISOLATED_PERSISTENCE_ACCEPTANCE=FAIL diagnostics=${temp}`);
  throw error;
} finally {
  if(receipt.status==="FAIL" && process.env.SOD_A3_KEEP_ON_FAILURE==="1") {
    console.error(`A3 debug resources retained with exact owner label sod.isolation-a3=${runId}`);
  } else {
  for (const name of [...names].reverse()) {
    // Never stop/delete an existing or differently owned container.
    const owner = await docker(["inspect","--format",'{{index .Config.Labels "sod.isolation-a3"}}',name]).catch(()=>"");
    if(owner===runId) await docker(["rm","-f",name]);
  }
  if(createdNetwork) await docker(["network","rm",network]);
  if(createdVolume) await docker(["volume","rm",volume]);
  if(createdCodeVolume) await docker(["volume","rm",codeVolume]);
  receipt.checks.ownedResourcesCleaned=true;
  }
}
receipt.finishedAt=new Date().toISOString();
fs.mkdirSync(path.dirname(receiptPath),{recursive:true});
fs.writeFileSync(receiptPath,JSON.stringify(receipt,null,2)+"\n",{mode:0o600});
console.log(`A3_ISOLATED_PERSISTENCE_ACCEPTANCE=PASS receipt=${receiptPath}`);
