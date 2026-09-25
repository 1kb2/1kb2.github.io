#!/usr/bin/env python3
"""Local dev server that mimics GitHub Pages: serves the static files, and
returns 404.html (with a real 404 status) for any path that doesn't exist.

Only a local convenience for previewing - GitHub Pages serves 404.html on its
own, so this file isn't needed in production (harmless if it ships).

    python3 serve.py [port]      # default 8137
"""
import functools
import http.server
import os
import socketserver
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8137


class Handler(http.server.SimpleHTTPRequestHandler):
    def send_error(self, code, message=None, explain=None):
        page = os.path.join(ROOT, "404.html")
        if code == 404 and os.path.isfile(page):
            body = open(page, "rb").read()
            self.send_response(404)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            if self.command != "HEAD":
                self.wfile.write(body)
            return
        super().send_error(code, message, explain)


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True    # don't trip over a socket in TIME_WAIT
    daemon_threads = True         # handle requests concurrently, exit cleanly


if __name__ == "__main__":
    handler = functools.partial(Handler, directory=ROOT)
    try:
        httpd = Server(("", PORT), handler)
    except OSError as e:
        if e.errno == 98:  # address already in use
            sys.exit(f"port {PORT} is already in use (another preview/server?).\n"
                     f"stop it, or pick another port:  python3 serve.py {PORT + 1}")
        raise
    with httpd:
        print(f"serving {ROOT}\n  http://localhost:{PORT}  (custom 404.html) - Ctrl+C to stop")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nstopped")
