import os
import re
import datetime
import threading
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

MOVIES_DATA = [{'id': 25051,
  'title': 'Lên Hương',
  'title_en': "A 'Good' Best Luck",
  'banner_url': 'https://cinema.momocdn.net/img/35672561412059349-d0485845080ee150b81f.jpg?size=M',
  'poster_url': 'https://cinema.momocdn.net/convert-webp/img/169975628854232523-lhfinal.png?size=SM',
  'trailer_url': 'https://www.youtube.com/embed/ZImBtmy3XrA',
  'duration': 120,
  'release_date': '2026-09-14',
  'genre': 'Hài, Gay Cấn',
  'rating_point': 9.3,
  'rating_count': 4647,
  'age_rating': 'C16',
  'formats': ['2D Phụ đề', '2D Lồng tiếng'],
  'synopsis': 'Một bà chủ của trại hòm ế ẩm và một thanh niên cần tiền trang trải cuộc sống đã vô tình mắc '
              'vào một “giao kèo định mệnh". Một người cố giữ nghề, một người cố cứu mạng người mẹ đang bệnh '
              'nặng, mở ra bí mật về món nợ đã chôn vùi suốt nhiều năm.',
  'director': 'Đạo diễn hàng đầu Việt Nam',
  'cast_members': 'Dàn diễn viên điện ảnh nổi tiếng',
  'tags': ['Tuyệt vời', 'Cảm động', 'Khóc trôi rạp', 'Đáng xem'],
  'is_hot': True,
  'status': 'now'},
 {'id': 25074,
  'title': 'Út Lan 2',
  'title_en': 'Ut Lan 2',
  'banner_url': 'https://image-fworker.momocdn.net/momo-external/9ec3a8ed7c3f49896fb1d8350efb601c9d7179e727e6716ce84c6a78a68a0008?size=M',
  'poster_url': 'https://cinema.momocdn.net/convert-webp/img/597581002775594-utlan2.jpg?size=SM',
  'trailer_url': 'https://www.youtube.com/embed/2xpkMDMDksE',
  'duration': 107,
  'release_date': '2026-09-21',
  'genre': 'Kinh Dị',
  'rating_point': 8.3,
  'rating_count': 2259,
  'age_rating': 'C18',
  'formats': ['2D Phụ đề', 'IMAX 2D'],
  'synopsis': 'Từ lúc một con rắn hai đầu xuất hiện, ngôi làng ven sông liên tiếp xảy ra những cái chết bí '
              'ẩn. Khi những bí mật bị lãng quên dần trồi lên mặt nước, người dân nhận ra có những lời '
              'nguyền chưa bao giờ thực sự biến mất.',
  'director': 'Đạo diễn hàng đầu Việt Nam',
  'cast_members': 'Dàn diễn viên điện ảnh nổi tiếng',
  'tags': ['Tuyệt vời', 'Hài lòng', 'Giải trí', 'Khóc trôi rạp'],
  'is_hot': True,
  'status': 'now'},
 {'id': 25134,
  'title': 'Avengers: Hồi Kết - Phiên Bản Đặc Biệt (Chiếu lại)',
  'title_en': 'Avengers: Endgame Encore',
  'banner_url': 'https://image-fworker.momocdn.net/momo-external/2f5c6574f64b9755792b09391e268d3c6f427d90980156d4c82658f47e588f55?size=M',
  'poster_url': 'https://image-fworker.momocdn.net/momo-external/5ae579829a348a0fa937aa4c198e125efa985ce1c5ff6787e71de813ed451e52?size=M',
  'trailer_url': 'https://www.youtube.com/embed/XsDQf4EsZIs',
  'duration': 180,
  'release_date': '2026-09-25',
  'genre': 'Khoa Học Viễn Tưởng, Phiêu Lưu, Hành Động',
  'rating_point': 10.0,
  'rating_count': 40,
  'age_rating': 'C13',
  'formats': ['2D Phụ đề', '2D Lồng tiếng'],
  'synopsis': 'Phần kết hoành tráng của Infinity Saga sẽ trở lại rạp chiếu với Avengers: Hồi Kết - Phiên Bản '
              'Đặc Biệt vào ngày 25/09/2026. Sau những sự kiện thảm khốc khiến một nửa dân số thế giới biến '
              'mất, những người hùng còn lại phải vật lộn để tiếp tục cuộc sống. Cuối cùng, họ buộc phải hợp '
              'sức để khôi phục trật tự và sự cân bằng cho vũ trụ, đồng thời đưa những người thân yêu trở về '
              'trong cuộc đối đầu đầy kịch tính với Thanos.',
  'director': 'Đạo diễn hàng đầu Việt Nam',
  'cast_members': 'Dàn diễn viên điện ảnh nổi tiếng',
  'tags': ['Hài hước', 'Cảm động', 'Đáng xem', 'Ý nghĩa'],
  'is_hot': True,
  'status': 'now'},
 {'id': 25086,
  'title': 'Bát Tiên! Truy Tìm Lưu Ly Đăng',
  'title_en': 'All Wishes Come True',
  'banner_url': 'https://image-fworker.momocdn.net/momo-external/0a329bb9920415b74c0ab04321ef91bb16d2a7a552187d893a37a2663842922f?size=M',
  'poster_url': 'https://cinema.momocdn.net/convert-webp/img/66354116138203447-batien.png?size=SM',
  'trailer_url': 'https://www.youtube.com/embed/SG0X_2BuhM4',
  'duration': 143,
  'release_date': '2026-09-11',
  'genre': 'Hài, Hoạt Hình, Giả Tượng, Phiêu Lưu',
  'rating_point': 9.8,
  'rating_count': 447,
  'age_rating': 'C13',
  'formats': ['2D Phụ đề', 'IMAX 2D'],
  'synopsis': 'Tám phàm nhân với tám giấc mộng đổi đời đã thực hiện một phi vụ liều lĩnh: đột nhập chốn Bồng '
              'Lai để đánh cắp bảo vật. Những tưởng trộm được bảo vật của Tam Tinh là có thể giúp họ một '
              'bước đổi vận, nhưng cả nhóm lại vô tình bị cuốn vào âm mưu đen tối chốn Thiên Đình. Khi bí '
              'mật dần hé lộ và kẻ thù thực sự xuất hiện, tám con người "chẳng có thần thông cũng không mang '
              'pháp lực" buộc phải đối đầu với vị thần tiên đầy quyền năng. Từ những kẻ vô danh chỉ muốn '
              'thay đổi số phận, họ bất đắc dĩ trở thành những người nắm giữ vận mệnh Tam Giới. Hành trình '
              'hài hước về những con người bé nhỏ dám làm nên chuyện lớn đã đưa Bát Tiên! Truy Tìm Lưu Ly '
              'Đăng trở thành phim hoạt hình Trung Quốc có doanh thu cao nhất năm 2026 và lọt top 4 phim '
              'hoạt hình có doanh thu phòng vé cao nhất mọi thời đại. ',
  'director': 'Đạo diễn hàng đầu Việt Nam',
  'cast_members': 'Dàn diễn viên điện ảnh nổi tiếng',
  'tags': ['Tuyệt vời', 'Hài lòng', 'Cảm động', 'Hài hước'],
  'is_hot': True,
  'status': 'now'},
 {'id': 25090,
  'title': 'Bóng Ma Nhà Hát',
  'title_en': 'Bóng Ma Nhà Hát',
  'banner_url': 'https://cinema.momocdn.net/img/39484159312365961-bmnh.jpg?size=M',
  'poster_url': 'https://image-fworker.momocdn.net/momo-external/df53e189c578c86d986c88ac565d031d37d753f3f5dff4fe7bb86cbbd954b7b0?size=M',
  'trailer_url': 'https://www.youtube.com/embed/JVIvl_ux298',
  'duration': 97,
  'release_date': '2026-09-18',
  'genre': 'Hài, Kinh Dị',
  'rating_point': 8.5,
  'rating_count': 431,
  'age_rating': 'C16',
  'formats': ['2D Phụ đề', '2D Lồng tiếng'],
  'synopsis': 'Tuấn, một chuyên viên bất động sản đầy tham vọng, được giao nhiệm vụ vực dậy một nhà hát cũ '
              'trong vòng một tháng để giữ vững sự nghiệp. Tại đây, anh phát hiện nơi này bị ám bởi Nhã – '
              'một nữ diễn viên chết oan chưa thể siêu thoát. Nhờ tài marketing, Tuấn và người cộng sự đã '
              'giúp nhà hát nhanh chóng cháy vé, nhưng sự xuất hiện của Phong - tình cũ của Nhã khiến mọi '
              'chuyện đảo lộn. Tưởng như mất tất cả, nhưng Tuấn đã cùng tất cả mọi người trong nhà hát tạo '
              'nên một thương vụ thế kỷ giữa người và ma và cứu lấy Nhà Hát Vàng Son.',
  'director': 'Đạo diễn hàng đầu Việt Nam',
  'cast_members': 'Dàn diễn viên điện ảnh nổi tiếng',
  'tags': ['Tuyệt vời', 'Hài lòng', 'Cảm động', 'Hài hước'],
  'is_hot': False,
  'status': 'now'},
 {'id': 24991,
  'title': 'Trại Buôn Người',
  'title_en': 'Trại Buôn Người',
  'banner_url': 'https://cinema.momocdn.net/img/74805855983673840-tbn1.jpg?size=M',
  'poster_url': 'https://cinema.momocdn.net/convert-webp/img/867383626301392-tbnpo.jpg?size=SM',
  'trailer_url': 'https://www.youtube.com/embed/nlFar2vq4Yo',
  'duration': 135,
  'release_date': '2026-09-25',
  'genre': 'Hành Động, Gay Cấn',
  'rating_point': 9.0,
  'rating_count': 1500,
  'age_rating': 'C18',
  'formats': ['2D Phụ đề', 'IMAX 2D'],
  'synopsis': 'Vì cứu em gái sa bẫy buôn người ở biên giới miền Tây, Ny (Steven Nguyễn) cùng bạn thân bị bắt '
              'làm nô dịch trong sào huyệt lừa đảo tàn bạo. Tại đây, họ cùng các trinh sát nằm vùng và các '
              'nạn nhân hứng chịu bi kịch thể xác âm thầm lập kế hoạch trốn thoát.\n',
  'director': 'Đạo diễn hàng đầu Việt Nam',
  'cast_members': 'Dàn diễn viên điện ảnh nổi tiếng',
  'tags': ['Hài hước', 'Cảm động', 'Đáng xem', 'Ý nghĩa'],
  'is_hot': False,
  'status': 'now'},
 {'id': 25135,
  'title': 'Vùng Đất Quỷ Dữ',
  'title_en': 'Resident Evil',
  'banner_url': 'https://image-fworker.momocdn.net/momo-external/e52642e96de77bc98f0f68f98fcde417fee2abefb4d2f604776488a6aa9ac1d6?size=M',
  'poster_url': 'https://cinema.momocdn.net/convert-webp/img/601095563808280-470x700-residentevil_1.jpg?size=SM',
  'trailer_url': 'https://www.youtube.com/embed/mNd1gb19A-c',
  'duration': 94,
  'release_date': '2026-09-18',
  'genre': 'Kinh Dị, Phiêu Lưu, Gay Cấn',
  'rating_point': 8.0,
  'rating_count': 548,
  'age_rating': 'C18',
  'formats': ['2D Phụ đề', '2D Lồng tiếng'],
  'synopsis': 'Một phiên bản Resident Evil mới trở lại đầy kịch tính và kinh hoàng từ bộ óc quái kiệt của '
              'đạo diễn Zach Cregger đứng sau “Weapons” & “Barbarian”. Với cốt truyện hoàn toàn mới, phim '
              'xoay quanh Bryan (Austin Abrams), một nhân viên vận chuyển vật tư y tế vô tình bị cuốn vào '
              'cuộc chạy đua sinh tồn nghẹt thở và dồn dập trong một đêm định mệnh. Liên tiếp chuyện kinh '
              'hoàng bất ngờ đẩy anh vào giữa vòng xoáy hỗn loạn.',
  'director': 'Đạo diễn hàng đầu Việt Nam',
  'cast_members': 'Dàn diễn viên điện ảnh nổi tiếng',
  'tags': ['Tuyệt vời', 'Hài lòng', 'Hài hước', 'Giải trí'],
  'is_hot': False,
  'status': 'now'},
 {'id': 25101,
  'title': 'Yêu Nhân Thần Thám: Kỳ Án Trường An',
  'title_en': 'Demon Agent',
  'banner_url': 'https://image-fworker.momocdn.net/momo-external/7444124e2e7a59aef713d065758f63f99be6678c57150f106ec043381f895bcd?size=M',
  'poster_url': 'https://image-fworker.momocdn.net/momo-external/9be95ba03ac39d2f2b1fe09f9f44da87ad7feeb75cc97e2a729393f50d03754d?size=M',
  'trailer_url': 'https://www.youtube.com/embed/ZHDhTOO7i-s',
  'duration': 116,
  'release_date': '2026-09-18',
  'genre': 'Hài, Hoạt Hình, Bí Ẩn',
  'rating_point': 9.9,
  'rating_count': 131,
  'age_rating': 'K',
  'formats': ['2D Phụ đề', 'IMAX 2D'],
  'synopsis': 'Giữa Trường An tráng lệ và kỳ ảo dưới triều Đường, nơi những cỗ máy cơ khí tinh xảo hòa quyện '
              'cùng mái ngói cong vút, con người và yêu quái cùng chung sống. Địch Thiếu, thiếu niên thiên '
              'tài luôn mơ ước trở thành “Đại Thám Tử Số Một Trường An”, sở hữu khả năng suy luận sắc bén '
              'cùng tài ăn nói hơn người. Đồng hành cùng cậu là A Sa, tân binh yêu sói của đội tuần tra, '
              'giỏi võ nhưng mang trong mình trái tim lương thiện. Một vụ án mạng bí ẩn bất ngờ khiến đôi '
              'oan gia này phải hợp tác. Vừa đấu khẩu, vừa phối hợp phá án, cả hai dấn thân vào hành trình '
              'điều tra đầy bất ngờ và hiểm nguy. Khi mọi manh mối đều dẫn về trung tâm Trường An, liệu họ '
              'có thể bảo vệ sự bình yên của thành? Và đằng sau vẻ phồn hoa của Trường An đang ẩn giấu bí '
              'mật kinh thiên động địa nào?',
  'director': 'Đạo diễn hàng đầu Việt Nam',
  'cast_members': 'Dàn diễn viên điện ảnh nổi tiếng',
  'tags': ['Hài hước', 'Cười banh rạp', 'Cảm động', 'Siêu phẩm'],
  'is_hot': False,
  'status': 'now'},
 {'id': 25097,
  'title': 'Mãi Nợ Một Lời Tạm Biệt',
  'title_en': 'Mãi Nợ Một Lời Tạm Biệt',
  'banner_url': 'https://image-fworker.momocdn.net/momo-external/3a96ec3d52278215031f5a1400e1c03a21270e5f4960bee02930cb3d68fb8b96?size=M',
  'poster_url': 'https://cinema.momocdn.net/convert-webp/img/169449281826614607-m_i_n_m_t_l_i_t_m_bi_t_-_d_ki_n_kh_i_chi_u_11.09.2026_-_kt_chu_n.jpg?size=SM',
  'trailer_url': 'https://www.youtube.com/embed/OYA30XqHg94',
  'duration': 120,
  'release_date': '2026-09-11',
  'genre': 'Phiêu Lưu, Chính Kịch',
  'rating_point': 7.9,
  'rating_count': 246,
  'age_rating': 'K',
  'formats': ['2D Phụ đề', '2D Lồng tiếng'],
  'synopsis': 'Những khu chợ, xóm nhỏ và nhịp sống bình dị của Việt Nam những năm 1970 hiện lên qua tuổi thơ '
              'của Cu Đen (Uy Nhân) bên bà Nội (Kiều Chinh), tạo nên những thước phim đầu tiên vừa gần gũi '
              'vừa giàu chất điện ảnh.  Thế nhưng, những ngày tháng bình yên nhanh chóng bị cắt ngang bởi '
              'biến động những năm 1970. Khoảnh khắc hai bà cháu phải chia xa trở thành một mảnh ký ức theo '
              'Cu Đen trên hành trình trưởng thành, mở ra câu chuyện về tình thân, nguồn cội và những điều '
              'chưa thể nói lời tạm biệt.',
  'director': 'Đạo diễn hàng đầu Việt Nam',
  'cast_members': 'Dàn diễn viên điện ảnh nổi tiếng',
  'tags': ['Ý nghĩa', 'Đồng cảm', 'Đáng suy ngẫm', 'Tuyệt vời'],
  'is_hot': False,
  'status': 'now'},
 {'id': 25102,
  'title': 'Bùa Yêu: Bí Mật Gia Tộc',
  'title_en': 'Practical Magic 2',
  'banner_url': 'https://image-fworker.momocdn.net/momo-external/4e8245d7cb1f3512e546aa3c97658c48468ae22955e091dfc3ee0ea24c16b6d9?size=M',
  'poster_url': 'https://image-fworker.momocdn.net/momo-external/6d3b03cebe370d99172b062745a63ac248b6f575c2d9c468b96127156172b334?size=M',
  'trailer_url': 'https://www.youtube.com/embed/Ho10_4IX1jE',
  'duration': 130,
  'release_date': '2026-09-11',
  'genre': 'Hài, Giả Tượng, Lãng Mạn',
  'rating_point': 7.6,
  'rating_count': 15,
  'age_rating': 'C13',
  'formats': ['2D Phụ đề', 'IMAX 2D'],
  'synopsis': 'Bùa Yêu: Bí Mật Gia Tộc đưa khán giả đến thế giới phép thuật đầy mê hoặc, nơi những bí ẩn '
              'dưới ánh trăng và sức mạnh ma thuật gia truyền vẫn luôn hiện hữu. Lần này, hai chị em nhà '
              'Owens phải cùng nhau đối mặt với một lời nguyền đen tối đang đe dọa chia cắt gia đình mãi '
              'mãi.',
  'director': 'Đạo diễn hàng đầu Việt Nam',
  'cast_members': 'Dàn diễn viên điện ảnh nổi tiếng',
  'tags': ['Tuyệt vời', 'Hài lòng', 'Hài hước', 'Giải trí'],
  'is_hot': False,
  'status': 'now'},
 {'id': 25087,
  'title': 'SOOBIN LIVE CONCERT MOVIE: ALL-ROUNDER',
  'title_en': 'SOOBIN LIVE CONCERT MOVIE: ALL-ROUNDER',
  'banner_url': 'https://cinema.momocdn.net/img/66351554835506935-640X310.png?size=M',
  'poster_url': 'https://cinema.momocdn.net/convert-webp/img/66351503340702034-soobinconcert.jpg?size=SM',
  'trailer_url': '',
  'duration': 109,
  'release_date': '2026-09-10',
  'genre': 'Hành động, Hài',
  'rating_point': 9.8,
  'rating_count': 105,
  'age_rating': 'C13',
  'formats': ['2D Phụ đề', '2D Lồng tiếng'],
  'synopsis': 'SOOBIN LIVE CONCERT MOVIE: ALL-ROUNDER là bộ phim âm nhạc đầu tiên của SOOBIN mang đến trải '
              'nghiệm điện ảnh chuẩn âm thanh vòm 7.1, tái hiện những khoảnh khắc thăng hoa từ chuỗi concert '
              'ALL-ROUNDER, cùng các màn trình diễn quy mô và những thước phim hậu trường chưa từng công bố. '
              'Bộ phim được ra mắt vào dịp sinh nhật SOOBIN, như một cột mốc đặc biệt trong hành trình nghệ '
              'thuật của anh. Đằng sau ánh đèn sân khấu là câu chuyện cham đến giấc mơ với sự nỗ lực, vượt '
              'qua giới hạn và chinh phục những chuẩn mực mới. Với thông điệp “THE ALL-ROUNDER IS ALL AROUND '
              'YOU”, SOOBIN gửi lời tri ân đến khán giả, đặc biệt là KINGDOM – những người luôn đồng hành và '
              'tiếp thêm động lực trên hành trình ấy. Bởi mỗi người đều có thể là một All-Rounder, ở bất cứ '
              'nơi đâu.',
  'director': 'Đạo diễn hàng đầu Việt Nam',
  'cast_members': 'Dàn diễn viên điện ảnh nổi tiếng',
  'tags': ['Tuyệt vời', 'Hài lòng', 'Cảm động', 'Hài hước'],
  'is_hot': False,
  'status': 'now'},
 {'id': 25083,
  'title': 'Ma Tù',
  'title_en': 'Ghost in the Cell',
  'banner_url': 'https://image-fworker.momocdn.net/momo-external/0f42867ed5a3f8c9c6159c5f9b577d8352b7d641c887d27ec5383e8efb069ce4?size=M',
  'poster_url': 'https://image-fworker.momocdn.net/momo-external/2338a62d9f4895f30e40500c7ecd1e7f514d399dbfc6bc8e4de7d9473a4209d6?size=M',
  'trailer_url': 'https://www.youtube.com/embed/otL78_pk_A0',
  'duration': 106,
  'release_date': '2026-09-04',
  'genre': 'Hài, Kinh Dị, Gây Cấn',
  'rating_point': 9.0,
  'rating_count': 525,
  'age_rating': 'C18',
  'formats': ['2D Phụ đề', 'IMAX 2D'],
  'synopsis': 'Một tù nhân bí ẩn xuất hiện trong một nhà tù khét tiếng bạo lực nhất Indonesia, mang theo một '
              'thực thể siêu nhiên chỉ săn lùng những kẻ có năng lượng tiêu cực. Để sống sót, các tù nhân '
              'buộc phải cùng nhau làm việc thiện nhằm xóa bỏ bóng tối trong tâm hồn. Hoặc chết từng người '
              'một.',
  'director': 'Đạo diễn hàng đầu Việt Nam',
  'cast_members': 'Dàn diễn viên điện ảnh nổi tiếng',
  'tags': ['Hài lòng', 'Hài hước', 'Cười banh rạp', 'Đáng xem'],
  'is_hot': False,
  'status': 'now'},
 {'id': 25138,
  'title': 'Tế Nhi Cải Mệnh',
  'title_en': 'The Tao Exorcist',
  'banner_url': 'https://cinema.momocdn.net/img/764569468113065-tn3.jpg?size=M',
  'poster_url': 'https://cinema.momocdn.net/convert-webp/img/764471700398079-tncm.jpg?size=SM',
  'trailer_url': 'https://www.youtube.com/embed/21kgF9MuxtE',
  'duration': 108,
  'release_date': '2026-09-18',
  'genre': 'Kinh Dị',
  'rating_point': 7.3,
  'rating_count': 70,
  'age_rating': 'C18',
  'formats': ['2D Phụ đề', '2D Lồng tiếng'],
  'synopsis': 'Vì nợ cờ bạc chồng chất, Chấn Khải cùng vợ Nam Tương và gia đình buộc phải chuyển nhà để trốn '
              'chủ nợ. Trong bước đường cùng, anh tìm đến tà thuật cấm kỵ, thậm chí hiến tế vận mệnh của con '
              'trai để đổi lấy tiền bạc. Tiền vừa đến tay, tai họa cũng ập đến khi cả gia đình liên tiếp gặp '
              'những hiện tượng kinh hoàng. Một chàng trai có năng lực tâm linh phát hiện oán khí từ nghi lễ '
              'hiến tế, hé lộ bí mật đáng sợ phía sau. Nghi thức máu đã bắt đầu và tai kiếp giờ đây không '
              'thể tránh khỏi.',
  'director': 'Đạo diễn hàng đầu Việt Nam',
  'cast_members': 'Dàn diễn viên điện ảnh nổi tiếng',
  'tags': ['Tuyệt vời', 'Siêu phẩm', 'Đáng xem'],
  'is_hot': False,
  'status': 'now'},
 {'id': 25100,
  'title': 'Cổ Thuật Hắc Ngải',
  'title_en': 'Kong Tao',
  'banner_url': 'https://cinema.momocdn.net/convert-webp/img/170060743393801020-poster.png?size=SM',
  'poster_url': 'https://cinema.momocdn.net/convert-webp/img/170060743393801020-poster.png?size=SM',
  'trailer_url': '',
  'duration': 86,
  'release_date': '2026-09-11',
  'genre': 'Phiêu Lưu, Gây Cấn',
  'rating_point': 5.7,
  'rating_count': 164,
  'age_rating': 'C16',
  'formats': ['2D Phụ đề', 'IMAX 2D'],
  'synopsis': 'CỔ THUẬT HẮC NGẢI (Kong Tao – 蠱降) là bộ phim kinh dị hợp tác giữa Thái Lan và Malaysia, lấy '
              'cảm hứng từ những nghi thức trù ếm, bùa ngải và tà thuật hắc ám bí ẩn bậc nhất châu Á. Phim '
              'theo chân một nhóm YouTuber chuyên khám phá các hiện tượng siêu nhiên tại Thái Lan. Thế '
              'nhưng, một chuyến ghi hình tưởng chừng vô hại lại vô tình đánh thức lời nguyền chết chóc, '
              'buộc cả nhóm phải chạy đua với thời gian để tìm đến một pháp sư trước khi trở thành những nạn '
              'nhân tiếp theo. Đặc biệt, bộ phim đánh dấu màn lột xác của Kao Supassara – "tình đầu Thái '
              'Lan" – trong một vai diễn hoàn toàn mới, kết hợp cùng Philip Keung, hứa hẹn mang đến một siêu '
              'phẩm kinh dị nặng đô, đậm màu sắc tà thuật và văn hóa bùa ngải Đông Nam Á.',
  'director': 'Đạo diễn hàng đầu Việt Nam',
  'cast_members': 'Dàn diễn viên điện ảnh nổi tiếng',
  'tags': ['Tuyệt vời', 'Đáng xem'],
  'is_hot': False,
  'status': 'now'},
 {'id': 25085,
  'title': 'HOPE: Vùng Tử Địa',
  'title_en': 'HOPE',
  'banner_url': 'https://image-fworker.momocdn.net/momo-external/5f548dc37fcf9480294f4be4b6da65ec0e4c10262ba0ac4e394b682aff41edc5?size=M',
  'poster_url': 'https://image-fworker.momocdn.net/momo-external/4c452ba927ec056b1674b6a6faf265f64fc0d52105dabc21d109f09ce1480cf0?size=M',
  'trailer_url': 'https://www.youtube.com/embed/N45eWotaGxU',
  'duration': 157,
  'release_date': '2026-09-04',
  'genre': 'Khoa Học Viễn Tưởng, Bí Ẩn, Hành Động',
  'rating_point': 7.2,
  'rating_count': 936,
  'age_rating': 'C16',
  'formats': ['2D Phụ đề', '2D Lồng tiếng'],
  'synopsis': 'Tại Hope Harbor, một ngôi làng hẻo lánh nằm gần khu vực phi quân sự, cảnh sát trưởng Bum-seok '
              'đã nhận được tin báo khẩn cấp từ người dân địa phương về sự xuất hiện của một con hổ. Khi cả '
              'ngôi làng chìm trong hoảng loạn, Bum-seok ngỡ ngàng khi phát hiện một sự thật nằm ngoài sức '
              'tưởng tượng của con người.',
  'director': 'Đạo diễn hàng đầu Việt Nam',
  'cast_members': 'Dàn diễn viên điện ảnh nổi tiếng',
  'tags': ['Gay cấn', 'Đáng xem', 'Hài hước', 'Cười banh rạp'],
  'is_hot': False,
  'status': 'now'},
 {'id': 25137,
  'title': 'Godzilla Trừ Không',
  'title_en': 'Godzilla Minus Zero',
  'banner_url': 'https://image-fworker.momocdn.net/momo-external/5e1f88db3e81d99233a0df80c1089c51ccf2eed31aa9347249f2885f1b314ca8?size=M',
  'poster_url': 'https://image-fworker.momocdn.net/momo-external/e48c72c7ec00add718c18636a5f3962bfb03db852d627f346ab04e36f77397d3?size=M',
  'trailer_url': 'https://www.youtube.com/embed/pWJjYoqVSjQ',
  'duration': 135,
  'release_date': '2026-11-06',
  'genre': 'Hành động, Phiêu lưu',
  'rating_point': 9.5,
  'rating_count': 890,
  'age_rating': 'C13',
  'formats': ['2D Phụ đề'],
  'synopsis': 'Siêu phẩm điện ảnh được mong đợi nhất sắp đổ bộ các rạp chiếu phim trên toàn quốc.',
  'tags': ['Bom tấn', 'Sắp chiếu', 'Được mong chờ'],
  'status': 'soon'},
 {'id': 24641,
  'title': 'Dune: Hành Tinh Cát - Phần Ba',
  'title_en': 'Dune: Part Three',
  'banner_url': 'https://image-fworker.momocdn.net/momo-external/612a762b3cb77f060e38f1ae9c06be4b06e90a13ceffd6d599174dd64387bf91?size=M',
  'poster_url': 'https://image-fworker.momocdn.net/momo-external/612a762b3cb77f060e38f1ae9c06be4b06e90a13ceffd6d599174dd64387bf91?size=M',
  'trailer_url': 'https://www.youtube.com/embed/iEpdGDM6x48',
  'duration': 120,
  'release_date': '2026-12-16',
  'genre': 'Hành động, Phiêu lưu',
  'rating_point': 9.5,
  'rating_count': 890,
  'age_rating': 'C13',
  'formats': ['2D Phụ đề'],
  'synopsis': 'Siêu phẩm điện ảnh được mong đợi nhất sắp đổ bộ các rạp chiếu phim trên toàn quốc.',
  'tags': ['Bom tấn', 'Sắp chiếu', 'Được mong chờ'],
  'status': 'soon'},
 {'id': 25092,
  'title': 'Người Mẹ Xấu',
  'title_en': 'Người Mẹ Xấu',
  'banner_url': 'https://cinema.momocdn.net/convert-webp/img/169450140804337896-nguoi-me-xau-500_1781239561463.png?size=SM',
  'poster_url': 'https://cinema.momocdn.net/convert-webp/img/169450140804337896-nguoi-me-xau-500_1781239561463.png?size=SM',
  'trailer_url': '',
  'duration': 120,
  'release_date': 'Tháng 10/2026',
  'genre': 'Hành động, Phiêu lưu',
  'rating_point': 9.5,
  'rating_count': 890,
  'age_rating': 'C13',
  'formats': ['2D Phụ đề'],
  'synopsis': 'Siêu phẩm điện ảnh được mong đợi nhất sắp đổ bộ các rạp chiếu phim trên toàn quốc.',
  'tags': ['Bom tấn', 'Sắp chiếu', 'Được mong chờ'],
  'status': 'soon'},
 {'id': 25093,
  'title': 'Ngày Con Còn Mẹ',
  'title_en': 'Ngày Con Còn Mẹ',
  'banner_url': 'https://cinema.momocdn.net/convert-webp/img/169449993208190656-6a853d31e3f95905793733.png?size=SM',
  'poster_url': 'https://cinema.momocdn.net/convert-webp/img/169449993208190656-6a853d31e3f95905793733.png?size=SM',
  'trailer_url': 'https://www.youtube.com/embed/kWEdrqJNSoY',
  'duration': 120,
  'release_date': '2026-10-18',
  'genre': 'Hành động, Phiêu lưu',
  'rating_point': 9.5,
  'rating_count': 890,
  'age_rating': 'C13',
  'formats': ['2D Phụ đề'],
  'synopsis': 'Siêu phẩm điện ảnh được mong đợi nhất sắp đổ bộ các rạp chiếu phim trên toàn quốc.',
  'tags': ['Bom tấn', 'Sắp chiếu', 'Được mong chờ'],
  'status': 'now'},
 {'id': 25094,
  'title': 'Chuyến Đi Nhớ Đời',
  'title_en': 'Chuyến Đi Nhớ Đời',
  'banner_url': 'https://cinema.momocdn.net/convert-webp/img/169449900843357660-6a8e65fcc56f4621082505.png?size=SM',
  'poster_url': 'https://cinema.momocdn.net/convert-webp/img/169449900843357660-6a8e65fcc56f4621082505.png?size=SM',
  'trailer_url': '',
  'duration': 120,
  'release_date': 'Tháng 10/2026',
  'genre': 'Hành động, Phiêu lưu',
  'rating_point': 9.5,
  'rating_count': 890,
  'age_rating': 'C13',
  'formats': ['2D Phụ đề'],
  'synopsis': 'Siêu phẩm điện ảnh được mong đợi nhất sắp đổ bộ các rạp chiếu phim trên toàn quốc.',
  'tags': ['Bom tấn', 'Sắp chiếu', 'Được mong chờ'],
  'status': 'soon'},
 {'id': 25095,
  'title': 'Trấn Yểm',
  'title_en': 'Trấn Yểm',
  'banner_url': 'https://cinema.momocdn.net/convert-webp/img/169449770605007316-tra_n-ye_m-poster-co_ng-bo_-du_-a_n.jpg?size=SM',
  'poster_url': 'https://cinema.momocdn.net/convert-webp/img/169449770605007316-tra_n-ye_m-poster-co_ng-bo_-du_-a_n.jpg?size=SM',
  'trailer_url': '',
  'duration': 120,
  'release_date': 'Tháng 10/2026',
  'genre': 'Hành động, Phiêu lưu',
  'rating_point': 9.5,
  'rating_count': 890,
  'age_rating': 'C13',
  'formats': ['2D Phụ đề'],
  'synopsis': 'Siêu phẩm điện ảnh được mong đợi nhất sắp đổ bộ các rạp chiếu phim trên toàn quốc.',
  'tags': ['Bom tấn', 'Sắp chiếu', 'Được mong chờ'],
  'status': 'soon'},
 {'id': 25096,
  'title': 'Mẹ Mìn',
  'title_en': 'Mẹ Mìn',
  'banner_url': 'https://image-fworker.momocdn.net/momo-external/3338305f3dab112b763ac3712e6c0b11279c3ac674e4a0bbdcfacb3952481ee9?size=M',
  'poster_url': 'https://cinema.momocdn.net/convert-webp/img/1189440217284670-memin.jpg?size=SM',
  'trailer_url': '',
  'duration': 125,
  'release_date': 'Tháng 10/2026',
  'genre': 'Hành động, Phiêu lưu',
  'rating_point': 9.5,
  'rating_count': 890,
  'age_rating': 'C13',
  'formats': ['2D Phụ đề'],
  'synopsis': 'Siêu phẩm điện ảnh được mong đợi nhất sắp đổ bộ các rạp chiếu phim trên toàn quốc.',
  'tags': ['Bom tấn', 'Sắp chiếu', 'Được mong chờ'],
  'status': 'soon'},
 {'id': 24845,
  'title': 'Thám Tử Kiên 2: Lời Nguyền Hoàng Kim',
  'title_en': 'Thám Tử Kiên 2: Lời Nguyền Hoàng Kim',
  'banner_url': 'https://cinema.momocdn.net/convert-webp/img/154903476143772777-PosterTHAMTUKIEN2compressed.jpg?size=M',
  'poster_url': 'https://cinema.momocdn.net/convert-webp/img/154903476143772777-PosterTHAMTUKIEN2compressed.jpg?size=M',
  'trailer_url': '',
  'duration': 132,
  'release_date': 'Tháng 10/2026',
  'genre': 'Hành động, Phiêu lưu',
  'rating_point': 9.5,
  'rating_count': 890,
  'age_rating': 'C13',
  'formats': ['2D Phụ đề'],
  'synopsis': 'Siêu phẩm điện ảnh được mong đợi nhất sắp đổ bộ các rạp chiếu phim trên toàn quốc.',
  'tags': ['Bom tấn', 'Sắp chiếu', 'Được mong chờ'],
  'status': 'soon'}]

SHOWTIMES_DATA = [
    {
        "id": "st-cgv-lm81-1-0930",
        "movie_id": 25051,
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
        "movie_id": 25051,
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
        "movie_id": 25051,
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
        "movie_id": 25051,
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
        "movie_id": 25074,
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
        "movie_id": 25074,
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
        "movie_id": 25074,
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
        "movie_id": 25051,
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
        "movie_id": 25051,
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
        "movie_id": 25134,
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
        "movie_id": 25086,
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
        "movie_id": 25090,
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
        "movie_id": 25051,
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
BOOKINGS_STORE: List[Dict[str, Any]] = []

# Track reserved seats per showtime in memory: { showtime_id: set([seat_codes]) }
RESERVED_SEATS_MAP: Dict[str, set] = {}
# Serialize seat checks and reservations within this backend process. The SQL
# UNIQUE constraint remains the cross-process guard when PostgreSQL is enabled.
BOOKING_LOCK = threading.RLock()

import json
PERSISTENCE_FILE = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "persistent_storage.json"))

def load_persistent_state():
    global RESERVED_SEATS_MAP, BOOKINGS_STORE
    if os.path.exists(PERSISTENCE_FILE):
        try:
            with open(PERSISTENCE_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                reserved = data.get("reserved_seats_map", {})
                for k, v in reserved.items():
                    if k not in RESERVED_SEATS_MAP:
                        RESERVED_SEATS_MAP[k] = set()
                    RESERVED_SEATS_MAP[k].update(v)
                stored_bookings = data.get("bookings_store", [])
                for b in stored_bookings:
                    if not any(existing.get("booking_code") == b.get("booking_code") for existing in BOOKINGS_STORE):
                        BOOKINGS_STORE.append(b)
        except Exception as e:
            print(f"[PERSISTENCE] Error loading persistent state: {e}")

def save_persistent_state():
    try:
        data = {
            "reserved_seats_map": {k: list(v) for k, v in RESERVED_SEATS_MAP.items()},
            "bookings_store": BOOKINGS_STORE
        }
        with open(PERSISTENCE_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"[PERSISTENCE] Error saving persistent state: {e}")

# Load existing state on import
load_persistent_state()

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
                    cur.execute("SELECT to_regclass('public.bookings') AS bookings_table")
                    schema_exists = bool(cur.fetchone()["bookings_table"])
                    if not schema_exists:
                        with open(sql_path, "r", encoding="utf-8") as f:
                            cur.execute(f.read())
                    conn.commit()
                conn.close()
                if schema_exists:
                    print("[DATABASE] Schema đã tồn tại; giữ nguyên dữ liệu PostgreSQL hiện có.")
                    return True
                print(f"[DATABASE] Đã nạp thành công database.sql vào PostgreSQL tại {DATABASE_URL}")
                return True
        except Exception as e:
            print(f"[DATABASE] Lỗi nạp database.sql: {e}")
    return False
