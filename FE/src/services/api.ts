import {
  Movie,
  CinemaTheater,
  ShowtimeSlot,
  Seat,
  ComboItem,
  City,
  CineplexBrand,
  DigitalTicket
} from '../types/cinema';
import {
  CITIES,
  CINEPLEX_BRANDS,
  CINEMA_THEATERS,
  MOVIES_NOW,
  MOVIES_SOON,
  COMBOS,
  PROMOTIONS,
  generateSeatsForShowtime
} from '../data/cinemaData';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

/**
 * Helper to perform fetch with a timeout
 */
async function fetchWithTimeout(resource: string, options: RequestInit = {}, timeout = 3000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(resource, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

export const api = {
  /**
   * Health check
   */
  async checkHealth(): Promise<{ status: string; postgres_connected: boolean }> {
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/health`);
      if (res.ok) return await res.json();
    } catch {
      // Backend not running
    }
    return { status: 'offline', postgres_connected: false };
  },

  /**
   * Get all cities
   */
  async getCities(): Promise<City[]> {
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/cities`);
      if (res.ok) {
        const data = await res.json();
        return data.map((c: any) => ({
          id: c.id,
          name: c.name,
          code: c.code,
          isPopular: c.isPopular ?? c.is_popular
        }));
      }
    } catch (e) {
      console.warn('[API] Using local cities data:', e);
    }
    return CITIES;
  },

  /**
   * Get brands
   */
  async getBrands(): Promise<CineplexBrand[]> {
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/brands`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('[API] Using local brands data:', e);
    }
    return CINEPLEX_BRANDS;
  },

  /**
   * Get movies
   */
  async getMovies(status: 'now' | 'soon' = 'now'): Promise<Movie[]> {
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/movies?status=${status}`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('[API] Using local movies data:', e);
    }
    return status === 'now' ? MOVIES_NOW : MOVIES_SOON;
  },

  /**
   * Get theaters
   */
  async getTheaters(cityId?: number, brandCode?: string): Promise<CinemaTheater[]> {
    try {
      let url = `${API_BASE_URL}/theaters`;
      const params = new URLSearchParams();
      if (cityId) params.append('city_id', cityId.toString());
      if (brandCode && brandCode !== 'ALL') params.append('brand_code', brandCode);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetchWithTimeout(url);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('[API] Using local theaters data:', e);
    }
    let list = CINEMA_THEATERS;
    if (cityId) list = list.filter((t) => t.cityId === cityId);
    if (brandCode && brandCode !== 'ALL') list = list.filter((t) => t.brandCode === brandCode);
    return list;
  },

  /**
   * Get showtimes
   */
  async getShowtimes(movieId?: number, theaterId?: number, date?: string): Promise<ShowtimeSlot[]> {
    try {
      let url = `${API_BASE_URL}/showtimes`;
      const params = new URLSearchParams();
      if (movieId) params.append('movie_id', movieId.toString());
      if (theaterId) params.append('theater_id', theaterId.toString());
      if (date) params.append('date', date);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetchWithTimeout(url);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('[API] Using fallback showtimes:', e);
    }
    return [];
  },

  /**
   * Get seats layout for a showtime
   */
  async getShowtimeSeats(showtimeId: string): Promise<Seat[]> {
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/showtimes/${showtimeId}/seats`);
      if (res.ok) {
        const data = await res.json();
        return data.seats;
      }
    } catch (e) {
      console.warn('[API] Using local generated seats:', e);
    }
    return generateSeatsForShowtime(showtimeId);
  },

  /**
   * Get combos
   */
  async getCombos(): Promise<ComboItem[]> {
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/combos`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('[API] Using local combos data:', e);
    }
    return COMBOS;
  },

  /**
   * Validate promotion voucher
   */
  async validateVoucher(code: string, subTotal: number): Promise<{ valid: boolean; discount: number; title: string; message: string }> {
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/promotions/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, subTotal })
      });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }

    const codeClean = code.trim().toUpperCase();
    const promo = PROMOTIONS.find((p) => p.code === codeClean);
    if (!promo) {
      return { valid: false, discount: 0, title: '', message: 'Mã ưu đãi không hợp lệ' };
    }
    if (subTotal < (promo.minOrder || 0)) {
      return { valid: false, discount: 0, title: promo.title, message: `Cần đơn tối thiểu ${(promo.minOrder || 0).toLocaleString()}đ` };
    }
    let discount = promo.discount || 0;
    if (promo.discountPercent) {
      discount = Math.min((subTotal * promo.discountPercent) / 100, promo.maxDiscount || 30000);
    }
    return { valid: true, discount, title: promo.title, message: `Áp dụng thành công mã ${promo.code}` };
  },

  /**
   * Create a new booking
   */
  async createBooking(payload: {
    showtimeId: string;
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    seats: Seat[];
    combos: { [id: string]: number };
    voucherCode?: string;
    paymentMethod?: string;
  }): Promise<DigitalTicket> {
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        return await res.json();
      } else {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Không thể tạo đơn đặt vé');
      }
    } catch (e: any) {
      if (e.message && e.message.includes('ghế')) {
        throw e;
      }
      console.warn('[API] Booking endpoint offline or error, generating local ticket:', e);
      // Fallback ticket creation
      const bookingId = 'MEO-' + Math.floor(100000 + Math.random() * 900000);
      const chosenCombos = Object.entries(payload.combos)
        .filter(([_, q]) => q > 0)
        .map(([id, q]) => {
          const c = COMBOS.find((item) => item.id === id);
          return `${q}x ${c?.name}`;
        });

      const seatTotal = payload.seats.reduce((s, seat) => s + seat.price, 0);
      const comboTotal = Object.entries(payload.combos).reduce((sum, [cId, q]) => {
        const c = COMBOS.find((item) => item.id === cId);
        return sum + (c ? c.price * q : 0);
      }, 0);

      return {
        bookingId,
        bookingTime: new Date().toLocaleString('vi-VN'),
        movieTitle: 'Phim MeoCinema',
        posterUrl: '',
        cinemaName: 'Cụm rạp MeoCinema',
        cinemaAddress: 'TP. Hồ Chí Minh',
        screenRoom: 'Cinema 1',
        format: '2D Phụ đề',
        showDate: new Date().toISOString().split('T')[0],
        showTime: '19:30',
        seatNumbers: payload.seats.map((s) => s.id),
        combos: chosenCombos,
        totalPrice: seatTotal + comboTotal,
        qrCodeValue: `https://meocinema.vn/ticket/${bookingId}`
      };
    }
  },

  /**
   * Lookup ticket by booking code
   */
  async getTicketByCode(bookingCode: string): Promise<DigitalTicket | null> {
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/bookings/${bookingCode}`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('[API] Lookup ticket failed:', e);
    }
    return null;
  },

  /**
   * Lookup tickets by customer phone
   */
  async getTicketsByPhone(phone: string): Promise<DigitalTicket[]> {
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/bookings/by-phone/${phone}`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('[API] Lookup by phone failed:', e);
    }
    return [];
  }
};
