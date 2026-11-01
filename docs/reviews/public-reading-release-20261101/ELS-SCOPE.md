# ELS scope and the remaining gate

The shared SystemFrame tool dock shifted the Raziel orb's x-position at320px
from159px in tool mode to136.016px in the global bar. Equal side columns and
wrapping labelled44px targets keep the same physical center. The original <1px
assertion was retained; labels/selectors were updated to the approved More →
Tools → Search and single contextual sidecar behavior. The shared test passed
320/390/1440 locally and in full CI.

Full CI c297584b, run41332073040, still failed:104/105, no skips in that executable
suite. `matrix toolbar is compact...` at test/els-native-ui-browser.test.mjs:84
failed the entire-selection/dock/cue clearance in1440/light. Final SQL step was
skipped after the failure. It is not a green ELS gate.

The exact widget is `.els29-manual-selection` in
src/components/experience2029/ElsNativeClassic2029.jsx:1653, conditional on an
active matrix and manual selection. PublicReadingBoundary in App2029 denies
`/code` and `/els` before mounting that reader. The profile closes lock_els for
all roles and never changes the shared lock_els=false used by Legacy.
The public profile uses the single global dock, not the matrix selection region.
Protected closed-route browser checks passed at390/1440; public Number rows open
full Number pages, not this matrix tool region or a Raziel dialog.

A git diff of SystemFrame, unified-bar CSS, ElsNativeClassic JSX/CSS and the native
test between c297584b and final4e6239c6 is empty. The remaining failure is therefore
retained as an ELS-opening prerequisite; no blanket test skip, threshold change,
production flag change or permission exemption was introduced.
