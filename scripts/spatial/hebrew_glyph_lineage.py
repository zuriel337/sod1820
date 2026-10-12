"""Pure (bpy-free) Hebrew glyph lineage helpers shared by the Blender importer and tests.
Mirrors src/lib/spatial/hebrewGlyphAssets.js formula-for-formula (placement) and parses the canonical path-only SVG."""
import hashlib, json, os, re

ASSET_ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "src", "lib", "spatial", "hebrewGlyph", "v1")
BODY_SPAN = 800 - 212
_TOK = re.compile(r"[MLQZ]|-?\d+(?:\.\d+)?")


def load_manifest(root=ASSET_ROOT):
    with open(os.path.join(root, "manifest.v1.json"), encoding="utf-8") as f:
        return json.load(f)


def resolve_asset_ref(ref, manifest):
    """Fail-soft: None on unknown glyph / kind / lineage mismatch (caller keeps the placeholder)."""
    if not ref or ref.get("kind") != "hebrew_glyph_svg":
        return None
    g = next((x for x in manifest["glyphs"] if x["glyph_id"] == ref.get("glyph_id")), None)
    if not g or g["content_hash"] != ref.get("content_hash") or g["vector_version"] != ref.get("vector_version"):
        return None
    return g


def read_svg_path(glyph, root=ASSET_ROOT):
    """Returns (svg_bytes, d). Verifies the manifest content hash (lineage integrity)."""
    p = os.path.join(root, os.path.basename(glyph["vector_asset_ref"]))
    data = open(p, "rb").read()
    if "sha256:" + hashlib.sha256(data).hexdigest() != glyph["content_hash"]:
        raise ValueError("GLYPH_ASSET_HASH_MISMATCH " + glyph["glyph_id"])
    m = re.search(rb' d="([^"]*)"', data)
    return data, m.group(1).decode()


def parse_path(d):
    """M/L/Q/Z absolute path -> list of contours; each contour = list of ('L',(x,y)) / ('Q',(cx,cy),(x,y)) after a start point."""
    toks, i, contours, cur, pt = _TOK.findall(d), 0, [], None, None
    while i < len(toks):
        c = toks[i]; i += 1
        if c == "M":
            pt = (float(toks[i]), float(toks[i + 1])); i += 2; cur = {"start": pt, "segs": []}
        elif c == "L":
            pt = (float(toks[i]), float(toks[i + 1])); i += 2; cur["segs"].append(("L", pt))
        elif c == "Q":
            q = (float(toks[i]), float(toks[i + 1])); pt = (float(toks[i + 2]), float(toks[i + 3])); i += 4; cur["segs"].append(("Q", q, pt))
        elif c == "Z":
            contours.append(cur); cur = None
        else:
            raise ValueError("unsupported path token " + c)
    return contours


def flatten(contour, steps=8):
    """Deterministic polyline: quadratic -> fixed `steps` uniform samples."""
    pts, p0 = [contour["start"]], contour["start"]
    for seg in contour["segs"]:
        if seg[0] == "L":
            p0 = seg[1]; pts.append(p0)
        else:
            q, p1 = seg[1], seg[2]
            for k in range(1, steps + 1):
                t = k / steps; u = 1 - t
                pts.append((u * u * p0[0] + 2 * u * t * q[0] + t * t * p1[0], u * u * p0[1] + 2 * u * t * q[1] + t * t * p1[1]))
            p0 = p1
    if len(pts) > 1 and pts[0] == pts[-1]:
        pts.pop()
    return pts


def placement(bounds, glyph):
    adv, base = glyph["anchor"]["advance_width"], glyph["anchor"]["baseline_y"]
    scale = (0.6 * bounds["height"]) / BODY_SPAN
    if adv * scale > 0.95 * bounds["width"]:
        scale = (0.95 * bounds["width"]) / adv
    return {"scale": scale, "advance": adv, "baseline": base, "baselineLocalY": -0.3 * bounds["height"]}


def point_to_local(pl, x, y):
    return ((x - pl["advance"] / 2) * pl["scale"], (pl["baseline"] - y) * pl["scale"] + pl["baselineLocalY"])
