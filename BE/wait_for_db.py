"""Wait until the HA PostgreSQL URI can route a connection to the primary."""

import sys
import time

import psycopg2
from app.config import DATABASE_URL

deadline = time.monotonic() + 180
while time.monotonic() < deadline:
    try:
        conn = psycopg2.connect(DATABASE_URL, connect_timeout=3)
        conn.close()
        print("[STARTUP] PostgreSQL primary is accepting connections.", flush=True)
        sys.exit(0)
    except Exception as exc:
        print(f"[STARTUP] Waiting for PostgreSQL primary: {exc}", flush=True)
        time.sleep(3)

raise SystemExit("PostgreSQL primary was not ready within 180 seconds")
