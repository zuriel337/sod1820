# Shared selected-item Royal slot — boundary with #1477 and #1474

Implementation belongs to draft #1469. The active System Frame owns **placement and lifecycle**, not save/share/follow/discussion semantics. #1477 at `d726523c2973c90262e1dea395a203d2d61b23a6` and #1474 at `a157e6d7ac239388c62987e5975e3c5c92abe7cf` were read as decision/interface references; no cherry-pick or code import from them.

`use2029Shell().registerSelectedItemActions({ target, renderActions })` returns a lease-specific cleanup function. Register from the existing selected-card owner in an effect; return its cleanup. Use a memoized validated target and renderer; no new data reads are needed to place the row.

```jsx
const { registerSelectedItemActions } = use2029Shell();
useEffect(() => {
  if (!validatedTarget) return;
  return registerSelectedItemActions({
    target: validatedTarget,
    renderActions: ({ target, placement }) => renderExistingOwnerActions(target, placement),
  });
}, [registerSelectedItemActions, validatedTarget, renderExistingOwnerActions]);
```

`renderExistingOwnerActions` above is pseudocode for the owner's existing renderer, **not a new shipped component or capability**. The shell renders it in the selected World card (`placement="card"`) and inside the existing Here panel (`placement="here"`). The same target object is delivered unchanged to both. The slot has no fake/disabled placeholder actions when no renderer or stable `ref`/`href` exists. Replacing the selection, removing its owner, or changing the route clears the old projection; stale lease cleanup cannot remove a newer registration.

For a post/unit, #1477's owner calls `postActionTarget2029(projection, units, unitId)` with its verified post units and supplies the resulting object intact: `{ postId, unitId, ref, href, url, title, entity }`. The Shell does not parse a URL hash into a unit, convert a label into an edge, clone the entity, substitute `/world`, or reinterpret a post unit as a whole post. An unsupported/unauthorized target stays absent. For graph nodes/edges, the canonical World reader must first resolve the real identity and public return URL; a relation with no independent identity is not fabricated into a savable/commentable object.

Capability owners keep permission checks, guest sign-in/exact return, server ACK, retry/error state, canonical share drawer, comment draft target pinning, and follow delivery support. They supply only supported actions in the canonical order. A draft remains pinned in its own owner even if the selected World item changes. The shell does not introduce buttons to the permanent Dock, a second share sheet, or another Raziel session. Existing `contextLocked = authLoading || isAdmin !== true` is unchanged: **Here is not newly opened to the public**.

## Verified vs pending

Verified in a real Chromium fixture at 390/1440: real Shell and ResearchProvider; synthetic owner-validated node/edge/unit targets; a probe renderer; admin identity stub solely to exercise Here. Six card/Here pairs received the exact same target, including unit entity metadata. Changing selection, stale cleanup, explicit clear and route unmount were tested. See `selected-item-seam.json` and the committed fixture/build/browser scripts. No save/share/comment/follow request is performed by the probe.

**Still pending on a combined owner-approved head:** registering the real #1477 row from the World selected-object owner; resolving the canonical 78 ↔ salt-covenant edge and the exact Bennett unit through its reader; actual save/cloud ACK, single-share-sheet, shared-discussion and exact journey-return acceptance. These cannot be claimed from the probe. This branch supplies the concrete seam and does not take over #1477's or World reader ownership. #1474's outline/one-Raziel implementation remains separate; SurfaceContextRail and Post2029Page were not edited.
