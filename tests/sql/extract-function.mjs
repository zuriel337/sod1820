// Prints one CREATE OR REPLACE FUNCTION statement from a repository SQL file (the last one with that name), for SQL fixtures that must
// start from a reviewed definition exactly as written. Usage: node tests/sql/extract-function.mjs <file.sql> <function name>
import { readFileSync } from "node:fs";
const [file, name] = process.argv.slice(2);
const sql = readFileSync(file, "utf8");
const head = `create or replace function public.${name}`.toLowerCase();
const start = sql.toLowerCase().lastIndexOf(head);
if (start < 0) throw new Error(`${name} not found in ${file}`);
const open = sql.indexOf("$function$", start);
const close = sql.indexOf("$function$", open + 10);
const end = sql.indexOf(";", close) + 1;
if (open < 0 || close < 0 || end <= 0) throw new Error(`${name}: unterminated body in ${file}`);
process.stdout.write(sql.slice(start, end) + "\n");
