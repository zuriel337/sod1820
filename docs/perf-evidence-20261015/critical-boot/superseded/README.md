# Superseded diagnostics — not acceptance evidence

The first head-scheduled run (42 contexts) and the interrupted first
bootstrap-scheduled run are retained, including slow samples. Their route
handler awaited `page.evaluate(performance.now)` before returning each replay
response. A busy renderer could therefore delay the response itself and feed
client CPU work back into the modeled API latency. One anomalous next-navigation
sample exposed this coupling. These timing results are **not used for acceptance**.

The corrected harness timestamps on the Node host and converts to the document's
`performance.timeOrigin` afterward. It never waits for renderer JS while serving
a fixture. It also computes next-navigation latency from the recorded trusted
click to the first ready marker, retaining Playwright tool latency separately.
The complete corrected seven-pair matrix uses the same immutable response union.

Head-scheduled preparation was abandoned because it competes with the entry
download before the gate can even start. The only candidate evaluated for final
acceptance starts after scheduling the normal root render (`6d649f48`).
