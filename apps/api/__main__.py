"""Run the demo: python3 -m apps.api [--port 8000]"""

import argparse
import os

from apps.api.server import serve

parser = argparse.ArgumentParser(description="Run the RED COLA – BLUE COLA demo.")
parser.add_argument("--host", default=os.environ.get("HOST", "127.0.0.1"))
parser.add_argument("--port", type=int, default=int(os.environ.get("PORT", "8000")))
args = parser.parse_args()
serve(args.host, args.port)
