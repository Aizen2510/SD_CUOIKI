# ĐỒ ÁN HỆ THỐNG ĐẶT VÉ XEM PHIM MEOCINEMA (SD_CUOIKI)

Dự án gồm 2 phần được phân chia rõ ràng:
- **FE/**: Frontend React + TypeScript (Giao diện đặt vé thời gian thực, chọn rạp, chọn ghế, bắp nước, tra cứu vé điện tử).
- **BE/**: Backend Python FastAPI + PostgreSQL (Hệ thống RESTful API, kiểm tra chống trùng ghế, xác thực voucher, xuất vé QR).

---

## 1. CƠ SỞ DỮ LIỆU POSTGRESQL

Tên file: [**`BE/database.sql`**](file:///home/aizen/SD_CUOIKI/BE/database.sql)

Bao gồm thiết kế quan hệ đầy đủ:
- `cities`, `cineplex_brands`, `cinema_theaters`, `rooms`, `movies`, `showtimes`, `combos`, `promotions`, `bookings`, `booking_seats`, `booking_combos`.
- Ràng buộc chống trùng ghế: `CONSTRAINT unique_showtime_seat UNIQUE (showtime_id, seat_code)`.

---

## 2. CHUYÊN ĐỀ HỆ PHÂN TÁN: TÍNH NHẤT QUÁN & NHÂN BẢN (CONSISTENCY & REPLICATION)

Chi tiết thiết kế kiến trúc, mô hình phân tán, các giải pháp và kịch bản demo cho đồ án xem tại:  
👉 [**`CONSISTENCY_AND_REPLICATION.md`**](file:///home/aizen/SD_CUOIKI/CONSISTENCY_AND_REPLICATION.md)

Các nội dung chính trong chuyên đề:
1. **Primary-Replica Replication & Dynamic Read/Write Splitting**: Tách biệt luồng Đọc (Replicas) và Ghi (Primary) trong PostgreSQL.
2. **Read-Your-Writes Consistency**: Giải quyết triệt để vấn đề Replication Lag khi khách hàng vừa đặt vé xong chuyển sang tra cứu vé.
3. **Distributed Seat Locking với Redis (Linearizability)**: Khóa giữ ghế tạm thời trong 5 phút đa tiến trình / đa máy chủ.
4. **Mô phỏng Quorum Consensus ($W + R > N$)**: Đảm bảo Strong Consistency và khả năng chịu lỗi (Fault-Tolerance) khi có node bị sập / phân vùng mạng.
5. **Eventual Consistency với CQRS & Event-Driven**: Ứng dụng mô hình SAGA và Message Queue.

---

## 3. HƯỚNG DẪN KHỞI CHẠY DỰ ÁN

### Cách 1: Chạy trực tiếp

#### Chạy Backend (BE):
```bash
cd BE
python3 -m venv venv
source venv/bin/activate
PYTHONPATH=. ./venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 5000 --reload
```
Tài liệu Swagger API: [http://localhost:5000/docs](http://localhost:5000/docs)

#### Chạy Frontend (FE):
```bash
cd FE
npm start
```
Giao diện Web: [http://localhost:3000](http://localhost:3000)

*(Hoặc ở thư mục gốc có thể gõ `npm run start:be` và `npm run start:fe`)*

---

### Cách 2: Chạy với Docker Compose
```bash
docker compose up -d
```
Tự động khởi chạy PostgreSQL và Backend FastAPI kết nối sẵn với cơ sở dữ liệu.

