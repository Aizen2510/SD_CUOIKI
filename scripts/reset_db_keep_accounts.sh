#!/usr/bin/env bash
# =============================================================================
# MEOCINEMA — SCRIPT RESET DATABASE (CHỈ GIỮ LẠI CÁC TÀI KHOẢN & DANH MỤC PHIM)
# =============================================================================
# Mục đích:
# 1. Xóa toàn bộ các đơn đặt vé (bookings), chi tiết ghế (booking_seats), bắp nước (booking_combos).
# 2. Xóa bảng demo replication (replication_demo_events).
# 3. Trả toàn bộ ghế của tất cả suất chiếu về trạng thái TRỐNG 100%.
# 4. GIỮ LẠI NGUYÊN VẸN:
#    - Toàn bộ tài khoản khách hàng (bảng users: khach1, khach2, khach3).
#    - Toàn bộ danh mục phim, rạp chiếu, phòng chiếu, suất chiếu, bắp nước, khuyến mãi.
# 5. Reset lại file persistent_storage.json của backend.
# =============================================================================

set -e

# Màu sắc hiển thị
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "\n${CYAN}====================================================================${NC}"
echo -e "${CYAN}    MEOCINEMA — RESET DỮ LIỆU ĐẶT VÉ (CHỈ GIỮ LẠI TÀI KHOẢN)        ${NC}"
echo -e "${CYAN}====================================================================${NC}\n"

# 1. Tìm node đang là Primary qua pg-monitor
echo -e "${YELLOW}🔍 Đang xác định node PostgreSQL Primary hiện tại...${NC}"
PRIMARY_NODE=""

if docker compose ps pg-monitor 2>/dev/null | grep -q "Up"; then
    PRIMARY_NODE=$(docker compose exec -T pg-monitor pg_autoctl show state --pgdata /var/lib/postgres/pgaf 2>/dev/null | grep -i "primary.*primary" | awk -F'|' '{print $3}' | awk -F':' '{gsub(/[[:space:]]/, "", $1); print $1}' | head -n 1)
fi

# Fallback nếu không parse được qua pg_autoctl
if [ -z "$PRIMARY_NODE" ]; then
    for node in pg-node1 pg-node2 pg-node3; do
        if docker compose ps "$node" 2>/dev/null | grep -q "Up"; then
            IS_STANDBY=$(docker compose exec -T "$node" psql -U postgres -d meocinema_db -tAc "SELECT pg_is_in_recovery();" 2>/dev/null || echo "error")
            if [ "$IS_STANDBY" = "f" ]; then
                PRIMARY_NODE="$node"
                break
            fi
        fi
    done
fi

if [ -n "$PRIMARY_NODE" ]; then
    echo -e "${GREEN}✓ Đã tìm thấy Primary node: ${PRIMARY_NODE}${NC}"
    echo -e "${YELLOW}🧹 Đang thực hiện TRUNCATE dữ liệu vé trên ${PRIMARY_NODE}...${NC}"

    docker compose exec -T "$PRIMARY_NODE" psql -U postgres -d meocinema_db << 'EOF'
BEGIN;
-- Xóa toàn bộ dữ liệu vé đặt phát sinh
TRUNCATE TABLE booking_combos, booking_seats, bookings RESTART IDENTITY CASCADE;

-- Xóa bảng bản ghi demo replication nếu có
DROP TABLE IF EXISTS replication_demo_events;

-- Đồng bộ sequence
SELECT setval('bookings_id_seq', 1, false);
COMMIT;
EOF

    echo -e "${GREEN}✓ Đã dọn sạch database trên PostgreSQL Cluster thành công!${NC}"
    
    # Hiển thị số lượng tài khoản còn lại
    USER_COUNT=$(docker compose exec -T "$PRIMARY_NODE" psql -U postgres -d meocinema_db -tAc "SELECT count(*) FROM users;" 2>/dev/null || echo "N/A")
    echo -e "${GREEN}✓ Số tài khoản người dùng được giữ lại: ${USER_COUNT} accounts${NC}"
else
    echo -e "${YELLOW}⚠️ Không tìm thấy PostgreSQL container đang chạy. Bỏ qua bước xóa trên database Docker.${NC}"
fi

# 2. Xóa trạng thái lưu trữ persistent_storage.json ở backend (nếu có)
STORAGE_FILE="$(dirname "$0")/../BE/persistent_storage.json"
if [ -f "$STORAGE_FILE" ]; then
    echo -e "${YELLOW}🧹 Đang reset file bộ nhớ đệm: BE/persistent_storage.json...${NC}"
    cat << 'EOF' > "$STORAGE_FILE"
{
  "reserved_seats_map": {},
  "bookings_store": []
}
EOF
    echo -e "${GREEN}✓ Đã làm sạch BE/persistent_storage.json.${NC}"
fi

echo -e "\n${GREEN}🎉 HOÀN TẤT RESET!${NC}"
echo -e "• Tất cả ghế đã được trả về trạng thái TRỐNG."
echo -e "• Các tài khoản đăng nhập (khach1, khach2, khach3) được giữ nguyên vẹn."
echo -e "• Hệ thống sẵn sàng cho lượt chạy Demo tiếp theo!\n"

