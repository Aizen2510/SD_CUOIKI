from fastapi import APIRouter, Query, Body, HTTPException
from typing import Optional, Dict, Any
from app.distributed.primary_replica import primary_replica_mgr
from app.distributed.quorum import quorum_mgr
from app.distributed.concurrency import concurrency_tester

router = APIRouter(prefix="/api/distributed", tags=["Distributed Systems Demo (Chapter 7)"])

# =============================================================================
# KỊCH BẢN 1: PRIMARY - REPLICA & READ-YOUR-WRITES CONSISTENCY (Mục 7.5.1 & 7.3.3)
# =============================================================================

@router.get("/primary-replica/status", summary="Lấy trạng thái cụm Primary - Replica & LSN")
def get_primary_replica_status():
    return primary_replica_mgr.get_cluster_status()

@router.post("/primary-replica/set-lag", summary="Thiết lập độ trễ nhân bản (Replication Lag)")
def set_replication_lag(lag_seconds: float = Body(..., embed=True, ge=0.0, le=30.0)):
    return primary_replica_mgr.set_lag(lag_seconds)

@router.post("/primary-replica/book", summary="Kịch bản 1: Đặt vé ghi vào Primary (Primary-Based Remote-Write)")
def book_ticket(payload: Dict[str, Any] = Body(...)):
    client_id = payload.get("client_id", "client_alice")
    return primary_replica_mgr.book_ticket_primary(client_id, payload)

@router.get("/primary-replica/read", summary="Kịch bản 1: Đọc vé (So sánh Stale Read vs Read-Your-Writes)")
def read_ticket(
    booking_id: str = Query(..., description="Mã vé cần tra cứu (ví dụ MEO-123456)"),
    client_id: str = Query(..., description="ID của Client gửi truy vấn đọc"),
    enable_read_your_writes: bool = Query(True, description="Bật/Tắt cơ chế Client-Centric Read-Your-Writes")
):
    return primary_replica_mgr.read_ticket(
        client_id=client_id,
        booking_id=booking_id,
        enable_read_your_writes=enable_read_your_writes
    )

@router.post("/primary-replica/reset", summary="Đặt lại trạng thái cụm Primary - Replica")
def reset_primary_replica():
    return primary_replica_mgr.reset_state()


# =============================================================================
# KỊCH BẢN 2: REPLICATED-WRITE PROTOCOLS: QUORUM CONSENSUS (Mục 7.5.2)
# =============================================================================

@router.get("/quorum/status", summary="Lấy trạng thái cụm Quorum (N=3, W=2, R=2)")
def get_quorum_status():
    return quorum_mgr.get_status()

@router.post("/quorum/toggle-node", summary="Bật/Tắt một Node trong cụm Quorum (Giả lập Node Crash/Partition)")
def toggle_quorum_node(node_id: str = Body(..., embed=True)):
    return quorum_mgr.toggle_node(node_id)

@router.post("/quorum/write", summary="Kịch bản 2: Ghi dữ liệu theo Quorum Consensus (W >= 2)")
def quorum_write(payload: Dict[str, Any] = Body(...)):
    key = payload.get("key", "showtime_101_available_seats")
    value = payload.get("value", 115)
    result = quorum_mgr.quorum_write(key, value)
    return result

@router.get("/quorum/read", summary="Kịch bản 2: Đọc dữ liệu theo Quorum Consensus (R >= 2)")
def quorum_read(key: str = Query("showtime_101_available_seats", description="Key dữ liệu")):
    result = quorum_mgr.quorum_read(key)
    return result

@router.post("/quorum/reset", summary="Đặt lại cụm Quorum")
def reset_quorum():
    return quorum_mgr.reset()


# =============================================================================
# KỊCH BẢN 3: CONCURRENT RACE CONDITION & LINEARIZABILITY (Mục 7.2.1)
# =============================================================================

@router.post("/concurrency/test-race-condition", summary="Kịch bản 3: Bắn đồng thời 50 requests đặt cùng ghế F8")
def test_race_condition(
    seat_code: str = Body("VIP-F8", embed=True),
    num_requests: int = Body(50, embed=True, ge=2, le=200)
):
    return concurrency_tester.test_concurrent_booking(seat_code=seat_code, num_requests=num_requests)
