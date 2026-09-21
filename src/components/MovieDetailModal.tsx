import React from 'react';
import { X, Star, Clock, Calendar, Tag } from 'lucide-react';
import { Movie } from '../types/cinema';

interface MovieDetailModalProps {
  movie: Movie;
  onClose: () => void;
  onBookNow: () => void;
}

export const MovieDetailModal: React.FC<MovieDetailModalProps> = ({
  movie,
  onClose,
  onBookNow
}) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="animate-modal-pop"
        style={{
          background: '#ffffff',
          width: '100%',
          maxWidth: '780px',
          maxHeight: '90vh',
          borderRadius: '16px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-lg)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div
          style={{
            padding: '14px 20px',
            borderBottom: '1px solid var(--gray-200)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div className="flex items-center gap-2">
            <span className={`badge-rate badge-${movie.ageRating.toLowerCase()}`}>
              {movie.ageRating}
            </span>
            <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--gray-900)' }}>
              {movie.title}
            </h3>
          </div>

          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {/* Trailer Player if available */}
          {movie.trailerUrl && (
            <div
              style={{
                position: 'relative',
                width: '100%',
                paddingBottom: '56.25%',
                borderRadius: '12px',
                overflow: 'hidden',
                backgroundColor: '#000',
                marginBottom: '20px',
                boxShadow: 'var(--shadow-md)'
              }}
            >
              <iframe
                src={`${movie.trailerUrl}?autoplay=1&mute=0`}
                title={`${movie.title} Trailer`}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  border: 'none'
                }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}

          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            <img
              src={movie.posterUrl}
              alt={movie.title}
              style={{
                width: '120px',
                height: '180px',
                borderRadius: '8px',
                objectFit: 'cover',
                boxShadow: 'var(--shadow-sm)'
              }}
            />

            <div style={{ flex: 1, minWidth: '240px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--gray-900)' }}>
                {movie.title}
              </h2>
              {movie.titleEn && (
                <div style={{ fontSize: '13px', color: 'var(--gray-500)', marginBottom: '8px' }}>
                  {movie.titleEn}
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  fontSize: '13px',
                  color: 'var(--gray-600)',
                  margin: '10px 0'
                }}
              >
                <span className="flex items-center gap-1">
                  <Clock size={14} />
                  {movie.duration} phút
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar size={14} />
                  Khởi chiếu: {movie.releaseDate}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 font-bold text-amber-500">
                  <Star size={14} fill="#f59e0b" color="#f59e0b" />
                  {movie.ratingPoint} ({movie.ratingCount.toLocaleString()} đánh giá)
                </span>
              </div>

              <div style={{ fontSize: '13px', color: 'var(--gray-700)', lineHeight: '1.6' }}>
                <div><strong>Thể loại:</strong> {movie.genre}</div>
                <div><strong>Định dạng:</strong> {movie.formats.join(', ')}</div>
                {movie.director && <div><strong>Đạo diễn:</strong> {movie.director}</div>}
                {movie.cast && <div><strong>Diễn viên:</strong> {movie.cast}</div>}
              </div>

              {/* Tags */}
              {movie.tags && movie.tags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '12px' }}>
                  {movie.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      style={{
                        fontSize: '11px',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        backgroundColor: 'var(--pink-light)',
                        color: 'var(--pink-primary)',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px'
                      }}
                    >
                      <Tag size={10} />
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Synopsis */}
          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--gray-200)' }}>
            <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--gray-900)', marginBottom: '8px' }}>
              Nội dung phim
            </h4>
            <p style={{ fontSize: '14px', color: 'var(--gray-700)', lineHeight: '1.7' }}>
              {movie.synopsis}
            </p>
          </div>
        </div>

        {/* Footer Bar */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid var(--gray-200)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
            background: 'var(--gray-50)'
          }}
        >
          <button className="nav-link-btn" onClick={onClose}>
            Đóng
          </button>
          <button
            className="voucher-apply-btn"
            style={{
              backgroundColor: 'var(--pink-primary)',
              color: '#ffffff',
              padding: '10px 24px'
            }}
            onClick={() => {
              onClose();
              onBookNow();
            }}
          >
            Chọn suất chiếu ngay
          </button>
        </div>
      </div>
    </div>
  );
};
