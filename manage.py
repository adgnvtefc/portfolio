#!/usr/bin/env python3

import argparse
import json
import os
import tempfile
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parent
CONFIG_PATH = ROOT / "portfolio_designs" / "config.json"
MAX_REQUEST_BYTES = 16_384


class PortfolioHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def send_json(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def request_is_local(self):
        host = self.client_address[0]
        return host in {"127.0.0.1", "::1"}

    def origin_is_local(self):
        origin = self.headers.get("Origin")
        if not origin:
            return True

        port = self.server.server_port
        return origin in {
            f"http://127.0.0.1:{port}",
            f"http://localhost:{port}",
        }

    def do_GET(self):
        if urlsplit(self.path).path == "/__portfolio/status":
            self.send_json(
                200,
                {
                    "editor": True,
                    "writable": os.access(CONFIG_PATH, os.W_OK),
                },
            )
            return

        super().do_GET()

    def do_POST(self):
        if urlsplit(self.path).path != "/__portfolio/designs":
            self.send_error(404)
            return

        if not self.request_is_local() or not self.origin_is_local():
            self.send_json(403, {"error": "The editor only accepts local requests."})
            return

        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            self.send_json(400, {"error": "Invalid request length."})
            return

        if length <= 0 or length > MAX_REQUEST_BYTES:
            self.send_json(400, {"error": "Invalid request size."})
            return

        try:
            payload = json.loads(self.rfile.read(length))
            visible_ids = payload["visibleIds"]
        except (json.JSONDecodeError, KeyError, TypeError):
            self.send_json(400, {"error": "Expected a list of visible design IDs."})
            return

        if not isinstance(visible_ids, list) or not all(
            isinstance(design_id, str) for design_id in visible_ids
        ):
            self.send_json(400, {"error": "Expected a list of visible design IDs."})
            return

        try:
            config = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
            designs = config["designs"]
            known_ids = {design["id"] for design in designs}
        except (OSError, json.JSONDecodeError, KeyError, TypeError):
            self.send_json(500, {"error": "The design configuration is invalid."})
            return

        requested_ids = set(visible_ids)
        if len(requested_ids) != len(visible_ids) or not requested_ids <= known_ids:
            self.send_json(400, {"error": "The selection contains an unknown design."})
            return

        for design in designs:
            design["showInBar"] = design["id"] in requested_ids

        try:
            with tempfile.NamedTemporaryFile(
                "w",
                encoding="utf-8",
                dir=CONFIG_PATH.parent,
                prefix=".config-",
                suffix=".json",
                delete=False,
            ) as temporary_file:
                json.dump(config, temporary_file, indent=2)
                temporary_file.write("\n")
                temporary_path = Path(temporary_file.name)

            os.chmod(temporary_path, 0o644)
            os.replace(temporary_path, CONFIG_PATH)
        except OSError:
            self.send_json(500, {"error": "Could not write the design configuration."})
            return

        self.send_json(200, config)


class PortfolioServer(ThreadingHTTPServer):
    allow_reuse_address = True
    daemon_threads = True


def main():
    parser = argparse.ArgumentParser(description="Run the local portfolio editor.")
    parser.add_argument("--port", type=int, default=4173)
    args = parser.parse_args()

    server = PortfolioServer(("127.0.0.1", args.port), PortfolioHandler)
    print(f"Portfolio editor: http://127.0.0.1:{args.port}/", flush=True)

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
