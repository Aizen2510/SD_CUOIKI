import React, { useState, useMemo, useEffect } from 'react';
import { X, CheckCircle, ShieldCheck, Ticket, Download, ArrowRight, User, Phone, AlertCircle } from 'lucide-react';
import {
  Movie,
  CinemaTheater,
  ShowtimeSlot,
  Seat,
  DigitalTicket,
  UserProfile
} from '../types/cinema';
import { COMBOS, PROMOTIONS, generateSeatsForShowtime, isShowtimePast } from '../data/cinemaData';
import { api } from '../services/api';

interface SeatBookingModalProps {
  movie: Movie;
  theater: CinemaTheater;
  date: string;
  showtime: ShowtimeSlot;
  currentUser?: UserProfile | null;
  onClose: () => void;
}

export const SeatBookingModal: React.FC<SeatBookingModalProps> = ({
  movie,
  theater,
  date,
  showtime,
  currentUser,
  onClose
}) => {
  // Initialize seats
  const [seats, setSeats] = useState<Seat[]>(() => generateSeatsForShowtime(showtime.id));
  const [comboQuantities, setComboQuantities] = useState<{ [id: string]: number }>({});
  const [voucherCode, setVoucherCode] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState<{
    code: string;
    discount: number;
    title: string;
  } | null>(null);
  const [voucherError, setVoucherError] = useState('');
  const [bookingError, setBookingError] = useState('');

  // Check if showtime has already passed
  const isPast = isShowtimePast(date, showtime.time);

  // Customer contact info (Autofill with currentUser if logged in)
  const [customerName, setCustomerName] = useState(currentUser?.fullName || 'Nguyễn Văn An');
  const [customerPhone, setCustomerPhone] = useState(currentUser?.phone || '0909123456');

  // Payment method selection & lock timer
  const [paymentMethod, setPaymentMethod] = useState<'momo' | 'zalopay' | 'card' | 'qr'>('momo');
  const [timeLeft, setTimeLeft] = useState<number>(300); // 5:00 lock countdown

  // Timer countdown for distributed seat holding
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Load live seats from backend and sync continuously (Real-time polling every 2.5s)
  useEffect(() => {
    let mounted = true;

    const fetchSeats = () => {
      api.getShowtimeSeats(showtime.id).then((liveSeats) => {
        if (mounted && liveSeats && liveSeats.length > 0) {
          setSeats((prev) => {
            const selectedIds = new Set(prev.filter((s) => s.status === 'selected').map((s) => s.id));
            return liveSeats.map((s) => {
              if (s.status === 'reserved') {
                if (selectedIds.has(s.id)) {
                  setBookingError(`Ghế ${s.id} vừa được khách khác đặt trước. Ghế đã tự động chuyển sang màu đỏ!`);
                }
                return s;
              }
              if (selectedIds.has(s.id)) {
                return { ...s, status: 'selected' };
              }
              return s;
            });
          });
        }
      }).catch((e) => console.warn('Could not fetch live seats:', e));
    };

    fetchSeats();
    const interval = setInterval(fetchSeats, 2500);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [showtime.id]);

  // Payment state
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmedTicket, setConfirmedTicket] = useState<DigitalTicket | null>(null);

  // Toggle seat selection
  const handleSeatClick = (seatId: string) => {
    if (isPast) return;
    setSeats((prev) =>
      prev.map((seat) => {
        if (seat.id !== seatId || seat.status === 'reserved') return seat;
        return {
          ...seat,
          status: seat.status === 'selected' ? 'available' : 'selected'
        };
      })
    );
  };

  const selectedSeats = useMemo(() => {
    return seats.filter((s) => s.status === 'selected');
  }, [seats]);

  // Combo quantity changes
  const handleComboChange = (id: string, delta: number) => {
    setComboQuantities((prev) => {
      const current = prev[id] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [id]: next };
    });
  };

  // Price calculations
  const seatTotal = useMemo(() => {
    return selectedSeats.reduce((sum, s) => sum + s.price, 0);
  }, [selectedSeats]);

  const comboTotal = useMemo(() => {
    return COMBOS.reduce((sum, c) => {
      const q = comboQuantities[c.id] || 0;
      return sum + c.price * q;
    }, 0);
  }, [comboQuantities]);

  const subTotal = seatTotal + comboTotal;

  const discountAmount = useMemo(() => {
    if (!appliedVoucher) return 0;
    return Math.min(appliedVoucher.discount, subTotal);
  }, [appliedVoucher, subTotal]);

  const finalTotal = Math.max(0, subTotal - discountAmount);

  // Apply voucher
  const handleApplyVoucher = () => {
    setVoucherError('');
    const codeClean = voucherCode.trim().toUpperCase();

    if (!codeClean) {
      setVoucherError('Vui lòng nhập mã ưu đãi');
      return;
    }

    const promo = PROMOTIONS.find((p) => p.code === codeClean);
    if (promo) {
      if (subTotal < (promo.minOrder || 0)) {
        setVoucherError(`Đơn hàng tối thiểu ${promo.minOrder?.toLocaleString()}đ để áp dụng mã này`);
        return;
      }

      let discount = promo.discount || 0;
      if (promo.discountPercent) {
        discount = Math.min((subTotal * promo.discountPercent) / 100, promo.maxDiscount || 30000);
      }

      setAppliedVoucher({
        code: promo.code,
        discount,
        title: promo.title
      });
      setVoucherCode('');
    } else {
      setVoucherError('Mã ưu đãi không hợp lệ hoặc đã hết lượt');
    }
  };

  // Confirm booking
  const handlePayment = async () => {
    if (isPast) {
      setBookingError(`Suất chiếu lúc ${showtime.time} ngày ${date} đã qua giờ chiếu. Vui lòng chọn suất chiếu khác!`);
      return;
    }
    if (selectedSeats.length === 0) return;
    setBookingError('');
    setIsProcessing(true);

    try {
      const ticket = await api.createBooking({
        showtimeId: showtime.id,
        customerName: customerName.trim() || 'Khách hàng MeoCinema',
        customerPhone: customerPhone.trim() || '0909123456',
        showDate: date,
        showTime: showtime.time,
        movieTitle: movie.title,
        cinemaName: theater.name,
        screenRoom: showtime.room,
        showFormat: showtime.format,
        totalSeats: showtime.totalSeats,
        basePrice: showtime.price,
        seats: selectedSeats,
        combos: comboQuantities,
        voucherCode: appliedVoucher ? appliedVoucher.code : undefined,
        paymentMethod
      });

      const bookedSeatIds = selectedSeats.map((s) => s.id);

      // 1. Immediately persist booked seats in localStorage map so F5 keeps them RED forever
      try {
        const localStoreStr = localStorage.getItem('meo_reserved_seats_map');
        const localReservedMap = localStoreStr ? JSON.parse(localStoreStr) : {};
        const curList: string[] = localReservedMap[showtime.id] || [];
        localReservedMap[showtime.id] = Array.from(new Set([...curList, ...bookedSeatIds]));
        localStorage.setItem('meo_reserved_seats_map', JSON.stringify(localReservedMap));
      } catch (e) {}

      // 2. Update local seats state to mark these seats as reserved
      setSeats((prev) =>
        prev.map((s) => (s.status === 'selected' ? { ...s, status: 'reserved' } : s))
      );

      // 3. Enhance ticket with movie/theater info and explicit seatNumbers
      const fullTicket: DigitalTicket = {
        ...ticket,
        movieTitle: movie.title,
        posterUrl: movie.posterUrl,
        cinemaName: theater.name,
        cinemaAddress: theater.address,
        screenRoom: showtime.room,
        format: showtime.format,
        showDate: date,
        showTime: showtime.time,
        seatNumbers: (Array.isArray(ticket.seatNumbers) && ticket.seatNumbers.length > 0)
          ? ticket.seatNumbers
          : bookedSeatIds,
        totalPrice: ticket.totalPrice || selectedSeats.reduce((sum, s) => sum + s.price, 0),
        combos: ticket.combos || Object.entries(comboQuantities).filter(([_, q]) => q > 0).map(([cId, q]) => `${q}x Combo`)
      };

      // 4. Save to localStorage so MyTicketsModal always finds it immediately
      try {
        const saved = JSON.parse(localStorage.getItem('meo_saved_tickets') || '[]');
        const updated = [fullTicket, ...saved.filter((t: any) => t.bookingId !== fullTicket.bookingId)];
        localStorage.setItem('meo_saved_tickets', JSON.stringify(updated));
      } catch (e) {}

      setConfirmedTicket(fullTicket);
    } catch (err: any) {
      console.error('Booking failed:', err);
      const errMsg = err.message || 'Không thể tạo đơn đặt vé. Ghế có thể vừa có khách khác đặt!';
      setBookingError(errMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  // Group seats by row for rendering
  const seatsByRow = useMemo(() => {
    const map: { [row: string]: Seat[] } = {};
    seats.forEach((seat) => {
      if (!map[seat.row]) map[seat.row] = [];
      map[seat.row].push(seat);
    });
    return map;
  }, [seats]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="seat-modal-window animate-modal-pop"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="seat-modal-header">
          <div>
            <div className="flex items-center gap-2">
              <span className={`badge-rate badge-${(movie.ageRating || 'C13').toLowerCase()}`}>
                {movie.ageRating || 'C13'}
              </span>
              <h3 className="seat-modal-movie-title">{movie.title}</h3>
            </div>
            <p className="seat-modal-meta">
              {theater.name} • {showtime.room} • {showtime.time} - {date}
            </p>
          </div>

          <button
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Đóng cửa sổ"
          >
            <X size={18} />
          </button>
        </div>

        {/* Warning Banner if Showtime is Past */}
        {isPast && (
          <div
            style={{
              padding: '12px 18px',
              backgroundColor: '#fef2f2',
              borderBottom: '1px solid #fecaca',
              color: '#b91c1c',
              fontSize: '13px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            <AlertCircle size={20} className="shrink-0" />
            <span>⚠️ Suất chiếu này ({showtime.time} • {date}) đã bắt đầu hoặc đã qua giờ chiếu. Hệ thống đã khóa tính năng đặt vé cho suất này!</span>
          </div>
        )}

        {/* Digital Ticket Screen if Confirmed */}
        {confirmedTicket ? (
          <div className="ticket-success-wrap">
            <div className="flex flex-col items-center">
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: '#dcfce7',
                  color: '#16a34a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '12px'
                }}
              >
                <CheckCircle size={36} />
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--gray-900)' }}>
                Đặt vé xem phim thành công!
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--gray-500)', marginTop: '4px' }}>
                Vé điện tử của bạn đã được ghi nhận trên hệ thống MeoCinema
              </p>
            </div>

            {/* Ticket Card */}
            <div className="ticket-card">
              <div className="ticket-card-header">
                <img
                  src={confirmedTicket.posterUrl}
                  alt={confirmedTicket.movieTitle}
                  className="ticket-movie-poster"
                />
                <div>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', opacity: 0.9 }}>
                    VÉ XEM PHIM ĐIỆN TỬ • MEOCINEMA
                  </div>
                  <div style={{ fontSize: '17px', fontWeight: 800 }}>
                    {confirmedTicket.movieTitle}
                  </div>
                  <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.95 }}>
                    Mã đặt vé: <strong>{confirmedTicket.bookingId}</strong>
                  </div>
                </div>
              </div>

              <div className="ticket-card-body">
                <div className="ticket-row">
                  <span className="ticket-row-label">Rạp chiếu:</span>
                  <span className="ticket-row-val">{confirmedTicket.cinemaName}</span>
                </div>
                <div className="ticket-row">
                  <span className="ticket-row-label">Phòng chiếu:</span>
                  <span className="ticket-row-val">{confirmedTicket.screenRoom} ({confirmedTicket.format})</span>
                </div>
                <div className="ticket-row">
                  <span className="ticket-row-label">Suất chiếu:</span>
                  <span className="ticket-row-val">
                    {confirmedTicket.showTime} • {confirmedTicket.showDate}
                  </span>
                </div>
                <div className="ticket-row">
                  <span className="ticket-row-label">Ghế ngồi:</span>
                  <span className="ticket-row-val" style={{ color: 'var(--pink-primary)', fontWeight: 800 }}>
                    {Array.isArray(confirmedTicket.seatNumbers)
                      ? confirmedTicket.seatNumbers.join(', ')
                      : Array.isArray((confirmedTicket as any).seats)
                      ? (confirmedTicket as any).seats.join(', ')
                      : String(confirmedTicket.seatNumbers || 'VIP-F8')}
                  </span>
                </div>
                {confirmedTicket.combos && (Array.isArray(confirmedTicket.combos) ? confirmedTicket.combos.length > 0 : true) && (
                  <div className="ticket-row">
                    <span className="ticket-row-label">Bắp nước:</span>
                    <span className="ticket-row-val">
                      {Array.isArray(confirmedTicket.combos) ? confirmedTicket.combos.join(', ') : String(confirmedTicket.combos)}
                    </span>
                  </div>
                )}
                <div className="ticket-row" style={{ borderBottom: 'none' }}>
                  <span className="ticket-row-label">Tổng thanh toán:</span>
                  <span className="ticket-row-val" style={{ fontSize: '16px', color: 'var(--pink-momo)' }}>
                    {confirmedTicket.totalPrice.toLocaleString()}đ
                  </span>
                </div>
              </div>

              {/* QR Code */}
              <div className="ticket-qr-section">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                    confirmedTicket.bookingId
                  )}`}
                  alt="Mã QR vé xem phim"
                  className="qr-code-img"
                />
                <span style={{ fontSize: '11px', color: 'var(--gray-500)', marginTop: '8px' }}>
                  Quét mã tại Kiosk hoặc quầy vé rạp để vào xem phim
                </span>
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                className="location-quick-btn"
                onClick={() => alert(`Đã lưu vé ${confirmedTicket.bookingId} về máy!`)}
              >
                <Download size={15} />
                <span>Tải vé điện tử</span>
              </button>

              <button
                className="voucher-apply-btn"
                style={{ backgroundColor: 'var(--pink-primary)', color: '#fff' }}
                onClick={onClose}
              >
                <span>Hoàn tất & Đóng</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Modal Body: Cinema Hall, Seats, Combos */}
            <div className="seat-modal-body">
              {/* Screen */}
              <div className="screen-container">
                <div className="curved-screen-bar" />
                <span className="screen-label-text">Màn hình (Screen)</span>
              </div>

              {/* Seat Matrix */}
              <div className="seat-matrix-wrapper">
                {Object.keys(seatsByRow).map((row) => (
                  <div key={row} className="seat-row-wrap">
                    <span className="seat-row-label">{row}</span>
                    {seatsByRow[row].map((seat) => {
                      const isSelected = seat.status === 'selected';
                      const isReserved = seat.status === 'reserved';
                      return (
                        <button
                          key={seat.id}
                          className={`seat-btn ${seat.type} ${
                            isSelected ? 'selected' : ''
                          } ${isReserved ? 'reserved' : ''}`}
                          onClick={() => handleSeatClick(seat.id)}
                          disabled={isReserved}
                          title={`Ghế ${seat.id} - ${seat.type.toUpperCase()} - ${seat.price.toLocaleString()}đ`}
                        >
                          {seat.col}
                        </button>
                      );
                    })}
                    <span className="seat-row-label">{row}</span>
                  </div>
                ))}
              </div>

              {/* Seat Legend */}
              <div className="seat-legend-bar">
                <div className="legend-item">
                  <div className="legend-box" style={{ background: '#334155', border: '1px solid #475569' }} />
                  <span>Ghế thường (85.000đ)</span>
                </div>
                <div className="legend-item">
                  <div className="legend-box" style={{ background: '#854d0e', border: '1px solid #ca8a04' }} />
                  <span>Ghế VIP (105.000đ)</span>
                </div>
                <div className="legend-item">
                  <div className="legend-box" style={{ background: '#831843', border: '1px solid #db2777' }} />
                  <span>Ghế Đôi (190.000đ)</span>
                </div>
                <div className="legend-item">
                  <div className="legend-box" style={{ background: 'var(--pink-accent)' }} />
                  <span>Đang chọn</span>
                </div>
                <div className="legend-item">
                  <div className="legend-box" style={{ background: '#dc2626', border: '1px solid #b91c1c' }} />
                  <span style={{ color: '#ef4444', fontWeight: 700 }}>Đã có người đặt (Màu đỏ)</span>
                </div>
              </div>

              {/* Popcorn and Drinks Section */}
              <div className="combos-container">
                <h4 className="combos-title">🍿 Bắp nước ưu đãi MeoCinema</h4>
                <div className="combo-items-list">
                  {COMBOS.map((combo) => {
                    const count = comboQuantities[combo.id] || 0;
                    return (
                      <div key={combo.id} className="combo-card">
                        <div className="combo-card-left">
                          <img
                            src={combo.image}
                            alt={combo.name}
                            className="combo-icon-img"
                          />
                          <div>
                            <div className="combo-name">{combo.name}</div>
                            <div className="combo-desc">{combo.description}</div>
                            <div className="combo-price">
                              {combo.price.toLocaleString()}đ
                            </div>
                          </div>
                        </div>

                        <div className="counter-btn-group">
                          <button
                            className="counter-btn"
                            onClick={() => handleComboChange(combo.id, -1)}
                            disabled={count <= 0}
                            style={{ opacity: count <= 0 ? 0.4 : 1 }}
                          >
                            -
                          </button>
                          <span className="counter-value">{count}</span>
                          <button
                            className="counter-btn"
                            onClick={() => handleComboChange(combo.id, 1)}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Footer: Voucher & Pay */}
            <div className="seat-modal-footer">
              {/* Voucher Bar */}
              <div className="voucher-input-bar">
                <input
                  type="text"
                  placeholder="Nhập mã ưu đãi (Thử: MEOCINEMA hoặc MEOCAT50)..."
                  value={voucherCode}
                  onChange={(e) => setVoucherCode(e.target.value)}
                  className="voucher-field"
                />
                <button className="voucher-apply-btn" onClick={handleApplyVoucher}>
                  Áp dụng
                </button>
              </div>

              {voucherError && (
                <div style={{ fontSize: '12px', color: '#dc2626', fontWeight: 500 }}>
                  {voucherError}
                </div>
              )}

              {appliedVoucher && (
                <div
                  style={{
                    fontSize: '12px',
                    color: '#059669',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <ShieldCheck size={14} />
                  <span>
                    Đã áp dụng mã {appliedVoucher.code} (-{discountAmount.toLocaleString()}đ)
                  </span>
                </div>
              )}

              {/* Customer Info for Ticket & Tra Cứu */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '10px',
                  padding: '12px',
                  background: 'rgba(243, 244, 246, 0.6)',
                  borderRadius: '12px',
                  border: '1px solid rgba(229, 231, 235, 0.8)'
                }}
              >
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#4b5563', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                    <User size={12} />
                    Họ và tên người nhận vé
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Nguyễn Văn An"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: '13px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      background: '#fff',
                      outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#4b5563', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                    <Phone size={12} />
                    Số điện thoại nhận vé & tra cứu
                  </label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="0909123456"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: '13px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      background: '#fff',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Distributed Lock Countdown Alert */}
              {selectedSeats.length > 0 && (
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(79, 70, 229, 0.08)',
                    border: '1px solid rgba(79, 70, 229, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '12px',
                    color: '#4338ca'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldCheck size={15} />
                    <span>Hệ thống phân tán đang khóa giữ ghế tạm thời (Linearizability):</span>
                  </div>
                  <span style={{ fontWeight: 800, fontFamily: 'monospace', fontSize: '13px', color: '#dc2626' }}>
                    {Math.floor(timeLeft / 60).toString().padStart(2, '0')}:{(timeLeft % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              )}

              {/* Payment Method Selector */}
              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '6px' }}>
                  Chọn phương thức thanh toán
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                  {[
                    { id: 'momo', label: 'Ví MoMo', icon: '💖', badge: 'Khuyên dùng' },
                    { id: 'zalopay', label: 'ZaloPay', icon: '⚡', badge: 'Giảm 10K' },
                    { id: 'card', label: 'Thẻ / Visa', icon: '💳', badge: 'Quốc tế' },
                    { id: 'qr', label: 'VietQR', icon: '📱', badge: 'Napas247' }
                  ].map((pm) => (
                    <button
                      key={pm.id}
                      type="button"
                      onClick={() => setPaymentMethod(pm.id as any)}
                      style={{
                        padding: '8px 6px',
                        borderRadius: '10px',
                        border: paymentMethod === pm.id ? '2px solid var(--brand-primary, #ec4899)' : '1px solid #e5e7eb',
                        backgroundColor: paymentMethod === pm.id ? 'rgba(236, 72, 153, 0.06)' : '#ffffff',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ fontSize: '16px', marginBottom: '2px' }}>{pm.icon}</div>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: paymentMethod === pm.id ? 'var(--brand-primary, #ec4899)' : '#374151' }}>
                        {pm.label}
                      </div>
                      <div style={{ fontSize: '9px', color: paymentMethod === pm.id ? 'var(--brand-primary, #ec4899)' : '#9ca3af', fontWeight: 600 }}>
                        {pm.badge}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {bookingError && (
                <div
                  style={{
                    padding: '10px 14px',
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '10px',
                    color: '#b91c1c',
                    fontSize: '12px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{bookingError}</span>
                </div>
              )}

              {/* Order summary */}
              <div className="checkout-summary-row">
                <div className="seats-selected-summary">
                  {selectedSeats.length === 0 ? (
                    <span>Vui lòng chọn ghế ngồi trên sơ đồ</span>
                  ) : (
                    <span>
                      Ghế: <span className="seats-code-highlight">
                        {selectedSeats.map((s) => s.id).join(', ')}
                      </span>{' '}
                      ({selectedSeats.length} vé)
                    </span>
                  )}
                </div>

                <div className="text-right">
                  <div style={{ fontSize: '11px', color: 'var(--gray-500)' }}>
                    TỔNG TIỀN THANH TOÁN
                  </div>
                  <div className="checkout-total-price">
                    {finalTotal.toLocaleString()}đ
                  </div>
                </div>
              </div>

              {/* MeoCinema CTA Button */}
              <button
                className="momo-pay-cta-btn"
                onClick={handlePayment}
                disabled={isPast || selectedSeats.length === 0 || isProcessing}
                style={{
                  background: isPast
                    ? '#9ca3af'
                    : paymentMethod === 'momo'
                    ? 'linear-gradient(135deg, #a855f7, #ec4899)'
                    : paymentMethod === 'zalopay'
                    ? 'linear-gradient(135deg, #0284c7, #06b6d4)'
                    : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                  cursor: isPast ? 'not-allowed' : selectedSeats.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: isPast ? 0.75 : 1
                }}
              >
                {isProcessing ? (
                  <span>Đang kết nối cổng thanh toán & xuất vé...</span>
                ) : isPast ? (
                  <span>⚠️ Suất chiếu đã qua giờ chiếu (Ngừng nhận đặt vé)</span>
                ) : (
                  <>
                    <Ticket size={20} />
                    <span>
                      Thanh toán {finalTotal.toLocaleString()}đ (
                      {paymentMethod === 'momo'
                        ? 'Ví MoMo'
                        : paymentMethod === 'zalopay'
                        ? 'Ví ZaloPay'
                        : paymentMethod === 'card'
                        ? 'Thẻ Quốc tế'
                        : 'Mã VietQR'}
                      )
                    </span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
