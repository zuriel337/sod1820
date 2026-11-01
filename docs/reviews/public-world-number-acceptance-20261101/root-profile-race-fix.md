# Hosted acceptance found and fixed a real Number race

The protected build of `097942b4e4b1374368f6703e6941a98ebf71f8a0` passed its
identity/protection/worker checks and the GitHub G4 and Research Sync workflows.
Its real mobile browser acceptance nevertheless failed: after opening a different
expression and going Back, the restored operand appeared before its canonical
profile. Clicking the large root number treated the unknown result as a reason
to clear focus, changing the address to bare `/number/1820`.

This was a product bug, not a failed public reader: the recorded public responses
were successful. That Preview is not final acceptance. The existing assertion
was kept; no extra wait was added to hide the missing operand.

The bounded fix keeps the root/result action busy until the profile needed to
preserve that identity is available. A second handler guard preserves the current
address if an unready activation is attempted. A failed profile stays unavailable,
does not claim zero methods, and offers an explicit retry through the same
canonical reader. There is no method substitution, extra automatic retry, new
engine, identity or permission change. Other numeric navigation and compact
callers keep their existing default behavior.

A deterministic replay holds the matching profile and makes the optional trace
unavailable. It fails against the exact old097 source: the root action is still
enabled during that window. The fixed client passes all17 Number browser tests,
including delayed profiles at390/1440, failure at390, preserved exact query and
operand, and explicit recovery through the real public canonical response.
The root/header geometry, row-to-full-page navigation, source grouping, Legacy
ordering, method values, direct old/native Post URLs and existing failure and
stale-navigation cases all remain tested.

The final protected Preview and GitHub results must use the new fix commit.
Earlier timing evidence is retained as checkpoint evidence; final measurements
are recorded separately. No Production or shared infrastructure was changed.
