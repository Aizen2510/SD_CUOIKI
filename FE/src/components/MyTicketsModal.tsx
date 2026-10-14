import React, { useState } from 'react';
import { X, Search, Ticket, Calendar, Clock, MapPin, Film, Phone, QrCode, Printer, CheckCircle, AlertCircle } from 'lucide-react';
import { DigitalTicket } from '../types/cinema';
import { api } from '../services/api';

interface MyTicketsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MyTicketsModal: React.FC<MyTicketsModalProps> = ({ isOpen, onClose }) => {
  const [searchType, setSearchType] = useState<'phone' | 'code'>('phone');
  const [searchValue, setSearchValue] = useState<string>('0909123456');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [tickets, setTickets] = useState<DigitalTicket[]>([]);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [hasSearched, setHasSearched] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchValue.trim();
    if (!query) {
      setErrorMsg('Vui lòng nhập số điện thoại hoặc mã vé');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setHasSearched(true);

    try {
      if (searchType === 'code') {
        const ticket = await api.getTicketByCode(query.toUpperCase());
        if (ticket) {
          setTickets([ticket]);
        } else {
          setTickets([]);
          setErrorMsg(`Không tìm thấy vé với mã "${query.toUpperCase()}". Vui lòng kiểm tra lại!`);
        }
      } else {
        const results = await api.getTicketsByPhone(query);
        if (results && results.length > 0) {
          setTickets(results);
        } else {
          setTickets([]);
          setErrorMsg(`Không tìm thấy vé nào được đặt với số điện thoại ${query}`);
        }
      }
    } catch (err: any) {
      setErrorMsg('Có lỗi xảy ra khi tra cứu vé. Vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = (ticket: DigitalTicket) => {
    window.print();
  };

  return (
    <div className="modal-backdrop-custom">
      <div className="modal-container-custom max-w-2xl w-full p-0 overflow-hidden rounded-2xl bg-white shadow-2xl animate-fade-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-pink-600 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-all"
            title="Đóng"
          >
            <X size={20} />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
              <Ticket size={24} className="text-yellow-300" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Tra Cứu Vé Của Tôi</h2>
              <p className="text-sm text-purple-100 opacity-90">
                Nhập số điện thoại hoặc mã đơn vé để xem lại vé điện tử & mã QR vào rạp
              </p>
            </div>
          </div>

          {/* Search Tabs */}
          <div className="flex gap-2 mt-5">
            <button
              onClick={() => {
                setSearchType('phone');
                setSearchValue('0909123456');
                setErrorMsg('');
              }}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5 ${
                searchType === 'phone'
                  ? 'bg-white text-purple-900 shadow-md'
                  : 'bg-white/15 text-white hover:bg-white/25'
              }`}
            >
              <Phone size={15} />
              Theo Số Điện Thoại
            </button>
            <button
              onClick={() => {
                setSearchType('code');
                setSearchValue('MEO-849201');
                setErrorMsg('');
              }}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5 ${
                searchType === 'code'
                  ? 'bg-white text-purple-900 shadow-md'
                  : 'bg-white/15 text-white hover:bg-white/25'
              }`}
            >
              <QrCode size={15} />
              Theo Mã Đặt Vé (MEO-XXXXXX)
            </button>
          </div>
        </div>

        {/* Search Input Bar */}
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder={
                  searchType === 'phone'
                    ? 'Nhập số điện thoại đặt vé (ví dụ: 0909123456)'
                    : 'Nhập mã vé (ví dụ: MEO-849201)'
                }
                className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none transition-all shadow-sm"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-sm font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 shrink-0 disabled:opacity-50"
            >
              {isLoading ? 'Đang tìm...' : 'Tra cứu'}
            </button>
          </form>

          {errorMsg && (
            <div className="mt-3 p-3 bg-red-50 text-red-700 rounded-xl text-sm flex items-center gap-2 border border-red-100">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Results Container */}
        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
          {!hasSearched && tickets.length === 0 && (
            <div className="text-center py-10 text-gray-400">
              <Ticket size={48} className="mx-auto mb-3 opacity-30 text-purple-600" />
              <p className="text-sm font-medium">Nhấn "Tra cứu" để tìm thông tin vé đã đặt của bạn</p>
              <p className="text-xs text-gray-400 mt-1">Gợi ý thử nghiệm: 0909123456 hoặc mã vé MEO-849201</p>
            </div>
          )}

          {hasSearched && tickets.length === 0 && !errorMsg && (
            <div className="text-center py-10 text-gray-400">
              <AlertCircle size={48} className="mx-auto mb-3 opacity-30 text-gray-400" />
              <p className="text-sm font-medium">Không tìm thấy vé xem phim nào</p>
            </div>
          )}

          {tickets.map((t) => (
            <div
              key={t.bookingId}
              className="border-2 border-purple-100 rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-all"
            >
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 border-b border-purple-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle size={18} className="text-emerald-500" />
                  <span className="font-extrabold text-purple-900 tracking-wide text-sm">{t.bookingId}</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">
                    Đã thanh toán
                  </span>
                </div>
                <div className="text-xs text-gray-500 font-medium">
                  {t.bookingTime}
                </div>
              </div>

              <div className="p-5 flex flex-col md:flex-row gap-5 items-center">
                {/* Poster or QR */}
                <div className="flex flex-col items-center shrink-0">
                  <div className="w-28 h-28 p-2 bg-white rounded-xl border border-gray-200 shadow-sm flex items-center justify-center">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(
                        t.qrCodeValue || t.bookingId
                      )}`}
                      alt="QR Code"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-gray-400 mt-1.5 uppercase tracking-wider">
                    Mã quét vào rạp
                  </span>
                </div>

                {/* Details */}
                <div className="flex-1 space-y-2 text-sm w-full">
                  <h3 className="font-bold text-gray-900 text-base flex items-center gap-1.5">
                    <Film size={16} className="text-purple-600" />
                    {t.movieTitle}
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-600">
                    <div className="flex items-center gap-1.5">
                      <MapPin size={14} className="text-gray-400 shrink-0" />
                      <span className="font-medium text-gray-800">{t.cinemaName}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Calendar size={14} className="text-gray-400 shrink-0" />
                      <span>{t.showDate}</span>
                      <Clock size={14} className="text-gray-400 shrink-0 ml-2" />
                      <span className="font-bold text-purple-700">{t.showTime}</span>
                    </div>
                  </div>

                  <div className="bg-purple-50/70 p-3 rounded-xl border border-purple-100/80 flex flex-wrap gap-4 items-center justify-between text-xs">
                    <div>
                      <span className="text-gray-500">Phòng chiếu: </span>
                      <span className="font-bold text-gray-800">{t.screenRoom} ({t.format})</span>
                    </div>

                    <div>
                      <span className="text-gray-500">Số ghế: </span>
                      <span className="font-extrabold text-purple-700 bg-white px-2 py-0.5 rounded border border-purple-200">
                        {t.seatNumbers.join(', ')}
                      </span>
                    </div>

                    {t.combos && t.combos.length > 0 && (
                      <div className="w-full text-xs text-gray-600">
                        <span className="text-gray-500">Bắp nước: </span>
                        <span className="font-medium text-pink-600">{t.combos.join(', ')}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="text-xs text-gray-500">
                      Tổng tiền: <span className="text-base font-extrabold text-pink-600">{t.totalPrice.toLocaleString()}đ</span>
                    </div>

                    <button
                      onClick={() => handlePrint(t)}
                      className="px-3.5 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                    >
                      <Printer size={13} />
                      In vé
                    </button>
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
