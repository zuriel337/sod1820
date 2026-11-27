#!/usr/bin/env node
// The existing Torah corpus (tools/els/data/tk-letters.txt, the same text the engine embeds) as rows for the isolated QA database: public text, no personal data.
// Writes qa/corpus/torah.csv (idx is 1-based, as public.torah_stream expects). The first 304,805 letters are the Torah; the corpus id the engine and
// fn_els_corpus_id agree on is a fixed literal, so nothing here computes or invents an identity.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const TORAH_LETTERS = 304805;
const letters = readFileSync(root + 'tools/els/data/tk-letters.txt', 'utf8').trim();
if (letters.length < TORAH_LETTERS || /[^א-ת]/.test(letters)) throw new Error('corpus_unexpected');
const rows = [];
for (let i = 0; i < TORAH_LETTERS; i++) rows.push(`${i + 1},${letters[i]}`);
mkdirSync(root + 'qa/corpus', { recursive: true });
writeFileSync(root + 'qa/corpus/torah.csv', rows.join('\n') + '\n');
console.log(`qa corpus written: ${rows.length} Torah letters`);
