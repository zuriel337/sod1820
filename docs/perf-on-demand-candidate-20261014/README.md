# On-demand cold-path candidate — 14 Oct 2026

Assignment `acf32761-a661-488e-a13d-bb5b4ffb16ad` (`CLAUDE_2029_ON_DEMAND_CANDIDATE_20261014`), WRITE, branch-only. Base: PR1100 `5dd4afaacd9ead2fef5ff43d4c1adec4e4a0ed75`; main re-read at `12fea7a3`. Only this directory was written; shared application files were edited locally for the build measurement, then restored.

## Candidate
`contactgateway-lazy.proposed.patch` touches one shared file, `src/components/experience2029/SystemFrame2029.jsx`. The static `ContactGateway` import becomes `React.lazy`, loaded only when the "report a problem" panel opens.
- First-view layout and controls are unchanged.
- Loading state: `FrameState kind="loading"`.
- Failure state: `FrameState kind="error"` with a retry button. Retry recreates the lazy component, because `React.lazy` caches a rejected import.
- No cache and no verification claim. `NumberDrawer2029` was already lazy and is not touched.

## Build measurement (2029 target only, `vite build` after a legacy build, before vs after)
| Chunk | raw B | gzip B |
|---|---:|---:|
| `Sod2029Shell` | 234403 → 214065 (−20338) | 69696 → 63721 (−5975, −8.6%) |
| New `ContactGateway` chunk (on demand) | 0 → 21256 | 0 → 7026 |
| Entry `2029`, `Els2029Page`, `Heichal2029Page`, `Number2029Page` | within ±50 B | within ±26 B |
| Total 2029 JS | 3535583 → 3536648 | 1057086 → 1058165 |

The shell chunk is on the first-load path of every 2029 page. About 6 KB gzip leaves that path. This is static bytes only. It is not a time measurement, and it is not added to or compared with any other win. The raw before/after listings are `build2029-before.txt` and `build2029-after.txt`.

## NOT done (gaps)
- The seven cold-run fixture comparison, the real World marker, audited RPC parity, three themes and phone/desktop were not run. No capture fixtures or hosted access exist in this session. **Speed is not claimed.**
- Opening the panel and the failure/retry states were not exercised in a browser. Only the build was checked.
- A heavy gematria expansion was not made lazy. This candidate has no evidence for it, and `Number2029Page` chunks did not change.

## Ownership transfer required to apply
Exclusive write on `SystemFrame2029.jsx` from the active lanes (`SYSTEMFRAME_ONE_SHELL_WORLD_HOME_20261014`, `G4_SOURCE_SEQUENCE_FRAME_ADOPTION_V1_20261013`). Then run a browser check of the open, loading, failure and retry states, plus the 7-run cold comparison, before any adoption.

## Rollback
Delete this directory, or never apply the patch. No application file on this branch was changed.
