// Shared by the QA generator and the parity check: parses qa/extract/prod-definitions.sql (definitions read from production by
// qa/extract/extract-definitions.sql: catalog metadata only, never rows) into objects with their md5, exactly as the extraction query
// computes it (md5 of the definition text).
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

export const KIND_ORDER = ['table', 'fk', 'index', 'rls', 'policy', 'function', 'trigger', 'tablegrant', 'colgrant', 'fngrant'];
export const md5 = (text) => createHash('md5').update(text, 'utf8').digest('hex');

export function parseDefinitions(text) {
  const objects = [];
  const parts = text.split(/^-- @@ /m).slice(1);
  for (const part of parts) {
    const nl = part.indexOf('\n'), header = part.slice(0, nl), ddl = part.slice(nl + 1).replace(/\n$/, '');
    const space = header.indexOf(' ');
    objects.push({ kind: header.slice(0, space), name: header.slice(space + 1), ddl, md5: md5(ddl) });
  }
  return objects;
}
export const loadDefinitions = (root) => parseDefinitions(readFileSync(root + 'qa/extract/prod-definitions.sql', 'utf8'));
