"""Approved B/D endpoint checks. Deliberately no valid signup or signed removal."""
import json
import sys
import urllib.request
import urllib.error
from pathlib import Path

base = "https://linswmnnkjxvweumprav.supabase.co/functions/v1/"
origin = "https://sod1820-git-gpt-2029-public-cutover-f-7ce8ee-sod1820-s-projects.vercel.app"
cases = [
    ("signup OPTIONS advertises both exact purposes", "newsletter-signup", "OPTIONS", None, 200, None),
    ("site-updates without consent denied before storage", "newsletter-signup?format=json", "POST", {"purpose": "site-updates", "source": "2029-site-updates", "consent": False, "email": "not-an-email"}, 400, "consent-required"),
    ("site-updates invalid email denied before storage", "newsletter-signup?format=json", "POST", {"purpose": "site-updates", "source": "2029-site-updates", "consent": True, "email": "not-an-email"}, 400, "invalid"),
    ("purpose/source mismatch cannot fall back to general", "newsletter-signup?format=json", "POST", {"purpose": "general", "source": "2029-site-updates", "consent": True, "email": "not-an-email"}, 400, "invalid-purpose"),
    ("Legacy general invalid email behavior retained", "newsletter-signup?format=json", "POST", {"purpose": "general", "source": "legacy-nonwriting-probe", "email": "not-an-email"}, 400, "invalid"),
    ("unsigned GET removal cannot succeed", "newsletter-unsubscribe?format=json", "GET", None, 400, "bad_link"),
    ("unsigned POST removal cannot succeed", "newsletter-unsubscribe?format=json", "POST", {}, 400, "bad_link"),
    ("duplicate removal parameters rejected before processing", "newsletter-unsubscribe?format=json&e=x&e=y&t=x", "GET", None, 400, "bad_link"),
    ("unsupported removal method rejected", "newsletter-unsubscribe?format=json", "DELETE", None, 405, "method_not_allowed"),
    ("removal OPTIONS retains existing access contract", "newsletter-unsubscribe", "OPTIONS", None, 200, None),
]
report = {"kind": "real-shared-endpoints-nonwriting-only", "validEmailSubmitted": False,
          "validSignedRemovalSubmitted": False, "mailSentByTests": False, "cases": []}
for name, route, method, payload, expected_status, expected_reason in cases:
    row = {"name": name, "function": route.split("?")[0], "method": method}
    report["cases"].append(row)
    try:
        body = json.dumps(payload).encode() if payload is not None else None
        req = urllib.request.Request(base + route, data=body, method=method,
            headers={"Origin": origin, "Content-Type": "application/json", "Accept": "application/json",
                     "User-Agent": "SOD1820-approved-BD-nonwriting-acceptance"})
        try:
            response = urllib.request.urlopen(req, timeout=25)
        except urllib.error.HTTPError as error:
            response = error
        row["status"] = response.status
        data = response.read().decode()
        assert response.status == expected_status, (response.status, expected_status)
        assert "no-store" in response.headers.get("cache-control", "")
        if route.startswith("newsletter-unsubscribe"):
            assert response.headers.get("referrer-policy") == "no-referrer"
        if method == "OPTIONS" and route == "newsletter-signup":
            contracts = {part.strip() for part in response.headers.get("x-newsletter-purpose-contract", "").split(",")}
            assert contracts == {"opening-parts-v1", "site-updates-v1"}, contracts
            row["contracts"] = sorted(contracts)
        if expected_reason:
            result = json.loads(data)
            assert result["ok"] is False
            reason = result.get("status", result.get("reason"))
            assert reason == expected_reason, (reason, expected_reason)
            if "email" in result:
                assert result["email"] == ""
            row["reason"] = reason
        row["passed"] = True
    except Exception as error:
        row["passed"] = False
        row["failure"] = {"type": type(error).__name__, "message": str(error)[:400]}
report["passed"] = sum(row.get("passed") is True for row in report["cases"])
report["failed"] = len(report["cases"]) - report["passed"]
Path(sys.argv[1]).write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps({"passed": report["passed"], "failed": report["failed"],
                  "failures": [row for row in report["cases"] if not row["passed"]]}))
sys.exit(1 if report["failed"] else 0)
