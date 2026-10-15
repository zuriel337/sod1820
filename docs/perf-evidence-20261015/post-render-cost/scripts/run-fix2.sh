cd /tmp/claude-0/pm; F=/tmp/claude-0/post-fixtures.json.gz; SH=/post/seventh-to-tenth-sefirot-2027; RI=/post/chibur-bein-hasafot-mafteach-lagan
for round in 1 2 3; do case $round in 2) O="fix2 base";; *) O="base fix2";; esac
 for v in $O; do D=/tmp/claude-0/post-dist-$v
  node post-measure.mjs --dist $D --fixtures $F --scen back --a $SH --b $RI --runs 5 --label $v-r$round --out /tmp/claude-0/pm-out/b2-$v-r$round-short-to-rich.json >> /tmp/claude-0/pm-out/b2-log-$v.txt 2>&1
  node pm-scroll.mjs $D $F $RI 3 >> /tmp/claude-0/pm-out/b2-scroll-$v.txt 2>&1
 done; done; echo ALLDONE > /tmp/claude-0/pm-out/done2
