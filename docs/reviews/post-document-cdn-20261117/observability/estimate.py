import json
b=json.load(open('day_2026-11-16_basics.json')); H=json.load(open('heavy_hourly.json')); S=json.load(open('samples.json'))
N=b['N_day']; NT=sum(S['tail_hourly_N']); NH_tail=sum(S['human_tail_hourly_N'])
hits=lambda ser: sum(max(c-1,0) for c in ser)
occ=lambda d,k=24: k*(1-((k-1)/k)**d)            # expected occupied buckets if d requests fall uniformly at random in k buckets
pct=lambda a,n: f"{100*a/n:.1f}%"
out={}
# ---------- heavy paths (/community/chat, /) ----------
exact={(p,r):s for p,regs in H.items() for r,s in regs.items()}
ex_hits=sum(hits(s) for s in exact.values()); ex_N=sum(sum(s) for s in exact.values())
rest=[(p,r,d) for p,regs in b['heavy_pairs_day'].items() for r,d in regs.items() if (p,r) not in exact]
rN=sum(d for *_,d in rest); r_lo=sum(max(0,d-24) for *_,d in rest); r_hi=sum(d-1 for *_,d in rest); r_mid=sum(d-occ(d) for *_,d in rest)
# model check on exact pairs: actual occupied hours vs uniform model
chk=[(p,r,sum(s),sum(1 for c in s if c>0),round(occ(sum(s)),1)) for (p,r),s in exact.items() if sum(s)<400]
heavyN=ex_N+rN
print("HEAVY: pairs exact",len(exact),"N",ex_N,"hits",ex_hits," | other heavy pairs",len(rest),"N",rN,"hits lo/mid/hi",r_lo,round(r_mid),r_hi)
print("  occupancy model check (pair, d, actual hours, model hours):",[(p[:6],r,d,a,m) for p,r,d,a,m in chk])
heavy_mid=ex_hits+r_mid; heavy_lo=ex_hits+r_lo; heavy_hi=ex_hits+r_hi
print("  heavy hourly hits lo/mid/hi",heavy_lo,round(heavy_mid),heavy_hi,"of",heavyN,"=",pct(heavy_mid,heavyN))
# ---------- tail ----------
h12=S['h12_tail_c2plus']['cells']; h20=S['h20_tail_c2plus_partial']['cells']
t12=hits([c for c,_ in h12]); t20=hits([c for c,_ in h20])
t12h=hits([c for c,w in h12 if w=='human']); t20h=hits([c for c,w in h20 if w=='human'])
T=S['tail_hourly_N']; HT=S['human_tail_hourly_N']
r12=t12/T[12]; r20=t20/T[20]
busy=[10,11,20,21]; NT_busy=sum(T[i] for i in busy); NT_norm=NT-NT_busy
tail_lo=r12*NT; tail_strat=r12*NT_norm+r20*NT_busy
print(f"TAIL: N {NT}; hour12 exact hits {t12}/{T[12]} = {pct(t12,T[12])}; hour20 >= {t20}/{T[20]} = {pct(t20,T[20])} (partial)")
print(f"  day tail hits: hour-12 rate everywhere {tail_lo:.0f} ; stratified (h12 rate normal hours, h20 lower-bound rate for hours {busy}) {tail_strat:.0f}")
# ---------- overall hourly estimator ----------
lo=heavy_lo+tail_lo; mid=heavy_mid+tail_strat; hi=heavy_hi+tail_strat*1.25
print(f"OVERALL hourly-cell estimate (shared per-region cache): central {mid:.0f}/{N} = {pct(mid,N)}; band {lo:.0f}-{hi:.0f} = {pct(lo,N)}-{pct(hi,N)}")
strict_lo=heavy_lo+t12+t20
print(f"  strict lower bound (heavy exact+bounds, tail only the 2 sampled hours): {strict_lo} = {pct(strict_lo,N)}")
# ---------- 5-minute variant ----------
m5=lambda c: c-12*(1-(11/12)**c) if c>0 else 0
ex5_mid=sum(m5(c) for s in exact.values() for c in s); ex5_lo=sum(max(0,c-12) for s in exact.values() for c in s)
r5_mid=sum(d-occ(d,288) for *_,d in rest)
cle=S['cle1_chat_5min_h00_h07']; act5=hits(cle); mod5=sum(m5(c) for c in H['/community/chat']['cle1'][:8]); hr=hits(H['/community/chat']['cle1'][:8])
print(f"5MIN check cle1 /community/chat 00-08h: actual 5-min hits {act5}, uniform model {mod5:.0f}, hourly hits {hr}")
heavy5=ex5_mid+r5_mid
tail5_lo=0; tail5_hi=tail_strat
print(f"5MIN: heavy {heavy5:.0f} (lower bound {ex5_lo}); tail between 0 and {tail_strat:.0f}")
print(f"  overall 5-min: {heavy5:.0f}-{heavy5+tail_strat:.0f} of {N} = {pct(heavy5,N)}-{pct(heavy5+tail_strat,N)}; midpoint {pct(heavy5+tail_strat/2,N)}")
# ---------- human vs crawler (each population with its own cache) ----------
hum=S['human_heavy_day']; allp=b['heavy_pairs_day']
hum_heavy=0; hum_heavy_N=0
for p,regs in hum.items():
    for r,dh in regs.items():
        da=allp[p][r]; hum_heavy_N+=dh
        if (p,r) in exact and da-dh<=3: hum_heavy+=hits(exact[(p,r)])-(da-dh)/2   # nearly all human: exact minus half the non-human
        else: hum_heavy+=dh-occ(dh)
cr_heavy=0; cr_heavy_N=0
for p,regs in allp.items():
    for r,da in regs.items():
        dc=da-hum[p].get(r,0); cr_heavy_N+=dc
        if dc<=0: continue
        cr_heavy+= (hits(exact[(p,r)])-hum[p].get(r,0)*0 if False else dc-occ(dc))
NH=b['bot_day']['']; NC=N-NH
ht_lo=t12h/HT[12]*NH_tail; ht_hi=t20h/HT[20]*NH_tail
ct_N=NT-NH_tail; c12=(t12-t12h)/(T[12]-HT[12]); c20=(t20-t20h)/(T[20]-HT[20])
ct_lo=c12*ct_N; ct_hi=c20*ct_N
print(f"HUMAN (bot_name ''): N {NH}; heavy N {hum_heavy_N} hits~{hum_heavy:.0f}; tail N {NH_tail} hits {ht_lo:.0f}-{ht_hi:.0f} (h12 {t12h}/{HT[12]}, h20>={t20h}/{HT[20]})")
print(f"  human hit rate {pct(hum_heavy+ht_lo,NH)}-{pct(hum_heavy+ht_hi,NH)}")
print(f"CRAWLER (bot_name set): N {NC}; heavy N {cr_heavy_N} hits~{cr_heavy:.0f}; tail N {ct_N} hits {ct_lo:.0f}-{ct_hi:.0f} (h12 {pct(t12-t12h,T[12]-HT[12])}, h20>={pct(t20-t20h,T[20]-HT[20])})")
print(f"  crawler hit rate {pct(cr_heavy+ct_lo,NC)}-{pct(cr_heavy+ct_hi,NC)}")
# ---------- fra1 ----------
f=b['fra1_day']; F=1658
fra_heavy=hits(H['/']['fra1'])+hits(H['/community/chat']['fra1'])
posts=S['fra1_post_hourly']; fra_posts=sum(hits(s) for s in posts.values())
model_posts=sum(sum(s)-occ(sum(s)) for s in posts.values()); clump=fra_posts/model_posts
top=S['fra1_top50_counts']; r750=top[6:]                       # ranks 7-50 (ranks 1-6 measured exactly)
r750_hi=sum(d-1 for d in r750); r750_mid=sum((d-occ(d)) for d in r750)*clump
rest51_N=F-sum(top); rest51_hi=rest51_N-(f['distinct_paths_lower_bound']-50)
exact_part=fra_heavy+fra_posts
print(f"FRA1: N {F}; '/'+chat exact hits {fra_heavy}; top-4 posts exact hits {fra_posts} (uniform model {model_posts:.0f}, clumping x{clump:.2f})")
print(f"  ranks 7-50: N {sum(r750)} hits 0..{r750_hi} (model {r750_mid:.0f}); ranks 51+: N {rest51_N}, hits 0..<= {rest51_hi}")
print(f"  fra1 hit rate: lower {pct(exact_part,F)}, central {pct(exact_part+r750_mid+5,F)}, upper {pct(exact_part+r750_hi+rest51_hi,F)}")
print(f"  fra1 heavy-only share of fra1 requests: {pct(353+349,F)}")
# ---------- item 4 ----------
t50=sum(S['top50_paths_counts']); print(f"TOP50 paths: {t50}/{N} = {pct(t50,N)}; top-2 = {pct(3878+1738,N)}")
print(f"hour-12 tail cells K = {T[12]-t12} distinct (path,region) pairs in that single hour")
