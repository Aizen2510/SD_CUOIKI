#!/usr/bin/env python3
"""
=============================================================================
KỊCH BẢN THỰC NGHIỆM HỆ PHÂN TÁN (DISTRIBUTED SYSTEMS DEMO)
Chương 7: Consistency and Replication (Sách Tanenbaum & Van Steen)
Đồ án môn học: SD_CUOIKI - Nền tảng đặt vé xem phim MeoCinema
=============================================================================
"""

import sys
import os
import time

# Đảm bảo import được module từ BE
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'BE')))

from app.distributed.primary_replica import primary_replica_mgr
from app.distributed.quorum import quorum_mgr
from app.distributed.concurrency import concurrency_tester

# Màu sắc terminal
CYAN = "\033[96m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
RED = "\033[91m"
BOLD = "\033[1m"
RESET = "\033[0m"

def print_header(title: str):
    print("\n" + "=" * 78)
    print(f"{BOLD}{CYAN}{title.center(78)}{RESET}")
    print("=" * 78)

def print_step(step_num: int, title: str):
    print(f"\n{BOLD}{YELLOW}▶ BƯỚC {step_num}: {title}{RESET}")

def run_scenario_1():
    """
    KỊCH BẢN 1: PRIMARY-BASED PROTOCOLS (Mục 7.5.1) & READ-YOUR-WRITES CONSISTENCY (Mục 7.3.3)
    """
    print_header("KỊCH BẢN 1: PRIMARY - REPLICA & CLIENT-CENTRIC READ-YOUR-WRITES (Mục 7.5.1 & 7.3.3)")
    print(f"{BOLD}Nguyên lý lý thuyết:{RESET}")
    print("  - Mục 7.5.1: Mọi truy vấn ghi đều gửi đến Primary (PostgreSQL Master, Port 5432).")
    print("  - Mục 7.2.2: Replicas (Port 5433, 5434) đồng bộ bất đồng bộ qua WAL -> Tồn tại Replication Lag.")
    print("  - Mục 7.3.3: Client-Centric Read-Your-Writes đảm bảo Client đọc không bị lùi phiên bản.\n")

    primary_replica_mgr.reset_state()
    primary_replica_mgr.set_lag(2.5)  # 2.5s replication lag

    client_id = "user_nguyen_van_a"
    booking_id = "MEO-998877"

    # Bước 1: Ghi vé vào Primary
    print_step(1, f"Khách hàng '{client_id}' đặt vé '{booking_id}' (GHI VÀO PRIMARY)")
    res_book = primary_replica_mgr.book_ticket_primary(
        client_id=client_id,
        booking_data={
            "booking_id": booking_id,
            "customer_name": "Nguyễn Văn A",
            "movie_title": "Dune: Phần Hai",
            "seats": ["VIP-F8", "VIP-F9"],
            "total_price": 220000
        }
    )
    print(f"  {GREEN}✔ Đã ghi thành công vào:{RESET} {res_book['served_by']} (LSN = {res_book['lsn']})")
    print(f"  {YELLOW}⏳ Đang sao chép WAL sang Replica 1 & Replica 2 (Replication Lag = 2.5s)...{RESET}")

    # Bước 2: Đọc ngay lập tức khi TẮT Read-Your-Writes (Mô phỏng vi phạm)
    print_step(2, "Khách hàng tra cứu vé NGAY LẬP TỨC (0.2s sau ghi) với READ-YOUR-WRITES = OFF")
    time.sleep(0.2)
    res_read_stale = primary_replica_mgr.read_ticket(
        client_id=client_id,
        booking_id=booking_id,
        enable_read_your_writes=False
    )
    print(f"  Node phục vụ: {res_read_stale['served_by']}")
    print(f"  Kết quả tìm vé: {RED if not res_read_stale['found'] else GREEN}{res_read_stale['found']}{RESET}")
    print(f"  Trạng thái Stale: {RED}{res_read_stale['is_stale']}{RESET}")
    print(f"  Giải thích: {RED}{res_read_stale['status_summary']}{RESET}")
    print(f"  => {BOLD}{RED}HẬU QUẢ:{RESET} Khách hàng tưởng mất tiền, giao dịch lỗi vì Replica chưa kịp sync!")

    # Bước 3: Đọc ngay lập tức khi BẬT Read-Your-Writes (Mục 7.3.3)
    print_step(3, "Khách hàng tra cứu vé NGAY LẬP TỨC với READ-YOUR-WRITES = ON")
    res_read_consistent = primary_replica_mgr.read_ticket(
        client_id=client_id,
        booking_id=booking_id,
        enable_read_your_writes=True
    )
    print(f"  Node phục vụ: {GREEN}{res_read_consistent['served_by']}{RESET}")
    print(f"  Read-Your-Writes kích hoạt: {GREEN}{res_read_consistent['read_your_writes_triggered']}{RESET}")
    print(f"  Kết quả tìm vé: {GREEN}TÌM THẤY VÉ THÀNH CÔNG!{RESET}")
    print(f"  Lý do định tuyến: {CYAN}{res_read_consistent['routing_reason']}{RESET}")
    print(f"  => {BOLD}{GREEN}KẾT QUẢ:{RESET} Đảm bảo trải nghiệm nhất quán tuyệt đối cho khách hàng!")

    # Bước 4: Chờ sau khi Replication hoàn tất
    print_step(4, "Chờ 3.0s để WAL Replication hoàn tất trên toàn bộ Replicas...")
    time.sleep(2.8)
    res_read_after_sync = primary_replica_mgr.read_ticket(
        client_id=client_id,
        booking_id=booking_id,
        enable_read_your_writes=False  # Kể cả tắt RYW thì lúc này replica cũng đã có
    )
    print(f"  Node phục vụ: {res_read_after_sync['served_by']} (LSN = {res_read_after_sync['node_lsn']})")
    print(f"  Kết quả tìm vé trên Replica: {GREEN}{res_read_after_sync['found']}{RESET}")
    print(f"  => {BOLD}{GREEN}EVENTUAL CONSISTENCY:{RESET} Toàn bộ cụm Replicas đã đạt trạng thái hội tụ nhất quán!")

def run_scenario_2():
    """
    KỊCH BẢN 2: REPLICATED-WRITE PROTOCOLS: QUORUM CONSENSUS (Mục 7.5.2)
    """
    print_header("KỊCH BẢN 2: REPLICATED-WRITE QUORUM CONSENSUS (W + R > N) (Mục 7.5.2)")
    print(f"{BOLD}Nguyên lý lý thuyết (Gifford Quorum):{RESET}")
    print("  - Tổng số bản sao: N = 3 (Node A, Node B, Node C).")
    print("  - Write Quorum: W = 2. Read Quorum: R = 2.")
    print("  - Điều kiện: W + R = 4 > 3 và W > 3/2 -> Luôn có node giao thoa (Strong Consistency).\n")

    quorum_mgr.reset()
    key = "showtime_101_available_seats"

    # Tình huống 2.1: Cả 3 nodes online
    print_step(1, "Tình huống 2.1: 3/3 Nodes Online -> Ghi và Đọc Quorum bình thường")
    res_write = quorum_mgr.quorum_write(key, 115)
    print(f"  Ghi Quorum: {GREEN}{res_write['message']}{RESET}")
    res_read = quorum_mgr.quorum_read(key)
    print(f"  Đọc Quorum: {GREEN}{res_read['message']}{RESET}")

    # Tình huống 2.2: 1 Node bị sập (Node C crash)
    print_step(2, "Tình huống 2.2: SẬP 1 NODE (Node C Crash) -> Còn 2/3 Nodes (Node A & B)")
    quorum_mgr.toggle_node("node_c", set_status="crashed")
    print(f"  {RED}[Sự cố phân vùng mạng] Node C đã bị cô lập / crash.{RESET}")
    
    # Thực hiện ghi với 2 nodes còn sống
    res_write_2nodes = quorum_mgr.quorum_write(key, 110)
    print(f"  Thử Ghi (còn 2 nodes): {GREEN if res_write_2nodes['success'] else RED}{res_write_2nodes['message']}{RESET}")
    print(f"  => {BOLD}{GREEN}FAULT TOLERANCE:{RESET} Hệ thống vẫn ghi thành công vì số node online (2) >= W (2)!")

    # Tình huống 2.3: Thêm 1 Node bị sập (Node B crash, chỉ còn Node A)
    print_step(3, "Tình huống 2.3: SẬP THÊM 1 NODE (Node B Crash) -> Chỉ còn 1/3 Node Online (Node A)")
    quorum_mgr.toggle_node("node_b", set_status="crashed")
    print(f"  {RED}[Sự cố nghiêm trọng] Node B crash tiếp. Cụm chỉ còn Node A.{RESET}")

    # Thử ghi khi không đủ Quorum
    res_write_fail = quorum_mgr.quorum_write(key, 105)
    print(f"  Thử Ghi (chỉ còn 1 node): {RED}{res_write_fail['error']}{RESET}")
    print(f"  => {BOLD}{YELLOW}BẢO VỆ TÍNH NHẤT QUÁN:{RESET} Hệ thống từ chối ghi (CP trong CAP) để ngăn ngừa Split-Brain!")

    # Tình huống 2.4: Phục hồi Node B và C (Auto Read Repair)
    print_step(4, "Tình huống 2.4: PHỤC HỒI NODE (Recover) & ĐỌC QUORUM REPAIR")
    quorum_mgr.toggle_node("node_b", set_status="online")
    quorum_mgr.toggle_node("node_c", set_status="online")
    print(f"  {GREEN}Node B và Node C đã online trở lại.{RESET}")
    res_read_repair = quorum_mgr.quorum_read(key)
    print(f"  {GREEN}{res_read_repair['message']}{RESET}")

def run_scenario_3():
    """
    KỊCH BẢN 3: RACE CONDITION & LINEARIZABILITY (Mục 7.2.1)
    """
    print_header("KỊCH BẢN 3 (BONUS): RACE CONDITION & LINEARIZABILITY CHỐNG TRÙNG GHẾ (Mục 7.2.1)")
    print("Mô phỏng 50 clients đồng thời bấm đặt ghế 'VIP-F8' tại cùng một mili-giây...")
    result = concurrency_tester.test_concurrent_booking("VIP-F8", 50)
    print(f"  Tổng số requests: {result['total_requests']}")
    print(f"  Thời gian hoàn tất: {result['duration_ms']} ms")
    print(f"  Số request thành công (200 OK): {GREEN}{result['success_count']} (Khách: {result['winner']}){RESET}")
    print(f"  Số request bị từ chối (409 Conflict): {YELLOW}{result['conflict_count']}{RESET}")
    print(f"  Đảm bảo Linearizability: {GREEN}{result['linearizability_guaranteed']}{RESET}")
    print(f"  => {BOLD}{GREEN}KẾT LUẬN:{RESET} {result['summary']}")

if __name__ == "__main__":
    print(f"{BOLD}BẮT ĐẦU CHẠY THỬ NGHIỆM TẤT CẢ KỊCH BẢN CHƯƠNG 7 (CONSISTENCY & REPLICATION)...{RESET}")
    run_scenario_1()
    run_scenario_2()
    run_scenario_3()
    print_header("HOÀN TẤT THỬ NGHIỆM THÀNH CÔNG!")
