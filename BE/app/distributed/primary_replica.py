import time
import threading
from typing import Dict, Any, List, Optional

class PrimaryReplicaManager:
    """
    Kịch bản 1: Primary-Based Protocols (Tanenbaum Mục 7.5.1)
    kết hợp Client-Centric Read-Your-Writes Consistency (Mục 7.3.3)
    và Eventual Consistency (Mục 7.2.2).
    """

    def __init__(self):
        self.lock = threading.Lock()
        self.current_lsn = 1000  # Log Sequence Number (WAL)
        self.replication_lag_seconds = 3.0  # Giả lập trễ nhân bản (mặc định 3s để mắt thường nhìn thấy)
        
        # Node states
        self.nodes = {
            "primary": {
                "id": "primary",
                "name": "PostgreSQL Primary (Master)",
                "role": "PRIMARY",
                "port": 5432,
                "status": "online",
                "current_lsn": 1000,
                "total_writes": 0,
                "total_reads": 0
            },
            "replica_1": {
                "id": "replica_1",
                "name": "PostgreSQL Replica 1 (Standby)",
                "role": "REPLICA",
                "port": 5433,
                "status": "online",
                "current_lsn": 1000,
                "total_writes": 0,
                "total_reads": 0
            },
            "replica_2": {
                "id": "replica_2",
                "name": "PostgreSQL Replica 2 (Standby)",
                "role": "REPLICA",
                "port": 5434,
                "status": "online",
                "current_lsn": 1000,
                "total_writes": 0,
                "total_reads": 0
            }
        }
        
        # Data stores mô phỏng dữ liệu trên từng node
        self.storage: Dict[str, Dict[str, Any]] = {
            "primary": {},
            "replica_1": {},
            "replica_2": {}
        }
        
        # Theo dõi lần ghi gần nhất của Client: client_id -> {"timestamp": float, "lsn": int, "ticket_id": str}
        self.client_writes: Dict[str, Dict[str, Any]] = {}
        
        # Lịch sử sự kiện nhân bản để hiển thị trên Dashboard
        self.replication_logs: List[Dict[str, Any]] = []
        
        # Round-robin counter cho việc đọc
        self._rr_counter = 0

    def set_lag(self, lag_seconds: float):
        """Thay đổi độ trễ nhân bản giả lập"""
        with self.lock:
            self.replication_lag_seconds = max(0.0, lag_seconds)
            self._add_log("CONFIG", f"Cập nhật Replication Lag thành {self.replication_lag_seconds:.1f}s")
        return {"replication_lag_seconds": self.replication_lag_seconds}

    def _add_log(self, event_type: str, message: str, details: Optional[Dict[str, Any]] = None):
        log_entry = {
            "time": time.strftime("%H:%M:%S"),
            "timestamp": time.time(),
            "type": event_type,
            "message": message,
            "details": details or {}
        }
        self.replication_logs.insert(0, log_entry)
        if len(self.replication_logs) > 50:
            self.replication_logs.pop()

    def get_cluster_status(self) -> Dict[str, Any]:
        """Lấy trạng thái toàn bộ cụm Primary - Replica"""
        with self.lock:
            return {
                "replication_lag_seconds": self.replication_lag_seconds,
                "current_primary_lsn": self.current_lsn,
                "nodes": list(self.nodes.values()),
                "total_records_primary": len(self.storage["primary"]),
                "total_records_replica_1": len(self.storage["replica_1"]),
                "total_records_replica_2": len(self.storage["replica_2"]),
                "logs": self.replication_logs[:15]
            }

    def book_ticket_primary(self, client_id: str, booking_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        GHI VÀO PRIMARY (Mục 7.5.1: Primary-based Remote-Write Protocol).
        Toàn bộ thao tác ghi bắt buộc gửi tới Primary Node.
        """
        with self.lock:
            self.current_lsn += 1
            lsn = self.current_lsn
            booking_id = booking_data.get("booking_id", f"MEO-{int(time.time()*1000)%1000000:06d}")
            now = time.time()

            record = {
                "booking_id": booking_id,
                "client_id": client_id,
                "customer_name": booking_data.get("customer_name", "Khách hàng"),
                "movie_title": booking_data.get("movie_title", "Dune: Phần Hai"),
                "seats": booking_data.get("seats", ["VIP-F8"]),
                "total_price": booking_data.get("total_price", 110000),
                "created_at": now,
                "created_at_str": time.strftime("%H:%M:%S", time.localtime(now)),
                "lsn": lsn
            }

            # 1. Ghi lập tức vào Primary
            self.storage["primary"][booking_id] = record
            self.nodes["primary"]["current_lsn"] = lsn
            self.nodes["primary"]["total_writes"] += 1

            # 2. Ghi nhận Client-Centric Write Context (Mục 7.3.3)
            self.client_writes[client_id] = {
                "timestamp": now,
                "lsn": lsn,
                "booking_id": booking_id
            }

            self._add_log(
                "WRITE_PRIMARY",
                f"[Ghi Primary LSN={lsn}] Đặt vé {booking_id} thành công cho {client_id}. Bắt đầu lan truyền WAL sang Replicas (Lag={self.replication_lag_seconds}s).",
                {"booking_id": booking_id, "lsn": lsn, "client_id": client_id}
            )

        # 3. Kích hoạt quá trình nhân bản bất đồng bộ sang Replicas (Asynchronous Replication)
        threading.Thread(
            target=self._async_replicate_to_standbys,
            args=(booking_id, record, lsn, self.replication_lag_seconds),
            daemon=True
        ).start()

        return {
            "success": True,
            "booking_id": booking_id,
            "lsn": lsn,
            "served_by": self.nodes["primary"]["name"],
            "node_role": "PRIMARY",
            "replication_lag_seconds": self.replication_lag_seconds,
            "message": f"Vé {booking_id} đã ghi thành công vào Primary (Port 5432). Đang đồng bộ tới Replicas...",
            "ticket": record
        }

    def _async_replicate_to_standbys(self, booking_id: str, record: Dict[str, Any], lsn: int, lag: float):
        """Mô phỏng trễ mạng và độ trễ WAL Streaming Replication"""
        time.sleep(lag)
        with self.lock:
            # Đồng bộ sang Replica 1
            self.storage["replica_1"][booking_id] = record.copy()
            self.nodes["replica_1"]["current_lsn"] = lsn
            
            # Đồng bộ sang Replica 2
            self.storage["replica_2"][booking_id] = record.copy()
            self.nodes["replica_2"]["current_lsn"] = lsn

            self._add_log(
                "REPLICATION_SYNC",
                f"[Hoàn tất Đồng bộ WAL] Replica 1 & Replica 2 đã cập nhật LSN={lsn} cho vé {booking_id} sau {lag:.1f}s.",
                {"booking_id": booking_id, "lsn": lsn}
            )

    def read_ticket(self, client_id: str, booking_id: str, enable_read_your_writes: bool = True) -> Dict[str, Any]:
        """
        ĐỌC VÉ: So sánh giữa Stale Read (Eventual Consistency) và Read-Your-Writes Consistency.
        """
        with self.lock:
            client_ctx = self.client_writes.get(client_id)
            now = time.time()
            time_since_last_write = (now - client_ctx["timestamp"]) if client_ctx else 9999.0
            client_lsn = client_ctx["lsn"] if client_ctx else 0

            # Lựa chọn Node phục vụ truy vấn đọc
            target_node_id = None
            routing_reason = ""
            read_your_writes_triggered = False

            if enable_read_your_writes:
                # KIỂM TRA ĐIỀU KIỆN READ-YOUR-WRITES (Mục 7.3.3):
                # Nếu client vừa ghi vé này trong vòng (replication_lag + 2s) và các replica chưa đuổi kịp LSN của client:
                replica_max_lsn = max(self.nodes["replica_1"]["current_lsn"], self.nodes["replica_2"]["current_lsn"])
                
                if client_ctx and (time_since_last_write <= (self.replication_lag_seconds + 2.0)) and (replica_max_lsn < client_lsn):
                    # Kích hoạt Read-Your-Writes: Buộc route về Primary!
                    target_node_id = "primary"
                    read_your_writes_triggered = True
                    routing_reason = (
                        f"Kích hoạt Read-Your-Writes Consistency (Mục 7.3.3): Client vừa ghi lúc {time_since_last_write:.1f}s trước "
                        f"(LSN={client_lsn} > Replica LSN={replica_max_lsn}). Router tự động điều hướng đọc về Primary."
                    )
                else:
                    # Replica đã bắt kịp hoặc không có ghi mới -> Đọc từ Replica
                    self._rr_counter += 1
                    target_node_id = "replica_1" if (self._rr_counter % 2 == 1) else "replica_2"
                    routing_reason = f"Đọc cân bằng tải bình thường từ {self.nodes[target_node_id]['name']} (Replica đã đồng bộ LSN={replica_max_lsn})."
            else:
                # TẮT READ-YOUR-WRITES: Luôn đọc từ Replica theo mô hình Eventual Consistency thuần túy
                self._rr_counter += 1
                target_node_id = "replica_1" if (self._rr_counter % 2 == 1) else "replica_2"
                routing_reason = (
                    f"TẮT Read-Your-Writes: Truy vấn đọc được gửi ngẫu nhiên tới {self.nodes[target_node_id]['name']} "
                    f"bất chấp Replica có thể chưa nhận được WAL từ Primary."
                )

            # Thực hiện đọc từ target_node
            node_info = self.nodes[target_node_id]
            node_info["total_reads"] += 1
            node_storage = self.storage[target_node_id]
            ticket_found = node_storage.get(booking_id)

            is_stale = False
            status_summary = ""

            if ticket_found:
                status_summary = f" Tìm thấy vé trên {node_info['name']}."
            else:
                # Kiểm tra xem vé có trong Primary không
                if booking_id in self.storage["primary"]:
                    is_stale = True
                    status_summary = (
                        f"❌ KHÔNG TÌM THẤY VÉ TRÊN {node_info['name']}! (Hiện tượng Stale Read / Replication Lag: "
                        f"Vé đã có trên Primary nhưng chưa kịp sao chép đến {node_info['name']})."
                    )
                else:
                    status_summary = f"Vé {booking_id} không tồn tại trên hệ thống."

            self._add_log(
                "READ_QUERY",
                f"[Đọc từ {node_info['name']}] Vé {booking_id} -> {'Thành công' if ticket_found else 'Thất bại (Stale)'} (RYW={enable_read_your_writes})",
                {"node": target_node_id, "found": bool(ticket_found), "is_stale": is_stale}
            )

            return {
                "booking_id": booking_id,
                "found": bool(ticket_found),
                "is_stale": is_stale,
                "served_by": node_info["name"],
                "node_id": target_node_id,
                "node_role": node_info["role"],
                "node_lsn": node_info["current_lsn"],
                "primary_lsn": self.current_lsn,
                "enable_read_your_writes": enable_read_your_writes,
                "read_your_writes_triggered": read_your_writes_triggered,
                "time_since_client_write_seconds": round(time_since_last_write, 2) if client_ctx else None,
                "routing_reason": routing_reason,
                "status_summary": status_summary,
                "ticket": ticket_found
            }

    def reset_state(self):
        """Khôi phục trạng thái ban đầu"""
        with self.lock:
            self.current_lsn = 1000
            for node_id in self.nodes:
                self.nodes[node_id]["current_lsn"] = 1000
                self.nodes[node_id]["total_writes"] = 0
                self.nodes[node_id]["total_reads"] = 0
                self.storage[node_id].clear()
            self.client_writes.clear()
            self.replication_logs.clear()
            self._add_log("RESET", "Hệ thống cụm Primary-Replica đã được đặt lại trạng thái ban đầu.")
        return {"status": "reset_complete"}


primary_replica_mgr = PrimaryReplicaManager()
