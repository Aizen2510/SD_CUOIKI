import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { FAQS } from '../data/cinemaData';

export const FaqSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleIndex = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="faq-section">
      <div className="container-custom">
        <div className="section-header">
          <h2 className="section-title">Bạn hỏi, MeoCinema trả lời</h2>
          <p style={{ fontSize: '14px', color: 'var(--gray-500)', marginTop: '4px' }}>
            Giải đáp tất cả các thắc mắc thường gặp khi đặt vé xem phim trên MeoCinema
          </p>
        </div>

        <div className="faq-list">
          {FAQS.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div key={idx} className="faq-card">
                <button
                  className="faq-question-btn"
                  onClick={() => toggleIndex(idx)}
                >
                  <span>{faq.question}</span>
                  <ChevronDown
                    size={18}
                    style={{
                      transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.25s ease'
                    }}
                  />
                </button>

                {isOpen && (
                  <div className="faq-answer-panel animate-fade-in">
                    <p>{faq.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
