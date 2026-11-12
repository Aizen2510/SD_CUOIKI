"""Endpoints for the Chapter 7 consistency and replication demonstrations."""

import os
import uuid
import time
from contextlib import closing
from typing import Any, Dict, List

import psycopg2
from fastapi import APIRouter, HTTPException
from psycopg2.extras import RealDictCursor

from app.config import DATABASE_URL

router = APIRouter(prefix="/api/distributed/replication/real", tags=["Real PostgreSQL Replication"])

NODE_HOSTS = [host.strip() for host in os.getenv("PG_NODE_HOSTS", "pg-node1,pg-node2,pg-node3").split(",") if host.strip()]
CLUSTER_DB = os.getenv("PG_CLUSTER_DB", "meocinema_db")
CLUSTER_USER = os.getenv("PG_CLUSTER_USER", "postgres")
CLUSTER_SSLMODE = os.getenv("PG_CLUSTER_SSLMODE", "require")


def _connect_node(host: str):
    port = 5432
    actual_host = host
    if ":" in host:
        actual_host, p_str = host.split(":", 1)
        port = int(p_str)
    try:
        return psycopg2.connect(
            host=actual_host,
            port=port,
            dbname=CLUSTER_DB,
            user=CLUSTER_USER,
            sslmode=CLUSTER_SSLMODE,
            connect_timeout=1,
            cursor_factory=RealDictCursor,
        )
    except Exception:
        host_map = {
            "pg-node1": ("127.0.0.1", 5432),
            "pg-node2": ("127.0.0.1", 5433),
            "pg-node3": ("127.0.0.1", 5434),
        }
        if host in host_map:
            h, p = host_map[host]
            return psycopg2.connect(
                host=h,
                port=p,
                dbname=CLUSTER_DB,
                user=CLUSTER_USER,
                sslmode="prefer",
                connect_timeout=1,
                cursor_factory=RealDictCursor,
            )
        raise


def _node_status(host: str) -> Dict[str, Any]:
    conn = _connect_node(host)
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT pg_is_in_recovery() AS is_standby,
                       pg_last_wal_receive_lsn()::text AS receive_lsn,
                       pg_last_wal_replay_lsn()::text AS replay_lsn,
                       CASE WHEN pg_is_in_recovery()
                                  AND pg_last_wal_receive_lsn() <> pg_last_wal_replay_lsn()
                            THEN EXTRACT(EPOCH FROM (clock_timestamp() - pg_last_xact_replay_timestamp()))
                            ELSE 0 END AS replay_delay_seconds
            """)
            row = cur.fetchone()
            if row["is_standby"]:
                local_lsn = row["replay_lsn"] or row["receive_lsn"]
                replay_delay = row["replay_delay_seconds"]
            else:
                cur.execute("SELECT pg_current_wal_lsn()::text AS current_lsn")
                local_lsn = cur.fetchone()["current_lsn"]
                replay_delay = 0
            return {
                "name": host,
                "online": True,
                "role": "standby" if row["is_standby"] else "primary",
                "wal_lsn": local_lsn,
                "receive_lsn": row["receive_lsn"],
                "replay_lsn": row["replay_lsn"],
                "replay_delay_seconds": round(float(replay_delay or 0), 3),
            }
    finally:
        conn.close()


@router.get("/status")
def replication_status():
    nodes: List[Dict[str, Any]] = []
    for host in NODE_HOSTS:
        try:
            nodes.append(_node_status(host))
        except Exception as exc:
            nodes.append({"name": host, "online": False, "role": "offline", "error": str(exc)})

    primaries = [node["name"] for node in nodes if node["online"] and node["role"] == "primary"]
    online_count = sum(1 for node in nodes if node["online"])
    return {
        "replication": "postgresql_physical_streaming",
        "automatic_failover": True,
        "expected_nodes": len(NODE_HOSTS),
        "online_nodes": online_count,
        "active_primary": primaries[0] if len(primaries) == 1 else None,
        "primary_count": len(primaries),
        "healthy": online_count >= 2 and len(primaries) == 1,
        "nodes": nodes,
    }


@router.post("/demo-write")
def write_replication_demo_record():
    event_id = str(uuid.uuid4())
    conn = None
    try:
        conn = psycopg2.connect(DATABASE_URL, connect_timeout=3)
        with conn:
            with conn.cursor() as cur:
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS replication_demo_events (
                        event_id UUID PRIMARY KEY,
                        note TEXT NOT NULL,
                        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                cur.execute(
                    "INSERT INTO replication_demo_events (event_id, note) VALUES (%s, %s) RETURNING created_at",
                    (event_id, "MeoCinema real streaming replication demo"),
                )
                created_at = cur.fetchone()[0]
        return {
            "success": True,
            "event_id": event_id,
            "created_at": created_at.isoformat(),
            "written_via": "current PostgreSQL primary",
        }
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Không ghi được bản ghi demo vào PostgreSQL primary: {exc}") from exc
    finally:
        if conn:
            conn.close()


@router.get("/verify/{event_id}")
def verify_replication_record(event_id: uuid.UUID):
    results = []
    for host in NODE_HOSTS:
        try:
            conn = _connect_node(host)
            try:
                with conn.cursor() as cur:
                    cur.execute("""
                        SELECT event_id::text, note, created_at
                        FROM replication_demo_events
                        WHERE event_id = %s
                    """, (str(event_id),))
                    row = cur.fetchone()
                results.append({
                    "node": host,
                    "online": True,
                    "found": bool(row),
                    "event": dict(row) if row else None,
                })
            finally:
                conn.close()
        except Exception as exc:
            results.append({"node": host, "online": False, "found": False, "error": str(exc)})
    return {
        "event_id": str(event_id),
        "replicated_nodes": sum(1 for item in results if item["found"]),
        "nodes": results,
    }


@router.post("/consistency/read-after-write")
def demonstrate_read_after_write_consistency():
    """Write on the primary, observe standby visibility, then wait for replay before reading.

    This demonstrates a client-centric read-your-writes technique: carry the
    write's WAL position as a dependency and do not serve a standby read until
    that standby has replayed at least that position.
    """
    event_id = str(uuid.uuid4())
    try:
        with closing(psycopg2.connect(DATABASE_URL, connect_timeout=3)) as conn:
            with conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        CREATE TABLE IF NOT EXISTS replication_demo_events (
                            event_id UUID PRIMARY KEY,
                            note TEXT NOT NULL,
                            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
                        )
                    """)
            with conn.cursor() as cur:
                cur.execute("SELECT pg_current_wal_flush_lsn()::text")
                schema_lsn = cur.fetchone()[0]

        # Ensure this is not the table's first appearance on the standby. Otherwise
        # an immediate read could fail because the relation itself is not replayed yet.
        schema_deadline = time.monotonic() + 5
        ready_standbys: set = set()
        known_standbys: set = set()
        while time.monotonic() < schema_deadline:
            for host in NODE_HOSTS:
                if host in ready_standbys:
                    continue
                try:
                    with closing(_connect_node(host)) as conn:
                        with conn.cursor() as cur:
                            cur.execute("""
                                SELECT pg_is_in_recovery() AS standby,
                                       to_regclass('public.replication_demo_events') IS NOT NULL AS table_ready,
                                       pg_wal_lsn_diff(pg_last_wal_replay_lsn(), %s::pg_lsn) >= 0 AS caught_up
                            """, (schema_lsn,))
                            state = cur.fetchone()
                            if state["standby"]:
                                known_standbys.add(host)
                                if state["table_ready"] and state["caught_up"]:
                                    ready_standbys.add(host)
                except Exception:
                    pass
            if known_standbys and ready_standbys == known_standbys:
                break
            time.sleep(0.1)

        if not known_standbys or ready_standbys != known_standbys:
            raise RuntimeError("Không có Standby sẵn sàng sau khi replica nhận schema demo.")

        with closing(psycopg2.connect(DATABASE_URL, connect_timeout=3)) as conn:
            with conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "INSERT INTO replication_demo_events (event_id, note) VALUES (%s, %s)",
                        (event_id, "Read-your-writes consistency demonstration"),
                    )
        # Capture a primary WAL position after the event transaction committed.
        with closing(psycopg2.connect(DATABASE_URL, connect_timeout=3)) as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT pg_current_wal_flush_lsn()::text")
                write_lsn = cur.fetchone()[0]

    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Không khởi tạo hoặc ghi được demo consistency: {exc}") from exc

    observations: List[Dict[str, Any]] = []
    standby_hosts: List[str] = []
    for host in NODE_HOSTS:
        try:
            with closing(_connect_node(host)) as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT pg_is_in_recovery() AS standby")
                    is_standby = cur.fetchone()["standby"]
                    if is_standby:
                        standby_hosts.append(host)
                        cur.execute("""
                            SELECT event_id::text, note
                            FROM replication_demo_events WHERE event_id = %s
                        """, (event_id,))
                        row = cur.fetchone()
                        cur.execute("SELECT pg_last_wal_replay_lsn()::text AS replay_lsn")
                        replay_lsn = cur.fetchone()["replay_lsn"]
                        observations.append({
                            "node": host, "role": "standby", "phase": "immediate",
                            "found": bool(row), "replay_lsn": replay_lsn,
                        })
                    else:
                        cur.execute("""
                            SELECT event_id::text, note
                            FROM replication_demo_events WHERE event_id = %s
                        """, (event_id,))
                        row = cur.fetchone()
                        observations.append({
                            "node": host, "role": "primary", "phase": "immediate",
                            "found": bool(row), "replay_lsn": None,
                        })
        except Exception as exc:
            observations.append({"node": host, "role": "unknown", "phase": "immediate", "found": False, "error": str(exc)})

    deadline = time.monotonic() + 5
    caught_up: set = set()
    final_reads: Dict[str, bool] = {}
    while standby_hosts and time.monotonic() < deadline:
        for host in standby_hosts:
            if host in caught_up:
                continue
            try:
                with closing(_connect_node(host)) as conn:
                    with conn.cursor() as cur:
                        cur.execute("""
                            SELECT pg_wal_lsn_diff(pg_last_wal_replay_lsn(), %s::pg_lsn) >= 0 AS caught_up
                        """, (write_lsn,))
                        if cur.fetchone()["caught_up"]:
                            cur.execute("""
                                SELECT event_id::text FROM replication_demo_events WHERE event_id = %s
                            """, (event_id,))
                            final_reads[host] = cur.fetchone() is not None
                            caught_up.add(host)
            except Exception:
                pass
        if len(caught_up) < len(standby_hosts):
            time.sleep(0.1)

    return {
        "mode": "real_postgresql_cluster",
        "event_id": event_id,
        "write_lsn": write_lsn,
        "consistency_rule": "A standby read is served as read-your-writes only after replay LSN reaches write LSN.",
        "immediate_observations": observations,
        "standby_results": [
            {
                "node": host,
                "caught_up": host in caught_up,
                "read_after_wait_found": final_reads.get(host, False),
            }
            for host in standby_hosts
        ],
        "read_your_writes_satisfied": bool(standby_hosts) and len(caught_up) == len(standby_hosts)
        and all(final_reads.get(host, False) for host in standby_hosts),
    }
