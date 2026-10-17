Output of `node replica.mjs <dump.json> <dist>` — dump of the real app at 390 × 844 (Back from a Post, every read failing, taken when the failure messages stood), CSS of the build at `c90bf0cd` (the stylesheets are unchanged at `4fb99138`). The page text is not committed.

| ancestors with `overflow: visible` forced | drift put back | CLS reported | |
|---|---|---|---|
| none (the shell as it is: html, body, #root = overflow-x: clip; .sod29-root = overflow-x: hidden) | -242 px | 0.2689 | counted |
| every element | -242 px | 0.0000 | nothing counted |
| html | -242 px | 0.2689 | counted |
| body | -242 px | 0.2689 | counted |
| html + body | -242 px | 0.2689 | counted |
| #root | -242 px | 0.2689 | counted |
| html + #root | -242 px | 0.2689 | counted |
| body + #root | -242 px | 0.2689 | counted |
| html + body + #root | -242 px | 0.2689 | counted |
| .sod29-root | -242 px | 0.2689 | counted |
| html + .sod29-root | -242 px | 0.2689 | counted |
| body + .sod29-root | -242 px | 0.2689 | counted |
| html + body + .sod29-root | -242 px | 0.2689 | counted |
| #root + .sod29-root | -242 px | 0.2689 | counted |
| html + #root + .sod29-root | -242 px | 0.0000 | nothing counted |
| body + #root + .sod29-root | -242 px | 0.0000 | nothing counted |
| html + body + #root + .sod29-root | -242 px | 0.0000 | nothing counted |

| all four visible, plus one inner clip | drift | CLS | |
|---|---|---|---|
| none (control) | -242 px | 0.0000 | nothing counted |
| .sod29-main overflow-x: clip | -242 px | 0.2689 | counted |
| .sod29-content overflow-x: clip | -242 px | 0.2689 | counted |
| .h29 overflow-x: clip | -242 px | 0.2689 | counted |
