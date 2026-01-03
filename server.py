#!/usr/bin/env python3
"""
Simple HTTP server for serving the redshift simulation.
Run this script and open http://localhost:8000 in your browser.
NO-CACHE VERSION - Forces browser to reload all files
"""

import http.server
import socketserver
import os

PORT = 8000

os.chdir(os.path.dirname(os.path.abspath(__file__)))

class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    """HTTP handler that prevents caching"""

    def end_headers(self):
        # Add no-cache headers to force browser to reload files
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

# Add proper MIME types for JavaScript modules
NoCacheHandler.extensions_map['.js'] = 'application/javascript'
NoCacheHandler.extensions_map['.mjs'] = 'application/javascript'

print(f"""
============================================================
          Redshift Simulation - 3D Visualization
============================================================
  Server running at: http://localhost:{PORT}

  ** NO-CACHE MODE ENABLED **
  All files will be reloaded fresh on each request!

  Press Ctrl+C to stop
============================================================
""")

with socketserver.TCPServer(("", PORT), NoCacheHandler) as httpd:
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
