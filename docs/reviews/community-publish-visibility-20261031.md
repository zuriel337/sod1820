# Community successful publish visibility

Reported: after publishing a YouTube link, the UI said publication succeeded but showed no messages. The screenshot retained a different share URL in the local loaded-message search field.

Read-only live verification found the user's new Community root approved, nondeleted and nonhidden. The anonymous public `community_feed_page` endpoint returned HTTP 200 with 40 rows including that exact message. The post was saved; the retained exact text search excluded it. No product row was modified or replayed during diagnosis.

After a successful authenticated new root publication in the feed, clear the local query and reset the existing URL sort/source window to newest. Refresh through the existing public reader after React commits the view state, preserving its request ordering guard. A failed publish retains draft, search and sort. Replies and focused-thread contexts retain their existing parent and navigation behavior. Empty filtered results now explain that no search matches were found and provide an explicit clear-search action.

Verification uses the actual integrated build with intercepted synthetic Auth, publish and feed services. Reproduce different share tokens of the same YouTube video from newest, oldest and liked-over-oldest at 390/1440; check failure retention, success visibility and reload. Retain native video upload/like regression and reply-context cases. No live message, file, reaction or model writes. Source/integrated builds, public reader checks, scoped Node tests, graph/lazy, isolation, hardening and Legacy lock pass.

This extends isolated `gpt/community-auth-publish-media-20261031` from `378b4abf69ee4456fac3546cf86ec3150fb89bca`. Protected Preview exact commit evidence and release are in the task receipt/work log. No server permission, schema, main or Production change.
