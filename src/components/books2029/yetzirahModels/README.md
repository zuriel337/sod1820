# ספר יצירה — רכיבים לחיבור עתידי

Five source-bound React components; these files do **not** add a product route or integrate a reader. Import the required wrapper directly:

```jsx
import SynopticSealsModel2029 from './SynopticSealsModel2029.jsx';
// Also: GraSealsModel2029, TwelveBoundariesModel2029,
// FiveAgainstFiveModel2029, TenDepthsModel2029.
<SynopticSealsModel2029
  selectedId={selectedId}
  onSelect={(stableId, sourcePayload) => setSelectedId(stableId)}
  onOpenSource={payload => openExistingBookSource(payload)}
/>
```

`selectedId` accepts the existing qualified stable ID (recommended) or the component's local ID. Omit it for internal selection. A foreign ID selects nothing. `onSelect` emits the qualified original stable ID and the original source locator. Optional `sourceBundle={{structures,units}}` consumes the existing JSON assets without a fetch. Optional `reducedMotion` adds a host reduction request; it cannot override OS or `data-frame-reduced-motion="true"` reduction.

`onOpenSource` receives book/source identity, structure/component/relation IDs, original `{unit_id,pdf_page,source_ref,page_region,source_anchor}`, existing PDF URL, `verification:'not_tested'`, and `returnTo:{structureId,selectedId}`. Gra comparison links carry the comparison witness's identity/page while `returnTo` retains the active Gra selection. The host owns the existing source reader, focus return and any persistence across host unmount/navigation. Keep controlled selection while showing source. Without this callback, a normal external source-page link opens in another tab. No engine is needed to read the source.

GPU code and Three load only after the reader presses “פתח המחשה בתלת־ממד”. The source list, explanation, relationships and legend are available first and remain usable when GPU initialization fails or a context is lost. Closing cancels renderer frames, disposes geometry/material/texture/control resources and loses the native context. One explicitly started widget closes any other widget in this narrowly scoped family; this is not a shared application scene owner. Rotation is optional and off initially; reduction disables it. Keyboard users select the native list buttons with Tab/Enter/Space and close an open model with Escape; no canvas-only interaction is required.

Source order/letters/identities are projected from the delivered specifications; no map is rewritten. The cube, camera, distances, light, material and positions are explicit illustration decisions. Five-against-five has two source groups and a covenant identity, not eleven sefirot. Ten depths retain all ten names/five source pairs; only six directions/three pairs get spatial coordinates. No source-based length, letter-to-edge or finger-to-sefirah identity is invented. All verification values remain `not_tested`: rendering and interaction tests are not canonical engine verification.

The test-only fixture is `test/fixtures/yetzirah-models/index.html?model=<structure-key>`. It is neither a product reader nor a new reading surface. Browser acceptance checks source callbacks; final integration must additionally validate those callbacks against the existing host reader and its return/focus flow.
