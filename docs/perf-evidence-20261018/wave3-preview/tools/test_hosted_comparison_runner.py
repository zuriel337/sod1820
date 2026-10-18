import hashlib
import importlib.util
import json
import pathlib
import time
import unittest


TOOLS_DIR = pathlib.Path(__file__).resolve().parent
RUNNER_PATH = TOOLS_DIR / "hosted-comparison-runner.py"
FIXTURE_PATH = TOOLS_DIR / "fixtures" / "network-events.json"
SPEC = importlib.util.spec_from_file_location("hosted_comparison_runner", RUNNER_PATH)
RUNNER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(RUNNER)


class FakeCdp:
    def __init__(self):
        self.handlers = {}

    def on(self, event, callback):
        self.handlers[event] = callback

    def emit(self, event, payload):
        self.handlers[event](payload)


class HostedComparisonRunnerTests(unittest.TestCase):
    def test_url_sanitization_keeps_identity_without_values_or_credentials(self):
        safe = RUNNER.sanitize_url(
            "https://user:pass@example.test:8443/a/b?z=last&token=secret&a=first#fragment"
        )
        self.assertEqual(safe, "https://example.test:8443/a/b?a&token&z")
        self.assertEqual(RUNNER.sanitize_url(safe, path_only=True), "/a/b?a&token&z")
        self.assertNotIn("secret", safe)
        self.assertNotIn("user", safe)
        self.assertNotIn("pass", safe)
        diagnostic = RUNNER.sanitize_diagnostic_text(
            'Authorization: Bearer fixture-bearer _vercel_share="fixture-share" '
            'https://example.test/a?access_token=fixture-access'
        )
        for forbidden in ("fixture-bearer", "fixture-share", "fixture-access"):
            self.assertNotIn(forbidden, diagnostic)
        self.assertIn("Bearer [REDACTED]", diagnostic)

    def test_alternating_plan_is_deterministic_and_balanced_at_seven(self):
        plan = RUNNER.build_ab_order(7, "a")
        self.assertEqual(len(plan), 14)
        self.assertEqual([item["arm"] for item in plan[:8]], ["a", "b", "b", "a", "a", "b", "b", "a"])
        self.assertEqual([item["sample"] for item in plan if item["arm"] == "a"], list(range(1, 8)))
        self.assertEqual([item["sample"] for item in plan if item["arm"] == "b"], list(range(1, 8)))
        self.assertEqual([item["pair"] for item in plan[0:2]], [1, 1])
        self.assertEqual([item["pair"] for item in plan[2:4]], [2, 2])

    def test_network_ledger_retains_states_bytes_and_cutoff_without_values(self):
        fixture = json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))
        cdp = FakeCdp()
        capture = RUNNER.new_network_capture()
        RUNNER.attach_network_capture(cdp, {"start": time.perf_counter() - 0.05}, capture)
        for row in fixture:
            cdp.emit(row["event"], row["payload"])

        summary = RUNNER.summarize_requests(capture, usable_ms=400, cutoff_ms=3500)
        self.assertEqual(summary["request_started_count"], 3)
        self.assertEqual(summary["request_completed_count"], 1)
        self.assertEqual(summary["request_failed_count"], 1)
        self.assertEqual(summary["request_pending_count"], 1)
        self.assertEqual(summary["request_count"], 2)
        self.assertEqual(summary["transfer_bytes"], 900)
        self.assertEqual(summary["encoded_body_bytes"], 800)
        self.assertEqual(summary["decoded_body_bytes"], 1000)
        self.assertEqual(summary["measurement_window"], {
            "start_ms": 0,
            "usable_ms": 400,
            "cutoff_ms": 3500,
            "post_usable_observation_ms": 3100,
        })

        ledger = summary["network_requests"]
        self.assertEqual([item["state"] for item in ledger], ["completed", "pending", "failed"])
        self.assertEqual(ledger[0]["completion_phase"], "post_usable")
        self.assertEqual(ledger[1]["completion_phase"], "pending_at_cutoff")
        self.assertEqual(ledger[2]["completion_phase"], "post_usable")
        self.assertEqual(ledger[0]["resource_type"], "Script")
        self.assertEqual(ledger[0]["initiator"]["type"], "parser")
        self.assertEqual(ledger[0]["query_keys"], ["X-Amz-Signature", "v"])
        self.assertEqual(ledger[0]["url"], "https://example.test/assets/app.js?X-Amz-Signature&v")
        self.assertEqual(ledger[1]["path"], "/private/object.png?token&width")
        serialized = json.dumps(summary, sort_keys=True)
        for forbidden in ("fixture-secret", "fixture-private", "fixture-token", "fixture-error-token", "build-123", "key,value"):
            self.assertNotIn(forbidden, serialized)
        self.assertIn("token=[REDACTED]", serialized)

    def test_ab_aggregate_keeps_arms_separate(self):
        runs = [
            {"arm": "a", "profile": "mobile", "mode": "cold-direct", "route": "home", "usable_ms": 100},
            {"arm": "b", "profile": "mobile", "mode": "cold-direct", "route": "home", "usable_ms": 200},
        ]
        rows = RUNNER.aggregate(runs)
        self.assertEqual([(row["arm"], row["median_usable_ms"]) for row in rows], [("a", 100), ("b", 200)])

    def test_runner_hash_reports_exact_file(self):
        expected = hashlib.sha256(RUNNER_PATH.read_bytes()).hexdigest()
        self.assertEqual(RUNNER.runner_sha256(), expected)


if __name__ == "__main__":
    unittest.main()
