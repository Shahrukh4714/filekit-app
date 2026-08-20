"""FileKit local dev server — serves with WebAssembly COOP/COEP headers and correct MIME types.

Usage:  python serve.py [port]   (default port 8000)
"""
import http.server
import os
import socketserver
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000


class FileKitHandler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        '.wasm': 'application/wasm',
        '.onnx': 'application/octet-stream',
        '.mjs': 'application/javascript',
        '.json': 'application/json',
        '.svg': 'image/svg+xml',
    }

    def end_headers(self):
        # Enable SharedArrayBuffer & multi-threaded WASM in local dev
        self.send_header('Cross-Origin-Opener-Policy', 'same-origin')
        self.send_header('Cross-Origin-Embedder-Policy', 'require-corp')
        self.send_header('Cache-Control', 'no-cache, must-revalidate')
        super().end_headers()


if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.abspath(__file__)) or '.')
    with socketserver.ThreadingTCPServer(('127.0.0.1', PORT), FileKitHandler) as httpd:
        print(f'Serving FileKit on http://127.0.0.1:{PORT} (COOP/COEP WASM enabled)')
        httpd.serve_forever()
