import argparse
import asyncio
import gzip
import hashlib
import http.server
import json
import mimetypes
import os
import pathlib
import re
import statistics
import sys
import threading
import time
from urllib.parse import parse_qsl, unquote, urlparse, urlunparse

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

SENSITIVE_ASSIGNMENT_RE = re.compile(
    r"(?i)[\"']?\b(_vercel_share|access[_-]?token|refresh[_-]?token|api[_-]?key|apikey|"
    r"x-amz-signature|x-goog-signature|token|secret|signature|sig|key|auth|authorization|"
    r"cookie|password)\b[\"']?\s*[:=]\s*[\"']?([^\s&,;}\"']+)"
)
BEARER_RE = re.compile(r"(?i)\bBearer\s+[A-Za-z0-9._~+/=-]+")
HTTP_URL_RE = re.compile(r"https?://[^\s\"'<>]+")


def sanitize_url(url, path_only=False):
    """Keep route identity while discarding credentials, fragments and query values."""
    if not url:
        return ""
    parsed = urlparse(url)
    query_keys = sorted({key for key, _ in parse_qsl(parsed.query, keep_blank_values=True)})
    safe_query = "&".join(query_keys)
    path = parsed.path or "/"
    if path_only or not parsed.scheme or not parsed.netloc:
        return urlunparse(("", "", path, "", safe_query, ""))
    host = parsed.hostname or ""
    try:
        port = parsed.port
    except ValueError:
        port = None
    if port:
        host = f"{host}:{port}"
    return urlunparse((parsed.scheme, host, path, "", safe_query, ""))


def sanitize_diagnostic_text(value):
    """Bound diagnostics without retaining URL values, tokens or console payloads."""
    text = str(value or "")[:2000]
    text = HTTP_URL_RE.sub(lambda match: sanitize_url(match.group(0)), text)
    text = SENSITIVE_ASSIGNMENT_RE.sub(lambda match: f"{match.group(1)}=[REDACTED]", text)
    text = BEARER_RE.sub("Bearer [REDACTED]", text)
    return text[:500]


def safe_error(kind, value):
    message = sanitize_diagnostic_text(value)
    return {
        "kind": kind,
        "message": message,
        "message_sha256": hashlib.sha256(message.encode("utf-8", "replace")).hexdigest(),
    }


def runner_sha256():
    return hashlib.sha256(pathlib.Path(__file__).read_bytes()).hexdigest()


def build_ab_order(samples_per_arm, first_arm="a"):
    """Alternate pair order deterministically: AB, BA, AB ... (or the inverse)."""
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
        rel = route_path.lstrip("/")
        candidate = (self.root / rel).resolve()
        if route_path == "/":
            candidate = self.root / "2029.html"
        elif not str(candidate).startswith(str(self.root.resolve())) or not candidate.is_file():
            candidate = self.root / "2029.html"
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
      id: e.id || null,
      cls: e.element?.className || null,
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


def initiator_summary(initiator):
    initiator = initiator or {}
    frame = None
    stack = initiator.get("stack") or {}
    call_frames = stack.get("callFrames") or []
    if call_frames:
        frame = call_frames[0]
    source_url = initiator.get("url") or (frame or {}).get("url")
    output = {"type": initiator.get("type", "other")}
    if source_url:
        output["url"] = sanitize_url(source_url)
        output["path"] = sanitize_url(source_url, path_only=True)
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


def summarize_requests(requests, usable_ms, cutoff_ms=None):
    cutoff_ms = usable_ms if cutoff_ms is None else cutoff_ms
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
        return {
            "url": sanitize_url(item.get("path") or item.get("url", ""), path_only=True),
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
        safe_full_url = sanitize_url(item.get("url", ""))
        safe_path = sanitize_url(item.get("path") or item.get("url", ""), path_only=True)
        parsed = urlparse(safe_full_url)
        query_keys = item.get("query_keys")
        if query_keys is None:
            query_keys = sorted({key for key, _ in parse_qsl(urlparse(item.get("url", "")).query, keep_blank_values=True)})
        initiator = dict(item.get("initiator") or {"type": "other"})
        if initiator.get("url"):
            initiator["url"] = sanitize_url(initiator["url"])
            initiator["path"] = sanitize_url(initiator["url"], path_only=True)
        return {
            "request_index": item.get("request_index"),
            "url": safe_full_url,
            "path": safe_path,
            "host": item.get("host") or parsed.hostname or "",
            "query_keys": query_keys,
            "method": item.get("method"),
            "resource_type": item.get("resource_type", item.get("type", "Other")),
            "initiator": initiator,
            "status": item.get("status"),
            "state": item["state"],
            "failure_reason": sanitize_diagnostic_text(item.get("failure_reason") or item.get("failed")) or None,
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


async def create_context(browser, profile_name, blocked, errors, auth_origin=None, share_token=None):
    profile = PROFILES[profile_name]
    context = await browser.new_context(
        ignore_https_errors=True,
        viewport=profile["viewport"],
        device_scale_factor=profile["device_scale_factor"],
        is_mobile=profile["is_mobile"],
        has_touch=profile["has_touch"],
        user_agent=profile["user_agent"],
        locale="he-IL",
        timezone_id="Asia/Jerusalem",
        service_workers="block",
    )

    async def boundary(route, request):
        url = request.url
        method = request.method.upper()
        parsed = urlparse(url)
        host = parsed.hostname or ""
        rpc_name = rpc_name_from_url(url)
        if any(fragment in host for fragment in ANALYTICS_HOST_FRAGMENTS):
            blocked.append({"url": parsed.path or url, "host": host, "method": method, "category": "analytics"})
            await route.abort("blockedbyclient")
            return
        if method in {"GET", "HEAD", "OPTIONS"}:
            await route.continue_()
            return
        if method == "POST" and rpc_name in READ_ONLY_RPCS:
            await route.continue_()
            return
        blocked.append({
            "url": parsed.path,
            "host": host,
            "method": method,
            "rpc": rpc_name,
            "category": classify_blocked(url, method),
        })
        await route.abort("blockedbyclient")

    await context.route("**/*", boundary)
    if hasattr(context, "route_web_socket"):
        async def block_web_socket(ws):
            await ws.close()
        await context.route_web_socket("**/*", block_web_socket)
    await context.add_init_script(INIT_SCRIPT)
    if auth_origin and share_token:
        auth_url = auth_origin.rstrip("/") + "/?_vercel_share=" + share_token
        auth_response = await context.request.get(auth_url, max_redirects=5, timeout=30000)
        if not auth_response.ok:
            raise RuntimeError(f"protected-preview-auth-failed:{auth_response.status}")
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
    return context, page, cdp


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
            "host": parsed.hostname or "",
            "query_keys": sorted({key for key, _ in parse_qsl(parsed.query, keep_blank_values=True)}),
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
            record["failure_reason"] = sanitize_diagnostic_text(event.get("errorText", "failed"))
            record["failed"] = record["failure_reason"]
            requests["active"].pop(rid, None)

    cdp.on("Network.requestWillBeSent", will_send)
    cdp.on("Network.responseReceived", response)
    cdp.on("Network.dataReceived", data_received)
    cdp.on("Network.loadingFinished", finished)
    cdp.on("Network.loadingFailed", failed)


async def collect_result(page, kind, slug, action_clock, requests, blocked, errors, sample, profile, mode, lcp_applicable):
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
    req = summarize_requests(requests, usable_ms, cutoff_ms)
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
    }
    if not lcp_applicable:
        result["lcp_ms"] = None
        result["lcp_element"] = None
    return result


async def direct_sample(browser, origin, profile, kind, path, sample, auth_origin=None, share_token=None):
    blocked, errors, requests = [], [], new_network_capture()
    context, page, cdp = await create_context(browser, profile, blocked, errors, auth_origin, share_token)
    action_clock = {"start": time.perf_counter()}
    attach_network_capture(cdp, action_clock, requests)
    try:
        await page.goto(origin + path, wait_until="domcontentloaded", timeout=45000)
        slug = path.split("/post/", 1)[1] if kind == "post" else None
        return await collect_result(page, kind, slug, action_clock, requests, blocked, errors, sample, profile, "cold-direct", True)
    except Exception as exc:
        cutoff_ms = (time.perf_counter() - action_clock["start"]) * 1000
        return {
            "profile": profile, "mode": "cold-direct", "route": kind, "path": path, "sample": sample,
            "failure": sanitize_diagnostic_text(exc),
            **summarize_requests(requests, cutoff_ms, cutoff_ms),
            "blocked_count": len(blocked), "blocked": blocked[:20], "errors": errors[:20],
        }
    finally:
        await context.close()


async def internal_sample(browser, origin, profile, sample, auth_origin=None, share_token=None):
    blocked, errors, requests = [], [], new_network_capture()
    context, page, cdp = await create_context(browser, profile, blocked, errors, auth_origin, share_token)
    warm_clock = {"start": time.perf_counter()}
    warm_requests = new_network_capture()
    attach_network_capture(cdp, warm_clock, warm_requests)
    try:
        await page.goto(origin + "/", wait_until="domcontentloaded", timeout=45000)
        await page.wait_for_function(READY_FUNCTION, arg={"kind": "home", "slug": None}, timeout=45000)
        await page.wait_for_timeout(500)
        world_links = page.locator('a[href="/world"]:visible')
        if await world_links.count() == 0:
            cutoff_ms = (time.perf_counter() - warm_clock["start"]) * 1000
            return {
                "profile": profile, "mode": "internal-home-to-world", "route": "world", "sample": sample,
                "failure": "no-visible-world-link", "capture_scope": "home-setup-failure",
                **summarize_requests(warm_requests, cutoff_ms, cutoff_ms),
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
        await world_links.first.click()
        await page.wait_for_url("**/world", timeout=15000)
        return await collect_result(page, "world", None, action_clock, requests, blocked, errors, sample, profile, "internal-home-to-world", False)
    except Exception as exc:
        measured_clock = locals().get("action_clock", warm_clock)
        measured_requests = requests if "action_clock" in locals() else warm_requests
        cutoff_ms = (time.perf_counter() - measured_clock["start"]) * 1000
        return {
            "profile": profile, "mode": "internal-home-to-world", "route": "world", "sample": sample,
            "failure": sanitize_diagnostic_text(exc),
            **summarize_requests(measured_requests, cutoff_ms, cutoff_ms),
            "blocked_count": len(blocked), "blocked": blocked[:20], "errors": errors[:20],
        }
    finally:
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


async def main():
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
    parser.add_argument("--output", required=True)
    parser.add_argument("--sha", required=True)
    args = parser.parse_args()
    if bool(args.dist) == bool(args.origin):
        raise SystemExit("Provide exactly one of --dist or --origin")
    ab_mode = bool(args.origin_b)
    if ab_mode and (args.dist or not args.sha_b):
        raise SystemExit("Alternating A/B mode requires --origin, --origin-b and --sha-b; --dist is single-arm only")
    if args.sha_b and not ab_mode:
        raise SystemExit("--sha-b requires --origin-b")
    samples_per_arm = args.samples_per_arm if args.samples_per_arm is not None else (7 if ab_mode else 3)
    if samples_per_arm < 1:
        raise SystemExit("--samples-per-arm must be positive")
    if ab_mode and samples_per_arm < 7:
        raise SystemExit("Alternating A/B mode requires at least 7 samples per arm")
    share_token = sys.stdin.readline().strip() if args.share_token_stdin else None
    share_token_b = sys.stdin.readline().strip() if args.share_token_b_stdin else None
    server = None
    if args.dist:
        GzipSpaHandler.root = pathlib.Path(args.dist).resolve()
        server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), GzipSpaHandler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        origin = f"http://127.0.0.1:{server.server_address[1]}"
        origin_kind = "local-gzip-exact-source-build-not-hosted"
    else:
        origin = args.origin.rstrip("/")
        origin_kind = "hosted-preview-protected-share"
    current_runner_sha256 = runner_sha256()
    receipt = {
        "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "sha": args.sha,
        "origin_kind": origin_kind,
        "origin": sanitize_url(origin),
        "dist": args.dist,
        "runner_sha256": current_runner_sha256,
        "profiles": PROFILES,
        "browser": None,
        "boundary": {
            "installed_before_navigation": True,
            "allowed_methods": ["GET", "HEAD", "OPTIONS"],
            "allowed_post_rpcs": sorted(READ_ONLY_RPCS),
            "analytics_hosts_blocked": list(ANALYTICS_HOST_FRAGMENTS),
            "service_workers": "blocked",
            "websockets": "blocked",
        },
        "runs": [],
    }
    arms = {
        "a": {
            "origin": origin,
            "auth_origin": args.auth_origin,
            "share_token": share_token,
            "sha": args.sha,
        }
    }
    if ab_mode:
        arms["b"] = {
            "origin": args.origin_b.rstrip("/"),
            "auth_origin": args.auth_origin_b,
            "share_token": share_token_b,
            "sha": args.sha_b,
        }
        receipt["comparison"] = {
            "mode": "deterministic-alternating-ab",
            "samples_per_arm": samples_per_arm,
            "first_pair_order": [args.ab_first, "b" if args.ab_first == "a" else "a"],
            "pair_order_pattern": "AB,BA,AB..." if args.ab_first == "a" else "BA,AB,BA...",
            "arms": {
                arm: {"sha": config["sha"], "origin": sanitize_url(config["origin"])}
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
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(**launch)
            receipt["browser"] = browser.version
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
                            config["auth_origin"], config["share_token"],
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
                        config["auth_origin"], config["share_token"],
                    )
                    if ab_mode:
                        annotate_ab_run(run, plan_item)
                    receipt["runs"].append(run)
                    print_run(run)
            await browser.close()
    finally:
        if server:
            server.shutdown()
            server.server_close()
    receipt["summary"] = aggregate(receipt["runs"])
    pathlib.Path(args.output).write_text(json.dumps(receipt, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"output": args.output, "runner_sha256": current_runner_sha256, "summary": receipt["summary"]}, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    asyncio.run(main())
