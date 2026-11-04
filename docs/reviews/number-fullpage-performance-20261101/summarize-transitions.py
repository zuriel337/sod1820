"""Summarize the saved controlled browser evidence; no network or product writes."""
import collections
import json
from pathlib import Path
import statistics
import sys

source = Path(sys.argv[1])
target = Path(sys.argv[2])
raw = json.loads(source.read_text())
rows = raw["results"]
summary = {key: value for key, value in raw.items() if key != "results"}
summary["samples"] = len(rows)
summary["aggregation"] = "Median of three counterbalanced pairs per viewport and first/repeat condition; milliseconds. Small controlled lab sample, not field latency."
summary["conditions"] = []
for profile in dict.fromkeys(row["profile"] for row in rows):
    for repeat in ["first", "repeat"]:
        condition = {"profile": profile, "repeat": repeat, "versions": {}}
        for version in ["before", "after"]:
            samples = [r for r in rows if (r["profile"], r["repeat"], r["version"]) == (profile, repeat, version)]
            totals = [r["totalMs"] for r in samples]
            steps = []
            for name in dict.fromkeys(s["name"] for r in samples for s in r["steps"]):
                values = [s for r in samples for s in r["steps"] if s["name"] == name]
                steps.append({"name": name, "medianMs": statistics.median(v["ms"] for v in values), "rangeMs": [min(v["ms"] for v in values), max(v["ms"] for v in values)], "medianRequests": statistics.median(v["requests"] for v in values), "maxObservedCLS": max(v["cls"] for v in values)})
            condition["versions"][version] = {"n": len(samples), "totalMedianMs": statistics.median(totals), "totalRangeMs": [min(totals), max(totals)], "totalMedianRequests": statistics.median(sum(s["requests"] for s in r["steps"]) for r in samples), "steps": steps}
        summary["conditions"].append(condition)

audits = []
for path in sorted(source.parent.glob(source.stem + "-*-audit.json")):
    audit = json.loads(path.read_text())
    reads = audit["reads"]
    audits.append({"file": path.name, "readCountIncludingUnmeasuredPreparation": len(reads), "measuredSnapshotMisses": len([r for r in reads if not r.get("primed") and r["phase"] != "unmeasured-world-preparation"]), "rpcCounts": dict(collections.Counter(r["rpc"] for r in reads if r.get("rpc"))), "blockedCounts": dict(collections.Counter(r["path"] for r in audit["blocked"])), "transportErrors": audit["errors"], "productWritesForwarded": audit["writes"], "modelsForwarded": audit["models"]})
summary["audits"] = audits
target.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n")
for condition in summary["conditions"]:
    before, after = (condition["versions"][v] for v in ["before", "after"])
    print(condition["profile"], condition["repeat"], f"{before['totalMedianMs']} -> {after['totalMedianMs']} ms", f"requests {before['totalMedianRequests']} -> {after['totalMedianRequests']}")
    for step in after["steps"]:
        if step["name"] in ["world-number-full-page", "number-phrase-full-page", "phrase-number-full-page", "back-number-phrase", "back-phrase-number", "home-number-full-page"]:
            old = next(s for s in before["steps"] if s["name"] == step["name"])
            print(" ", step["name"], old["medianMs"], "->", step["medianMs"], "CLS", step["maxObservedCLS"])
