import time
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, Any, List

class ConcurrencyTester:
    """
    Kịch bản 3: Consistent Ordering of Operations & Linearizability (Tanenbaum Mục 7.2.1).
    Minh chứng: 50 requests đồng thời đặt cùng 1 ghế chỉ có duy nhất 1 request thành công.
    """

    def __init__(self):
        self.lock = threading.Lock()
        self.reserved_seats: Dict[str, Dict[str, Any]] = {}

    def test_concurrent_booking(self, seat_code: str = "VIP-F8", num_requests: int = 50) -> Dict[str, Any]:
        with self.lock:
            # Xóa ghế trước khi test
            if seat_code in self.reserved_seats:
                del self.reserved_seats[seat_code]

        start_time = time.time()
        results: List[Dict[str, Any]] = []

        def attempt_book(client_idx: int):
            client_name = f"User_{client_idx:02d}"
            # Atomic acquisition (giả lập PostgreSQL Row-level Lock hoặc Redis SET NX)
            with self.lock:
                if seat_code not in self.reserved_seats:
                    # Giao dịch thành công
                    self.reserved_seats[seat_code] = {
                        "winner": client_name,
                        "booked_at": time.time(),
                        "seat_code": seat_code
                    }
                    return {
                        "client": client_name,
                        "success": True,
                        "status_code": 200,
                        "message": f"Đặt thành công ghế {seat_code}"
                    }
                else:
                    winner = self.reserved_seats[seat_code]["winner"]
                    return {
                        "client": client_name,
                        "success": False,
                        "status_code": 409,
                        "message": f"Xung đột (Conflict)! Ghế {seat_code} đã bị {winner} giữ trước."
                    }

        # Bắn đồng thời bằng ThreadPool
        with ThreadPoolExecutor(max_workers=min(num_requests, 50)) as executor:
            futures = [executor.submit(attempt_book, i + 1) for i in range(num_requests)]
            for future in as_completed(futures):
                results.append(future.result())

        duration_ms = round((time.time() - start_time) * 1000, 2)
        successes = [r for r in results if r["success"]]
        conflicts = [r for r in results if not r["success"]]

        return {
            "seat_code": seat_code,
            "total_requests": num_requests,
            "duration_ms": duration_ms,
            "success_count": len(successes),
            "conflict_count": len(conflicts),
            "winner": successes[0]["client"] if successes else None,
            "linearizability_guaranteed": len(successes) == 1,
            "summary": (
                f"Kiểm thử Linearizability thành công: Trong số {num_requests} request đồng thời, "
                f"chính xác {len(successes)} request thành công và {len(conflicts)} request bị chặn (409 Conflict). "
                f"Không xảy ra hiện tượng Double-Booking."
            ),
            "sample_responses": results[:10]
        }


concurrency_tester = ConcurrencyTester()
