# "עכשיו · המרכז" — Royal 2029, review evidence (11.11.2026)

Screenshots for ZURIEL's design review of PR #1312 (branch `now-center-royal-v2`, base `main` `367bd62ee`). **Evidence only:** not a contract, and not approval to merge or deploy.

- **AFTER:** the branch's public build, with live data, on mobile (Pixel 7) and desktop (1440×900), in the dark, parchment and light themes.
- **BEFORE, mobile:** the live site, sod1820.co.il.
- **BEFORE, desktop:** a local build of `367bd62ee`, the source Production was serving. The live site returned "Access denied" to repeated loads from the session.
- `cmp-*`: BEFORE and AFTER side by side.
- `v3-*`: AFTER only.

Measured text contrast is at least 4.5:1 in all three themes; the minimum, 4.76, is in parchment. Not checked on a real device.
