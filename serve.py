"""FileKit local dev server — serves the project with no-cache headers.

Usage:  py serve.py [port]   (default port 8000)
"""
import http.server
import os
import socketserver
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()


if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.abspath(__file__)) or '.')
    with socketserver.ThreadingTCPServer(('127.0.0.1', PORT), NoCacheHandler) as httpd:
        print(f'Serving FileKit on http://127.0.0.1:{PORT} (no-cache)')
        httpd.serve_forever()
