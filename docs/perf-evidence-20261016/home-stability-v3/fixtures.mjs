// Corpus admission and safe miss reporting for the Home evidence runner (runner.mjs v4).
// The shared mechanism stays the only replay/isolation mechanism: scripts/ci-isolation/policy.cjs (run under run.mjs: frozenSnapshot with an
// exact SHA256, requestPolicy, browserArgs, installTransportBoundary, permitLocalServer) and snapshot-contract.cjs (decodeSnapshot: canonical
// Base64 bodies only). This module adds exactly two things the runner needs and neither changes that mechanism:
//   1. an image decodability check over the admitted corpus (a response that is not decodable image bytes is not an image: sample input rejected);
//   2. a safe digest of unmapped request identifiers (the full identifiers are written to a private file by the runner, never to the evidence).
import { createRequire } from 'node:module';
import crypto from 'node:crypto';
const require = createRequire(import.meta.url);
const { parseKey, imageWidth } = require('../../../scripts/ci-isolation/snapshot-contract.cjs');

const IMAGE_PATH = /\.(?:jpe?g|png|gif|webp|avif|heic|ico|bmp|svg)$/i;
const startsWith = (bytes, ...signature) => signature.every((byte, i) => bytes[i] === byte);
const ascii = (bytes, from, to) => Buffer.from(bytes.subarray(from, to)).toString('latin1');

export function isImageEntry(key, row) {
  const type = String(row?.type || '').toLowerCase();
  if (type.startsWith('image/')) return true;
  let pathname = '';
  try { pathname = parseKey(key).url.pathname; } catch { return false; }
  return IMAGE_PATH.test(pathname) || /\/storage\/v1\/render\/image\//.test(pathname);
}

// null = the bytes look like a decodable image; otherwise the reason. Header-level checks (no re-encoding, no pixel decode); the page-level
// check in the runner (naturalWidth) is the final gate for what Chromium actually decodes.
export function imageProblem(bytes) {
  if (!bytes || !bytes.length) return 'empty-body';
  // U+FFFD encoded as UTF-8 (EF BF BD) where a signature byte belongs: the body went through a text conversion.
  if (ascii(bytes, 0, 16).includes('ï¿½')) return 'utf8-replacement-characters';
  if (startsWith(bytes, 0xff, 0xd8, 0xff)) return Number.isInteger(imageWidth(bytes)) && imageWidth(bytes) > 0 ? null : 'jpeg-header';
  if (startsWith(bytes, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return bytes.length >= 24 && ascii(bytes, 12, 16) === 'IHDR' && bytes.readUInt32BE(16) > 0 ? null : 'png-header';
  if (ascii(bytes, 0, 6) === 'GIF87a' || ascii(bytes, 0, 6) === 'GIF89a') return null;
  if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 12) === 'WEBP') return null;
  if (ascii(bytes, 4, 8) === 'ftyp') return null;
  if (startsWith(bytes, 0x00, 0x00, 0x01, 0x00) || ascii(bytes, 0, 2) === 'BM') return null;
  const head = ascii(bytes, 0, 512).trimStart().toLowerCase();
  if ((head.startsWith('<svg') || head.startsWith('<?xml')) && ascii(bytes, 0, Math.min(bytes.length, 4096)).toLowerCase().includes('<svg')) return null;
  return 'unknown-signature';
}

// Safe description of a request identifier: method, host, path and query parameter NAMES only (no values, no body).
export function requestShape(key) {
  const match = /^(GET|HEAD|POST|OPTIONS) (https?:\/\/\S+)/.exec(String(key));
  if (!match) return 'unparsed';
  try {
    const url = new URL(match[2]);
    return `${match[1]} ${url.host}${url.pathname}${[...new Set([...url.searchParams.keys()])].sort().length ? `?${[...new Set([...url.searchParams.keys()])].sort().join('&')}` : ''}`;
  } catch { return 'unparsed'; }
}

// Over a snapshot that already passed decodeSnapshot (canonical Base64). Returns the images checked and every problem by safe shape.
export function corpusImageReport(data) {
  const problems = []; let images = 0;
  for (const [key, row] of Object.entries(data)) {
    if (!isImageEntry(key, row)) continue;
    images++;
    const reason = imageProblem(Buffer.from(row.body, 'base64'));
    if (reason) problems.push({ shape: requestShape(key), status: row.status, reason });
  }
  return { images, problems };
}

export function admitCorpus(data) {
  const report = corpusImageReport(data);
  if (report.problems.length) {
    const error = new Error(`BLOCKED: ${report.problems.length} of ${report.images} image responses in the corpus are not decodable (${[...new Set(report.problems.map(p => p.reason))].join(', ')}); a performance sample on this input is not accepted`);
    error.code = 'CORPUS_IMAGES_NOT_DECODABLE'; error.report = report; throw error;
  }
  return report;
}

// What the evidence may carry about unmapped requests: a count, a digest of the full identifiers, and their shapes. The identifiers
// themselves stay in the private file written by the runner.
export function missDigest(keys) {
  const unique = [...new Set(keys)].sort();
  const shapes = {};
  for (const key of unique) { const shape = requestShape(key); shapes[shape] = (shapes[shape] || 0) + 1; }
  return { count: unique.length, sha256: crypto.createHash('sha256').update(JSON.stringify(unique)).digest('hex'), shapes: Object.entries(shapes).map(([shape, n]) => ({ shape, n })) };
}
