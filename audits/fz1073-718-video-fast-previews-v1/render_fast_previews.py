"""FZ1073 718 FAST motion previews (A/B/C). Selection-only quality. bpy==5.0.1 Workbench.
Usage: python render_fast_previews.py [A|B|C ...]   (default all)
Content only: 1073 / 10|7|3 / 1718 / 718 and the two verified Hebrew date strings. No arithmetic.
"""
import base64, glob, io, math, os, subprocess, sys, shutil, tempfile
import bpy
from mathutils import Vector
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
SRC = os.path.join(REPO, "audits", "fz1073-718-video-prototypes-v1", "source")
W, H, FPS, SECS = 540, 960, 15, 4
NF = FPS * SECS
GOLD = (232, 190, 92)
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
TMP = tempfile.mkdtemp(prefix="fz1073fast_")

def heb(s):
    """Visual-order for RTL strings without raqm: reverse tokens, reverse Hebrew token chars."""
    out = []
    for t in s.split(" "):
        out.append(t[::-1] if any("֐" <= c <= "׿" for c in t) else t)
    return " ".join(reversed(out))

def load_plate():
    parts = sorted(glob.glob(os.path.join(SRC, "fz1073-plane-source.part*.txt")))
    raw = "".join(open(p).read().strip() for p in parts)
    data = base64.b64decode(raw)
    img = Image.open(io.BytesIO(data)).convert("RGB")
    return img

def text_tex(txt, name, size=220, w=1024, h=512, color=GOLD, rtl=False):
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    s = heb(txt) if rtl else txt
    f = ImageFont.truetype(FONT, size)
    while d.textlength(s, font=f) > w * 0.94 and size > 20:
        size -= 6; f = ImageFont.truetype(FONT, size)
    d.text((w / 2, h / 2), s, font=f, fill=color + (255,), anchor="mm")
    p = os.path.join(TMP, name + ".png"); img.save(p); return p

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = "BLENDER_WORKBENCH"
    sc.render.resolution_x, sc.render.resolution_y = W, H
    sc.render.resolution_percentage = 100
    sc.render.film_transparent = True
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_mode = "RGBA"
    sh = sc.display.shading
    sh.light = "FLAT"; sh.color_type = "TEXTURE"
    sc.view_settings.view_transform = "Standard"
    try: sc.display.render_aa = "5"
    except Exception: pass
    return sc

def mat_tex(path, name):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    t = nt.nodes.new("ShaderNodeTexImage"); t.image = bpy.data.images.load(path)
    b = nt.nodes.new("ShaderNodeBsdfPrincipled"); o = nt.nodes.new("ShaderNodeOutputMaterial")
    nt.links.new(t.outputs["Color"], b.inputs["Base Color"])
    nt.links.new(t.outputs["Alpha"], b.inputs["Alpha"])
    nt.links.new(b.outputs["BSDF"], o.inputs["Surface"])
    for a, v in (("blend_method", "BLEND"), ("surface_render_method", "BLENDED")):
        try: setattr(m, a, v)
        except Exception: pass
    return m

def mat_gold(name, rgb=(0.91, 0.74, 0.36)):
    m = bpy.data.materials.new(name); m.diffuse_color = rgb + (1,); return m

def plane(name, mat, w, h, loc, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_plane_add(size=1, location=loc, rotation=rot)
    o = bpy.context.object; o.name = name; o.scale = (w, h, 1); o.data.materials.append(mat); return o

def frame_obj(name, w, h, t, loc, mat):
    """Gold rectangular ring from 4 thin boxes (cheap tunnel segment)."""
    objs = []
    for dx, dy, sx, sy in ((0, h/2, w+t, t), (0, -h/2, w+t, t), (w/2, 0, t, h), (-w/2, 0, t, h)):
        bpy.ops.mesh.primitive_cube_add(size=1, location=(loc[0]+dx, loc[1]+dy, loc[2]))
        o = bpy.context.object; o.scale = (sx, sy, t); o.data.materials.append(mat); objs.append(o)
    return objs

def camera(sc, lens=38):
    bpy.ops.object.camera_add(); c = bpy.context.object; c.data.lens = lens
    c.data.sensor_fit = "HORIZONTAL"; c.data.sensor_width = 36
    sc.camera = c; return c

def ease(t): return t * t * (3 - 2 * t)

def key_all(sc):
    sc.frame_start, sc.frame_end = 1, NF
    sc.render.fps = FPS

# ---------------- scene builders: fn(f) animate via frame callback -----------------
def build_A(sc):
    gold = mat_gold("g")
    labels = [("1073", 0), ("1718", -14), ("718", -28)]
    for i, (txt, z) in enumerate(labels):
        m = mat_tex(text_tex(txt, "A_" + txt, 330, 1024, 512), "mA" + txt)
        plane("n" + txt, m, 5.2, 2.6, (0, 0, z))
    for k in range(0, 10):
        z = 4 - k * 3.3
        frame_obj("r%d" % k, 6.0, 8.6, 0.07, (0, 0, z), gold)
    cam = camera(sc)
    def anim(f):
        t = ease((f - 1) / (NF - 1))
        cam.location = (0, 0, 9 - 34.5 * t + 6 * 0)  # lands near 718 at z=-28 (+ standoff)
        cam.location.z = 9 - 34.5 * t
        cam.keyframe_insert("location", frame=f)
    return anim

def build_B(sc):
    gold = mat_gold("g")
    mL = mat_tex(text_tex("כ״ב בתשרי תשפ״ד = 1718", "B_L", 120, 1024, 300, rtl=True), "mL")
    mR = mat_tex(text_tex("י״ט בתשרי תשפ״ז = 1718", "B_R", 120, 1024, 300, rtl=True), "mR")
    m1718 = mat_tex(text_tex("1718", "B_1718", 340, 1024, 512), "m1718")
    m718 = mat_tex(text_tex("718", "B_718", 340, 1024, 512), "m718")
    L = plane("L", mL, 4.4, 1.3, (-5, 0, 0), (0, math.radians(35), 0))
    R = plane("R", mR, 4.4, 1.3, (5, 0, 0), (0, math.radians(-35), 0))
    P = plane("P1718", m1718, 3.6, 1.8, (0, 0, -3)); P.scale = (0.001, 0.001, 1)
    Q = plane("P718", m718, 4.4, 2.2, (0, 0, -9)); Q.scale = (0.001, 0.001, 1)
    frame_obj("fr", 4.6, 2.4, 0.06, (0, 0, -3.02), gold)
    cam = camera(sc); cam.location = (0, 0, 9)
    def anim(f):
        t = (f - 1) / (NF - 1)
        c = ease(min(1, t / 0.5))
        for o, s in ((L, -1), (R, 1)):
            o.location = (s * (5.0 - 3.6 * c), 0, 0 - 1.0 * c)
            o.keyframe_insert("location", frame=f)
            o.scale = (4.4, 1.3, 1) if t < 0.58 else (0.001, 0.001, 1)
            o.keyframe_insert("scale", frame=f)
        a = ease(max(0, min(1, (t - 0.45) / 0.15)))
        P.scale = (3.6 * a + 0.001, 1.8 * a + 0.001, 1); P.keyframe_insert("scale", frame=f)
        b = ease(max(0, min(1, (t - 0.72) / 0.2)))
        Q.scale = (4.4 * b + 0.001, 2.2 * b + 0.001, 1); Q.keyframe_insert("scale", frame=f)
        Q.location = (0, 0, -9 + 5.5 * b); Q.keyframe_insert("location", frame=f)
        P.location = (0, 2.4 * b, -3 - 1.0 * b); P.keyframe_insert("location", frame=f)
        P.scale = (P.scale[0] * (1 - 0.5 * b), P.scale[1] * (1 - 0.5 * b), 1); P.keyframe_insert("scale", frame=f)
        cam.location = (0, 0, 9 - 2.0 * t); cam.keyframe_insert("location", frame=f)
    return anim

def build_C(sc):
    gold = mat_gold("g")
    pts = [Vector(p) for p in ((-3, -2, 8), (-3, 0, 0), (3, 1.5, -10), (-1.5, 0, -20), (0, 0, -30))]
    bb = []
    miles = {"1073": pts[1], "1718": pts[2], "718": pts[3]}
    for txt, p in miles.items():
        m = mat_tex(text_tex(txt, "C_" + txt, 330, 1024, 512), "mC" + txt)
        bb.append(plane("n" + txt, m, 4.2, 2.1, p))
    # segmented route: gold markers along path
    def pos(t):
        n = len(pts) - 1; s = min(n - 1e-6, t * n); i = int(s); u = s - i
        a, b = pts[max(i - 1, 0)], pts[i]; c, d = pts[i + 1], pts[min(i + 2, n)]
        u2, u3 = u * u, u * u * u
        return 0.5 * ((2 * b) + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u2 + (-a + 3 * b - 3 * c + d) * u3)
    for k in range(0, 41):
        bpy.ops.mesh.primitive_cube_add(size=1, location=pos(k / 40)); o = bpy.context.object
        o.scale = (0.18, 0.18, 0.18) if k % 4 else (0.34, 0.34, 0.34); o.data.materials.append(gold)
    cam = camera(sc, 34)
    for o in bb:
        c = o.constraints.new("TRACK_TO"); c.target = cam; c.track_axis = "TRACK_Z"; c.up_axis = "UP_Y"
    tgt = bpy.data.objects.new("tgt", None); sc.collection.objects.link(tgt)
    con = cam.constraints.new("TRACK_TO"); con.target = tgt; con.track_axis = "TRACK_NEGATIVE_Z"; con.up_axis = "UP_Y"
    def anim(f):
        t = (f - 1) / (NF - 1)
        e = ease(t) * 0.97
        cam.location = pos(e) + Vector((0, 1.2, 12)) * (1 - 0.25 * t)
        cam.keyframe_insert("location", frame=f)
        tgt.location = pos(min(1, e + 0.12)); tgt.keyframe_insert("location", frame=f)
    return anim

BUILD = {"A": build_A, "B": build_B, "C": build_C}
# timing (fraction of clip) -> overlay caption
CAPS = {
    "A": [(0.0, "1073  →  10 | 7 | 3"), (0.3, "1718"), (0.62, "718")],
    "B": [(0.0, ""), (0.6, "1718"), (0.78, "718")],
    "C": [(0.0, "1073"), (0.36, "1718"), (0.7, "718")],
}
STILL = {"A": 0.45, "B": 0.9, "C": 0.55}
NAMES = {"A": "number-tunnel", "B": "twin-portals", "C": "flight-path"}

def bg_frame(plate, t):
    base = Image.new("RGB", (W, H), (6, 10, 24))
    d = ImageDraw.Draw(base)
    for y in range(H):  # cheap navy vignette gradient
        k = int(26 * (1 - abs(y / H - 0.5) * 2))
        d.line([(0, y), (W, y)], fill=(6, 10 + k // 2, 24 + k))
    a = max(0.0, 1.0 - t / 0.28)  # real plane plate at opening
    if a > 0:
        pl = plate.copy(); pw, ph = pl.size; s = max(W / pw, H / ph) * (1 + 0.06 * t)
        pl = pl.resize((int(pw * s), int(ph * s)), Image.BILINEAR)
        pl = pl.crop(((pl.width - W) // 2, (pl.height - H) // 2, (pl.width - W) // 2 + W, (pl.height - H) // 2 + H))
        base = Image.blend(base, pl, 0.85 * a)
    return base

def overlay(img, key, t):
    d = ImageDraw.Draw(img, "RGBA")
    cap = ""
    for t0, c in CAPS[key]:
        if t >= t0: cap = c
    if cap:
        f = ImageFont.truetype(FONT, 56 if len(cap) < 8 else 40)
        d.text((W / 2, H * 0.84), cap, font=f, fill=GOLD + (255,), anchor="mm")
    d.rectangle((W - 74, 40, W - 28, 84), outline=GOLD + (200,), width=2)
    d.text((W - 51, 62), key, font=ImageFont.truetype(FONT, 28), fill=GOLD + (230,), anchor="mm")
    return img

def run(key, plate):
    sc = reset(); key_all(sc)
    anim = BUILD[key](sc)
    fr = os.path.join(TMP, key); os.makedirs(fr, exist_ok=True)
    for f in range(1, NF + 1):
        anim(f)
    for f in range(1, NF + 1):
        sc.frame_set(f)
        sc.render.filepath = os.path.join(fr, "b%03d.png" % f)
        bpy.ops.render.render(write_still=True)
        t = (f - 1) / (NF - 1)
        bg = bg_frame(plate, t).convert("RGBA")
        bg.alpha_composite(Image.open(sc.render.filepath).convert("RGBA"))
        overlay(bg, key, t).convert("RGB").save(os.path.join(fr, "f%03d.png" % f))
    out = os.path.join(HERE, "fz1073-718-fast-%s-%s.mp4" % (key, NAMES[key]))
    subprocess.check_call(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS), "-i", os.path.join(fr, "f%03d.png"),
        "-vf", "fps=30", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "26", "-preset", "veryfast", "-an", out])
    still = os.path.join(HERE, "fz1073-718-fast-%s-still.png" % key)
    shutil.copy(os.path.join(fr, "f%03d.png" % int(NF * STILL[key])), still)
    return out, still

if __name__ == "__main__":
    keys = [a for a in sys.argv[1:] if a in BUILD] or ["A", "B", "C"]
    plate = load_plate()
    stills = []
    for k in keys:
        o, s = run(k, plate); stills.append(s); print(o)
    if len(keys) == 3:
        ims = [Image.open(s) for s in stills]
        sheet = Image.new("RGB", (W * 3 + 40, H + 20), (0, 0, 0))
        for i, im in enumerate(ims): sheet.paste(im, (10 + i * (W + 10), 10))
        sheet.save(os.path.join(HERE, "fz1073-718-fast-contact-sheet.png"))
    shutil.rmtree(TMP, ignore_errors=True)
