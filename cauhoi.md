# 15 CÂU HỎI VẤN ĐÁP BẢO VỆ ĐỒ ÁN HỆ PHÂN TÁN (MEOCINEMA)
> **Chủ đề**: Kiến trúc Cụm, Tính Nhất Quán (Consistency), Sao Chép Dữ Liệu (Replication), Tự động Chuyển vùng (Failover) và Các Kịch Bản Sự Cố Thực Tế (Scenarios A, B, C, D).

---

## MỤC LỤC
1. [Nhóm 1: Kiến trúc Cụm & Cơ chế Replication](#nhóm-1-kiến-trúc-cụm--cơ-chế-replication)
   - Câu 1: Tổng quan kiến trúc 3 Data Nodes + 1 Monitor và cơ chế định tuyến Read-Write.
   - Câu 2: Cơ chế Physical Streaming Replication (WAL) và cấu hình Synchronous `ANY 1`.
   - Câu 3: Định lý CAP & PACELC trong thiết kế hệ thống MeoCinema.
   - Câu 4: Vai trò của `pg-monitor` và bài toán Single Point of Failure (SPOF).
2. [Nhóm 2: Nhất Quán Giao Dịch & Tranh Chấp Ghế Đồng Thời](#nhóm-2-nhất-quán-giao-dịch--tranh-chấp-ghế-đồng-thời)
   - Câu 5: Cơ chế xử lý Race Condition khi nhiều khách cùng tranh 1 ghế (Chống Double-Booking).
   - Câu 6: Tại sao dùng Unique Constraint ở Database thay vì In-Memory Lock ở Backend?
   - Câu 7: Cơ chế giao dịch hoàn vé (Refund Transaction) và `SELECT ... FOR UPDATE`.
   - Câu 8: Phân tích Kịch bản 3: Bão 10–20 requests đồng thời & cơ chế Rollback.
3. [Nhóm 3: Các Kịch Bản Sự Cố Thực Tế (Scenarios A, B, C, D)](#nhóm-3-các-kịch-bản-sự-cố-thực-tế-scenarios-a-b-c-d)
   - Câu 9: **Kịch bản A** — Node Primary bị sập đột ngột (Failover & Promotion).
   - Câu 10: **Kịch bản B** — Primary cũ phục hồi sau sự cố (Rejoin as Standby & Chống Split-Brain).
   - Câu 11: **Kịch bản C** — Sự cố mất Standby (1 node chết vs. cả 2 node standby chết).
   - Câu 12: **Kịch bản D** — Phân vùng mạng (Network Partition) giữa Primary và Monitor.
4. [Nhóm 4: Nhất Quán Dữ Liệu Đọc & Vận Hành Nâng Cao](#nhóm-4-nhất-quán-dữ-liệu-đọc--vận-hành-nâng-cao)
   - Câu 13: Read-Your-Writes Consistency & rủi ro Stale Read khi đọc từ Replica.
   - Câu 14: Ý nghĩa của LSN (Log Sequence Number) và cách đo lường Replication Lag.
   - Câu 15: Phân biệt Replication và Backup (Thảm họa `DROP TABLE` và Disaster Recovery).

---

## NHÓM 1: KIẾN TRÚC CỤM & CƠ CHẾ REPLICATION

### Câu 1: Trình bày kiến trúc cụm cơ sở dữ liệu của MeoCinema. Làm thế nào Backend tự động tìm và ghi đúng vào node Primary mà không cần can thiệp thủ công?
- **Trả lời**:
  - **Kiến trúc cụm**: Gồm 4 containers hoạt động phối hợp:
    1. `pg-node1`, `pg-node2`, `pg-node3`: Ba node PostgreSQL 16 đóng vai trò Data Nodes, tổ chức theo mô hình Primary - Standby.
    2. `pg-monitor`: Dịch vụ độc lập chạy `pg_auto_failover monitor`, lưu trữ metadata của cụm và giữ vai trò điều phối trạng thái (State Coordinator).
    3. `backend` (FastAPI): Kết nối tới cụm và phục vụ REST API.
    4. `Dozzle`: Thu thập và trực quan hóa log thời gian thực từ các containers.
  - **Cơ chế định tuyến tự động**:
    - Backend cấu hình chuỗi kết nối PostgreSQL libpq đa host:
      `DATABASE_URL = "postgresql://postgres@pg-node1:5432,pg-node2:5432,pg-node3:5432/meocinema_db?target_session_attrs=read-write&connect_timeout=3&sslmode=require"`
    - Tham số quan trọng nhất là `target_session_attrs=read-write`. Khi backend mở kết nối, thư viện client sẽ duyệt qua danh sách các host; nếu kết nối trúng node Standby (đang ở trạng thái Read-Only), client tự động bỏ qua và chỉ bắt tay với node nào cho phép giao dịch `read-write` (tức Primary hiện thời).
    - Nhờ đó, khi xảy ra failover và vai trò Primary chuyển từ node này sang node khác, backend tự động chuyển hướng luồng ghi mà không cần khởi động lại hoặc sửa cấu hình.

---

### Câu 2: Physical Streaming Replication trong PostgreSQL hoạt động như thế nào? Cấu hình Synchronous Replication `ANY 1` có ý nghĩa gì đối với tính an toàn dữ liệu?
- **Trả lời**:
  - **Nguyên lý Streaming Replication**:
    - Khi một transaction thay đổi dữ liệu trên Primary, thay đổi được ghi tuần tự vào nhật ký **WAL (Write-Ahead Log)** trước khi áp dụng vào các bảng dữ liệu trên đĩa.
    - Một tiến trình chuyên trách trên Primary (`walsender`) liên tục truyền luồng byte WAL qua giao thức mạng tới tiến trình `walreceiver` trên các Standby.
    - Standby nhận WAL và lập tức phát lại (**Replay**) các thao tác đó vào bộ nhớ và file dữ liệu của mình, biến dữ liệu trên Standby thành bản sao nhị phân đồng nhất với Primary.
  - **Ý nghĩa của cấu hình `ANY 1`**:
    - Mặc định của replication bất đồng bộ (Asynchronous): Primary xác nhận commit thành công cho client ngay khi WAL ghi vào đĩa của Primary. Rủi ro: Nếu Primary sập ngay sau đó, các WAL chưa kịp truyền sang Standby sẽ bị mất vĩnh viễn (Data Loss).
    - Cụm MeoCinema cấu hình **Synchronous Replication với chính sách `ANY 1`** (`synchronous_commit = on` và `synchronous_standby_names = 'ANY 1 (...)'`): Khi client thực hiện `COMMIT`, tiến trình trên Primary sẽ tạm dừng chờ cho đến khi **ít nhất 1 node Standby** gửi tín hiệu xác nhận đã nhận và ghi WAL an toàn vào đĩa của nó.
    - **Đánh đổi**: Tăng một lượng nhỏ độ trễ ghi (Latency) tương đương thời gian truyền mạng Round-Trip Time (RTT), nhưng đổi lại đạt mức an toàn dữ liệu cao: bảo đảm mọi giao dịch vé đã báo thành công cho khách hàng đều đã tồn tại trên ít nhất 2 máy chủ vật lý/container độc lập.

---

### Câu 3: Dựa trên định lý CAP và PACELC, hệ thống MeoCinema thuộc loại hệ thống nào? Hãy phân tích sự đánh đổi.
- **Trả lời**:
  - **Theo định lý CAP**:
    - Khi có **Network Partition (P)** xảy ra, MeoCinema ưu tiên **Consistency (C)** hơn **Availability (A)** $\rightarrow$ Hệ thống thuộc nhóm **CP**.
    - *Lý do*: Trong nghiệp vụ bán vé xem phim, tính đúng đắn (một ghế chỉ bán cho một người duy nhất) quan trọng hơn tính sẵn sàng nhận đơn mù quáng. Nếu xảy ra đứt mạng khiến Primary không thể đảm bảo quorum hoặc không xác nhận được với Standby, hệ thống thà từ chối giao dịch hoặc báo lỗi tạm thời (chấp nhận giảm Availability) chứ tuyệt đối không để xảy ra tình trạng bán trùng một ghế cho 2 khách hàng (vi phạm Consistency).
  - **Theo định lý PACELC**:
    - **P-C / E-L**:
      - **If Partition (P)**: Chọn **Consistency (C)** thay vì Availability.
      - **Else (E - Trạng thái bình thường không có lỗi mạng)**: Chọn **Consistency (C)** và chấp nhận đánh đổi một phần **Latency (L)** vì sử dụng cơ chế ghi đồng bộ `ANY 1` và bắt buộc mọi thao tác kiểm tra/giữ ghế phải đi qua Primary.

---

### Câu 4: Container `pg-monitor` có phải là điểm lỗi duy nhất (Single Point of Failure - SPOF) của toàn hệ thống không? Điều gì xảy ra nếu container này bị dừng?
- **Trả lời**:
  - **Không phải SPOF đối với luồng phục vụ người dùng bình thường**:
    - Dữ liệu phim, rạp, suất chiếu và vé xem phim hoàn toàn nằm ở 3 data nodes (`pg-node1`, `pg-node2`, `pg-node3`), không lưu trên monitor.
    - Backend kết nối trực tiếp đến các PostgreSQL node để đọc/ghi, hoàn toàn không gửi query qua `pg-monitor`.
    - Các node Standby stream WAL trực tiếp từ Primary, không trung chuyển qua monitor.
    - Vì vậy, nếu `pg-monitor` bị dừng, hệ thống bán vé của MeoCinema **vẫn tiếp tục nhận đặt vé, hoàn vé và sao chép dữ liệu hoàn toàn bình thường**.
  - **Hạn chế duy nhất khi `pg-monitor` dừng**:
    - Mất khả năng **Tự động chuyển vùng (Automatic Failover)**. Nếu trong khoảng thời gian monitor đang chết mà node Primary cũng gặp sự cố sập đĩa, cụm sẽ không có thực thể điều phối để tự động promote Standby lên làm Primary mới. Các quyết định failover sẽ tạm thời bị đình chỉ cho đến khi monitor phục hồi.

---

## NHÓM 2: NHẤT QUÁN GIAO DỊCH & TRANH CHẤP GHẾ ĐỒNG THỜI

### Câu 5: Trong Kịch bản 1, khi hai khách hàng mở hai trình duyệt và cùng bấm đặt ghế `VIP-E7` ở cùng một tích tắc, cơ chế nào bảo đảm không bị Double-Booking?
- **Trả lời**:
  - Quá trình xử lý diễn ra qua 3 tầng bảo vệ:
    1. **Tầng ứng dụng (Application Level)**: Backend kiểm tra sơ bộ xem ghế có nằm trong danh sách đã đặt hay không. Tuy nhiên, khi 2 request đến song song (Concurrent Requests), cả hai đều có thể vượt qua bước kiểm tra này tại cùng thời điểm $t_0$.
    2. **Tầng Giao dịch Cơ sở dữ liệu (Database Transaction Isolation)**: Cả hai request đều mở transaction riêng biệt (`conn.autocommit = False`) trên cùng một node Primary.
    3. **Tầng Ràng buộc Toàn vẹn (Database Unique Constraint - Trọng tài tối cao)**:
       - Bảng `booking_seats` có ràng buộc:
         ```sql
         CONSTRAINT unique_showtime_seat UNIQUE (showtime_id, seat_code)
         ```
       - Khi Request 1 thực hiện câu lệnh `INSERT INTO booking_seats (...) VALUES (..., showtime_id, 'E7')`, PostgreSQL cấp Row Lock và chèn bản ghi thành công.
       - Khi Request 2 thực hiện câu lệnh tương tự cho cùng cặp `(showtime_id, 'E7')`, PostgreSQL phát hiện vi phạm chỉ mục duy nhất (Unique Index Violation), lập tức ném ngoại lệ `psycopg2.IntegrityError` (mã lỗi PostgreSQL `23505 - unique_violation`).
       - Backend bắt lỗi này, lập tức gọi `conn.rollback()`, xóa toàn bộ booking dở dang của Request 2 và trả về HTTP `409 Conflict` cho khách hàng thứ hai. Khách hàng thứ nhất nhận HTTP `200 OK`.

---

### Câu 6: Tại sao không dùng biến khóa trong bộ nhớ Backend (ví dụ `threading.Lock()` của Python) mà bắt buộc phải dựa vào Database Constraint?
- **Trả lời**:
  - **Hạn chế của In-Memory Lock**:
    - `threading.Lock()` chỉ có phạm vi tác dụng bên trong **duy nhất một tiến trình (Single Process)** của Python.
    - Trong môi trường thực tế, hệ thống thường mở rộng theo chiều ngang (Scale Out): chạy nhiều worker uvicorn (ví dụ `uvicorn --workers 4`), hoặc triển khai nhiều container backend phía sau một Load Balancer (Nginx/HAProxy/Kubernetes Ingress).
    - Khi đó, Request 1 rơi vào `Worker A`, Request 2 rơi vào `Worker B`. Bộ nhớ của Worker A và Worker B hoàn toàn tách biệt. Khóa trong bộ nhớ của Worker A không thể ngăn cản Worker B ghi dữ liệu, dẫn đến **Double-Booking ngay lập tức**.
  - **Ưu thế của Database Constraint**:
    - Database là **Nguồn chân lý duy nhất (Single Source of Truth)**. Toàn bộ các worker, các luồng dù đến từ bất kỳ đâu đều hội tụ về node Primary của Database. Ràng buộc `UNIQUE` ở mức bảng bảo đảm tính nhất quán toàn vẹn trên toàn bộ hệ thống phân tán mà không phụ thuộc vào số lượng backend server.

---

### Câu 7: Trình bày cơ chế thực thi của chức năng Hoàn vé (Refund) trong Kịch bản 1. Tại sao cần dùng `SELECT ... FOR UPDATE`?
- **Trả lời**:
  - **Quy trình hoàn vé trong transaction**:
    1. Bắt đầu transaction.
    2. Dùng `SELECT * FROM bookings WHERE id = %s FOR UPDATE` để tìm vé.
    3. Kiểm tra tính hợp lệ: Vé phải ở trạng thái `paid` (chưa hoàn), và thời điểm hiện tại phải **trước giờ phim chiếu ít nhất X phút**. Nếu phim đã bắt đầu, backend từ chối và rollback.
    4. Cập nhật trạng thái vé: `UPDATE bookings SET payment_status = 'refunded' WHERE id = %s`.
    5. Xóa các dòng giữ ghế tương ứng trong `booking_seats` để giải phóng ghế về trạng thái trống trên sơ đồ rạp.
    6. `COMMIT` transaction.
  - **Vai trò của `SELECT ... FOR UPDATE` (Pessimistic Locking)**:
    - Ngăn chặn cuộc tấn công hoàn vé đồng thời (**Double Refund Race Condition**): Nếu người dùng dùng script bấm nút "Hoàn vé" 10 lần cùng một mili-giây, `FOR UPDATE` sẽ khóa độc quyền dòng dữ liệu của vé đó. Request đầu tiên xử lý và đổi trạng thái thành `refunded`. Chín request tiếp theo khi mở khóa đọc ra sẽ thấy trạng thái đã là `refunded` và bị từ chối ngay lập tức, ngăn chặn việc hoàn tiền hai lần.

---

### Câu 8: Phân tích Kịch bản 3 vừa xây dựng: Khi kích hoạt bão 20 requests đồng thời tranh mua ghế `VIP-F8`, các tiến trình diễn ra như thế nào?
- **Trả lời**:
  - **Giai đoạn 1 — Đồng bộ điểm xuất phát**:
    - Backend tạo 20 worker threads bằng `ThreadPoolExecutor`.
    - Sử dụng `threading.Barrier(20)` để neo cả 20 luồng lại cho đến khi toàn bộ 20 kết nối sẵn sàng. Khi Barrier mở, 20 truy vấn SQL được đẩy đồng loạt vào PostgreSQL trong cùng 1 microsecond.
  - **Giai đoạn 2 — Cạnh tranh và Cô lập**:
    - Đúng 1 thread may mắn nhất được bộ điều phối transaction của PostgreSQL cấp quyền ghi trước; transaction này thực hiện `COMMIT` thành công (Mã HTTP `200 OK`, thời gian xử lý ~10–20ms).
    - 19 threads còn lại chạm phải khóa duy nhất của cặp `(showtime_id, 'VIP-F8')`, kích hoạt ngoại lệ `psycopg2.IntegrityError`. Tất cả đều được rollback an toàn (Mã HTTP `409 Conflict`).
  - **Giai đoạn 3 — Đối soát Replication tức thời**:
    - Ngay sau khi transaction thắng commit, hệ thống mở kết nối trực tiếp đến từng host `pg-node1`, `pg-node2`, `pg-node3`.
    - Truy vấn trực tiếp `booking_seats` và bảng `bookings`: Cả 3 node đều trả về trạng thái ghế là `BOOKED` cùng một mã `booking_code` thống nhất. Tỷ lệ đồng nhất đạt 100%.

---

## NHÓM 3: CÁC KỊCH BẢN SỰ CỐ THỰC TẾ (SCENARIOS A, B, C, D)

```
                            +--------------------+
                            |     pg-monitor     |
                            +---------+----------+
                                     / \
                        heartbeat   /   \   heartbeat
                                   /     \
                                  v       v
+------------------+         WAL          +------------------+
|  Node 1 (Primary)| -------------------> |Node 2 (Secondary)|
+------------------+                      +------------------+
        |                                          |
        |                  WAL                     |
        +----------------------------------------> |
                                                   v
                                          +------------------+
                                          |Node 3 (Secondary)|
                                          +------------------+
```

---

### Câu 9: KỊCH BẢN A — Giả sử node Primary hiện tại (ví dụ `pg-node1`) bị sập đột ngột (tắt nguồn / `docker compose stop`). Hệ thống xử lý thế nào từ lúc sập đến khi phục hồi phục vụ?
- **Trả lời**:
  Quá trình failover diễn ra theo 5 bước tự động:
  1. **Phát hiện lỗi (Failure Detection)**:
     - `pg-monitor` gửi heartbeat kiểm tra trạng thái tới `pg-node1` mỗi giây. Khi không nhận được phản hồi sau số lần retry (timeout ~10–20 giây), monitor tuyên bố `pg-node1` ở trạng thái `demoted` / `offline`.
  2. **Bầu chọn Standby kế nhiệm (Leader Election)**:
     - Monitor so sánh vị trí nhật ký LSN (`pg_last_wal_receive_lsn`) giữa `pg-node2` và `pg-node3`. Node nào có LSN lớn hơn (chứa dữ liệu mới nhất, bắt kịp Primary sát nhất) sẽ được chọn làm ứng viên thăng cấp (Candidate).
  3. **Thăng cấp (Promotion)**:
     - Monitor gửi lệnh yêu cầu node được chọn (ví dụ `pg-node2`) thoát khỏi chế độ recovery: thực thi lệnh `pg_promote()`.
     - `pg-node2` trở thành **Primary mới**, mở quyền ghi dữ liệu.
     - Node còn lại (`pg-node3`) được chỉ đạo đổi upstream target để stream WAL từ `pg-node2`.
  4. **Tự phục hồi kết nối ở Backend**:
     - Trong vài giây chuyển giao, các request ghi có thể bị lỗi kết nối ngắn (connection refused / closed).
     - Ngay sau khi `pg-node2` lên Primary, cấu hình `target_session_attrs=read-write` của backend lập tức nhận diện `pg-node2` là node nhận ghi và tự động chuyển toàn bộ luồng booking sang `pg-node2`. Người dùng tiếp tục đặt vé bình thường mà không cần khởi động lại ứng dụng.

---

### Câu 10: KỊCH BẢN B — Sau khi Kịch bản A hoàn tất (`pg-node2` đã làm Primary), ta bật lại node cũ bằng `docker compose start pg-node1`. Node này sẽ hành xử thế nào? Có xảy ra hiện tượng Split-Brain (hai Primary cùng lúc) không?
- **Trả lời**:
  - **Cơ chế chống Split-Brain của pg_auto_failover**:
    - Khi `pg-node1` khởi động lại, tiến trình `pg_autoctl` quản lý node này không tự ý mở quyền ghi độc lập mà **bắt buộc phải kết nối tới `pg-monitor` trước** để khai báo và truy vấn trạng thái hợp lệ của mình trong cụm.
    - Monitor thông báo cho `pg-node1` rằng vai trò Primary của nó đã bị phế truất, và Primary hợp pháp hiện tại đang là `pg-node2`.
  - **Quá trình Rejoin dưới vai trò Standby**:
    - `pg_autoctl` tự động cấu hình lại `postgresql.conf` của `pg-node1`, chuyển nó sang chế độ standby (`standby.signal`), trỏ upstream kết nối đến `pg-node2`.
    - Nếu LSN của `pg-node1` bị phân kỳ (do có commit cục bộ chưa truyền đi), công cụ `pg_rewind` sẽ tự động được kích hoạt để cuốn ngược các thay đổi thừa về điểm chia nhánh, sau đó đồng bộ WAL mới nhất từ `pg-node2`.
    - Kết quả: `pg-node1` gia nhập lại cụm dưới tư cách **Standby (Secondary)** an toàn. Cụm trở lại trạng thái hoàn hảo: 1 Primary (`pg-node2`), 2 Standby (`pg-node1`, `pg-node3`). Hiện tượng Split-Brain bị triệt tiêu hoàn toàn.

---

### Câu 11: KỊCH BẢN C — Điều gì xảy ra nếu:
- **C.1: Một node Standby bị chết?**
- **C.2: CẢ HAI node Standby cùng bị chết (chỉ còn duy nhất Primary hoạt động)?**
- **Trả lời**:
  - **Trường hợp C.1 (Mất 1 Standby)**:
    - Hệ thống cấu hình synchronous replication là `ANY 1`. Primary chỉ cần nhận được xác nhận từ **ít nhất 1 Standby**.
    - Do đó, khi 1 Standby sập, Primary vẫn còn Standby thứ hai để gửi WAL và nhận xác nhận commit.
    - **Kết quả**: Cụm vẫn nhận ghi bình thường, không suy giảm tính nhất quán, không gián đoạn dịch vụ.
  - **Trường hợp C.2 (Mất CẢ 2 Standby)**:
    - Khi cả 2 Standby đều offline, Primary không thể tìm thấy bất kỳ node nào đáp ứng điều kiện `ANY 1`.
    - **Hành vi của PostgreSQL**: Khi client gửi lệnh `COMMIT`, PostgreSQL Primary sẽ ghi WAL cục bộ nhưng **bị treo (Blocked) để chờ** tín hiệu xác nhận từ một Standby.
    - Sau một khoảng thời gian timeout, request của client sẽ bị timeout / trả về lỗi.
    - **Ý nghĩa Hệ phân tán**: Đây là minh chứng rõ ràng nhất của mô hình **CP trong CAP**. Hệ thống thà ngừng nhận đơn đặt vé mới (chấp nhận hy sinh Availability) chứ không cho phép Primary ghi đơn độc mà không có bản sao dự phòng, tránh nguy cơ mất trắng dữ liệu nếu Primary đột tử ngay sau đó.

---

### Câu 12: KỊCH BẢN D — Phân vùng mạng (Network Partition): Giả sử mạng bị đứt khiến Primary (`pg-node1`) bị cô lập hoàn toàn khỏi `pg-monitor` và hai Standby (`pg-node2`, `pg-node3`). Hệ thống sẽ xử lý thế nào?
- **Trả lời**:
  - Tình huống này phân chia cụm thành 2 vùng mạng độc lập:
    - **Vùng thiểu số (Minority Partition)**: Chỉ có duy nhất `pg-node1`.
    - **Vùng đa số (Majority Partition)**: Gồm `pg-monitor`, `pg-node2` và `pg-node3`.
  - **Hành vi tại Vùng đa số**:
    - Monitor không thấy heartbeat từ `pg-node1`, nhận diện node này đã mất kết nối.
    - Do monitor vẫn kiểm soát được đa số (2/3 data nodes), monitor có đủ **Quorum** để ra quyết định: bầu chọn `pg-node2` lên làm Primary mới để phục vụ tiếp.
  - **Hành vi tại Vùng thiểu số (`pg-node1`)**:
    - Dù `pg-node1` có thể vẫn đang chạy, nhưng cấu hình synchronous replication `ANY 1` ngăn cản nó: không có Standby nào bên cạnh để xác nhận WAL, mọi giao dịch ghi gửi vào `pg-node1` đều bị chặn (Blocked) và không thể commit.
    - Hơn nữa, pg_autoctl keeper trên `pg-node1` khi phát hiện mất kết nối với Monitor quá thời gian quy định sẽ tự động hạ cấp node này (self-demote) về read-only để tránh nhận ghi nhầm.
  - **Kết luận**: Nhờ cơ chế Quorum và Synchronous Commit, hệ thống bảo vệ dữ liệu tuyệt đối trước phân vùng mạng, không bao giờ xuất hiện hai Primary cùng ghi dữ liệu độc lập.

---

## NHÓM 4: NHẤT QUÁN DỮ LIỆU ĐỌC & VẬN HÀNH NÂNG CAO

### Câu 13: Read-Your-Writes Consistency (Tính nhất quán Đọc-sau-Ghi) là gì? Nếu chúng ta cấu hình cho phép các truy vấn đọc (SELECT) đọc từ các node Standby (Read Replicas) để giảm tải cho Primary, vấn đề gì có thể xảy ra và cách khắc phục?
- **Trả lời**:
  - **Định nghĩa**: Read-Your-Writes Consistency là mô hình nhất quán lấy người dùng làm trung tâm (Client-Centric Consistency), đảm bảo rằng: một khi khách hàng $U$ đã thực hiện một thao tác ghi thành công, mọi thao tác đọc tiếp theo của chính khách hàng $U$ đều **bắt buộc phải nhìn thấy giá trị vừa ghi đó**.
  - **Vấn đề khi đọc từ Standby (Stale Read / Dirty Read)**:
    - Trong mô hình Read-Write Splitting thông thường: Mọi lệnh `INSERT/UPDATE` gửi vào Primary, còn lệnh `SELECT` (như vào màn hình "Vé của tôi" hoặc xem sơ đồ ghế) được chuyển hướng sang Standby để san tải CPU/RAM.
    - Tuy nhiên, Standby cần một khoảng thời gian trễ nhất định để nhận WAL và Replay vào đĩa (**Replication Lag** $\Delta t$).
    - Nếu khách hàng vừa bấm "Đặt vé" thành công trên Primary, ngay lập tức bấm sang tab "Vé của tôi" mà request đọc lại trỏ trúng một Standby đang bị trễ LSN: Khách hàng **không tìm thấy vé mình vừa mua**. Khách hàng sẽ hoang mang tưởng giao dịch lỗi và bấm đặt lại lần nữa $\rightarrow$ Trải nghiệm người dùng tồi tệ.
  - **Cách khắc phục trong hệ phân tán**:
    1. **Chiến lược đọc có điều kiện (Monotonic Read Routing)**: Các truy vấn quan trọng của chính người dùng vừa ghi (như xem vé vừa đặt) bắt buộc định tuyến về Primary trong vòng $N$ giây đầu tiên; chỉ đọc từ Standby đối với dữ liệu ít nhạy cảm (danh sách rạp, thông tin phim).
    2. **Đọc theo mốc LSN (Session Causal Consistency)**: Khi Primary commit, trả về cho Frontend mã LSN vừa ghi. Khi Frontend đọc từ Standby, gửi kèm LSN này; Standby chỉ trả kết quả nếu `replay_lsn >= commit_lsn`, nếu chưa kịp sẽ chờ hoặc fallback về Primary.

---

### Câu 14: Chỉ số LSN (Log Sequence Number) được dùng trong phần demo mang ý nghĩa gì? Làm sao biết một Standby đã đồng bộ dữ liệu hoàn toàn với Primary?
- **Trả lời**:
  - **Ý nghĩa LSN**:
    - LSN là một số nguyên 64-bit (biểu diễn dưới dạng chuỗi hexa, ví dụ `0/16B2A88`), đại diện cho **vị trí byte dịch chuyển tuần tự** trong luồng nhật ký WAL của PostgreSQL.
    - Mỗi khi có giao dịch thay đổi dữ liệu được ghi vào WAL, giá trị LSN của hệ thống sẽ tăng lên tương ứng.
  - **Cách kiểm tra độ đồng bộ qua các hàm hệ thống PostgreSQL**:
    - Trên **Primary**: Gọi `SELECT pg_current_wal_lsn();` để lấy vị trí WAL hiện thời ($LSN_{primary}$).
    - Trên **Standby**:
      - `pg_last_wal_receive_lsn()`: Vị trí WAL mà Standby đã nhận qua mạng.
      - `pg_last_wal_replay_lsn()`: Vị trí WAL mà Standby đã thực sự áp dụng (phát lại) vào cơ sở dữ liệu ($LSN_{standby}$).
    - **Đánh giá**:
      - Nếu $LSN_{primary} = LSN_{standby}$: Node Standby đang ở trạng thái **bắt kịp hoàn toàn (Fully Caught Up)**, dữ liệu giữa 2 node là giống hệt nhau 100%.
      - Nếu $LSN_{primary} > LSN_{standby}$: Standby đang bị trễ. Độ trễ có thể tính bằng số byte chênh lệch:
        `SELECT pg_wal_lsn_diff(pg_current_wal_lsn(), pg_last_wal_replay_lsn());`

---

### Câu 15: "Replication không phải là Backup" (Replication is NOT a Backup). Câu nói này có ý nghĩa gì trong đồ án? Giả sử ai đó chạy lệnh `DROP TABLE bookings;` trên Primary, replication có bảo vệ được dữ liệu không?
- **Trả lời**:
  - **Ý nghĩa câu nói**:
    - **Replication (Sao chép)** giải quyết bài toán **Tính sẵn sàng cao (High Availability)** và **Chịu lỗi phần cứng (Hardware Fault Tolerance)**. Mục tiêu là nếu một máy chủ chết vật lý, máy chủ khác có thể lập tức thế chỗ để ứng dụng không ngừng hoạt động.
    - **Backup (Sao lưu)** giải quyết bài toán **Khôi phục thảm họa (Disaster Recovery)** và **Chống lỗi do con người / phần mềm (Human / Software Error)**.
  - **Tình huống `DROP TABLE bookings;`**:
    - Lệnh `DROP TABLE` là một câu lệnh DDL hợp lệ được ghi nhận vào WAL trên Primary.
    - Cơ chế Replication sẽ thực thi lệnh này một cách mù quáng và trung thực: nó lập tức truyền WAL chứa lệnh `DROP TABLE` tới toàn bộ các Standby nodes.
    - Trong vòng vài mili-giây, bảng `bookings` trên **toàn bộ 3 node `pg-node1`, `pg-node2`, `pg-node3` đều bị xóa sạch**.
    - Replication hoàn toàn bất lực trước thảm họa này.
  - **Giải pháp thực tế cho một hệ thống phân tán hoàn chỉnh**:
    1. **Physical Backup định kỳ**: Dùng công cụ như `pgBackRest` hoặc `WAL-G` để chụp full backup hàng ngày và lưu trữ các đoạn WAL lưu trữ (WAL Archiving) lên một hệ thống lưu trữ độc lập (như AWS S3 / MinIO).
    2. **Point-In-Time Recovery (PITR)**: Khi xảy ra sự cố xóa nhầm lúc `14:05:00`, kỹ sư có thể lấy bản sao lưu và phát lại WAL đến đúng thời điểm `14:04:59` để khôi phục lại toàn bộ dữ liệu ngay trước thời khắc lệnh phá hoại được thực thi.

