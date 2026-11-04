# Browser acceptance environment

The first service check incorrectly expected a mailto link; the existing privacy page deliberately displays the contact address as text. That harness selector was corrected without changing the product.

A second navigation after SW activation returned403/Access denied with a page-only Chrome user-agent override. Repeating the same sequence with a consistent browser-process/page/worker Chrome user agent returned200 and mounted both Community and Privacy; product middleware/transport were unchanged. The prior raw headless run also returned403 before any worker/application loaded. These failures are retained as test-environment evidence, not classified as a repaired product bootstrap bug. The existing bot protection was not modified.

The final artifact3fc0 passed both real message/image viewports and Privacy, Journey, Research, Reveal and Experience navigation with realSW, zero JS errors and zero model requests/attempts. The protected sitemap returned200/no-store with/privacy included in15.122s in the separate header/XML check. This does NOT replace the two actual15s canary timeouts; no CDNHIT/Production canary pass is claimed.
