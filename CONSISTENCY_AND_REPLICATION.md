# NGHIÊN CỨU & Ý TƯỞNG THỰC THI: TÍNH NHẤT QUÁN & NHÂN BẢN (CONSISTENCY & REPLICATION)
> **Đồ án môn học**: Hệ Phân Tán (Distributed Systems - SD_CUOIKI)  
> **Hệ thống ứng dụng**: MeoCinema - Nền tảng đặt vé xem phim trực tuyến thời gian thực  
> **Tài liệu tham chiếu lý thuyết**: Distributed Systems (Tanenbaum & Van Steen), CAP Theorem, PACELC Theorem, Mô hình nhất quán Data-Centric & Client-Centric.

---

## 1. ĐẶT VẤN ĐỀ TRONG HỆ THỐNG ĐẶT VÉ XEM PHIM (MEOCINEMA)

Trong hệ thống bán vé xem phim trực tuyến thời gian thực (đặc biệt các dịp mở bán bom tấn, suất chiếu đặc biệt), hệ thống phải giải quyết hai bài toán mâu thuẫn:
1. **Khả năng mở rộng và chịu tải đọc (High Read Availability & Scalability)**: Hàng triệu người dùng truy cập duyệt danh sách phim, xem lịch chiếu, rạp chiếu, sơ đồ ghế cùng lúc.
2. **Tính toàn vẹn và không trùng ghế (Strict Consistency & Linearizability)**: Hai khách hàng tại hai node khác nhau **tuyệt đối không được phép đặt cùng một ghế (Double Booking)**.

Nếu chỉ dùng 1 máy chủ cơ sở dữ liệu duy nhất:
- Trở thành **Single Point of Failure (SPOF)**.
- Nghẽn cổ chai I/O khi lưu lượng truy vấn đọc tăng vọt.

Khi giải quyết bằng cách **Nhân bản dữ liệu (Data Replication)** ra nhiều máy chủ:
- Nảy sinh vấn đề trễ nhân bản (**Replication Lag**).
- **Mâu thuẫn CAP**: Khi có phân vùng mạng (Network Partition), hệ thống chọn tính Sẵn sàng (Availability - AP) hay Nhất quán (Consistency - CP)?
- Khách hàng gặp hiện tượng: Đặt vé thành công trên node Master, nhưng khi chuyển sang màn hình tra cứu vé thì đọc trúng node Replica chưa kịp đồng bộ $\rightarrow$ **Khách tưởng mất vé / giao dịch thất bại (Vi phạm Read-Your-Writes Consistency)**.

---

## 2. TOP 5 Ý TƯỞNG THỰC THI CHO ĐỒ ÁN (TỪ THỰC TẾ ĐẾN NÂNG CAO)

Dưới đây là 5 ý tưởng kiến trúc phân tán về **Consistency & Replication** được thiết kế riêng cho MeoCinema:

```
                                  +---------------------------------------+
                                  |     NGƯỜI DÙNG / FRONTEND REACT       |
                                  +-------------------+-------------------+
                                                      |
                                          HTTP / RESTful API
                                                      |
                                                      v
                                  +---------------------------------------+
                                  |    API GATEWAY / NGINX LOAD BALANCER  |
                                  +-------------------+-------------------+
                                                      |
                         +----------------------------+----------------------------+
                         |                                                         |
                         v                                                         v
             +-----------------------+                                 +-----------------------+
             |   FASTAPI NODE 1      |                                 |    FASTAPI NODE 2     |
             +-----------+-----------+                                 +-----------+-----------+
                         |                                                         |
        [Write Queries]  |        [Read Queries]                  [Write Queries]  |        [Read Queries]
             +-----------+--------------+                              +-----------+--------------+
             |                          |                              |                          |
             v                          v                              v                          v
+--------------------------+  +--------------------------+  +--------------------------+  +--------------------------+
|  POSTGRESQL PRIMARY      |  |   POSTGRESQL REPLICA 1   |  |   POSTGRESQL REPLICA 2   |  |     REDIS CLUSTER /       |
|  (Master - Port 5432)    |  |   (Standby - Port 5433)  |  |   (Standby - Port 5434)  |  |  DISTRIBUTED LOCK STORE  |
|  * Đặt vé, Trừ voucher   |  |   * Tra cứu phim, lịch   |  |   * Tra cứu phim, lịch   |  |  * Giữ ghế tạm thời      |
+------------+-------------+  +-------------^------------+  +-------------^------------+  +--------------------------+
             |                              |                             |
             +====== Streaming Replication =+=============================+
                     (WAL - Write Ahead Log / Asynchronous or Semi-Sync)
```

---

### Ý TƯỞNG 1: PRIMARY - REPLICA DATABASE REPLICATION & DYNAMIC READ-WRITE SPLITTING
*(⭐ Khuyên dùng nhất: Điểm kỹ thuật cao, giải thích lý thuyết hệ phân tán rõ ràng, demo trực tiếp được bằng Docker)*

#### 1. Mô hình hoạt động
- **1 PostgreSQL Primary (Master)**: Chuyên trách nhận toàn bộ truy vấn ghi (**INSERT, UPDATE, DELETE**): Đặt vé (`bookings`), gán ghế (`booking_seats`), sử dụng mã giảm giá (`promotions`).
- **2 PostgreSQL Replicas (Standby/Follower)**: Đồng bộ dữ liệu qua **PostgreSQL Streaming Replication (WAL - Write-Ahead Logging)**. Nhận toàn bộ truy vấn đọc (**SELECT**): Danh sách phim (`movies`), rạp (`theaters`), suất chiếu (`showtimes`), combo bắp nước.
- **Backend Routing**: Viết middleware / database router trong FastAPI tự động nhận diện:
  - Request `GET /api/movies`, `GET /api/showtimes` $\rightarrow$ Gửi ngẫu nhiên/Round-Robin tới Replica 1 hoặc Replica 2.
  - Request `POST /api/bookings` $\rightarrow$ Bắt buộc gửi tới Primary.

#### 2. Giải quyết bài toán Consistency: Client-Centric Consistency
- **Vấn đề trễ (Replication Lag)**: Khách vừa nhấn "Thanh toán vé", Primary đã lưu vé. Khách được chuyển ngay sang trang "Vé điện tử của tôi" (`GET /api/bookings/my-tickets`). Nếu request này rơi vào Replica đang bị trễ vài chục mili-giây, khách sẽ không thấy vé.
- **Giải pháp - Read-Your-Writes Consistency (Ý niệm Phân Tán)**:
  - Khi `POST /api/bookings` thành công, backend trả về header hoặc gán cookie `Last-Write-Timestamp` (hoặc PostgreSQL LSN - Log Sequence Number).
  - Trong vòng **5 giây** sau khi có hành động ghi, mọi truy vấn đọc của Client đó sẽ được ưu tiên chuyển tiếp về **Primary** thay vì Replica.
  - Sau 5 giây (khi replication đã đồng bộ hoàn tất), các truy vấn đọc lại trở về Replica bình thường.

#### 3. Mô hình mô phỏng trên Docker Compose
```yaml
services:
  pg-primary:
    image: postgres:16-alpine
    container_name: meo_pg_primary
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: secretpassword
      POSTGRES_DB: meocinema_db
      POSTGRES_HOST_AUTH_METHOD: md5
    ports:
      - "5432:5432"

  pg-replica-1:
    image: postgres:16-alpine
    container_name: meo_pg_replica_1
    depends_on:
      - pg-primary
    ports:
      - "5433:5432"

  pg-replica-2:
    image: postgres:16-alpine
    container_name: meo_pg_replica_2
    depends_on:
      - pg-primary
    ports:
      - "5434:5432"
```

---

### Ý TƯỞNG 2: DISTRIBUTED SEAT LOCKING VỚI REDIS (LINEARIZABILITY CHO TRẠNG THÁI GIỮ GHẾ)
*(Giải quyết bài toán giữ ghế tạm thời 5-10 phút khi người dùng chuyển sang cổng thanh toán)*

#### 1. Đặt vấn đề
- Khi User A bấm chọn ghế F8, hệ thống cần tạm giữ ghế F8 trong **5 phút** để User A quét mã QR / nhập thẻ. Trong 5 phút này, User B mở ứng dụng không được chọn ghế F8.
- Nếu chỉ lưu trạng thái giữ ghế trên bộ nhớ RAM của 1 máy chủ FastAPI, khi scale ra 3 máy chủ backend phía sau Load Balancer, User B truy cập máy chủ khác sẽ không biết ghế F8 đã bị khóa $\rightarrow$ **Dirty Read / Race Condition**.

#### 2. Cơ chế giải quyết: Distributed Lock (Redlock / Atomic SET NX PX)
- Sử dụng cụm Redis phân tán lưu key:
  `lock:showtime:{showtime_id}:seat:{seat_code}` với giá trị là `user_session_id`, thời gian sống `TTL = 300` (giây).
- Khi người dùng giữ ghế:
  `SET lock:showtime:10:seat:F8 user_123 NX EX 300`
  - Nếu lệnh trả về `OK`: Khóa thành công $\rightarrow$ Ghế thuộc về User 123 trong 5 phút.
  - Nếu trả về `NIL`: Ghế đang bị người khác giữ $\rightarrow$ Trả về `409 Conflict`.
- Khi người dùng thanh toán xong: Chuyển dữ liệu vào Postgres Primary và xóa key trong Redis.
- Nếu quá 5 phút không thanh toán: Redis tự động thu hồi key (Auto-expiration), giải phóng ghế mà không cần chạy batch job quét database định kỳ.

#### 3. Mô hình nhất quán
- Đảm bảo **Linearizability (Strong Consistency)** cho tài nguyên ghế trong hệ thống phân tán đa tiến trình / đa server.

---

### Ý TƯỞNG 3: MÔ PHỎNG QUORUM-BASED REPLICATION (R + W > N) CHO TRẠNG THÁI SUẤT CHIẾU
*(Ý tưởng học thuật xuất sắc: Minh họa trực quan thuật toán đồng thuận theo sách giáo trình Hệ phân tán)*

#### 1. Nguyên lý lý thuyết Quorum Consensus (Gifford / Thomas)
- Giả sử ta có $N$ bản sao (ví dụ $N = 3$ máy chủ lưu trữ trạng thái số ghế còn trống của suất chiếu).
- Quy tắc Quorum:
  $$W + R > N$$
  $$W > N / 2$$
  *(Trong đó: $N$ là tổng số node, $W$ là số node xác nhận ghi thành công, $R$ là số node cần đọc để có dữ liệu hợp lệ)*
- Cấu hình đề xuất cho MeoCinema:
  - $N = 3$ nodes.
  - Write Quorum: $W = 2$ nodes.
  - Read Quorum: $R = 2$ nodes.
  - Do $2 + 2 = 4 > 3$, luôn đảm bảo có ít nhất **1 node giao thoa** giữa tập đọc và tập ghi $\rightarrow$ Đảm bảo **Strong Consistency** không đọc phải dữ liệu cũ (Stale Read), đồng thời ngăn ngừa hiện tượng chia rẽ não (**Split-Brain**).

#### 2. Kịch bản thực nghiệm demo trên đồ án
- Xây dựng 1 trang Dashboard Quorum Monitor trên Frontend / Swagger:
  - Hiển thị Node A, Node B, Node C với số phiên bản Version Vector / Timestamp.
  - Cho phép người dùng bấm **"Tắt giả lập Node C"** (Network Partition / Node Crash).
  - Khách hàng thực hiện đặt vé: Node A và Node B xác nhận ($2/3$ nodes $\ge W$) $\rightarrow$ Hệ thống báo thành công! (Dù 1 node chết, hệ thống vẫn duy trì Availability và Consistency).
  - Tắt tiếp Node B (chỉ còn Node A): Ghi thất bại vì không đủ Quorum ($1 < W$). Giảng viên sẽ thấy rõ nguyên lý chịu lỗi của hệ phân tán!

---

### Ý TƯỞNG 4: EVENTUAL CONSISTENCY VỚI KIẾN TRÚC CQRS & EVENT-DRIVEN REPLICATION
*(Mô hình doanh nghiệp hiện đại: Microservices, Message Broker, Outbox Pattern)*

#### 1. Kiến trúc
- Tách biệt hoàn toàn luồng ghi (Command) và luồng đọc (Query):
  - **Command Service (Write)**: Nhận lệnh đặt vé $\rightarrow$ Ghi vào Transaction Log (Postgres).
  - **Message Broker (RabbitMQ hoặc Redis Streams)**: Bắn sự kiện `TicketBookedEvent`.
  - **Query Cache Service (Read)**: Lắng nghe sự kiện $\rightarrow$ Cập nhật bản ghi Read Model (bộ nhớ đệm Redis / Elasticsearch / Read-only DB).

#### 2. Điểm phân tích Hệ Phân Tán
- **Eventual Consistency Window**: Phân tích khoảng thời gian từ lúc event được xuất bản đến khi Query Cache cập nhật (thường mất 50ms - 200ms).
- **Compensating Transactions (Mô hình SAGA)**:
  - Nếu bước thanh toán qua cổng ngân hàng thất bại $\rightarrow$ Phát sự kiện `BookingCancelledEvent` để hoàn tác ghế và hoàn tiền, thể hiện nguyên lý xử lý giao dịch phân tán không dùng Two-Phase Commit (2PC) truyền thống.
- **Optimistic UI Update ở Frontend**:
  - Giao diện React hiển thị ghế chuyển sang màu xám ngay lập tức (dự đoán trước), nếu backend trả về lỗi do xung đột thì mới revert trạng thái lại.

---

### Ý TƯỞNG 5: MULTI-MASTER (ACTIVE-ACTIVE) REPLICATION & XỬ LÝ XUNG ĐỘT (CONFLICT RESOLUTION)
*(Áp dụng cho chuỗi rạp chiếu phim đa vùng: Cụm rạp Miền Bắc & Cụm rạp Miền Nam)*

#### 1. Đặt bài toán
- Giả sử MeoCinema có 2 Trung tâm dữ liệu (Datacenter):
  - Datacenter Hà Nội (Node North) phục vụ khách hàng miền Bắc.
  - Datacenter TP.HCM (Node South) phục vụ khách hàng miền Nam.
- Hai node đều có thể nhận ghi và nhận đọc đồng thời (**Multi-Master**).
- Khi có sự cố đứt tuyến cáp quang liên vùng (Network Partition giữa Bắc và Nam), cả 2 rạp vẫn phải bán được bắp nước, đổi voucher offline.

#### 2. Chiến lược giải quyết xung đột khi mạng phục hồi
- **Last-Write-Wins (LWW)** dựa trên NTP synchronized clocks (Physical Timestamp).
- **Vector Clocks / Version Vectors**: Đánh dấu nguồn gốc của phiên bản dữ liệu $[Node_{North}: v_1, Node_{South}: v_2]$ để phát hiện xung đột đồng thời.
- **CRDT (Conflict-Free Replicated Data Types)**: Ứng dụng kiểu dữ liệu **PN-Counter** để quản lý số lượng bắp nước còn lại trong kho tổng giữa các rạp, cho phép cộng trừ độc lập mà không bao giờ bị conflict khi merge dữ liệu.

---

## 3. SO SÁNH VÀ ĐÁNH GIÁ CÁC MÔ HÌNH NHẤT QUÁN CHO MEOCINEMA

| Thành phần dữ liệu trong MeoCinema | Yêu cầu tính nhất quán (Consistency) | Mô hình đề xuất | Lý do & Trade-off |
| :--- | :--- | :--- | :--- |
| **Giao dịch thanh toán & Chốt ghế** | **Strict / Linearizability (Strong)** | Master-Only Write + Postgres Row Lock | Tránh Double-booking tuyệt đối. Ưu tiên Consistency hơn Availability (CP). |
| **Giữ ghế tạm thời (5 phút)** | **Linearizability / Sequential** | Redis Distributed Lock (TTL) | Cần tốc độ cao, độ trễ thấp (<5ms), tự động hết hạn mà không gây deadlock. |
| **Tra cứu vé vừa đặt (User Profile)** | **Read-Your-Writes (Client-Centric)** | Sticky Session hoặc Dynamic Master Read | Đảm bảo trải nghiệm người dùng không thấy vé bị "mất tích" do replication lag. |
| **Danh mục phim, Banner, Rạp** | **Eventual Consistency** | Multi-Replica Asynchronous Streaming | Dữ liệu ít thay đổi, đọc cực nhiều. Ưu tiên Availability và Throughput (AP). |
| **Thống kê lượt xem, Doanh thu rạp** | **Monotonic Reads / Eventual** | Asynchronous Aggregation / Message Queue | Có thể chấp nhận trễ vài giây đến vài phút để giảm tải cho database chính. |

---

## 4. LỘ TRÌNH ĐỀ XUẤT ĐỂ TRIỂN KHAI VÀO ĐỒ ÁN (ROADMAP)

Nếu bạn muốn tích hợp trực tiếp vào source code hiện tại của dự án:

### Giai đoạn 1: Triển khai Master - Replica trên Docker (Nhanh nhất & Đẹp nhất để báo cáo)
1. Cấu hình `docker-compose.yml`:
   - 1 service `postgres_primary` (Port 5432)
   - 1 service `postgres_replica` (Port 5433 - cấu hình đọc streaming WAL từ primary)
2. Cập nhật `BE/app/database.py`:
   - Tạo 2 connection pool: `PRIMARY_POOL` (ghi) và `REPLICA_POOL` (đọc).
   - Hàm `get_db_read()` và `get_db_write()`.
3. Cập nhật các router:
   - `movies.py`, `theaters.py`, `showtimes.py` $\rightarrow$ gọi `get_db_read()`.
   - `bookings.py` $\rightarrow$ gọi `get_db_write()`.

### Giai đoạn 2: Bổ sung tính năng Demo trực quan (Giúp ăn trọn điểm thầy cô)
1. Tạo 1 endpoint chẩn đoán: `GET /api/system/replication-status`:
   - Trả về danh sách node, độ trễ Replication Lag (mili-giây), trạng thái Master/Replica.
2. Viết 1 script test tự động bằng Python: `scripts/test_consistency.py`:
   - Dùng thư viện `threading` hoặc `asyncio` bắn đồng thời 50 request cùng đặt ghế "VIP-E8" trong cùng 1 mili-giây.
   - Kết quả: Chứng minh chính xác 1 request thành công, 49 request nhận thông báo lỗi 409 Conflict rõ ràng, không có ghế nào bị ghi đè.
3. Thêm hiển thị "Node phục vụ" ở Footer của Web React:
   - "Dữ liệu được phục vụ từ: PostgreSQL Replica 1 (Lag: 2ms)".

---

## 5. TỔNG KẾT BẢN THUYẾT TRÌNH BẢO VỆ CHO ĐỒ ÁN
Khi bảo vệ trước hội đồng giảng viên, bạn có thể nêu rõ 3 luận điểm vàng:
1. **Phân loại ranh giới nhất quán**: Chúng em không áp dụng mù quáng một mô hình duy nhất. Với nghiệp vụ cốt lõi (ghế & tiền), áp dụng **Strong Consistency**; với nghiệp vụ đọc và khám phá (phim & rạp), áp dụng **Eventual Consistency** để tối đa hóa hiệu năng.
2. **Khắc phục Replication Lag**: Ứng dụng mô hình **Read-Your-Writes** giúp người dùng sau khi thanh toán luôn thấy ngay vé của mình mà không bị ảnh hưởng bởi độ trễ nhân bản của các bản sao.
3. **Mở rộng chiều ngang (Horizontal Scalability)**: Khi lượng truy cập tăng 100 lần vào dịp Tết/Bom tấn, hệ thống chỉ cần tăng số lượng container Replicas mà không cần thay đổi logic ứng dụng cốt lõi.

---

## 6. HƯỚNG DẪN THỰC HÀNH DEMO CÁC KỊCH BẢN (LAB TRỰC QUAN & TERMINAL)

Hệ thống đã được cài đặt hoàn chỉnh **2 kịch bản chính** (kèm 1 kịch bản phụ) bám sát tuyệt đối **Chương 7 (Consistency and Replication)** trong giáo trình *Tanenbaum & Van Steen*:

### Kịch bản 1: Primary-Based Protocols (Mục 7.5.1) & Read-Your-Writes Consistency (Mục 7.3.3)
- **Vấn đề giải quyết**: Khách hàng vừa đặt vé xong (Write vào Primary Node), chuyển sang tra cứu vé.
- **Trạng thái mô phỏng**: Replicas (Standby 1 & 2) có Replication Lag $\Delta t = 2.5s$.
- **Đối chứng thực nghiệm**:
  - **TẮT Read-Your-Writes**: Đọc ngẫu nhiên từ Replica đang bị lag $\rightarrow$ **Stale Read / Không tìm thấy vé (Vi phạm nhất quán)**.
  - **BẬT Read-Your-Writes**: Client gửi kèm LSN / Timestamp token $\rightarrow$ Router tự động nhận biết client vừa có thao tác ghi và chuyển tiếp đọc về Primary $\rightarrow$ **Đảm bảo Read-Your-Writes Consistency tuyệt đối**.

### Kịch bản 2: Replicated-Write Protocols: Quorum-Based Consensus ($W + R > N$) (Mục 7.5.2)
- **Vấn đề giải quyết**: Đồng thuận cập nhật số ghế trống / phiên bản cấu hình suất chiếu trên cụm 3 node (Node A, Node B, Node C).
- **Cấu hình Quorum**: $N=3, W=2, R=2 \implies W + R = 4 > 3$ và $W > 1.5$.
- **Đối chứng thực nghiệm**:
  1. Cả 3 nodes Online: Ghi ($3/3 \ge W=2$) và Đọc ($2 \ge R=2$) thành công.
  2. **1 Node bị sập (Node C Crash / Network Partition)**: Còn 2 nodes online $\rightarrow$ Ghi vẫn thành công ($2 \ge W$) $\implies$ **Khả năng chịu lỗi (Fault-Tolerance)**.
  3. **2 Nodes bị sập (Chỉ còn Node A)**: Số node online $1 < W=2 \rightarrow$ Hệ thống từ chối ghi với lỗi `QuorumFailedException` $\implies$ **Bảo vệ Strong Consistency (CP), ngăn chặn hiện tượng Split-Brain**.
  4. Phục hồi các node: Đọc Quorum tự động thực thi **Read-Repair** để đồng bộ phiên bản mới nhất cho các node bị tụt hậu.

### Kịch bản 3 (Phụ): Consistent Ordering of Operations & Linearizability (Mục 7.2.1)
- Bắn đồng thời 50 requests đặt cùng ghế `VIP-F8` trong cùng 1 mili-giây.
- Kết quả: Đúng 1 request thành công (200 OK), 49 requests bị từ chối (409 Conflict), đảm bảo không bao giờ bị Double-Booking.

---

### CÁCH 1: DEMO TRỰC QUAN TRÊN GIAO DIỆN WEB (KHUYÊN DÙNG ĐỂ THUYẾT TRÌNH)
1. Chạy Backend:
   ```bash
   cd BE
   PYTHONPATH=. ./venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 5000 --reload
   ```
2. Chạy Frontend:
   ```bash
   cd FE
   npm start
   ```
3. Truy cập [http://localhost:3000](http://localhost:3000).
4. Nhìn lên góc phải thanh Header, bấm vào nút màu tím phát sáng: **"🔬 Lab Phân Tán (Chương 7)"**.
5. Màn hình điều khiển tương tác sẽ mở ra với đầy đủ các nút bấm mô phỏng, bảng trạng thái node, thanh trượt độ trễ, và log thời gian thực!

---

### CÁCH 2: DEMO NHANH BẰNG DÒNG LỆNH (CLI TERMINAL)
Dành cho trường hợp giảng viên muốn xem log chi tiết qua Terminal:
```bash
python3 scripts/demo_consistency.py
```
*(Script sẽ tự động chạy tuần tự Bước 1, Bước 2, Bước 3, Bước 4 của từng kịch bản và in kết quả có màu sắc rõ ràng)*

