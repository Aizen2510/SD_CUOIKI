-- =============================================================================
-- HỆ THỐNG CƠ SỞ DỮ LIỆU ĐẶT VÉ XEM PHIM MEOCINEMA (SD_CUOIKI)
-- HỆ QUẢN TRỊ CƠ SỞ DỮ LIỆU: PostgreSQL 14+
-- TÊN FILE: database.sql
-- =============================================================================

-- 0. KHỞI TẠO EXTENSIONS & SCHEMA
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Xóa bảng cũ nếu tồn tại (theo thứ tự quan hệ khóa ngoại)
DROP TABLE IF EXISTS booking_combos CASCADE;
DROP TABLE IF EXISTS booking_seats CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS showtimes CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS cinema_theaters CASCADE;
DROP TABLE IF EXISTS cineplex_brands CASCADE;
DROP TABLE IF EXISTS cities CASCADE;
DROP TABLE IF EXISTS movies CASCADE;
DROP TABLE IF EXISTS combos CASCADE;
DROP TABLE IF EXISTS promotions CASCADE;

-- =============================================================================
-- 1. BẢNG TỈNH / THÀNH PHỐ (cities)
-- =============================================================================
CREATE TABLE cities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) NOT NULL UNIQUE,
    is_popular BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- 2. BẢNG THƯƠNG HIỆU CỤM RẠP (cineplex_brands)
-- =============================================================================
CREATE TABLE cineplex_brands (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    logo_url TEXT NOT NULL,
    tag VARCHAR(50),
    slogan TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- 3. BẢNG RẠP CHIẾU PHIM (cinema_theaters)
-- =============================================================================
CREATE TABLE cinema_theaters (
    id SERIAL PRIMARY KEY,
    brand_id INT NOT NULL REFERENCES cineplex_brands(id) ON DELETE CASCADE,
    city_id INT NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    rating NUMERIC(3, 1) DEFAULT 4.8 CHECK (rating >= 0 AND rating <= 5.0),
    review_count INT DEFAULT 0,
    lat NUMERIC(10, 7),
    lng NUMERIC(10, 7),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- 4. BẢNG PHÒNG CHIẾU (rooms)
-- =============================================================================
CREATE TABLE rooms (
    id SERIAL PRIMARY KEY,
    theater_id INT NOT NULL REFERENCES cinema_theaters(id) ON DELETE CASCADE,
    room_number VARCHAR(50) NOT NULL,
    format VARCHAR(50) DEFAULT '2D',
    total_rows INT DEFAULT 8,
    seats_per_row INT DEFAULT 12,
    total_seats INT DEFAULT 96,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_theater_room UNIQUE (theater_id, room_number)
);

-- =============================================================================
-- 5. BẢNG PHIM (movies)
-- =============================================================================
CREATE TABLE movies (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    title_en VARCHAR(255),
    banner_url TEXT NOT NULL,
    poster_url TEXT NOT NULL,
    trailer_url TEXT,
    duration INT NOT NULL, -- Thời lượng (phút)
    release_date DATE NOT NULL,
    genre VARCHAR(150) NOT NULL,
    rating_point NUMERIC(3, 1) DEFAULT 9.0 CHECK (rating_point >= 0 AND rating_point <= 10.0),
    rating_count INT DEFAULT 0,
    age_rating VARCHAR(10) NOT NULL CHECK (age_rating IN ('P', 'K', 'C13', 'C16', 'C18')),
    formats TEXT[] DEFAULT ARRAY['2D Phụ đề'],
    synopsis TEXT NOT NULL,
    director VARCHAR(150),
    cast_members TEXT,
    tags TEXT[],
    is_hot BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) NOT NULL DEFAULT 'now' CHECK (status IN ('now', 'soon')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- 6. BẢNG SUẤT CHIẾU (showtimes)
-- =============================================================================
CREATE TABLE showtimes (
    id VARCHAR(100) PRIMARY KEY, -- e.g: 'st-cgv-lm81-1-1000'
    movie_id INT NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
    theater_id INT NOT NULL REFERENCES cinema_theaters(id) ON DELETE CASCADE,
    room_id INT REFERENCES rooms(id) ON DELETE SET NULL,
    show_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    room_name VARCHAR(50) NOT NULL,
    format VARCHAR(50) NOT NULL DEFAULT '2D Phụ đề',
    base_price NUMERIC(12, 2) NOT NULL DEFAULT 85000,
    total_seats INT DEFAULT 96,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- 7. BẢNG BẮP NƯỚC / COMBO (combos)
-- =============================================================================
CREATE TABLE combos (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    price NUMERIC(12, 2) NOT NULL,
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- 8. BẢNG MÃ KHUYẾN MÃI / VOUCHER (promotions)
-- =============================================================================
CREATE TABLE promotions (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    discount_amount NUMERIC(12, 2) DEFAULT 0,
    discount_percent INT DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100),
    max_discount NUMERIC(12, 2) DEFAULT 0,
    min_order NUMERIC(12, 2) DEFAULT 0,
    badge VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- 9. BẢNG ĐƠN ĐẶT VÉ (bookings)
-- =============================================================================
CREATE TABLE bookings (
    id SERIAL PRIMARY KEY,
    booking_code VARCHAR(50) NOT NULL UNIQUE, -- e.g: 'MEO-829374'
    customer_name VARCHAR(150) NOT NULL,
    customer_phone VARCHAR(30) NOT NULL,
    customer_email VARCHAR(150),
    showtime_id VARCHAR(100) NOT NULL REFERENCES showtimes(id) ON DELETE RESTRICT,
    seat_count INT NOT NULL DEFAULT 1,
    seat_numbers TEXT[] NOT NULL,
    seat_total NUMERIC(12, 2) NOT NULL,
    combo_total NUMERIC(12, 2) DEFAULT 0,
    discount_total NUMERIC(12, 2) DEFAULT 0,
    final_total NUMERIC(12, 2) NOT NULL,
    voucher_code VARCHAR(50),
    payment_method VARCHAR(50) DEFAULT 'momo',
    payment_status VARCHAR(30) DEFAULT 'paid' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    qr_code_value TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- 10. BẢNG CHI TIẾT GHẾ CỦA ĐƠN ĐẶT (booking_seats)
-- Lưu ý: Ràng buộc UNIQUE (showtime_id, seat_code) đảm bảo chống trùng ghế ở cấp Database!
-- =============================================================================
CREATE TABLE booking_seats (
    id SERIAL PRIMARY KEY,
    booking_id INT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    showtime_id VARCHAR(100) NOT NULL REFERENCES showtimes(id) ON DELETE CASCADE,
    seat_code VARCHAR(20) NOT NULL, -- e.g: 'E7'
    seat_row VARCHAR(5) NOT NULL,   -- 'E'
    seat_col INT NOT NULL,          -- 7
    seat_type VARCHAR(30) NOT NULL DEFAULT 'standard', -- 'standard', 'vip', 'sweetbox'
    price NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_showtime_seat UNIQUE (showtime_id, seat_code)
);

-- =============================================================================
-- 11. BẢNG CHI TIẾT BẮP NƯỚC ĐƠN ĐẶT (booking_combos)
-- =============================================================================
CREATE TABLE booking_combos (
    id SERIAL PRIMARY KEY,
    booking_id INT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    combo_id VARCHAR(50) NOT NULL REFERENCES combos(id),
    combo_name VARCHAR(150) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12, 2) NOT NULL,
    total_price NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- 12. TẠO INDEXES TỐI ƯU HIỆU NĂNG TRUY VẤN
-- =============================================================================
CREATE INDEX idx_theaters_city ON cinema_theaters(city_id);
CREATE INDEX idx_theaters_brand ON cinema_theaters(brand_id);
CREATE INDEX idx_showtimes_movie_date ON showtimes(movie_id, show_date);
CREATE INDEX idx_showtimes_theater_date ON showtimes(theater_id, show_date);
CREATE INDEX idx_bookings_phone ON bookings(customer_phone);
CREATE INDEX idx_bookings_code ON bookings(booking_code);
CREATE INDEX idx_booking_seats_showtime ON booking_seats(showtime_id);
CREATE INDEX idx_movies_status ON movies(status);

-- =============================================================================
-- 13. SEED DỮ LIỆU BAN ĐẦU (INITIAL SEED DATA)
-- =============================================================================

-- 13.1 Tỉnh / Thành phố
INSERT INTO cities (id, name, code, is_popular) VALUES
(1, 'Hồ Chí Minh', 'HCM', TRUE),
(2, 'Hà Nội', 'HN', TRUE),
(3, 'Đà Nẵng', 'DN', TRUE),
(4, 'Bình Dương', 'BD', TRUE),
(5, 'Hải Phòng', 'HP', FALSE),
(6, 'Cần Thơ', 'CT', FALSE),
(7, 'Nha Trang (Khánh Hòa)', 'NT', FALSE),
(8, 'Vũng Tàu', 'VT', FALSE),
(9, 'Huế', 'HUE', FALSE),
(10, 'Đồng Nai', 'DNAI', FALSE)
ON CONFLICT (id) DO NOTHING;

-- 13.2 Thương hiệu cụm rạp
INSERT INTO cineplex_brands (id, name, code, logo_url, tag, slogan) VALUES
(1, 'CGV', 'CGV', 'https://homepage.momocdn.net/cinema/momo-amazone-s3-api-240829164527-638605467276820522.png', '79K', 'Hệ thống rạp chiếu phim lớn nhất Việt Nam'),
(2, 'Lotte Cinema', 'LOTTE', 'https://homepage.momocdn.net/blogscontents/momo-upload-api-210604170617-637584231772974269.png', '89K', 'Điện ảnh đỉnh cao, dịch vụ tận tâm'),
(3, 'Galaxy Cinema', 'GALAXY', 'https://homepage.momocdn.net/cinema/momo-upload-api-211123095138-637732578984425272.png', '69K', 'Mang cả thế giới giải trí đến bạn'),
(4, 'BHD Star', 'BHD', 'https://homepage.momocdn.net/blogscontents/momo-upload-api-210604170453-637584230934981809.png', '75K', 'Rạp chiếu phim chuẩn quốc tế'),
(5, 'Beta Cinemas', 'BETA', 'https://homepage.momocdn.net/cinema/momo-upload-api-210813104719-637644484394328824.png', '50K', 'Rạp phim giá tốt cho mọi người'),
(6, 'Cinestar', 'CINESTAR', 'https://homepage.momocdn.net/blogscontents/momo-upload-api-210604170530-637584231309495829.png', '45K', 'Trải nghiệm điện ảnh sinh viên & giới trẻ'),
(7, 'Mega GS', 'MEGA_GS', 'https://homepage.momocdn.net/blogscontents/momo-upload-api-210604170511-637584231119272266.png', '65K', 'Công nghệ âm thanh sống động'),
(8, 'Trung Tâm Chiếu Phim Quốc Gia', 'NCC', 'https://homepage.momocdn.net/cinema/ncclogo-260325100933.png', '60K', 'Địa chỉ điện ảnh tin cậy tại Thủ đô'),
(9, 'DCINE', 'DCINE', 'https://img.mservice.io/momo_app_v2/new_version/img/THAO.MAI/DcineLogo.png', '', 'Không gian điện ảnh sang trọng'),
(10, 'Starlight', 'STARLIGHT', 'https://cinema.momocdn.net/XS/starlight/image.png', '', 'Thắp sáng niềm vui điện ảnh')
ON CONFLICT (id) DO NOTHING;

-- 13.3 Danh sách Rạp chiếu tiêu biểu
INSERT INTO cinema_theaters (id, brand_id, city_id, name, address, rating, review_count, lat, lng) VALUES
(1, 1, 1, 'CGV Landmark 81', 'Tầng B1, TTTM Vincom Center Landmark 81, 720A Điện Biên Phủ, P. 22, Bình Thạnh', 4.9, 1420, 10.7951, 106.7218),
(2, 1, 1, 'CGV Sư Vạn Hạnh', 'Tầng 6, Vạn Hạnh Mall, 11 Sư Vạn Hạnh, P. 12, Quận 10', 4.8, 980, 10.7702, 106.6698),
(3, 1, 1, 'CGV Vincom Đồng Khởi', 'Tầng 3, Vincom Center Đồng Khởi, 72 Lê Thánh Tôn, Bến Nghé, Quận 1', 4.8, 1105, 10.7781, 106.7018),
(4, 2, 1, 'Lotte Cinema Nam Sài Gòn', 'Tầng 3, Lotte Mart, 469 Nguyễn Hữu Thọ, P. Tân Hưng, Quận 7', 4.7, 850, 10.7412, 106.7025),
(5, 2, 1, 'Lotte Cinema Cantavil', 'Tầng 7, Cantavil Premier, Xa Lộ Hà Nội, An Phú, TP. Thủ Đức', 4.6, 620, 10.8015, 106.7456),
(6, 3, 1, 'Galaxy Nguyễn Du', '116 Nguyễn Du, P. Bến Thành, Quận 1', 4.7, 1310, 10.7745, 106.6948),
(7, 3, 1, 'Galaxy Quang Trung', 'Lầu 3, CoopMart Quang Trung, 304A Quang Trung, P. 11, Gò Vấp', 4.5, 780, 10.8356, 106.6612),
(8, 4, 1, 'BHD Star Bitexco', 'Tầng 3 & 4, Tòa nhà Bitexco, 2 Hải Triều, Bến Nghé, Quận 1', 4.8, 1250, 10.7716, 106.7044),
(9, 5, 1, 'Beta Cinemas Quang Trung', '645 Quang Trung, P. 11, Gò Vấp', 4.5, 540, 10.8398, 106.6579),
(10, 6, 1, 'Cinestar Quốc Thanh', '271 Nguyễn Trãi, P. Nguyễn Cư Trinh, Quận 1', 4.6, 920, 10.7612, 106.6854),
(11, 1, 2, 'CGV Vincom Center Bà Triệu', 'Tầng 6, Vincom Center, 191 Bà Triệu, Lê Đại Hành, Hai Bà Trưng, Hà Nội', 4.8, 1280, 21.0115, 105.8495),
(12, 8, 2, 'Trung Tâm Chiếu Phim Quốc Gia', '87 Láng Hạ, Chợ Dừa, Ba Đình, Hà Nội', 4.9, 2100, 21.0186, 105.8152),
(13, 1, 3, 'CGV Vincom Plaza Đà Nẵng', 'Tầng 4, Vincom Plaza, Ngô Quyền, An Hải Bắc, Sơn Trà, Đà Nẵng', 4.8, 890, 16.0712, 108.2325)
ON CONFLICT (id) DO NOTHING;

-- 13.4 Phòng chiếu tiêu biểu
INSERT INTO rooms (id, theater_id, room_number, format, total_seats) VALUES
(1, 1, 'Cinema 1 (IMAX Laser)', 'IMAX 2D', 120),
(2, 1, 'Cinema 2', '2D Phụ đề', 96),
(3, 1, 'Cinema 3', '2D Lồng tiếng', 96),
(4, 2, 'Cinema 1', '2D Phụ đề', 96),
(5, 6, 'Cinema 1', '2D Phụ đề', 96),
(6, 8, 'Cinema 1', '2D Phụ đề', 96),
(7, 11, 'Cinema 1', '2D Phụ đề', 100),
(8, 12, 'Phòng chiếu 1 (NCC)', '2D Phụ đề', 140)
ON CONFLICT (id) DO NOTHING;

-- 13.5 Danh sách Phim đang chiếu & Sắp chiếu
INSERT INTO movies (id, title, title_en, banner_url, poster_url, trailer_url, duration, release_date, genre, rating_point, rating_count, age_rating, formats, synopsis, director, cast_members, tags, is_hot, status) VALUES
(1, 'Dune: Phần Hai', 'Dune: Part Two', 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1600&q=80', 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80', 'https://www.youtube.com/watch?v=Way9Dexny3w', 166, '2024-03-01', 'Khoa học viễn tưởng, Hành động, Phiêu lưu', 9.5, 4820, 'C16', ARRAY['IMAX 2D', '2D Phụ đề', '4DX'], 'Paul Atreides liên minh cùng Chani và tộc người Fremen để thực hiện màn báo thù những kẻ đã hủy diệt gia tộc của mình.', 'Denis Villeneuve', 'Timothée Chalamet, Zendaya, Rebecca Ferguson, Javier Bardem', ARRAY['Bom tấn', 'IMAX cực đỉnh', 'Hot nhất'], TRUE, 'now'),
(2, 'Mai', 'Mai', 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1600&q=80', 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=600&q=80', 'https://www.youtube.com/watch?v=yYJ4m3hF9aY', 131, '2024-02-10', 'Tâm lý, Tình cảm', 9.2, 8560, 'C18', ARRAY['2D Phụ đề'], 'Câu chuyện về cuộc đời nhiều trắc trở nhưng đong đầy cảm xúc của Mai - một cô gái làm nghề massage và mối tình định mệnh với Dương.', 'Trấn Thành', 'Phương Anh Đào, Tuấn Trần, Trấn Thành, Hồng Đào', ARRAY['Phim Việt', 'Kỷ lục phòng vé', 'Cảm động'], TRUE, 'now'),
(3, 'Kung Fu Panda 4', 'Kung Fu Panda 4', 'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?auto=format&fit=crop&w=1600&q=80', 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=600&q=80', 'https://www.youtube.com/watch?v=_inKs4eeHiI', 94, '2024-03-08', 'Hoạt hình, Hài hước, Gia đình', 8.9, 3100, 'P', ARRAY['2D Lồng tiếng', '2D Phụ đề'], 'Po bước vào hành trình mới khi được chọn làm Thủ lĩnh tinh thần của Thung lũng Bình Yên và phải huấn luyện một Chiến binh Rồng mới.', 'Mike Mitchell', 'Jack Black, Awkwafina, Viola Davis, Dustin Hoffman', ARRAY['Gia đình', 'Hài hước', 'Lồng tiếng chuẩn'], FALSE, 'now'),
(4, 'Godzilla x Kong: Đế Chế Mới', 'Godzilla x Kong: The New Empire', 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1600&q=80', 'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=600&q=80', 'https://www.youtube.com/watch?v=lV1OOlGwExg', 115, '2024-03-29', 'Hành động, Viễn tưởng', 9.0, 4200, 'C13', ARRAY['IMAX 2D', '3D Phụ đề', '2D Phụ đề'], 'Hai quái thú huyền thoại Godzilla và Kong buộc phải bắt tay để chống lại một thế lực hiểm ác khổng lồ đang ẩn mình sâu trong Trái Đất Rỗng.', 'Adam Wingard', 'Rebecca Hall, Brian Tyree Henry, Dan Stevens', ARRAY['Quái thú', 'Kỹ xảo đỉnh cao'], TRUE, 'now'),
(5, 'Lật Mặt 7: Một Điều Ước', 'Face Off 7: One Wish', 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=1600&q=80', 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=600&q=80', '', 138, '2024-04-26', 'Tâm lý, Tình cảm, Gia đình', 9.4, 5400, 'K', ARRAY['2D Phụ đề'], 'Tác phẩm xúc động của đạo diễn Lý Hải khắc họa tình mẫu tử thiêng liêng của một người mẹ già cùng 5 người con đã trưởng thành.', 'Lý Hải', 'Thanh Hiền, Trương Minh Cường, Đinh Y Nhung, Quách Ngọc Tuyên', ARRAY['Phim Việt', 'Chữa lành', 'Đáng xem'], TRUE, 'now'),
(6, 'Deadpool & Wolverine', 'Deadpool & Wolverine', 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=1600&q=80', 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80', 'https://www.youtube.com/watch?v=73_1biulkYk', 127, '2024-07-26', 'Hành động, Hài hước, Siêu anh hùng', 9.3, 3890, 'C18', ARRAY['IMAX 2D', '2D Phụ đề'], 'Wade Wilson và Wolverine bước vào chuyến phiêu lưu đa vũ trụ điên rồ bậc nhất lịch sử MCU với những màn đối đầu mãn nhãn.', 'Shawn Levy', 'Ryan Reynolds, Hugh Jackman, Emma Corrin', ARRAY['Marvel', 'Bom tấn mùa hè'], TRUE, 'soon'),
(7, 'Joker: Folie à Deux', 'Joker: Folie à Deux', 'https://images.unsplash.com/photo-1514306191717-452ec28c7814?auto=format&fit=crop&w=1600&q=80', 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=600&q=80', '', 138, '2024-10-04', 'Tội phạm, Tâm lý, Âm nhạc', 9.0, 1800, 'C18', ARRAY['2D Phụ đề', 'IMAX 2D'], 'Arthur Fleck hội ngộ cùng tri kỷ Harley Quinn trong nhà thương điên Arkham, mở ra điệu valse cuồng loạn giữa âm nhạc và bạo lực.', 'Todd Phillips', 'Joaquin Phoenix, Lady Gaga, Zazie Beetz', ARRAY['Tâm lý nặng', 'Lady Gaga'], FALSE, 'soon')
ON CONFLICT (id) DO NOTHING;

-- 13.6 Suất chiếu mẫu
INSERT INTO showtimes (id, movie_id, theater_id, room_id, show_date, start_time, end_time, room_name, format, base_price, total_seats) VALUES
('st-cgv-lm81-1-0930', 1, 1, 1, CURRENT_DATE, '09:30:00', '12:16:00', 'Cinema 1 (IMAX)', 'IMAX 2D', 150000, 120),
('st-cgv-lm81-1-1345', 1, 1, 1, CURRENT_DATE, '13:45:00', '16:31:00', 'Cinema 1 (IMAX)', 'IMAX 2D', 150000, 120),
('st-cgv-lm81-1-1715', 1, 1, 1, CURRENT_DATE, '17:15:00', '20:01:00', 'Cinema 1 (IMAX)', 'IMAX 2D', 160000, 120),
('st-cgv-lm81-1-2030', 1, 1, 1, CURRENT_DATE, '20:30:00', '23:16:00', 'Cinema 1 (IMAX)', 'IMAX 2D', 165000, 120),
('st-cgv-lm81-2-1015', 2, 1, 2, CURRENT_DATE, '10:15:00', '12:26:00', 'Cinema 2', '2D Phụ đề', 95000, 96),
('st-cgv-lm81-2-1400', 2, 1, 2, CURRENT_DATE, '14:00:00', '16:11:00', 'Cinema 2', '2D Phụ đề', 105000, 96),
('st-cgv-lm81-2-1900', 2, 1, 2, CURRENT_DATE, '19:00:00', '21:11:00', 'Cinema 2', '2D Phụ đề', 115000, 96),
('st-cgv-svh-1-1100', 1, 2, 4, CURRENT_DATE, '11:00:00', '13:46:00', 'Cinema 1', '2D Phụ đề', 90000, 96),
('st-cgv-svh-1-1530', 1, 2, 4, CURRENT_DATE, '15:30:00', '18:16:00', 'Cinema 1', '2D Phụ đề', 95000, 96),
('st-glx-nd-1-1430', 3, 6, 5, CURRENT_DATE, '14:30:00', '16:04:00', 'Cinema 1', '2D Lồng tiếng', 75000, 96),
('st-glx-nd-1-1800', 4, 6, 5, CURRENT_DATE, '18:00:00', '19:55:00', 'Cinema 1', '2D Phụ đề', 85000, 96),
('st-bhd-bitexco-1-1630', 5, 8, 6, CURRENT_DATE, '16:30:00', '18:48:00', 'Cinema 1', '2D Phụ đề', 95000, 96),
('st-ncc-hn-1-1930', 1, 12, 8, CURRENT_DATE, '19:30:00', '22:16:00', 'Phòng 1 (NCC)', '2D Phụ đề', 70000, 140)
ON CONFLICT (id) DO NOTHING;

-- 13.7 Danh mục Bắp Nước (Combos)
INSERT INTO combos (id, name, description, price, image_url, is_active) VALUES
('combo-solo', 'Combo Solo Bắp & Nước (1 Người)', '1 Bắp ngọt lớn (64oz) thơm bơ + 1 Nước ngọt có ga (32oz)', 75000, 'https://images.unsplash.com/photo-1578849278619-e73505e9610f?auto=format&fit=crop&w=400&q=80', TRUE),
('combo-couple', 'Combo Couple Hẹn Hò (2 Người)', '1 Bắp phô mai đặc biệt (85oz) + 2 Nước ngọt tùy chọn (32oz)', 119000, 'https://images.unsplash.com/photo-1585647347483-22b66260dfff?auto=format&fit=crop&w=400&q=80', TRUE),
('combo-family', 'Combo Family Siêu Tiết Kiệm', '2 Bắp lớn (Vị Caramen & Phô mai) + 3 Nước ngọt + 1 Xúc xích nướng', 169000, 'https://images.unsplash.com/photo-1505686994434-e3cc5abf1330?auto=format&fit=crop&w=400&q=80', TRUE),
('combo-snack', 'Combo Mèo Con Snack', '1 Bắp nhỏ + 1 Nước trái cây + 1 Hộp khoai tây lắc phô mai giòn rụm', 89000, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80', TRUE)
ON CONFLICT (id) DO NOTHING;

-- 13.8 Danh sách Mã ưu đãi / Voucher (Promotions)
INSERT INTO promotions (code, title, description, discount_amount, discount_percent, max_discount, min_order, badge, is_active) VALUES
('MEOBANMOI', 'Giảm 25.000đ Bạn Mới', 'Áp dụng cho khách hàng lần đầu đặt vé trên MeoCinema', 25000, 0, 25000, 100000, 'HOT 25K', TRUE),
('MEOCINEMA20', 'Giảm 20% Tối Đa 40.000đ', 'Giảm 20% cho đơn vé từ 150.000đ trên toàn quốc', 0, 20, 40000, 150000, 'GIẢM 20%', TRUE),
('THU4VUIDE', 'Thứ 4 Đồng Giá 50K Toàn Quốc', 'Xem phim thả ga vào Thứ Tư hàng tuần tại cụm rạp đối tác', 30000, 0, 30000, 80000, 'ĐỒNG GIÁ', TRUE),
('MOMOPAY', 'Ưu đãi MoMo hoàn tiền 15K', 'Thanh toán qua ví MoMo nhận ngay voucher bắp nước', 15000, 0, 15000, 120000, 'MOMO 15K', TRUE),
('STUDENT', 'Ưu Đãi Học Sinh - Sinh Viên', 'Giảm trực tiếp 20.000đ/vé cho HSSV khi xuất trình thẻ', 20000, 0, 20000, 80000, 'HSSV', TRUE)
ON CONFLICT (code) DO NOTHING;

-- 13.9 Đơn vé mẫu đã đặt (để kiểm tra tra cứu và chống trùng ghế)
INSERT INTO bookings (
    id, booking_code, customer_name, customer_phone, customer_email,
    showtime_id, seat_count, seat_numbers, seat_total, combo_total,
    discount_total, final_total, voucher_code, payment_method, payment_status,
    qr_code_value
) VALUES (
    1, 'MEO-849201', 'Nguyễn Văn An', '0909123456', 'an.nguyen@gmail.com',
    'st-cgv-lm81-1-2030', 2, ARRAY['E6', 'E7'], 330000, 119000,
    25000, 424000, 'MEOBANMOI', 'momo', 'paid',
    'https://meocinema.vn/ticket/MEO-849201'
) ON CONFLICT (id) DO NOTHING;

-- Ghế đã được đặt của đơn trên
INSERT INTO booking_seats (booking_id, showtime_id, seat_code, seat_row, seat_col, seat_type, price) VALUES
(1, 'st-cgv-lm81-1-2030', 'E6', 'E', 6, 'vip', 165000),
(1, 'st-cgv-lm81-1-2030', 'E7', 'E', 7, 'vip', 165000)
ON CONFLICT (showtime_id, seat_code) DO NOTHING;

-- Combo đã được đặt của đơn trên
INSERT INTO booking_combos (booking_id, combo_id, combo_name, quantity, unit_price, total_price) VALUES
(1, 'combo-couple', 'Combo Couple Hẹn Hò (2 Người)', 1, 119000, 119000)
ON CONFLICT DO NOTHING;

-- Cập nhật sequence của bảng bookings
SELECT setval('bookings_id_seq', (SELECT COALESCE(MAX(id), 1) FROM bookings));
SELECT setval('movies_id_seq', (SELECT COALESCE(MAX(id), 1) FROM movies));
SELECT setval('cinema_theaters_id_seq', (SELECT COALESCE(MAX(id), 1) FROM cinema_theaters));
SELECT setval('cities_id_seq', (SELECT COALESCE(MAX(id), 1) FROM cities));
SELECT setval('cineplex_brands_id_seq', (SELECT COALESCE(MAX(id), 1) FROM cineplex_brands));
SELECT setval('promotions_id_seq', (SELECT COALESCE(MAX(id), 1) FROM promotions));

-- =============================================================================
-- HOÀN TẤT KHỞI TẠO CƠ SỞ DỮ LIỆU POSTGRESQL (SD_CUOIKI)
-- =============================================================================
