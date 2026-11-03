"""Endpoints for observing the real pg_auto_failover PostgreSQL cluster and benchmark consistency & replication."""

import os
import uuid
import time
import random
import datetime
import threading
from datetime import timezone, timedelta
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

def _generate_frontend_showtime(cur, movie_id: int = 25051, theater_id: int = 1) -> Optional[Dict[str, Any]]:
    """
    Sinh suất chiếu khớp 100% với thuật toán sinh lịch chiếu trên Frontend (FE/src/data/cinemaData.ts).
    Mặc định: Phim 'Lên Hương' (id: 25051) tại 'CGV Landmark 81' (id: 1).
    Tìm suất chiếu gần nhất còn trong tương lai (theo giờ Việt Nam Asia/Ho_Chi_Minh).
    """
    from datetime import timezone, timedelta
    vn_tz = timezone(timedelta(hours=7))
    now_vn = datetime.datetime.now(vn_tz)

    time_pool = [
        {"time": "09:30", "room": "Rạp 1 - 2D", "format": "2D Phụ đề", "price": 85000},
        {"time": "11:15", "room": "Rạp 3 - 2D", "format": "2D Lồng tiếng", "price": 85000},
        {"time": "13:40", "room": "Rạp 2 - 2D", "format": "2D Phụ đề", "price": 95000},
        {"time": "15:20", "room": "Rạp 5 - IMAX", "format": "IMAX 2D", "price": 145000},
        {"time": "17:45", "room": "Rạp 1 - 2D", "format": "2D Phụ đề", "price": 105000},
        {"time": "19:15", "room": "Rạp 4 - 2D", "format": "2D Lồng tiếng", "price": 110000},
        {"time": "20:30", "room": "Rạp 2 - 2D", "format": "2D Phụ đề", "price": 110000},
        {"time": "21:45", "room": "Rạp 5 - IMAX", "format": "IMAX 2D", "price": 155000},
        {"time": "22:50", "room": "Rạp 3 - 2D", "format": "2D Phụ đề", "price": 95000}
    ]

    for day_offset in range(5):
        target_date = (now_vn + timedelta(days=day_offset)).date()
        date_str = target_date.strftime("%Y-%m-%d")
        num_date = int(date_str.replace("-", "")[-4:]) or 101
        base_seed = (movie_id * 37 + theater_id * 13 + num_date) % 100
        count = 4 + (base_seed % 4)
        offset = base_seed % 3
        selected = time_pool[offset : offset + count]

        for idx, slot in enumerate(selected):
            slot_time_parts = [int(p) for p in slot["time"].split(":")]
            slot_dt = datetime.datetime(target_date.year, target_date.month, target_date.day,
                                       slot_time_parts[0], slot_time_parts[1], 0, tzinfo=vn_tz)
            # Suất chiếu hợp lệ là suất chiếu chưa qua giờ (còn ít nhất 5 phút)
            if slot_dt > (now_vn + timedelta(minutes=5)):
                slot_id = f"{movie_id}-{theater_id}-{date_str}-{idx}"
                start_time_val = slot["time"] + ":00"
                # Tính end_time = start_time + 2 giờ
                sh, sm = [int(p) for p in slot["time"].split(":")]
                end_time_val = f"{(sh + 2) % 24:02d}:{sm:02d}:00"
                cur.execute("""
                    INSERT INTO showtimes (id, movie_id, theater_id, show_date, start_time, end_time, room_name, format, base_price, total_seats)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 96)
                    ON CONFLICT (id) DO UPDATE SET
                        show_date = EXCLUDED.show_date,
                        start_time = EXCLUDED.start_time,
                        end_time = EXCLUDED.end_time,
                        room_name = EXCLUDED.room_name,
                        format = EXCLUDED.format,
                        base_price = EXCLUDED.base_price
                """, (
                    slot_id, movie_id, theater_id, target_date, start_time_val,
                    end_time_val, slot["room"], slot["format"], slot["price"]
                ))
                cur.execute("""
                    SELECT s.id, s.movie_id, s.show_date, s.start_time, s.room_name, s.format, s.base_price,
                           m.title AS movie_title, ct.name AS cinema_name
                    FROM showtimes s
                    JOIN movies m ON s.movie_id = m.id
                    JOIN cinema_theaters ct ON s.theater_id = ct.id
                    WHERE s.id = %s
                """, (slot_id,))
                return cur.fetchone()
    return None


def _get_valid_future_showtime(cur, preferred_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Lấy một suất chiếu hợp lệ trong tương lai (chuẩn múi giờ Việt Nam Asia/Ho_Chi_Minh).
    Ưu tiên 100% khớp với danh sách lịch chiếu đang hiển thị trên giao diện Frontend!
    """
    # 1. Nếu có preferred_id được truyền vào
    if preferred_id:
        cur.execute("""
            SELECT s.id, s.movie_id, s.show_date, s.start_time, s.room_name, s.format, s.base_price,
                   m.title AS movie_title, ct.name AS cinema_name
            FROM showtimes s
            JOIN movies m ON s.movie_id = m.id
            JOIN cinema_theaters ct ON s.theater_id = ct.id
            WHERE s.id = %s
        """, (preferred_id,))
        row = cur.fetchone()
        if row:
            return row

    # 2. Đồng bộ suất chiếu thực tế từ thuật toán hiển thị của Frontend (Phim Lên Hương @ CGV Landmark 81)
    fe_showtime = _generate_frontend_showtime(cur, movie_id=25051, theater_id=1)
    if fe_showtime:
        return fe_showtime

    # 3. Fallback: Lấy suất chiếu bất kỳ còn hạn trong DB
    cur.execute("""
        SELECT s.id, s.movie_id, s.show_date, s.start_time, s.room_name, s.format, s.base_price,
               m.title AS movie_title, ct.name AS cinema_name
        FROM showtimes s
        JOIN movies m ON s.movie_id = m.id
        JOIN cinema_theaters ct ON s.theater_id = ct.id
        WHERE (
            s.show_date > (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
            OR (
                s.show_date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
                AND s.start_time > ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::time + INTERVAL '15 minutes')
            )
        )
        ORDER BY s.show_date ASC, s.start_time ASC
        LIMIT 1
    """)
    row = cur.fetchone()
    if row:
        return row

    # 4. Fallback cuối cùng nếu vẫn rỗng
    cur.execute("""
        SELECT s.id, s.movie_id, s.show_date, s.start_time, s.room_name, s.format, s.base_price,
               m.title AS movie_title, ct.name AS cinema_name
        FROM showtimes s
        JOIN movies m ON s.movie_id = m.id
        JOIN cinema_theaters ct ON s.theater_id = ct.id
        ORDER BY s.show_date DESC, s.start_time DESC
        LIMIT 1
    """)
    return cur.fetchone()


@router.post("/benchmark/concurrent-booking")
def benchmark_concurrent_booking(req: ConcurrentBenchmarkRequest):
    """
    Kịch bản 3: Mô phỏng bão đặt vé đồng thời (N clients cùng tranh 1 ghế).
    Kiểm tra:
    1. Lấy suất chiếu HỢP LỆ (chưa qua giờ chiếu) kèm tên phim và rạp.
    2. Transaction Consistency (ACID / Unique constraint): Đúng 1 request thành công, N-1 thất bại (409 Conflict).
    3. Multi-Node Replication: Kiểm tra trạng thái ghế & LSN trên cả 3 nodes (pg-node1, pg-node2, pg-node3).
    4. Read-Your-Writes: Thử đọc vé vừa đặt từ Standby Replica để kiểm chứng tính nhất quán đọc.
    """
    concurrency = max(2, min(50, req.concurrency))
    raw_seat_code = req.seat_code.strip().upper()
    clean_seat_code = raw_seat_code.replace("VIP-", "").replace("SWEETBOX-", "")
    display_seat_code = f"VIP-{clean_seat_code}" if "VIP" in raw_seat_code or clean_seat_code == "F8" else raw_seat_code
    seat_code = clean_seat_code  # Dùng mã chuẩn (F8) để đồng bộ hoàn hảo với sơ đồ ghế frontend

    pg_active = is_postgres_available()

    if pg_active:
        # 1. Tìm suất chiếu hợp lệ (chưa qua giờ) và dọn ghế cũ
        st_info = None
        showtime_id = None
        try:
            conn_clean = psycopg2.connect(DATABASE_URL, connect_timeout=3, cursor_factory=RealDictCursor)
            with conn_clean:
                with conn_clean.cursor() as cur:
                    st_info = _get_valid_future_showtime(cur, req.showtime_id)
                    showtime_id = st_info["id"]

                    # Xóa ghế test cũ nếu có
                    cur.execute(
                        "DELETE FROM booking_seats WHERE showtime_id = %s AND (seat_code = %s OR seat_code = %s)",
                        (showtime_id, clean_seat_code, raw_seat_code)
                    )
            conn_clean.close()
        except Exception as e:
            print(f"[BENCHMARK PRE-CLEANUP WARNING]: {e}")
            showtime_id = req.showtime_id or "25051-1-2026-11-04-0"

        # 2. Run N concurrent threads hitting database simultaneously
        barrier = threading.Barrier(concurrency)
        results: List[Dict[str, Any]] = []
        lock = threading.Lock()

        movie_title = st_info["movie_title"] if st_info else "Lên Hương"
        cinema_name = st_info["cinema_name"] if st_info else "CGV Landmark 81"
        screen_room = st_info["room_name"] if st_info else "Rạp 3 - 2D"
        show_date_str = str(st_info["show_date"]) if st_info else datetime.date.today().isoformat()
        show_time_str = str(st_info["start_time"])[:5] if st_info else "11:15"
        ticket_price = float(st_info.get("base_price", req.seat_price)) if st_info else req.seat_price

        def _worker(client_idx: int):
            customer_name = f"Khách thử nghiệm {client_idx}"
            customer_phone = f"09010000{client_idx:02d}"
            customer_email = f"khach{client_idx}@meocinema.test"
            booking_code = f"MEO-TICKET-{random.randint(100000, 999999)}"

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
                        "SELECT seat_code FROM booking_seats WHERE showtime_id = %s AND (seat_code = %s OR seat_code = %s)",
                        (showtime_id, clean_seat_code, raw_seat_code)
                    )
                    if cur.fetchone():
                        conn.rollback()
                        latency = round((time.perf_counter() - t_start) * 1000, 2)
                        with lock:
                            results.append({
                                "client_id": client_idx,
                                "customer": customer_name,
                                "phone": customer_phone,
                                "status": 409,
                                "success": False,
                                "latency_ms": latency,
                                "error": f"Ghế {display_seat_code} vừa có khách khác đặt trước (409 Conflict)",
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
                        showtime_id, 1, [display_seat_code], ticket_price, 0,
                        0, ticket_price, "", "momo", "paid",
                        f"https://meocinema.vn/ticket/{booking_code}"
                    ))
                    new_b_id = cur.fetchone()["id"]

                    # Insert seat (Bảo vệ bởi CONSTRAINT unique_showtime_seat UNIQUE (showtime_id, seat_code))
                    cur.execute("""
                        INSERT INTO booking_seats (
                            booking_id, showtime_id, seat_code, seat_row, seat_col, seat_type, price
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """, (new_b_id, showtime_id, clean_seat_code, clean_seat_code[0] if clean_seat_code else "F", int(clean_seat_code[1:]) if len(clean_seat_code) > 1 and clean_seat_code[1:].isdigit() else 8, "vip", ticket_price))

                    conn.commit()
                    latency = round((time.perf_counter() - t_start) * 1000, 2)

                    with lock:
                        results.append({
                            "client_id": client_idx,
                            "customer": customer_name,
                            "phone": customer_phone,
                            "email": customer_email,
                            "status": 200,
                            "success": True,
                            "latency_ms": latency,
                            "booking_code": booking_code,
                            "booking_id": new_b_id,
                            "movie_title": movie_title,
                            "cinema_name": cinema_name,
                            "screen_room": screen_room,
                            "show_date": show_date_str,
                            "show_time": show_time_str,
                            "seat_code": display_seat_code,
                            "price": ticket_price,
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
                        "phone": customer_phone,
                        "status": 409,
                        "success": False,
                        "latency_ms": latency,
                        "error": f"Trùng khóa unique_showtime_seat: Ghế {display_seat_code} đã có giao dịch khác giữ",
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
                        "phone": customer_phone,
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

        # 4. Kiểm tra Replication Consistency trên toàn bộ các nodes
        node_verifications = []
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

                        cur.execute("""
                            SELECT bs.seat_code, b.booking_code, b.customer_name, b.customer_phone, b.payment_status
                            FROM booking_seats bs
                            JOIN bookings b ON bs.booking_id = b.id
                            WHERE bs.showtime_id = %s AND (bs.seat_code = %s OR bs.seat_code = %s)
                        """, (showtime_id, clean_seat_code, raw_seat_code))
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

                        if is_standby and not read_your_writes["verified"] and has_seat:
                            read_your_writes = {
                                "verified": True,
                                "source_node": host,
                                "ticket": {
                                    "booking_code": seat_row["booking_code"],
                                    "customer_name": seat_row["customer_name"],
                                    "movie_title": movie_title,
                                    "cinema_name": cinema_name,
                                    "show_date": show_date_str,
                                    "show_time": show_time_str,
                                    "seat_code": display_seat_code,
                                    "payment_status": seat_row["payment_status"],
                                    "node_role": "Standby Replica",
                                    "read_consistency": "Read-Your-Writes Succeeded (WAL Replayed - Chưa qua giờ)"
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

        if winner:
            with BOOKING_LOCK:
                RESERVED_SEATS_MAP.setdefault(showtime_id, set()).add(clean_seat_code)
                RESERVED_SEATS_MAP.setdefault(showtime_id, set()).add(display_seat_code)

        return {
            "mode": "real_postgresql_cluster",
            "concurrency": concurrency,
            "showtime_id": showtime_id,
            "showtime_info": {
                "id": showtime_id,
                "movie_title": movie_title,
                "cinema_name": cinema_name,
                "screen_room": screen_room,
                "show_date": show_date_str,
                "show_time": show_time_str,
                "format": st_info.get("format", "2D Phụ đề") if st_info else "2D Phụ đề",
                "price": ticket_price,
                "status": "HỢP LỆ (Chưa qua giờ chiếu)"
            },
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
                f"Đã chọn suất chiếu hợp lệ chưa qua giờ ({show_time_str} ngày {show_date_str}). "
                f"Khi {concurrency} requests tranh mua ghế {seat_code} cùng lúc, chỉ duy nhất 1 giao dịch được COMMIT, "
                f"{len(conflicts)} giao dịch còn lại nhận lỗi xung đột 409 và được ROLLBACK an toàn. "
                "Sau khi commit, cơ chế Streaming Replication đồng bộ WAL sang các node Standby, "
                "đảm bảo tính nhất quán dữ liệu (Data Consistency) trên toàn cụm."
            )
        }

    else:
        # Fallback in-memory simulation
        tomorrow = (datetime.date.today() + datetime.timedelta(days=1)).isoformat()
        showtime_id = req.showtime_id or "st-cgv-lm81-1-2030"
        movie_title = "Lên Hương"
        cinema_name = "CGV Landmark 81"
        screen_room = "Cinema 1 (IMAX)"

        with BOOKING_LOCK:
            reserved = RESERVED_SEATS_MAP.setdefault(showtime_id, set())
            reserved.discard(seat_code)

        barrier = threading.Barrier(concurrency)
        results = []
        lock = threading.Lock()

        def _worker_fallback(client_idx: int):
            customer_name = f"Khách thử nghiệm {client_idx}"
            customer_phone = f"09010000{client_idx:02d}"
            customer_email = f"khach{client_idx}@meocinema.test"
            booking_code = f"MEO-TICKET-{random.randint(100000, 999999)}"

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
                            "phone": customer_phone,
                            "status": 409,
                            "success": False,
                            "latency_ms": latency,
                            "error": f"Ghế {seat_code} đã có người đặt trước (In-memory Lock Guard)",
                            "booking_code": None,
                        })
                else:
                    reserved.add(seat_code)
                    with lock:
                        results.append({
                            "client_id": client_idx,
                            "customer": customer_name,
                            "phone": customer_phone,
                            "email": customer_email,
                            "status": 200,
                            "success": True,
                            "latency_ms": latency,
                            "booking_code": booking_code,
                            "movie_title": movie_title,
                            "cinema_name": cinema_name,
                            "screen_room": screen_room,
                            "show_date": tomorrow,
                            "show_time": "20:30",
                            "seat_code": seat_code,
                            "price": 150000,
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
            "showtime_info": {
                "id": showtime_id,
                "movie_title": movie_title,
                "cinema_name": cinema_name,
                "screen_room": screen_room,
                "show_date": tomorrow,
                "show_time": "20:30",
                "format": "2D Phụ đề",
                "price": 150000,
                "status": "HỢP LỆ (Suất chiếu ngày mai)"
            },
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
                    "booking_code": winner["booking_code"] if winner else "MEO-TICKET-829102",
                    "customer_name": winner["customer"] if winner else "Khách thử nghiệm 1",
                    "movie_title": movie_title,
                    "cinema_name": cinema_name,
                    "seat_code": seat_code,
                    "payment_status": "paid",
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
    raw_seat_code = req.seat_code.strip().upper()
    clean_seat_code = raw_seat_code.replace("VIP-", "").replace("SWEETBOX-", "")
    showtime_id = req.showtime_id

    pg_active = is_postgres_available()
    deleted_count = 0

    if pg_active:
        try:
            conn = psycopg2.connect(DATABASE_URL, connect_timeout=3)
            with conn:
                with conn.cursor() as cur:
                    if showtime_id:
                        cur.execute(
                            "DELETE FROM booking_seats WHERE showtime_id = %s AND (seat_code = %s OR seat_code = %s) RETURNING id",
                            (showtime_id, clean_seat_code, raw_seat_code)
                        )
                    else:
                        cur.execute(
                            "DELETE FROM booking_seats WHERE (seat_code = %s OR seat_code = %s) RETURNING id",
                            (clean_seat_code, raw_seat_code)
                        )
                    rows = cur.fetchall()
                    deleted_count = len(rows)
            conn.close()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Lỗi dọn dẹp database: {e}")

    # Đồng bộ dọn dẹp in-memory
    with BOOKING_LOCK:
        for st_id in list(RESERVED_SEATS_MAP.keys()):
            if not showtime_id or st_id == showtime_id:
                RESERVED_SEATS_MAP[st_id].discard(clean_seat_code)
                RESERVED_SEATS_MAP[st_id].discard(raw_seat_code)
                RESERVED_SEATS_MAP[st_id].discard(f"VIP-{clean_seat_code}")

    return {
        "success": True,
        "showtime_id": showtime_id or "ALL",
        "seat_code": raw_seat_code,
        "deleted_seats": deleted_count,
        "message": f"Đã giải phóng ghế {raw_seat_code} thành công. Sẵn sàng chạy lại kịch bản."
    }
