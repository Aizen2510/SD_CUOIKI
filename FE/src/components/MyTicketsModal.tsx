import React, { useState, useEffect } from 'react';
import { X, Search, Ticket, Calendar, Clock, MapPin, Film, Printer, CheckCircle, AlertCircle, User, Sparkles, RotateCcw, BadgeCheck } from 'lucide-react';
import { DigitalTicket, UserProfile } from '../types/cinema';
import { api } from '../services/api';

interface MyTicketsModalProps {
  isOpen: boolean;
  currentUser?: UserProfile | null;
  onClose: () => void;
}

export const MyTicketsModal: React.FC<MyTicketsModalProps> = ({ isOpen, currentUser, onClose }) => {
  const [searchValue, setSearchValue] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [tickets, setTickets] = useState<DigitalTicket[]>([]);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [refundError, setRefundError] = useState<string>('');
  const [refundingTicket, setRefundingTicket] = useState<string>('');

  // Auto-search tickets when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchValue('');
      if (currentUser?.phone) executeSearch(currentUser.phone);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, currentUser]);

  const executeSearch = async (queryStr: string) => {
    const query = queryStr.trim();
    if (!query) {
      setErrorMsg('Vui lòng nhập số điện thoại để tra cứu vé.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      let foundTickets: DigitalTicket[] = [];
      const results = await api.getTicketsByPhone(query);
      if (results && results.length > 0) {
        foundTickets = results.map((ticket) => ({ ...ticket, apiBacked: true }));
      }

      // Backend database là chân lý: Tự động dọn dẹp các vé cũ trong localStorage nếu DB đã reset
      try {
        const localSaved: DigitalTicket[] = JSON.parse(localStorage.getItem('meo_saved_tickets') || '[]');
        const updatedLocal = localSaved.filter(
          (t) => t.customerPhone?.trim() !== query || foundTickets.some((ft) => ft.bookingId === t.bookingId)
        );
        localStorage.setItem('meo_saved_tickets', JSON.stringify(updatedLocal));
      } catch (e) {}

      setTickets(foundTickets);
      setErrorMsg('');
    } catch (err: any) {
      setErrorMsg('Có lỗi xảy ra khi tra cứu vé. Vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    executeSearch(searchValue);
  };

  const hasShowtimeStarted = (ticket: DigitalTicket) => {
    const time = ticket.showTime?.slice(0, 8) || '00:00:00';
    const start = new Date(`${ticket.showDate}T${time}`);
    return Number.isFinite(start.getTime()) && start.getTime() <= Date.now();
  };

  const isRefunded = (ticket: DigitalTicket) =>
    ticket.paymentStatus?.toLowerCase().includes('hoàn') || ticket.paymentStatus?.toLowerCase() === 'refunded';

  const handleRefund = async (ticket: DigitalTicket) => {
    if (!ticket.customerPhone) {
      setRefundError('Vé thiếu số điện thoại đặt vé nên không thể xác thực hoàn tiền.');
      return;
    }
    if (!window.confirm(`Hoàn vé ${ticket.bookingId} (${ticket.seatNumbers.join(', ')})? Ghế sẽ được mở bán lại.`)) return;

    setRefundError('');
    setRefundingTicket(ticket.bookingId);
    try {
      await api.refundTicket(ticket.bookingId, ticket.customerPhone);
      await executeSearch(searchValue);
    } catch (err: any) {
      setRefundError(err.message || 'Không thể hoàn vé. Vui lòng thử lại.');
    } finally {
      setRefundingTicket('');
    }
  };

  const handlePrint = (ticket: DigitalTicket) => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop-custom">
      <div className="modal-container-custom animate-fade-in">
        {/* Header */}
        <div className="my-tickets-header">
          <button
            onClick={onClose}
            className="modal-close-btn"
            style={{ position: 'absolute', top: '16px', right: '16px', color: '#fff', background: 'rgba(255,255,255,0.2)' }}
            title="Đóng"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
              <Ticket size={26} className="text-yellow-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight">Vé Đã Đặt Của Tôi</h2>
                <span className="px-2 py-0.5 text-xs font-bold bg-pink-500/30 text-pink-200 border border-pink-400/30 rounded-full flex items-center gap-1">
                  <Sparkles size={11} /> MeoCinema
                </span>
              </div>
              <p className="text-xs text-purple-100 opacity-90 mt-1">
                Xem lại danh sách vé xem phim, sơ đồ ghế đã chọn và mã QR vào rạp
              </p>
            </div>
          </div>

          {/* User Account Info Pill if Logged In */}
          {currentUser && (
            <div className="mt-4 p-2.5 px-3.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <User size={14} className="text-yellow-300" />
                <span>
                  Đang xem vé của tài khoản: <strong>{currentUser.fullName}</strong> ({currentUser.phone || currentUser.email})
                </span>
              </div>
              <span className="bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 px-2 py-0.5 rounded-full font-semibold text-[11px]">
                Đã đăng nhập
              </span>
            </div>
          )}

        </div>

        {/* Search Input Bar */}
        <div className="my-tickets-search-bar">
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="ticket-search-field">
              <Search className="ticket-search-icon" size={18} />
              <input
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Nhập số điện thoại tài khoản"
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none transition-all shadow-sm"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 shrink-0 disabled:opacity-50"
            >
              {isLoading ? 'Đang tải...' : 'Tìm vé'}
            </button>
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem('meo_saved_tickets');
                localStorage.removeItem('meo_reserved_seats_map');
                setTickets([]);
                setErrorMsg('');
              }}
              title="Dọn sạch vé lưu tạm trên trình duyệt"
              className="px-3 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 shrink-0"
            >
              <RotateCcw size={14} /> Dọn sạch
            </button>
          </form>

          {errorMsg && (
            <div className="mt-2.5 p-2.5 px-3 bg-red-50 text-red-700 rounded-xl text-xs flex items-center gap-2 border border-red-100">
              <AlertCircle size={15} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Results Container */}
        <div className="my-tickets-results">
          {refundError && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
              <AlertCircle size={15} /> {refundError}
            </div>
          )}
          {tickets.length === 0 && !isLoading && (
            <div className="text-center py-10 text-gray-400">
              <Ticket size={48} className="mx-auto mb-3 opacity-30 text-purple-600" />
              <p className="text-sm font-semibold text-gray-700">Chưa tìm thấy vé xem phim nào</p>
              <p className="text-xs text-gray-500 mt-1">
                Backend chưa tìm thấy vé theo thông tin này. Hãy kiểm tra lại số điện thoại hoặc mã vé.
              </p>
              <button
                onClick={onClose}
                className="mt-4 px-4 py-2 bg-pink-500 text-white text-xs font-bold rounded-xl shadow hover:bg-pink-600 transition-all"
              >
                Đặt vé ngay
              </button>
            </div>
          )}

          {tickets.map((t) => (
            <div
              key={t.bookingId}
              className="my-ticket-card border-2 border-purple-100 rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-all"
            >
              <div className={`my-ticket-card-header ${isRefunded(t) ? 'is-refunded' : ''}`}>
                <div className="ticket-card-identity">
                  {isRefunded(t)
                    ? <BadgeCheck size={21} className="ticket-state-icon refunded" />
                    : <CheckCircle size={21} className="ticket-state-icon paid" />}
                  <span className="font-extrabold text-purple-900 tracking-wide text-sm">{t.bookingId}</span>
                  <span className={`ticket-payment-status ${isRefunded(t) ? 'is-refunded' : 'is-paid'}`}>
                    {isRefunded(t) && <CheckCircle size={14} />}
                    {t.paymentStatus || 'Đã thanh toán'}
                  </span>
                </div>
                <div className="ticket-booking-time">
                  <Clock size={14} /> Đặt lúc: {t.bookingTime}
                </div>
              </div>

              {isRefunded(t) && (
                <div className="ticket-refund-success" role="status">
                  <div className="ticket-refund-success-icon"><CheckCircle size={18} /></div>
                  <div>
                    <strong>Hoàn vé thành công</strong>
                    <span>Tiền đã được hoàn · Ghế đã được mở bán lại</span>
                  </div>
                </div>
              )}

              <div className="my-ticket-card-body p-4 flex flex-col md:flex-row gap-4 items-center">
                {/* QR Code */}
                {!isRefunded(t) && (
                  <div className="flex flex-col items-center shrink-0">
                    <div className="w-24 h-24 p-2 bg-white rounded-xl border border-gray-200 shadow-sm flex items-center justify-center">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(
                          t.qrCodeValue || t.bookingId
                        )}`}
                        alt="QR Code"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 mt-1.5 uppercase tracking-wider">
                      Quét tại Kiosk
                    </span>
                  </div>
                )}

                {/* Details */}
                <div className="flex-1 space-y-2 text-xs w-full">
                  <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                    <Film size={15} className="text-purple-600" />
                    <span>{t.movieTitle}</span>
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-gray-600">
                    <div className="flex items-center gap-1.5">
                      <MapPin size={13} className="text-gray-400 shrink-0" />
                      <span className="font-semibold text-gray-800">{t.cinemaName}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Calendar size={13} className="text-gray-400 shrink-0" />
                      <span>{t.showDate}</span>
                      <Clock size={13} className="text-gray-400 shrink-0 ml-2" />
                      <span className="font-bold text-purple-700">{t.showTime}</span>
                    </div>
                  </div>

                  <div className="bg-purple-50/70 p-2.5 rounded-xl border border-purple-100 flex flex-wrap gap-3 items-center justify-between text-xs">
                    <div>
                      <span className="text-gray-500">Phòng: </span>
                      <span className="font-bold text-gray-800">{t.screenRoom} ({t.format})</span>
                    </div>

                    <div>
                      <span className="text-gray-500">Ghế đã đặt: </span>
                      <span
                        style={{
                          backgroundColor: '#dc2626',
                          color: '#ffffff',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontWeight: 800,
                          fontSize: '11.5px',
                          display: 'inline-block'
                        }}
                      >
                        {Array.isArray(t.seatNumbers)
                          ? t.seatNumbers.join(', ')
                          : Array.isArray((t as any).seats)
                          ? (t as any).seats.join(', ')
                          : Array.isArray((t as any).seat_numbers)
                          ? (t as any).seat_numbers.join(', ')
                          : (t.seatNumbers ? String(t.seatNumbers) : 'VIP-F8')}
                      </span>
                    </div>

                    {t.combos && (Array.isArray(t.combos) ? t.combos.length > 0 : true) && (
                      <div className="w-full text-xs text-gray-600">
                        <span className="text-gray-500">Bắp nước: </span>
                        <span className="font-medium text-pink-600">
                          {Array.isArray(t.combos) ? t.combos.join(', ') : String(t.combos)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="ticket-bottom-row flex items-center justify-between pt-1">
                    <div className="text-gray-500">
                      Tổng tiền: <span className="text-sm font-extrabold text-pink-600">{(t.totalPrice || (t as any).final_total || 105000).toLocaleString()}đ</span>
                    </div>

                    <div className="ticket-actions flex items-center gap-2">
                      {t.apiBacked && !isRefunded(t) && !hasShowtimeStarted(t) && (
                        <button
                          onClick={() => handleRefund(t)}
                          disabled={refundingTicket === t.bookingId}
                          className="ticket-action-btn ticket-refund-btn"
                        >
                          <RotateCcw size={15} />
                          {refundingTicket === t.bookingId ? 'Đang hoàn...' : 'Hoàn vé'}
                        </button>
                      )}
                      {t.apiBacked && !isRefunded(t) && hasShowtimeStarted(t) && (
                        <span className="ticket-refund-unavailable">Đã đến giờ chiếu · Không thể hoàn</span>
                      )}
                      {!isRefunded(t) && (
                        <button
                          onClick={() => handlePrint(t)}
                          className="ticket-action-btn ticket-print-btn"
                        >
                          <Printer size={15} /> In vé
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
