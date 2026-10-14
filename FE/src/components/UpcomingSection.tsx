import React from 'react';
import { Calendar } from 'lucide-react';
import { Movie } from '../types/cinema';

interface UpcomingSectionProps {
  movies: Movie[];
  onSelectMovie: (movie: Movie) => void;
}

export const UpcomingSection: React.FC<UpcomingSectionProps> = ({
  movies,
  onSelectMovie
}) => {
  return (
    <section className="upcoming-section" id="phimsapchieu">
      <div className="container-custom">
        <div className="section-header">
          <h2 className="section-title">Phim sắp chiếu</h2>
          <p style={{ fontSize: '14px', color: 'var(--gray-500)', marginTop: '4px' }}>
            Những bom tấn điện ảnh hấp dẫn nhất sắp cập bến phòng vé
          </p>
        </div>

        <div className="upcoming-grid">
          {movies.map((movie) => (
            <div
              key={movie.id}
              className="upcoming-card cursor-pointer"
              onClick={() => onSelectMovie(movie)}
            >
              <div className="upcoming-poster-wrap">
                <img
                  src={movie.posterUrl}
                  alt={movie.title}
                  className="upcoming-poster-img"
                  loading="lazy"
                />
              </div>

              <div className="upcoming-info-pad">
                <span
                  className={`badge-rate badge-${movie.ageRating.toLowerCase()}`}
                  style={{ alignSelf: 'flex-start', marginBottom: '6px' }}
                >
                  {movie.ageRating}
                </span>

                <h4 className="upcoming-film-title" title={movie.title}>
                  {movie.title}
                </h4>

                <div className="upcoming-release-badge flex items-center gap-1">
                  <Calendar size={13} />
                  <span>{movie.releaseDate}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
