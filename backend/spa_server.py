import http.server
import socketserver
import os
from pathlib import Path

PORT = 5173
DIRECTORY = str(Path(__file__).resolve().parent / "dist")

class SPAHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_GET(self):
        # If the requested path exists on disk, serve it
        full_path = os.path.join(DIRECTORY, self.path.lstrip("/").split("?")[0])
        if not os.path.exists(full_path) or os.path.isdir(full_path):
            self.path = "/index.html"
        return super().do_GET()

if __name__ == "__main__":
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("127.0.0.1", PORT), SPAHandler) as httpd:
        print(f"Serving SPA from {DIRECTORY} on http://127.0.0.1:{PORT}")
        httpd.serve_forever()
