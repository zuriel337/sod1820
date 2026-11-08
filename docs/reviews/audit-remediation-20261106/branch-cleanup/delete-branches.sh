#!/usr/bin/env bash
# Deletes the 203 branches listed in deletion-manifest-20261107.tsv, ONLY if each one still points at the recorded tip.
# Run by the repository owner with credentials that may delete refs (the Claude cloud session's git proxy answers 403 to ref deletion).
# Dry run by default; pass --apply to delete. Restore any branch with:  git push origin <tip_sha>:refs/heads/<branch>
set -euo pipefail
APPLY=0; [ "${1:-}" = "--apply" ] && APPLY=1
cd "$(dirname "$0")"
REMOTE=${REMOTE:-origin}
ok=0; moved=0; gone=0
while IFS=$'\t' read -r branch sha rest; do
  [ "$branch" = "branch" ] && continue
  cur=$(git ls-remote --heads "$REMOTE" "refs/heads/$branch" | awk '{print $1}')
  if [ -z "$cur" ]; then echo "GONE   $branch"; gone=$((gone+1)); continue; fi
  if [ "$cur" != "$sha" ]; then echo "MOVED  $branch (now $cur, recorded $sha) - NOT deleting"; moved=$((moved+1)); continue; fi
  if [ $APPLY -eq 1 ]; then git push "$REMOTE" --delete "$branch" >/dev/null && echo "DELETED $branch"; else echo "WOULD DELETE $branch"; fi
  ok=$((ok+1))
done < deletion-manifest-20261107.tsv
echo "summary: eligible=$ok moved=$moved already_gone=$gone apply=$APPLY"
