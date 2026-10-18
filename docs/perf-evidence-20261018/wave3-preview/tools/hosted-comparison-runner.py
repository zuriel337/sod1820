import argparse
import asyncio
import gzip
import hashlib
import http.server
import ipaddress
import json
import mimetypes
import os
import pathlib
import re
import statistics
import sys
import threading
import time
from urllib.parse import parse_qsl, quote, unquote, urlencode, urlparse, urlsplit, urlunparse

from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeoutError


ROUTES = [
    ("home", "/"),
    ("number718", "/number/718"),
    ("world", "/world"),
    ("post", "/post/flydubai-fz1073-363-14000-remzei-geula"),
]

PROFILES = {
    "mobile": {
        "viewport": {"width": 390, "height": 844},
        "device_scale_factor": 2,
        "is_mobile": True,
        "has_touch": True,
        "user_agent": "Mozilla/5.0 (Linux; Android 15; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36",
        "cpu_rate": 4,
        "latency_ms": 80,
        "download_bps": 9 * 1024 * 1024 / 8,
        "upload_bps": 2 * 1024 * 1024 / 8,
    },
    "desktop": {
        "viewport": {"width": 1440, "height": 1000},
        "device_scale_factor": 1,
        "is_mobile": False,
        "has_touch": False,
        "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36",
        "cpu_rate": 1,
        "latency_ms": 20,
        "download_bps": 40 * 1024 * 1024 / 8,
        "upload_bps": 10 * 1024 * 1024 / 8,
    },
}

# Existing approved read-only RPC surface used by the selected public routes.
READ_ONLY_RPCS = {
    "activity_pulse",
    "community_archive_reply_counts",
    "community_reply_counts",
    "community_share_count",
    "community_stream_projection",
    "convergence_meter",
    "entity_collective_count",
    "fn_all_methods",
    "fn_cross_research",
    "fn_maftech_decompose",
    "fn_method_value",
    "fn_name_protocol",
    "fn_name_research",
    "fn_name_research_graded",
    "fn_number_dossier",
    "fn_number_journey",
    "fn_number_lookup",
    "fn_value_phrase_list",
    "fn_zero_scale",
    "gematria_method_trace",
    "get_category_videos",
    "get_discoveries",
    "get_graph_bridges",
    "hot_posts_live",
    "is_number_indexable",
    "is_phrase_indexable",
    "journey_classic_seed",
    "journey_pulse",
    "lang_links_list",
    "map_anchor_family",
    "number_cross_resonance",
    "number_dossier_json",
    "number_map",
    "number_neighbors",
    "number_resonance_stats",
    "notification_prefs_guest_get_v1",
    "one_tree_stats",
    "popular_posts_by_comments",
    "posts_by_number_strict",
    "posts_harvested_for_number",
    "recent_number_opens",
    "relation_evidence_stats",
    "research_level_of",
    "researcher_reputation",
    "site_counts",
    "site_pulse_today",
    "strongest_crossings",
    "top_collective",
    "top_primary_values",
    "verified_bridges",
    "view_count",
    "was_scanned",
    "world_group_source_arrivals",
    "world_group_source_arrivals_v2",
}

ANALYTICS_HOST_FRAGMENTS = (
    "google-analytics.com",
    "googletagmanager.com",
    "googleadservices.com",
    "doubleclick.net",
    "clarity.ms",
    "facebook.com",
    "facebook.net",
    "vercel.live",
)

ANALYTICS_WRITE_RPCS = {
    "ingest_event",
    "track_visit",
    "log_journey_ab",
    "fn_log_name_research",
    "ai_log_analysis",
    "ai_signal",
    "record_feedback",
    "log_translit_query",
    "increment_post_share",
    "increment_post_share_by_slug",
    "award_share_credit",
    "link_identity",
    "link_visitor_identity",
}

CAPTURED_RESOURCE_TYPES = {
    "Document", "Script", "Stylesheet", "Fetch", "XHR", "Image", "Font"
}

SAFE_QUERY_KEYS = {
    "alt", "columns", "count", "download", "format", "head", "height",
    "limit", "offset", "on_conflict", "order", "or", "select", "slug", "tags", "v",
    "width",
}
SAFE_PATH_SEGMENTS = {
    ".vite", "2029.html", "app.js", "assets", "auth", "functions", "manifest.json",
    "number", "object", "post", "preview-build.json", "preview-readonly-sw.js", "public",
    "rest", "rpc", "site_flags", "storage", "sw.js", "topic", "v1", "world",
}
SENSITIVE_NAME_RE = re.compile(
    r"(?i)(?:^|[-_.])(access|api|auth|bearer|cookie|credential|key|password|refresh|secret|"
    r"session|sessionid|sig|signature|token|vercel_share)(?:$|[-_.])"
)
SECRET_PREFIX_RE = re.compile(
    r"(?i)^(?:sk|pk|rk|ghp|github_pat|xox[aboprs]|sb_publishable|sb_secret|eyj)[-_\.][A-Za-z0-9._~-]+$"
)
HEX_OR_UUID_RE = re.compile(r"(?i)^(?:[0-9a-f]{20,}|[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12})$")
NET_ERROR_RE = re.compile(r"net::(ERR_[A-Z0-9_]+)")
INVALID_PERCENT_RE = re.compile(r"%(?![0-9A-Fa-f]{2})")
FORBIDDEN_PERCENT_RE = re.compile(r"%(?:0[0-9A-Fa-f]|1[0-9A-Fa-f]|20|2[fF]|5[cC]|7[fF])")
ABSOLUTE_SCHEME_RE = re.compile(r"^[A-Za-z][A-Za-z0-9+.-]*:")
SAFE_REDIRECT_AUTHORITY_RE = re.compile(r"^[A-Za-z0-9.-]+(?::[0-9]{1,5})?$")
LEGACY_NUMERIC_HOST_RE = re.compile(
    r"(?i)^(?:0x[0-9a-f]+|0[0-7]+|[0-9]+)(?:\.(?:0x[0-9a-f]+|0[0-7]+|[0-9]+)){0,3}$"
)
IMMUTABLE_WAVE3_HOST_RE = re.compile(
    r"^sod1820-[a-z0-9]{8,32}-sod1820-s-projects\.vercel\.app$"
)
SAFE_ERROR_KINDS = {"console", "pageerror", "network", "runner", "auth"}
PRODUCTION_DB_ORIGINS = {"https://linswmnnkjxvweumprav.supabase.co"}
WAVE3_PREVIEW_OVERRIDES = ["lock_number"]
WAVE3_RECEIPT_FIELDS = {
    "commit", "buildTarget", "readOnly", "previewOverrides", "manifestSha256",
}
HOSTED_BOUNDARY_BLOCKER = (
    "BLOCKED_INPUT: hosted-service-worker-egress-boundary-contract-missing"
)


class TargetValidationError(ValueError):
    """Raised before credentials are read or a browser/server is launched."""


def _fingerprint(value, length=12):
    return hashlib.sha256(str(value).encode("utf-8", "replace")).hexdigest()[:length]


def _safe_scheme(value):
    scheme = (value or "").lower()
    return scheme if scheme in {"http", "https"} else None


def _looks_sensitive(value):
    decoded = unquote(str(value or ""))
    if not decoded:
        return False
    lowered = decoded.lower()
    if any(marker in lowered for marker in ("secret", "sessionid", "signature", "token")):
        return True
    if SENSITIVE_NAME_RE.search(decoded) or SECRET_PREFIX_RE.match(decoded) or HEX_OR_UUID_RE.match(decoded):
        return True
    if len(decoded) >= 32 and re.fullmatch(r"[A-Za-z0-9_~+/=-]+", decoded):
        return True
    return False


def _redacted_segment(segment):
    decoded = unquote(segment)
    suffix = pathlib.PurePosixPath(decoded).suffix
    safe_suffix = suffix.lower() if re.fullmatch(r"\.[a-z0-9]{1,8}", suffix.lower()) else ""
    return f"[segment-{_fingerprint(decoded)}]{safe_suffix}"


def sanitize_path(path):
    """Keep only narrow structural literals; fingerprint every other segment."""
    raw = path or "/"
    leading = raw.startswith("/")
    trailing = raw.endswith("/") and raw != "/"
    output = []
    for segment in raw.split("/"):
        if not segment:
            continue
        decoded = unquote(segment)
        if re.fullmatch(r"\[segment-[0-9a-f]{12}\](?:\.[a-z0-9]{1,8})?", decoded):
            output.append(decoded)
        elif decoded in SAFE_PATH_SEGMENTS:
            output.append(quote(decoded, safe="-._~()@+"))
        else:
            output.append(_redacted_segment(segment))
    sanitized = ("/" if leading else "") + "/".join(output)
    if trailing and sanitized:
        sanitized += "/"
    return sanitized or "/"


def sanitize_query_key(key):
    decoded = unquote(str(key or ""))
    if re.fullmatch(r"\[(?:redacted-key|key)-[0-9a-f]{12}\]", decoded):
        return decoded
    lowered = decoded.lower()
    if lowered in SAFE_QUERY_KEYS and not SENSITIVE_NAME_RE.search(decoded):
        return decoded
    if _looks_sensitive(decoded):
        return f"[redacted-key-{_fingerprint(decoded)}]"
    return f"[key-{_fingerprint(decoded)}]"


def sanitize_query_keys(query_or_pairs):
    if isinstance(query_or_pairs, str):
        pairs = parse_qsl(query_or_pairs, keep_blank_values=True)
    else:
        pairs = list(query_or_pairs or [])
    return sorted({sanitize_query_key(key) for key, _ in pairs})


def sanitize_host(host):
    value = (host or "").lower().rstrip(".")
    if not value:
        return ""
    return f"host-{_fingerprint(value, 16)}"


def sanitize_url(url, path_only=False):
    """Return only HTTP(S) route identity; discard values, credentials and fragments."""
    if not url:
        return ""
    try:
        parsed = urlparse(str(url))
    except ValueError:
        return "[invalid-url]"
    safe_query = "&".join(sanitize_query_keys(parsed.query))
    path = sanitize_path(parsed.path or "/")
    if path_only or (not parsed.scheme and not parsed.netloc):
        return urlunparse(("", "", path, "", safe_query, ""))
    scheme = _safe_scheme(parsed.scheme)
    if not scheme:
        return "[unsupported-url]"
    host = sanitize_host(parsed.hostname)
    try:
        port = parsed.port
    except ValueError:
        port = None
    if port and not ((scheme == "https" and port == 443) or (scheme == "http" and port == 80)):
        host = f"{host}:{port}"
    return urlunparse((scheme, host, path, "", safe_query, ""))


def diagnostic_code(value):
    text = str(value or "")
    net_error = NET_ERROR_RE.search(text)
    if net_error:
        return net_error.group(1).lower().replace("_", "-")
    lowered = text.lower()
    if "timeout" in lowered:
        return "timeout"
    if "closed" in lowered or "destroyed" in lowered:
        return "target-closed"
    if "navigation" in lowered:
        return "navigation-failed"
    return "runtime-error"


def sanitize_diagnostic_text(value):
    """Compatibility helper: emit a category/fingerprint, never free error text."""
    return f"{diagnostic_code(value)}:{_fingerprint(value)}"


def safe_error(kind, value):
    safe_kind = kind if kind in SAFE_ERROR_KINDS else "runner"
    return {
        "kind": safe_kind,
        "code": diagnostic_code(value),
        "fingerprint_sha256": hashlib.sha256(str(value or "").encode("utf-8", "replace")).hexdigest(),
    }


def runner_sha256():
    return hashlib.sha256(pathlib.Path(__file__).read_bytes()).hexdigest()


def dist_receipt(path):
    if not path:
        return None
    return {
        "path_sha256": hashlib.sha256(
            str(pathlib.Path(path).resolve()).encode("utf-8", "replace")
        ).hexdigest()
    }


def boundary_policy_receipt(db_origins, production_db_acknowledged):
    """Describe the enforced boundary without retaining any destination hostname."""
    return {
        "installed_before_navigation": True,
        "allowed_methods": ["GET", "HEAD", "OPTIONS"],
        "allowed_post_rpcs": sorted(READ_ONLY_RPCS),
        "policy": "default-deny-exact-arm-origin",
        "db_origin_fingerprints": sorted(
            hashlib.sha256(origin_value.encode("utf-8")).hexdigest()
            for origin_value in db_origins
        ),
        "production_db_explicitly_acknowledged": bool(production_db_acknowledged),
        "analytics_host_fingerprints": sorted(
            hashlib.sha256(host_value.encode("utf-8")).hexdigest()
            for host_value in ANALYTICS_HOST_FRAGMENTS
        ),
        "service_workers": "allowed-for-canonical-wave3-artifact",
        "service_worker_external_egress_boundary": "missing-hosted-execution-blocked",
        "websockets": "blocked",
    }


def _host_with_port(parsed, scheme):
    host = (parsed.hostname or "").lower()
    if ":" in host and not host.startswith("["):
        host = f"[{host}]"
    try:
        port = parsed.port
    except ValueError as exc:
        raise TargetValidationError("target-port-invalid") from exc
    if port is not None and not 1 <= port <= 65535:
        raise TargetValidationError("target-port-out-of-range")
    if port is not None and not ((scheme == "https" and port == 443) or (scheme == "http" and port == 80)):
        host = f"{host}:{port}"
    return host


def is_loopback_host(host):
    value = (host or "").lower().rstrip(".")
    if value == "localhost":
        return True
    try:
        return ipaddress.ip_address(value).is_loopback
    except ValueError:
        return False


def normalize_origin(value, *, allow_loopback_http=False, label="origin"):
    """Normalize an origin and reject paths, credentials, query values and unsafe schemes."""
    if not value or not isinstance(value, str):
        raise TargetValidationError(f"{label}-missing")
    if any(ord(character) > 127 or ord(character) < 33 for character in value):
        raise TargetValidationError(f"{label}-ascii-origin-required")
    try:
        parsed = urlparse(value)
        scheme = _safe_scheme(parsed.scheme)
        host = (parsed.hostname or "").lower()
    except ValueError as exc:
        raise TargetValidationError(f"{label}-invalid") from exc
    if not scheme or not host:
        raise TargetValidationError(f"{label}-must-be-http-origin")
    if parsed.username is not None or parsed.password is not None:
        raise TargetValidationError(f"{label}-credentials-forbidden")
    if parsed.query or parsed.fragment or parsed.params or parsed.path not in {"", "/"}:
        raise TargetValidationError(f"{label}-must-not-contain-path-query-or-fragment")
    if host.endswith("."):
        raise TargetValidationError(f"{label}-trailing-dot-forbidden")
    if "%" in host:
        raise TargetValidationError(f"{label}-scoped-ip-forbidden")
    try:
        parsed_ip = ipaddress.ip_address(host)
    except ValueError:
        parsed_ip = None
    if parsed_ip is not None:
        if isinstance(parsed_ip, ipaddress.IPv6Address) and parsed_ip.ipv4_mapped is not None:
            raise TargetValidationError(f"{label}-mapped-ipv6-forbidden")
        if host != parsed_ip.compressed.lower():
            raise TargetValidationError(f"{label}-noncanonical-ip-literal")
    else:
        if LEGACY_NUMERIC_HOST_RE.fullmatch(host):
            raise TargetValidationError(f"{label}-legacy-numeric-host-forbidden")
        labels = host.split(".")
        if any(
            not label_part
            or len(label_part) > 63
            or not re.fullmatch(r"[a-z0-9](?:[a-z0-9-]*[a-z0-9])?", label_part)
            for label_part in labels
        ):
            raise TargetValidationError(f"{label}-ascii-host-invalid")
        if host != "localhost" and (len(labels) < 2 or labels[-1].isdigit()):
            raise TargetValidationError(f"{label}-dns-name-not-canonical")
    if scheme != "https" and not (allow_loopback_http and is_loopback_host(host)):
        raise TargetValidationError(f"{label}-https-required")
    return f"{scheme}://{_host_with_port(parsed, scheme)}"


def request_origin(url):
    try:
        parsed = urlparse(str(url or ""))
        scheme = _safe_scheme(parsed.scheme)
        hostname = parsed.hostname
    except ValueError:
        return None
    if not scheme or not hostname or parsed.username is not None or parsed.password is not None:
        return None
    try:
        return f"{scheme}://{_host_with_port(parsed, scheme)}"
    except TargetValidationError:
        return None


def build_parser():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dist")
    parser.add_argument("--origin")
    parser.add_argument("--auth-origin")
    parser.add_argument("--share-token-stdin", action="store_true")
    parser.add_argument("--origin-b")
    parser.add_argument("--auth-origin-b")
    parser.add_argument("--share-token-b-stdin", action="store_true")
    parser.add_argument("--sha-b")
    parser.add_argument("--samples-per-arm", type=int)
    parser.add_argument("--ab-first", choices=("a", "b"), default="a")
    parser.add_argument(
        "--allow-preview-origin", action="append", default=[], metavar="HTTPS_ORIGIN",
        help="exact hosted Preview origin; repeat for each A/B arm",
    )
    parser.add_argument(
        "--allow-db-origin", action="append", default=[], metavar="HTTPS_ORIGIN",
        help="exact read-only database origin; Production is rejected unless separately acknowledged",
    )
    parser.add_argument("--allow-production-db", action="store_true")
    parser.add_argument("--output", required=True)
    parser.add_argument("--sha", required=True)
    return parser


def _validate_sha(value, label):
    if not re.fullmatch(r"[0-9a-fA-F]{40}", value or ""):
        raise TargetValidationError(f"{label}-must-be-exact-40-hex-commit")
    return value.lower()


def validate_immutable_wave3_origin(origin, label="origin"):
    parsed = urlparse(origin)
    if parsed.port is not None and parsed.port != 443:
        raise TargetValidationError(f"{label}-immutable-deployment-port-forbidden")
    if not IMMUTABLE_WAVE3_HOST_RE.fullmatch(parsed.hostname or ""):
        raise TargetValidationError(f"{label}-immutable-wave3-deployment-host-required")
    return origin


def validate_target_shape(args):
    """Validate all target structure without declaring hosted egress safe."""
    if bool(args.dist) == bool(args.origin):
        raise TargetValidationError("provide-exactly-one-dist-or-origin")
    ab_mode = bool(args.origin_b)
    if ab_mode and (args.dist or not args.sha_b):
        raise TargetValidationError("ab-requires-origin-origin-b-sha-b")
    if args.sha_b and not ab_mode:
        raise TargetValidationError("sha-b-requires-origin-b")
    if args.dist and any((args.auth_origin, args.auth_origin_b, args.share_token_stdin, args.share_token_b_stdin)):
        raise TargetValidationError("local-dist-does-not-accept-preview-auth")
    if args.origin_b is None and any((args.auth_origin_b, args.share_token_b_stdin)):
        raise TargetValidationError("arm-b-auth-requires-origin-b")
    if bool(args.auth_origin) != bool(args.share_token_stdin):
        raise TargetValidationError("arm-a-auth-and-token-stdin-must-be-paired")
    if bool(args.auth_origin_b) != bool(args.share_token_b_stdin):
        raise TargetValidationError("arm-b-auth-and-token-stdin-must-be-paired")

    samples_per_arm = args.samples_per_arm if args.samples_per_arm is not None else (7 if ab_mode else 3)
    if samples_per_arm < 1:
        raise TargetValidationError("samples-per-arm-must-be-positive")
    if ab_mode and samples_per_arm < 7:
        raise TargetValidationError("ab-requires-at-least-seven-samples-per-arm")

    exact_preview_origins = {
        normalize_origin(value, label="allow-preview-origin") for value in args.allow_preview_origin
    }
    db_origins = {
        normalize_origin(value, label="allow-db-origin") for value in args.allow_db_origin
    }
    production_db_requested = bool(db_origins & PRODUCTION_DB_ORIGINS)
    if production_db_requested and not args.allow_production_db:
        raise TargetValidationError("production-db-origin-requires-explicit-acknowledgement")
    if args.allow_production_db and not production_db_requested:
        raise TargetValidationError("production-db-acknowledgement-without-exact-origin")
    if exact_preview_origins & PRODUCTION_DB_ORIGINS:
        raise TargetValidationError("production-db-cannot-be-preview-origin")
    for preview_origin in exact_preview_origins:
        validate_immutable_wave3_origin(preview_origin, "allow-preview-origin")

    arms = {}
    if args.dist:
        arms["a"] = {
            "origin": None,
            "auth_origin": None,
            "sha": _validate_sha(args.sha, "sha"),
        }
    else:
        origin_a = normalize_origin(args.origin, label="origin")
        validate_immutable_wave3_origin(origin_a, "origin")
        if origin_a not in exact_preview_origins:
            raise TargetValidationError("origin-not-in-exact-preview-allowlist")
        auth_a = normalize_origin(args.auth_origin, label="auth-origin") if args.auth_origin else None
        if auth_a and auth_a != origin_a:
            raise TargetValidationError("auth-origin-a-must-equal-arm-origin")
        arms["a"] = {
            "origin": origin_a,
            "auth_origin": auth_a,
            "sha": _validate_sha(args.sha, "sha"),
        }
        if ab_mode:
            origin_b = normalize_origin(args.origin_b, label="origin-b")
            validate_immutable_wave3_origin(origin_b, "origin-b")
            if origin_b not in exact_preview_origins:
                raise TargetValidationError("origin-b-not-in-exact-preview-allowlist")
            auth_b = normalize_origin(args.auth_origin_b, label="auth-origin-b") if args.auth_origin_b else None
            if auth_b and auth_b != origin_b:
                raise TargetValidationError("auth-origin-b-must-equal-arm-origin")
            if origin_b == origin_a:
                raise TargetValidationError("ab-arm-origins-must-be-distinct")
            if _validate_sha(args.sha_b, "sha-b") == arms["a"]["sha"]:
                raise TargetValidationError("ab-arm-shas-must-be-distinct")
            arms["b"] = {
                "origin": origin_b,
                "auth_origin": auth_b,
                "sha": _validate_sha(args.sha_b, "sha-b"),
            }

    arm_origins = {config["origin"] for config in arms.values() if config.get("origin")}
    if exact_preview_origins != arm_origins:
        raise TargetValidationError("preview-allowlist-must-match-arms-exactly")
    if arm_origins & PRODUCTION_DB_ORIGINS:
        raise TargetValidationError("production-db-cannot-be-arm-or-auth-origin")
    if arm_origins & db_origins:
        raise TargetValidationError("arm-and-db-origin-sets-must-be-disjoint")

    return {
        "ab_mode": ab_mode,
        "samples_per_arm": samples_per_arm,
        "arms": arms,
        "db_origins": db_origins,
        "exact_preview_origins": exact_preview_origins,
    }


def validate_targets(args):
    """Validate before secrets/launch and fail hosted execution closed."""
    config = validate_target_shape(args)
    if not args.dist:
        raise TargetValidationError(HOSTED_BOUNDARY_BLOCKER)
    return config


def prepare_execution(args, token_reader=None):
    """Security ordering: target validation completes before the first token read."""
    config = validate_targets(args)
    reader = token_reader or sys.stdin.readline
    tokens = {
        "a": reader().strip() if args.share_token_stdin else None,
        "b": reader().strip() if args.share_token_b_stdin else None,
    }
    for arm, token in tokens.items():
        if ((arm == "a" and args.share_token_stdin) or (arm == "b" and args.share_token_b_stdin)) and not token:
            raise TargetValidationError(f"arm-{arm}-share-token-empty")
    return config, tokens


def build_ab_order(samples_per_arm, first_arm="a"):
    """Counterbalance each complete pair deterministically: AB, BA, AB ... ."""
    if samples_per_arm < 1:
        raise ValueError("samples_per_arm must be positive")
    if first_arm not in {"a", "b"}:
        raise ValueError("first_arm must be 'a' or 'b'")
    other = "b" if first_arm == "a" else "a"
    order = []
    arm_samples = {"a": 0, "b": 0}
    for pair in range(1, samples_per_arm + 1):
        pair_order = (first_arm, other) if pair % 2 else (other, first_arm)
        for position, arm in enumerate(pair_order, start=1):
            arm_samples[arm] += 1
            order.append({
                "arm": arm,
                "sample": arm_samples[arm],
                "pair": pair,
                "pair_position": position,
            })
    return order


def resolve_spa_candidate(root, request_path):
    root_resolved = pathlib.Path(root).resolve()
    fallback = (root_resolved / "2029.html").resolve()
    try:
        fallback.relative_to(root_resolved)
    except ValueError:
        return root_resolved / ".invalid-spa-fallback"
    route_path = unquote(urlparse(request_path).path)
    rel = route_path.lstrip("/")
    candidate = (root_resolved / rel).resolve()
    if route_path == "/":
        candidate = fallback
    else:
        try:
            candidate.relative_to(root_resolved)
            inside_root = True
        except ValueError:
            inside_root = False
        if not inside_root or not candidate.is_file():
            candidate = fallback
    return candidate


class GzipSpaHandler(http.server.BaseHTTPRequestHandler):
    root: pathlib.Path = pathlib.Path(".")
    cache = {}

    def log_message(self, fmt, *args):
        return

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS")
        self.end_headers()

    def do_HEAD(self):
        self._serve(False)

    def do_GET(self):
        self._serve(True)

    def _serve(self, send_body):
        route_path = unquote(urlparse(self.path).path)
        candidate = resolve_spa_candidate(self.root, self.path)
        if not candidate.is_file():
            self.send_error(404)
            return
        key = str(candidate)
        if key not in self.cache:
            raw = candidate.read_bytes()
            mime = mimetypes.guess_type(candidate.name)[0] or "application/octet-stream"
            compress = mime.startswith("text/") or mime in {
                "application/javascript", "text/javascript", "application/json", "image/svg+xml"
            }
            body = gzip.compress(raw, compresslevel=6) if compress else raw
            self.cache[key] = (body, mime, compress)
        body, mime, compressed = self.cache[key]
        self.send_response(200)
        self.send_header("Content-Type", mime)
        self.send_header("Content-Length", str(len(body)))
        if compressed:
            self.send_header("Content-Encoding", "gzip")
        self.send_header("Cache-Control", "public, max-age=31536000, immutable" if "/assets/" in route_path else "public, max-age=0, must-revalidate")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        if send_body:
            self.wfile.write(body)


INIT_SCRIPT = r"""
(() => {
  const state = window.__sodPerf = {base: 0, lcp: [], shifts: [], longtasks: [], paints: []};
  window.__sodPerfReset = (base = performance.now()) => {
    state.base = base;
    state.lcp = [];
    state.shifts = [];
    state.longtasks = [];
    state.paints = [];
  };
  new PerformanceObserver(list => {
    for (const e of list.getEntries()) if (e.startTime >= state.base) state.lcp.push({
      startTime: e.startTime - state.base,
      renderTime: Math.max(0, (e.renderTime || 0) - state.base),
      loadTime: Math.max(0, (e.loadTime || 0) - state.base),
      size: e.size || 0,
      url: e.url || null,
      tag: e.element?.tagName || null,
    });
  }).observe({type: 'largest-contentful-paint', buffered: true});
  new PerformanceObserver(list => {
    for (const e of list.getEntries()) if (e.startTime >= state.base) state.shifts.push({
      startTime: e.startTime - state.base,
      value: e.value,
      hadRecentInput: e.hadRecentInput,
    });
  }).observe({type: 'layout-shift', buffered: true});
  try {
    new PerformanceObserver(list => {
      for (const e of list.getEntries()) if (e.startTime >= state.base) state.longtasks.push({
        startTime: e.startTime - state.base,
        duration: e.duration,
      });
    }).observe({type: 'longtask', buffered: true});
  } catch {}
  try {
    new PerformanceObserver(list => {
      for (const e of list.getEntries()) if (e.startTime >= state.base) state.paints.push({name:e.name,startTime:e.startTime-state.base});
    }).observe({type: 'paint', buffered: true});
  } catch {}
})();
"""


READY_FUNCTION = r"""
({kind, slug}) => {
  const rendered = el => !!el && !!el.getClientRects().length && (() => {
    const s = getComputedStyle(el);
    return s.visibility !== 'hidden' && s.display !== 'none' && Number(s.opacity) >= 0.05
      && !el.closest('[aria-busy="true"], [aria-hidden="true"], .h29-skel, .dg29-skeleton, .is-loading');
  })();
  const text = el => rendered(el) && !!el.innerText?.trim();
  if (kind === 'home') {
    const home = document.querySelector('[data-experience-capability="home-composition"]');
    if (!rendered(home)) return false;
    if (home.dataset.h29Primary === 'content' || home.dataset.h29Primary === 'ready') {
      return text(home.querySelector('h1')) || text(home.querySelector('.h29-card-t'));
    }
    return false;
  }
  if (kind === 'world') {
    const feature = document.querySelector('[data-flight-story="world"] .sod29-flight-feature');
    return rendered(feature) && text(feature.querySelector('h2')) && text(feature.querySelector('.sod29-flight-meta'))
      && rendered(feature.querySelector('.sod29-actions button'));
  }
  if (kind === 'post') {
    const post = document.querySelector('[data-experience-capability="post-master-reading-stage"]');
    return rendered(post) && post.dataset.postSlug === slug && text(post.querySelector('h1'))
      && text(post.querySelector('.sod29-reading-source'));
  }
  if (kind === 'number718') {
    const core = document.querySelector('[data-number-core-root="718"]');
    return rendered(core) && text(core.querySelector('.sod29-number-value'))
      && text(core.querySelector('.sod29-number-v10-expression-line'))
      && text(core.querySelector('[data-experience-capability="number-regular-expressions"]'));
  }
  return false;
}
"""


METRICS_FUNCTION = r"""
() => {
  const s = window.__sodPerf;
  const clean = s.shifts.filter(e => !e.hadRecentInput).sort((a,b) => a.startTime-b.startTime);
  let cls = 0, value = 0, first = 0, previous = 0;
  for (const e of clean) {
    if (value > 0 && e.startTime - previous < 1000 && e.startTime - first < 5000) value += e.value;
    else { first = e.startTime; value = e.value; }
    previous = e.startTime;
    cls = Math.max(cls, value);
  }
  const lastLcp = s.lcp.length ? s.lcp[s.lcp.length - 1] : null;
  return {
    lcp_ms: lastLcp?.startTime ?? null,
    lcp_element: lastLcp,
    cls,
    layout_shift_sum: clean.reduce((n,e) => n + e.value, 0),
    layout_shift_sum_all: s.shifts.reduce((n,e) => n + e.value, 0),
    long_task_count: s.longtasks.length,
    long_task_total_ms: s.longtasks.reduce((n,e) => n + e.duration, 0),
    long_task_max_ms: s.longtasks.length ? Math.max(...s.longtasks.map(e => e.duration)) : 0,
    long_tasks: s.longtasks,
    paints: s.paints,
  };
}
"""


def classify_blocked(url, method):
    parsed = urlparse(url)
    host = parsed.hostname or ""
    path = parsed.path
    rpc_name = path.rsplit("/", 1)[-1] if "/rest/v1/rpc/" in path else None
    if any(fragment in host for fragment in ANALYTICS_HOST_FRAGMENTS):
        return "analytics"
    if rpc_name in ANALYTICS_WRITE_RPCS:
        return "analytics_write"
    if "/auth/v1/" in path:
        return "identity_write"
    if "/rest/v1/" in path or "/storage/v1/" in path:
        return "product_write"
    return "other_write"


def rpc_name_from_url(url):
    path = urlparse(url).path
    if "/rest/v1/rpc/" not in path:
        return None
    return path.rsplit("/", 1)[-1]


def network_decision(url, method, arm_origin, db_origins):
    """Default-deny decision for page traffic; returns no raw URL material."""
    try:
        parsed = urlparse(str(url or ""))
    except ValueError:
        return False, "unsupported-scheme-or-origin", "invalid", None
    scheme = _safe_scheme(parsed.scheme)
    normalized_request_origin = request_origin(url)
    normalized_method = str(method or "").upper()
    if not scheme or not normalized_request_origin:
        return False, "unsupported-scheme-or-origin", "invalid", None

    if normalized_request_origin == arm_origin:
        if normalized_method in {"GET", "HEAD", "OPTIONS"}:
            return True, "arm-read", "arm", None
        return False, classify_blocked(url, normalized_method), "arm", None

    if normalized_request_origin in db_origins:
        path = parsed.path or "/"
        rpc_name = rpc_name_from_url(url)
        if "/auth/v1/" in path:
            return False, "identity", "db", None
        if normalized_method in {"GET", "HEAD", "OPTIONS"} and (
            path.startswith("/rest/v1/") or path.startswith("/storage/v1/object/public/")
        ):
            return True, "db-read", "db", None
        if normalized_method == "POST" and rpc_name in READ_ONLY_RPCS:
            return True, "approved-read-only-rpc", "db", rpc_name
        return False, classify_blocked(url, normalized_method), "db", (
            rpc_name if rpc_name in READ_ONLY_RPCS | ANALYTICS_WRITE_RPCS else None
        )

    host = parsed.hostname or ""
    if any(fragment in host for fragment in ANALYTICS_HOST_FRAGMENTS):
        return False, "analytics", "external", None
    return False, "origin-not-allowlisted", "external", None


def blocked_receipt(url, method, category, destination, rpc_name=None):
    try:
        parsed = urlparse(str(url or ""))
    except ValueError:
        parsed = urlparse("")
    scheme = _safe_scheme(parsed.scheme)
    safe_method = str(method or "").upper()
    if safe_method not in {"GET", "HEAD", "OPTIONS", "POST", "PUT", "PATCH", "DELETE"}:
        safe_method = "OTHER"
    output = {
        "scheme": scheme,
        "method": safe_method,
        "category": category,
        "destination": destination,
        "path_sha256": hashlib.sha256((parsed.path or "/").encode("utf-8", "replace")).hexdigest(),
        "request_sha256": hashlib.sha256(
            f"{request_origin(url) or 'invalid-origin'}\n{parsed.path or '/'}".encode("utf-8", "replace")
        ).hexdigest(),
        "query_keys": sanitize_query_keys(parsed.query),
    }
    if destination == "external":
        output["origin_sha256"] = hashlib.sha256(
            (request_origin(url) or "invalid-origin").encode("utf-8", "replace")
        ).hexdigest()
    if rpc_name in READ_ONLY_RPCS | ANALYTICS_WRITE_RPCS:
        output["rpc"] = rpc_name
    return output


def validate_same_origin_redirect(arm_origin, current_url, location):
    """Accept only parser-stable ASCII HTTPS/origin-relative redirect forms."""
    del current_url  # Relative-path resolution is intentionally not supported.
    if not location or not isinstance(location, str):
        raise TargetValidationError("preview-auth-redirect-location-missing")
    if len(location) > 4096:
        raise TargetValidationError("preview-auth-redirect-location-too-long")
    if any(ord(character) < 33 or ord(character) == 127 or ord(character) > 126 for character in location):
        raise TargetValidationError("preview-auth-redirect-ascii-visible-only")
    if "\\" in location:
        raise TargetValidationError("preview-auth-redirect-backslash-forbidden")
    if INVALID_PERCENT_RE.search(location):
        raise TargetValidationError("preview-auth-redirect-invalid-percent-encoding")
    if FORBIDDEN_PERCENT_RE.search(location):
        raise TargetValidationError("preview-auth-redirect-encoded-delimiter-or-control")
    if "#" in location:
        raise TargetValidationError("preview-auth-redirect-fragment-forbidden")

    if location.startswith("/"):
        if location.startswith("//"):
            raise TargetValidationError("preview-auth-scheme-relative-redirect-blocked")
        target = arm_origin + location
    elif location.lower().startswith("https://"):
        authority = location[8:].split("/", 1)[0].split("?", 1)[0]
        if not authority or "@" in authority or "%" in authority:
            raise TargetValidationError("preview-auth-redirect-authority-invalid")
        if not SAFE_REDIRECT_AUTHORITY_RE.fullmatch(authority):
            raise TargetValidationError("preview-auth-redirect-authority-ambiguous")
        target = location
    elif ABSOLUTE_SCHEME_RE.match(location):
        raise TargetValidationError("preview-auth-redirect-scheme-ambiguous")
    else:
        raise TargetValidationError("preview-auth-redirect-must-be-origin-relative-or-absolute-https")

    try:
        parsed = urlsplit(target)
        target_origin = normalize_origin(
            f"{parsed.scheme}://{parsed.netloc}", label="preview-auth-redirect-origin"
        )
    except (TargetValidationError, ValueError) as exc:
        raise TargetValidationError("preview-auth-redirect-parse-rejected") from exc
    if parsed.scheme.lower() != "https" or target_origin != arm_origin:
        raise TargetValidationError("preview-auth-cross-origin-redirect-blocked")
    return target


async def authenticate_preview(context, arm_origin, share_token, max_hops=5):
    """Prime a Preview cookie while refusing every cross-origin redirect."""
    current_url = arm_origin.rstrip("/") + "/?" + urlencode({"_vercel_share": share_token})
    for _ in range(max_hops + 1):
        response = await context.request.get(current_url, max_redirects=0, timeout=30000)
        if 300 <= response.status < 400:
            current_url = validate_same_origin_redirect(
                arm_origin, current_url, response.headers.get("location")
            )
            continue
        if not response.ok:
            raise RuntimeError(f"protected-preview-auth-http-{int(response.status)}")
        return
    raise RuntimeError("protected-preview-auth-redirect-limit")


async def fetch_direct_artifact(
    context, arm_origin, path, expected_content_types, maximum_bytes, label,
):
    """Fetch one canonical artifact directly; redirects and SPA fallbacks are invalid."""
    target = arm_origin + path
    response = await context.request.get(target, max_redirects=0, timeout=30000)
    if 300 <= response.status < 400:
        raise RuntimeError(f"{label}-redirect-forbidden")
    if response.status != 200:
        raise RuntimeError(f"{label}-http-{int(response.status)}")
    response_url = getattr(response, "url", target)
    if response_url != target:
        raise RuntimeError(f"{label}-response-url-mismatch")
    content_type = str(response.headers.get("content-type") or "").split(";", 1)[0].strip().lower()
    if content_type not in expected_content_types:
        raise RuntimeError(f"{label}-content-type-invalid")
    content_length = response.headers.get("content-length")
    if content_length:
        try:
            parsed_length = int(content_length)
        except ValueError as exc:
            raise RuntimeError(f"{label}-content-length-invalid") from exc
        if parsed_length < 0 or parsed_length > maximum_bytes:
            raise RuntimeError(f"{label}-too-large")
    payload = await response.body()
    if len(payload) > maximum_bytes:
        raise RuntimeError(f"{label}-too-large")
    return payload


async def verify_build_identity(context, arm_origin, expected_sha):
    """Verify the complete same-origin Wave3 artifact identity."""
    validate_immutable_wave3_origin(arm_origin, "artifact-origin")
    payload = await fetch_direct_artifact(
        context, arm_origin, "/preview-build.json", {"application/json"}, 16384,
        "preview-build-receipt",
    )
    try:
        receipt = json.loads(payload.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise RuntimeError("preview-build-receipt-json-invalid") from exc
    if not isinstance(receipt, dict):
        raise RuntimeError("preview-build-receipt-shape-invalid")
    if set(receipt) != WAVE3_RECEIPT_FIELDS:
        raise RuntimeError("preview-build-receipt-fields-invalid")
    commit = receipt.get("commit")
    manifest_sha256 = receipt.get("manifestSha256")
    if not isinstance(commit, str) or not re.fullmatch(r"[0-9a-f]{40}", commit):
        raise RuntimeError("preview-build-receipt-commit-invalid")
    if commit != expected_sha:
        raise RuntimeError("preview-build-receipt-commit-mismatch")
    if receipt.get("buildTarget") != "2029" or receipt.get("readOnly") is not True:
        raise RuntimeError("preview-build-receipt-contract-invalid")
    if receipt.get("previewOverrides") != WAVE3_PREVIEW_OVERRIDES:
        raise RuntimeError("preview-build-receipt-preview-overrides-invalid")
    if not isinstance(manifest_sha256, str) or not re.fullmatch(r"[0-9a-f]{64}", manifest_sha256):
        raise RuntimeError("preview-build-receipt-manifest-invalid")

    manifest_payload = await fetch_direct_artifact(
        context, arm_origin, "/.vite/manifest.json", {"application/json"}, 2 * 1024 * 1024,
        "preview-manifest",
    )
    observed_manifest_sha256 = hashlib.sha256(manifest_payload).hexdigest()
    if observed_manifest_sha256 != manifest_sha256:
        raise RuntimeError("preview-manifest-digest-mismatch")
    try:
        manifest = json.loads(manifest_payload.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise RuntimeError("preview-manifest-json-invalid") from exc
    if not isinstance(manifest, dict) or not manifest:
        raise RuntimeError("preview-manifest-shape-invalid")

    html_payload = await fetch_direct_artifact(
        context, arm_origin, "/2029.html", {"text/html"}, 2 * 1024 * 1024,
        "preview-html",
    )
    worker_payload = await fetch_direct_artifact(
        context, arm_origin, "/preview-readonly-sw.js",
        {"application/javascript", "text/javascript", "application/x-javascript"},
        512 * 1024, "preview-worker",
    )
    sw_alias_payload = await fetch_direct_artifact(
        context, arm_origin, "/sw.js",
        {"application/javascript", "text/javascript", "application/x-javascript"},
        512 * 1024, "preview-worker-alias",
    )
    if worker_payload != sw_alias_payload:
        raise RuntimeError("preview-worker-alias-digest-mismatch")
    required_worker_markers = (
        b"self.addEventListener('fetch'", b"X-Preview-Write-Blocked",
        b"preview_read_only", b"notification_prefs_guest_get_v1",
    )
    if any(marker not in worker_payload for marker in required_worker_markers):
        raise RuntimeError("preview-worker-contract-invalid")

    html_sha256 = hashlib.sha256(html_payload).hexdigest()
    worker_sha256 = hashlib.sha256(worker_payload).hexdigest()
    artifact_digest_sha256 = hashlib.sha256(json.dumps({
        "commit": commit,
        "manifest_sha256": manifest_sha256,
        "html_sha256": html_sha256,
        "worker_sha256": worker_sha256,
        "preview_overrides": WAVE3_PREVIEW_OVERRIDES,
    }, sort_keys=True, separators=(",", ":")).encode("utf-8")).hexdigest()
    return {
        "verified": True,
        "source": "same-origin-wave3-artifact-v2",
        "commit": commit,
        "build_target": "2029",
        "read_only": True,
        "preview_overrides": list(WAVE3_PREVIEW_OVERRIDES),
        "manifest_sha256": manifest_sha256,
        "html_sha256": html_sha256,
        "worker_sha256": worker_sha256,
        "artifact_digest_sha256": artifact_digest_sha256,
        "immutable_deployment_host_verified": True,
        "deployment_host_fingerprint": _fingerprint(urlparse(arm_origin).hostname, 16),
    }


async def preflight_build_identity(browser, arm_origin, expected_sha, auth_origin=None, share_token=None):
    context = await browser.new_context(
        ignore_https_errors=False,
        service_workers="block",
    )
    try:
        if auth_origin and share_token:
            if auth_origin != arm_origin:
                raise TargetValidationError("auth-origin-must-equal-arm-origin")
            await authenticate_preview(context, arm_origin, share_token)
        return await verify_build_identity(context, arm_origin, expected_sha)
    finally:
        await context.close()


def validate_main_document_response(response, expected_url, page_url):
    """Require one direct canonical 200 HTML document without a redirect chain."""
    if response is None:
        raise RuntimeError("main-document-response-missing")
    if response.status != 200:
        raise RuntimeError(f"main-document-http-{int(response.status)}")
    if getattr(response, "url", None) != expected_url or page_url != expected_url:
        raise RuntimeError("main-document-canonical-url-mismatch")
    request = getattr(response, "request", None)
    redirected_from = getattr(request, "redirected_from", None) if request is not None else None
    if callable(redirected_from):
        redirected_from = redirected_from()
    if redirected_from is not None:
        raise RuntimeError("main-document-redirect-forbidden")
    content_type = str(response.headers.get("content-type") or "").split(";", 1)[0].strip().lower()
    if content_type != "text/html":
        raise RuntimeError("main-document-content-type-invalid")
    return {
        "verified": True,
        "status": 200,
        "content_type": "text/html",
        "path": sanitize_url(expected_url, path_only=True),
        "redirected": False,
    }


def validate_internal_navigation_documents(responses, expected_url, page_url):
    """Record SPA navigation or validate the one main-frame document it caused."""
    if page_url != expected_url:
        raise RuntimeError("internal-navigation-canonical-url-mismatch")
    if not responses:
        return {
            "mode": "spa-no-document-navigation",
            "document_navigation_count": 0,
            "canonical_url_verified": True,
        }
    if len(responses) != 1:
        raise RuntimeError("internal-navigation-document-count-invalid")
    return {
        "mode": "main-document-navigation",
        "document_navigation_count": 1,
        "document": validate_main_document_response(
            responses[0], expected_url, page_url
        ),
    }


async def verify_post_journey_identity(
    context, arm_origin, expected_sha, required, identity_before,
):
    if not required:
        return None
    identity_after = await verify_build_identity(context, arm_origin, expected_sha)
    if identity_before != identity_after:
        raise RuntimeError("wave3-artifact-identity-changed-during-journey")
    return identity_after


def initiator_summary(initiator):
    initiator = initiator or {}
    frame = None
    stack = initiator.get("stack") or {}
    call_frames = stack.get("callFrames") or []
    if call_frames:
        frame = call_frames[0]
    source_url = initiator.get("url") or (frame or {}).get("url")
    raw_type = initiator.get("type", "other")
    output = {"type": raw_type if raw_type in {"parser", "script", "preload", "preflight", "other"} else "other"}
    if source_url:
        try:
            parsed_source = urlparse(source_url)
            source_path = parsed_source.path or "/"
        except ValueError:
            source_path = "invalid-path"
        output["origin_fingerprint"] = _fingerprint(request_origin(source_url) or "invalid-origin", 16)
        output["path_fingerprint_sha256"] = hashlib.sha256(
            source_path.encode("utf-8", "replace")
        ).hexdigest()
    line = initiator.get("lineNumber", (frame or {}).get("lineNumber"))
    column = initiator.get("columnNumber", (frame or {}).get("columnNumber"))
    if isinstance(line, int):
        output["line_number"] = line
    if isinstance(column, int):
        output["column_number"] = column
    return output


def new_network_capture():
    return {"records": [], "active": {}, "clock": {"cdp_base": None}, "sequence": 0}


def _request_records(requests):
    if isinstance(requests, dict) and isinstance(requests.get("records"), list):
        return requests["records"]
    if isinstance(requests, dict):
        return list(requests.values())
    return list(requests)


def summarize_requests(requests, usable_ms, cutoff_ms=None, blocked=None):
    cutoff_ms = usable_ms if cutoff_ms is None else cutoff_ms
    blocked_request_hashes = {
        item.get("request_sha256") for item in (blocked or []) if item.get("request_sha256")
    }
    ledger = []
    for raw in _request_records(requests):
        item = dict(raw)
        state = item.get("state")
        if not state:
            state = "failed" if item.get("failed") else ("completed" if item.get("end_ms") is not None else "pending")
        if item.get("end_ms") is None and state not in {"completed", "failed"}:
            state = "pending"
        item["state"] = state
        end_for_duration = item.get("end_ms") if item.get("end_ms") is not None else cutoff_ms
        item["duration_ms"] = max(0, end_for_duration - item.get("start_ms", 0))
        item["started_before_usable"] = item.get("start_ms", 0) <= usable_ms
        if item.get("end_ms") is None:
            item["completion_phase"] = "pending_at_cutoff"
        elif item["end_ms"] <= usable_ms:
            item["completion_phase"] = "before_usable"
        else:
            item["completion_phase"] = "post_usable"
        ledger.append(item)
    ledger.sort(key=lambda x: (x.get("start_ms", 0), x.get("request_index", 0)))
    completed = [item for item in ledger if item["state"] == "completed"]
    failed = [item for item in ledger if item["state"] == "failed"]
    pending = [item for item in ledger if item["state"] == "pending"]
    settled = completed + failed
    total = sum(max(0, item.get("transfer_bytes", item.get("encoded_bytes", 0))) for item in settled)
    encoded_body_total = sum(max(0, item.get("encoded_body_bytes", 0)) for item in settled)
    decoded_body_total = sum(max(0, item.get("decoded_body_bytes", 0)) for item in settled)
    critical = [item for item in settled if item.get("start_ms", 0) <= usable_ms and item.get("resource_type", item.get("type")) in CAPTURED_RESOURCE_TYPES]
    top_duration = sorted(critical, key=lambda x: x["duration_ms"], reverse=True)[:8]
    tail = sorted(critical, key=lambda x: x["end_ms"], reverse=True)[:8]
    flags = [item for item in settled if "/rest/v1/site_flags" in item.get("path", item.get("url", ""))]

    def compact(item):
        is_blocked = item.get("request_sha256") in blocked_request_hashes
        return {
            "url": "[blocked-path]" if is_blocked else sanitize_url(
                item.get("path") or item.get("url", ""), path_only=True
            ),
            "type": item.get("resource_type", item.get("type", "Other")),
            "method": item["method"],
            "status": item.get("status"),
            "state": item["state"],
            "start_ms": round(item["start_ms"], 1),
            "end_ms": round(item["end_ms"], 1) if item.get("end_ms") is not None else None,
            "duration_ms": round(item["duration_ms"], 1),
            "encoded_bytes": int(item.get("transfer_bytes", item.get("encoded_bytes", 0))),
            "decoded_body_bytes": int(item.get("decoded_body_bytes", 0)),
        }

    def receipt_item(item):
        is_blocked = item.get("request_sha256") in blocked_request_hashes
        safe_full_url = sanitize_url(item.get("url", ""))
        safe_path = sanitize_url(item.get("path") or item.get("url", ""), path_only=True)
        parsed = urlparse(safe_full_url)
        query_keys = item.get("query_keys")
        if query_keys is None:
            query_keys = sanitize_query_keys(urlparse(item.get("url", "")).query)
        else:
            query_keys = sorted({
                key if str(key).startswith(("[redacted-key-", "[key-")) else sanitize_query_key(key)
                for key in query_keys
            })
        raw_initiator = dict(item.get("initiator") or {"type": "other"})
        if raw_initiator.get("url"):
            initiator = initiator_summary(raw_initiator)
        else:
            raw_type = raw_initiator.get("type")
            initiator = {"type": raw_type if raw_type in {"parser", "script", "preload", "preflight", "other"} else "other"}
            raw_origin_fingerprint = str(raw_initiator.get("origin_fingerprint") or "")
            if raw_origin_fingerprint:
                initiator["origin_fingerprint"] = (
                    raw_origin_fingerprint
                    if re.fullmatch(r"[0-9a-f]{16}", raw_origin_fingerprint)
                    else _fingerprint(raw_origin_fingerprint, 16)
                )
            raw_path_fingerprint = str(raw_initiator.get("path_fingerprint_sha256") or "")
            if raw_path_fingerprint:
                initiator["path_fingerprint_sha256"] = (
                    raw_path_fingerprint
                    if re.fullmatch(r"[0-9a-f]{64}", raw_path_fingerprint)
                    else hashlib.sha256(raw_path_fingerprint.encode("utf-8", "replace")).hexdigest()
                )
            for position_key in ("line_number", "column_number"):
                if isinstance(raw_initiator.get(position_key), int):
                    initiator[position_key] = raw_initiator[position_key]
        return {
            "request_index": item.get("request_index"),
            "url": "[blocked-url]" if is_blocked else safe_full_url,
            "path": "[blocked-path]" if is_blocked else safe_path,
            "scheme": _safe_scheme(item.get("scheme") or parsed.scheme),
            "host": "[blocked-host]" if is_blocked else sanitize_host(
                item.get("host") or parsed.hostname or ""
            ),
            "query_keys": query_keys,
            "method": item.get("method"),
            "resource_type": item.get("resource_type", item.get("type", "Other")),
            "initiator": initiator,
            "status": item.get("status"),
            "state": item["state"],
            "failure_code": item.get("failure_code") if item["state"] == "failed" else None,
            "failure_fingerprint_sha256": item.get("failure_fingerprint_sha256") if item["state"] == "failed" else None,
            "start_ms": round(item.get("start_ms", 0), 1),
            "observed_start_ms": round(item.get("observed_start_ms", 0), 1),
            "end_ms": round(item["end_ms"], 1) if item.get("end_ms") is not None else None,
            "duration_ms": round(item["duration_ms"], 1),
            "transfer_bytes": int(item.get("transfer_bytes", item.get("encoded_bytes", 0))),
            "encoded_body_bytes": int(item.get("encoded_body_bytes", 0)),
            "decoded_body_bytes": int(item.get("decoded_body_bytes", 0)),
            "started_before_usable": item["started_before_usable"],
            "completion_phase": item["completion_phase"],
        }

    return {
        "request_count": len(settled),
        "request_started_count": len(ledger),
        "request_completed_count": len(completed),
        "request_failed_count": len(failed),
        "request_pending_count": len(pending),
        "transfer_bytes": int(total),
        "encoded_body_bytes": int(encoded_body_total),
        "decoded_body_bytes": int(decoded_body_total),
        "flag_request_count": len(flags),
        "flag_wait_ms": round(max((f["duration_ms"] for f in flags), default=0), 1),
        "flag_response_end_ms": round(max((f["end_ms"] for f in flags), default=0), 1),
        "top_critical_durations": [compact(item) for item in top_duration],
        "critical_tail": [compact(item) for item in tail],
        "failed_allowed_requests": [compact(item) for item in failed],
        "measurement_window": {
            "start_ms": 0,
            "usable_ms": round(usable_ms, 1),
            "cutoff_ms": round(cutoff_ms, 1),
            "post_usable_observation_ms": round(max(0, cutoff_ms - usable_ms), 1),
        },
        "network_requests": [receipt_item(item) for item in ledger],
    }


async def create_context(
    browser, profile_name, blocked, errors, arm_origin, db_origins,
    auth_origin=None, share_token=None, expected_sha=None, require_build_identity=False,
):
    profile = PROFILES[profile_name]
    context = await browser.new_context(
        ignore_https_errors=False,
        viewport=profile["viewport"],
        device_scale_factor=profile["device_scale_factor"],
        is_mobile=profile["is_mobile"],
        has_touch=profile["has_touch"],
        user_agent=profile["user_agent"],
        locale="he-IL",
        timezone_id="Asia/Jerusalem",
        service_workers="allow",
    )

    async def boundary(route, request):
        url = request.url
        method = request.method.upper()
        allowed, category, destination, rpc_name = network_decision(
            url, method, arm_origin, db_origins
        )
        if allowed:
            await route.continue_()
            return
        blocked.append(blocked_receipt(url, method, category, destination, rpc_name))
        await route.abort("blockedbyclient")

    try:
        await context.route("**/*", boundary)
        if hasattr(context, "route_web_socket"):
            async def block_web_socket(ws):
                await ws.close()
            await context.route_web_socket("**/*", block_web_socket)
        await context.add_init_script(INIT_SCRIPT)
        if auth_origin and share_token:
            if auth_origin != arm_origin:
                raise TargetValidationError("auth-origin-must-equal-arm-origin")
            await authenticate_preview(context, arm_origin, share_token)
        build_identity = (
            await verify_build_identity(context, arm_origin, expected_sha)
            if require_build_identity else None
        )
        page = await context.new_page()
        page.on("pageerror", lambda exc: errors.append(safe_error("pageerror", exc)))
        page.on("console", lambda msg: errors.append(safe_error("console", msg.text)) if msg.type == "error" else None)
        cdp = await context.new_cdp_session(page)
        await cdp.send("Network.enable")
        await cdp.send("Network.setCacheDisabled", {"cacheDisabled": True})
        await cdp.send("Emulation.setCPUThrottlingRate", {"rate": profile["cpu_rate"]})
        await cdp.send("Network.emulateNetworkConditions", {
            "offline": False,
            "latency": profile["latency_ms"],
            "downloadThroughput": profile["download_bps"],
            "uploadThroughput": profile["upload_bps"],
        })
        return context, page, cdp, build_identity
    except Exception:
        await context.close()
        raise


def attach_network_capture(cdp, action_clock, requests):
    if not isinstance(requests.get("records"), list):
        requests.clear()
        requests.update(new_network_capture())
    clock = requests["clock"]

    def rel(timestamp):
        if clock["cdp_base"] is None:
            clock["cdp_base"] = timestamp
        return (timestamp - clock["cdp_base"]) * 1000

    def active_record(request_id):
        index = requests["active"].get(request_id)
        if index is None or index >= len(requests["records"]):
            return None
        return requests["records"][index]

    def will_send(event):
        request = event.get("request", {})
        url = request.get("url", "")
        if url.startswith("data:") or url.startswith("blob:"):
            return
        rid = event["requestId"]
        timestamp = event["timestamp"]
        previous = active_record(rid)
        redirect = event.get("redirectResponse")
        if previous is not None and previous.get("end_ms") is None:
            previous["end_ms"] = rel(timestamp)
            previous["state"] = "completed"
            if redirect:
                previous["status"] = redirect.get("status")
                previous["transfer_bytes"] = max(0, redirect.get("encodedDataLength", 0) or 0)
                previous["encoded_bytes"] = previous["transfer_bytes"]
        parsed = urlparse(url)
        requests["sequence"] += 1
        record = {
            "request_index": requests["sequence"],
            "url": sanitize_url(url),
            "path": sanitize_url(url, path_only=True),
            "scheme": _safe_scheme(parsed.scheme),
            "host": sanitize_host(parsed.hostname or ""),
            "query_keys": sanitize_query_keys(parsed.query),
            "request_sha256": hashlib.sha256(
                f"{request_origin(url) or 'invalid-origin'}\n{parsed.path or '/'}".encode("utf-8", "replace")
            ).hexdigest(),
            "method": request.get("method"),
            "type": event.get("type", "Other"),
            "resource_type": event.get("type", "Other"),
            "initiator": initiator_summary(event.get("initiator")),
            "start_ms": rel(timestamp),
            "observed_start_ms": (time.perf_counter() - action_clock["start"]) * 1000,
            "end_ms": None,
            "state": "started",
            "encoded_bytes": 0,
            "transfer_bytes": 0,
            "encoded_body_bytes": 0,
            "decoded_body_bytes": 0,
        }
        requests["records"].append(record)
        requests["active"][rid] = len(requests["records"]) - 1

    def response(event):
        rid = event["requestId"]
        record = active_record(rid)
        if record is not None:
            response_data = event.get("response", {})
            record["status"] = response_data.get("status")
            record["mime_type"] = response_data.get("mimeType")

    def data_received(event):
        record = active_record(event["requestId"])
        if record is not None:
            record["decoded_body_bytes"] += max(0, event.get("dataLength", 0) or 0)
            record["encoded_body_bytes"] += max(0, event.get("encodedDataLength", 0) or 0)

    def finished(event):
        rid = event["requestId"]
        record = active_record(rid)
        if record is not None:
            record["end_ms"] = rel(event["timestamp"])
            record["state"] = "completed"
            record["transfer_bytes"] = max(0, event.get("encodedDataLength", 0) or 0)
            record["encoded_bytes"] = record["transfer_bytes"]
            requests["active"].pop(rid, None)

    def failed(event):
        rid = event["requestId"]
        record = active_record(rid)
        if record is not None:
            record["end_ms"] = rel(event["timestamp"])
            record["state"] = "failed"
            raw_error = event.get("errorText", "failed")
            record["failure_code"] = diagnostic_code(raw_error)
            record["failure_fingerprint_sha256"] = hashlib.sha256(
                str(raw_error).encode("utf-8", "replace")
            ).hexdigest()
            record["failed"] = True
            requests["active"].pop(rid, None)

    cdp.on("Network.requestWillBeSent", will_send)
    cdp.on("Network.responseReceived", response)
    cdp.on("Network.dataReceived", data_received)
    cdp.on("Network.loadingFinished", finished)
    cdp.on("Network.loadingFailed", failed)


async def collect_result(
    page, kind, slug, action_clock, requests, blocked, errors, sample, profile,
    mode, lcp_applicable, build_identity=None,
):
    failure = None
    usable_ms = None
    try:
        await page.wait_for_function(READY_FUNCTION, arg={"kind": kind, "slug": slug}, timeout=45000)
        usable_ms = (time.perf_counter() - action_clock["start"]) * 1000
        await page.wait_for_timeout(3000)
    except PlaywrightTimeoutError as exc:
        failure = "usable-content-timeout"
        usable_ms = (time.perf_counter() - action_clock["start"]) * 1000
    cutoff_ms = (time.perf_counter() - action_clock["start"]) * 1000
    metrics = await page.evaluate(METRICS_FUNCTION)
    if metrics.get("lcp_element") and metrics["lcp_element"].get("url"):
        metrics["lcp_element"]["url"] = sanitize_url(metrics["lcp_element"]["url"])
    if metrics.get("lcp_element"):
        metrics["lcp_element"].pop("id", None)
        metrics["lcp_element"].pop("cls", None)
    req = summarize_requests(requests, usable_ms, cutoff_ms, blocked)
    blocked_counts = {}
    blocked_rpcs = []
    for item in blocked:
        blocked_counts[item["category"]] = blocked_counts.get(item["category"], 0) + 1
        if item.get("rpc"):
            blocked_rpcs.append(item["rpc"])
    result = {
        "profile": profile,
        "mode": mode,
        "route": kind,
        "path": sanitize_url(page.url, path_only=True),
        "sample": sample,
        "failure": failure,
        "usable_ms": round(usable_ms, 1),
        "lcp_applicable": lcp_applicable,
        **metrics,
        **req,
        "blocked_count": len(blocked),
        "blocked_by_category": blocked_counts,
        "blocked_rpcs": sorted(set(blocked_rpcs)),
        "errors": errors[:20],
        "build_identity": build_identity,
    }
    if not lcp_applicable:
        result["lcp_ms"] = None
        result["lcp_element"] = None
    return result


async def direct_sample(
    browser, origin, profile, kind, path, sample, db_origins,
    auth_origin=None, share_token=None, expected_sha=None, require_build_identity=False,
):
    blocked, errors, requests = [], [], new_network_capture()
    action_clock = {"start": time.perf_counter()}
    context = None
    try:
        context, page, cdp, build_identity = await create_context(
            browser, profile, blocked, errors, origin, db_origins, auth_origin, share_token,
            expected_sha, require_build_identity,
        )
        attach_network_capture(cdp, action_clock, requests)
        target_url = origin + path
        document_response = await page.goto(
            target_url, wait_until="domcontentloaded", timeout=45000
        )
        document_receipt = validate_main_document_response(
            document_response, target_url, page.url
        )
        slug = path.split("/post/", 1)[1] if kind == "post" else None
        result = await collect_result(
            page, kind, slug, action_clock, requests, blocked, errors, sample, profile,
            "cold-direct", True, build_identity,
        )
        identity_after = await verify_post_journey_identity(
            context, origin, expected_sha, require_build_identity, build_identity,
        )
        result["main_document"] = document_receipt
        result["build_identity_before"] = build_identity
        result["build_identity_after"] = identity_after
        return result
    except Exception as exc:
        cutoff_ms = (time.perf_counter() - action_clock["start"]) * 1000
        return {
            "profile": profile, "mode": "cold-direct", "route": kind, "path": path, "sample": sample,
            "failure": "navigation-or-collection-failed",
            "failure_detail": safe_error("runner", exc),
            **summarize_requests(requests, cutoff_ms, cutoff_ms, blocked),
            "blocked_count": len(blocked), "blocked": blocked[:20], "errors": errors[:20],
        }
    finally:
        if context:
            await context.close()


async def internal_sample(
    browser, origin, profile, sample, db_origins, auth_origin=None, share_token=None,
    expected_sha=None, require_build_identity=False,
):
    blocked, errors, requests = [], [], new_network_capture()
    warm_clock = {"start": time.perf_counter()}
    warm_requests = new_network_capture()
    context = None
    try:
        context, page, cdp, build_identity = await create_context(
            browser, profile, blocked, errors, origin, db_origins, auth_origin, share_token,
            expected_sha, require_build_identity,
        )
        attach_network_capture(cdp, warm_clock, warm_requests)
        home_url = origin + "/"
        document_response = await page.goto(
            home_url, wait_until="domcontentloaded", timeout=45000
        )
        document_receipt = validate_main_document_response(
            document_response, home_url, page.url
        )
        await page.wait_for_function(READY_FUNCTION, arg={"kind": "home", "slug": None}, timeout=45000)
        await page.wait_for_timeout(500)
        world_links = page.locator('a[href="/world"]:visible')
        if await world_links.count() == 0:
            cutoff_ms = (time.perf_counter() - warm_clock["start"]) * 1000
            identity_after = await verify_post_journey_identity(
                context, origin, expected_sha, require_build_identity, build_identity,
            )
            return {
                "profile": profile, "mode": "internal-home-to-world", "route": "world", "sample": sample,
                "failure": "no-visible-world-link", "capture_scope": "home-setup-failure",
                "main_document": document_receipt,
                "build_identity": build_identity,
                "build_identity_before": build_identity,
                "build_identity_after": identity_after,
                **summarize_requests(warm_requests, cutoff_ms, cutoff_ms, blocked),
            }
        blocked.clear()
        errors.clear()
        requests = new_network_capture()
        action_clock = {"start": time.perf_counter()}
        internal_cdp = await context.new_cdp_session(page)
        await internal_cdp.send("Network.enable")
        await internal_cdp.send("Network.setCacheDisabled", {"cacheDisabled": True})
        attach_network_capture(internal_cdp, action_clock, requests)
        await page.evaluate("window.__sodPerfReset(performance.now())")
        internal_document_responses = []

        def capture_internal_document(response):
            request = response.request
            if (
                request.resource_type == "document"
                and request.is_navigation_request()
                and request.frame == page.main_frame
            ):
                internal_document_responses.append(response)

        page.on("response", capture_internal_document)
        await world_links.first.click()
        await page.wait_for_url("**/world", timeout=15000)
        internal_navigation_receipt = validate_internal_navigation_documents(
            internal_document_responses, origin + "/world", page.url
        )
        result = await collect_result(
            page, "world", None, action_clock, requests, blocked, errors, sample, profile,
            "internal-home-to-world", False, build_identity,
        )
        identity_after = await verify_post_journey_identity(
            context, origin, expected_sha, require_build_identity, build_identity,
        )
        result["main_document"] = document_receipt
        result["internal_navigation"] = internal_navigation_receipt
        result["build_identity_before"] = build_identity
        result["build_identity_after"] = identity_after
        return result
    except Exception as exc:
        measured_clock = locals().get("action_clock", warm_clock)
        measured_requests = requests if "action_clock" in locals() else warm_requests
        cutoff_ms = (time.perf_counter() - measured_clock["start"]) * 1000
        return {
            "profile": profile, "mode": "internal-home-to-world", "route": "world", "sample": sample,
            "failure": "navigation-or-collection-failed",
            "failure_detail": safe_error("runner", exc),
            **summarize_requests(measured_requests, cutoff_ms, cutoff_ms, blocked),
            "blocked_count": len(blocked), "blocked": blocked[:20], "errors": errors[:20],
        }
    finally:
        if context:
            await context.close()


def med(values, digits=1):
    values = [v for v in values if isinstance(v, (int, float))]
    return round(statistics.median(values), digits) if values else None


def aggregate(runs):
    groups = {}
    has_arms = any(run.get("arm") for run in runs)
    for run in runs:
        key = (run.get("arm") if has_arms else None, run.get("profile"), run.get("mode"), run.get("route"))
        groups.setdefault(key, []).append(run)
    output = []
    for key, items in sorted(groups.items()):
        stable_items = [item for item in items if not item.get("failure")]
        row = {
            "profile": key[1], "mode": key[2], "route": key[3],
            "samples": len(items), "successful_samples": len(stable_items),
            "median_lcp_ms": med([i.get("lcp_ms") for i in stable_items]),
            "median_cls": med([i.get("cls") for i in stable_items], 4),
            "median_usable_ms": med([i.get("usable_ms") for i in stable_items]),
            "median_requests": med([i.get("request_count") for i in stable_items]),
            "median_transfer_bytes": med([i.get("transfer_bytes") for i in stable_items]),
            "median_long_task_total_ms": med([i.get("long_task_total_ms") for i in stable_items]),
            "median_long_task_count": med([i.get("long_task_count") for i in stable_items]),
            "median_flag_wait_ms": med([i.get("flag_wait_ms") for i in stable_items]),
            "lcp_range_ms": [min([i.get("lcp_ms") for i in stable_items if i.get("lcp_ms") is not None], default=None), max([i.get("lcp_ms") for i in stable_items if i.get("lcp_ms") is not None], default=None)],
            "usable_range_ms": [min([i.get("usable_ms") for i in stable_items if i.get("usable_ms") is not None], default=None), max([i.get("usable_ms") for i in stable_items if i.get("usable_ms") is not None], default=None)],
            "blocked_by_category": {
                category: sum(i.get("blocked_by_category", {}).get(category, 0) for i in items)
                for category in sorted({c for i in items for c in i.get("blocked_by_category", {})})
            },
        }
        if has_arms:
            row = {"arm": key[0], **row}
        output.append(row)
    return output


def print_run(run):
    keys = (
        "arm", "ab_pair", "ab_pair_position", "profile", "mode", "route", "sample",
        "failure", "lcp_ms", "cls", "usable_ms", "request_count", "request_started_count",
        "request_pending_count", "transfer_bytes", "long_task_total_ms", "flag_wait_ms",
        "blocked_by_category",
    )
    print(json.dumps({key: run.get(key) for key in keys if key in run}, ensure_ascii=False), flush=True)


def annotate_ab_run(run, plan_item):
    run["arm"] = plan_item["arm"]
    run["ab_pair"] = plan_item["pair"]
    run["ab_pair_position"] = plan_item["pair_position"]
    return run


def verified_build_tuple(run):
    identity = run.get("build_identity")
    identity_before = run.get("build_identity_before")
    identity_after = run.get("build_identity_after")
    if not isinstance(identity, dict) or identity.get("verified") is not True:
        return None
    if identity_before != identity or identity_after != identity:
        return None
    commit = identity.get("commit")
    manifest = identity.get("manifest_sha256")
    html = identity.get("html_sha256")
    worker = identity.get("worker_sha256")
    artifact = identity.get("artifact_digest_sha256")
    host_fingerprint = identity.get("deployment_host_fingerprint")
    if (
        identity.get("source") != "same-origin-wave3-artifact-v2"
        or identity.get("build_target") != "2029"
        or identity.get("read_only") is not True
        or identity.get("preview_overrides") != WAVE3_PREVIEW_OVERRIDES
        or identity.get("immutable_deployment_host_verified") is not True
        or not isinstance(commit, str)
        or not re.fullmatch(r"[0-9a-f]{40}", commit)
        or not isinstance(manifest, str)
        or not re.fullmatch(r"[0-9a-f]{64}", manifest)
        or not isinstance(html, str)
        or not re.fullmatch(r"[0-9a-f]{64}", html)
        or not isinstance(worker, str)
        or not re.fullmatch(r"[0-9a-f]{64}", worker)
        or not isinstance(artifact, str)
        or not re.fullmatch(r"[0-9a-f]{64}", artifact)
        or not isinstance(host_fingerprint, str)
        or not re.fullmatch(r"[0-9a-f]{16}", host_fingerprint)
    ):
        return None
    return commit, manifest, html, worker, artifact, host_fingerprint


def assess_ab_acceptance(runs, minimum_successful_pairs=7, first_arm="a"):
    """Require complete successful A/B pairs for every route/profile journey."""
    if first_arm not in {"a", "b"}:
        raise ValueError("first_arm must be 'a' or 'b'")
    grouped = {}
    for run in runs:
        journey = (run.get("profile"), run.get("mode"), run.get("route"))
        pair = run.get("ab_pair")
        arm = run.get("arm")
        grouped.setdefault(journey, {}).setdefault(pair, {}).setdefault(arm, []).append(run)

    rows = []
    valid = True
    for journey, pairs in sorted(grouped.items()):
        successful_pairs = 0
        failed_pairs = 0
        partial_pairs = 0
        duplicate_pairs = 0
        order_violations = 0
        arm_success = {"a": 0, "b": 0}
        pair_numbers = set(pairs)
        valid_pair_numbers = all(isinstance(pair, int) and pair >= 1 for pair in pair_numbers)
        pair_sequence_valid = bool(pair_numbers) and valid_pair_numbers and pair_numbers == set(
            range(1, max(pair_numbers) + 1)
        )
        for pair, pair_runs in pairs.items():
            exact_pair = set(pair_runs) == {"a", "b"} and all(
                len(pair_runs[arm]) == 1 for arm in ("a", "b")
            )
            if not exact_pair:
                partial_pairs += 1
                if any(len(values) > 1 for values in pair_runs.values()):
                    duplicate_pairs += 1
                continue
            expected_first = first_arm if pair % 2 else ("b" if first_arm == "a" else "a")
            expected_second = "b" if expected_first == "a" else "a"
            expected_positions = {expected_first: 1, expected_second: 2}
            pair_order_valid = all(
                pair_runs[arm][0].get("ab_pair_position") == expected_positions[arm]
                and pair_runs[arm][0].get("sample") == pair
                for arm in ("a", "b")
            )
            if not pair_order_valid:
                order_violations += 1
                failed_pairs += 1
                continue
            if all(
                not pair_runs[arm][0].get("failure")
                and verified_build_tuple(pair_runs[arm][0]) is not None
                for arm in ("a", "b")
            ):
                successful_pairs += 1
                arm_success["a"] += 1
                arm_success["b"] += 1
            else:
                failed_pairs += 1
        row_valid = (
            successful_pairs >= minimum_successful_pairs
            and arm_success["a"] >= minimum_successful_pairs
            and arm_success["b"] >= minimum_successful_pairs
            and partial_pairs == 0
            and order_violations == 0
            and pair_sequence_valid
        )
        valid = valid and row_valid
        rows.append({
            "profile": journey[0],
            "mode": journey[1],
            "route": journey[2],
            "planned_pairs_seen": len(pairs),
            "successful_pairs": successful_pairs,
            "successful_samples_by_arm": arm_success,
            "failed_pairs": failed_pairs,
            "partial_pairs": partial_pairs,
            "duplicate_pairs": duplicate_pairs,
            "order_violations": order_violations,
            "pair_sequence_valid": pair_sequence_valid,
            "valid": row_valid,
        })

    expected_journeys = {
        (profile, "cold-direct", kind) for profile in PROFILES for kind, _ in ROUTES
    } | {
        (profile, "internal-home-to-world", "world") for profile in PROFILES
    }
    observed_journeys = set(grouped)
    missing = sorted(expected_journeys - observed_journeys)
    if missing:
        valid = False
        rows.extend({
            "profile": journey[0],
            "mode": journey[1],
            "route": journey[2],
            "planned_pairs_seen": 0,
            "successful_pairs": 0,
            "successful_samples_by_arm": {"a": 0, "b": 0},
            "failed_pairs": 0,
            "partial_pairs": 0,
            "duplicate_pairs": 0,
            "order_violations": 0,
            "pair_sequence_valid": False,
            "valid": False,
        } for journey in missing)
    if not rows:
        valid = False
    build_rows = {}
    for arm in ("a", "b"):
        arm_runs = [run for run in runs if run.get("arm") == arm]
        identities = {
            identity for identity in (verified_build_tuple(run) for run in arm_runs)
            if identity is not None
        }
        missing_or_invalid = sum(verified_build_tuple(run) is None for run in arm_runs)
        arm_valid = bool(arm_runs) and len(identities) == 1 and missing_or_invalid == 0
        valid = valid and arm_valid
        build_rows[arm] = {
            "valid": arm_valid,
            "samples": len(arm_runs),
            "missing_or_invalid": missing_or_invalid,
            "distinct_verified_identities": len(identities),
            "identity": (
                {
                    "commit": next(iter(identities))[0],
                    "manifest_sha256": next(iter(identities))[1],
                    "html_sha256": next(iter(identities))[2],
                    "worker_sha256": next(iter(identities))[3],
                    "artifact_digest_sha256": next(iter(identities))[4],
                    "deployment_host_fingerprint": next(iter(identities))[5],
                }
                if len(identities) == 1 else None
            ),
        }
    arm_a_identity = next(iter({
        identity for identity in (verified_build_tuple(run) for run in runs if run.get("arm") == "a")
        if identity is not None
    }), None)
    arm_b_identity = next(iter({
        identity for identity in (verified_build_tuple(run) for run in runs if run.get("arm") == "b")
        if identity is not None
    }), None)
    distinct_artifacts = (
        arm_a_identity is not None
        and arm_b_identity is not None
        and arm_a_identity != arm_b_identity
        and arm_a_identity[0] != arm_b_identity[0]
        and arm_a_identity[4] != arm_b_identity[4]
    )
    valid = valid and distinct_artifacts
    return {
        "mode": "counterbalanced-paired-ab",
        "minimum_successful_pairs_per_route_profile": minimum_successful_pairs,
        "partial_pairs_accepted": False,
        "valid": valid,
        "pair_order_pattern": "AB,BA,AB..." if first_arm == "a" else "BA,AB,BA...",
        "distinct_artifacts_between_arms": distinct_artifacts,
        "verified_build_identity_by_arm": build_rows,
        "journeys": sorted(rows, key=lambda row: (row["profile"], row["mode"], row["route"])),
    }


def result_exit_code(execution_failed, ab_mode, acceptance):
    return 2 if execution_failed or (ab_mode and not acceptance.get("valid", False)) else 0


async def main():
    args = build_parser().parse_args()
    try:
        validated, tokens = prepare_execution(args)
    except TargetValidationError as exc:
        raise SystemExit(str(exc)) from exc
    ab_mode = validated["ab_mode"]
    samples_per_arm = validated["samples_per_arm"]
    server = None
    if args.dist:
        GzipSpaHandler.root = pathlib.Path(args.dist).resolve()
        server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), GzipSpaHandler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        origin = f"http://127.0.0.1:{server.server_address[1]}"
        origin_kind = "local-gzip-exact-source-build-not-hosted"
        validated["arms"]["a"]["origin"] = origin
    else:
        origin = validated["arms"]["a"]["origin"]
        origin_kind = "hosted-preview-protected-share"
    current_runner_sha256 = runner_sha256()
    receipt = {
        "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "sha": validated["arms"]["a"]["sha"],
        "sha_role": "expected-build-identity-input",
        "origin_kind": origin_kind,
        "origin": sanitize_url(origin),
        "dist": dist_receipt(args.dist),
        "runner_sha256": current_runner_sha256,
        "profiles": PROFILES,
        "browser": None,
        "boundary": boundary_policy_receipt(
            validated["db_origins"], args.allow_production_db
        ),
        "runs": [],
    }
    arms = validated["arms"]
    arms["a"]["share_token"] = tokens["a"]
    arms["a"]["require_build_identity"] = not bool(args.dist)
    if ab_mode:
        arms["b"]["share_token"] = tokens["b"]
        arms["b"]["require_build_identity"] = True
        receipt["comparison"] = {
            "mode": "counterbalanced-paired-ab",
            "samples_per_arm": samples_per_arm,
            "first_pair_order": [args.ab_first, "b" if args.ab_first == "a" else "a"],
            "pair_order_pattern": "AB,BA,AB..." if args.ab_first == "a" else "BA,AB,BA...",
            "arms": {
                arm: {"expected_sha": config["sha"], "origin": sanitize_url(config["origin"])}
                for arm, config in arms.items()
            },
        }
    proxy = os.environ.get("HTTPS_PROXY") or os.environ.get("HTTP_PROXY")
    launch = {"executable_path": "/usr/bin/chromium", "headless": True, "args": [
        "--disable-background-networking", "--disable-component-update", "--disable-default-apps",
        "--disable-sync", "--metrics-recording-only", "--no-first-run", "--no-default-browser-check",
    ]}
    if proxy:
        launch["proxy"] = {"server": proxy, "bypass": "127.0.0.1,localhost"}
    execution_failed = False
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(**launch)
            receipt["browser"] = browser.version
            if not args.dist:
                receipt["verified_builds"] = {}
                for arm, config in arms.items():
                    receipt["verified_builds"][arm] = await preflight_build_identity(
                        browser, config["origin"], config["sha"],
                        config["auth_origin"], config["share_token"],
                    )
            for profile in ("mobile", "desktop"):
                for kind, path in ROUTES:
                    plan = build_ab_order(samples_per_arm, args.ab_first) if ab_mode else [
                        {"arm": "a", "sample": sample, "pair": None, "pair_position": None}
                        for sample in range(1, samples_per_arm + 1)
                    ]
                    for plan_item in plan:
                        config = arms[plan_item["arm"]]
                        run = await direct_sample(
                            browser, config["origin"], profile, kind, path, plan_item["sample"],
                            validated["db_origins"], config["auth_origin"], config["share_token"],
                            config["sha"], config["require_build_identity"],
                        )
                        if ab_mode:
                            annotate_ab_run(run, plan_item)
                        receipt["runs"].append(run)
                        print_run(run)
                plan = build_ab_order(samples_per_arm, args.ab_first) if ab_mode else [
                    {"arm": "a", "sample": sample, "pair": None, "pair_position": None}
                    for sample in range(1, samples_per_arm + 1)
                ]
                for plan_item in plan:
                    config = arms[plan_item["arm"]]
                    run = await internal_sample(
                        browser, config["origin"], profile, plan_item["sample"],
                        validated["db_origins"], config["auth_origin"], config["share_token"],
                        config["sha"], config["require_build_identity"],
                    )
                    if ab_mode:
                        annotate_ab_run(run, plan_item)
                    receipt["runs"].append(run)
                    print_run(run)
            await browser.close()
    except Exception as exc:
        execution_failed = True
        receipt["execution_error"] = safe_error("runner", exc)
    finally:
        if server:
            server.shutdown()
            server.server_close()
    receipt["summary"] = aggregate(receipt["runs"])
    receipt["acceptance"] = (
        assess_ab_acceptance(
            receipt["runs"], minimum_successful_pairs=7, first_arm=args.ab_first
        )
        if ab_mode else {
            "mode": "single-arm-compatibility",
            "valid": None,
            "reason": "single-arm-mode-is-not-causal-ab-acceptance",
        }
    )
    pathlib.Path(args.output).write_text(json.dumps(receipt, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({
        "output": args.output,
        "runner_sha256": current_runner_sha256,
        "summary": receipt["summary"],
        "acceptance": receipt["acceptance"],
    }, ensure_ascii=False), flush=True)
    exit_code = result_exit_code(execution_failed, ab_mode, receipt["acceptance"])
    if exit_code:
        raise SystemExit(exit_code)


if __name__ == "__main__":
    asyncio.run(main())
