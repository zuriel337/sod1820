# F5 Candidate A — יושם בענף (task SOD1820_2029_F5_POST_MIDDLEWARE_APPLY_A_20261018)

בסיס מאומת `a8168558cd7de24d757594e09db07cdc8557ca09`. ללא PR/CI/merge/deploy.

## מה שונה
- `middleware-core.js`: `candidate-A.patch` + `request.method === 'GET'` בתוך `isHumanDocumentNavigation`; timeout של 800ms ל-`public_post_slug_exists`; הערות עודכנו. ‏TTL, `/:slug` הישן, matcher, `api/og.js`, `middleware.js` — ללא שינוי.
- `docs/2029-search-indexing-closure-map-v1.md`: תועד היושר — אדם לפוסט חסר = SPA 200 + noindex + "לא נמצא"; זחלן מוכר = 404; Legacy ללא שינוי.
- `test/post-middleware-f5-contract.test.mjs`: 18 בדיקות (קבוע, בלי מתג `F5_CANDIDATE`). ‏`candidate-A.patch` נשאר כמסמך מקור ואינו כולל את תנאי ה-GET.

## בדיקות
18/18 חוזה F5 · `scripts/test-route-legitimacy-2029.mjs` PASS · `middleware.test.js` 6/6 · edge-country strict/quarantine עוברים · `npm run build` הצליח.

## מדידת loopback (L=150ms, חציון, GET) — `results/loopback-before.json` מול `results/loopback-applied-A.json`
| תרחיש | לפני | אחרי |
|---|---|---|
| אדם, פוסט קיים, cache קר | 151.4ms, RPC 1 | **0.01ms, RPC 0** |
| אדם, פוסט חסר, cache קר | 151.7ms → 404 | 0.01ms → SPA (next) |
| Googlebot קיים / חסר | 152.3ms / 152.4ms → 404 | 152.0ms / 151.8ms → 404 |
| HEAD (כולל כותרות Sec-Fetch) חסר | 151.7ms → 404 | 150.9ms → 404 |
| Legacy `/:slug` קיים / חסר | 151.8 → 308 / 404 | 151.6 → 308 / 151.8 → 404 |
| Supabase תלוי | אדם ללא גבול; בוט ללא גבול | אדם 0.02ms; בוט **801ms** → fail-open |
| Supabase 500 / reset / JSON פגום (L=50) | אדם 51ms; בוט 51ms | אדם 0.01ms; בוט 51ms |
