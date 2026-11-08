#!/usr/bin/env node
// FAKE stdio MCP server for the execute_sql guard e2e proof. It has NO database and NO network: every tools/call is only
// appended (as one JSON line) to the file in $FAKE_MCP_LOG and answered with a canned text. A line in that log therefore means
// "the tool call got past Claude Code's permission layer and reached the server".
import { appendFileSync } from "node:fs";
import { createInterface } from "node:readline";

const LOG = process.env.FAKE_MCP_LOG;
const TOOLS = [
  { name: "execute_sql", description: "Executes raw SQL (fake server: nothing is executed).", inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] } },
  { name: "apply_migration", description: "Applies a migration (fake server: nothing is applied).", inputSchema: { type: "object", properties: { name: { type: "string" }, query: { type: "string" } }, required: ["name", "query"] } },
  { name: "list_tables", description: "Lists tables (fake server).", inputSchema: { type: "object", properties: {} } },
];
const send = msg => process.stdout.write(JSON.stringify({ jsonrpc: "2.0", ...msg }) + "\n");

createInterface({ input: process.stdin }).on("line", line => {
  let m; try { m = JSON.parse(line); } catch { return; }
  if (m.method === "initialize") return send({ id: m.id, result: { protocolVersion: m.params?.protocolVersion || "2025-06-18", capabilities: { tools: {} }, serverInfo: { name: "Supabase", version: "0.0.0-fake" } } });
  if (m.method === "tools/list") return send({ id: m.id, result: { tools: TOOLS } });
  if (m.method === "tools/call") {
    if (LOG) appendFileSync(LOG, JSON.stringify({ tool: m.params?.name, args: m.params?.arguments }) + "\n");
    return send({ id: m.id, result: { content: [{ type: "text", text: "FAKE-SERVER-RECEIVED-CALL (nothing was executed)" }] } });
  }
  if (m.id !== undefined && m.method) return send({ id: m.id, error: { code: -32601, message: "method not found" } });
});
