#!/bin/bash
# After the final-tree series, on an otherwise idle machine and strictly one thing at a time:
# 1. final server A/B of api/og.js  2. narrow live baseline (Israel time zone)  3. budgets of every tree  4. repeat-visit check of C2 on top of the proposed tree
cd "$(dirname "$0")/.." || exit 1
export NODE_PATH=/usr/local/lib/node_modules_global
LOG=$PWD/data/ab8.log; : > $LOG
echo "OG-AB start $(date -u +%T)" >> $LOG; bash tools/og_ab_final.sh >> $LOG 2>&1; echo "OG-AB end $(date -u +%T)" >> $LOG
LOG=$LOG tools/run_ab2.sh live-il-cold
echo "BUDGETS start $(date -u +%T)" >> $LOG; bash tools/budgets.sh $PWD/wt-main $PWD/wt-a $PWD/wt-b $PWD/wt-c $PWD/wt-d $PWD/wt-fin $PWD/wt-c2 > data/budgets.txt 2>&1; echo "BUDGETS end $(date -u +%T)" >> $LOG
echo "BUILD wt-finc2 $(date -u +%T)" >> $LOG; bash tools/build_wt.sh $PWD/wt-finc2 >> $LOG 2>&1
LOG=$LOG tools/run_ab2.sh ret-rc-base-1 ret-rc-fin-1 ret-rc-c2-1 ret-rc-c2-2 ret-rc-fin-2 ret-rc-base-2
