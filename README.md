# ĐỒ ÁN HỆ THỐNG ĐẶT VÉ XEM PHIM MEOCINEMA (SD_CUOIKI)

Dự án gồm 2 phần được phân chia rõ ràng:
- **FE/**: Frontend React + TypeScript (Giao diện đặt vé thời gian thực, chọn rạp, chọn ghế, bắp nước, tra cứu vé điện tử).
- **BE/**: Backend Python FastAPI + PostgreSQL (Hệ thống RESTful API, kiểm tra chống trùng ghế, xác thực voucher, xuất vé QR).

---

## 1. CƠ SỞ DỮ LIỆU POSTGRESQL

Tên file: **[`database.sql`](file:///home/aizen/booking-fe/database.sql)** (hoặc **[`BE/database.sql`](file:///home/aizen/booking-fe/BE/database.sql)**)

Bao gồm thiết kế quan hệ đầy đủ:
- `cities`, `cineplex_brands`, `cinema_theaters`, `rooms`, `movies`, `showtimes`, `combos`, `promotions`, `bookings`, `booking_seats`, `booking_combos`.
- Ràng buộc chống trùng ghế: `CONSTRAINT unique_showtime_seat UNIQUE (showtime_id, seat_code)`.

---

## 2. HƯỚNG DẪN KHỞI CHẠY DỰ ÁN

### Cách 1: Chạy trực tiếp

#### Chạy Backend (BE):
```bash
cd BE
source venv/bin/activate
PYTHONPATH=. uvicorn app.main:app --host 0.0.0.0 --port 5000 --reload
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
