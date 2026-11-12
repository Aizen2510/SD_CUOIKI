# Kịch bản quay video demo MeoCinema

## Chuẩn bị trước khi quay

- Mở giao diện tại `http://localhost:3000`, backend tại `http://localhost:5000/docs` và Dozzle tại `http://localhost:8080`.
- Mở terminal ở thư mục gốc dự án. Kiểm tra cụm có đủ ba node và một Primary:

  ```bash
  docker compose ps
  docker compose exec pg-monitor pg_autoctl show state --pgdata /var/lib/postgres/pgaf
  ```

- Dùng một cửa sổ trình duyệt thường và một cửa sổ ẩn danh cho hai khách hàng. Chọn một suất chiếu còn ghế trống; dùng cùng suất và cùng ghế ở cả hai cửa sổ.
- Ghi lại tên node đang là `primary`. Chỉ dừng đúng node đó trong demo.

---

## Phần 1 — Trình bày kiến trúc tổng thể

### Lời thoại

> “Đây là MeoCinema, ứng dụng đặt vé dùng để minh họa kiến trúc hệ thống phân tán. Người dùng thao tác trên giao diện React ở cổng 3000. Giao diện gửi yêu cầu HTTP đến backend FastAPI ở cổng 5000.
>
> Backend xử lý nghiệp vụ đặt vé và ghi booking vào PostgreSQL Primary. Cụm có ba PostgreSQL node: một Primary nhận ghi và hai Standby nhận WAL rồi phát lại để cập nhật bản sao. Ràng buộc duy nhất ở database bảo đảm cùng một ghế của cùng suất chiếu không thể được bán hai lần.
>
> `pg_auto_failover` monitor theo dõi trạng thái node và điều phối promote một Standby khi Primary gặp sự cố. Backend kết nối qua danh sách host để tìm node đang nhận ghi. Trong thời gian chuyển Primary, yêu cầu đặt vé chưa được báo thành công; giao diện hiển thị đang chờ. Khi kết nối lại, database quyết định booking được ghi hay ghế đã có người đặt.
>
> Distributed Lab có hai nội dung: consistency đọc-sau-ghi qua replica và replication/failover. Dozzle dùng để quan sát log. Trong bản demo, các container cùng chạy trên một máy, nên đây là mô phỏng lỗi node/container chứ không phải thử nghiệm mất cả máy vật lý.”

### Cảnh quay gợi ý

1. Quay sơ đồ kiến trúc trong README hoặc mở giao diện MeoCinema.
2. Chỉ vào frontend, backend, ba PostgreSQL node, `pg-monitor` và Dozzle.
3. Nhấn **Ctrl + Shift + L** để mở Distributed Lab, giới thiệu ngắn hai kịch bản.

---

## Phần 2 — Đặt ghế, làm Primary dừng và quan sát failover

### Lời thoại mở đầu

> “Bây giờ tôi mô phỏng một tình huống đặt vé trong lúc database failover. Khách thứ nhất sẽ đặt ghế khi Primary đang hoạt động. Sau khi booking thành công, tôi dừng Primary. Trong lúc cụm chuyển vai trò, khách thứ hai chọn đúng ghế đó. Hệ thống sẽ báo đang chờ chứ chưa xác nhận vé. Khi node mới sẵn sàng, database kiểm tra lại: nếu booking đầu tiên đã có trên node mới, yêu cầu thứ hai nhận thông báo ghế đã được đặt.”

### Các thao tác trên màn hình

1. Ở cửa sổ trình duyệt thường, chọn phim, suất chiếu và một ghế trống; hoàn tất đặt vé. Chờ tới khi giao diện hiện vé đã xác nhận.
2. Trong terminal, xem node Primary hiện tại:

   ```bash
   docker compose exec pg-monitor pg_autoctl show state --pgdata /var/lib/postgres/pgaf
   ```

3. Dừng đúng node đó. Thay `<primary>` bằng tên service đang giữ vai trò `primary`, ví dụ `pg-node3`:

   ```bash
   docker compose stop <primary>
   ```

4. Chuyển sang cửa sổ ẩn danh, mở cùng phim và cùng suất chiếu, rồi chọn đúng ghế của booking đầu tiên. Bấm đặt vé trong lúc failover đang diễn ra.
5. Quay cận cảnh thông báo màu xanh: database đang chuyển sang node mới, yêu cầu đang chờ và vé chưa được xác nhận. Giao diện tự thử lại trong tối đa 2 phút.
6. Chờ một Primary mới được bầu. Kiểm tra bằng:

   ```bash
   docker compose exec pg-monitor pg_autoctl show state --pgdata /var/lib/postgres/pgaf
   ```

7. Khi node mới nhận ghi được, booking đầu tiên còn trong database thì yêu cầu thứ hai nhận thông báo ghế đã được khách khác đặt. Đây là kết quả mong đợi: chỉ booking đã commit mới được xác nhận; ghế không bị bán lần hai.

### Lời thoại kết thúc

> “Ta thấy giao diện phân biệt rõ trạng thái đang chờ với trạng thái đặt vé thành công. Sau failover, database mới là nơi quyết định ghế còn trống hay đã có booking. Nếu bản ghi booking đầu tiên hiện diện trên Primary mới, khách thứ hai không thể đặt trùng ghế và nhận thông báo xung đột.”

### Phục hồi cụm sau khi quay

Khởi động lại node đã dừng và chờ nó tham gia lại cụm dưới vai trò Standby:

```bash
docker compose start <primary-cu>
docker compose exec pg-monitor pg_autoctl show state --pgdata /var/lib/postgres/pgaf
```

Chỉ quay lượt tiếp theo khi trạng thái cụm ổn định, có một Primary và hai Standby.

## Ghi chú về kết quả

Kết quả xung đột ở lượt thứ hai phụ thuộc vào việc booking đầu tiên có mặt trên node được promote hay không. Cấu hình replication và node được chọn để promote quyết định điều đó; không nên giới thiệu đây là bảo đảm mất dữ liệu bằng không. Trong video, chỉ kết luận “ghế đã được đặt” nếu giao diện thực sự trả thông báo xung đột sau khi Primary mới hoạt động.
