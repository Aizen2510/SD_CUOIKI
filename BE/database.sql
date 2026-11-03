
-- 0. KHỞI TẠO EXTENSIONS & SCHEMA
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Xóa bảng cũ nếu tồn tại (theo thứ tự quan hệ khóa ngoại)
DROP TABLE IF EXISTS booking_combos CASCADE;
DROP TABLE IF EXISTS booking_seats CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS showtimes CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS cinema_theaters CASCADE;
DROP TABLE IF EXISTS cineplex_brands CASCADE;
DROP TABLE IF EXISTS cities CASCADE;
DROP TABLE IF EXISTS movies CASCADE;
DROP TABLE IF EXISTS combos CASCADE;
DROP TABLE IF EXISTS promotions CASCADE;

-- =============================================================================
-- BẢNG NGƯỜI DÙNG / TÀI KHOẢN (users)
-- =============================================================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    password_hash TEXT NOT NULL,
    salt VARCHAR(64) NOT NULL,
    role VARCHAR(20) DEFAULT 'customer',
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

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
    release_date TEXT NOT NULL,
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

-- Tài khoản khách hàng thử nghiệm (10 tài khoản dùng chung mật khẩu MeoTest@2026)
INSERT INTO users (email, phone, full_name, password_hash, salt, role) VALUES
('khach1@meocinema.test', '0901000001', 'Khách thử nghiệm 1', 'fa9a6d0b042af75d2566f19f1a3b869b1a7a7ee2b816843015fc311d5767efb8', 'c0e307a9ee29ea7c8fd1e9bca3976290', 'customer'),
('khach2@meocinema.test', '0901000002', 'Khách thử nghiệm 2', 'c73adc8b7310028467e692d0bffa7e637d03114ac8edd33e9705937b2e10fd12', '00b05ecd80c8d55ee9a1fdda1ea9192b', 'customer'),
('khach3@meocinema.test', '0901000003', 'Khách thử nghiệm 3', '7ae062884fce25e0b3ef9ba6d7b611da611d60b1459ec8964b724aee904bd58e', '89ead2b46dd2bd3b33254858daaf45ee', 'customer'),
('khach4@meocinema.test', '0901000004', 'Khách thử nghiệm 4', 'e0e8b2d1913dc5a7e3f65bdfda3b604897f54d530aacf9c0e065401a593cb0f8', 'f71a24f0e2454af7f1b1de06cbff6b50', 'customer'),
('khach5@meocinema.test', '0901000005', 'Khách thử nghiệm 5', 'cddebaa51a8c0d4f6f2644e7d12057e9fbecae6690bc2810268c7e6b10cfd225', 'f746556d2c70090f9e3d97c9dd8c3d08', 'customer'),
('khach6@meocinema.test', '0901000006', 'Khách thử nghiệm 6', '02a091fe2dc82546e36cc7219d7c2663bef07143b1718d9fbce1c2ab7b88c38e', '2463a39427dfe4c65362963d21260425', 'customer'),
('khach7@meocinema.test', '0901000007', 'Khách thử nghiệm 7', 'ff3163590eb6f11fec53261ee214dab2a15c3b1aeab6ec95b2abeae22a9704d3', '1afce2e2c3af4c7951123acde89ea618', 'customer'),
('khach8@meocinema.test', '0901000008', 'Khách thử nghiệm 8', '71395bae1a454b888f4d34de80245ad9ecec58b0a2a50f2811ad4eb2f279593b', 'c930673aad3c5c8f8866a6f129beba68', 'customer'),
('khach9@meocinema.test', '0901000009', 'Khách thử nghiệm 9', '70dd860962b3eb4a516d306437035c9261d9c3e05939e33a82404715e3c22f32', '8b40cf777c8d6aba8923ebca9fe4a09e', 'customer'),
('khach10@meocinema.test', '0901000010', 'Khách thử nghiệm 10', '14cc18f35bf542d433132532877a1fcdaa604f25a5bdb472ff1de1cab8e23570', 'd0bea1958fdd0bfaa35701be5221b90a', 'customer')
ON CONFLICT (email) DO NOTHING;

-- 13.5 Danh sách phim đồng bộ với FE (poster MoMo; trailer chưa xác minh để trống)
INSERT INTO movies (id, title, title_en, banner_url, poster_url, trailer_url, duration, release_date, genre, rating_point, rating_count, age_rating, formats, synopsis, director, cast_members, tags, is_hot, status) VALUES
(25051, 'Lên Hương', 'A ''Good'' Best Luck', 'https://cinema.momocdn.net/img/35672561412059349-d0485845080ee150b81f.jpg?size=M', 'https://cinema.momocdn.net/convert-webp/img/169975628854232523-lhfinal.png?size=SM', 'https://www.youtube.com/embed/ZImBtmy3XrA', 120, '2026-09-14', 'Hài, Gay Cấn', 9.3, 4647, 'C16', ARRAY['2D Phụ đề', '2D Lồng tiếng'], 'Một bà chủ của trại hòm ế ẩm và một thanh niên cần tiền trang trải cuộc sống đã vô tình mắc vào một “giao kèo định mệnh". Một người cố giữ nghề, một người cố cứu mạng người mẹ đang bệnh nặng, mở ra bí mật về món nợ đã chôn vùi suốt nhiều năm.', 'Đạo diễn hàng đầu Việt Nam', 'Dàn diễn viên điện ảnh nổi tiếng', ARRAY['Tuyệt vời', 'Cảm động', 'Khóc trôi rạp', 'Đáng xem'], TRUE, 'now'),
(25074, 'Út Lan 2', 'Ut Lan 2', 'https://image-fworker.momocdn.net/momo-external/9ec3a8ed7c3f49896fb1d8350efb601c9d7179e727e6716ce84c6a78a68a0008?size=M', 'https://cinema.momocdn.net/convert-webp/img/597581002775594-utlan2.jpg?size=SM', 'https://www.youtube.com/embed/2xpkMDMDksE', 107, '2026-09-21', 'Kinh Dị', 8.3, 2259, 'C18', ARRAY['2D Phụ đề', 'IMAX 2D'], 'Từ lúc một con rắn hai đầu xuất hiện, ngôi làng ven sông liên tiếp xảy ra những cái chết bí ẩn. Khi những bí mật bị lãng quên dần trồi lên mặt nước, người dân nhận ra có những lời nguyền chưa bao giờ thực sự biến mất.', 'Đạo diễn hàng đầu Việt Nam', 'Dàn diễn viên điện ảnh nổi tiếng', ARRAY['Tuyệt vời', 'Hài lòng', 'Giải trí', 'Khóc trôi rạp'], TRUE, 'now'),
(25134, 'Avengers: Hồi Kết - Phiên Bản Đặc Biệt (Chiếu lại)', 'Avengers: Endgame Encore', 'https://image-fworker.momocdn.net/momo-external/2f5c6574f64b9755792b09391e268d3c6f427d90980156d4c82658f47e588f55?size=M', 'https://image-fworker.momocdn.net/momo-external/5ae579829a348a0fa937aa4c198e125efa985ce1c5ff6787e71de813ed451e52?size=M', 'https://www.youtube.com/embed/XsDQf4EsZIs', 180, '2026-09-25', 'Khoa Học Viễn Tưởng, Phiêu Lưu, Hành Động', 10.0, 40, 'C13', ARRAY['2D Phụ đề', '2D Lồng tiếng'], 'Phần kết hoành tráng của Infinity Saga sẽ trở lại rạp chiếu với Avengers: Hồi Kết - Phiên Bản Đặc Biệt vào ngày 25/09/2026. Sau những sự kiện thảm khốc khiến một nửa dân số thế giới biến mất, những người hùng còn lại phải vật lộn để tiếp tục cuộc sống. Cuối cùng, họ buộc phải hợp sức để khôi phục trật tự và sự cân bằng cho vũ trụ, đồng thời đưa những người thân yêu trở về trong cuộc đối đầu đầy kịch tính với Thanos.', 'Đạo diễn hàng đầu Việt Nam', 'Dàn diễn viên điện ảnh nổi tiếng', ARRAY['Hài hước', 'Cảm động', 'Đáng xem', 'Ý nghĩa'], TRUE, 'now'),
(25086, 'Bát Tiên! Truy Tìm Lưu Ly Đăng', 'All Wishes Come True', 'https://image-fworker.momocdn.net/momo-external/0a329bb9920415b74c0ab04321ef91bb16d2a7a552187d893a37a2663842922f?size=M', 'https://cinema.momocdn.net/convert-webp/img/66354116138203447-batien.png?size=SM', 'https://www.youtube.com/embed/SG0X_2BuhM4', 143, '2026-09-11', 'Hài, Hoạt Hình, Giả Tượng, Phiêu Lưu', 9.8, 447, 'C13', ARRAY['2D Phụ đề', 'IMAX 2D'], 'Tám phàm nhân với tám giấc mộng đổi đời đã thực hiện một phi vụ liều lĩnh: đột nhập chốn Bồng Lai để đánh cắp bảo vật. Những tưởng trộm được bảo vật của Tam Tinh là có thể giúp họ một bước đổi vận, nhưng cả nhóm lại vô tình bị cuốn vào âm mưu đen tối chốn Thiên Đình. Khi bí mật dần hé lộ và kẻ thù thực sự xuất hiện, tám con người "chẳng có thần thông cũng không mang pháp lực" buộc phải đối đầu với vị thần tiên đầy quyền năng. Từ những kẻ vô danh chỉ muốn thay đổi số phận, họ bất đắc dĩ trở thành những người nắm giữ vận mệnh Tam Giới. Hành trình hài hước về những con người bé nhỏ dám làm nên chuyện lớn đã đưa Bát Tiên! Truy Tìm Lưu Ly Đăng trở thành phim hoạt hình Trung Quốc có doanh thu cao nhất năm 2026 và lọt top 4 phim hoạt hình có doanh thu phòng vé cao nhất mọi thời đại. ', 'Đạo diễn hàng đầu Việt Nam', 'Dàn diễn viên điện ảnh nổi tiếng', ARRAY['Tuyệt vời', 'Hài lòng', 'Cảm động', 'Hài hước'], TRUE, 'now'),
(25090, 'Bóng Ma Nhà Hát', 'Bóng Ma Nhà Hát', 'https://cinema.momocdn.net/img/39484159312365961-bmnh.jpg?size=M', 'https://image-fworker.momocdn.net/momo-external/df53e189c578c86d986c88ac565d031d37d753f3f5dff4fe7bb86cbbd954b7b0?size=M', 'https://www.youtube.com/embed/JVIvl_ux298', 97, '2026-09-18', 'Hài, Kinh Dị', 8.5, 431, 'C16', ARRAY['2D Phụ đề', '2D Lồng tiếng'], 'Tuấn, một chuyên viên bất động sản đầy tham vọng, được giao nhiệm vụ vực dậy một nhà hát cũ trong vòng một tháng để giữ vững sự nghiệp. Tại đây, anh phát hiện nơi này bị ám bởi Nhã – một nữ diễn viên chết oan chưa thể siêu thoát. Nhờ tài marketing, Tuấn và người cộng sự đã giúp nhà hát nhanh chóng cháy vé, nhưng sự xuất hiện của Phong - tình cũ của Nhã khiến mọi chuyện đảo lộn. Tưởng như mất tất cả, nhưng Tuấn đã cùng tất cả mọi người trong nhà hát tạo nên một thương vụ thế kỷ giữa người và ma và cứu lấy Nhà Hát Vàng Son.', 'Đạo diễn hàng đầu Việt Nam', 'Dàn diễn viên điện ảnh nổi tiếng', ARRAY['Tuyệt vời', 'Hài lòng', 'Cảm động', 'Hài hước'], FALSE, 'now'),
(24991, 'Trại Buôn Người', 'Trại Buôn Người', 'https://cinema.momocdn.net/img/74805855983673840-tbn1.jpg?size=M', 'https://cinema.momocdn.net/convert-webp/img/867383626301392-tbnpo.jpg?size=SM', 'https://www.youtube.com/embed/nlFar2vq4Yo', 135, '2026-09-25', 'Hành Động, Gay Cấn', 9.0, 1500, 'C18', ARRAY['2D Phụ đề', 'IMAX 2D'], 'Vì cứu em gái sa bẫy buôn người ở biên giới miền Tây, Ny (Steven Nguyễn) cùng bạn thân bị bắt làm nô dịch trong sào huyệt lừa đảo tàn bạo. Tại đây, họ cùng các trinh sát nằm vùng và các nạn nhân hứng chịu bi kịch thể xác âm thầm lập kế hoạch trốn thoát.
', 'Đạo diễn hàng đầu Việt Nam', 'Dàn diễn viên điện ảnh nổi tiếng', ARRAY['Hài hước', 'Cảm động', 'Đáng xem', 'Ý nghĩa'], FALSE, 'now'),
(25135, 'Vùng Đất Quỷ Dữ', 'Resident Evil', 'https://image-fworker.momocdn.net/momo-external/e52642e96de77bc98f0f68f98fcde417fee2abefb4d2f604776488a6aa9ac1d6?size=M', 'https://cinema.momocdn.net/convert-webp/img/601095563808280-470x700-residentevil_1.jpg?size=SM', 'https://www.youtube.com/embed/mNd1gb19A-c', 94, '2026-09-18', 'Kinh Dị, Phiêu Lưu, Gay Cấn', 8.0, 548, 'C18', ARRAY['2D Phụ đề', '2D Lồng tiếng'], 'Một phiên bản Resident Evil mới trở lại đầy kịch tính và kinh hoàng từ bộ óc quái kiệt của đạo diễn Zach Cregger đứng sau “Weapons” & “Barbarian”. Với cốt truyện hoàn toàn mới, phim xoay quanh Bryan (Austin Abrams), một nhân viên vận chuyển vật tư y tế vô tình bị cuốn vào cuộc chạy đua sinh tồn nghẹt thở và dồn dập trong một đêm định mệnh. Liên tiếp chuyện kinh hoàng bất ngờ đẩy anh vào giữa vòng xoáy hỗn loạn.', 'Đạo diễn hàng đầu Việt Nam', 'Dàn diễn viên điện ảnh nổi tiếng', ARRAY['Tuyệt vời', 'Hài lòng', 'Hài hước', 'Giải trí'], FALSE, 'now'),
(25101, 'Yêu Nhân Thần Thám: Kỳ Án Trường An', 'Demon Agent', 'https://image-fworker.momocdn.net/momo-external/7444124e2e7a59aef713d065758f63f99be6678c57150f106ec043381f895bcd?size=M', 'https://image-fworker.momocdn.net/momo-external/9be95ba03ac39d2f2b1fe09f9f44da87ad7feeb75cc97e2a729393f50d03754d?size=M', 'https://www.youtube.com/embed/ZHDhTOO7i-s', 116, '2026-09-18', 'Hài, Hoạt Hình, Bí Ẩn', 9.9, 131, 'K', ARRAY['2D Phụ đề', 'IMAX 2D'], 'Giữa Trường An tráng lệ và kỳ ảo dưới triều Đường, nơi những cỗ máy cơ khí tinh xảo hòa quyện cùng mái ngói cong vút, con người và yêu quái cùng chung sống. Địch Thiếu, thiếu niên thiên tài luôn mơ ước trở thành “Đại Thám Tử Số Một Trường An”, sở hữu khả năng suy luận sắc bén cùng tài ăn nói hơn người. Đồng hành cùng cậu là A Sa, tân binh yêu sói của đội tuần tra, giỏi võ nhưng mang trong mình trái tim lương thiện. Một vụ án mạng bí ẩn bất ngờ khiến đôi oan gia này phải hợp tác. Vừa đấu khẩu, vừa phối hợp phá án, cả hai dấn thân vào hành trình điều tra đầy bất ngờ và hiểm nguy. Khi mọi manh mối đều dẫn về trung tâm Trường An, liệu họ có thể bảo vệ sự bình yên của thành? Và đằng sau vẻ phồn hoa của Trường An đang ẩn giấu bí mật kinh thiên động địa nào?', 'Đạo diễn hàng đầu Việt Nam', 'Dàn diễn viên điện ảnh nổi tiếng', ARRAY['Hài hước', 'Cười banh rạp', 'Cảm động', 'Siêu phẩm'], FALSE, 'now'),
(25097, 'Mãi Nợ Một Lời Tạm Biệt', 'Mãi Nợ Một Lời Tạm Biệt', 'https://image-fworker.momocdn.net/momo-external/3a96ec3d52278215031f5a1400e1c03a21270e5f4960bee02930cb3d68fb8b96?size=M', 'https://cinema.momocdn.net/convert-webp/img/169449281826614607-m_i_n_m_t_l_i_t_m_bi_t_-_d_ki_n_kh_i_chi_u_11.09.2026_-_kt_chu_n.jpg?size=SM', 'https://www.youtube.com/embed/OYA30XqHg94', 120, '2026-09-11', 'Phiêu Lưu, Chính Kịch', 7.9, 246, 'K', ARRAY['2D Phụ đề', '2D Lồng tiếng'], 'Những khu chợ, xóm nhỏ và nhịp sống bình dị của Việt Nam những năm 1970 hiện lên qua tuổi thơ của Cu Đen (Uy Nhân) bên bà Nội (Kiều Chinh), tạo nên những thước phim đầu tiên vừa gần gũi vừa giàu chất điện ảnh.  Thế nhưng, những ngày tháng bình yên nhanh chóng bị cắt ngang bởi biến động những năm 1970. Khoảnh khắc hai bà cháu phải chia xa trở thành một mảnh ký ức theo Cu Đen trên hành trình trưởng thành, mở ra câu chuyện về tình thân, nguồn cội và những điều chưa thể nói lời tạm biệt.', 'Đạo diễn hàng đầu Việt Nam', 'Dàn diễn viên điện ảnh nổi tiếng', ARRAY['Ý nghĩa', 'Đồng cảm', 'Đáng suy ngẫm', 'Tuyệt vời'], FALSE, 'now'),
(25102, 'Bùa Yêu: Bí Mật Gia Tộc', 'Practical Magic 2', 'https://image-fworker.momocdn.net/momo-external/4e8245d7cb1f3512e546aa3c97658c48468ae22955e091dfc3ee0ea24c16b6d9?size=M', 'https://image-fworker.momocdn.net/momo-external/6d3b03cebe370d99172b062745a63ac248b6f575c2d9c468b96127156172b334?size=M', 'https://www.youtube.com/embed/Ho10_4IX1jE', 130, '2026-09-11', 'Hài, Giả Tượng, Lãng Mạn', 7.6, 15, 'C13', ARRAY['2D Phụ đề', 'IMAX 2D'], 'Bùa Yêu: Bí Mật Gia Tộc đưa khán giả đến thế giới phép thuật đầy mê hoặc, nơi những bí ẩn dưới ánh trăng và sức mạnh ma thuật gia truyền vẫn luôn hiện hữu. Lần này, hai chị em nhà Owens phải cùng nhau đối mặt với một lời nguyền đen tối đang đe dọa chia cắt gia đình mãi mãi.', 'Đạo diễn hàng đầu Việt Nam', 'Dàn diễn viên điện ảnh nổi tiếng', ARRAY['Tuyệt vời', 'Hài lòng', 'Hài hước', 'Giải trí'], FALSE, 'now'),
(25087, 'SOOBIN LIVE CONCERT MOVIE: ALL-ROUNDER', 'SOOBIN LIVE CONCERT MOVIE: ALL-ROUNDER', 'https://cinema.momocdn.net/img/66351554835506935-640X310.png?size=M', 'https://cinema.momocdn.net/convert-webp/img/66351503340702034-soobinconcert.jpg?size=SM', NULL, 109, '2026-09-10', 'Hành động, Hài', 9.8, 105, 'C13', ARRAY['2D Phụ đề', '2D Lồng tiếng'], 'SOOBIN LIVE CONCERT MOVIE: ALL-ROUNDER là bộ phim âm nhạc đầu tiên của SOOBIN mang đến trải nghiệm điện ảnh chuẩn âm thanh vòm 7.1, tái hiện những khoảnh khắc thăng hoa từ chuỗi concert ALL-ROUNDER, cùng các màn trình diễn quy mô và những thước phim hậu trường chưa từng công bố. Bộ phim được ra mắt vào dịp sinh nhật SOOBIN, như một cột mốc đặc biệt trong hành trình nghệ thuật của anh. Đằng sau ánh đèn sân khấu là câu chuyện cham đến giấc mơ với sự nỗ lực, vượt qua giới hạn và chinh phục những chuẩn mực mới. Với thông điệp “THE ALL-ROUNDER IS ALL AROUND YOU”, SOOBIN gửi lời tri ân đến khán giả, đặc biệt là KINGDOM – những người luôn đồng hành và tiếp thêm động lực trên hành trình ấy. Bởi mỗi người đều có thể là một All-Rounder, ở bất cứ nơi đâu.', 'Đạo diễn hàng đầu Việt Nam', 'Dàn diễn viên điện ảnh nổi tiếng', ARRAY['Tuyệt vời', 'Hài lòng', 'Cảm động', 'Hài hước'], FALSE, 'now'),
(25083, 'Ma Tù', 'Ghost in the Cell', 'https://image-fworker.momocdn.net/momo-external/0f42867ed5a3f8c9c6159c5f9b577d8352b7d641c887d27ec5383e8efb069ce4?size=M', 'https://image-fworker.momocdn.net/momo-external/2338a62d9f4895f30e40500c7ecd1e7f514d399dbfc6bc8e4de7d9473a4209d6?size=M', 'https://www.youtube.com/embed/otL78_pk_A0', 106, '2026-09-04', 'Hài, Kinh Dị, Gây Cấn', 9.0, 525, 'C18', ARRAY['2D Phụ đề', 'IMAX 2D'], 'Một tù nhân bí ẩn xuất hiện trong một nhà tù khét tiếng bạo lực nhất Indonesia, mang theo một thực thể siêu nhiên chỉ săn lùng những kẻ có năng lượng tiêu cực. Để sống sót, các tù nhân buộc phải cùng nhau làm việc thiện nhằm xóa bỏ bóng tối trong tâm hồn. Hoặc chết từng người một.', 'Đạo diễn hàng đầu Việt Nam', 'Dàn diễn viên điện ảnh nổi tiếng', ARRAY['Hài lòng', 'Hài hước', 'Cười banh rạp', 'Đáng xem'], FALSE, 'now'),
(25138, 'Tế Nhi Cải Mệnh', 'The Tao Exorcist', 'https://cinema.momocdn.net/img/764569468113065-tn3.jpg?size=M', 'https://cinema.momocdn.net/convert-webp/img/764471700398079-tncm.jpg?size=SM', 'https://www.youtube.com/embed/21kgF9MuxtE', 108, '2026-09-18', 'Kinh Dị', 7.3, 70, 'C18', ARRAY['2D Phụ đề', '2D Lồng tiếng'], 'Vì nợ cờ bạc chồng chất, Chấn Khải cùng vợ Nam Tương và gia đình buộc phải chuyển nhà để trốn chủ nợ. Trong bước đường cùng, anh tìm đến tà thuật cấm kỵ, thậm chí hiến tế vận mệnh của con trai để đổi lấy tiền bạc. Tiền vừa đến tay, tai họa cũng ập đến khi cả gia đình liên tiếp gặp những hiện tượng kinh hoàng. Một chàng trai có năng lực tâm linh phát hiện oán khí từ nghi lễ hiến tế, hé lộ bí mật đáng sợ phía sau. Nghi thức máu đã bắt đầu và tai kiếp giờ đây không thể tránh khỏi.', 'Đạo diễn hàng đầu Việt Nam', 'Dàn diễn viên điện ảnh nổi tiếng', ARRAY['Tuyệt vời', 'Siêu phẩm', 'Đáng xem'], FALSE, 'now'),
(25100, 'Cổ Thuật Hắc Ngải', 'Kong Tao', 'https://cinema.momocdn.net/convert-webp/img/170060743393801020-poster.png?size=SM', 'https://cinema.momocdn.net/convert-webp/img/170060743393801020-poster.png?size=SM', NULL, 86, '2026-09-11', 'Phiêu Lưu, Gây Cấn', 5.7, 164, 'C16', ARRAY['2D Phụ đề', 'IMAX 2D'], 'CỔ THUẬT HẮC NGẢI (Kong Tao – 蠱降) là bộ phim kinh dị hợp tác giữa Thái Lan và Malaysia, lấy cảm hứng từ những nghi thức trù ếm, bùa ngải và tà thuật hắc ám bí ẩn bậc nhất châu Á. Phim theo chân một nhóm YouTuber chuyên khám phá các hiện tượng siêu nhiên tại Thái Lan. Thế nhưng, một chuyến ghi hình tưởng chừng vô hại lại vô tình đánh thức lời nguyền chết chóc, buộc cả nhóm phải chạy đua với thời gian để tìm đến một pháp sư trước khi trở thành những nạn nhân tiếp theo. Đặc biệt, bộ phim đánh dấu màn lột xác của Kao Supassara – "tình đầu Thái Lan" – trong một vai diễn hoàn toàn mới, kết hợp cùng Philip Keung, hứa hẹn mang đến một siêu phẩm kinh dị nặng đô, đậm màu sắc tà thuật và văn hóa bùa ngải Đông Nam Á.', 'Đạo diễn hàng đầu Việt Nam', 'Dàn diễn viên điện ảnh nổi tiếng', ARRAY['Tuyệt vời', 'Đáng xem'], FALSE, 'now'),
(25085, 'HOPE: Vùng Tử Địa', 'HOPE', 'https://image-fworker.momocdn.net/momo-external/5f548dc37fcf9480294f4be4b6da65ec0e4c10262ba0ac4e394b682aff41edc5?size=M', 'https://image-fworker.momocdn.net/momo-external/4c452ba927ec056b1674b6a6faf265f64fc0d52105dabc21d109f09ce1480cf0?size=M', 'https://www.youtube.com/embed/N45eWotaGxU', 157, '2026-09-04', 'Khoa Học Viễn Tưởng, Bí Ẩn, Hành Động', 7.2, 936, 'C16', ARRAY['2D Phụ đề', '2D Lồng tiếng'], 'Tại Hope Harbor, một ngôi làng hẻo lánh nằm gần khu vực phi quân sự, cảnh sát trưởng Bum-seok đã nhận được tin báo khẩn cấp từ người dân địa phương về sự xuất hiện của một con hổ. Khi cả ngôi làng chìm trong hoảng loạn, Bum-seok ngỡ ngàng khi phát hiện một sự thật nằm ngoài sức tưởng tượng của con người.', 'Đạo diễn hàng đầu Việt Nam', 'Dàn diễn viên điện ảnh nổi tiếng', ARRAY['Gay cấn', 'Đáng xem', 'Hài hước', 'Cười banh rạp'], FALSE, 'now'),
(25137, 'Godzilla Trừ Không', 'Godzilla Minus Zero', 'https://image-fworker.momocdn.net/momo-external/5e1f88db3e81d99233a0df80c1089c51ccf2eed31aa9347249f2885f1b314ca8?size=M', 'https://image-fworker.momocdn.net/momo-external/e48c72c7ec00add718c18636a5f3962bfb03db852d627f346ab04e36f77397d3?size=M', 'https://www.youtube.com/embed/pWJjYoqVSjQ', 135, '2026-11-06', 'Hành động, Phiêu lưu', 9.5, 890, 'C13', ARRAY['2D Phụ đề'], 'Siêu phẩm điện ảnh được mong đợi nhất sắp đổ bộ các rạp chiếu phim trên toàn quốc.', NULL, NULL, ARRAY['Bom tấn', 'Sắp chiếu', 'Được mong chờ'], FALSE, 'soon'),
(24641, 'Dune: Hành Tinh Cát - Phần Ba', 'Dune: Part Three', 'https://image-fworker.momocdn.net/momo-external/612a762b3cb77f060e38f1ae9c06be4b06e90a13ceffd6d599174dd64387bf91?size=M', 'https://image-fworker.momocdn.net/momo-external/612a762b3cb77f060e38f1ae9c06be4b06e90a13ceffd6d599174dd64387bf91?size=M', 'https://www.youtube.com/embed/iEpdGDM6x48', 120, '2026-12-16', 'Hành động, Phiêu lưu', 9.5, 890, 'C13', ARRAY['2D Phụ đề'], 'Siêu phẩm điện ảnh được mong đợi nhất sắp đổ bộ các rạp chiếu phim trên toàn quốc.', NULL, NULL, ARRAY['Bom tấn', 'Sắp chiếu', 'Được mong chờ'], FALSE, 'soon'),
(25092, 'Người Mẹ Xấu', 'Người Mẹ Xấu', 'https://cinema.momocdn.net/convert-webp/img/169450140804337896-nguoi-me-xau-500_1781239561463.png?size=SM', 'https://cinema.momocdn.net/convert-webp/img/169450140804337896-nguoi-me-xau-500_1781239561463.png?size=SM', NULL, 120, 'Tháng 10/2026', 'Hành động, Phiêu lưu', 9.5, 890, 'C13', ARRAY['2D Phụ đề'], 'Siêu phẩm điện ảnh được mong đợi nhất sắp đổ bộ các rạp chiếu phim trên toàn quốc.', NULL, NULL, ARRAY['Bom tấn', 'Sắp chiếu', 'Được mong chờ'], FALSE, 'soon'),
(25093, 'Ngày Con Còn Mẹ', 'Ngày Con Còn Mẹ', 'https://cinema.momocdn.net/convert-webp/img/169449993208190656-6a853d31e3f95905793733.png?size=SM', 'https://cinema.momocdn.net/convert-webp/img/169449993208190656-6a853d31e3f95905793733.png?size=SM', 'https://www.youtube.com/embed/kWEdrqJNSoY', 120, '2026-10-18', 'Hành động, Phiêu lưu', 9.5, 890, 'C13', ARRAY['2D Phụ đề'], 'Siêu phẩm điện ảnh được mong đợi nhất sắp đổ bộ các rạp chiếu phim trên toàn quốc.', NULL, NULL, ARRAY['Bom tấn', 'Sắp chiếu', 'Được mong chờ'], FALSE, 'now'),
(25094, 'Chuyến Đi Nhớ Đời', 'Chuyến Đi Nhớ Đời', 'https://cinema.momocdn.net/convert-webp/img/169449900843357660-6a8e65fcc56f4621082505.png?size=SM', 'https://cinema.momocdn.net/convert-webp/img/169449900843357660-6a8e65fcc56f4621082505.png?size=SM', NULL, 120, 'Tháng 10/2026', 'Hành động, Phiêu lưu', 9.5, 890, 'C13', ARRAY['2D Phụ đề'], 'Siêu phẩm điện ảnh được mong đợi nhất sắp đổ bộ các rạp chiếu phim trên toàn quốc.', NULL, NULL, ARRAY['Bom tấn', 'Sắp chiếu', 'Được mong chờ'], FALSE, 'soon'),
(25095, 'Trấn Yểm', 'Trấn Yểm', 'https://cinema.momocdn.net/convert-webp/img/169449770605007316-tra_n-ye_m-poster-co_ng-bo_-du_-a_n.jpg?size=SM', 'https://cinema.momocdn.net/convert-webp/img/169449770605007316-tra_n-ye_m-poster-co_ng-bo_-du_-a_n.jpg?size=SM', NULL, 120, 'Tháng 10/2026', 'Hành động, Phiêu lưu', 9.5, 890, 'C13', ARRAY['2D Phụ đề'], 'Siêu phẩm điện ảnh được mong đợi nhất sắp đổ bộ các rạp chiếu phim trên toàn quốc.', NULL, NULL, ARRAY['Bom tấn', 'Sắp chiếu', 'Được mong chờ'], FALSE, 'soon'),
(25096, 'Mẹ Mìn', 'Mẹ Mìn', 'https://image-fworker.momocdn.net/momo-external/3338305f3dab112b763ac3712e6c0b11279c3ac674e4a0bbdcfacb3952481ee9?size=M', 'https://cinema.momocdn.net/convert-webp/img/1189440217284670-memin.jpg?size=SM', NULL, 125, 'Tháng 10/2026', 'Hành động, Phiêu lưu', 9.5, 890, 'C13', ARRAY['2D Phụ đề'], 'Siêu phẩm điện ảnh được mong đợi nhất sắp đổ bộ các rạp chiếu phim trên toàn quốc.', NULL, NULL, ARRAY['Bom tấn', 'Sắp chiếu', 'Được mong chờ'], FALSE, 'soon'),
(24845, 'Thám Tử Kiên 2: Lời Nguyền Hoàng Kim', 'Thám Tử Kiên 2: Lời Nguyền Hoàng Kim', 'https://cinema.momocdn.net/convert-webp/img/154903476143772777-PosterTHAMTUKIEN2compressed.jpg?size=M', 'https://cinema.momocdn.net/convert-webp/img/154903476143772777-PosterTHAMTUKIEN2compressed.jpg?size=M', NULL, 132, 'Tháng 10/2026', 'Hành động, Phiêu lưu', 9.5, 890, 'C13', ARRAY['2D Phụ đề'], 'Siêu phẩm điện ảnh được mong đợi nhất sắp đổ bộ các rạp chiếu phim trên toàn quốc.', NULL, NULL, ARRAY['Bom tấn', 'Sắp chiếu', 'Được mong chờ'], FALSE, 'soon')
ON CONFLICT (id) DO NOTHING;

-- 13.6 Suất chiếu mẫu
INSERT INTO showtimes (id, movie_id, theater_id, room_id, show_date, start_time, end_time, room_name, format, base_price, total_seats) VALUES
('st-cgv-lm81-1-0930', 25051, 1, 1, CURRENT_DATE, '09:30:00', '12:16:00', 'Cinema 1 (IMAX)', 'IMAX 2D', 150000, 120),
('st-cgv-lm81-1-1345', 25051, 1, 1, CURRENT_DATE, '13:45:00', '16:31:00', 'Cinema 1 (IMAX)', 'IMAX 2D', 150000, 120),
('st-cgv-lm81-1-1715', 25051, 1, 1, CURRENT_DATE, '17:15:00', '20:01:00', 'Cinema 1 (IMAX)', 'IMAX 2D', 160000, 120),
('st-cgv-lm81-1-2030', 25051, 1, 1, CURRENT_DATE, '20:30:00', '23:16:00', 'Cinema 1 (IMAX)', 'IMAX 2D', 165000, 120),
('st-cgv-lm81-2-1015', 25074, 1, 2, CURRENT_DATE, '10:15:00', '12:26:00', 'Cinema 2', '2D Phụ đề', 95000, 96),
('st-cgv-lm81-2-1400', 25074, 1, 2, CURRENT_DATE, '14:00:00', '16:11:00', 'Cinema 2', '2D Phụ đề', 105000, 96),
('st-cgv-lm81-2-1900', 25074, 1, 2, CURRENT_DATE, '19:00:00', '21:11:00', 'Cinema 2', '2D Phụ đề', 115000, 96),
('st-cgv-svh-1-1100', 25051, 2, 4, CURRENT_DATE, '11:00:00', '13:46:00', 'Cinema 1', '2D Phụ đề', 90000, 96),
('st-cgv-svh-1-1530', 25051, 2, 4, CURRENT_DATE, '15:30:00', '18:16:00', 'Cinema 1', '2D Phụ đề', 95000, 96),
('st-glx-nd-1-1430', 25134, 6, 5, CURRENT_DATE, '14:30:00', '16:04:00', 'Cinema 1', '2D Lồng tiếng', 75000, 96),
('st-glx-nd-1-1800', 25086, 6, 5, CURRENT_DATE, '18:00:00', '19:55:00', 'Cinema 1', '2D Phụ đề', 85000, 96),
('st-bhd-bitexco-1-1630', 25090, 8, 6, CURRENT_DATE, '16:30:00', '18:48:00', 'Cinema 1', '2D Phụ đề', 95000, 96),
('st-ncc-hn-1-1930', 25051, 12, 8, CURRENT_DATE, '19:30:00', '22:16:00', 'Phòng 1 (NCC)', '2D Phụ đề', 70000, 140)
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

-- Không tạo booking mẫu: database reset bắt đầu với toàn bộ ghế trống.

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
