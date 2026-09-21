import React from 'react';
import { CINEPLEX_BRANDS } from '../data/cinemaData';
import { CatLogo } from './CatLogo';

export const Footer: React.FC = () => {
  return (
    <footer className="momo-footer">
      <div className="container-custom">
        {/* Cinema Partners Strip */}
        <div className="footer-partners-strip">
          <div className="partners-title">Đối tác rạp chiếu phim liên kết</div>
          <div className="partner-logos-row">
            {CINEPLEX_BRANDS.filter((b) => b.code !== 'ALL').map((brand) => (
              <img
                key={brand.id}
                src={brand.logo}
                alt={brand.name}
                title={brand.name}
                className="partner-logo-mini"
              />
            ))}
          </div>
        </div>

        {/* Info Grid */}
        <div className="footer-grid">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <CatLogo size={32} />
              <span className="footer-brand-title" style={{ margin: 0, fontSize: '17px' }}>
                MeoCinema - Đặt Vé Xem Phim Siêu Nhanh
              </span>
            </div>
            <p className="footer-contact-text">
              Công ty Cổ phần Công nghệ & Điện ảnh MeoCinema (MeoCinema Entertainment)<br />
              Tòa nhà Meo Tower, 128 Nguyễn Thị Minh Khai, Phường Võ Thị Sáu, Quận 3, TP. Hồ Chí Minh.<br />
              Hotline hỗ trợ: <strong>1900 8888</strong> (24/7) | Email: <strong>hotro@meocinema.vn</strong>
            </p>
          </div>

          <div>
            <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--gray-900)', marginBottom: '12px' }}>
              Dịch vụ MeoCinema
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li><a href="#phimdangchieu" className="hover:text-pink-600">Lịch chiếu phim rạp</a></li>
              <li><a href="#phimsapchieu" className="hover:text-pink-600">Phim bom tấn sắp chiếu</a></li>
              <li><a href="#khuyenmai" className="hover:text-pink-600">Mã giảm giá vé xem phim</a></li>
              <li><a href="#cumrap" className="hover:text-pink-600">Danh sách các cụm rạp</a></li>
            </ul>
          </div>

          <div>
            <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--gray-900)', marginBottom: '12px' }}>
              Hệ thống rạp chiếu
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li><a href="#cgv" className="hover:text-pink-600">Vé xem phim CGV</a></li>
              <li><a href="#lotte" className="hover:text-pink-600">Vé xem phim Lotte Cinema</a></li>
              <li><a href="#galaxy" className="hover:text-pink-600">Vé xem phim Galaxy Cinema</a></li>
              <li><a href="#bhd" className="hover:text-pink-600">Vé xem phim BHD Star</a></li>
              <li><a href="#beta" className="hover:text-pink-600">Vé xem phim Beta Cinemas</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="footer-bottom-bar">
          <p>© 2026 MeoCinema. Nền tảng đặt vé xem phim trực tuyến hàng đầu Việt Nam.</p>
        </div>
      </div>
    </footer>
  );
};
