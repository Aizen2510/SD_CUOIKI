import React from 'react';
import { Check, Home, ChevronRight } from 'lucide-react';

export const HeroSection: React.FC = () => {
  const benefits = [
    { text: 'Lịch chiếu luôn', bold: 'cập nhật sớm nhất' },
    { text: 'các rạp', bold: 'Suất chiếu đầy đủ', prefixBold: true },
    { text: 'Đặt vé MeoCinema', bold: 'mua vé siêu nhanh' },
    { text: 'yêu thích mọi nơi', bold: 'Đặt vé lịch chiếu phim', prefixBold: true },
  ];

  return (
    <>
      {/* Breadcrumb Strip */}
      <div className="momo-breadcrumb">
        <div className="container-custom">
          <ul className="breadcrumb-list">
            <li className="breadcrumb-item">
              <a href="#home" title="Trang chủ MeoCinema" className="flex items-center">
                <Home size={15} />
              </a>
            </li>
            <ChevronRight size={13} className="text-gray-400" />
            <li className="breadcrumb-item">
              <a href="#cinema">Cinema</a>
            </li>
            <ChevronRight size={13} className="text-gray-400" />
            <li className="breadcrumb-item current">
              <span>Lịch chiếu</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Main Hero Section */}
      <section className="momo-hero">
        <div className="container-custom">
          <div className="hero-grid">
            {/* Left Content */}
            <div>
              <h1 className="hero-title">Lịch chiếu phim trên MeoCinema</h1>
              <p className="hero-desc">
                Khám phá thế giới điện ảnh tại những cụm rạp hàng đầu, cập nhật lịch chiếu
                chính xác từng phút và săn vé xem phim giá hời cùng MeoCinema.
              </p>

              <div className="hero-features-list">
                {benefits.map((b, idx) => (
                  <div key={idx} className="hero-feature-item">
                    <div className="hero-check-circle">
                      <Check size={14} strokeWidth={3} />
                    </div>
                    <div>
                      {b.prefixBold ? (
                        <>
                          <strong>{b.bold}</strong> {b.text}
                        </>
                      ) : (
                        <>
                          {b.text} <strong>{b.bold}</strong>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Banner Showcase */}
            <div className="hero-banner-wrap">
              <img
                src="https://homepage.momocdn.net/img/momo-amazone-s3-api-241016111351-638646740316589907.jpg"
                alt="Đặt vé xem phim trên MeoCinema"
                className="hero-banner-img"
              />
            </div>
          </div>
        </div>
      </section>
    </>
  );
};
