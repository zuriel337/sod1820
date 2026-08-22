# Stage 3 — Bird's-Eye 3D Prototype

Dev-only. Not part of the app build, not wired into any route, not imported
by anything under `src/`.

## Run locally (no deploy, no server config change)

From the repo root:

```sh
npx vite --host 127.0.0.1 --port 5183
```

Then open:

```
http://127.0.0.1:5183/tools/roadmap-map/stage3/index.html
```

Vite's dev server serves any `.html` file in the repo, not only the app's
own `index.html`, so this works with zero changes to `vite.config.js`.
Stop the server (Ctrl-C) when done — nothing here affects the production
`npm run build` output.

## What it does

`RoadmapUniverse3D.jsx` imports `parseRoadmap()`/`summarizeCoverage()` from
`../roadmapParser.js` (Stage 1) directly, and the raw Roadmap markdown via
Vite's `?raw` import — same technique `src/components/admin/
RoadmapCommandCenter.jsx` already uses. It never parses markdown itself and
never invents a status/edge/world beyond what the view model already
contains. If the WebGL/viewport check fails, it falls back to an `<iframe>`
of the Stage 2 diagnostic (`../diagnostic.html`) instead of a broken screen.
