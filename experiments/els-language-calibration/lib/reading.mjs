// A cached reader of surfaces: whole-surface readings come from the product's own reader (unmodified); longer surfaces that have no whole reading are scored by
// the share of letters covered by up to three recognized tokens of 3+ letters (same definition as EXP-11).
import { parseCoverage } from "./ranking.mjs";

export function makeReadInfo({ reader, lexicon, hints }) {
  const readings = new Map();
  const info = new Map();
  const raw = (surface) => { let value = readings.get(surface); if (!value) { value = reader.readSurface(surface, hints, lexicon); readings.set(surface, value); } return value; };
  const read = (surface) => {
    let value = info.get(surface);
    if (value) return value;
    const list = raw(surface);
    if (list.length) value = { readScore: 1, lexConf: Number(list[0].lexicalConfidence) || 0, bases: [...new Set(list.map((r) => r.baseTerm))] };
    else if ([...surface].length >= 6) value = { readScore: parseCoverage(surface, (sub) => raw(sub).length > 0), lexConf: 0, bases: [] };
    else value = { readScore: 0, lexConf: 0, bases: [] };
    info.set(surface, value);
    return value;
  };
  read.cacheSize = () => info.size;
  return read;
}
