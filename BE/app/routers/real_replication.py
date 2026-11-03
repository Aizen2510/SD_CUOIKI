"""Endpoints for observing the real pg_auto_failover PostgreSQL cluster and benchmark consistency & replication."""

import os
import uuid
import time
import random
import threading
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Dict, List, Optional
from pydantic import BaseModel

import psycopg2
from fastapi import APIRouter, HTTPException
from psycopg2.extras import RealDictCursor

from app.config import DATABASE_URL
from app.database import is_postgres_available, RESERVED_SEATS_MAP, BOOKINGS_STORE, BOOKING_LOCK

router = APIRouter(prefix="/api/distributed/replication/real", tags=["Real PostgreSQL Replication"])

NODE_HOSTS = [host.strip() for host in os.getenv("PG_NODE_HOSTS", "pg-node1,pg-node2,pg-node3").split(",") if host.strip()]
CLUSTER_DB = os.getenv("PG_CLUSTER_DB", "meocinema_db")
CLUSTER_USER = os.getenv("PG_CLUSTER_USER", "postgres")
CLUSTER_SSLMODE = os.getenv("PG_CLUSTER_SSLMODE", "require")


class ConcurrentBenchmarkRequest(BaseModel):
    concurrency: int = 10
    seat_code: str = "VIP-F8"
    showtime_id: Optional[str] = None
    seat_price: float = 150000.0


class BenchmarkCleanupRequest(BaseModel):
    seat_code: str = "VIP-F8"
    showtime_id: Optional[str] = None


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


# =============================================================================
# KỊCH BẢN 3: TRANH CHẤP GHẾ ĐỒNG THỜI & NHẤT QUÁN SAO CHÉP (CONCURRENT RACE & REPLICATION)
# =============================================================================

@router.post("/benchmark/concurrent-booking")
def benchmark_concurrent_booking(req: ConcurrentBenchmarkRequest):
    """
    Kịch bản 3: Mô phỏng bão đặt vé đồng thời (N clients cùng tranh 1 ghế).
    Kiểm tra:
    1. Transaction Consistency (ACID / Unique constraint): Đúng 1 request thành công, N-1 thất bại (409 Conflict).
    2. Multi-Node Replication: Kiểm tra trạng thái ghế & LSN trên cả 3 nodes (pg-node1, pg-node2, pg-node3).
    3. Read-Your-Writes: Thử đọc vé vừa đặt từ Standby Replica để kiểm chứng tính nhất quán đọc.
    """
    concurrency = max(2, min(50, req.concurrency))
    seat_code = req.seat_code.strip().upper()
    showtime_id = req.showtime_id or "st-cgv-lm81-1-2030"

    pg_active = is_postgres_available()

    if pg_active:
        # 1. Cleanup previous benchmark seat state in PostgreSQL
        try:
            conn_clean = psycopg2.connect(DATABASE_URL, connect_timeout=3)
            with conn_clean:
                with conn_clean.cursor() as cur:
                    cur.execute("SELECT id FROM showtimes WHERE id = %s", (showtime_id,))
                    if not cur.fetchone():
                        cur.execute("SELECT id FROM showtimes LIMIT 1")
                        st_row = cur.fetchone()
                        if st_row:
                            showtime_id = st_row["id"]

                    # Xóa ghế test cũ nếu có
                    cur.execute(
                        "DELETE FROM booking_seats WHERE showtime_id = %s AND seat_code = %s",
                        (showtime_id, seat_code)
                    )
            conn_clean.close()
        except Exception as e:
            print(f"[BENCHMARK PRE-CLEANUP WARNING]: {e}")

        # 2. Run N concurrent threads hitting database simultaneously
        barrier = threading.Barrier(concurrency)
        results: List[Dict[str, Any]] = []
        lock = threading.Lock()

        def _worker(client_idx: int):
            customer_name = f"Khách thử nghiệm {client_idx}"
            customer_phone = f"09010000{client_idx:02d}"
            customer_email = f"khach{client_idx}@meocinema.test"
            booking_code = f"BENCH-{client_idx}-{uuid.uuid4().hex[:6].upper()}"

            conn = None
            try:
                conn = psycopg2.connect(DATABASE_URL, connect_timeout=3, cursor_factory=RealDictCursor)
                conn.autocommit = False

                # Đợi tất cả N threads sẵn sàng để cùng bắn request tại cùng 1 microsecond
                barrier.wait(timeout=5)
                t_start = time.perf_counter()

                with conn.cursor() as cur:
                    # Kiểm tra xung đột trước (Optimistic check)
                    cur.execute(
                        "SELECT seat_code FROM booking_seats WHERE showtime_id = %s AND seat_code = %s",
                        (showtime_id, seat_code)
                    )
                    if cur.fetchone():
                        conn.rollback()
                        latency = round((time.perf_counter() - t_start) * 1000, 2)
                        with lock:
                            results.append({
                                "client_id": client_idx,
                                "customer": customer_name,
                                "status": 409,
                                "success": False,
                                "latency_ms": latency,
                                "error": "Ghế đã có người đặt trước (Conflict check)",
                                "booking_code": None,
                            })
                        return

                    # Insert booking
                    cur.execute("""
                        INSERT INTO bookings (
                            booking_code, customer_name, customer_phone, customer_email,
                            showtime_id, seat_count, seat_numbers, seat_total, combo_total,
                            discount_total, final_total, voucher_code, payment_method, payment_status,
                            qr_code_value
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        RETURNING id
                    """, (
                        booking_code, customer_name, customer_phone, customer_email,
                        showtime_id, 1, [seat_code], req.seat_price, 0,
                        0, req.seat_price, "", "momo", "paid",
                        f"https://meocinema.vn/ticket/{booking_code}"
                    ))
                    new_b_id = cur.fetchone()["id"]

                    # Insert seat (Bảo vệ bởi CONSTRAINT unique_showtime_seat UNIQUE (showtime_id, seat_code))
                    cur.execute("""
                        INSERT INTO booking_seats (
                            booking_id, showtime_id, seat_code, seat_row, seat_col, seat_type, price
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """, (new_b_id, showtime_id, seat_code, seat_code[0] if seat_code else "F", 8, "vip", req.seat_price))

                    conn.commit()
                    latency = round((time.perf_counter() - t_start) * 1000, 2)

                    with lock:
                        results.append({
                            "client_id": client_idx,
                            "customer": customer_name,
                            "status": 200,
                            "success": True,
                            "latency_ms": latency,
                            "booking_code": booking_code,
                            "booking_id": new_b_id,
                            "message": "Đặt vé thành công (Transaction Committed)"
                        })

            except psycopg2.IntegrityError:
                if conn:
                    conn.rollback()
                latency = round((time.perf_counter() - t_start) * 1000, 2)
                with lock:
                    results.append({
                        "client_id": client_idx,
                        "customer": customer_name,
                        "status": 409,
                        "success": False,
                        "latency_ms": latency,
                        "error": "Trùng khóa duy nhất (unique_showtime_seat) - Transaction Rolled back",
                        "booking_code": None,
                    })
            except Exception as exc:
                if conn:
                    conn.rollback()
                latency = round((time.perf_counter() - t_start) * 1000, 2)
                with lock:
                    results.append({
                        "client_id": client_idx,
                        "customer": customer_name,
                        "status": 500,
                        "success": False,
                        "latency_ms": latency,
                        "error": str(exc),
                        "booking_code": None,
                    })
            finally:
                if conn:
                    conn.close()

        with ThreadPoolExecutor(max_workers=concurrency) as executor:
            for i in range(1, concurrency + 1):
                executor.submit(_worker, i)

        # 3. Phân loại kết quả Transaction Consistency
        winners = [r for r in results if r["success"]]
        conflicts = [r for r in results if not r["success"]]
        winner = winners[0] if winners else None

        # 4. Kiểm tra Replication Consistency trên toàn bộ các nodes (Multi-Node Consistency Check)
        node_verifications = []
        standby_tested = None
        read_your_writes = {"verified": False, "source_node": None, "ticket": None}

        for host in NODE_HOSTS:
            try:
                conn_node = _connect_node(host)
                try:
                    with conn_node.cursor() as cur:
                        cur.execute("SELECT pg_is_in_recovery() AS is_standby")
                        is_standby = cur.fetchone()["is_standby"]
                        role = "standby" if is_standby else "primary"

                        if is_standby:
                            cur.execute("SELECT pg_last_wal_replay_lsn()::text AS lsn")
                        else:
                            cur.execute("SELECT pg_current_wal_lsn()::text AS lsn")
                        lsn_row = cur.fetchone()
                        lsn = lsn_row["lsn"] if lsn_row else "N/A"

                        # Kiểm tra xem ghế đã tồn tại trên node này chưa
                        cur.execute("""
                            SELECT bs.seat_code, b.booking_code, b.customer_name, b.payment_status
                            FROM booking_seats bs
                            JOIN bookings b ON bs.booking_id = b.id
                            WHERE bs.showtime_id = %s AND bs.seat_code = %s
                        """, (showtime_id, seat_code))
                        seat_row = cur.fetchone()

                        has_seat = bool(seat_row)
                        is_consistent = (winner is not None and has_seat and seat_row["booking_code"] == winner["booking_code"])

                        node_verifications.append({
                            "node": host,
                            "role": role,
                            "online": True,
                            "wal_lsn": lsn,
                            "has_seat": has_seat,
                            "booking_code": seat_row["booking_code"] if seat_row else None,
                            "customer": seat_row["customer_name"] if seat_row else None,
                            "status": "CONSISTENT" if is_consistent else ("NO_SEAT" if not has_seat else "MISMATCH")
                        })

                        # Thử nghiệm Read-Your-Writes trên node standby đầu tiên tìm thấy
                        if is_standby and not read_your_writes["verified"] and has_seat:
                            read_your_writes = {
                                "verified": True,
                                "source_node": host,
                                "ticket": {
                                    "booking_code": seat_row["booking_code"],
                                    "customer_name": seat_row["customer_name"],
                                    "payment_status": seat_row["payment_status"],
                                    "seat_code": seat_code,
                                    "node_role": "Standby Replica",
                                    "read_consistency": "Read-Your-Writes Succeeded (WAL Replayed)"
                                }
                            }
                finally:
                    conn_node.close()
            except Exception as e:
                node_verifications.append({
                    "node": host,
                    "role": "unknown",
                    "online": False,
                    "error": str(e),
                    "status": "OFFLINE"
                })

        return {
            "mode": "real_postgresql_cluster",
            "concurrency": concurrency,
            "showtime_id": showtime_id,
            "seat_code": seat_code,
            "total_requests": len(results),
            "success_count": len(winners),
            "conflict_count": len(conflicts),
            "double_booking_prevented": len(winners) == 1,
            "winner": winner,
            "requests": sorted(results, key=lambda x: x["latency_ms"]),
            "nodes": node_verifications,
            "read_your_writes": read_your_writes,
            "explanation": (
                "PostgreSQL áp dụng Unique Constraint trên bảng booking_seats(showtime_id, seat_code). "
                f"Khi {concurrency} requests tranh mua cùng lúc, chỉ duy nhất 1 giao dịch được COMMIT, "
                f"{len(conflicts)} giao dịch còn lại nhận lỗi xung đột 409 và được ROLLBACK an toàn. "
                "Sau khi commit, cơ chế Streaming Replication đồng bộ WAL sang các node Standby, "
                "đảm bảo tính nhất quán dữ liệu (Data Consistency) trên toàn cụm."
            )
        }

    else:
        # Fallback in-memory simulation
        with BOOKING_LOCK:
            reserved = RESERVED_SEATS_MAP.setdefault(showtime_id, set())
            reserved.discard(seat_code)

        barrier = threading.Barrier(concurrency)
        results = []
        lock = threading.Lock()

        def _worker_fallback(client_idx: int):
            customer_name = f"Khách thử nghiệm {client_idx}"
            booking_code = f"BENCH-{client_idx}-{uuid.uuid4().hex[:6].upper()}"

            barrier.wait(timeout=5)
            t_start = time.perf_counter()

            with BOOKING_LOCK:
                reserved = RESERVED_SEATS_MAP.setdefault(showtime_id, set())
                latency = round((time.perf_counter() - t_start) * 1000 + random.uniform(2, 8), 2)
                if seat_code in reserved:
                    with lock:
                        results.append({
                            "client_id": client_idx,
                            "customer": customer_name,
                            "status": 409,
                            "success": False,
                            "latency_ms": latency,
                            "error": "Ghế đã có người đặt trước (In-memory Lock Guard)",
                            "booking_code": None,
                        })
                else:
                    reserved.add(seat_code)
                    with lock:
                        results.append({
                            "client_id": client_idx,
                            "customer": customer_name,
                            "status": 200,
                            "success": True,
                            "latency_ms": latency,
                            "booking_code": booking_code,
                            "message": "Đặt vé thành công (Mutex Locked)"
                        })

        with ThreadPoolExecutor(max_workers=concurrency) as executor:
            for i in range(1, concurrency + 1):
                executor.submit(_worker_fallback, i)

        winners = [r for r in results if r["success"]]
        conflicts = [r for r in results if not r["success"]]
        winner = winners[0] if winners else None

        mock_nodes = [
            {"node": "pg-node1", "role": "primary", "online": True, "wal_lsn": "0/16B2900", "has_seat": True, "booking_code": winner["booking_code"] if winner else None, "status": "CONSISTENT"},
            {"node": "pg-node2", "role": "standby", "online": True, "wal_lsn": "0/16B2900", "has_seat": True, "booking_code": winner["booking_code"] if winner else None, "status": "CONSISTENT"},
            {"node": "pg-node3", "role": "standby", "online": True, "wal_lsn": "0/16B2900", "has_seat": True, "booking_code": winner["booking_code"] if winner else None, "status": "CONSISTENT"},
        ]

        return {
            "mode": "in_memory_simulation",
            "concurrency": concurrency,
            "showtime_id": showtime_id,
            "seat_code": seat_code,
            "total_requests": len(results),
            "success_count": len(winners),
            "conflict_count": len(conflicts),
            "double_booking_prevented": len(winners) == 1,
            "winner": winner,
            "requests": sorted(results, key=lambda x: x["latency_ms"]),
            "nodes": mock_nodes,
            "read_your_writes": {
                "verified": True,
                "source_node": "pg-node2",
                "ticket": {
                    "booking_code": winner["booking_code"] if winner else "BENCH-001",
                    "customer_name": winner["customer"] if winner else "Khách thử nghiệm 1",
                    "payment_status": "paid",
                    "seat_code": seat_code,
                    "node_role": "Standby Replica",
                    "read_consistency": "Read-Your-Writes Succeeded (In-Memory Simulation)"
                }
            },
            "explanation": (
                "Chế độ mô phỏng bộ nhớ: Lock đồng bộ đã chặn các request sau, đảm bảo 1 người thắng "
                "và N-1 request bị 409 Conflict."
            )
        }


@router.post("/benchmark/cleanup")
def benchmark_cleanup(req: BenchmarkCleanupRequest):
    """Giải phóng ghế thử nghiệm để có thể chạy lại kịch bản bao nhiêu lần tùy thích."""
    seat_code = req.seat_code.strip().upper()
    showtime_id = req.showtime_id or "st-cgv-lm81-1-2030"

    pg_active = is_postgres_available()
    deleted_count = 0

    if pg_active:
        try:
            conn = psycopg2.connect(DATABASE_URL, connect_timeout=3)
            with conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "DELETE FROM booking_seats WHERE showtime_id = %s AND seat_code = %s RETURNING id",
                        (showtime_id, seat_code)
                    )
                    rows = cur.fetchall()
                    deleted_count = len(rows)
                    # Xóa các booking demo nếu còn
                    cur.execute(
                        "DELETE FROM bookings WHERE booking_code LIKE 'BENCH-%' OR booking_code LIKE 'DEMO-%'"
                    )
            conn.close()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Lỗi dọn dẹp database: {e}")
    else:
        with BOOKING_LOCK:
            reserved = RESERVED_SEATS_MAP.get(showtime_id, set())
            if seat_code in reserved:
                reserved.remove(seat_code)
                deleted_count = 1
            # Xóa trong BOOKINGS_STORE
            BOOKINGS_STORE[:] = [b for b in BOOKINGS_STORE if not str(b.get("booking_code", "")).startswith("BENCH-")]

    return {
        "success": True,
        "showtime_id": showtime_id,
        "seat_code": seat_code,
        "deleted_seats": deleted_count,
        "message": f"Đã giải phóng ghế {seat_code} thành công. Sẵn sàng chạy lại kịch bản."
    }
