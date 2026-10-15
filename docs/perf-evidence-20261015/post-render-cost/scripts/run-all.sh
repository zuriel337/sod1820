cd /tmp/claude-0/pm
F=/tmp/claude-0/post-fixtures.json.gz
SH=/post/seventh-to-tenth-sefirot-2027; RI=/post/chibur-bein-hasafot-mafteach-lagan; FL=/post/flydubai-fz1073-363-14000-remzei-geula; MD=/post/mah-kore-mokesh-har-naftali
for round in 1 2 3; do
  case $round in 2) O="fix base";; *) O="base fix";; esac
  for v in $O; do
    D=/tmp/claude-0/post-dist-$v
    for p in $SH $RI $FL $MD; do node pm-scroll.mjs $D $F $p 3 >> /tmp/claude-0/pm-out/scroll-$v.txt 2>&1; done
    node post-measure.mjs --dist $D --fixtures $F --scen back --a $SH --b $RI --runs 5 --label $v-r$round-short-to-rich --out /tmp/claude-0/pm-out/$v-r$round-short-to-rich.json >> /tmp/claude-0/pm-out/log-$v.txt 2>&1
    node post-measure.mjs --dist $D --fixtures $F --scen back --a $SH --b $FL --runs 5 --label $v-r$round-short-to-flydubai --out /tmp/claude-0/pm-out/$v-r$round-short-to-flydubai.json >> /tmp/claude-0/pm-out/log-$v.txt 2>&1
    node post-measure.mjs --dist $D --fixtures $F --scen entry --a $RI --runs 5 --label $v-r$round-entry-rich --out /tmp/claude-0/pm-out/$v-r$round-entry-rich.json >> /tmp/claude-0/pm-out/log-$v.txt 2>&1
    node post-measure.mjs --dist $D --fixtures $F --scen entry --a $SH --runs 5 --label $v-r$round-entry-short --out /tmp/claude-0/pm-out/$v-r$round-entry-short.json >> /tmp/claude-0/pm-out/log-$v.txt 2>&1
  done
done
echo ALLDONE > /tmp/claude-0/pm-out/done
