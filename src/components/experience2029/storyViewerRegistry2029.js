// Hand-over of the story viewer inside the Legacy build. Legacy carries ../StoryViewer.jsx statically (the Legacy-facing rail imports it) and
// registers it here at start-up, so the 2029 shell that Legacy also contains opens that same component without a second request and the
// Legacy chunk graph stays what it was. In the 2029 build nothing registers and the on-demand import is used instead.
let staticViewer = null;
export const registerStaticStoryViewer = (component) => { staticViewer = component; };
export const registeredStaticStoryViewer = () => staticViewer;
