export interface Movie {
  id: number;
  title: string;
  titleEn?: string;
  bannerUrl: string;
  posterUrl: string;
  trailerUrl?: string;
  duration: number; // in minutes
  releaseDate: string;
  genre: string;
  ratingPoint: number;
  ratingCount: number;
  ageRating: 'P' | 'K' | 'C13' | 'C16' | 'C18';
  formats: string[]; // e.g. ['2D Phụ đề', '2D Lồng tiếng', 'IMAX 2D']
  synopsis: string;
  director?: string;
  cast?: string;
  tags?: string[];
  isHot?: boolean;
  status: 'now' | 'soon';
}

export interface CineplexBrand {
  id: number;
  name: string;
  code: string;
  logo: string;
  tag?: string; // e.g. '79K', '89K'
  slogan?: string;
}

export interface CinemaTheater {
  id: number;
  brandCode: string;
  name: string;
  address: string;
  cityId: number;
  cityName: string;
  distance?: string;
  rating: number;
  reviewCount: number;
  lat?: number;
  lng?: number;
}

export interface ShowtimeSlot {
  id: string;
  time: string;
  endTime: string;
  room: string;
  format: string; // e.g. '2D Phụ đề'
  price: number;
  emptySeats: number;
  totalSeats: number;
}

export interface MovieSchedule {
  movieId: number;
  theaterId: number;
  date: string; // YYYY-MM-DD
  slots: ShowtimeSlot[];
}

export interface Seat {
  id: string; // e.g. 'A1'
  row: string;
  col: number;
  type: 'standard' | 'vip' | 'sweetbox';
  price: number;
  status: 'available' | 'selected' | 'reserved' | 'empty_space';
}

export interface ComboItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
}

export interface City {
  id: number;
  name: string;
  code: string;
  isPopular?: boolean;
}

export interface BookingState {
  movie: Movie;
  theater: CinemaTheater;
  date: string;
  showtime: ShowtimeSlot;
  seats: Seat[];
  combos: { [comboId: string]: number };
  appliedVoucher?: {
    code: string;
    discountAmount: number;
  };
  totalAmount: number;
}

export interface DigitalTicket {
  bookingId: string;
  bookingTime: string;
  movieTitle: string;
  posterUrl: string;
  cinemaName: string;
  cinemaAddress: string;
  screenRoom: string;
  format: string;
  showDate: string;
  showTime: string;
  seatNumbers: string[];
  combos: string[];
  totalPrice: number;
  qrCodeValue: string;
}
