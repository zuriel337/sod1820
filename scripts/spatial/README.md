# scene.v1 → Blender bridge (M2)

Blender, `.blend` and GLB are **derived projections** of the compiled `scene.v1` (owner: `experience_governance_foundation_v1_law` v8 + `SOD1820_DESIGN_CONTRACT_V1.md` + `spatial_research_runtime_vision_v1`). No new system, owner or store.

- `src/lib/spatial/sceneExport.js` — renderer-neutral export (`sod1820.scene.v1.export/1`): the full scene, a derived `display` payload (via `resolveSceneTraceValue`, never inside identity), an optional projection-only camera rig, and `parity_reference` (JS resolver output).
- `scripts/spatial/export-scene-v1.mjs` — CLI: `--trace <trace.json> [--camera] [--out f]`, `--compare <export.json> <blender-parity.json>`.
- `scripts/spatial/scene_v1_to_blender.py` — importer + parity exporter + still render + optional derived GLB. Runs under `blender -b -P … -- --scene … --parity …` or with the `bpy` module (`SOD_BPY_PYTHON=<python with bpy> npm run test:spatial-scene-v1`).
- Coordinates are used raw (y-up). Rotation is `R = Rx*Ry*Rz` (Blender's `XYZ` Euler is `Rz*Ry*Rx`, so local matrices are built explicitly), `local = T*R*S`, `world = parent*local`. Parity tolerance is explicit (float32 in Blender): see `BLENDER_PARITY_TOLERANCE`.

## Next consumers
- **M3** — canonical Hebrew glyph/vector asset root: nodes gain `asset_ref`; the importer already copies `asset_ref` to the `sod_asset_ref` custom prop and is where an asset mesh replaces the placeholder box. No font-baked Hebrew is allowed in M2.
- **Journey / Video** — a Journey step consumes the same export JSON (camera rig → keyframes on the projection camera) and renders headless; it never reads Blender as truth.
