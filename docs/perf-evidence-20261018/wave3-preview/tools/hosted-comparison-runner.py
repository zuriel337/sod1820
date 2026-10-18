import argparse
import asyncio
import gzip
import http.server
import json
import mimetypes
import os
import pathlib
import statistics
import sys
import threading
import time
from urllib.parse import unquote, urlparse

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


def summarize_requests(requests, usable_ms):
    completed = []
    for item in requests.values():
        if item.get("end_ms") is None:
            continue
        item = dict(item)
        item["duration_ms"] = item["end_ms"] - item["start_ms"]
        completed.append(item)
    completed.sort(key=lambda x: x["start_ms"])
    total = sum(max(0, item.get("encoded_bytes", 0)) for item in completed)
    critical = [item for item in completed if item["start_ms"] <= usable_ms and item["type"] in {
        "Document", "Script", "Stylesheet", "Fetch", "XHR", "Image", "Font"
    }]
    top_duration = sorted(critical, key=lambda x: x["duration_ms"], reverse=True)[:8]
    tail = sorted(critical, key=lambda x: x["end_ms"], reverse=True)[:8]
    flags = [item for item in completed if "/rest/v1/site_flags" in item["url"]]
    def compact(item):
        p = urlparse(item["url"])
        label = p.path + (("?" + p.query[:120]) if p.query else "")
        return {
            "url": label,
            "type": item["type"],
            "method": item["method"],
            "status": item.get("status"),
            "start_ms": round(item["start_ms"], 1),
            "end_ms": round(item["end_ms"], 1),
            "duration_ms": round(item["duration_ms"], 1),
            "encoded_bytes": int(item.get("encoded_bytes", 0)),
        }
    return {
        "request_count": len(completed),
        "transfer_bytes": int(total),
        "flag_request_count": len(flags),
        "flag_wait_ms": round(max((f["duration_ms"] for f in flags), default=0), 1),
        "flag_response_end_ms": round(max((f["end_ms"] for f in flags), default=0), 1),
        "top_critical_durations": [compact(item) for item in top_duration],
        "critical_tail": [compact(item) for item in tail],
        "failed_allowed_requests": [compact(item) for item in completed if item.get("failed")],
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
    page.on("pageerror", lambda exc: errors.append({"kind": "pageerror", "message": str(exc)[:500]}))
    page.on("console", lambda msg: errors.append({"kind": "console", "message": msg.text[:500]}) if msg.type == "error" else None)
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
    clock = {"cdp_base": None}

    def rel(timestamp):
        if clock["cdp_base"] is None:
            clock["cdp_base"] = timestamp
        return (timestamp - clock["cdp_base"]) * 1000

    def will_send(event):
        request = event.get("request", {})
        url = request.get("url", "")
        if url.startswith("data:") or url.startswith("blob:"):
            return
        rid = event["requestId"]
        requests[rid] = {
            "url": url,
            "method": request.get("method"),
            "type": event.get("type", "Other"),
            "start_ms": rel(event["timestamp"]),
            "observed_start_ms": (time.perf_counter() - action_clock["start"]) * 1000,
            "end_ms": None,
            "encoded_bytes": 0,
        }

    def response(event):
        rid = event["requestId"]
        if rid in requests:
            requests[rid]["status"] = event.get("response", {}).get("status")

    def finished(event):
        rid = event["requestId"]
        if rid in requests:
            requests[rid]["end_ms"] = rel(event["timestamp"])
            requests[rid]["encoded_bytes"] = event.get("encodedDataLength", 0)

    def failed(event):
        rid = event["requestId"]
        if rid in requests:
            requests[rid]["end_ms"] = rel(event["timestamp"])
            requests[rid]["failed"] = event.get("errorText", "failed")

    cdp.on("Network.requestWillBeSent", will_send)
    cdp.on("Network.responseReceived", response)
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
    metrics = await page.evaluate(METRICS_FUNCTION)
    req = summarize_requests(requests, usable_ms)
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
        "path": page.url.replace(page.url.split('/', 3)[0] + '//' + page.url.split('/', 3)[2], '') if page.url.startswith('http') else page.url,
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
    blocked, errors, requests = [], [], {}
    context, page, cdp = await create_context(browser, profile, blocked, errors, auth_origin, share_token)
    action_clock = {"start": time.perf_counter()}
    attach_network_capture(cdp, action_clock, requests)
    try:
        await page.goto(origin + path, wait_until="domcontentloaded", timeout=45000)
        slug = path.split("/post/", 1)[1] if kind == "post" else None
        return await collect_result(page, kind, slug, action_clock, requests, blocked, errors, sample, profile, "cold-direct", True)
    except Exception as exc:
        return {
            "profile": profile, "mode": "cold-direct", "route": kind, "path": path, "sample": sample,
            "failure": str(exc)[:500], "blocked_count": len(blocked), "blocked": blocked[:20], "errors": errors[:20]
        }
    finally:
        await context.close()


async def internal_sample(browser, origin, profile, sample, auth_origin=None, share_token=None):
    blocked, errors, requests = [], [], {}
    context, page, cdp = await create_context(browser, profile, blocked, errors, auth_origin, share_token)
    warm_clock = {"start": time.perf_counter()}
    warm_requests = {}
    attach_network_capture(cdp, warm_clock, warm_requests)
    try:
        await page.goto(origin + "/", wait_until="domcontentloaded", timeout=45000)
        await page.wait_for_function(READY_FUNCTION, arg={"kind": "home", "slug": None}, timeout=45000)
        await page.wait_for_timeout(500)
        world_links = page.locator('a[href="/world"]:visible')
        if await world_links.count() == 0:
            return {"profile": profile, "mode": "internal-home-to-world", "route": "world", "sample": sample, "failure": "no-visible-world-link"}
        blocked.clear()
        errors.clear()
        requests.clear()
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
        return {
            "profile": profile, "mode": "internal-home-to-world", "route": "world", "sample": sample,
            "failure": str(exc)[:500], "blocked_count": len(blocked), "blocked": blocked[:20], "errors": errors[:20]
        }
    finally:
        await context.close()


def med(values, digits=1):
    values = [v for v in values if isinstance(v, (int, float))]
    return round(statistics.median(values), digits) if values else None


def aggregate(runs):
    groups = {}
    for run in runs:
        key = (run.get("profile"), run.get("mode"), run.get("route"))
        groups.setdefault(key, []).append(run)
    output = []
    for key, items in sorted(groups.items()):
        stable_items = [item for item in items if not item.get("failure")]
        output.append({
            "profile": key[0], "mode": key[1], "route": key[2],
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
        })
    return output


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dist")
    parser.add_argument("--origin")
    parser.add_argument("--auth-origin")
    parser.add_argument("--share-token-stdin", action="store_true")
    parser.add_argument("--output", required=True)
    parser.add_argument("--sha", required=True)
    args = parser.parse_args()
    if bool(args.dist) == bool(args.origin):
        raise SystemExit("Provide exactly one of --dist or --origin")
    share_token = sys.stdin.readline().strip() if args.share_token_stdin else None
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
    receipt = {
        "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "sha": args.sha,
        "origin_kind": origin_kind,
        "origin": origin,
        "dist": args.dist,
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
                    for sample in range(1, 4):
                        run = await direct_sample(browser, origin, profile, kind, path, sample, args.auth_origin, share_token)
                        receipt["runs"].append(run)
                        print(json.dumps({k: run.get(k) for k in ("profile", "mode", "route", "sample", "failure", "lcp_ms", "cls", "usable_ms", "request_count", "transfer_bytes", "long_task_total_ms", "flag_wait_ms", "blocked_by_category")}, ensure_ascii=False), flush=True)
                for sample in range(1, 4):
                    run = await internal_sample(browser, origin, profile, sample, args.auth_origin, share_token)
                    receipt["runs"].append(run)
                    print(json.dumps({k: run.get(k) for k in ("profile", "mode", "route", "sample", "failure", "lcp_ms", "cls", "usable_ms", "request_count", "transfer_bytes", "long_task_total_ms", "flag_wait_ms", "blocked_by_category")}, ensure_ascii=False), flush=True)
            await browser.close()
    finally:
        if server:
            server.shutdown()
            server.server_close()
    receipt["summary"] = aggregate(receipt["runs"])
    pathlib.Path(args.output).write_text(json.dumps(receipt, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"output": args.output, "summary": receipt["summary"]}, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    asyncio.run(main())
