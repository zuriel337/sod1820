from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from pathlib import Path
import sys
class Handler(SimpleHTTPRequestHandler):
 def do_GET(self):
  if not Path(self.translate_path(self.path.split('?')[0])).is_file(): self.path='/2029.html'
  return super().do_GET()
 def end_headers(self):
  if self.path.endswith(('.webp','.js','.css','.woff2')): self.send_header('Cache-Control','public, max-age=31536000, immutable')
  super().end_headers()
 def log_message(self,*args): pass
import os
os.chdir(sys.argv[1]);ThreadingHTTPServer(('0.0.0.0',int(sys.argv[2])),Handler).serve_forever()
