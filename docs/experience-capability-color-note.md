# Experience Color Authority — clarification

SOD1820 does not currently have one exhaustive site-wide hex registry that truthfully describes every legacy surface. The authoritative forward design is split intentionally by scope:

- `SOD1820_DESIGN_CONTRACT_V1.md` — semantic design law and forward reference surfaces.
- `src/theme.js` / `src/lib/palette.js` — canonical-forward theme and palette primitives.
- `src/lib/chromeTheme.js` — scoped Navbar/Footer chrome colors.
- `src/lib/worlds.js` — domain/world classification colors, not theme colors.
- `admin_command_theme_law v2` + `docs/admin-command-blue-slice-v1.md` — internal admin/Command Room reference colors.

Known legacy/isolated surfaces may keep their own colors until their redesign pass. Their existence must not be mistaken for a new canonical palette.

Do not freeze a guessed single global hex table while known legacy drift remains. Prefer semantic role + canonical owner + explicit scoped exceptions.
