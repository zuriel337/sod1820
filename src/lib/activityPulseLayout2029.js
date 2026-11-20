// Shared geometry for the lazy client strip and the first-document Post owner.
// The first paint reserves the exact same space; no network or data is needed.
export const ACTIVITY_PULSE_HEIGHT = 216;
export const ACTIVITY_PULSE_PLACEHOLDER = `<div style="height:${ACTIVITY_PULSE_HEIGHT}px;overflow:hidden" aria-hidden="true"></div>`;
