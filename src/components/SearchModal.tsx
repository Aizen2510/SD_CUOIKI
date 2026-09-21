import React, { useState, useMemo } from 'react';
import { X, Search, Film, MapPin } from 'lucide-react';
import { Movie, CinemaTheater } from '../types/cinema';

interface SearchModalProps {
  movies: Movie[];
  theaters: CinemaTheater[];
  onSelectMovie: (movie: Movie) => void;
  onSelectTheater: (theater: CinemaTheater) => void;
  onClose: () => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  movies,
  theaters,
  onSelectMovie,
  onSelectTheater,
  onClose
}) => {
  const [query, setQuery] = useState('');

  const matchedMovies = useMemo(() => {
    if (!query.trim()) return [];
    return movies.filter(
      (m) =>
        m.title.toLowerCase().includes(query.toLowerCase()) ||
        m.genre.toLowerCase().includes(query.toLowerCase())
    );
  }, [movies, query]);

  const matchedTheaters = useMemo(() => {
    if (!query.trim()) return [];
    return theaters.filter(
      (t) =>
        t.name.toLowerCase().includes(query.toLowerCase()) ||
        t.address.toLowerCase().includes(query.toLowerCase())
    );
  }, [theaters, query]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="animate-modal-pop"
        style={{
          background: '#ffffff',
          width: '100%',
          maxWidth: '600px',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-lg)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--gray-200)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <Search size={20} color="var(--pink-primary)" />
          <input
            type="text"
            placeholder="Tìm phim, rạp chiếu (VD: Lên Hương, CGV, Lotte...)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: '16px',
              color: 'var(--gray-900)'
            }}
            autoFocus
          />
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Results Body */}
        <div style={{ maxHeight: '450px', overflowY: 'auto', padding: '16px 20px' }}>
          {!query.trim() ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--gray-500)' }}>
              Nhập từ khoá để tìm kiếm phim hoặc cụm rạp yêu thích
            </div>
          ) : (
            <>
              {/* Movies Section */}
              {matchedMovies.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color: 'var(--gray-500)',
                      textTransform: 'uppercase',
                      marginBottom: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Film size={14} />
                    <span>Phim ({matchedMovies.length})</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {matchedMovies.map((movie) => (
                      <div
                        key={movie.id}
                        onClick={() => {
                          onSelectMovie(movie);
                          onClose();
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '8px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          backgroundColor: 'var(--gray-50)',
                          transition: 'all 0.2s ease'
                        }}
                        className="hover:bg-pink-50"
                      >
                        <img
                          src={movie.posterUrl}
                          alt={movie.title}
                          style={{ width: '40px', height: '58px', borderRadius: '4px', objectFit: 'cover' }}
                        />
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--gray-900)' }}>
                            {movie.title}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--gray-500)' }}>
                            {movie.genre} • {movie.duration} phút
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Theaters Section */}
              {matchedTheaters.length > 0 && (
                <div>
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color: 'var(--gray-500)',
                      textTransform: 'uppercase',
                      marginBottom: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <MapPin size={14} />
                    <span>Rạp chiếu ({matchedTheaters.length})</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {matchedTheaters.map((theater) => (
                      <div
                        key={theater.id}
                        onClick={() => {
                          onSelectTheater(theater);
                          onClose();
                        }}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          backgroundColor: 'var(--gray-50)',
                          transition: 'all 0.2s ease'
                        }}
                        className="hover:bg-pink-50"
                      >
                        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--gray-900)' }}>
                          {theater.name}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--gray-500)' }}>
                          {theater.address}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {matchedMovies.length === 0 && matchedTheaters.length === 0 && (
                <div style={{ padding: '30px', textAlign: 'center', color: 'var(--gray-500)' }}>
                  Không tìm thấy kết quả nào cho "{query}"
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
