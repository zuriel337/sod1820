"""Bounded GET/HEAD acceptance only; private access config stays outside Git."""
import json
import pathlib
import sys
from urllib.parse import urljoin, urlsplit
from urllib.request import build_opener, HTTPCookieProcessor, HTTPRedirectHandler, Request
from urllib.error import HTTPError
from http.cookiejar import CookieJar
from types import SimpleNamespace

class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None

def fetch(opener, url, method="GET"):
    try:
        response = opener.open(Request(url, method=method), timeout=25)
    except HTTPError as error:
        response = error
    with response:
        return SimpleNamespace(status_code=response.status, headers=response.headers,
                               content=response.read(1_000_000))

config = json.loads(pathlib.Path(sys.argv[1]).read_text())
origin = config["origin"]
assert origin == "https://sod1820-edca56j3h-sod1820-s-projects.vercel.app"
report = {"sourceSha": config["sha"], "origin": origin, "productWrites": 0, "checks": []}
headers = ("content-type", "cache-control", "x-robots-tag", "service-worker-allowed", "referrer-policy")
try:
    anonymous = fetch(build_opener(NoRedirect()), origin + "/")
    report["anonymousStatus"] = anonymous.status_code
    redirect = urlsplit(anonymous.headers.get("location", ""))
    report["anonymousRedirect"] = {"scheme": redirect.scheme, "host": redirect.netloc, "path": redirect.path}
    assert anonymous.status_code in (401, 403) or (anonymous.status_code == 302
        and (redirect.scheme, redirect.netloc, redirect.path) == ("https", "vercel.com", "/sso-api")), \
        "protected host must deny access or redirect only to the verified Vercel SSO entry"
    session = build_opener(NoRedirect(), HTTPCookieProcessor(CookieJar()))
    access = config["accessUrl"]
    for _ in range(4):
        assert urlsplit(access).scheme == "https" and urlsplit(access).netloc == urlsplit(origin).netloc
        response = fetch(session, access)
        if response.status_code not in (301, 302, 303, 307, 308):
            break
        access = urljoin(access, response.headers["location"])
    assert response.status_code == 200, "scoped access failed"
    for path in ("/", "/post/sprites-lightning-over-france", "/privacy", "/unsubscribe", "/sw.js"):
        response = fetch(session, origin + path, method="HEAD")
        item = {"path": path, "method": "HEAD", "status": response.status_code,
                "headers": {key: response.headers.get(key) for key in headers}, "bodyBytes": len(response.content)}
        report["checks"].append(item)
        assert response.status_code == 200 and not response.content
        assert response.headers.get("cache-control") == "no-store"
        assert "noindex" in response.headers.get("x-robots-tag", "")
    report["ok"] = True
except Exception as error:
    # Exception URLs, cookie jars and response bodies may contain access details.
    report["ok"] = False
    report["failureType"] = type(error).__name__
finally:
    pathlib.Path(sys.argv[2]).write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(report, ensure_ascii=False))
sys.exit(0 if report["ok"] else 1)
