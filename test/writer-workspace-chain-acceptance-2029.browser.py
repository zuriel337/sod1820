"""Run the existing independent UI acceptance suites against one checkout.

Uses a local Vite source host for the existing Follow fixtures and the regular
2029 build for the other suites. HTTP/Auth mutations remain synthetic in each
suite. This never deploys a Preview or opens a live model/account session.
"""
import concurrent.futures
import json
import os
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(os.environ.get("CHAIN_ACCEPTANCE_OUT", "/tmp/writer-workspace-chain-acceptance"))
OUT.mkdir(parents=True, exist_ok=True)
PORT = os.environ.get("CHAIN_ACCEPTANCE_PORT", "5632")
REPORT = {"suites": [], "errors": [], "fixture_only": True, "live_product_writes": 0}

def run_suite(name, script, variables):
    folder = OUT / name; folder.mkdir(exist_ok=True)
    env = {**os.environ, **variables}
    with (folder / "run.log").open("w") as log:
        result = subprocess.run([sys.executable, str(ROOT / script)], cwd=ROOT, env=env,
                                stdout=log, stderr=subprocess.STDOUT, timeout=900)
    lines = (folder / "run.log").read_text().splitlines()
    payload = None
    for line in reversed(lines):
        try:
            candidate = json.loads(line)
            if isinstance(candidate, dict): payload = candidate; break
        except (ValueError, TypeError): pass
    findings = {key: payload.get(key) for key in ["errors", "failures", "unexpected", "unexpected_writes", "model_calls", "model_attempts", "private_telemetry"] if payload and payload.get(key)}
    if payload is None:
        findings["execution"] = "\n".join(lines[-18:])
    record = {"name": name, "script": script, "exit_code": result.returncode,
              "passed": result.returncode == 0 and payload is not None and not findings,
              "result": payload, "findings": findings}
    (folder / "result.json").write_text(json.dumps(record, ensure_ascii=False, indent=2))
    print(json.dumps({"suite": name, "passed": record["passed"], "findings": findings}), flush=True)
    return record

suites = [
    ("follow-categories-series", "test/follow-category-series-alignment.browser.py", {"FOLLOW_ALIGNMENT_PORT": PORT, "FOLLOW_ALIGNMENT_OUT": str(OUT / "follow-categories-series")} ),
    ("follow-data", "test/follow-center-data-2029.browser.py", {"CENTER_DATA_PORT": PORT, "CENTER_DATA_OUT": str(OUT / "follow-data")} ),
    ("writer-personal", "test/writer-personal-chain-2029.browser.py", {"WRITER_PERSONAL_OUT": str(OUT / "writer-personal")} ),
    ("workspace-raziel", "test/raziel-workspace-completion-2029.browser.py", {"TASK_WORKSPACE_COMPLETION_OUT": str(OUT / "workspace-raziel"), "TASK_WORKSPACE_FLOW_ONLY": "false"} ),
    ("community-person", "test/community-person-unification-2029.browser.py", {} ),
    ("message-actions", "test/community-message-actions-2029.browser.py", {"TASK_COMMUNITY_ACTIONS_OUT": str(OUT / "message-actions")} ),
    ("personal-replies", "test/personal-replies-community-2029.browser.py", {"TASK_REPLIES_BROWSER_OUT": str(OUT / "personal-replies"),
       **({"TASK_REPLIES_EXPORT": os.environ["CHAIN_REPLIES_EXPORT"]} if os.environ.get("CHAIN_REPLIES_EXPORT") else {})} ),
]

vite_log = (OUT / "vite.log").open("w")
vite = subprocess.Popen([str(ROOT / "node_modules/.bin/vite"), "--host", "127.0.0.1", "--port", PORT, "--strictPort"],
    cwd=ROOT, env={**os.environ, "SOD_BUILD_TARGET": "2029"}, stdout=vite_log, stderr=subprocess.STDOUT)
try:
    deadline = time.monotonic() + 30
    while True:
        if vite.poll() is not None: raise RuntimeError("Local test host failed; see vite.log")
        try:
            urllib.request.urlopen("http://127.0.0.1:" + PORT + "/@vite/client", timeout=1).close(); break
        except Exception:
            if time.monotonic() >= deadline: raise
            time.sleep(0.1)
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        jobs = {pool.submit(run_suite, *suite): suite[0] for suite in suites}
        for job in concurrent.futures.as_completed(jobs):
            try: REPORT["suites"].append(job.result())
            except Exception as error: REPORT["errors"].append({"suite": jobs[job], "error": str(error)})
finally:
    vite.terminate()
    try: vite.wait(timeout=10)
    except subprocess.TimeoutExpired: vite.kill(); vite.wait()
    vite_log.close()

REPORT["passed"] = len(REPORT["suites"]) == len(suites) and not REPORT["errors"] and all(suite["passed"] for suite in REPORT["suites"])
(OUT / "results.json").write_text(json.dumps(REPORT, ensure_ascii=False, indent=2))
print(json.dumps({"passed": REPORT["passed"], "suites": len(REPORT["suites"]), "errors": REPORT["errors"]}), flush=True)
assert REPORT["passed"], "Combined chain acceptance failed; see per-suite logs/results"
