# Admin / Command Blue Slice v1

Status: IMPLEMENTED ON BRANCH · NOT MERGED · NOT PRODUCTION

This slice applies the already-approved `admin_command_theme_law v2` to the existing `/admin` compatibility variables without creating a second theme system.

Reference values for the Command Room light surface:
- background: `#f6f7f9`
- surface: `#ffffff`
- system / interaction accent: `#2f6df6`
- stronger accent: `#1c4bbf`
- primary ink: `#1b1d22`
- secondary ink: `#5b6472`
- border family: blue-tinted, derived from `#2f6df6`

Dark mode preserves the canonical dark environment while translating the same system/interaction role to blue rather than default gold.

Scope of this slice:
- admin shell elements already consuming `--adm-*`
- KPI / tile / active-control compatibility variables
- Command Room legacy light literals in dark mode through the existing transitional bridge

Out of scope:
- individual styling inside all admin subtabs
- ELS iframe visuals
- Research Workspace redesign
- Heichal / immersive experiences
- legacy post surfaces

Forward rule: use semantic theme primitives directly in new admin components. `--adm-gold*` names are compatibility aliases only and do not mean gold is the approved default accent.
