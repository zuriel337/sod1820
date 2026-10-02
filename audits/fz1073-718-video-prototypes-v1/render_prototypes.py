#!/usr/bin/env python3
"""FZ1073 -> 718 video prototypes (A/B/C). Render-only projection; NO Gematria arithmetic.

Canonical values are INPUTS (engine-verified upstream), only displayed:
  718 = שביעי באוקטובר / חדשות / התשובה ; 1718 = כ״ב בתשרי תשפ״ד / י״ט בתשרי תשפ״ז

Pipeline: scene description (scene.v1 TRS convention: raw coords, R=Rx*Ry*Rz, local=T*R*S, camera looks down -Z)
 -> Blender (bpy 5.0.1, Cycles CPU) frames -> 2D Hebrew/brand overlay (PIL, system font) -> ffmpeg H.264.
3D objects are numeric / geometric only. Hebrew is a 2D overlay. Not a compiled scene.v1 (journey projection manifest).

Usage: python render_prototypes.py --work DIR --out DIR [--only A,B,C] [--samples N] [--stills-only]
Inputs in --work: plane.webp (decoded from source parts), lockup.jpg (approved brand reference)
"""
import argparse, hashlib, json, math, os, random, subprocess, sys
import bpy
from mathutils import Matrix, Vector
from PIL import Image, ImageDraw, ImageFont

W, H, FPS = 720, 1280, 30
SAFE = (60, 173, 612, 832)
GOLD = (0.9, 0.5, 0.08, 1.0)
GOLD8 = (212, 168, 64)
NAVY = (0.012, 0.025, 0.07, 1.0)
PLANE_CROP = (0, 105, 280, 325)  # plane band of the 280x608 derivative (excludes broadcast chyron)
HE_FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
LAT_FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

# ---- canonical display inputs (not computed) ----
PH718 = ["שביעי באוקטובר", "חדשות", "התשובה"]
D1718 = ["כ״ב בתשרי תשפ״ד", "י״ט בתשרי תשפ״ז"]


def ease(x):
    x = max(0.0, min(1.0, x))
    return x * x * (3 - 2 * x)


def track(keys, t):
    """keys: [(t, v)] smoothstep-interpolated; v scalar."""
    if t <= keys[0][0]: return keys[0][1]
    for (t0, v0), (t1, v1) in zip(keys, keys[1:]):
        if t <= t1:
            return v0 + (v1 - v0) * ease((t - t0) / (t1 - t0)) if t1 > t0 else v1
    return keys[-1][1]


def rot_xyz(a, b, c):  # scene.v1: R = Rx*Ry*Rz
    return Matrix.Rotation(a, 4, "X") @ Matrix.Rotation(b, 4, "Y") @ Matrix.Rotation(c, 4, "Z")


def local_matrix(p, r, s):
    return Matrix.Translation(p) @ rot_xyz(*r) @ Matrix.Diagonal((s, s, s, 1.0))


# ---------------- scene description ----------------
def V(*keys): return list(keys)

def node(id, kind, **kw):
    n = dict(id=id, kind=kind, px=[(0, 0)], py=[(0, 0)], pz=[(0, 0)], rx=[(0, 0)], ry=[(0, 0)], rz=[(0, 0)], s=[(0, 1)])
    n.update(kw); return n

def numeric(id, text, size=1.0, **kw): return node(id, "number", text=text, size=size, **kw)

def proto_A():
    T = 9.0
    nodes = [node("plate", "plate", w=3.6, pz=V((0, 0), (1.4, 0), (3.0, -4.5)), s=V((0, 1), (3.0, 1), (4.2, .0001)))]
    xs = {"10": -1.35, "7": 0.1, "3": 1.2}  # tight "1073" layout
    sep = {"10": -0.55, "7": 0.0, "3": 0.55}
    for k in ("10", "7", "3"):
        nodes.append(numeric("n" + k, k, 1.1, px=V((0, xs[k]), (3.0, xs[k]), (4.0, xs[k] + sep[k])),
                             py=[(0, .7)], s=V((2.2, 0.0001), (3.0, 1), (6.6, 1), (7.0, .0001))))
    for i, x in enumerate((-0.6, 0.65)):
        nodes.append(node(f"bar{i}", "bar", px=V((0, x * 2.1)), py=[(0, .7)], s=V((3.8, .0001), (4.4, 1), (6.6, 1), (7.0, .0001))))
    for i in range(7):
        nodes.append(node(f"ring{i}", "ring", r=2.0, pz=[(0, -2.0 - 2.2 * i)], py=[(0, .35)], s=V((3.2 + .15 * i, .0001), (3.9 + .15 * i, 1))))
    nodes.append(numeric("n1718", "1718", 1.0, pz=[(0, -16)], py=V((0, .7), (6.4, .7), (7.2, 1.3)), s=V((4.6, .0001), (5.4, 1), (6.4, 1), (7.2, .0001))))
    nodes.append(numeric("n718", "718", 1.3, pz=[(0, -24)], py=[(0, .7)], s=V((6.5, .0001), (7.3, 1))))
    cam = dict(pz=V((0, 4.6), (1.5, 4.0), (3.0, 5.6), (4.0, 5.6), (6.0, -9.5), (6.4, -9.5), (8.0, -17.5), (T, -17.8)))
    ov = [("cap", 3.2, 5.2, "FZ1073 → 10 | 7 | 3", 330), ("stack", 7.2, T, PH718, None)]
    return dict(id="A", name="NUMBER TUNNEL / PUSH", T=T, nodes=nodes, cam=cam, overlay=ov)

def panel(id, sx, **kw):
    return node(id, "panel", **kw)

def proto_B():
    T = 9.0
    nodes = []
    for sgn, nm in ((-1, "P1"), (1, "P2")):
        nodes.append(node(nm, "panel", px=V((0, sgn * 7.0), (2.6, sgn * 1.45), (4.2, sgn * 1.45), (5.2, 0)),
                          pz=V((0, -7.0), (2.6, 0.0), (4.2, 0.0), (5.2, -.4)), py=[(0, .35)],
                          ry=V((0, -sgn * 1.05), (2.6, -sgn * 0.3), (4.2, -sgn * .3), (5.2, 0)),
                          s=V((0, 1), (5.2, 1), (6.0, .0001))))
    nodes.append(node("portal", "ring", r=2.6, pz=[(0, 1.4)], py=[(0, .35)], s=V((5.0, .0001), (5.8, 1))))
    nodes.append(node("portal2", "ring", r=2.1, pz=[(0, 1.0)], py=[(0, .35)], s=V((5.1, .0001), (5.9, 1))))
    nodes.append(numeric("n1718", "1718", 1.0, pz=[(0, -1.0)], py=[(0, .7)], s=V((4.6, .0001), (5.4, 1), (5.9, 1), (6.4, .0001))))
    nodes.append(numeric("n718", "718", 1.3, pz=[(0, -9.0)], py=[(0, .7)], s=V((5.9, .0001), (6.6, 1))))
    cam = dict(pz=V((0, 6.2), (4.5, 4.9), (5.3, 4.9), (7.0, -3.2), (T, -3.4)))
    ov = [("lines", 3.0, 5.0, D1718, 250), ("stack", 7.3, T, PH718, None)]
    return dict(id="B", name="TWIN DATE PORTAL", T=T, nodes=nodes, cam=cam, overlay=ov)

def proto_C():
    T = 9.0
    M = {"m0": (0, 0, 0), "m1": (-2.4, 0, -9), "m2": (2.4, 0, -18), "m3": (0, 0, -27)}
    nodes = [node("plate", "plate", w=2.4, px=[(0, 0)], py=[(0, 0)], pz=[(0, 0)], s=V((0, 1), (1.6, 1), (2.6, .0001))),
             numeric("n1073", "1073", 1.0, py=[(0, .75)], pz=[(0, .6)], s=V((.3, .0001), (1.0, 1), (4.0, 1), (4.8, .0001)))]
    nodes.append(numeric("n1718a", "1718", 1.0, px=[(0, M["m1"][0])], py=[(0, .75)], pz=[(0, M["m1"][2])], s=V((2.2, .0001), (3.0, 1))))
    nodes.append(numeric("n1718b", "1718", 1.0, px=[(0, M["m2"][0])], py=[(0, .75)], pz=[(0, M["m2"][2])], s=V((4.4, .0001), (5.2, 1))))
    nodes.append(numeric("n718", "718", 1.3, px=[(0, 0)], py=[(0, .75)], pz=[(0, M["m3"][2])], s=V((6.4, .0001), (7.2, 1))))
    for k, (x, y, z) in M.items():
        nodes.append(node("ms_" + k, "ring", r=0.95, px=[(0, x)], py=[(0, y + .75)], pz=[(0, z)], s=V((0, .0001), (.6, 1))))
    # route beads: piecewise linear through milestones
    pts = list(M.values()); n = 36
    for i in range(n):
        u = (i + .5) / n * (len(pts) - 1); j = min(int(u), len(pts) - 2); f = u - j
        p = [pts[j][a] + (pts[j + 1][a] - pts[j][a]) * f for a in range(3)]
        nodes.append(node(f"bead{i}", "bead", px=[(0, p[0])], py=[(0, p[1] - .15)], pz=[(0, p[2] - 1.0)], s=V((0.2 + i * .05, .0001), (0.5 + i * .05, 1))))
    cam = dict(px=V((0, 0), (1.8, 0), (3.5, -1.0), (4.1, -1.0), (5.8, 1.0), (6.3, 1.0), (7.5, 0), (T, 0)),
               py=[(0, 0)],
               pz=V((0, 5.4), (1.8, 5.4), (3.5, -3.6), (4.1, -3.6), (5.8, -12.4), (6.3, -12.4), (7.6, -21.4), (T, -21.4)))
    tgt = dict(px=V((0, 0), (1.8, 0), (3.5, -2.4), (4.1, -2.4), (5.8, 2.4), (6.3, 2.4), (7.5, 0)),
               py=[(0, 0)], pz=V((0, -5), (1.8, -5), (3.5, -9), (4.1, -9), (5.8, -18), (6.3, -18), (7.6, -27)))
    ov = [("cap1", 3.3, 4.6, D1718[0], 330), ("cap1", 5.6, 6.8, D1718[1], 330), ("stack", 7.3, T, PH718, None)]
    return dict(id="C", name="FLIGHT PATH / MILESTONES", T=T, nodes=nodes, cam=cam, tgt=tgt, overlay=ov)

PROTOS = {"A": proto_A, "B": proto_B, "C": proto_C}


# ---------------- Blender ----------------
def mat_gold(name="gold", emit=0.5):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = GOLD; b.inputs["Metallic"].default_value = 0.9; b.inputs["Roughness"].default_value = 0.3
    b.inputs["Emission Color"].default_value = GOLD; b.inputs["Emission Strength"].default_value = emit
    return m

def mat_glass():
    m = bpy.data.materials.new("panel"); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (0.01, 0.025, 0.09, 1); b.inputs["Roughness"].default_value = 0.25
    b.inputs["Emission Color"].default_value = (0.04, 0.1, 0.4, 1); b.inputs["Emission Strength"].default_value = 0.12
    return m

def mat_plate(path):
    m = bpy.data.materials.new("plate"); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    tex = nt.nodes.new("ShaderNodeTexImage"); tex.image = bpy.data.images.load(path); tex.interpolation = "Cubic"
    em = nt.nodes.new("ShaderNodeEmission"); em.inputs["Strength"].default_value = 0.9
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    nt.links.new(tex.outputs["Color"], em.inputs["Color"]); nt.links.new(em.outputs["Emission"], out.inputs["Surface"])
    return m

def build(proto, plate_png):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"; sc.cycles.device = "CPU"
    sc.render.resolution_x, sc.render.resolution_y = W, H
    sc.render.image_settings.file_format = "PNG"
    w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True
    w.node_tree.nodes["Background"].inputs["Color"].default_value = NAVY
    w.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.2
    sc.view_settings.view_transform = "Standard"
    gold, glass = mat_gold(), mat_glass()
    objs = {}
    for n in proto["nodes"]:
        k = n["kind"]
        if k == "number":
            c = bpy.data.curves.new(n["id"], "FONT"); c.body = n["text"]; c.align_x = "CENTER"; c.align_y = "CENTER"
            c.size = n["size"]; c.extrude = 0.06 * n["size"]; c.bevel_depth = 0.012 * n["size"]
            o = bpy.data.objects.new(n["id"], c); o.data.materials.append(gold)
        elif k == "plate":
            bpy.ops.mesh.primitive_plane_add(size=1); o = bpy.context.active_object; o.name = n["id"]
            o.scale = (n["w"], n["w"] * 220 / 280, 1); bpy.ops.object.transform_apply(scale=True)
            o.data.materials.append(mat_plate(plate_png))
        elif k == "panel":
            bpy.ops.mesh.primitive_cube_add(size=1); o = bpy.context.active_object; o.name = n["id"]
            o.scale = (2.0, 2.8, 0.06); bpy.ops.object.transform_apply(scale=True); o.data.materials.append(glass)
            bpy.ops.mesh.primitive_cube_add(size=1); fr = bpy.context.active_object
            fr.scale = (2.12, 2.92, 0.04); fr.location = (0, 0, -0.05); bpy.ops.object.transform_apply(scale=True, location=True)
            fr.data.materials.append(gold); fr.parent = o
        elif k == "ring":
            bpy.ops.mesh.primitive_torus_add(major_radius=n["r"], minor_radius=0.025); o = bpy.context.active_object
            o.rotation_mode = "XYZ"; o.data.materials.append(gold)
        elif k == "bar":
            bpy.ops.mesh.primitive_cube_add(size=1); o = bpy.context.active_object; o.scale = (0.04, 0.95, 0.04)
            bpy.ops.object.transform_apply(scale=True); o.data.materials.append(gold)
        elif k == "bead":
            bpy.ops.mesh.primitive_uv_sphere_add(radius=0.05, segments=12, ring_count=8); o = bpy.context.active_object; o.data.materials.append(gold)
        o.name = n["id"]
        if o.name not in bpy.context.scene.collection.objects:
            bpy.context.scene.collection.objects.link(o)
        for u in list(o.users_collection):
            if u is not bpy.context.scene.collection: u.objects.unlink(o)
        objs[n["id"]] = o
    rnd = random.Random(1820)  # deterministic depth dust
    for i in range(70):
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.025, segments=8, ring_count=6)
        o = bpy.context.active_object; o.location = (rnd.uniform(-6, 6), rnd.uniform(-5, 5), rnd.uniform(-30, 4))
        o.data.materials.append(gold)
    for loc, e in (((0, 4, 6), 900), ((0, 3, -12), 1400), ((0, 3, -24), 1400)):
        ld = bpy.data.lights.new("l", "AREA"); ld.energy = e; ld.size = 6
        lo = bpy.data.objects.new("l", ld); lo.location = loc; lo.rotation_euler = (math.radians(-60), 0, 0)
        sc.collection.objects.link(lo)
    cd = bpy.data.cameras.new("cam"); cd.lens = 28; cd.sensor_width = 24; cd.sensor_fit = "HORIZONTAL"
    cam = bpy.data.objects.new("projection:camera", cd); sc.collection.objects.link(cam); sc.camera = cam
    return sc, objs, cam

def apply(proto, objs, cam, t):
    for n in proto["nodes"]:
        o = objs[n["id"]]
        p = (track(n["px"], t), track(n["py"], t), track(n["pz"], t))
        r = (track(n["rx"], t), track(n["ry"], t), track(n["rz"], t))
        s = track(n["s"], t)
        base = Matrix.Identity(4)
        o.matrix_world = local_matrix(p, r, s) @ base
    c = proto["cam"]
    cp = Vector((track(c.get("px", [(0, 0)]), t), track(c.get("py", [(0, 0)]), t), track(c["pz"], t)))
    if "tgt" in proto:
        g = proto["tgt"]; tg = Vector((track(g["px"], t), track(g["py"], t), track(g["pz"], t)))
    else:
        tg = cp + Vector((0, 0, -10))
    # y-up look-at (scene.v1 raw coords): camera looks down local -Z, local +Y toward world +Y
    zc = (cp - tg).normalized(); xc = Vector((0, 1, 0)).cross(zc).normalized(); yc = zc.cross(xc)
    m = Matrix(((xc.x, yc.x, zc.x, cp.x), (xc.y, yc.y, zc.y, cp.y), (xc.z, yc.z, zc.z, cp.z), (0, 0, 0, 1)))
    cam.matrix_world = m


# ---------------- 2D overlay ----------------
def he(s):  # Pillow (libraqm) performs the bidi shaping; keep logical order
    return s

def alpha_at(t, a, b, fade=0.35):
    return max(0.0, min(1.0, (t - a) / fade, (b - t) / fade if b < 1e8 else 1.0))

def text_c(d, y, s, font, fill):
    bb = d.textbbox((0, 0), s, font=font); x = (W - (bb[2] - bb[0])) // 2 - bb[0]
    x = max(SAFE[0], min(x, SAFE[2] - (bb[2] - bb[0]))); d.text((x, y), s, font=font, fill=fill)

def overlay(proto, t, logo, marker_font, fonts):
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    # logo (crown + Hebrew only), inside safe zone
    if logo is not None:
        a = int(255 * min(1, t / 0.6) * 0.92); l = logo.copy(); l.putalpha(l.getchannel("A").point(lambda v: v * a // 255))
        im.alpha_composite(l, ((W - l.width) // 2, SAFE[1] + 6))
    for kind, a, b, content, y in proto["overlay"]:
        k = alpha_at(t, a, b); 
        if k <= 0: continue
        if kind in ("cap", "cap1"):
            f = fonts[44] if kind == "cap1" else fonts["lat"]
            s = he(content) if kind == "cap1" else content
            text_c(d, y, s, f, GOLD8 + (int(255 * k),))
        elif kind == "lines":
            for i, s in enumerate(content):
                kk = alpha_at(t, a + .45 * i, b); text_c(d, y + 62 * i, he(s), fonts[44], GOLD8 + (int(255 * kk),))
        elif kind == "stack":
            step = (b - a) / 3.4
            for i, s in enumerate(content):
                kk = alpha_at(t, a + step * i, 1e9, 0.3)
                if kk > 0: text_c(d, 668 + 58 * i, he(s), fonts[46], (240, 228, 190, int(255 * kk)))
    d.rounded_rectangle((18, 18, 18 + 46, 18 + 38), 8, outline=GOLD8 + (200,), width=2)
    d.text((27, 24), proto["id"], font=marker_font, fill=GOLD8 + (230,))
    return im

def load_logo(path):
    im = Image.open(path).convert("RGB"); w, h = im.size
    c = im.crop((0, 0, w, int(h * 0.9))).convert("RGBA")  # crown + Hebrew line only (excludes KINGDOM RISE / domain)
    px = c.load()
    for y in range(c.height):  # black background -> alpha by luminance
        for x in range(c.width):
            r, g, b, _ = px[x, y]; px[x, y] = (r, g, b, min(255, max(r, g, b) * 4))
    c = c.resize((130, int(130 * c.height / c.width)), Image.LANCZOS)
    return c


def sha(p):
    h = hashlib.sha256(); h.update(open(p, "rb").read()); return h.hexdigest()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--work", required=True); ap.add_argument("--out", required=True)
    ap.add_argument("--only", default="A,B,C"); ap.add_argument("--samples", type=int, default=24)
    ap.add_argument("--stills-only", action="store_true")
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    assert bpy.app.version_string == "5.0.1", bpy.app.version_string
    plate_png = os.path.join(a.work, "plate_crop.png")
    Image.open(os.path.join(a.work, "plane.webp")).convert("RGB").crop(PLANE_CROP).save(plate_png)
    logo = load_logo(os.path.join(a.work, "lockup.jpg"))
    fonts = {44: ImageFont.truetype(HE_FONT, 44), 46: ImageFont.truetype(HE_FONT, 46), "lat": ImageFont.truetype(LAT_FONT, 34)}
    mf = ImageFont.truetype(LAT_FONT, 22)
    manifest = {"bpy": bpy.app.version_string, "resolution": [W, H], "fps": FPS, "safe_zone": SAFE, "prototypes": {}}
    for key in a.only.split(","):
        proto = PROTOS[key](); T = proto["T"]; N = int(T * FPS)
        sc, objs, cam = build(proto, plate_png); sc.cycles.samples = a.samples
        sc.cycles.use_denoising = True
        fdir = os.path.join(a.work, f"frames_{key}"); os.makedirs(fdir, exist_ok=True)
        stills_at = {int(x * FPS) for x in (T * .2, T * .45, T * .7, T * .95)}
        frames = sorted(stills_at) if a.stills_only else range(N)
        for i in frames:
            t = i / FPS; apply(proto, objs, cam, t)
            sc.render.filepath = os.path.join(fdir, f"{i:04d}_raw.png"); bpy.ops.render.render(write_still=True)
            base = Image.open(sc.render.filepath).convert("RGBA"); base.alpha_composite(overlay(proto, t, logo, mf, fonts))
            base.convert("RGB").save(os.path.join(fdir, f"{i:04d}.png")); os.remove(sc.render.filepath)
        rep = int(T * .72)
        if rep not in frames: rep = sorted(stills_at)[2]
        still = os.path.join(a.out, f"proto-{key}-still.png")
        Image.open(os.path.join(fdir, f"{rep:04d}.png")).save(still)
        entry = {"name": proto["name"], "duration_s": T, "frames": N, "still_frame": rep, "still": os.path.basename(still), "still_sha256": sha(still)}
        if not a.stills_only:
            mp4 = os.path.join(a.out, f"proto-{key}.mp4")
            subprocess.check_call(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS), "-i", os.path.join(fdir, "%04d.png"),
                                   "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", "-an", "-movflags", "+faststart", mp4])
            entry.update(mp4=os.path.basename(mp4), mp4_sha256=sha(mp4), mp4_bytes=os.path.getsize(mp4))
        manifest["prototypes"][key] = entry
    json.dump(manifest, open(os.path.join(a.out, "manifest.json"), "w"), indent=2, ensure_ascii=False)
    print(json.dumps(manifest, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    main()
