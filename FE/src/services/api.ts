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
      if (res.ok) {
        const data = await res.json();
        return data.map((m: any) => ({
          ...m,
          ageRating: m.ageRating ?? m.age_rating ?? 'C13',
          posterUrl: m.posterUrl ?? m.poster_url ?? '',
          bannerUrl: m.bannerUrl ?? m.banner_url ?? '',
          trailerUrl: m.trailerUrl ?? m.trailer_url ?? '',
          releaseDate: m.releaseDate ?? m.release_date ?? '',
          ratingPoint: m.ratingPoint ?? m.rating_point ?? 9.0,
          ratingCount: m.ratingCount ?? m.rating_count ?? 0,
          titleEn: m.titleEn ?? m.title_en ?? '',
          isHot: m.isHot ?? m.is_hot ?? false,
          formats: m.formats ?? ['2D Phụ đề'],
          cast: m.cast ?? m.cast_members ?? ''
        }));
      }
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
      if (res.ok) {
        const data = await res.json();
        let list = data.map((t: any) => ({
          ...t,
          brandId: t.brandId ?? t.brand_id,
          brandCode: t.brandCode ?? t.brand_code,
          cityId: t.cityId ?? t.city_id,
          cityName: t.cityName ?? t.city_name ?? '',
          reviewCount: t.reviewCount ?? t.review_count ?? 0
        }));
        if (cityId) list = list.filter((t: any) => t.cityId === cityId);
        if (brandCode && brandCode !== 'ALL') list = list.filter((t: any) => t.brandCode === brandCode);
        return list;
      }
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
      if (res.ok) {
        const data = await res.json();
        return data.map((s: any) => ({
          ...s,
          movieId: s.movieId ?? s.movie_id,
          theaterId: s.theaterId ?? s.theater_id,
          time: s.time ?? s.start_time,
          endTime: s.endTime ?? s.end_time,
          date: s.date ?? s.show_date,
          room: s.room ?? s.room_name,
          price: s.price ?? s.base_price,
          emptySeats: s.emptySeats ?? s.empty_seats,
          totalSeats: s.totalSeats ?? s.total_seats
        }));
      }
    } catch (e) {
      console.warn('[API] Using fallback showtimes:', e);
    }
    return [];
  },

  /**
   * Get seats layout for a showtime
   */
  async getShowtimeSeats(showtimeId: string): Promise<Seat[]> {
    // Get reserved seats from localStorage fallback
    const localStoreStr = localStorage.getItem('meo_reserved_seats_map');
    const localReservedMap = localStoreStr ? JSON.parse(localStoreStr) : {};
    const localReservedSeats: string[] = localReservedMap[showtimeId] || [];

    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/showtimes/${showtimeId}/seats`);
      if (res.ok) {
        const data = await res.json();
        // Merge backend seats with local reserved seats
        return data.seats.map((s: Seat) => {
          if (localReservedSeats.includes(s.id)) {
            return { ...s, status: 'reserved' };
          }
          return s;
        });
      }
    } catch (e) {
      console.warn('[API] Using local generated seats:', e);
    }

    const baseSeats = generateSeatsForShowtime(showtimeId);
    return baseSeats.map((s) => {
      if (localReservedSeats.includes(s.id)) {
        return { ...s, status: 'reserved' };
      }
      return s;
    });
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
    showDate?: string;
    showTime?: string;
    movieTitle?: string;
    cinemaName?: string;
    screenRoom?: string;
    showFormat?: string;
    totalSeats?: number;
    basePrice?: number;
    seats: Seat[];
    combos: { [id: string]: number };
    voucherCode?: string;
    paymentMethod?: string;
  }): Promise<DigitalTicket> {
    const seatCodes = payload.seats.map((s) => s.id);

    let receivedApiResponse = false;
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      receivedApiResponse = true;

      if (res.ok) {
        // Record reserved seats locally
        try {
          const localStoreStr = localStorage.getItem('meo_reserved_seats_map');
          const localReservedMap = localStoreStr ? JSON.parse(localStoreStr) : {};
          const curList: string[] = localReservedMap[payload.showtimeId] || [];
          localReservedMap[payload.showtimeId] = Array.from(new Set([...curList, ...seatCodes]));
          localStorage.setItem('meo_reserved_seats_map', JSON.stringify(localReservedMap));
        } catch (e) {}

        return await res.json();
      } else {
        const errorData = await res.json().catch(() => ({}));
        const detail = errorData.detail;
        const error: any = new Error(
          typeof detail === 'string' ? detail : detail?.message || 'Không thể tạo đơn đặt vé.'
        );
        error.status = res.status;
        error.code = detail?.code;
        throw error;
      }
    } catch (e: any) {
      if (receivedApiResponse) throw e;
      const error: any = new Error('Không kết nối được máy chủ đặt vé.');
      error.retryable = true;
      throw error;
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
      const res = await fetchWithTimeout(`${API_BASE_URL}/bookings/by-phone/${encodeURIComponent(phone)}`);
      if (!res.ok) throw new Error(`Ticket lookup failed (${res.status})`);
      return await res.json();
    } catch (e) {
      console.warn('[API] Lookup by phone failed:', e);
      throw e;
    }
  },

  async refundTicket(bookingId: string, customerPhone: string): Promise<any> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/bookings/${encodeURIComponent(bookingId)}/refund`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer_phone: customerPhone })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || 'Không thể hoàn vé. Vui lòng thử lại.');

    // Clear this browser's optimistic reservation; backend availability remains authoritative.
    try {
      const map = JSON.parse(localStorage.getItem('meo_reserved_seats_map') || '{}');
      const held: string[] = map[data.showtimeId] || [];
      map[data.showtimeId] = held.filter((seat) => !data.releasedSeats.includes(seat));
      localStorage.setItem('meo_reserved_seats_map', JSON.stringify(map));
    } catch {}

    return data;
  },

  async getRealReplicationStatus(): Promise<any> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/distributed/replication/real/status`, {}, 15000);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || 'Không đọc được trạng thái cụm PostgreSQL.');
    return data;
  },

  async writeRealReplicationDemo(): Promise<any> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/distributed/replication/real/demo-write`, {
      method: 'POST'
    }, 15000);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || 'Không ghi được bản ghi demo.');
    return data;
  },

  async verifyRealReplicationDemo(eventId: string): Promise<any> {
    const res = await fetchWithTimeout(
      `${API_BASE_URL}/distributed/replication/real/verify/${encodeURIComponent(eventId)}`,
      {},
      15000
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || 'Không kiểm tra được bản sao.');
    return data;
  },

  async runReadAfterWriteConsistencyDemo(): Promise<any> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/distributed/replication/real/consistency/read-after-write`, {
      method: 'POST'
    }, 30000);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || 'Không chạy được demo consistency đọc-sau-ghi.');
    return data;
  },

  // =============================================================================
  // AUTHENTICATION & USER MANAGEMENT
  // =============================================================================
  async login(account: string, password: string): Promise<any> {
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account, password })
      });
      if (res.ok) {
        return await res.json();
      }
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || 'Đăng nhập không thành công');
    } catch (e: any) {
      // Authentication always requires the API and its database.
      if (e.message && e.message !== 'Failed to fetch' && !e.message.includes('abort')) {
        throw e;
      }
      throw new Error(e.message || 'Không thể kết nối đến máy chủ xác thực');
    }
  },

  async register(fullName: string, email: string, phone: string, password: string): Promise<any> {
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, phone, password })
      });
      if (res.ok) {
        return await res.json();
      }
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || 'Đăng ký không thành công');
    } catch (e: any) {
      if (e.message && e.message !== 'Failed to fetch' && !e.message.includes('abort')) {
        throw e;
      }
      throw new Error(e.message || 'Không thể kết nối đến máy chủ đăng ký');
    }
  },

  async getMe(token: string): Promise<any> {
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  }
};
