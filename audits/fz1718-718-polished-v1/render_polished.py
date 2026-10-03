"""FZ1718 -> 718 polished vertical (720x1280, 30fps, ~9s, silent H.264). bpy==5.0.1 Workbench + deterministic PIL overlay.
Story: two Hebrew date cards -> 1718 -> camera push through gold tunnel -> 718 -> three Hebrew equalities -> final 1718 -> 718.
Content only (canonically verified live via fn_ragil): כ"ב בתשרי תשפ"ד=1718, י"ט בתשרי תשפ"ז=1718,
שביעי באוקטובר=718, חדשות=718, התשובה=718. No arithmetic performed here.
Usage: python render_polished.py   (outputs next to this script)
"""
import math, os, subprocess, tempfile, shutil
import bpy
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
W, H, FPS, SECS = 720, 1280, 30, 9
NF = FPS * SECS
GOLD = (232, 190, 92)
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
TMP = tempfile.mkdtemp(prefix="fz1718_")

def heb(s):
    out = []
    for t in s.split(" "):
        out.append(t[::-1] if any("֐" <= c <= "׿" for c in t) else t)
    return " ".join(reversed(out))

def smooth(t): t = max(0.0, min(1.0, t)); return t * t * (3 - 2 * t)
def seg(t, a, b): return smooth((t - a) / (b - a))

def text_png(txt, name, size, w, h, rtl=False):
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
    s = heb(txt) if rtl else txt
    f = ImageFont.truetype(FONT, size)
    while d.textlength(s, font=f) > w * 0.92 and size > 20:
        size -= 4; f = ImageFont.truetype(FONT, size)
    d.text((w / 2, h / 2), s, font=f, fill=GOLD + (255,), anchor="mm")
    p = os.path.join(TMP, name + ".png"); img.save(p); return p

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

def plane(name, mat, w, h, loc):
    bpy.ops.mesh.primitive_plane_add(size=1, location=loc)
    o = bpy.context.object; o.name = name; o.scale = (w, h, 1); o.data.materials.append(mat); return o

def ring(w, h, t, z, mat):
    for dx, dy, sx, sy in ((0, h/2, w+t, t), (0, -h/2, w+t, t), (w/2, 0, t, h), (-w/2, 0, t, h)):
        bpy.ops.mesh.primitive_cube_add(size=1, location=(dx, dy, z))
        o = bpy.context.object; o.scale = (sx, sy, t); o.data.materials.append(mat)

def background():
    img = Image.new("RGB", (W, H)); px = img.load()
    top, bot = (6, 12, 30), (14, 28, 62)
    for y in range(H):
        k = y / (H - 1); c = tuple(int(top[i] + (bot[i] - top[i]) * k) for i in range(3))
        for x in range(W): px[x, y] = c
    return img

def overlay(t):
    """Deterministic 2D layer: Hebrew equalities (5.9-7.9s) and final card (8.0s+). Returns RGBA."""
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
    lines = ["שביעי באוקטובר = 718", "חדשות = 718", "התשובה = 718"]
    for i, s in enumerate(lines):
        a = seg(t, 5.9 + 0.7 * i, 6.3 + 0.7 * i) * (1 - seg(t, 7.9, 8.3))
        if a <= 0: continue
        f = ImageFont.truetype(FONT, 64)
        y = 470 + i * 150 + (1 - a) * 24
        d.text((W / 2, y), heb(s), font=f, fill=GOLD + (int(255 * a),), anchor="mm")
        d.line([(W * .3, y + 56), (W * .7, y + 56)], fill=GOLD + (int(110 * a),), width=2)
    a = seg(t, 8.2, 8.7)
    if a > 0:
        f = ImageFont.truetype(FONT, 104)
        d.text((W / 2, H / 2), "1718 → 718", font=f, fill=GOLD + (int(255 * a),), anchor="mm")
    return img

def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = "BLENDER_WORKBENCH"
    sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = W, H, 100
    sc.render.film_transparent = True
    sc.render.image_settings.file_format = "PNG"; sc.render.image_settings.color_mode = "RGBA"
    sh = sc.display.shading; sh.light = "FLAT"; sh.color_type = "TEXTURE"
    sc.view_settings.view_transform = "Standard"
    try: sc.display.render_aa = "8"
    except Exception: pass

    gold = bpy.data.materials.new("g"); gold.diffuse_color = (0.91, 0.74, 0.36, 1)
    top = plane("dateTop", mat_tex(text_png("כ״ב בתשרי תשפ״ד", "d1", 150, 1024, 300, rtl=True), "m1"), 5.0, 1.46, (0, 5, 0))
    bot = plane("dateBot", mat_tex(text_png("י״ט בתשרי תשפ״ז", "d2", 150, 1024, 300, rtl=True), "m2"), 5.0, 1.46, (0, -5, 0))
    n1718 = plane("n1718", mat_tex(text_png("1718", "n1", 340, 1024, 512), "m3"), 4.4, 2.2, (0, 0, 0))
    n718 = plane("n718", mat_tex(text_png("718", "n2", 340, 1024, 512), "m4"), 4.4, 2.2, (0, 0, -30))
    for k in range(1, 10): ring(4.6, 7.4, 0.06, -k * 3.0, gold)
    bpy.ops.object.camera_add(); cam = bpy.context.object; cam.data.lens = 38
    cam.data.sensor_fit = "HORIZONTAL"; cam.data.sensor_width = 36; sc.camera = cam

    bg = background(); frames = os.path.join(TMP, "f"); os.makedirs(frames)
    for f in range(NF):
        t = f / FPS
        conv = seg(t, 0.6, 2.4)
        top.location.y = 5 * (1 - conv) + 0.0; bot.location.y = -5 * (1 - conv)
        # dates merge to centre; hide as 1718 appears (no overlapping numerals)
        top.hide_render = bot.hide_render = t >= 2.4
        n1718.hide_render = t < 2.4 or cam.location.z < 3
        n1718.scale = (4.4 * (1 + 0.15 * (1 - seg(t, 2.4, 2.9))), 2.2 * (1 + 0.15 * (1 - seg(t, 2.4, 2.9))), 1)
        cam.location = (0, 0, 9 - 33 * seg(t, 2.9, 5.2) if t >= 2.9 else 9 - 0.3 * t / 2.9)
        cam.rotation_euler = (0, 0, 0)  # level
        n718.hide_render = t < 4.0  # no overlapping numerals before the reveal
        sc.render.filepath = os.path.join(frames, "r%04d.png" % f)
        bpy.ops.render.render(write_still=True)
        layer = Image.open(sc.render.filepath).convert("RGBA")
        scene_a = (1 - seg(t, 5.7, 6.1)) * seg(t, 0.2, 0.7)
        if scene_a < 1: layer.putalpha(layer.getchannel("A").point(lambda v: int(v * scene_a)))
        frame = bg.convert("RGBA"); frame.alpha_composite(layer); frame.alpha_composite(overlay(t))
        frame.convert("RGB").save(os.path.join(frames, "c%04d.png" % f))
    mp4 = os.path.join(HERE, "fz1718-718-polished-v1.mp4")
    subprocess.check_call(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS), "-i", os.path.join(frames, "c%04d.png"),
        "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "17", "-preset", "slow", "-movflags", "+faststart", mp4])
    shutil.copy(os.path.join(frames, "c%04d.png" % int(8.6 * FPS)), os.path.join(HERE, "fz1718-718-polished-v1-still.png"))
    shutil.copy(os.path.join(frames, "c%04d.png" % int(5.5 * FPS)), os.path.join(HERE, "fz1718-718-polished-v1-still-718-reveal.png"))
    shutil.rmtree(TMP, ignore_errors=True)

if __name__ == "__main__":
    main()
