import { Movie, CineplexBrand, CinemaTheater, City, ComboItem } from '../types/cinema';

export const CINEPLEX_BRANDS: CineplexBrand[] = [
  {
    "id": 0,
    "name": "Tất cả",
    "code": "ALL",
    "logo": "https://homepage.momocdn.net/next-js/_next/static/public/cinema/dexuat-icon.svg",
    "tag": ""
  },
  {
    "id": 6,
    "name": "CGV",
    "code": "CGV",
    "logo": "https://homepage.momocdn.net/cinema/momo-amazone-s3-api-240829164527-638605467276820522.png",
    "tag": "79K",
    "slogan": "Hệ thống rạp chiếu phim lớn nhất Việt Nam"
  },
  {
    "id": 8,
    "name": "Lotte Cinema",
    "code": "LOTTE",
    "logo": "https://homepage.momocdn.net/blogscontents/momo-upload-api-210604170617-637584231772974269.png",
    "tag": "89K",
    "slogan": "Điện ảnh đỉnh cao, dịch vụ tận tâm"
  },
  {
    "id": 9,
    "name": "Galaxy Cinema",
    "code": "GALAXY",
    "logo": "https://homepage.momocdn.net/cinema/momo-upload-api-211123095138-637732578984425272.png",
    "tag": "69K",
    "slogan": "Mang cả thế giới giải trí đến bạn"
  },
  {
    "id": 3,
    "name": "BHD Star",
    "code": "BHD",
    "logo": "https://homepage.momocdn.net/blogscontents/momo-upload-api-210604170453-637584230934981809.png",
    "tag": "75K",
    "slogan": "Rạp chiếu phim chuẩn quốc tế"
  },
  {
    "id": 10,
    "name": "Beta Cinemas",
    "code": "BETA",
    "logo": "https://homepage.momocdn.net/cinema/momo-upload-api-210813104719-637644484394328824.png",
    "tag": "50K",
    "slogan": "Rạp phim giá tốt cho mọi người"
  },
  {
    "id": 5,
    "name": "Cinestar",
    "code": "CINESTAR",
    "logo": "https://homepage.momocdn.net/blogscontents/momo-upload-api-210604170530-637584231309495829.png",
    "tag": "45K",
    "slogan": "Trải nghiệm điện ảnh sinh viên & giới trẻ"
  },
  {
    "id": 4,
    "name": "Mega GS",
    "code": "MEGA_GS",
    "logo": "https://homepage.momocdn.net/blogscontents/momo-upload-api-210604170511-637584231119272266.png",
    "tag": "65K",
    "slogan": "Công nghệ âm thanh sống động"
  },
  {
    "id": 20,
    "name": "Trung Tâm Chiếu Phim Quốc Gia (NCC)",
    "code": "NCC",
    "logo": "https://homepage.momocdn.net/cinema/ncclogo-260325100933.png",
    "tag": "60K",
    "slogan": "Địa chỉ điện ảnh tin cậy tại Thủ đô"
  },
  {
    "id": 7,
    "name": "DCINE",
    "code": "DCINE",
    "logo": "https://img.mservice.io/momo_app_v2/new_version/img/THAO.MAI/DcineLogo.png",
    "tag": "",
    "slogan": "Không gian điện ảnh sang trọng"
  },
  {
    "id": 17,
    "name": "Starlight",
    "code": "STARLIGHT",
    "logo": "https://cinema.momocdn.net/XS/starlight/image.png",
    "tag": "",
    "slogan": "Thắp sáng niềm vui điện ảnh"
  }
];

export const CITIES: City[] = [
  {
    "id": 1,
    "name": "Hồ Chí Minh",
    "code": "HCM",
    "isPopular": true
  },
  {
    "id": 2,
    "name": "Hà Nội",
    "code": "HN",
    "isPopular": true
  },
  {
    "id": 3,
    "name": "Đà Nẵng",
    "code": "DN",
    "isPopular": true
  },
  {
    "id": 4,
    "name": "Bình Dương",
    "code": "BD",
    "isPopular": true
  },
  {
    "id": 5,
    "name": "Hải Phòng",
    "code": "HP",
    "isPopular": true
  },
  {
    "id": 6,
    "name": "Cần Thơ",
    "code": "CT",
    "isPopular": true
  },
  {
    "id": 7,
    "name": "Đồng Nai",
    "code": "DNA",
    "isPopular": false
  },
  {
    "id": 8,
    "name": "Khánh Hòa (Nha Trang)",
    "code": "KH",
    "isPopular": false
  },
  {
    "id": 9,
    "name": "Bà Rịa - Vũng Tàu",
    "code": "VT",
    "isPopular": false
  },
  {
    "id": 10,
    "name": "Thừa Thiên Huế",
    "code": "HUE",
    "isPopular": false
  },
  {
    "id": 11,
    "name": "Quảng Ninh",
    "code": "QN",
    "isPopular": false
  },
  {
    "id": 12,
    "name": "Lâm Đồng (Đà Lạt)",
    "code": "DL",
    "isPopular": false
  }
];

export const CINEMA_THEATERS: CinemaTheater[] = [
  {
    "id": 101,
    "brandCode": "CGV",
    "name": "CGV Vincom Đồng Khởi",
    "address": "Tầng 3, TTTM Vincom Center, 72 Lê Thánh Tôn, Bến Nghé, Quận 1, TP.HCM",
    "cityId": 1,
    "cityName": "Hồ Chí Minh",
    "distance": "1.2 km",
    "rating": 4.9,
    "reviewCount": 3420
  },
  {
    "id": 102,
    "brandCode": "CGV",
    "name": "CGV Hùng Vương Plaza",
    "address": "Tầng 7, 126 Hồng Bàng, Phường 12, Quận 5, TP.HCM",
    "cityId": 1,
    "cityName": "Hồ Chí Minh",
    "distance": "3.5 km",
    "rating": 4.8,
    "reviewCount": 2890
  },
  {
    "id": 103,
    "brandCode": "CGV",
    "name": "CGV Sư Vạn Hạnh",
    "address": "Tầng 6, Vạn Hạnh Mall, 11 Sư Vạn Hạnh, Phường 12, Quận 10, TP.HCM",
    "cityId": 1,
    "cityName": "Hồ Chí Minh",
    "distance": "2.8 km",
    "rating": 4.9,
    "reviewCount": 4150
  },
  {
    "id": 104,
    "brandCode": "CGV",
    "name": "CGV Landmark 81",
    "address": "Tầng B1, Vincom Center Landmark 81, 720A Điện Biên Phủ, Bình Thạnh, TP.HCM",
    "cityId": 1,
    "cityName": "Hồ Chí Minh",
    "distance": "4.1 km",
    "rating": 4.9,
    "reviewCount": 5230
  },
  {
    "id": 105,
    "brandCode": "CGV",
    "name": "CGV Crescent Mall",
    "address": "Tầng 5, Crescent Mall, Đại lộ Nguyễn Văn Linh, Phú Mỹ Hưng, Quận 7, TP.HCM",
    "cityId": 1,
    "cityName": "Hồ Chí Minh",
    "distance": "5.6 km",
    "rating": 4.7,
    "reviewCount": 2140
  },
  {
    "id": 201,
    "brandCode": "LOTTE",
    "name": "Lotte Cinema Nam Sài Gòn",
    "address": "Tầng 3, Lotte Mart, 469 Nguyễn Hữu Thọ, Tân Hưng, Quận 7, TP.HCM",
    "cityId": 1,
    "cityName": "Hồ Chí Minh",
    "distance": "4.2 km",
    "rating": 4.8,
    "reviewCount": 1980
  },
  {
    "id": 202,
    "brandCode": "LOTTE",
    "name": "Lotte Cinema Gò Vấp",
    "address": "Tầng 3, Lotte Mart Gò Vấp, 242 Nguyễn Văn Lượng, Phường 10, Gò Vấp, TP.HCM",
    "cityId": 1,
    "cityName": "Hồ Chí Minh",
    "distance": "6.8 km",
    "rating": 4.7,
    "reviewCount": 1650
  },
  {
    "id": 203,
    "brandCode": "LOTTE",
    "name": "Lotte Cinema Nowzone",
    "address": "Tầng 5, TTTM Nowzone, 235 Nguyễn Văn Cừ, Phường 4, Quận 5, TP.HCM",
    "cityId": 1,
    "cityName": "Hồ Chí Minh",
    "distance": "2.1 km",
    "rating": 4.7,
    "reviewCount": 2100
  },
  {
    "id": 301,
    "brandCode": "GALAXY",
    "name": "Galaxy Nguyễn Du",
    "address": "116 Nguyễn Du, Phường Bến Thành, Quận 1, TP.HCM",
    "cityId": 1,
    "cityName": "Hồ Chí Minh",
    "distance": "0.9 km",
    "rating": 4.8,
    "reviewCount": 3780
  },
  {
    "id": 302,
    "brandCode": "GALAXY",
    "name": "Galaxy Tân Bình",
    "address": "246 Nguyễn Hồng Đào, Phường 14, Tân Bình, TP.HCM",
    "cityId": 1,
    "cityName": "Hồ Chí Minh",
    "distance": "5.2 km",
    "rating": 4.6,
    "reviewCount": 1940
  },
  {
    "id": 303,
    "brandCode": "GALAXY",
    "name": "Galaxy Quang Trung",
    "address": "Lầu 3, Co.opMart Quang Trung, 304A Quang Trung, Phường 11, Gò Vấp, TP.HCM",
    "cityId": 1,
    "cityName": "Hồ Chí Minh",
    "distance": "7.1 km",
    "rating": 4.6,
    "reviewCount": 1580
  },
  {
    "id": 401,
    "brandCode": "BHD",
    "name": "BHD Star Bitexco",
    "address": "Tầng 3 & 4, Bitexco Financial Tower, 2 Hải Triều, Bến Nghé, Quận 1, TP.HCM",
    "cityId": 1,
    "cityName": "Hồ Chí Minh",
    "distance": "1.0 km",
    "rating": 4.8,
    "reviewCount": 2890
  },
  {
    "id": 402,
    "brandCode": "BHD",
    "name": "BHD Star 3/2",
    "address": "Tầng 5, Siêu thị Vincom 3/2, 3C Đường 3/2, Phường 11, Quận 10, TP.HCM",
    "cityId": 1,
    "cityName": "Hồ Chí Minh",
    "distance": "2.7 km",
    "rating": 4.7,
    "reviewCount": 2340
  },
  {
    "id": 501,
    "brandCode": "BETA",
    "name": "Beta Cinemas Quang Trung",
    "address": "645 Quang Trung, Phường 11, Gò Vấp, TP.HCM",
    "cityId": 1,
    "cityName": "Hồ Chí Minh",
    "distance": "7.5 km",
    "rating": 4.6,
    "reviewCount": 1220
  },
  {
    "id": 601,
    "brandCode": "CINESTAR",
    "name": "Cinestar Quốc Thanh",
    "address": "271 Nguyễn Trãi, Phường Nguyễn Cư Trinh, Quận 1, TP.HCM",
    "cityId": 1,
    "cityName": "Hồ Chí Minh",
    "distance": "1.5 km",
    "rating": 4.7,
    "reviewCount": 3120
  },
  {
    "id": 701,
    "brandCode": "MEGA_GS",
    "name": "Mega GS Cao Thắng",
    "address": "Tầng 6-7, 19 Cao Thắng, Phường 2, Quận 3, TP.HCM",
    "cityId": 1,
    "cityName": "Hồ Chí Minh",
    "distance": "1.8 km",
    "rating": 4.7,
    "reviewCount": 1480
  },
  {
    "id": 801,
    "brandCode": "CGV",
    "name": "CGV Vincom Center Bà Triệu",
    "address": "Tầng 6, Vincom Center Hà Nội, 191 Bà Triệu, Hai Bà Trưng, Hà Nội",
    "cityId": 2,
    "cityName": "Hà Nội",
    "distance": "1.4 km",
    "rating": 4.9,
    "reviewCount": 4200
  },
  {
    "id": 802,
    "brandCode": "CGV",
    "name": "CGV Aeon Long Biên",
    "address": "Tầng 4, TTTM AEON Mall Long Biên, 27 Cổ Linh, Long Biên, Hà Nội",
    "cityId": 2,
    "cityName": "Hà Nội",
    "distance": "5.8 km",
    "rating": 4.8,
    "reviewCount": 3150
  },
  {
    "id": 803,
    "brandCode": "NCC",
    "name": "Trung Tâm Chiếu Phim Quốc Gia",
    "address": "87 Láng Hạ, Thành Công, Ba Đình, Hà Nội",
    "cityId": 2,
    "cityName": "Hà Nội",
    "distance": "2.2 km",
    "rating": 4.9,
    "reviewCount": 6700
  },
  {
    "id": 804,
    "brandCode": "LOTTE",
    "name": "Lotte Cinema Landmark Hà Nội",
    "address": "Tầng 5, Keangnam Hanoi Landmark Tower, Mễ Trì, Nam Từ Liêm, Hà Nội",
    "cityId": 2,
    "cityName": "Hà Nội",
    "distance": "4.3 km",
    "rating": 4.8,
    "reviewCount": 2890
  },
  {
    "id": 805,
    "brandCode": "BHD",
    "name": "BHD Star Vincom Phạm Ngọc Thạch",
    "address": "Tầng 8, TTTM Vincom, 2 Phạm Ngọc Thạch, Đống Đa, Hà Nội",
    "cityId": 2,
    "cityName": "Hà Nội",
    "distance": "2.0 km",
    "rating": 4.8,
    "reviewCount": 2400
  },
  {
    "id": 806,
    "brandCode": "BETA",
    "name": "Beta Cinemas Mỹ Đình",
    "address": "Tầng hầm B1, Tòa nhà Golden Palace, Mễ Trì, Nam Từ Liêm, Hà Nội",
    "cityId": 2,
    "cityName": "Hà Nội",
    "distance": "5.1 km",
    "rating": 4.6,
    "reviewCount": 1890
  },
  {
    "id": 901,
    "brandCode": "CGV",
    "name": "CGV Vincom Đà Nẵng",
    "address": "Tầng 4, TTTM Vincom Plaza Ngô Quyền, 910A Ngô Quyền, Sơn Trà, Đà Nẵng",
    "cityId": 3,
    "cityName": "Đà Nẵng",
    "distance": "1.5 km",
    "rating": 4.8,
    "reviewCount": 2750
  },
  {
    "id": 902,
    "brandCode": "LOTTE",
    "name": "Lotte Cinema Đà Nẵng",
    "address": "Tầng 5, Lotte Mart Đà Nẵng, 6 Nại Nam, Hòa Cường Bắc, Hải Châu, Đà Nẵng",
    "cityId": 3,
    "cityName": "Đà Nẵng",
    "distance": "3.2 km",
    "rating": 4.7,
    "reviewCount": 1930
  },
  {
    "id": 903,
    "brandCode": "GALAXY",
    "name": "Galaxy Đà Nẵng",
    "address": "Tầng 3, Coop Mart Đà Nẵng, 478 Điện Biên Phủ, Thanh Khê, Đà Nẵng",
    "cityId": 3,
    "cityName": "Đà Nẵng",
    "distance": "2.4 km",
    "rating": 4.7,
    "reviewCount": 1640
  }
];

export const MOVIES_NOW: Movie[] = [
  {
    "id": 25051,
    "title": "Lên Hương",
    "titleEn": "A 'Good' Best Luck",
    "bannerUrl": "https://cinema.momocdn.net/img/35672561412059349-d0485845080ee150b81f.jpg?size=M",
    "posterUrl": "https://cinema.momocdn.net/convert-webp/img/169975628854232523-lhfinal.png?size=SM",
    "trailerUrl": "https://www.youtube.com/embed/ZImBtmy3XrA",
    "duration": 120,
    "releaseDate": "2026-09-14",
    "genre": "Hài, Gay Cấn",
    "ratingPoint": 9.3,
    "ratingCount": 4647,
    "ageRating": "C16",
    "formats": [
      "2D Phụ đề",
      "2D Lồng tiếng"
    ],
    "synopsis": "Một bà chủ của trại hòm ế ẩm và một thanh niên cần tiền trang trải cuộc sống đã vô tình mắc vào một “giao kèo định mệnh\". Một người cố giữ nghề, một người cố cứu mạng người mẹ đang bệnh nặng, mở ra bí mật về món nợ đã chôn vùi suốt nhiều năm.",
    "director": "Đạo diễn hàng đầu Việt Nam",
    "cast": "Dàn diễn viên điện ảnh nổi tiếng",
    "tags": [
      "Tuyệt vời",
      "Cảm động",
      "Khóc trôi rạp",
      "Đáng xem"
    ],
    "isHot": true,
    "status": "now"
  },
  {
    "id": 25074,
    "title": "Út Lan 2",
    "titleEn": "Ut Lan 2",
    "bannerUrl": "https://image-fworker.momocdn.net/momo-external/9ec3a8ed7c3f49896fb1d8350efb601c9d7179e727e6716ce84c6a78a68a0008?size=M",
    "posterUrl": "https://cinema.momocdn.net/convert-webp/img/597581002775594-utlan2.jpg?size=SM",
    "trailerUrl": "https://www.youtube.com/embed/-Zp2SAZSULg",
    "duration": 107,
    "releaseDate": "2026-09-21",
    "genre": "Kinh Dị",
    "ratingPoint": 8.3,
    "ratingCount": 2259,
    "ageRating": "C18",
    "formats": [
      "2D Phụ đề",
      "IMAX 2D"
    ],
    "synopsis": "Từ lúc một con rắn hai đầu xuất hiện, ngôi làng ven sông liên tiếp xảy ra những cái chết bí ẩn. Khi những bí mật bị lãng quên dần trồi lên mặt nước, người dân nhận ra có những lời nguyền chưa bao giờ thực sự biến mất.",
    "director": "Đạo diễn hàng đầu Việt Nam",
    "cast": "Dàn diễn viên điện ảnh nổi tiếng",
    "tags": [
      "Tuyệt vời",
      "Hài lòng",
      "Giải trí",
      "Khóc trôi rạp"
    ],
    "isHot": true,
    "status": "now"
  },
  {
    "id": 25134,
    "title": "Avengers: Hồi Kết - Phiên Bản Đặc Biệt (Chiếu lại)",
    "titleEn": "Avengers: Endgame Encore",
    "bannerUrl": "https://image-fworker.momocdn.net/momo-external/2f5c6574f64b9755792b09391e268d3c6f427d90980156d4c82658f47e588f55?size=M",
    "posterUrl": "https://image-fworker.momocdn.net/momo-external/5ae579829a348a0fa937aa4c198e125efa985ce1c5ff6787e71de813ed451e52?size=M",
    "trailerUrl": "https://www.youtube.com/embed/XsDQf4EsZIs",
    "duration": 180,
    "releaseDate": "2026-09-25",
    "genre": "Khoa Học Viễn Tưởng, Phiêu Lưu, Hành Động",
    "ratingPoint": 10.0,
    "ratingCount": 40,
    "ageRating": "C13",
    "formats": [
      "2D Phụ đề",
      "2D Lồng tiếng"
    ],
    "synopsis": "Phần kết hoành tráng của Infinity Saga sẽ trở lại rạp chiếu với Avengers: Hồi Kết - Phiên Bản Đặc Biệt vào ngày 25/09/2026. Sau những sự kiện thảm khốc khiến một nửa dân số thế giới biến mất, những người hùng còn lại phải vật lộn để tiếp tục cuộc sống. Cuối cùng, họ buộc phải hợp sức để khôi phục trật tự và sự cân bằng cho vũ trụ, đồng thời đưa những người thân yêu trở về trong cuộc đối đầu đầy kịch tính với Thanos.",
    "director": "Đạo diễn hàng đầu Việt Nam",
    "cast": "Dàn diễn viên điện ảnh nổi tiếng",
    "tags": [
      "Hài hước",
      "Cảm động",
      "Đáng xem",
      "Ý nghĩa"
    ],
    "isHot": true,
    "status": "now"
  },
  {
    "id": 25086,
    "title": "Bát Tiên! Truy Tìm Lưu Ly Đăng",
    "titleEn": "All Wishes Come True",
    "bannerUrl": "https://image-fworker.momocdn.net/momo-external/0a329bb9920415b74c0ab04321ef91bb16d2a7a552187d893a37a2663842922f?size=M",
    "posterUrl": "https://cinema.momocdn.net/convert-webp/img/66354116138203447-batien.png?size=SM",
    "trailerUrl": "https://www.youtube.com/embed/eulRjLDwNVw",
    "duration": 143,
    "releaseDate": "2026-09-11",
    "genre": "Hài, Hoạt Hình, Giả Tượng, Phiêu Lưu",
    "ratingPoint": 9.8,
    "ratingCount": 447,
    "ageRating": "C13",
    "formats": [
      "2D Phụ đề",
      "IMAX 2D"
    ],
    "synopsis": "Tám phàm nhân với tám giấc mộng đổi đời đã thực hiện một phi vụ liều lĩnh: đột nhập chốn Bồng Lai để đánh cắp bảo vật. Những tưởng trộm được bảo vật của Tam Tinh là có thể giúp họ một bước đổi vận, nhưng cả nhóm lại vô tình bị cuốn vào âm mưu đen tối chốn Thiên Đình. Khi bí mật dần hé lộ và kẻ thù thực sự xuất hiện, tám con người \"chẳng có thần thông cũng không mang pháp lực\" buộc phải đối đầu với vị thần tiên đầy quyền năng. Từ những kẻ vô danh chỉ muốn thay đổi số phận, họ bất đắc dĩ trở thành những người nắm giữ vận mệnh Tam Giới. Hành trình hài hước về những con người bé nhỏ dám làm nên chuyện lớn đã đưa Bát Tiên! Truy Tìm Lưu Ly Đăng trở thành phim hoạt hình Trung Quốc có doanh thu cao nhất năm 2026 và lọt top 4 phim hoạt hình có doanh thu phòng vé cao nhất mọi thời đại. ",
    "director": "Đạo diễn hàng đầu Việt Nam",
    "cast": "Dàn diễn viên điện ảnh nổi tiếng",
    "tags": [
      "Tuyệt vời",
      "Hài lòng",
      "Cảm động",
      "Hài hước"
    ],
    "isHot": true,
    "status": "now"
  },
  {
    "id": 25090,
    "title": "Bóng Ma Nhà Hát",
    "titleEn": "Bóng Ma Nhà Hát",
    "bannerUrl": "https://cinema.momocdn.net/img/39484159312365961-bmnh.jpg?size=M",
    "posterUrl": "https://image-fworker.momocdn.net/momo-external/df53e189c578c86d986c88ac565d031d37d753f3f5dff4fe7bb86cbbd954b7b0?size=M",
    "trailerUrl": "https://www.youtube.com/embed/JVIvl_ux298",
    "duration": 97,
    "releaseDate": "2026-09-18",
    "genre": "Hài, Kinh Dị",
    "ratingPoint": 8.5,
    "ratingCount": 431,
    "ageRating": "C16",
    "formats": [
      "2D Phụ đề",
      "2D Lồng tiếng"
    ],
    "synopsis": "Tuấn, một chuyên viên bất động sản đầy tham vọng, được giao nhiệm vụ vực dậy một nhà hát cũ trong vòng một tháng để giữ vững sự nghiệp. Tại đây, anh phát hiện nơi này bị ám bởi Nhã – một nữ diễn viên chết oan chưa thể siêu thoát. Nhờ tài marketing, Tuấn và người cộng sự đã giúp nhà hát nhanh chóng cháy vé, nhưng sự xuất hiện của Phong - tình cũ của Nhã khiến mọi chuyện đảo lộn. Tưởng như mất tất cả, nhưng Tuấn đã cùng tất cả mọi người trong nhà hát tạo nên một thương vụ thế kỷ giữa người và ma và cứu lấy Nhà Hát Vàng Son.",
    "director": "Đạo diễn hàng đầu Việt Nam",
    "cast": "Dàn diễn viên điện ảnh nổi tiếng",
    "tags": [
      "Tuyệt vời",
      "Hài lòng",
      "Cảm động",
      "Hài hước"
    ],
    "isHot": false,
    "status": "now"
  },
  {
    "id": 24991,
    "title": "Trại Buôn Người",
    "titleEn": "Trại Buôn Người",
    "bannerUrl": "https://cinema.momocdn.net/img/74805855983673840-tbn1.jpg?size=M",
    "posterUrl": "https://cinema.momocdn.net/convert-webp/img/867383626301392-tbnpo.jpg?size=SM",
    "trailerUrl": "https://www.youtube.com/embed/nlFar2vq4Yo",
    "duration": 135,
    "releaseDate": "2026-09-25",
    "genre": "Hành Động, Gay Cấn",
    "ratingPoint": 9.0,
    "ratingCount": 1500,
    "ageRating": "C18",
    "formats": [
      "2D Phụ đề",
      "IMAX 2D"
    ],
    "synopsis": "Vì cứu em gái sa bẫy buôn người ở biên giới miền Tây, Ny (Steven Nguyễn) cùng bạn thân bị bắt làm nô dịch trong sào huyệt lừa đảo tàn bạo. Tại đây, họ cùng các trinh sát nằm vùng và các nạn nhân hứng chịu bi kịch thể xác âm thầm lập kế hoạch trốn thoát.\n",
    "director": "Đạo diễn hàng đầu Việt Nam",
    "cast": "Dàn diễn viên điện ảnh nổi tiếng",
    "tags": [
      "Hài hước",
      "Cảm động",
      "Đáng xem",
      "Ý nghĩa"
    ],
    "isHot": false,
    "status": "now"
  },
  {
    "id": 25135,
    "title": "Vùng Đất Quỷ Dữ",
    "titleEn": "Resident Evil",
    "bannerUrl": "https://image-fworker.momocdn.net/momo-external/e52642e96de77bc98f0f68f98fcde417fee2abefb4d2f604776488a6aa9ac1d6?size=M",
    "posterUrl": "https://cinema.momocdn.net/convert-webp/img/601095563808280-470x700-residentevil_1.jpg?size=SM",
    "trailerUrl": "https://www.youtube.com/embed/mNd1gb19A-c",
    "duration": 94,
    "releaseDate": "2026-09-18",
    "genre": "Kinh Dị, Phiêu Lưu, Gay Cấn",
    "ratingPoint": 8.0,
    "ratingCount": 548,
    "ageRating": "C18",
    "formats": [
      "2D Phụ đề",
      "2D Lồng tiếng"
    ],
    "synopsis": "Một phiên bản Resident Evil mới trở lại đầy kịch tính và kinh hoàng từ bộ óc quái kiệt của đạo diễn Zach Cregger đứng sau “Weapons” & “Barbarian”. Với cốt truyện hoàn toàn mới, phim xoay quanh Bryan (Austin Abrams), một nhân viên vận chuyển vật tư y tế vô tình bị cuốn vào cuộc chạy đua sinh tồn nghẹt thở và dồn dập trong một đêm định mệnh. Liên tiếp chuyện kinh hoàng bất ngờ đẩy anh vào giữa vòng xoáy hỗn loạn.",
    "director": "Đạo diễn hàng đầu Việt Nam",
    "cast": "Dàn diễn viên điện ảnh nổi tiếng",
    "tags": [
      "Tuyệt vời",
      "Hài lòng",
      "Hài hước",
      "Giải trí"
    ],
    "isHot": false,
    "status": "now"
  },
  {
    "id": 25101,
    "title": "Yêu Nhân Thần Thám: Kỳ Án Trường An",
    "titleEn": "Demon Agent",
    "bannerUrl": "https://image-fworker.momocdn.net/momo-external/7444124e2e7a59aef713d065758f63f99be6678c57150f106ec043381f895bcd?size=M",
    "posterUrl": "https://image-fworker.momocdn.net/momo-external/9be95ba03ac39d2f2b1fe09f9f44da87ad7feeb75cc97e2a729393f50d03754d?size=M",
    "trailerUrl": "https://www.youtube.com/embed/-f9pxNdJ8K8",
    "duration": 116,
    "releaseDate": "2026-09-18",
    "genre": "Hài, Hoạt Hình, Bí Ẩn",
    "ratingPoint": 9.9,
    "ratingCount": 131,
    "ageRating": "K",
    "formats": [
      "2D Phụ đề",
      "IMAX 2D"
    ],
    "synopsis": "Giữa Trường An tráng lệ và kỳ ảo dưới triều Đường, nơi những cỗ máy cơ khí tinh xảo hòa quyện cùng mái ngói cong vút, con người và yêu quái cùng chung sống. Địch Thiếu, thiếu niên thiên tài luôn mơ ước trở thành “Đại Thám Tử Số Một Trường An”, sở hữu khả năng suy luận sắc bén cùng tài ăn nói hơn người. Đồng hành cùng cậu là A Sa, tân binh yêu sói của đội tuần tra, giỏi võ nhưng mang trong mình trái tim lương thiện. Một vụ án mạng bí ẩn bất ngờ khiến đôi oan gia này phải hợp tác. Vừa đấu khẩu, vừa phối hợp phá án, cả hai dấn thân vào hành trình điều tra đầy bất ngờ và hiểm nguy. Khi mọi manh mối đều dẫn về trung tâm Trường An, liệu họ có thể bảo vệ sự bình yên của thành? Và đằng sau vẻ phồn hoa của Trường An đang ẩn giấu bí mật kinh thiên động địa nào?",
    "director": "Đạo diễn hàng đầu Việt Nam",
    "cast": "Dàn diễn viên điện ảnh nổi tiếng",
    "tags": [
      "Hài hước",
      "Cười banh rạp",
      "Cảm động",
      "Siêu phẩm"
    ],
    "isHot": false,
    "status": "now"
  },
  {
    "id": 25097,
    "title": "Mãi Nợ Một Lời Tạm Biệt",
    "titleEn": "Mãi Nợ Một Lời Tạm Biệt",
    "bannerUrl": "https://image-fworker.momocdn.net/momo-external/3a96ec3d52278215031f5a1400e1c03a21270e5f4960bee02930cb3d68fb8b96?size=M",
    "posterUrl": "https://cinema.momocdn.net/convert-webp/img/169449281826614607-m_i_n_m_t_l_i_t_m_bi_t_-_d_ki_n_kh_i_chi_u_11.09.2026_-_kt_chu_n.jpg?size=SM",
    "trailerUrl": "https://www.youtube.com/embed/OYA30XqHg94",
    "duration": 120,
    "releaseDate": "2026-09-11",
    "genre": "Phiêu Lưu, Chính Kịch",
    "ratingPoint": 7.9,
    "ratingCount": 246,
    "ageRating": "K",
    "formats": [
      "2D Phụ đề",
      "2D Lồng tiếng"
    ],
    "synopsis": "Những khu chợ, xóm nhỏ và nhịp sống bình dị của Việt Nam những năm 1970 hiện lên qua tuổi thơ của Cu Đen (Uy Nhân) bên bà Nội (Kiều Chinh), tạo nên những thước phim đầu tiên vừa gần gũi vừa giàu chất điện ảnh.  Thế nhưng, những ngày tháng bình yên nhanh chóng bị cắt ngang bởi biến động những năm 1970. Khoảnh khắc hai bà cháu phải chia xa trở thành một mảnh ký ức theo Cu Đen trên hành trình trưởng thành, mở ra câu chuyện về tình thân, nguồn cội và những điều chưa thể nói lời tạm biệt.",
    "director": "Đạo diễn hàng đầu Việt Nam",
    "cast": "Dàn diễn viên điện ảnh nổi tiếng",
    "tags": [
      "Ý nghĩa",
      "Đồng cảm",
      "Đáng suy ngẫm",
      "Tuyệt vời"
    ],
    "isHot": false,
    "status": "now"
  },
  {
    "id": 25102,
    "title": "Bùa Yêu: Bí Mật Gia Tộc",
    "titleEn": "Practical Magic 2",
    "bannerUrl": "https://image-fworker.momocdn.net/momo-external/4e8245d7cb1f3512e546aa3c97658c48468ae22955e091dfc3ee0ea24c16b6d9?size=M",
    "posterUrl": "https://image-fworker.momocdn.net/momo-external/6d3b03cebe370d99172b062745a63ac248b6f575c2d9c468b96127156172b334?size=M",
    "trailerUrl": "https://www.youtube.com/embed/Ho10_4IX1jE",
    "duration": 130,
    "releaseDate": "2026-09-11",
    "genre": "Hài, Giả Tượng, Lãng Mạn",
    "ratingPoint": 7.6,
    "ratingCount": 15,
    "ageRating": "C13",
    "formats": [
      "2D Phụ đề",
      "IMAX 2D"
    ],
    "synopsis": "Bùa Yêu: Bí Mật Gia Tộc đưa khán giả đến thế giới phép thuật đầy mê hoặc, nơi những bí ẩn dưới ánh trăng và sức mạnh ma thuật gia truyền vẫn luôn hiện hữu. Lần này, hai chị em nhà Owens phải cùng nhau đối mặt với một lời nguyền đen tối đang đe dọa chia cắt gia đình mãi mãi.",
    "director": "Đạo diễn hàng đầu Việt Nam",
    "cast": "Dàn diễn viên điện ảnh nổi tiếng",
    "tags": [
      "Tuyệt vời",
      "Hài lòng",
      "Hài hước",
      "Giải trí"
    ],
    "isHot": false,
    "status": "now"
  },
  {
    "id": 25087,
    "title": "SOOBIN LIVE CONCERT MOVIE: ALL-ROUNDER",
    "titleEn": "SOOBIN LIVE CONCERT MOVIE: ALL-ROUNDER",
    "bannerUrl": "https://cinema.momocdn.net/img/66351554835506935-640X310.png?size=M",
    "posterUrl": "https://cinema.momocdn.net/convert-webp/img/66351503340702034-soobinconcert.jpg?size=SM",
    "trailerUrl": "https://www.youtube.com/embed/ZImBtmy3XrA",
    "duration": 109,
    "releaseDate": "2026-09-10",
    "genre": "Hành động, Hài",
    "ratingPoint": 9.8,
    "ratingCount": 105,
    "ageRating": "C13",
    "formats": [
      "2D Phụ đề",
      "2D Lồng tiếng"
    ],
    "synopsis": "SOOBIN LIVE CONCERT MOVIE: ALL-ROUNDER là bộ phim âm nhạc đầu tiên của SOOBIN mang đến trải nghiệm điện ảnh chuẩn âm thanh vòm 7.1, tái hiện những khoảnh khắc thăng hoa từ chuỗi concert ALL-ROUNDER, cùng các màn trình diễn quy mô và những thước phim hậu trường chưa từng công bố. Bộ phim được ra mắt vào dịp sinh nhật SOOBIN, như một cột mốc đặc biệt trong hành trình nghệ thuật của anh. Đằng sau ánh đèn sân khấu là câu chuyện cham đến giấc mơ với sự nỗ lực, vượt qua giới hạn và chinh phục những chuẩn mực mới. Với thông điệp “THE ALL-ROUNDER IS ALL AROUND YOU”, SOOBIN gửi lời tri ân đến khán giả, đặc biệt là KINGDOM – những người luôn đồng hành và tiếp thêm động lực trên hành trình ấy. Bởi mỗi người đều có thể là một All-Rounder, ở bất cứ nơi đâu.",
    "director": "Đạo diễn hàng đầu Việt Nam",
    "cast": "Dàn diễn viên điện ảnh nổi tiếng",
    "tags": [
      "Tuyệt vời",
      "Hài lòng",
      "Cảm động",
      "Hài hước"
    ],
    "isHot": false,
    "status": "now"
  },
  {
    "id": 25083,
    "title": "Ma Tù",
    "titleEn": "Ghost in the Cell",
    "bannerUrl": "https://image-fworker.momocdn.net/momo-external/0f42867ed5a3f8c9c6159c5f9b577d8352b7d641c887d27ec5383e8efb069ce4?size=M",
    "posterUrl": "https://image-fworker.momocdn.net/momo-external/2338a62d9f4895f30e40500c7ecd1e7f514d399dbfc6bc8e4de7d9473a4209d6?size=M",
    "trailerUrl": "https://www.youtube.com/embed/otL78_pk_A0",
    "duration": 106,
    "releaseDate": "2026-09-04",
    "genre": "Hài, Kinh Dị, Gây Cấn",
    "ratingPoint": 9.0,
    "ratingCount": 525,
    "ageRating": "C18",
    "formats": [
      "2D Phụ đề",
      "IMAX 2D"
    ],
    "synopsis": "Một tù nhân bí ẩn xuất hiện trong một nhà tù khét tiếng bạo lực nhất Indonesia, mang theo một thực thể siêu nhiên chỉ săn lùng những kẻ có năng lượng tiêu cực. Để sống sót, các tù nhân buộc phải cùng nhau làm việc thiện nhằm xóa bỏ bóng tối trong tâm hồn. Hoặc chết từng người một.",
    "director": "Đạo diễn hàng đầu Việt Nam",
    "cast": "Dàn diễn viên điện ảnh nổi tiếng",
    "tags": [
      "Hài lòng",
      "Hài hước",
      "Cười banh rạp",
      "Đáng xem"
    ],
    "isHot": false,
    "status": "now"
  },
  {
    "id": 25138,
    "title": "Tế Nhi Cải Mệnh",
    "titleEn": "The Tao Exorcist",
    "bannerUrl": "https://cinema.momocdn.net/img/764569468113065-tn3.jpg?size=M",
    "posterUrl": "https://cinema.momocdn.net/convert-webp/img/764471700398079-tncm.jpg?size=SM",
    "trailerUrl": "https://www.youtube.com/embed/21kgF9MuxtE",
    "duration": 108,
    "releaseDate": "2026-09-18",
    "genre": "Kinh Dị",
    "ratingPoint": 7.3,
    "ratingCount": 70,
    "ageRating": "C18",
    "formats": [
      "2D Phụ đề",
      "2D Lồng tiếng"
    ],
    "synopsis": "Vì nợ cờ bạc chồng chất, Chấn Khải cùng vợ Nam Tương và gia đình buộc phải chuyển nhà để trốn chủ nợ. Trong bước đường cùng, anh tìm đến tà thuật cấm kỵ, thậm chí hiến tế vận mệnh của con trai để đổi lấy tiền bạc. Tiền vừa đến tay, tai họa cũng ập đến khi cả gia đình liên tiếp gặp những hiện tượng kinh hoàng. Một chàng trai có năng lực tâm linh phát hiện oán khí từ nghi lễ hiến tế, hé lộ bí mật đáng sợ phía sau. Nghi thức máu đã bắt đầu và tai kiếp giờ đây không thể tránh khỏi.",
    "director": "Đạo diễn hàng đầu Việt Nam",
    "cast": "Dàn diễn viên điện ảnh nổi tiếng",
    "tags": [
      "Tuyệt vời",
      "Siêu phẩm",
      "Đáng xem"
    ],
    "isHot": false,
    "status": "now"
  },
  {
    "id": 25100,
    "title": "Cổ Thuật Hắc Ngải",
    "titleEn": "Kong Tao",
    "bannerUrl": "https://homepage.momocdn.net/default/s/no-image-momo.jpg",
    "posterUrl": "https://cinema.momocdn.net/convert-webp/img/170060743393801020-poster.png?size=SM",
    "trailerUrl": "https://www.youtube.com/embed/ZImBtmy3XrA",
    "duration": 86,
    "releaseDate": "2026-09-11",
    "genre": "Phiêu Lưu, Gây Cấn",
    "ratingPoint": 5.7,
    "ratingCount": 164,
    "ageRating": "C16",
    "formats": [
      "2D Phụ đề",
      "IMAX 2D"
    ],
    "synopsis": "CỔ THUẬT HẮC NGẢI (Kong Tao – 蠱降) là bộ phim kinh dị hợp tác giữa Thái Lan và Malaysia, lấy cảm hứng từ những nghi thức trù ếm, bùa ngải và tà thuật hắc ám bí ẩn bậc nhất châu Á. Phim theo chân một nhóm YouTuber chuyên khám phá các hiện tượng siêu nhiên tại Thái Lan. Thế nhưng, một chuyến ghi hình tưởng chừng vô hại lại vô tình đánh thức lời nguyền chết chóc, buộc cả nhóm phải chạy đua với thời gian để tìm đến một pháp sư trước khi trở thành những nạn nhân tiếp theo. Đặc biệt, bộ phim đánh dấu màn lột xác của Kao Supassara – \"tình đầu Thái Lan\" – trong một vai diễn hoàn toàn mới, kết hợp cùng Philip Keung, hứa hẹn mang đến một siêu phẩm kinh dị nặng đô, đậm màu sắc tà thuật và văn hóa bùa ngải Đông Nam Á.",
    "director": "Đạo diễn hàng đầu Việt Nam",
    "cast": "Dàn diễn viên điện ảnh nổi tiếng",
    "tags": [
      "Tuyệt vời",
      "Đáng xem"
    ],
    "isHot": false,
    "status": "now"
  },
  {
    "id": 25085,
    "title": "HOPE: Vùng Tử Địa",
    "titleEn": "HOPE",
    "bannerUrl": "https://image-fworker.momocdn.net/momo-external/5f548dc37fcf9480294f4be4b6da65ec0e4c10262ba0ac4e394b682aff41edc5?size=M",
    "posterUrl": "https://image-fworker.momocdn.net/momo-external/4c452ba927ec056b1674b6a6faf265f64fc0d52105dabc21d109f09ce1480cf0?size=M",
    "trailerUrl": "https://www.youtube.com/embed/N45eWotaGxU",
    "duration": 157,
    "releaseDate": "2026-09-04",
    "genre": "Khoa Học Viễn Tưởng, Bí Ẩn, Hành Động",
    "ratingPoint": 7.2,
    "ratingCount": 936,
    "ageRating": "C16",
    "formats": [
      "2D Phụ đề",
      "2D Lồng tiếng"
    ],
    "synopsis": "Tại Hope Harbor, một ngôi làng hẻo lánh nằm gần khu vực phi quân sự, cảnh sát trưởng Bum-seok đã nhận được tin báo khẩn cấp từ người dân địa phương về sự xuất hiện của một con hổ. Khi cả ngôi làng chìm trong hoảng loạn, Bum-seok ngỡ ngàng khi phát hiện một sự thật nằm ngoài sức tưởng tượng của con người.",
    "director": "Đạo diễn hàng đầu Việt Nam",
    "cast": "Dàn diễn viên điện ảnh nổi tiếng",
    "tags": [
      "Gay cấn",
      "Đáng xem",
      "Hài hước",
      "Cười banh rạp"
    ],
    "isHot": false,
    "status": "now"
  }
];

export const MOVIES_SOON: Movie[] = [
  {
    "id": 25137,
    "title": "Godzilla Trừ Không",
    "titleEn": "Godzilla Minus 0",
    "bannerUrl": "https://image-fworker.momocdn.net/momo-external/5e1f88db3e81d99233a0df80c1089c51ccf2eed31aa9347249f2885f1b314ca8?size=M",
    "posterUrl": "https://image-fworker.momocdn.net/momo-external/e48c72c7ec00add718c18636a5f3962bfb03db852d627f346ab04e36f77397d3?size=M",
    "trailerUrl": "https://www.youtube.com/embed/dQw4w9WgXcQ",
    "duration": 135,
    "releaseDate": "Tháng 10/2026",
    "genre": "Hành động, Phiêu lưu",
    "ratingPoint": 9.5,
    "ratingCount": 890,
    "ageRating": "C13",
    "formats": [
      "2D Phụ đề"
    ],
    "synopsis": "Siêu phẩm điện ảnh được mong đợi nhất sắp đổ bộ các rạp chiếu phim trên toàn quốc.",
    "tags": [
      "Bom tấn",
      "Sắp chiếu",
      "Được mong chờ"
    ],
    "status": "soon"
  },
  {
    "id": 24641,
    "title": "Dune: Hành Tinh Cát - Phần Ba",
    "titleEn": "Dune: Part Three",
    "bannerUrl": "https://homepage.momocdn.net/default/s/no-image-momo.jpg",
    "posterUrl": "https://image-fworker.momocdn.net/momo-external/612a762b3cb77f060e38f1ae9c06be4b06e90a13ceffd6d599174dd64387bf91?size=M",
    "trailerUrl": "https://www.youtube.com/embed/dQw4w9WgXcQ",
    "duration": 120,
    "releaseDate": "Tháng 10/2026",
    "genre": "Hành động, Phiêu lưu",
    "ratingPoint": 9.5,
    "ratingCount": 890,
    "ageRating": "C13",
    "formats": [
      "2D Phụ đề"
    ],
    "synopsis": "Siêu phẩm điện ảnh được mong đợi nhất sắp đổ bộ các rạp chiếu phim trên toàn quốc.",
    "tags": [
      "Bom tấn",
      "Sắp chiếu",
      "Được mong chờ"
    ],
    "status": "soon"
  },
  {
    "id": 25092,
    "title": "Người Mẹ Xấu",
    "titleEn": "Người Mẹ Xấu",
    "bannerUrl": "https://homepage.momocdn.net/default/s/no-image-momo.jpg",
    "posterUrl": "https://cinema.momocdn.net/convert-webp/img/169450140804337896-nguoi-me-xau-500_1781239561463.png?size=SM",
    "trailerUrl": "https://www.youtube.com/embed/dQw4w9WgXcQ",
    "duration": 120,
    "releaseDate": "Tháng 10/2026",
    "genre": "Hành động, Phiêu lưu",
    "ratingPoint": 9.5,
    "ratingCount": 890,
    "ageRating": "C13",
    "formats": [
      "2D Phụ đề"
    ],
    "synopsis": "Siêu phẩm điện ảnh được mong đợi nhất sắp đổ bộ các rạp chiếu phim trên toàn quốc.",
    "tags": [
      "Bom tấn",
      "Sắp chiếu",
      "Được mong chờ"
    ],
    "status": "soon"
  },
  {
    "id": 25093,
    "title": "Ngày Con Còn Mẹ",
    "titleEn": "Ngày Con Còn Mẹ",
    "bannerUrl": "https://homepage.momocdn.net/default/s/no-image-momo.jpg",
    "posterUrl": "https://cinema.momocdn.net/convert-webp/img/169449993208190656-6a853d31e3f95905793733.png?size=SM",
    "trailerUrl": "https://www.youtube.com/embed/dQw4w9WgXcQ",
    "duration": 120,
    "releaseDate": "Tháng 10/2026",
    "genre": "Hành động, Phiêu lưu",
    "ratingPoint": 9.5,
    "ratingCount": 890,
    "ageRating": "C13",
    "formats": [
      "2D Phụ đề"
    ],
    "synopsis": "Siêu phẩm điện ảnh được mong đợi nhất sắp đổ bộ các rạp chiếu phim trên toàn quốc.",
    "tags": [
      "Bom tấn",
      "Sắp chiếu",
      "Được mong chờ"
    ],
    "status": "soon"
  },
  {
    "id": 25094,
    "title": "Chuyến Đi Nhớ Đời",
    "titleEn": "Chuyến Đi Nhớ Đời",
    "bannerUrl": "https://homepage.momocdn.net/default/s/no-image-momo.jpg",
    "posterUrl": "https://cinema.momocdn.net/convert-webp/img/169449900843357660-6a8e65fcc56f4621082505.png?size=SM",
    "trailerUrl": "https://www.youtube.com/embed/dQw4w9WgXcQ",
    "duration": 120,
    "releaseDate": "Tháng 10/2026",
    "genre": "Hành động, Phiêu lưu",
    "ratingPoint": 9.5,
    "ratingCount": 890,
    "ageRating": "C13",
    "formats": [
      "2D Phụ đề"
    ],
    "synopsis": "Siêu phẩm điện ảnh được mong đợi nhất sắp đổ bộ các rạp chiếu phim trên toàn quốc.",
    "tags": [
      "Bom tấn",
      "Sắp chiếu",
      "Được mong chờ"
    ],
    "status": "soon"
  },
  {
    "id": 25095,
    "title": "Trấn Yểm",
    "titleEn": "Trấn Yểm",
    "bannerUrl": "https://homepage.momocdn.net/default/s/no-image-momo.jpg",
    "posterUrl": "https://cinema.momocdn.net/convert-webp/img/169449770605007316-tra_n-ye_m-poster-co_ng-bo_-du_-a_n.jpg?size=SM",
    "trailerUrl": "https://www.youtube.com/embed/dQw4w9WgXcQ",
    "duration": 120,
    "releaseDate": "Tháng 10/2026",
    "genre": "Hành động, Phiêu lưu",
    "ratingPoint": 9.5,
    "ratingCount": 890,
    "ageRating": "C13",
    "formats": [
      "2D Phụ đề"
    ],
    "synopsis": "Siêu phẩm điện ảnh được mong đợi nhất sắp đổ bộ các rạp chiếu phim trên toàn quốc.",
    "tags": [
      "Bom tấn",
      "Sắp chiếu",
      "Được mong chờ"
    ],
    "status": "soon"
  },
  {
    "id": 25096,
    "title": "Mẹ Mìn",
    "titleEn": "Mẹ Mìn",
    "bannerUrl": "https://image-fworker.momocdn.net/momo-external/3338305f3dab112b763ac3712e6c0b11279c3ac674e4a0bbdcfacb3952481ee9?size=M",
    "posterUrl": "https://cinema.momocdn.net/convert-webp/img/1189440217284670-memin.jpg?size=SM",
    "trailerUrl": "https://www.youtube.com/embed/dQw4w9WgXcQ",
    "duration": 125,
    "releaseDate": "Tháng 10/2026",
    "genre": "Hành động, Phiêu lưu",
    "ratingPoint": 9.5,
    "ratingCount": 890,
    "ageRating": "C13",
    "formats": [
      "2D Phụ đề"
    ],
    "synopsis": "Siêu phẩm điện ảnh được mong đợi nhất sắp đổ bộ các rạp chiếu phim trên toàn quốc.",
    "tags": [
      "Bom tấn",
      "Sắp chiếu",
      "Được mong chờ"
    ],
    "status": "soon"
  },
  {
    "id": 24845,
    "title": "Thám Tử Kiên 2: Lời Nguyền Hoàng Kim",
    "titleEn": "Thám Tử Kiên 2: Lời Nguyền Hoàng Kim",
    "bannerUrl": "https://homepage.momocdn.net/default/s/no-image-momo.jpg",
    "posterUrl": "https://cinema.momocdn.net/convert-webp/img/154903476143772777-PosterTHAMTUKIEN2compressed.jpg?size=M",
    "trailerUrl": "https://www.youtube.com/embed/dQw4w9WgXcQ",
    "duration": 132,
    "releaseDate": "Tháng 10/2026",
    "genre": "Hành động, Phiêu lưu",
    "ratingPoint": 9.5,
    "ratingCount": 890,
    "ageRating": "C13",
    "formats": [
      "2D Phụ đề"
    ],
    "synopsis": "Siêu phẩm điện ảnh được mong đợi nhất sắp đổ bộ các rạp chiếu phim trên toàn quốc.",
    "tags": [
      "Bom tấn",
      "Sắp chiếu",
      "Được mong chờ"
    ],
    "status": "soon"
  }
];

export const COMBOS: ComboItem[] = [
  {
    "id": "combo-solo",
    "name": "Meo Solo Combo",
    "description": "1 Bắp ngọt (vị phô mai hoặc caramel) + 1 Nước ngọt có gas lớn (Coke/Sprite/Fanta)",
    "price": 79000,
    "image": "https://homepage.momocdn.net/img/momo-upload-api-230730215651-638263510119530922.png"
  },
  {
    "id": "combo-couple",
    "name": "Meo Couple Combo",
    "description": "1 Bắp ngọt khổng lồ 2 ngăn tuỳ chọn + 2 Nước ngọt có gas lớn",
    "price": 109000,
    "image": "https://homepage.momocdn.net/img/momo-upload-api-230730215651-638263510119530922.png"
  },
  {
    "id": "combo-family",
    "name": "Meo Family Party Combo",
    "description": "2 Bắp lớn đặc biệt + 4 Nước ngọt lớn + 1 Snack khoai tây chiên giòn rụm",
    "price": 189000,
    "image": "https://homepage.momocdn.net/img/momo-upload-api-230730215651-638263510119530922.png"
  }
];

export const FAQS = [
  {
    "question": "Làm thế nào để đặt vé xem phim trên MeoCinema?",
    "answer": "Bạn chỉ cần chọn cụm rạp yêu thích, ngày chiếu, bộ phim và khung giờ mong muốn. Tiếp theo, chọn chỗ ngồi trên sơ đồ phòng chiếu, thêm bắp nước nếu có nhu cầu, áp dụng mã ưu đãi và thanh toán trực tiếp qua MeoCinema cực kỳ nhanh chóng chỉ trong 30 giây."
  },
  {
    "question": "Làm sao để nhận vé khi đến rạp chiếu phim?",
    "answer": "Sau khi đặt vé thành công trên MeoCinema, bạn sẽ nhận được một vé điện tử kèm mã đặt chỗ và mã QR. Khi đến rạp, bạn chỉ cần mở vé điện tử trên ứng dụng MeoCinema, quét mã QR tại cây in vé tự động (Kiosk) hoặc đưa cho nhân viên tại quầy soát vé để vào phòng chiếu."
  },
  {
    "question": "Có thể huỷ hoặc đổi vé xem phim đã mua trên MeoCinema không?",
    "answer": "Theo quy định chung của các hệ thống rạp chiếu phim (CGV, Lotte, Galaxy, BHD...), vé đã thanh toán thành công sẽ không thể huỷ hoặc hoàn tiền. Một số cụm rạp cho phép đổi suất chiếu trước giờ phim chiếu tối thiểu 60 phút trực tiếp tại rạp tuỳ theo chính sách riêng."
  },
  {
    "question": "Mua vé trên MeoCinema có được tích điểm thành viên của rạp không?",
    "answer": "Có! Bạn có thể liên kết tài khoản thành viên CGV, Lotte Cinema, Galaxy Cinema hoặc BHD Star ngay trong quá trình thanh toán trên MeoCinema để được tự động tích luỹ điểm thưởng thành viên rạp."
  }
];

export const PROMOTIONS = [
  {
    "code": "MEOCINEMA",
    "title": "Nhập mã MEOCINEMA giảm ngay 10.000đ",
    "desc": "Áp dụng cho mọi đơn hàng đặt vé xem phim trên Website MeoCinema",
    "discount": 10000,
    "minOrder": 70000,
    "expiry": "30/10/2026",
    "banner": "https://homepage.momocdn.net/img/momo-amazone-s3-api-241016111351-638646740316589907.jpg"
  },
  {
    "code": "MEOCAT50",
    "title": "Giảm 20% tối đa 30.000đ cho bạn mới",
    "desc": "Áp dụng cho khách hàng lần đầu đặt vé xem phim qua MeoCinema",
    "discountPercent": 20,
    "maxDiscount": 30000,
    "minOrder": 90000,
    "expiry": "15/11/2026",
    "banner": "https://homepage.momocdn.net/img/momo-amazone-s3-api-241016111341-638646740217512354.jpg"
  }
];

export function generateDatesList() {
  const dates = [];
  const daysOfWeek = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  const today = new Date();

  for (let i = 0; i < 10; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    const dayName = i === 0 ? 'Hôm nay' : i === 1 ? 'Ngày mai' : daysOfWeek[d.getDay()];
    const label = `${dayName} ${day}/${month}`;

    dates.push({
      dateStr,
      dayName,
      dayNumber: day,
      month,
      label,
      isToday: i === 0
    });
  }
  return dates;
}

export function generateShowtimesForMovieAndTheater(movieId: number, theaterId: number, dateStr: string) {
  const numDate = parseInt(dateStr.replace(/-/g, '').slice(-4), 10) || 101;
  const baseSeed = (movieId * 37 + theaterId * 13 + numDate) % 100;
  
  const timePool = [
    { time: '09:30', room: 'Rạp 1 - 2D', format: '2D Phụ đề', price: 85000 },
    { time: '11:15', room: 'Rạp 3 - 2D', format: '2D Lồng tiếng', price: 85000 },
    { time: '13:40', room: 'Rạp 2 - 2D', format: '2D Phụ đề', price: 95000 },
    { time: '15:20', room: 'Rạp 5 - IMAX', format: 'IMAX 2D', price: 145000 },
    { time: '17:45', room: 'Rạp 1 - 2D', format: '2D Phụ đề', price: 105000 },
    { time: '19:15', room: 'Rạp 4 - 2D', format: '2D Lồng tiếng', price: 110000 },
    { time: '20:30', room: 'Rạp 2 - 2D', format: '2D Phụ đề', price: 110000 },
    { time: '21:45', room: 'Rạp 5 - IMAX', format: 'IMAX 2D', price: 155000 },
    { time: '22:50', room: 'Rạp 3 - 2D', format: '2D Phụ đề', price: 95000 }
  ];

  const count = 4 + (baseSeed % 4);
  const offset = baseSeed % 3;
  const selected = timePool.slice(offset, offset + count);

  return selected.map((t, idx) => ({
    id: `${movieId}-${theaterId}-${dateStr}-${idx}`,
    time: t.time,
    endTime: calculateEndTime(t.time, 120),
    room: t.room,
    format: t.format,
    price: t.price,
    emptySeats: 45 + ((baseSeed * (idx + 1)) % 40),
    totalSeats: 120
  }));
}

function calculateEndTime(start: string, durationMin: number): string {
  const [h, m] = start.split(':').map(Number);
  const totalM = h * 60 + m + durationMin;
  const endH = Math.floor(totalM / 60) % 24;
  const endM = totalM % 60;
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}

export function generateSeatsForShowtime(showtimeId: string) {
  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J'];
  const cols = 12;
  const seats = [];

  let seed = 0;
  for (let i = 0; i < showtimeId.length; i++) {
    seed = (seed * 31 + showtimeId.charCodeAt(i)) % 10000;
  }

  for (const row of rows) {
    for (let c = 1; c <= cols; c++) {
      const seatId = `${row}${c}`;
      let type: 'standard' | 'vip' | 'sweetbox' = 'standard';
      let price = 85000;

      if (row === 'J') {
        type = 'sweetbox';
        price = 190000;
      } else if (['E', 'F', 'G', 'H'].includes(row) && c >= 3 && c <= 10) {
        type = 'vip';
        price = 105000;
      }

      seed = (seed * 9301 + 49297) % 233280;
      const isReserved = (seed / 233280) < 0.22;

      seats.push({
        id: seatId,
        row,
        col: c,
        type,
        price,
        status: isReserved ? ('reserved' as const) : ('available' as const)
      });
    }
  }

  return seats;
}
