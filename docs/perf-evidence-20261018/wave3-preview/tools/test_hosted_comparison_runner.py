import hashlib
import importlib.util
import json
import pathlib
import tempfile
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
            "https://user:pass@example.test:8443/v3AbC9xY7pQ2LmN8/b?z=last&token=secret&a=first#fragment"
        )
        self.assertTrue(safe.startswith("https://host-"))
        self.assertNotIn("example.test", safe)
        self.assertNotIn("v3AbC9xY7pQ2LmN8", safe)
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
        initiator = RUNNER.initiator_summary({
            "type": "script",
            "url": "https://opaque-host.example/v3AbC9xY7pQ2LmN8/source.js",
        })
        serialized_initiator = json.dumps(initiator, sort_keys=True)
        for forbidden in ("url", "path\"", "opaque-host", "v3AbC9xY7pQ2LmN8", "source.js"):
            self.assertNotIn(forbidden, serialized_initiator)
        self.assertIn("origin_fingerprint", initiator)
        self.assertIn("path_fingerprint_sha256", initiator)

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

    def test_arm_origins_cannot_bypass_db_separation_or_alias_each_other(self):
        parser = RUNNER.build_parser()
        production_as_arm = parser.parse_args([
            "--origin", "https://linswmnnkjxvweumprav.supabase.co",
            "--allow-preview-origin", "https://linswmnnkjxvweumprav.supabase.co",
            "--sha", "a" * 40,
            "--output", "/tmp/out.json",
        ])
        with self.assertRaisesRegex(RUNNER.TargetValidationError, "production-db-cannot-be-preview-origin"):
            RUNNER.validate_targets(production_as_arm)

        shared_arm_db = parser.parse_args([
            "--origin", "https://preview.example.test",
            "--allow-preview-origin", "https://preview.example.test",
            "--allow-db-origin", "https://preview.example.test",
            "--sha", "a" * 40,
            "--output", "/tmp/out.json",
        ])
        with self.assertRaisesRegex(RUNNER.TargetValidationError, "sets-must-be-disjoint"):
            RUNNER.validate_targets(shared_arm_db)

        same_ab_origin = parser.parse_args([
            "--origin", "https://preview.example.test",
            "--allow-preview-origin", "https://preview.example.test",
            "--sha", "a" * 40,
            "--origin-b", "https://preview.example.test",
            "--sha-b", "b" * 40,
            "--output", "/tmp/out.json",
        ])
        with self.assertRaisesRegex(RUNNER.TargetValidationError, "origins-must-be-distinct"):
            RUNNER.validate_targets(same_ab_origin)

    def test_every_browser_context_keeps_tls_verification_enabled(self):
        source = RUNNER_PATH.read_text(encoding="utf-8")
        self.assertNotIn("ignore_https_errors=True", source)
        self.assertEqual(source.count("ignore_https_errors=False"), 2)

    def test_local_spa_resolution_uses_path_boundary_and_dist_receipt_is_hashed(self):
        with tempfile.TemporaryDirectory(prefix="runner-token-v3AbC9xY7pQ2LmN8-") as parent:
            parent_path = pathlib.Path(parent)
            root = parent_path / "site"
            sibling = parent_path / "site-evil"
            root.mkdir()
            sibling.mkdir()
            fallback = root / "2029.html"
            fallback.write_text("safe", encoding="utf-8")
            secret = sibling / "opaque.txt"
            secret.write_text("outside", encoding="utf-8")
            resolved = RUNNER.resolve_spa_candidate(root, "/../site-evil/opaque.txt")
            self.assertEqual(resolved, fallback.resolve())
            link = root / "link.txt"
            try:
                link.symlink_to(secret)
            except OSError:
                pass
            else:
                self.assertEqual(RUNNER.resolve_spa_candidate(root, "/link.txt"), fallback.resolve())
            receipt = RUNNER.dist_receipt(parent)
            serialized = json.dumps(receipt)
            self.assertNotIn("runner-token", serialized)
            self.assertNotIn(parent, serialized)
            self.assertRegex(receipt["path_sha256"], r"^[0-9a-f]{64}$")
        self.assertNotIn("id: e.id", RUNNER.INIT_SCRIPT)
        self.assertNotIn("cls: e.element", RUNNER.INIT_SCRIPT)

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
        boundary = RUNNER.boundary_policy_receipt(dbs, False)
        serialized_boundary = json.dumps(boundary, sort_keys=True)
        self.assertNotIn("nonproduction.supabase.co", serialized_boundary)
        self.assertNotIn("google-analytics.com", serialized_boundary)
        self.assertRegex(boundary["db_origin_fingerprints"][0], r"^[0-9a-f]{64}$")

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
                    commit = ("a" if arm == "a" else "b") * 40
                    manifest = ("c" if arm == "a" else "d") * 64
                    runs.append({
                        "profile": profile, "mode": mode, "route": route,
                        "arm": arm, "ab_pair": pair, "ab_pair_position": position,
                        "failure": None,
                        "build_identity": {
                            "verified": True,
                            "source": "same-origin-preview-build-v1",
                            "commit": commit,
                            "build_target": "2029",
                            "read_only": True,
                            "manifest_sha256": manifest,
                        },
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

        unverified = [dict(run) for run in runs]
        unverified[0]["build_identity"] = None
        unverified_receipt = RUNNER.assess_ab_acceptance(unverified)
        self.assertFalse(unverified_receipt["valid"])
        self.assertEqual(
            unverified_receipt["verified_build_identity_by_arm"]["a"]["missing_or_invalid"],
            1,
        )

        mutable_alias = [dict(run) for run in runs]
        mutable_alias[0]["build_identity"] = {
            **mutable_alias[0]["build_identity"],
            "manifest_sha256": "e" * 64,
        }
        mutable_alias_receipt = RUNNER.assess_ab_acceptance(mutable_alias)
        self.assertFalse(mutable_alias_receipt["valid"])
        self.assertEqual(
            mutable_alias_receipt["verified_build_identity_by_arm"]["a"]["distinct_verified_identities"],
            2,
        )

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
        def __init__(self, status, location=None, payload=b"", content_type="application/json"):
            self.status = status
            self.headers = {"content-type": content_type}
            if location is not None:
                self.headers["location"] = location
            self.ok = 200 <= status < 300
            self.payload = payload

        async def body(self):
            return self.payload

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
            self.closed = False

        async def close(self):
            self.closed = True

    class Browser:
        def __init__(self, responses):
            self.responses = responses
            self.kwargs = None
            self.context = None

        async def new_context(self, **kwargs):
            self.kwargs = kwargs
            self.context = HostedComparisonAuthRedirectTests.Context(self.responses)
            return self.context

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

    async def test_parser_differential_and_ambiguous_locations_are_rejected_before_second_get(self):
        unsafe_locations = [
            "\\\\evil.example.test\\p",
            "/\\\\evil.example.test/p",
            "https:\\\\evil.example.test\\p",
            "https:/\\evil.example.test/p",
            "//evil.example.test/p",
            "///evil.example.test/p",
            "/%5cevil.example.test/p",
            "/%5C%5Cevil.example.test/p",
            "/%2f%2fevil.example.test/p",
            "/safe%0d%0aLocation:evil",
            "/safe%09path",
            "/safe path",
            "/safe\tpath",
            " https://preview.example.test/p",
            "https://preview.example.test@evil.example.test/p",
            "https://evil.example.test@preview.example.test/p",
            "https://prevıew.example.test/p",
            "https://xn--prevew-0za.example.test/p",
            "https://preview.example.test:444/p",
            "https://preview.example.test:99999/p",
            "http://preview.example.test/p",
            "javascript:location='https://preview.example.test/'",
            "auth/complete",
            "?next=/auth/complete",
        ]
        for location in unsafe_locations:
            with self.subTest(location=repr(location)):
                context = self.Context([self.Response(302, location), self.Response(200)])
                with self.assertRaises(RUNNER.TargetValidationError):
                    await RUNNER.authenticate_preview(
                        context, "https://preview.example.test", "x-fixture-token"
                    )
                self.assertEqual(len(context.request.calls), 1)
                self.assertEqual(context.request.calls[0][1]["max_redirects"], 0)

    async def test_exact_absolute_https_default_port_is_safe(self):
        context = self.Context([
            self.Response(302, "https://preview.example.test:443/auth/complete?next=%2E%2E"),
            self.Response(200),
        ])
        await RUNNER.authenticate_preview(
            context, "https://preview.example.test", "x-fixture-token"
        )
        self.assertEqual(len(context.request.calls), 2)
        self.assertEqual(
            context.request.calls[1][0],
            "https://preview.example.test:443/auth/complete?next=%2E%2E",
        )

    def test_unicode_target_origin_is_rejected_and_ascii_idna_requires_exact_allowlist(self):
        parser = RUNNER.build_parser()
        unicode_args = parser.parse_args([
            "--origin", "https://prevıew.example.test",
            "--allow-preview-origin", "https://prevıew.example.test",
            "--sha", "a" * 40,
            "--output", "/tmp/out.json",
        ])
        with self.assertRaisesRegex(RUNNER.TargetValidationError, "ascii-origin-required"):
            RUNNER.validate_targets(unicode_args)

        idna_args = parser.parse_args([
            "--origin", "https://xn--prevew-0za.example.test",
            "--allow-preview-origin", "https://xn--prevew-0za.example.test",
            "--sha", "a" * 40,
            "--output", "/tmp/out.json",
        ])
        validated = RUNNER.validate_targets(idna_args)
        self.assertEqual(
            validated["arms"]["a"]["origin"],
            "https://xn--prevew-0za.example.test",
        )

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

    async def test_build_identity_uses_canonical_same_origin_receipt_and_checks_expected_commit(self):
        expected_commit = "a" * 40
        payload = json.dumps({
            "commit": expected_commit,
            "buildTarget": "2029",
            "readOnly": True,
            "previewOverrides": [],
            "manifestSha256": "b" * 64,
        }).encode("utf-8")
        context = self.Context([self.Response(200, payload=payload)])
        identity = await RUNNER.verify_build_identity(
            context, "https://preview.example.test", expected_commit
        )
        self.assertEqual(identity["commit"], expected_commit)
        self.assertEqual(identity["manifest_sha256"], "b" * 64)
        self.assertEqual(
            context.request.calls,
            [("https://preview.example.test/preview-build.json", {
                "max_redirects": 0,
                "timeout": 30000,
            })],
        )

        mismatch = self.Context([self.Response(200, payload=payload)])
        with self.assertRaisesRegex(RuntimeError, "commit-mismatch"):
            await RUNNER.verify_build_identity(
                mismatch, "https://preview.example.test", "c" * 40
            )

    async def test_build_identity_rejects_bad_contract_size_type_and_redirect(self):
        expected_commit = "a" * 40
        valid = {
            "commit": expected_commit,
            "buildTarget": "2029",
            "readOnly": True,
            "manifestSha256": "b" * 64,
        }
        cases = [
            (self.Response(200, payload=json.dumps({**valid, "readOnly": False}).encode()), "contract-invalid"),
            (self.Response(200, payload=json.dumps({**valid, "manifestSha256": "short"}).encode()), "manifest-invalid"),
            (self.Response(200, payload=b"{}", content_type="text/html"), "content-type-invalid"),
            (self.Response(200, payload=b"x" * 16385), "too-large"),
        ]
        for response, error in cases:
            with self.subTest(error=error):
                context = self.Context([response])
                with self.assertRaisesRegex(RuntimeError, error):
                    await RUNNER.verify_build_identity(
                        context, "https://preview.example.test", expected_commit
                    )

        redirected = self.Context([
            self.Response(302, "https://evil.example.test/preview-build.json"),
            self.Response(200, payload=json.dumps(valid).encode()),
        ])
        with self.assertRaisesRegex(RUNNER.TargetValidationError, "cross-origin"):
            await RUNNER.verify_build_identity(
                redirected, "https://preview.example.test", expected_commit
            )
        self.assertEqual(len(redirected.request.calls), 1)

    async def test_build_identity_rejects_200_spa_fallback_html(self):
        spa_fallback = b"<!doctype html><html><body><div id='root'></div></body></html>"
        context = self.Context([
            self.Response(200, payload=spa_fallback, content_type="text/html; charset=utf-8"),
        ])
        with self.assertRaisesRegex(RuntimeError, "content-type-invalid"):
            await RUNNER.verify_build_identity(
                context, "https://preview.example.test", "a" * 40
            )
        self.assertEqual(len(context.request.calls), 1)

    async def test_hosted_identity_preflight_keeps_tls_verification_enabled(self):
        expected_commit = "a" * 40
        payload = json.dumps({
            "commit": expected_commit,
            "buildTarget": "2029",
            "readOnly": True,
            "manifestSha256": "b" * 64,
        }).encode("utf-8")
        browser = self.Browser([self.Response(200, payload=payload)])
        identity = await RUNNER.preflight_build_identity(
            browser, "https://preview.example.test", expected_commit
        )
        self.assertTrue(identity["verified"])
        self.assertIs(browser.kwargs["ignore_https_errors"], False)
        self.assertEqual(browser.kwargs["service_workers"], "block")
        self.assertTrue(browser.context.closed)


if __name__ == "__main__":
    unittest.main()
