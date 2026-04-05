#!/usr/bin/env python3
"""
Simple HTTP server for offline app deployment
Serves the modular app locally with proper MIME types and caching headers
"""
import http.server
import socketserver
import os
import sys
import webbrowser
from pathlib import Path

PORT = 8000
SCRIPT_DIR = Path(__file__).parent

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(SCRIPT_DIR), **kwargs)
    
    def end_headers(self):
        # Add headers for offline support
        self.send_header('Cache-Control', 'public, max-age=31536000')
        self.send_header('Service-Worker-Allowed', '/')
        
        # MIME types
        if self.path.endswith('.js'):
            self.send_header('Content-Type', 'application/javascript')
        elif self.path.endswith('.mjs'):
            self.send_header('Content-Type', 'application/javascript')
        elif self.path.endswith('.css'):
            self.send_header('Content-Type', 'text/css')
        
        super().end_headers()

    def log_message(self, format, *args):
        print(f"[{self.client_address[0]}] {format % args}")

def main():
    os.chdir(SCRIPT_DIR)
    handler = MyHTTPRequestHandler
    
    try:
        with socketserver.TCPServer(("", PORT), handler) as httpd:
            url = f"http://localhost:{PORT}/index.html"
            print("\n" + "="*70)
            print("🚀 Modular Offline App Server Started!")
            print("="*70)
            print(f"📍 Server running at: {url}")
            print(f"📂 Serving from: {SCRIPT_DIR}")
            print("\n✅ App is ready to use!")
            print("   • Supports all latest features")
            print("   • Works offline after first load")
            print("   • Code-split for fast initial load")
            print("   • Service Worker enabled")
            print("\n⌨️  Press Ctrl+C to stop the server")
            print("="*70 + "\n")
            
            # Try to open in default browser
            webbrowser.open(url)
            
            httpd.serve_forever()
    except OSError as e:
        if e.errno == 48 or e.errno == 98:  # Address already in use
            print(f"\n⚠️  Port {PORT} is already in use!")
            print("   Try closing other instances or use a different port:")
            print(f"   python3 start-server.py {PORT + 1}")
        else:
            print(f"❌ Error: {e}")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\n✋ Server stopped by user")
        sys.exit(0)

if __name__ == "__main__":
    main()
