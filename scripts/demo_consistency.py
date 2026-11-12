#!/usr/bin/env python3
"""Run the Chapter 7 read-your-writes consistency demonstration."""

import argparse
import json
import sys
import urllib.error
import urllib.request


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Demo read-your-writes consistency across PostgreSQL replicas"
    )
    parser.add_argument("--url", default="http://localhost:5000", help="Backend base URL")
    args = parser.parse_args()
    url = args.url.rstrip("/") + "/api/distributed/replication/real/consistency/read-after-write"
    request = urllib.request.Request(url, data=b"{}", headers={"Content-Type": "application/json"})

    try:
        with urllib.request.urlopen(request, timeout=35) as response:
            result = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        print(f"API error ({exc.code}): {detail}", file=sys.stderr)
        return 1
    except (urllib.error.URLError, TimeoutError) as exc:
        print(f"Cannot reach backend at {url}: {exc}", file=sys.stderr)
        return 1

    print("[1. CONSISTENCY: write on primary, immediate reads]")
    print(f"Event: {result.get('event_id')} | write LSN: {result.get('write_lsn')}")
    for node in result.get("immediate_observations", []):
        if node.get("error"):
            state = f"unavailable ({node['error']})"
        else:
            state = "event visible" if node.get("found") else "event not visible yet"
        print(f"  {node['node']} ({node['role']}): {state}; replay LSN={node.get('replay_lsn', 'N/A')}")

    print("\n[2. READ-YOUR-WRITES: wait for replay before standby read]")
    for node in result.get("standby_results", []):
        if node.get("caught_up") and node.get("read_after_wait_found"):
            state = "write LSN replayed; event visible"
        else:
            state = "not confirmed before timeout"
        print(f"  {node['node']}: {state}")
    print("\n" + ("Read-your-writes satisfied on all active standbys." if result.get("read_your_writes_satisfied")
                   else "Read-your-writes was not confirmed on every standby."))
    return 0 if result.get("read_your_writes_satisfied") else 2


if __name__ == "__main__":
    raise SystemExit(main())
