"""Local-only 2029 static fallback for the ticker browser acceptance test."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit
import os

os.chdir('/tmp/ticker-local-static')

class Preview(SimpleHTTPRequestHandler):
    def do_GET(self):
        path = urlsplit(self.path).path
        if not Path('.' + path).is_file() and not path.startswith('/assets/'):
            self.path = '/2029.html'
        return super().do_GET()

ThreadingHTTPServer(('127.0.0.1', 5188), Preview).serve_forever()
