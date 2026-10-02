"""scene.v1 -> Blender importer, parity exporter and still renderer (M2).

Blender/.blend/GLB are DERIVED PROJECTIONS of the exported scene.v1 JSON — never semantic SSOT. This module performs
NO Gematria/ELS/Mistater arithmetic: topology, identity refs, transforms, sockets and curve metadata come from the JSON;
display values (if any) come from the export's derived `display` payload.

Convention (scene.v1 SCENE_V1_TRANSFORM_CONVENTION): right-handed, rotation Euler radians with R = Rx*Ry*Rz,
local = T*R*S, world = parent.world*local. Scene coordinates are used RAW (y-up) so parity is exact; a cinematic
consumer may rotate the root. Blender's own 'XYZ' Euler is Rz*Ry*Rx, so local matrices are built explicitly here.

Usage (headless):
  blender -b -P scripts/spatial/scene_v1_to_blender.py -- --scene export.json --parity out.json [--render still.png] [--glb out.glb] [--blend out.blend]
  python scripts/spatial/scene_v1_to_blender.py --scene ...            (with the `bpy` module installed)
"""
import json
import math
import sys

import bpy
from mathutils import Matrix, Vector

PARITY_SCHEMA = "sod1820.scene.v1.blender-parity/1"
PROP_PREFIX = "sod_"


def _rot_xyz_matrix(a, b, c):
    # R = Rx * Ry * Rz (scene.v1 convention)
    return (Matrix.Rotation(a, 4, "X") @ Matrix.Rotation(b, 4, "Y") @ Matrix.Rotation(c, 4, "Z"))


def local_matrix(t):
    p, r, s = t["position"], t["rotation"], t["scale"]
    scale = Matrix.Diagonal((s["x"], s["y"], s["z"], 1.0))
    return Matrix.Translation((p["x"], p["y"], p["z"])) @ _rot_xyz_matrix(r["x"], r["y"], r["z"]) @ scale


def _set_props(obj, **props):
    for k, v in props.items():
        if v is None:
            continue
        obj[PROP_PREFIX + k] = json.dumps(v, ensure_ascii=False) if isinstance(v, (dict, list)) else v


def _material(name, rgba, emissive=0.0):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.diffuse_color = rgba
    mat["sod_role"] = "projection_only"
    return mat


def _letter_mesh(node, collection, materials):
    b = node.get("bounds") or {"width": 56, "height": 72, "depth": 14}
    bpy.ops.mesh.primitive_cube_add(size=1.0)
    obj = bpy.context.active_object
    obj.name = node["id"]
    obj.dimensions = (b["width"], b["height"], b["depth"])
    # bake nothing into the mesh beyond the unit placeholder: dimensions live in obj.scale of the MESH child, so the
    # node transform stays exactly the scene.v1 transform. Use a child mesh object.
    return obj


def import_scene(doc, clear=True):
    scene_json = doc["scene"]
    if clear:
        bpy.ops.wm.read_factory_settings(use_empty=True)
    coll = bpy.context.scene.collection
    mats = {
        "node": _material("sod_projection_node", (0.85, 0.7, 0.3, 1)),
        "connector": _material("sod_projection_connector", (0.3, 0.8, 0.9, 1)),
        "result": _material("sod_projection_result", (0.95, 0.4, 0.4, 1)),
    }
    objs = {}
    sockets = {}
    # 1) node empties carry the EXACT scene.v1 transform as matrix_basis (parent inverse = identity).
    for n in scene_json["nodes"]:
        e = bpy.data.objects.new(n["id"], None)
        e.empty_display_type = "PLAIN_AXES"
        e.empty_display_size = 6.0
        coll.objects.link(e)
        e.rotation_mode = "QUATERNION"
        objs[n["id"]] = e
        _set_props(
            e,
            scene_id=scene_json["scene_id"], projection_signature=scene_json["projection_signature"],
            node_id=n["id"], kind=n.get("kind"), identityRef=n.get("identityRef"),
            tracePath=(n.get("identityRef") or {}).get("tracePath"),
            asset_ref=n.get("asset_ref"),
        )
    for n in scene_json["nodes"]:
        e = objs[n["id"]]
        if n.get("parent"):
            e.parent = objs[n["parent"]]
            e.matrix_parent_inverse = Matrix.Identity(4)
        e.matrix_basis = local_matrix(n["transform"])
    # 2) projection geometry: placeholder mesh for letter anchors; result gets a marker; optional asset_ref left to M3.
    display = doc.get("display", {}).get("nodes", {})
    for n in scene_json["nodes"]:
        e = objs[n["id"]]
        if n.get("kind") in ("letter_anchor", "engine_result"):
            b = n.get("bounds") or {"width": 56, "height": 72, "depth": 14}
            me = bpy.data.meshes.new(n["id"] + ".mesh")
            hx, hy, hz = b["width"] / 2, b["height"] / 2, b["depth"] / 2
            verts = [(x, y, z) for x in (-hx, hx) for y in (-hy, hy) for z in (-hz, hz)]
            faces = [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)]
            me.from_pydata(verts, [], faces)
            me.update()
            m = bpy.data.objects.new(n["id"] + ".proj_mesh", me)
            coll.objects.link(m)
            m.parent = e
            m.matrix_parent_inverse = Matrix.Identity(4)
            m.data.materials.append(mats["result"] if n["kind"] == "engine_result" else mats["node"])
            _set_props(m, scene_id=scene_json["scene_id"], node_id=n["id"], role="projection_placeholder_mesh",
                       asset_ref=n.get("asset_ref"), display=display.get(n["id"]))
        for s in n.get("sockets", []):
            se = bpy.data.objects.new(s["id"], None)
            se.empty_display_type = "ARROWS"
            se.empty_display_size = 4.0
            coll.objects.link(se)
            se.parent = e
            se.matrix_parent_inverse = Matrix.Identity(4)
            se.location = (s["position"]["x"], s["position"]["y"], s["position"]["z"])
            sockets[s["id"]] = (se, Vector((s["normal"]["x"], s["normal"]["y"], s["normal"]["z"])))
            _set_props(se, scene_id=scene_json["scene_id"], node_id=n["id"], socket_id=s["id"], role=s.get("role"),
                       socket_normal_local=[s["normal"]["x"], s["normal"]["y"], s["normal"]["z"]])
    bpy.context.view_layer.update()
    # 3) connectors: one cubic Bezier per connector, endpoints/handles derived from socket world data + curve metadata.
    conn_objs = {}
    for c in scene_json["connectors"]:
        pts = connector_points(c, sockets)
        cu = bpy.data.curves.new(c["id"], "CURVE")
        cu.dimensions = "3D"
        cu.bevel_depth = 1.2
        sp = cu.splines.new("BEZIER")
        sp.bezier_points.add(1)
        a, b = sp.bezier_points
        a.co, a.handle_right, a.handle_left = pts[0], pts[1], pts[0]
        b.co, b.handle_left, b.handle_right = pts[3], pts[2], pts[3]
        for bp in (a, b):
            bp.handle_left_type = bp.handle_right_type = "FREE"
        co = bpy.data.objects.new(c["id"], cu)
        coll.objects.link(co)
        cu.materials.append(mats["connector"])
        _set_props(co, scene_id=scene_json["scene_id"], projection_signature=scene_json["projection_signature"],
                   connector_id=c["id"], identityRef=c.get("identityRef"),
                   tracePath=(c.get("identityRef") or {}).get("tracePath"),
                   display=doc.get("display", {}).get("connectors", {}).get(c["id"]))
        conn_objs[c["id"]] = co
    # 4) lights (projection-only) + camera rig
    ld = bpy.data.lights.new("sod_key_light", "SUN")
    ld.energy = 3.0
    lo = bpy.data.objects.new("sod_key_light", ld)
    lo.rotation_euler = (math.radians(40), math.radians(-20), 0)
    coll.objects.link(lo)
    lo["sod_role"] = "projection_only"
    rig = (doc.get("projection") or {}).get("camera")
    cam_obj = None
    if rig:
        cd = bpy.data.cameras.new("sod_camera")
        cd.lens = rig.get("lens_mm", 35)
        cd.clip_end = 100000
        cam_obj = bpy.data.objects.new(rig["id"], cd)
        coll.objects.link(cam_obj)
        cam_obj.rotation_mode = "QUATERNION"
        cam_obj.matrix_basis = local_matrix(rig["transform"])
        bpy.context.scene.camera = cam_obj
        _set_props(cam_obj, scene_id=scene_json["scene_id"], role="projection_camera")
    bpy.context.view_layer.update()
    return {"objs": objs, "sockets": sockets, "connectors": conn_objs, "camera": cam_obj, "scene": scene_json}


def connector_points(c, sockets):
    """P0/P3 = socket world positions; P1/P2 leave/enter along socket world normals by handle*|P3-P0|, lifted along
    curve.liftAxis by curve.lift. Geometry derivation only — identical formula to resolveSceneConnectorCurve()."""
    (e0, n0l), (e3, n3l) = sockets[c["from"]["socket"]], sockets[c["to"]["socket"]]
    p0, p3 = e0.matrix_world.translation.copy(), e3.matrix_world.translation.copy()
    n0, n3 = world_normal(e0, n0l), world_normal(e3, n3l)
    cv = c["curve"]
    h = (cv.get("handle") or 0) * (p3 - p0).length
    ax = cv.get("liftAxis") or {"y": 1}
    lift_v = Vector((ax.get("x", 0), ax.get("y", 0), ax.get("z", 0))) * (cv.get("lift") or 0)
    return [p0, p0 + n0 * h + lift_v, p3 + n3 * h + lift_v, p3]


def world_normal(obj, n_local):
    # inverse-transpose of the world upper 3x3 (stays perpendicular under non-uniform scale), normalized.
    m3 = obj.parent.matrix_world.to_3x3() if obj.parent else Matrix.Identity(3)
    return (m3.inverted().transposed() @ n_local).normalized()


def _flat(m):  # column-major 16
    return [round(m[r][c], 12) + 0.0 for c in range(4) for r in range(4)]


def export_parity(ctx):
    sj = ctx["scene"]
    out = {"schema": PARITY_SCHEMA, "scene_id": sj["scene_id"], "projection_signature": sj["projection_signature"],
           "blender_version": bpy.app.version_string, "blender_build_hash": bpy.app.build_hash.decode(),
           "nodes": {}, "sockets": {}, "connectors": {}}
    for nid, e in ctx["objs"].items():
        out["nodes"][nid] = {"world_matrix": _flat(e.matrix_world)}
    for sid, (se, nl) in ctx["sockets"].items():
        n = world_normal(se, nl)
        t = se.matrix_world.translation
        out["sockets"][sid] = {"node": se.parent.name, "position": {"x": t.x, "y": t.y, "z": t.z},
                               "normal": {"x": n.x, "y": n.y, "z": n.z}}
    for cid, co in ctx["connectors"].items():
        sp = co.data.splines[0]
        a, b = sp.bezier_points
        pts = [a.co, a.handle_right, b.handle_left, b.co]
        out["connectors"][cid] = {"points": [{"x": (co.matrix_world @ p).x, "y": (co.matrix_world @ p).y, "z": (co.matrix_world @ p).z} for p in pts]}
    if ctx["camera"] is not None:
        out["camera"] = {"world_matrix": _flat(ctx["camera"].matrix_world)}
    return out


def render_still(path, res=(960, 480)):
    sc = bpy.context.scene
    sc.render.engine = "BLENDER_WORKBENCH"
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.render.filepath = path
    sc.render.image_settings.file_format = "PNG"
    sc.display.shading.light = "STUDIO"
    sc.display.shading.color_type = "MATERIAL"
    sc.world = bpy.data.worlds.new("sod_world")
    sc.world.color = (0.05, 0.06, 0.1)
    bpy.ops.render.render(write_still=True)


def _parse(argv):
    a = {"scene": None, "parity": None, "render": None, "glb": None, "blend": None}
    i = 0
    while i < len(argv):
        k = argv[i].lstrip("-")
        if k in a and i + 1 < len(argv):
            a[k] = argv[i + 1]
            i += 2
        else:
            i += 1
    return a


def main(argv=None):
    argv = sys.argv[sys.argv.index("--") + 1:] if argv is None and "--" in sys.argv else (argv or sys.argv[1:])
    a = _parse(argv)
    with open(a["scene"], encoding="utf-8") as f:
        doc = json.load(f)
    ctx = import_scene(doc)
    if a["parity"]:
        with open(a["parity"], "w", encoding="utf-8") as f:
            json.dump(export_parity(ctx), f, indent=2, sort_keys=True)
            f.write("\n")
    if a["render"]:
        render_still(a["render"])
    if a["glb"]:  # DERIVED artifact only; carries scene_id/signature via custom props (extras)
        bpy.ops.export_scene.gltf(filepath=a["glb"], export_format="GLB", export_extras=True)
    if a["blend"]:
        bpy.ops.wm.save_as_mainfile(filepath=a["blend"])
    print("SCENE_V1_BLENDER_OK", bpy.app.version_string, doc["scene"]["scene_id"])


if __name__ == "__main__":
    main()
