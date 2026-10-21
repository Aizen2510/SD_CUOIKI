"""Endpoints for observing the real pg_auto_failover PostgreSQL cluster."""

import os
import uuid
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
    return psycopg2.connect(
        host=host,
        port=5432,
        dbname=CLUSTER_DB,
        user=CLUSTER_USER,
        sslmode=CLUSTER_SSLMODE,
        connect_timeout=1,
        cursor_factory=RealDictCursor,
    )


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
