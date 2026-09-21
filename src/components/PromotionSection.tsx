import React, { useState } from 'react';
import { Copy, Check, Sparkles } from 'lucide-react';
import { PROMOTIONS } from '../data/cinemaData';

export const PromotionSection: React.FC = () => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <section className="promo-section" id="khuyenmai">
      <div className="container-custom">
        <div className="section-header">
          <h2 className="section-title">Tin tức - Khuyến mãi</h2>
          <p style={{ fontSize: '14px', color: 'var(--gray-500)', marginTop: '4px' }}>
            Tổng hợp ưu đãi đặt vé xem phim giá hời độc quyền trên MeoCinema
          </p>
        </div>

        <div className="promo-cards-grid">
          {PROMOTIONS.map((promo) => (
            <div key={promo.code} className="promo-card">
              <div className="promo-img-wrap">
                <img
                  src={promo.banner}
                  alt={promo.title}
                  className="promo-img"
                  loading="lazy"
                />
              </div>

              <div className="promo-content">
                <div className="flex items-center gap-1.5 mb-1" style={{ color: 'var(--pink-primary)', fontSize: '12px', fontWeight: 700 }}>
                  <Sparkles size={14} />
                  <span>ƯU ĐÃI ĐỘC QUYỀN MEOCINEMA</span>
                </div>
                <h3 className="promo-title">{promo.title}</h3>
                <p className="promo-desc">{promo.desc}</p>

                <div className="promo-copy-bar">
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--gray-600)', display: 'block' }}>
                      MÃ GIẢM GIÁ
                    </span>
                    <span className="promo-code-text">{promo.code}</span>
                  </div>

                  <button
                    className="copy-btn flex items-center gap-1"
                    onClick={() => handleCopy(promo.code)}
                  >
                    {copiedCode === promo.code ? (
                      <>
                        <Check size={14} />
                        <span>Đã chép</span>
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        <span>Sao chép</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
