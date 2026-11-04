"""Real browser cookies + real writer adapters against a local protected API.

No live account, Vercel protection setting, or product data is changed.
"""
import json
import threading
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from playwright.sync_api import sync_playwright

CALLS = []
UID = "11111111-1111-4111-8111-111111111111"


class ReviewServer(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def do_GET(self):
        self.respond()

    def do_POST(self):
        self.rfile.read(int(self.headers.get("Content-Length", "0")))
        self.respond()

    def respond(self):
        if self.path == "/":
            self.send_response(200)
            self.send_header("Content-Type", "text/html")
            self.send_header("Set-Cookie", "preview_access=review-only; HttpOnly; SameSite=Lax; Path=/")
            self.end_headers()
            self.wfile.write(b"<!doctype html><title>Protected Preview regression</title>")
            return
        if self.path == "/sso-login":
            self.send_response(200)
            self.send_header("Content-Type", "text/html")
            self.end_headers()
            self.wfile.write(b"<h1>Deployment authentication required</h1>")
            return
        if self.path.startswith("/api/"):
            authorized = self.headers.get("Authorization", "").startswith("Bearer ")
            permitted = "preview_access=review-only" in self.headers.get("Cookie", "")
            CALLS.append({"path": self.path, "method": self.command, "access": permitted, "bearer": authorized})
            if not permitted:
                self.send_response(302)
                self.send_header("Location", "/sso-login")
                self.end_headers()
                return
            private = self.path.startswith("/api/contributor-self") or self.command == "POST"
            value = {"state": "ready"}
            status = 200
            if private and not authorized:
                status, value = 401, {"state": "login_required"}
            elif self.path.startswith("/api/public-contributor-rank"):
                value.update(level=5, label="חוקר היכל")
            elif self.path.startswith("/api/contributor-interactions"):
                value.update(state="sent" if self.command == "POST" else "ready", message="ready")
            elif self.command == "POST":
                value = {"state": "saved"}
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Cache-Control", "private, no-store")
            self.end_headers()
            self.wfile.write(json.dumps(value, ensure_ascii=False).encode())
            return
        with urllib.request.urlopen("http://127.0.0.1:5182" + self.path, timeout=20) as response:
            self.send_response(response.status)
            self.send_header("Content-Type", response.headers.get("Content-Type", "text/javascript"))
            self.end_headers()
            self.wfile.write(response.read())


server = ThreadingHTTPServer(("127.0.0.1", 0), ReviewServer)
threading.Thread(target=server.serve_forever, daemon=True).start()
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path="/usr/bin/chromium", args=["--no-sandbox"])
        page = browser.new_page()
        # Dependencies can issue no live network requests during this regression.
        page.route("**/*", lambda route: route.continue_() if route.request.url.startswith("http://127.0.0.1:") else route.abort())
        page.goto(f"http://127.0.0.1:{server.server_port}/")
        result = page.evaluate("""async (uid) => {
          const personal = await import('/src/lib/userCenter/writerPersonal2029.js');
          const rank = await import('/src/components/contributor2029/contributorRank2029Model.js');
          const overview = await import('/src/components/contributor2029/contributorOverview2029Model.js');
          const interactions = await import('/src/components/contributor2029/contributorInteractions2029.js');
          const curation = await import('/src/components/contributor2029/contributorCuration2029Model.js');
          const auth = {getSession: async () => ({data:{session:{user:{id:uid},access_token:'synthetic_review_token'}}})};
          // Reproduce the previous request: an accessible document, but an HTML SSO response to fetch.
          const oldResponse = await fetch('/api/contributor-self', {credentials:'omit'});
          const oldWasLoginHtml = oldResponse.redirected && (await oldResponse.text()).includes('Deployment authentication');
          const cookieOnly = await fetch('/api/contributor-self', {credentials:'same-origin'});
          const outputs = [
            await personal.writerSelfRequest({userId:uid,auth}),
            await personal.writerSelfRequest({userId:uid,auth,action:'portrait',payload:{enabled:false,ack:true}}),
            await rank.fetchPublicContributorRank('writer'),
            await overview.fetchContributorOverview('writer'),
            await interactions.contributorInteraction('writer'),
            await interactions.contributorInteraction('writer',{userId:uid,auth,body:'local fixture'}),
            await curation.updateWriterCuration('writer','pin',{}, {userId:uid,auth})
          ];
          const switched = await personal.writerSelfRequest({userId:'different-account',auth});
          return {oldWasLoginHtml,cookieOnly:cookieOnly.status,states:outputs.map(x=>x.state),switched:switched.state};
        }""", UID)
        assert result == {"oldWasLoginHtml": True, "cookieOnly": 401,
                          "states": ["ready", "saved", "ready", "ready", "ready", "sent", "saved"],
                          "switched": "login_required"}, result
        assert all(row["access"] for row in CALLS[1:]), CALLS
        assert all(not row["bearer"] for row in CALLS if "public-overview" in row["path"] or "public-contributor-rank" in row["path"]), CALLS
        browser.close()
        print(json.dumps({"protected_preview_flow": "PASS", **result}))
finally:
    server.shutdown()
    server.server_close()
