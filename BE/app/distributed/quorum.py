import time
import threading
from typing import Dict, Any, List, Optional

class QuorumManager:
    """
    Kịch bản 2: Replicated-Write Protocols - Quorum-Based Consensus (Tanenbaum Mục 7.5.2).
    Quy tắc Gifford Quorum:
      W + R > N (2 + 2 = 4 > 3)
      W > N / 2 (2 > 1.5)
    """

    def __init__(self):
        self.lock = threading.Lock()
        self.N = 3  # Tổng số node bản sao
        self.W = 2  # Write Quorum
        self.R = 2  # Read Quorum

        # Cụm 3 Node độc lập
        self.nodes = {
            "node_a": {
                "id": "node_a",
                "name": "Node A (Storage Region North)",
                "status": "online",  # online | crashed
                "data": {
                    "showtime_101_available_seats": {
                        "value": 120,
                        "version": 1,
                        "updated_at": time.time()
                    }
                },
                "total_writes": 0,
                "total_reads": 0
            },
            "node_b": {
                "id": "node_b",
                "name": "Node B (Storage Region Central)",
                "status": "online",
                "data": {
                    "showtime_101_available_seats": {
                        "value": 120,
                        "version": 1,
                        "updated_at": time.time()
                    }
                },
                "total_writes": 0,
                "total_reads": 0
            },
            "node_c": {
                "id": "node_c",
                "name": "Node C (Storage Region South)",
                "status": "online",
                "data": {
                    "showtime_101_available_seats": {
                        "value": 120,
                        "version": 1,
                        "updated_at": time.time()
                    }
                },
                "total_writes": 0,
                "total_reads": 0
            }
        }

        self.quorum_logs: List[Dict[str, Any]] = []
        self._add_log("INIT", "Khởi tạo cụm Quorum 3 nodes: N=3, W=2, R=2 (W + R = 4 > 3)")

    def _add_log(self, event_type: str, message: str, details: Optional[Dict[str, Any]] = None):
        log_entry = {
            "time": time.strftime("%H:%M:%S"),
            "timestamp": time.time(),
            "type": event_type,
            "message": message,
            "details": details or {}
        }
        self.quorum_logs.insert(0, log_entry)
        if len(self.quorum_logs) > 50:
            self.quorum_logs.pop()

    def get_status(self) -> Dict[str, Any]:
        """Lấy trạng thái cụm Quorum và các nodes"""
        with self.lock:
            online_count = sum(1 for n in self.nodes.values() if n["status"] == "online")
            return {
                "N": self.N,
                "W": self.W,
                "R": self.R,
                "is_strong_consistent": (self.W + self.R > self.N) and (self.W > self.N / 2),
                "online_nodes_count": online_count,
                "can_write": online_count >= self.W,
                "can_read": online_count >= self.R,
                "nodes": list(self.nodes.values()),
                "logs": self.quorum_logs[:15]
            }

    def toggle_node(self, node_id: str, set_status: Optional[str] = None) -> Dict[str, Any]:
        """Bật/tắt node giả lập Network Partition hoặc Node Crash"""
        with self.lock:
            if node_id not in self.nodes:
                return {"error": f"Node {node_id} không tồn tại"}
            node = self.nodes[node_id]
            if set_status:
                node["status"] = set_status
            else:
                node["status"] = "crashed" if node["status"] == "online" else "online"

            action = "BẬT (Recover)" if node["status"] == "online" else "TẮT (Crash/Partition)"
            self._add_log("NODE_STATUS", f"{action} {node['name']} -> Trạng thái: {node['status'].upper()}")
            return {
                "node_id": node_id,
                "status": node["status"],
                "message": f"{node['name']} hiện đang {node['status'].upper()}"
            }

    def quorum_write(self, key: str, new_value: Any) -> Dict[str, Any]:
        """
        GHI THEO QUORUM CONSENSUS (Mục 7.5.2):
        Cần ít nhất W = 2 nodes online xác nhận.
        """
        with self.lock:
            online_nodes = [n for n in self.nodes.values() if n["status"] == "online"]
            online_count = len(online_nodes)

            # Kiểm tra Quorum W
            if online_count < self.W:
                error_msg = (
                    f"❌ TỪ CHỐI GHI (Write Rejected): Chỉ có {online_count}/{self.N} node online. "
                    f"Không đủ túc số ghi W={self.W}. Hệ thống bảo vệ tính nhất quán (CP), "
                    f"ngăn chặn hiện tượng Split-Brain hoặc mất dữ liệu."
                )
                self._add_log("WRITE_FAILED", error_msg, {"online_count": online_count, "W": self.W})
                return {
                    "success": False,
                    "quorum_achieved": False,
                    "error": error_msg,
                    "online_nodes": [n["id"] for n in online_nodes],
                    "required_w": self.W
                }

            # 1. Tìm phiên bản (version) cao nhất hiện tại trong số các node online
            current_max_version = 0
            for node in online_nodes:
                item = node["data"].get(key)
                if item and item.get("version", 0) > current_max_version:
                    current_max_version = item["version"]

            new_version = current_max_version + 1
            now = time.time()
            data_payload = {
                "value": new_value,
                "version": new_version,
                "updated_at": now
            }

            # 2. Ghi vào tất cả các node đang online
            acked_nodes = []
            for node in online_nodes:
                node["data"][key] = data_payload
                node["total_writes"] += 1
                acked_nodes.append(node["id"])

            msg = (
                f" GHI QUORUM THÀNH CÔNG (W={self.W}/{self.N}): Đã ghi '{key}' = {new_value} "
                f"(Phiên bản Version {new_version}) lên {len(acked_nodes)} node: {', '.join(acked_nodes)}."
            )
            self._add_log("WRITE_SUCCESS", msg, {"version": new_version, "nodes": acked_nodes})

            return {
                "success": True,
                "quorum_achieved": True,
                "message": msg,
                "key": key,
                "value": new_value,
                "version": new_version,
                "acked_nodes": acked_nodes,
                "total_acks": len(acked_nodes),
                "required_w": self.W
            }

    def quorum_read(self, key: str) -> Dict[str, Any]:
        """
        ĐỌC THEO QUORUM CONSENSUS (Mục 7.5.2):
        Thu thập từ ít nhất R = 2 nodes online và chọn giá trị có version cao nhất.
        """
        with self.lock:
            online_nodes = [n for n in self.nodes.values() if n["status"] == "online"]
            online_count = len(online_nodes)

            # Kiểm tra Quorum R
            if online_count < self.R:
                error_msg = (
                    f"❌ TỪ CHỐI ĐỌC (Read Rejected): Chỉ có {online_count}/{self.N} node online. "
                    f"Không đủ túc số đọc R={self.R}. Không thể đảm bảo đọc được dữ liệu mới nhất."
                )
                self._add_log("READ_FAILED", error_msg, {"online_count": online_count, "R": self.R})
                return {
                    "success": False,
                    "quorum_achieved": False,
                    "error": error_msg,
                    "online_nodes": [n["id"] for n in online_nodes],
                    "required_r": self.R
                }

            # Lấy R nodes đầu tiên đang online để đọc
            polled_nodes = online_nodes[:self.R]
            collected_versions = []
            highest_item = None
            highest_version = -1

            for node in polled_nodes:
                node["total_reads"] += 1
                item = node["data"].get(key)
                if item:
                    collected_versions.append({
                        "node_id": node["id"],
                        "node_name": node["name"],
                        "version": item.get("version", 0),
                        "value": item.get("value")
                    })
                    if item.get("version", 0) > highest_version:
                        highest_version = item.get("version", 0)
                        highest_item = item

            # Read repair (tùy chọn trong Quorum): cập nhật cho các node có version cũ hơn
            repaired_nodes = []
            if highest_item:
                for node in online_nodes:
                    cur = node["data"].get(key)
                    if cur and cur.get("version", 0) < highest_version:
                        node["data"][key] = highest_item.copy()
                        repaired_nodes.append(node["id"])

            msg = (
                f" ĐỌC QUORUM THÀNH CÔNG (R={self.R}/{self.N}): Đã thu thập từ {len(polled_nodes)} node. "
                f"Phiên bản mới nhất là Version {highest_version} (Giá trị: {highest_item.get('value') if highest_item else 'None'})."
            )
            if repaired_nodes:
                msg += f" [Read-Repair đã đồng bộ cho {', '.join(repaired_nodes)}]"

            self._add_log("READ_SUCCESS", msg, {"version": highest_version, "nodes": [p["id"] for p in polled_nodes]})

            return {
                "success": True,
                "quorum_achieved": True,
                "message": msg,
                "key": key,
                "value": highest_item.get("value") if highest_item else None,
                "version": highest_version,
                "polled_nodes": collected_versions,
                "repaired_nodes": repaired_nodes,
                "required_r": self.R
            }

    def reset(self):
        """Đặt lại cụm Quorum"""
        with self.lock:
            for node in self.nodes.values():
                node["status"] = "online"
                node["total_writes"] = 0
                node["total_reads"] = 0
                node["data"] = {
                    "showtime_101_available_seats": {
                        "value": 120,
                        "version": 1,
                        "updated_at": time.time()
                    }
                }
            self.quorum_logs.clear()
            self._add_log("RESET", "Cụm Quorum đã được thiết lập lại: Cả 3 nodes Online, Version=1.")
        return {"status": "reset_complete"}


quorum_mgr = QuorumManager()
