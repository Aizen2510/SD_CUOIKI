import os
import re
import datetime
from typing import Dict, Any, List, Optional
import psycopg2
from psycopg2.extras import RealDictCursor
from app.config import DATABASE_URL

_pg_pool = None
_is_pg_connected = False

def get_pg_connection():
    global _is_pg_connected
    try:
        conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
        _is_pg_connected = True
        return conn
    except Exception as e:
        _is_pg_connected = False
        return None

def is_postgres_available() -> bool:
    global _is_pg_connected
    try:
        conn = psycopg2.connect(DATABASE_URL, connect_timeout=2)
        conn.close()
        _is_pg_connected = True
        return True
    except Exception:
        _is_pg_connected = False
        return False

# =============================================================================
# IN-MEMORY SEED REPOSITORY (Seamless Zero-Config Fallback)
# =============================================================================
CITIES_DATA = [
    {"id": 1, "name": "Hồ Chí Minh", "code": "HCM", "is_popular": True},
    {"id": 2, "name": "Hà Nội", "code": "HN", "is_popular": True},
    {"id": 3, "name": "Đà Nẵng", "code": "DN", "is_popular": True},
    {"id": 4, "name": "Bình Dương", "code": "BD", "is_popular": True},
    {"id": 5, "name": "Hải Phòng", "code": "HP", "is_popular": False},
    {"id": 6, "name": "Cần Thơ", "code": "CT", "is_popular": False},
    {"id": 7, "name": "Nha Trang (Khánh Hòa)", "code": "NT", "is_popular": False},
    {"id": 8, "name": "Vũng Tàu", "code": "VT", "is_popular": False},
    {"id": 9, "name": "Huế", "code": "HUE", "is_popular": False},
    {"id": 10, "name": "Đồng Nai", "code": "DNAI", "is_popular": False}
]

BRANDS_DATA = [
    {"id": 1, "name": "CGV", "code": "CGV", "logo": "https://homepage.momocdn.net/cinema/momo-amazone-s3-api-240829164527-638605467276820522.png", "tag": "79K", "slogan": "Hệ thống rạp chiếu phim lớn nhất Việt Nam"},
    {"id": 2, "name": "Lotte Cinema", "code": "LOTTE", "logo": "https://homepage.momocdn.net/blogscontents/momo-upload-api-210604170617-637584231772974269.png", "tag": "89K", "slogan": "Điện ảnh đỉnh cao, dịch vụ tận tâm"},
    {"id": 3, "name": "Galaxy Cinema", "code": "GALAXY", "logo": "https://homepage.momocdn.net/cinema/momo-upload-api-211123095138-637732578984425272.png", "tag": "69K", "slogan": "Mang cả thế giới giải trí đến bạn"},
    {"id": 4, "name": "BHD Star", "code": "BHD", "logo": "https://homepage.momocdn.net/blogscontents/momo-upload-api-210604170453-637584230934981809.png", "tag": "75K", "slogan": "Rạp chiếu phim chuẩn quốc tế"},
    {"id": 5, "name": "Beta Cinemas", "code": "BETA", "logo": "https://homepage.momocdn.net/cinema/momo-upload-api-210813104719-637644484394328824.png", "tag": "50K", "slogan": "Rạp phim giá tốt cho mọi người"},
    {"id": 6, "name": "Cinestar", "code": "CINESTAR", "logo": "https://homepage.momocdn.net/blogscontents/momo-upload-api-210604170530-637584231309495829.png", "tag": "45K", "slogan": "Trải nghiệm điện ảnh sinh viên & giới trẻ"},
    {"id": 7, "name": "Mega GS", "code": "MEGA_GS", "logo": "https://homepage.momocdn.net/blogscontents/momo-upload-api-210604170511-637584231119272266.png", "tag": "65K", "slogan": "Công nghệ âm thanh sống động"},
    {"id": 8, "name": "Trung Tâm Chiếu Phim Quốc Gia", "code": "NCC", "logo": "https://homepage.momocdn.net/cinema/ncclogo-260325100933.png", "tag": "60K", "slogan": "Địa chỉ điện ảnh tin cậy tại Thủ đô"},
    {"id": 9, "name": "DCINE", "code": "DCINE", "logo": "https://img.mservice.io/momo_app_v2/new_version/img/THAO.MAI/DcineLogo.png", "tag": "", "slogan": "Không gian điện ảnh sang trọng"},
    {"id": 10, "name": "Starlight", "code": "STARLIGHT", "logo": "https://cinema.momocdn.net/XS/starlight/image.png", "tag": "", "slogan": "Thắp sáng niềm vui điện ảnh"}
]

THEATERS_DATA = [
    {"id": 1, "brand_id": 1, "brand_code": "CGV", "name": "CGV Landmark 81", "address": "Tầng B1, TTTM Vincom Center Landmark 81, 720A Điện Biên Phủ, P. 22, Bình Thạnh", "city_id": 1, "city_name": "Hồ Chí Minh", "rating": 4.9, "review_count": 1420, "lat": 10.7951, "lng": 106.7218},
    {"id": 2, "brand_id": 1, "brand_code": "CGV", "name": "CGV Sư Vạn Hạnh", "address": "Tầng 6, Vạn Hạnh Mall, 11 Sư Vạn Hạnh, P. 12, Quận 10", "city_id": 1, "city_name": "Hồ Chí Minh", "rating": 4.8, "review_count": 980, "lat": 10.7702, "lng": 106.6698},
    {"id": 3, "brand_id": 1, "brand_code": "CGV", "name": "CGV Vincom Đồng Khởi", "address": "Tầng 3, Vincom Center Đồng Khởi, 72 Lê Thánh Tôn, Bến Nghé, Quận 1", "city_id": 1, "city_name": "Hồ Chí Minh", "rating": 4.8, "review_count": 1105, "lat": 10.7781, "lng": 106.7018},
    {"id": 4, "brand_id": 2, "brand_code": "LOTTE", "name": "Lotte Cinema Nam Sài Gòn", "address": "Tầng 3, Lotte Mart, 469 Nguyễn Hữu Thọ, P. Tân Hưng, Quận 7", "city_id": 1, "city_name": "Hồ Chí Minh", "rating": 4.7, "review_count": 850, "lat": 10.7412, "lng": 106.7025},
    {"id": 5, "brand_id": 2, "brand_code": "LOTTE", "name": "Lotte Cinema Cantavil", "address": "Tầng 7, Cantavil Premier, Xa Lộ Hà Nội, An Phú, TP. Thủ Đức", "city_id": 1, "city_name": "Hồ Chí Minh", "rating": 4.6, "review_count": 620, "lat": 10.8015, "lng": 106.7456},
    {"id": 6, "brand_id": 3, "brand_code": "GALAXY", "name": "Galaxy Nguyễn Du", "address": "116 Nguyễn Du, P. Bến Thành, Quận 1", "city_id": 1, "city_name": "Hồ Chí Minh", "rating": 4.7, "review_count": 1310, "lat": 10.7745, "lng": 106.6948},
    {"id": 7, "brand_id": 3, "brand_code": "GALAXY", "name": "Galaxy Quang Trung", "address": "Lầu 3, CoopMart Quang Trung, 304A Quang Trung, P. 11, Gò Vấp", "city_id": 1, "city_name": "Hồ Chí Minh", "rating": 4.5, "review_count": 780, "lat": 10.8356, "lng": 106.6612},
    {"id": 8, "brand_id": 4, "brand_code": "BHD", "name": "BHD Star Bitexco", "address": "Tầng 3 & 4, Tòa nhà Bitexco, 2 Hải Triều, Bến Nghé, Quận 1", "city_id": 1, "city_name": "Hồ Chí Minh", "rating": 4.8, "review_count": 1250, "lat": 10.7716, "lng": 106.7044},
    {"id": 9, "brand_id": 5, "brand_code": "BETA", "name": "Beta Cinemas Quang Trung", "address": "645 Quang Trung, P. 11, Gò Vấp", "city_id": 1, "city_name": "Hồ Chí Minh", "rating": 4.5, "review_count": 540, "lat": 10.8398, "lng": 106.6579},
    {"id": 10, "brand_id": 6, "brand_code": "CINESTAR", "name": "Cinestar Quốc Thanh", "address": "271 Nguyễn Trãi, P. Nguyễn Cư Trinh, Quận 1", "city_id": 1, "city_name": "Hồ Chí Minh", "rating": 4.6, "review_count": 920, "lat": 10.7612, "lng": 106.6854},
    {"id": 11, "brand_id": 1, "brand_code": "CGV", "name": "CGV Vincom Center Bà Triệu", "address": "Tầng 6, Vincom Center, 191 Bà Triệu, Lê Đại Hành, Hai Bà Trưng, Hà Nội", "city_id": 2, "city_name": "Hà Nội", "rating": 4.8, "review_count": 1280, "lat": 21.0115, "lng": 105.8495},
    {"id": 12, "brand_id": 8, "brand_code": "NCC", "name": "Trung Tâm Chiếu Phim Quốc Gia", "address": "87 Láng Hạ, Chợ Dừa, Ba Đình, Hà Nội", "city_id": 2, "city_name": "Hà Nội", "rating": 4.9, "review_count": 2100, "lat": 21.0186, "lng": 105.8152},
    {"id": 13, "brand_id": 1, "brand_code": "CGV", "name": "CGV Vincom Plaza Đà Nẵng", "address": "Tầng 4, Vincom Plaza, Ngô Quyền, An Hải Bắc, Sơn Trà, Đà Nẵng", "city_id": 3, "city_name": "Đà Nẵng", "rating": 4.8, "review_count": 890, "lat": 16.0712, "lng": 108.2325}
]

MOVIES_DATA = [
    {
        "id": 1,
        "title": "Dune: Phần Hai",
        "title_en": "Dune: Part Two",
        "banner_url": "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1600&q=80",
        "poster_url": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80",
        "trailer_url": "https://www.youtube.com/watch?v=Way9Dexny3w",
        "duration": 166,
        "release_date": "2024-03-01",
        "genre": "Khoa học viễn tưởng, Hành động, Phiêu lưu",
        "rating_point": 9.5,
        "rating_count": 4820,
        "age_rating": "C16",
        "formats": ["IMAX 2D", "2D Phụ đề", "4DX"],
        "synopsis": "Paul Atreides liên minh cùng Chani và tộc người Fremen để thực hiện màn báo thù những kẻ đã hủy diệt gia tộc của mình.",
        "director": "Denis Villeneuve",
        "cast_members": "Timothée Chalamet, Zendaya, Rebecca Ferguson, Javier Bardem",
        "tags": ["Bom tấn", "IMAX cực đỉnh", "Hot nhất"],
        "is_hot": True,
        "status": "now"
    },
    {
        "id": 2,
        "title": "Mai",
        "title_en": "Mai",
        "banner_url": "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1600&q=80",
        "poster_url": "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=600&q=80",
        "trailer_url": "https://www.youtube.com/watch?v=yYJ4m3hF9aY",
        "duration": 131,
        "release_date": "2024-02-10",
        "genre": "Tâm lý, Tình cảm",
        "rating_point": 9.2,
        "rating_count": 8560,
        "age_rating": "C18",
        "formats": ["2D Phụ đề"],
        "synopsis": "Câu chuyện về cuộc đời nhiều trắc trở nhưng đong đầy cảm xúc của Mai - một cô gái làm nghề massage và mối tình định mệnh với Dương.",
        "director": "Trấn Thành",
        "cast_members": "Phương Anh Đào, Tuấn Trần, Trấn Thành, Hồng Đào",
        "tags": ["Phim Việt", "Kỷ lục phòng vé", "Cảm động"],
        "is_hot": True,
        "status": "now"
    },
    {
        "id": 3,
        "title": "Kung Fu Panda 4",
        "title_en": "Kung Fu Panda 4",
        "banner_url": "https://images.unsplash.com/photo-1518791841217-8f162f1e1131?auto=format&fit=crop&w=1600&q=80",
        "poster_url": "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=600&q=80",
        "trailer_url": "https://www.youtube.com/watch?v=_inKs4eeHiI",
        "duration": 94,
        "release_date": "2024-03-08",
        "genre": "Hoạt hình, Hài hước, Gia đình",
        "rating_point": 8.9,
        "rating_count": 3100,
        "age_rating": "P",
        "formats": ["2D Lồng tiếng", "2D Phụ đề"],
        "synopsis": "Po bước vào hành trình mới khi được chọn làm Thủ lĩnh tinh thần của Thung lũng Bình Yên và phải huấn luyện một Chiến binh Rồng mới.",
        "director": "Mike Mitchell",
        "cast_members": "Jack Black, Awkwafina, Viola Davis, Dustin Hoffman",
        "tags": ["Gia đình", "Hài hước", "Lồng tiếng chuẩn"],
        "is_hot": False,
        "status": "now"
    },
    {
        "id": 4,
        "title": "Godzilla x Kong: Đế Chế Mới",
        "title_en": "Godzilla x Kong: The New Empire",
        "banner_url": "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1600&q=80",
        "poster_url": "https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=600&q=80",
        "trailer_url": "https://www.youtube.com/watch?v=lV1OOlGwExg",
        "duration": 115,
        "release_date": "2024-03-29",
        "genre": "Hành động, Viễn tưởng",
        "rating_point": 9.0,
        "rating_count": 4200,
        "age_rating": "C13",
        "formats": ["IMAX 2D", "3D Phụ đề", "2D Phụ đề"],
        "synopsis": "Hai quái thú huyền thoại Godzilla và Kong buộc phải bắt tay để chống lại một thế lực hiểm ác khổng lồ đang ẩn mình sâu trong Trái Đất Rỗng.",
        "director": "Adam Wingard",
        "cast_members": "Rebecca Hall, Brian Tyree Henry, Dan Stevens",
        "tags": ["Quái thú", "Kỹ xảo đỉnh cao"],
        "is_hot": True,
        "status": "now"
    },
    {
        "id": 5,
        "title": "Lật Mặt 7: Một Điều Ước",
        "title_en": "Face Off 7: One Wish",
        "banner_url": "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=1600&q=80",
        "poster_url": "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=600&q=80",
        "trailer_url": "",
        "duration": 138,
        "release_date": "2024-04-26",
        "genre": "Tâm lý, Tình cảm, Gia đình",
        "rating_point": 9.4,
        "rating_count": 5400,
        "age_rating": "K",
        "formats": ["2D Phụ đề"],
        "synopsis": "Tác phẩm xúc động của đạo diễn Lý Hải khắc họa tình mẫu tử thiêng liêng của một người mẹ già cùng 5 người con đã trưởng thành.",
        "director": "Lý Hải",
        "cast_members": "Thanh Hiền, Trương Minh Cường, Đinh Y Nhung, Quách Ngọc Tuyên",
        "tags": ["Phim Việt", "Chữa lành", "Đáng xem"],
        "is_hot": True,
        "status": "now"
    },
    {
        "id": 6,
        "title": "Deadpool & Wolverine",
        "title_en": "Deadpool & Wolverine",
        "banner_url": "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=1600&q=80",
        "poster_url": "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80",
        "trailer_url": "https://www.youtube.com/watch?v=73_1biulkYk",
        "duration": 127,
        "release_date": "2024-07-26",
        "genre": "Hành động, Hài hước, Siêu anh hùng",
        "rating_point": 9.3,
        "rating_count": 3890,
        "age_rating": "C18",
        "formats": ["IMAX 2D", "2D Phụ đề"],
        "synopsis": "Wade Wilson và Wolverine bước vào chuyến phiêu lưu đa vũ trụ điên rồ bậc nhất lịch sử MCU với những màn đối đầu mãn nhãn.",
        "director": "Shawn Levy",
        "cast_members": "Ryan Reynolds, Hugh Jackman, Emma Corrin",
        "tags": ["Marvel", "Bom tấn mùa hè"],
        "is_hot": True,
        "status": "soon"
    },
    {
        "id": 7,
        "title": "Joker: Folie à Deux",
        "title_en": "Joker: Folie à Deux",
        "banner_url": "https://images.unsplash.com/photo-1514306191717-452ec28c7814?auto=format&fit=crop&w=1600&q=80",
        "poster_url": "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=600&q=80",
        "trailer_url": "",
        "duration": 138,
        "release_date": "2024-10-04",
        "genre": "Tội phạm, Tâm lý, Âm nhạc",
        "rating_point": 9.0,
        "rating_count": 1800,
        "age_rating": "C18",
        "formats": ["2D Phụ đề", "IMAX 2D"],
        "synopsis": "Arthur Fleck hội ngộ cùng tri kỷ Harley Quinn trong nhà thương điên Arkham, mở ra điệu valse cuồng loạn giữa âm nhạc và bạo lực.",
        "director": "Todd Phillips",
        "cast_members": "Joaquin Phoenix, Lady Gaga, Zazie Beetz",
        "tags": ["Tâm lý nặng", "Lady Gaga"],
        "is_hot": False,
        "status": "soon"
    }
]

SHOWTIMES_DATA = [
    {
        "id": "st-cgv-lm81-1-0930",
        "movie_id": 1,
        "theater_id": 1,
        "start_time": "09:30",
        "end_time": "12:16",
        "show_date": datetime.date.today().isoformat(),
        "room_name": "Cinema 1 (IMAX)",
        "format": "IMAX 2D",
        "base_price": 150000,
        "empty_seats": 114,
        "total_seats": 120
    },
    {
        "id": "st-cgv-lm81-1-1345",
        "movie_id": 1,
        "theater_id": 1,
        "start_time": "13:45",
        "end_time": "16:31",
        "show_date": datetime.date.today().isoformat(),
        "room_name": "Cinema 1 (IMAX)",
        "format": "IMAX 2D",
        "base_price": 150000,
        "empty_seats": 108,
        "total_seats": 120
    },
    {
        "id": "st-cgv-lm81-1-1715",
        "movie_id": 1,
        "theater_id": 1,
        "start_time": "17:15",
        "end_time": "20:01",
        "show_date": datetime.date.today().isoformat(),
        "room_name": "Cinema 1 (IMAX)",
        "format": "IMAX 2D",
        "base_price": 160000,
        "empty_seats": 92,
        "total_seats": 120
    },
    {
        "id": "st-cgv-lm81-1-2030",
        "movie_id": 1,
        "theater_id": 1,
        "start_time": "20:30",
        "end_time": "23:16",
        "show_date": datetime.date.today().isoformat(),
        "room_name": "Cinema 1 (IMAX)",
        "format": "IMAX 2D",
        "base_price": 165000,
        "empty_seats": 85,
        "total_seats": 120
    },
    {
        "id": "st-cgv-lm81-2-1015",
        "movie_id": 2,
        "theater_id": 1,
        "start_time": "10:15",
        "end_time": "12:26",
        "show_date": datetime.date.today().isoformat(),
        "room_name": "Cinema 2",
        "format": "2D Phụ đề",
        "base_price": 95000,
        "empty_seats": 88,
        "total_seats": 96
    },
    {
        "id": "st-cgv-lm81-2-1400",
        "movie_id": 2,
        "theater_id": 1,
        "start_time": "14:00",
        "end_time": "16:11",
        "show_date": datetime.date.today().isoformat(),
        "room_name": "Cinema 2",
        "format": "2D Phụ đề",
        "base_price": 105000,
        "empty_seats": 90,
        "total_seats": 96
    },
    {
        "id": "st-cgv-lm81-2-1900",
        "movie_id": 2,
        "theater_id": 1,
        "start_time": "19:00",
        "end_time": "21:11",
        "show_date": datetime.date.today().isoformat(),
        "room_name": "Cinema 2",
        "format": "2D Phụ đề",
        "base_price": 115000,
        "empty_seats": 70,
        "total_seats": 96
    },
    {
        "id": "st-cgv-svh-1-1100",
        "movie_id": 1,
        "theater_id": 2,
        "start_time": "11:00",
        "end_time": "13:46",
        "show_date": datetime.date.today().isoformat(),
        "room_name": "Cinema 1",
        "format": "2D Phụ đề",
        "base_price": 90000,
        "empty_seats": 91,
        "total_seats": 96
    },
    {
        "id": "st-cgv-svh-1-1530",
        "movie_id": 1,
        "theater_id": 2,
        "start_time": "15:30",
        "end_time": "18:16",
        "show_date": datetime.date.today().isoformat(),
        "room_name": "Cinema 1",
        "format": "2D Phụ đề",
        "base_price": 95000,
        "empty_seats": 86,
        "total_seats": 96
    },
    {
        "id": "st-glx-nd-1-1430",
        "movie_id": 3,
        "theater_id": 6,
        "start_time": "14:30",
        "end_time": "16:04",
        "show_date": datetime.date.today().isoformat(),
        "room_name": "Cinema 1",
        "format": "2D Lồng tiếng",
        "base_price": 75000,
        "empty_seats": 92,
        "total_seats": 96
    },
    {
        "id": "st-glx-nd-1-1800",
        "movie_id": 4,
        "theater_id": 6,
        "start_time": "18:00",
        "end_time": "19:55",
        "show_date": datetime.date.today().isoformat(),
        "room_name": "Cinema 1",
        "format": "2D Phụ đề",
        "base_price": 85000,
        "empty_seats": 89,
        "total_seats": 96
    },
    {
        "id": "st-bhd-bitexco-1-1630",
        "movie_id": 5,
        "theater_id": 8,
        "start_time": "16:30",
        "end_time": "18:48",
        "show_date": datetime.date.today().isoformat(),
        "room_name": "Cinema 1",
        "format": "2D Phụ đề",
        "base_price": 95000,
        "empty_seats": 90,
        "total_seats": 96
    },
    {
        "id": "st-ncc-hn-1-1930",
        "movie_id": 1,
        "theater_id": 12,
        "start_time": "19:30",
        "end_time": "22:16",
        "show_date": datetime.date.today().isoformat(),
        "room_name": "Phòng 1 (NCC)",
        "format": "2D Phụ đề",
        "base_price": 70000,
        "empty_seats": 125,
        "total_seats": 140
    }
]

COMBOS_DATA = [
    {
        "id": "combo-solo",
        "name": "Combo Solo Bắp & Nước (1 Người)",
        "description": "1 Bắp ngọt lớn (64oz) thơm bơ + 1 Nước ngọt có ga (32oz)",
        "price": 75000,
        "image_url": "https://images.unsplash.com/photo-1578849278619-e73505e9610f?auto=format&fit=crop&w=400&q=80"
    },
    {
        "id": "combo-couple",
        "name": "Combo Couple Hẹn Hò (2 Người)",
        "description": "1 Bắp phô mai đặc biệt (85oz) + 2 Nước ngọt tùy chọn (32oz)",
        "price": 119000,
        "image_url": "https://images.unsplash.com/photo-1585647347483-22b66260dfff?auto=format&fit=crop&w=400&q=80"
    },
    {
        "id": "combo-family",
        "name": "Combo Family Siêu Tiết Kiệm",
        "description": "2 Bắp lớn (Vị Caramen & Phô mai) + 3 Nước ngọt + 1 Xúc xích nướng",
        "price": 169000,
        "image_url": "https://images.unsplash.com/photo-1505686994434-e3cc5abf1330?auto=format&fit=crop&w=400&q=80"
    },
    {
        "id": "combo-snack",
        "name": "Combo Mèo Con Snack",
        "description": "1 Bắp nhỏ + 1 Nước trái cây + 1 Hộp khoai tây lắc phô mai giòn rụm",
        "price": 89000,
        "image_url": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80"
    }
]

PROMOTIONS_DATA = [
    {
        "id": 1,
        "code": "MEOBANMOI",
        "title": "Giảm 25.000đ Bạn Mới",
        "description": "Áp dụng cho khách hàng lần đầu đặt vé trên MeoCinema",
        "discount_amount": 25000,
        "discount_percent": 0,
        "max_discount": 25000,
        "min_order": 100000,
        "badge": "HOT 25K"
    },
    {
        "id": 2,
        "code": "MEOCINEMA20",
        "title": "Giảm 20% Tối Đa 40.000đ",
        "description": "Giảm 20% cho đơn vé từ 150.000đ trên toàn quốc",
        "discount_amount": 0,
        "discount_percent": 20,
        "max_discount": 40000,
        "min_order": 150000,
        "badge": "GIẢM 20%"
    },
    {
        "id": 3,
        "code": "THU4VUIDE",
        "title": "Thứ 4 Đồng Giá 50K Toàn Quốc",
        "description": "Xem phim thả ga vào Thứ Tư hàng tuần tại cụm rạp đối tác",
        "discount_amount": 30000,
        "discount_percent": 0,
        "max_discount": 30000,
        "min_order": 80000,
        "badge": "ĐỒNG GIÁ"
    },
    {
        "id": 4,
        "code": "MOMOPAY",
        "title": "Ưu đãi MoMo hoàn tiền 15K",
        "description": "Thanh toán qua ví MoMo nhận ngay voucher bắp nước",
        "discount_amount": 15000,
        "discount_percent": 0,
        "max_discount": 15000,
        "min_order": 120000,
        "badge": "MOMO 15K"
    },
    {
        "id": 5,
        "code": "STUDENT",
        "title": "Ưu Đãi Học Sinh - Sinh Viên",
        "description": "Giảm trực tiếp 20.000đ/vé cho HSSV khi xuất trình thẻ",
        "discount_amount": 20000,
        "discount_percent": 0,
        "max_discount": 20000,
        "min_order": 80000,
        "badge": "HSSV"
    }
]

# In-memory bookings store
BOOKINGS_STORE: List[Dict[str, Any]] = [
    {
        "id": 1,
        "booking_code": "MEO-849201",
        "customer_name": "Nguyễn Văn An",
        "customer_phone": "0909123456",
        "customer_email": "an.nguyen@gmail.com",
        "showtime_id": "st-cgv-lm81-1-2030",
        "seat_count": 2,
        "seat_numbers": ["E6", "E7"],
        "seat_total": 330000,
        "combo_total": 119000,
        "discount_total": 25000,
        "final_total": 424000,
        "voucher_code": "MEOBANMOI",
        "payment_method": "momo",
        "payment_status": "paid",
        "created_at": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "qr_code_value": "https://meocinema.vn/ticket/MEO-849201",
        "movie_title": "Dune: Phần Hai",
        "poster_url": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80",
        "cinema_name": "CGV Landmark 81",
        "cinema_address": "Tầng B1, TTTM Vincom Center Landmark 81, 720A Điện Biên Phủ, P. 22, Bình Thạnh",
        "screen_room": "Cinema 1 (IMAX)",
        "format": "IMAX 2D",
        "show_date": datetime.date.today().isoformat(),
        "show_time": "20:30",
        "combos": ["1x Combo Couple Hẹn Hò (2 Người)"]
    }
]

# Track reserved seats per showtime in memory: { showtime_id: set([seat_codes]) }
RESERVED_SEATS_MAP: Dict[str, set] = {
    "st-cgv-lm81-1-2030": {"E6", "E7"},
    "st-cgv-lm81-1-1715": {"D4", "D5", "E5", "E6", "F7", "F8"}
}

def init_postgres_schema():
    """Tự động kiểm tra và chạy database.sql nếu kết nối tới PostgreSQL thành công"""
    if not is_postgres_available():
        print("[DATABASE] PostgreSQL daemon chưa sẵn sàng. Khởi chạy với In-Memory / Hybrid Engine.")
        return False

    sql_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "database.sql"))
    if not os.path.exists(sql_path):
        sql_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "database.sql"))

    if os.path.exists(sql_path):
        try:
            conn = get_pg_connection()
            if conn:
                with conn.cursor() as cur:
                    with open(sql_path, "r", encoding="utf-8") as f:
                        cur.execute(f.read())
                    conn.commit()
                conn.close()
                print(f"[DATABASE] Đã nạp thành công database.sql vào PostgreSQL tại {DATABASE_URL}")
                return True
        except Exception as e:
            print(f"[DATABASE] Lỗi nạp database.sql: {e}")
    return False
