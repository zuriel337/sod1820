import hashlib
import importlib.util
import json
import pathlib
import time
import unittest


TOOLS_DIR = pathlib.Path(__file__).resolve().parent
RUNNER_PATH = TOOLS_DIR / "hosted-comparison-runner.py"
FIXTURE_PATH = TOOLS_DIR / "fixtures" / "network-events.json"
ADVERSARIAL_FIXTURE_PATH = TOOLS_DIR / "fixtures" / "adversarial-network-events.json"
GOLDEN_PATH = TOOLS_DIR / "fixtures" / "legacy-single-arm-golden.json"
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


def capture_fixture(path):
    cdp = FakeCdp()
    capture = RUNNER.new_network_capture()
    RUNNER.attach_network_capture(cdp, {"start": time.perf_counter() - 0.05}, capture)
    for row in json.loads(path.read_text(encoding="utf-8")):
        cdp.emit(row["event"], row["payload"])
    return capture


class HostedComparisonRunnerTests(unittest.TestCase):
    def test_url_sanitization_hashes_suspicious_keys_segments_and_unsupported_schemes(self):
        safe = RUNNER.sanitize_url(
            "https://user:pass@example.test:8443/a/b?z=last&token=secret&a=first#fragment"
        )
        self.assertTrue(safe.startswith("https://example.test:8443/a/b?"))
        self.assertNotIn("token", safe)
        self.assertNotIn("secret", safe)
        self.assertNotIn("user", safe)
        self.assertNotIn("pass", safe)
        self.assertIn("[redacted-key-", safe)
        sensitive_path = RUNNER.sanitize_url(
            "https://example.test/download/sk_live_fixtureNakedSecret/sessionid/value"
        )
        self.assertNotIn("fixtureNakedSecret", sensitive_path)
        self.assertNotIn("sessionid", sensitive_path)
        self.assertIn("[segment-", sensitive_path)
        self.assertEqual(
            RUNNER.sanitize_url("ftp://example.test/token/fixture-secret"),
            "[unsupported-url]",
        )
        diagnostic = RUNNER.sanitize_diagnostic_text(
            "Bearer fixture-bearer token=fixture-secret naked-fixture-secret"
        )
        for forbidden in ("fixture-bearer", "fixture-secret", "naked-fixture-secret"):
            self.assertNotIn(forbidden, diagnostic)

    def test_validation_precedes_token_read_and_requires_exact_https_allowlist(self):
        parser = RUNNER.build_parser()
        args = parser.parse_args([
            "--origin", "ftp://preview.example.test",
            "--allow-preview-origin", "https://preview.example.test",
            "--auth-origin", "ftp://preview.example.test",
            "--share-token-stdin",
            "--sha", "a" * 40,
            "--output", "/tmp/out.json",
        ])
        reads = []

        def forbidden_reader():
            reads.append(True)
            return "fixture-share-token\n"

        with self.assertRaises(RUNNER.TargetValidationError):
            RUNNER.prepare_execution(args, forbidden_reader)
        self.assertEqual(reads, [])

        args = parser.parse_args([
            "--origin", "https://preview.example.test",
            "--allow-preview-origin", "https://other.example.test",
            "--sha", "a" * 40,
            "--output", "/tmp/out.json",
        ])
        with self.assertRaisesRegex(RUNNER.TargetValidationError, "exact-preview-allowlist"):
            RUNNER.validate_targets(args)

        args = parser.parse_args([
            "--origin", "https://preview.example.test",
            "--allow-preview-origin", "https://preview.example.test",
            "--auth-origin", "https://auth.example.test",
            "--share-token-stdin",
            "--sha", "a" * 40,
            "--output", "/tmp/out.json",
        ])
        with self.assertRaisesRegex(RUNNER.TargetValidationError, "must-equal-arm-origin"):
            RUNNER.validate_targets(args)

    def test_production_db_is_not_an_implicit_or_default_target(self):
        parser = RUNNER.build_parser()
        common = [
            "--origin", "https://preview.example.test",
            "--allow-preview-origin", "https://preview.example.test",
            "--sha", "a" * 40,
            "--output", "/tmp/out.json",
        ]
        args = parser.parse_args(common + [
            "--allow-db-origin", "https://linswmnnkjxvweumprav.supabase.co",
        ])
        with self.assertRaisesRegex(RUNNER.TargetValidationError, "explicit-acknowledgement"):
            RUNNER.validate_targets(args)
        args = parser.parse_args(common + [
            "--allow-db-origin", "https://nonproduction.supabase.co",
        ])
        validated = RUNNER.validate_targets(args)
        self.assertEqual(validated["db_origins"], {"https://nonproduction.supabase.co"})

    def test_network_boundary_is_default_deny_and_blocked_receipt_has_no_raw_path(self):
        arm = "https://preview.example.test"
        dbs = {"https://nonproduction.supabase.co"}
        self.assertTrue(RUNNER.network_decision(arm + "/world", "GET", arm, dbs)[0])
        self.assertFalse(RUNNER.network_decision("https://cdn.example.test/image.jpg", "GET", arm, dbs)[0])
        self.assertFalse(RUNNER.network_decision("ftp://preview.example.test/file", "GET", arm, dbs)[0])
        self.assertTrue(RUNNER.network_decision(
            "https://nonproduction.supabase.co/rest/v1/site_flags?select=key", "GET", arm, dbs
        )[0])
        self.assertTrue(RUNNER.network_decision(
            "https://nonproduction.supabase.co/rest/v1/rpc/site_counts", "POST", arm, dbs
        )[0])
        self.assertFalse(RUNNER.network_decision(
            "https://nonproduction.supabase.co/rest/v1/rpc/fixture_secret_writer", "POST", arm, dbs
        )[0])
        blocked = RUNNER.blocked_receipt(
            "https://token-fixture.example.test/private/sessionid/fixture-secret?token=fixture-query",
            "GET", "origin-not-allowlisted", "external",
        )
        serialized = json.dumps(blocked, sort_keys=True)
        for forbidden in ("token-fixture", "/private", "sessionid", "fixture-secret", "fixture-query"):
            self.assertNotIn(forbidden, serialized)
        self.assertEqual(blocked["scheme"], "https")

    def test_alternating_plan_is_counterbalanced_and_balanced_at_seven(self):
        plan = RUNNER.build_ab_order(7, "a")
        self.assertEqual(len(plan), 14)
        self.assertEqual([item["arm"] for item in plan[:8]], ["a", "b", "b", "a", "a", "b", "b", "a"])
        self.assertEqual([item["sample"] for item in plan if item["arm"] == "a"], list(range(1, 8)))
        self.assertEqual([item["sample"] for item in plan if item["arm"] == "b"], list(range(1, 8)))
        self.assertEqual([item["pair"] for item in plan[0:2]], [1, 1])
        self.assertEqual([item["pair"] for item in plan[2:4]], [2, 2])

    def test_network_ledger_retains_states_bytes_and_cutoff_without_values(self):
        capture = capture_fixture(FIXTURE_PATH)
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
        self.assertEqual(ledger[0]["scheme"], "https")
        self.assertIn("v", ledger[0]["query_keys"])
        self.assertTrue(any(key.startswith("[redacted-key-") for key in ledger[0]["query_keys"]))
        self.assertEqual(ledger[2]["failure_code"], "err-failed")
        self.assertNotIn("message", ledger[2])
        serialized = json.dumps(summary, sort_keys=True)
        for forbidden in (
            "fixture-secret", "fixture-private", "fixture-token", "fixture-error-token",
            "build-123", "key,value",
        ):
            self.assertNotIn(forbidden, serialized)

    def test_adversarial_ledger_redacts_blocked_token_paths_keys_ftp_and_naked_errors(self):
        capture = capture_fixture(ADVERSARIAL_FIXTURE_PATH)
        fixture = json.loads(ADVERSARIAL_FIXTURE_PATH.read_text(encoding="utf-8"))
        raw_urls = [
            row["payload"]["request"]["url"]
            for row in fixture if row["event"] == "Network.requestWillBeSent"
        ]
        blocked = [
            RUNNER.blocked_receipt(url, "GET", "origin-not-allowlisted", "external")
            for url in raw_urls
        ]
        summary = RUNNER.summarize_requests(capture, usable_ms=100, cutoff_ms=500, blocked=blocked)
        serialized = json.dumps(summary, sort_keys=True)
        for forbidden in (
            "fixtureNakedSecret", "sessionid", "secret-path", "token-path", "ftp.example.test",
            "redirect-secret", "x-fixture-token",
        ):
            self.assertNotIn(forbidden, serialized)
        self.assertTrue(all(item["url"] == "[blocked-url]" for item in summary["network_requests"]))
        self.assertTrue(all(item["path"] == "[blocked-path]" for item in summary["network_requests"]))
        self.assertTrue(all(item["host"] == "[blocked-host]" for item in summary["network_requests"]))
        self.assertTrue(all(item["scheme"] in {"https", None} for item in summary["network_requests"]))

    def test_ab_acceptance_requires_seven_complete_successful_pairs_per_journey(self):
        runs = []
        journeys = [
            (profile, "cold-direct", kind)
            for profile in RUNNER.PROFILES for kind, _ in RUNNER.ROUTES
        ] + [
            (profile, "internal-home-to-world", "world") for profile in RUNNER.PROFILES
        ]
        for profile, mode, route in journeys:
            for pair in range(1, 8):
                for position, arm in enumerate(("a", "b"), start=1):
                    runs.append({
                        "profile": profile, "mode": mode, "route": route,
                        "arm": arm, "ab_pair": pair, "ab_pair_position": position,
                        "failure": None,
                    })
        accepted = RUNNER.assess_ab_acceptance(runs)
        self.assertTrue(accepted["valid"])
        self.assertTrue(all(row["successful_pairs"] == 7 for row in accepted["journeys"]))

        failed = [dict(run) for run in runs]
        failed[0]["failure"] = "synthetic-failure"
        failed_receipt = RUNNER.assess_ab_acceptance(failed)
        self.assertFalse(failed_receipt["valid"])
        self.assertEqual(RUNNER.result_exit_code(False, True, failed_receipt), 2)
        self.assertEqual(RUNNER.result_exit_code(False, True, accepted), 0)

        partial = [dict(run) for run in runs]
        partial.pop(1)
        partial_receipt = RUNNER.assess_ab_acceptance(partial)
        self.assertFalse(partial_receipt["valid"])
        self.assertEqual(sum(row["partial_pairs"] for row in partial_receipt["journeys"]), 1)

    def test_ab_aggregate_keeps_arms_separate(self):
        runs = [
            {"arm": "a", "profile": "mobile", "mode": "cold-direct", "route": "home", "usable_ms": 100},
            {"arm": "b", "profile": "mobile", "mode": "cold-direct", "route": "home", "usable_ms": 200},
        ]
        rows = RUNNER.aggregate(runs)
        self.assertEqual([(row["arm"], row["median_usable_ms"]) for row in rows], [("a", 100), ("b", 200)])

    def test_legacy_single_arm_cli_and_output_fields_match_golden(self):
        args = RUNNER.build_parser().parse_args([
            "--dist", "/tmp/fixture-dist",
            "--output", "/tmp/fixture-output.json",
            "--sha", "a" * 40,
        ])
        validated, tokens = RUNNER.prepare_execution(args, lambda: self.fail("token reader called"))
        summary = RUNNER.summarize_requests(capture_fixture(FIXTURE_PATH), 400, 3500)
        legacy_summary_fields = [
            "request_count", "transfer_bytes", "flag_request_count", "flag_wait_ms",
            "flag_response_end_ms", "top_critical_durations", "critical_tail",
            "failed_allowed_requests",
        ]
        runs = [{
            "profile": "mobile", "mode": "cold-direct", "route": "home", "failure": None,
            "lcp_ms": 100, "cls": 0, "usable_ms": 120, "request_count": 2,
            "transfer_bytes": 900, "long_task_total_ms": 0, "long_task_count": 0,
            "flag_wait_ms": 100, "blocked_by_category": {},
        }]
        actual = {
            "cli_defaults": {
                "ab_mode": validated["ab_mode"],
                "samples_per_arm": validated["samples_per_arm"],
                "ab_first": args.ab_first,
                "tokens": tokens,
            },
            "legacy_network_summary": {key: summary[key] for key in legacy_summary_fields},
            "legacy_aggregate": RUNNER.aggregate(runs),
        }
        expected = json.loads(GOLDEN_PATH.read_text(encoding="utf-8"))
        self.assertEqual(actual, expected)

    def test_runner_hash_reports_exact_file(self):
        expected = hashlib.sha256(RUNNER_PATH.read_bytes()).hexdigest()
        self.assertEqual(RUNNER.runner_sha256(), expected)


class HostedComparisonAuthRedirectTests(unittest.IsolatedAsyncioTestCase):
    class Response:
        def __init__(self, status, location=None):
            self.status = status
            self.headers = {"location": location} if location is not None else {}
            self.ok = 200 <= status < 300

    class Request:
        def __init__(self, responses):
            self.responses = list(responses)
            self.calls = []

        async def get(self, url, **kwargs):
            self.calls.append((url, kwargs))
            return self.responses.pop(0)

    class Context:
        def __init__(self, responses):
            self.request = HostedComparisonAuthRedirectTests.Request(responses)

    async def test_share_token_redirect_never_crosses_arm_origin(self):
        context = self.Context([
            self.Response(302, "https://evil.example.test/path?token=redirect-secret"),
            self.Response(200),
        ])
        with self.assertRaisesRegex(RUNNER.TargetValidationError, "cross-origin") as raised:
            await RUNNER.authenticate_preview(
                context, "https://preview.example.test", "x-fixture-token"
            )
        self.assertEqual(len(context.request.calls), 1)
        self.assertEqual(context.request.calls[0][1]["max_redirects"], 0)
        self.assertNotIn("redirect-secret", str(raised.exception))
        self.assertNotIn("x-fixture-token", str(raised.exception))

    async def test_same_origin_redirect_is_manually_followed_without_auto_redirects(self):
        context = self.Context([
            self.Response(302, "/auth/complete"),
            self.Response(200),
        ])
        await RUNNER.authenticate_preview(
            context, "https://preview.example.test", "x-fixture-token"
        )
        self.assertEqual(len(context.request.calls), 2)
        self.assertTrue(all(call[1]["max_redirects"] == 0 for call in context.request.calls))
        self.assertEqual(context.request.calls[1][0], "https://preview.example.test/auth/complete")


if __name__ == "__main__":
    unittest.main()
