from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, AliasChoices

# --- City & Brand ---
class CityModel(BaseModel):
    id: int
    name: str
    code: str
    isPopular: bool = Field(default=False, validation_alias=AliasChoices("isPopular", "is_popular"))

    class Config:
        populate_by_name = True

class CineplexBrandModel(BaseModel):
    id: int
    name: str
    code: str
    logo: str
    tag: Optional[str] = ""
    slogan: Optional[str] = ""

class CinemaTheaterModel(BaseModel):
    id: int
    brandId: int = Field(validation_alias=AliasChoices("brandId", "brand_id"))
    brandCode: str = Field(validation_alias=AliasChoices("brandCode", "brand_code"))
    name: str
    address: str
    cityId: int = Field(validation_alias=AliasChoices("cityId", "city_id"))
    cityName: str = Field(default="", validation_alias=AliasChoices("cityName", "city_name"))
    rating: float = 4.8
    reviewCount: int = Field(default=0, validation_alias=AliasChoices("reviewCount", "review_count"))
    lat: Optional[float] = None
    lng: Optional[float] = None

    class Config:
        populate_by_name = True

# --- Movie ---
class MovieModel(BaseModel):
    id: int
    title: str
    titleEn: Optional[str] = Field(default="", validation_alias=AliasChoices("titleEn", "title_en"))
    bannerUrl: str = Field(default="", validation_alias=AliasChoices("bannerUrl", "banner_url"))
    posterUrl: str = Field(default="", validation_alias=AliasChoices("posterUrl", "poster_url"))
    trailerUrl: Optional[str] = Field(default="", validation_alias=AliasChoices("trailerUrl", "trailer_url"))
    duration: int = 120
    releaseDate: str = Field(default="", validation_alias=AliasChoices("releaseDate", "release_date"))
    genre: str = ""
    ratingPoint: float = Field(default=9.0, validation_alias=AliasChoices("ratingPoint", "rating_point"))
    ratingCount: int = Field(default=0, validation_alias=AliasChoices("ratingCount", "rating_count"))
    ageRating: str = Field(default="C13", validation_alias=AliasChoices("ageRating", "age_rating"))
    formats: List[str] = Field(default_factory=lambda: ["2D Phụ đề"])
    synopsis: str = ""
    director: Optional[str] = ""
    cast: Optional[str] = Field(default="", validation_alias=AliasChoices("cast", "cast_members"))
    tags: Optional[List[str]] = Field(default_factory=list)
    isHot: bool = Field(default=False, validation_alias=AliasChoices("isHot", "is_hot"))
    status: str = "now"

    class Config:
        populate_by_name = True

# --- Showtime & Seats ---
class ShowtimeSlotModel(BaseModel):
    id: str
    movieId: int = Field(validation_alias=AliasChoices("movieId", "movie_id"))
    theaterId: int = Field(validation_alias=AliasChoices("theaterId", "theater_id"))
    time: str = Field(validation_alias=AliasChoices("time", "start_time"))
    endTime: str = Field(validation_alias=AliasChoices("endTime", "end_time"))
    date: str = Field(validation_alias=AliasChoices("date", "show_date"))
    room: str = Field(validation_alias=AliasChoices("room", "room_name"))
    format: str = "2D Phụ đề"
    price: float = Field(validation_alias=AliasChoices("price", "base_price"))
    emptySeats: int = Field(default=90, validation_alias=AliasChoices("emptySeats", "empty_seats"))
    totalSeats: int = Field(default=96, validation_alias=AliasChoices("totalSeats", "total_seats"))

    class Config:
        populate_by_name = True

class SeatModel(BaseModel):
    id: str
    row: str
    col: int
    type: str # 'standard' | 'vip' | 'sweetbox'
    price: float
    status: str # 'available' | 'reserved' | 'selected'

class ShowtimeSeatsResponse(BaseModel):
    showtimeId: str
    roomName: str
    format: str
    basePrice: float
    totalSeats: int
    emptySeats: int
    seats: List[SeatModel]

# --- Combos & Promotions ---
class ComboItemModel(BaseModel):
    id: str
    name: str
    description: str
    price: float
    image: str = Field(default="", validation_alias=AliasChoices("image", "image_url"))

    class Config:
        populate_by_name = True

class PromotionModel(BaseModel):
    id: int
    code: str
    title: str
    description: Optional[str] = ""
    discountAmount: float = Field(default=0, validation_alias=AliasChoices("discountAmount", "discount_amount"))
    discountPercent: int = Field(default=0, validation_alias=AliasChoices("discountPercent", "discount_percent"))
    maxDiscount: float = Field(default=0, validation_alias=AliasChoices("maxDiscount", "max_discount"))
    minOrder: float = Field(default=0, validation_alias=AliasChoices("minOrder", "min_order"))
    badge: Optional[str] = ""

    class Config:
        populate_by_name = True

class VoucherValidateRequest(BaseModel):
    code: str
    subTotal: float

class VoucherValidateResponse(BaseModel):
    valid: bool
    code: str
    title: str
    discount: float
    message: str

# --- Booking ---
class BookingSeatRequestItem(BaseModel):
    id: str # 'E7'
    row: str
    col: int
    type: str
    price: float

class BookingCreateRequest(BaseModel):
    showtimeId: str
    customerName: str
    customerPhone: str
    customerEmail: Optional[str] = ""
    showDate: Optional[str] = None
    showTime: Optional[str] = None
    movieTitle: Optional[str] = None
    cinemaName: Optional[str] = None
    screenRoom: Optional[str] = None
    showFormat: Optional[str] = None
    totalSeats: Optional[int] = None
    basePrice: Optional[float] = None
    seats: List[BookingSeatRequestItem]
    combos: Optional[Dict[str, int]] = Field(default_factory=dict)
    voucherCode: Optional[str] = None
    paymentMethod: str = "momo"

class DigitalTicketResponse(BaseModel):
    bookingId: str
    bookingTime: str
    customerName: str
    customerPhone: str
    customerEmail: Optional[str] = ""
    movieTitle: str
    posterUrl: str
    cinemaName: str
    cinemaAddress: str
    screenRoom: str
    format: str
    showDate: str
    showTime: str
    qrCodeValue: str
    seatNumbers: List[str] = Field(default_factory=list, validation_alias=AliasChoices("seatNumbers", "seat_numbers"))
    combos: List[str] = Field(default_factory=list)
    totalPrice: float = Field(default=0.0, validation_alias=AliasChoices("totalPrice", "total_price", "final_total"))
    paymentStatus: str = Field(default="Đã thanh toán (MoMo)", validation_alias=AliasChoices("paymentStatus", "payment_status"))

    class Config:
        populate_by_name = True

# --- User & Auth ---
class UserRegisterRequest(BaseModel):
    fullName: str = Field(validation_alias=AliasChoices("fullName", "full_name"))
    email: str
    phone: str
    password: str

    class Config:
        populate_by_name = True

class UserLoginRequest(BaseModel):
    account: str # email or phone
    password: str

class UserResponse(BaseModel):
    id: int
    fullName: str = Field(validation_alias=AliasChoices("fullName", "full_name"))
    email: str
    phone: str
    role: str = "customer"
    avatarUrl: Optional[str] = Field(default="", validation_alias=AliasChoices("avatarUrl", "avatar_url"))
    createdAt: Optional[str] = Field(default="", validation_alias=AliasChoices("createdAt", "created_at"))

    class Config:
        populate_by_name = True

class AuthTokenResponse(BaseModel):
    accessToken: str
    tokenType: str = "Bearer"
    expiresIn: int
    user: UserResponse
