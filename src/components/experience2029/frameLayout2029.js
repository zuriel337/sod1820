// The two layout decisions of the System Frame that decide whether a surface's content column moves when a context subject exists — kept as plain functions so the rule is in
// one place and can be tested without a browser (test/frame-rail-width-2029.test.mjs).
//
// Background. On a wide screen (>= 981px) the context rail is drawn inside the companion capsule at the left edge, not in the main stage. The main stage nevertheless used to mark
// itself `has-context-rail` whenever a subject existed, and that class reserves a grid column (286px + gap) for a rail that is not there. A surface that is entered without a
// subject and left with one (Home: the person opens a Post and comes back) was therefore laid out at one width on the first visit and at a narrower one on the return, and every
// height Home remembers (settled boxes are keyed to their width) was released. The capsule also opened from 56px to 340px after Home had mounted.

// Surfaces whose layout holds remembered heights keyed to the width they were measured at: their content width must not depend on whether a context subject exists.
const WIDTH_STABLE_SURFACES = new Set(["home"]);

/** Does the main stage reserve a grid column for the context rail? Only when a rail is drawn in the stage, and never on a width-stable surface whose rail lives in the capsule. */
export function stageReservesRail({ surface, showContextRail, companionActive, companionHasContext }) {
  if (!showContextRail) return false;
  if (WIDTH_STABLE_SURFACES.has(surface) && companionActive && companionHasContext) return false;
  return true;
}

/**
 * Should the companion capsule open by itself ("peek") for the current context subject? It does when a subject appears. On a width-stable surface a subject that was already in the
 * Research Context when the frame mounted is not new there (the person left the surface with it: a return restores the surface as it was left), so the capsule stays as it was
 * (slim, with its context indicator) and opens when the person opens it.
 */
export function autoPeekForSubject({ surface, companionHasContext, contextSubjectKey, inheritedSubjectKey }) {
  if (!companionHasContext || !contextSubjectKey) return false;
  return !(WIDTH_STABLE_SURFACES.has(surface) && contextSubjectKey === inheritedSubjectKey);
}
