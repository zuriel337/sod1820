#!/usr/bin/env python3
"""Hebrew glyph vector lineage generator (scene.v1 M3).

source glyph (font outline, read-only, never committed/embedded) -> normalized path-only SVG -> sha256.
Same input font + same GENERATOR_PROFILE => byte-identical output.

  python3 scripts/spatial/build_hebrew_glyph_assets.py --font api/_assets/heebo-800.ttf [--out src/lib/spatial/hebrewGlyph/v1] [--check]

Representation only: no numeric gematria/ELS data enters any artifact. Requires `fontTools` (generator only; runtime never does).
"""
import argparse, hashlib, json, os, sys
from fontTools.ttLib import TTFont
from fontTools.pens.basePen import BasePen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen

# 22 base letters + 5 finals, codepoint order (U+05D0..U+05EA). Final -> base linkage is explicit data, not inferred.
LETTERS = "אבגדהוזחטיכךלמםנןסעפףצץקרשת"
FINAL_BASE = {"ך": "כ", "ם": "מ", "ן": "נ", "ף": "פ", "ץ": "צ"}
PROFILE = {"profile_id": "hebrew-glyph-profile:v1-candidate-heebo-800", "vector_version": "v1",
           "em": 1000, "baseline_y": 800, "view_height": 1000, "y_axis": "down", "precision": 2,
           "path_commands": ["M", "L", "Q", "Z"], "quadratic_native": True}
SOURCE_REPO_PATH = "api/_assets/heebo-800.ttf"


def glyph_id(ch):
    return "heglyph:%04X" % ord(ch)


def fmt(v):
    s = ("%.*f" % (PROFILE["precision"], v)).rstrip("0").rstrip(".")
    return "0" if s in ("-0", "") else s


class PathOps(BasePen):
    """Emit absolute M/L/Q/Z in normalized units (TransformPen upstream). Cubics are not expected from glyf outlines."""
    def __init__(self, gs):
        super().__init__(gs); self.d = []
    def _p(self, pt): return "%s %s" % (fmt(pt[0]), fmt(pt[1]))
    def _moveTo(self, pt): self.d.append("M" + self._p(pt))
    def _lineTo(self, pt): self.d.append("L" + self._p(pt))
    def _qCurveToOne(self, p1, p2): self.d.append("Q" + self._p(p1) + " " + self._p(p2))
    def _curveToOne(self, *a): raise SystemExit("cubic outline segment not supported by profile v1 (glyf/quadratic only)")
    def _closePath(self): self.d.append("Z")
    def _endPath(self): raise SystemExit("open contour in glyph outline")


def build(font_path):
    font = TTFont(font_path)
    gs, cmap, upem = font.getGlyphSet(), font.getBestCmap(), font["head"].unitsPerEm
    k = PROFILE["em"] / upem
    mat = (k, 0, 0, -k, 0, PROFILE["baseline_y"])
    names = {n.nameID: n.toUnicode() for n in font["name"].names if n.platformID == 3}
    src_hash = hashlib.sha256(open(font_path, "rb").read()).hexdigest()
    files, glyphs = {}, []
    for slot, ch in enumerate(LETTERS):
        gname = cmap[ord(ch)]
        ops = PathOps(gs); gs[gname].draw(TransformPen(ops, mat))
        bp = BoundsPen(gs); gs[gname].draw(TransformPen(bp, mat))
        x0, y0, x1, y1 = bp.bounds
        w = gs[gname].width * k
        d = "".join(ops.d)
        svg = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %s %d" data-glyph-id="%s">'
               '<path d="%s"/></svg>\n') % (fmt(w), PROFILE["view_height"], glyph_id(ch), d)
        fname = "%s.svg" % glyph_id(ch).replace(":", "-")
        files[fname] = svg.encode("utf-8")
        base = FINAL_BASE.get(ch)
        glyphs.append({
            "glyph_id": glyph_id(ch), "codepoint": ch, "unicode": "U+%04X" % ord(ch),
            "is_final": base is not None, "base_codepoint": base, "base_glyph_id": glyph_id(base) if base else None,
            "vector_asset_ref": "hebrewGlyph/v1/" + fname, "vector_format": "svg-path", "vector_version": PROFILE["vector_version"],
            "viewBox": {"x": 0, "y": 0, "width": float(fmt(w)), "height": PROFILE["view_height"]},
            "bounds": {"minX": float(fmt(x0)), "minY": float(fmt(y0)), "maxX": float(fmt(x1)), "maxY": float(fmt(y1))},
            "anchor": {"baseline_y": PROFILE["baseline_y"], "origin": "left_baseline", "advance_width": float(fmt(w)), "direction": "rtl"},
            "content_hash": "sha256:" + hashlib.sha256(files[fname]).hexdigest(),
            "derived": {"msdf": None, "sdf": None, "glb_lod": []},
            "atlas": {"group": "hebrew-glyph-v1", "slot": slot, "batch_key": "hebrew-glyph-v1:" + glyph_id(ch), "corpus_instancing": "FUTURE_HOOK_ONLY"},
            "truth_tier": "REPRESENTATION",
            "visual_status": "CANDIDATE_NOT_VISUAL_CANONICAL",
        })
    manifest = {
        "schema": "sod1820.hebrew-glyph-manifest/1",
        "manifest_version": "v1",
        "owner": "experience_governance_foundation_v1_law v8 + SOD1820_DESIGN_CONTRACT_V1.md + spatial_research_runtime_vision_v1 (EXTEND_EXISTING; no new owner)",
        "identity_authority": "Unicode codepoint + LetterAnatomySpec identity; geometry is representation only",
        "truth_tier": "REPRESENTATION",
        "profile": PROFILE,
        "source": {"family": names.get(1), "font_file": SOURCE_REPO_PATH, "font_version": names.get(5), "copyright": names.get(0),
                   "license": "SIL Open Font License 1.1", "license_text_in_font": names.get(13), "license_url": names.get(14),
                   "upstream": "https://github.com/OdedEzer/heebo", "source_sha256": src_hash,
                   "font_committed_by_m3": False, "font_embedded_in_assets": False},
        "source_gate": {"status": "SOURCE_GAP", "visual_canonical": False,
                        "reason": "No Human-Gate-approved Hebrew visual glyph profile exists in the repo/design contract; heebo-800.ttf is a server-side asset and the design contract states the heavy Heebo treatment is not a canonical heading style. License/provenance are verifiable (OFL 1.1 in font name table) so this profile is a CANDIDATE only.",
                        "decision_owner": "ZURIEL (Human Gate)"},
        "glyphs": glyphs,
    }
    return manifest, files


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--font", required=True)
    ap.add_argument("--out", default=os.path.join(os.path.dirname(__file__), "..", "..", "src", "lib", "spatial", "hebrewGlyph", "v1"))
    ap.add_argument("--check", action="store_true", help="verify committed outputs are byte-identical instead of writing")
    a = ap.parse_args()
    manifest, files = build(a.font)
    mjson = (json.dumps(manifest, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
    mjs = ("// GENERATED by scripts/spatial/build_hebrew_glyph_assets.py — do not edit. Same data as manifest.v1.json.\n"
           "export default " + json.dumps(manifest, ensure_ascii=False, indent=2) + ";\n").encode("utf-8")
    outputs = {"manifest.v1.json": mjson, "manifest.v1.js": mjs, **files}
    bad = 0
    for name, data in outputs.items():
        p = os.path.join(a.out, name)
        if a.check:
            if not os.path.exists(p) or open(p, "rb").read() != data: print("DRIFT", name); bad += 1
        else:
            os.makedirs(a.out, exist_ok=True); open(p, "wb").write(data)
    print(("CHECK %s" % ("FAIL" if bad else "OK")) if a.check else "WROTE %d files to %s" % (len(outputs), a.out))
    sys.exit(1 if bad else 0)

if __name__ == "__main__":
    main()
