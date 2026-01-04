#!/usr/bin/env python3
"""Start the AI Orchestrator HTTP server."""

import os
import sys
import logging

# Load environment from .env file
from pathlib import Path
env_file = Path(__file__).parent / ".env"
if env_file.exists():
    with open(env_file) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                os.environ[key] = value

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

# Configure logging
logging.basicConfig(level=logging.INFO)

# Import only what we need for HTTP server (avoid MCP imports)
from ai_orchestrator.http_server import run_http_server

if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    run_http_server(port=port)
