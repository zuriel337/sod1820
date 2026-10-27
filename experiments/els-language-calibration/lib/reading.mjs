// A cached reader of surfaces: whole-surface readings come from the product's own reader (unmodified). `mode` decides how a surface without a whole reading is scored:
//   tile3 (EXP-11 / EXP-13 primary): share of letters covered by up to three recognized tokens of 3+ letters (surfaces of 6+ letters)
//   tile2 (EXP-13 amendment 1):      the same with up to two tokens
//   whole (EXP-13 amendment 1):      no tiling, a surface without a whole reading scores 0
import { parseCoverage } from "./ranking.mjs";

export const READ_MODES = Object.freeze({ tile3: 3, tile2: 2, whole: 0 });

export function makeReadInfo({ reader, lexicon, hints, mode = "tile3", rawCache = new Map() }) {
  if (!(mode in READ_MODES)) throw new Error(`unknown read mode: ${mode}`);
  const maxTokens = READ_MODES[mode];
  const info = new Map();
  const raw = (surface) => { let value = rawCache.get(surface); if (!value) { value = reader.readSurface(surface, hints, lexicon); rawCache.set(surface, value); } return value; };
  const read = (surface) => {
    let value = info.get(surface);
    if (value) return value;
    const list = raw(surface);
    if (list.length) value = { readScore: 1, lexConf: Number(list[0].lexicalConfidence) || 0, bases: [...new Set(list.map((r) => r.baseTerm))] };
    else if (maxTokens > 0 && [...surface].length >= 6) value = { readScore: parseCoverage(surface, (sub) => raw(sub).length > 0, maxTokens), lexConf: 0, bases: [] };
    else value = { readScore: 0, lexConf: 0, bases: [] };
    info.set(surface, value);
    return value;
  };
  read.cacheSize = () => info.size;
  read.mode = mode;
  return read;
}
