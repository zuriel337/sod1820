#!/bin/bash
# build a worktree with the production public-reading build and the production client ids (read-only; no deployment)
set -e
cd "$1"
VITE_GA_ID=G-V3H3E20FLY VITE_META_PIXEL_ID=992562036849823 VITE_ADSENSE_CLIENT=ca-pub-9535875486398314 VITE_ADSENSE_SLOT_POST=8848193731 VITE_ADSENSE_SLOT_LIST=9276460760 node scripts/build-public-reading-production.mjs > build.log 2>&1 || { tail -n 20 build.log; exit 1; }
ls -la public-reading-deploy/dist/assets | grep -E " 2029-[A-Za-z0-9_-]+\.js$" | awk '{print $5, $9}'
