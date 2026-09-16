// Compatibility import path only.
// The single active 2029 frame implementation lives in SystemFrame2029.jsx.
// Keeping this filename avoids forking every existing 2029 surface while the
// implementation is replaced in-place under the canonical System Frame owner.
export { default } from "./SystemFrame2029.jsx";
export { use2029Shell, FrameState } from "./SystemFrame2029.jsx";
