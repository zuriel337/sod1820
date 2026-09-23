// CLI dry-run: node scripts/g3-community-foundation-runtime/dry-run-import.mjs [messages.json] [prior-state.json]
// Prints the plan as JSON. Never opens a DB connection, never writes anything.
import fs from 'node:fs';
import { planImport } from './planner.mjs';

function loadState(path) {
  const raw = JSON.parse(fs.readFileSync(path, 'utf8'));
  return {
    importedMessageIds: new Set(raw.importedMessageIds || []),
    usersByVerifiedEmail: new Map(Object.entries(raw.usersByVerifiedEmail || {})),
    contributorsByEmail: new Map(Object.entries(raw.contributorsByEmail || {})),
  };
}

const messagesPath = process.argv[2] || 'test/fixtures/openweb-import/synthetic-messages.json';
const statePath = process.argv[3] || 'test/fixtures/openweb-import/prior-state.json';

const messages = JSON.parse(fs.readFileSync(messagesPath, 'utf8'));
const state = loadState(statePath);
const ops = planImport(messages, state);

const summary = ops.reduce((acc, op) => {
  acc[op.op] = (acc[op.op] || 0) + 1;
  return acc;
}, {});

console.log(JSON.stringify({ summary, ops }, null, 2));
