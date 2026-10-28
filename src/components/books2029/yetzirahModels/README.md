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

## Seven additional mature sections

Direct wrapper imports in the same folder:

- `LetterFamiliesModel2029` — three families / PDF65.
- `PhoneticGroupsModel2029` — five articulation groups / PDF80.
- `MothersCorrespondencesModel2029` — three mothers, world/year/soul / PDF94–99.
- `SynopticDoublesModel2029` — seven synoptic doubles / PDF105–110.
- `GraDoublesModel2029` — seven independently bound Gra doubles, with separate complete comparison tables / PDF184–185.
- `StonesHousesModel2029` — six printed stones/houses rows / PDF111.
- `ThreeKingsModel2029` — three synoptic similes / PDF122; Chachmoni151 and Gra192 are separate unit-level context.

These seven delivered specifications prefer tables. The complete native table and original unit summary/companion are available before GPU start. Optional spatial tiles aid selection only; they assert no planetary orbit, anatomy, physical time/value axes, causal graph or house-shaped count. Only the mothers' two existing typed mediation relations receive connectors. Unknown/unmapped fields display an explicit absence rather than a value copied from another witness. Original reading caveats remain available in “גבולות הקריאה”.

For the doubles, a supplied bundle must also contain `readings` from `sefer-yetzirah.source-readings.json`; the default loader fetches this existing asset alongside structures/units. Completed direct-reading fields must match their exact structure/component reading ID, unit/page/anchor and source values. Source callbacks for those fields preserve their narrower original page region. Other catalogue fields use their own component's original locator.

Field-specific source callbacks add `fieldId` and `fieldKey` while keeping the original `componentId`. The deterministic `:field:<key>` suffix is a UI field address, not a new book entity. Context-unit callbacks have `componentId:null` and the original unit locator: they do not claim that a unit-level summary establishes a component mapping in another witness. `returnTo` always carries the active model and its current selection. Rows, comparison witnesses, context units and fields all open the host's existing source flow; none creates another reader or source iframe.

All seven are components awaiting integration, not currently navigable product pages. All engine verification values remain `not_tested`; the printed stones/houses counts are never presented as a newly executed permutation engine result. The source maps' historical acceptance statuses remain unchanged; the continuation handoff records current component/browser evidence separately.
