import React, { useState, useMemo } from 'react';
import {
  MapPin,
  Compass,
  Search,
  Star,
  PlayCircle,
  Clock,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import {
  Movie,
  CinemaTheater,
  City,
  ShowtimeSlot
} from '../types/cinema';
import {
  CINEPLEX_BRANDS,
  generateDatesList,
  generateShowtimesForMovieAndTheater
} from '../data/cinemaData';

interface ScheduleHubProps {
  currentCity: City;
  onOpenLocationModal: () => void;
  theaters: CinemaTheater[];
  movies: Movie[];
  onSelectShowtime: (
    movie: Movie,
    theater: CinemaTheater,
    date: string,
    slot: ShowtimeSlot
  ) => void;
  onOpenMovieDetail: (movie: Movie) => void;
}

export const ScheduleHub: React.FC<ScheduleHubProps> = ({
  currentCity,
  onOpenLocationModal,
  theaters,
  movies,
  onSelectShowtime,
  onOpenMovieDetail
}) => {
  const dates = useMemo(() => generateDatesList(), []);
  const [selectedDateStr, setSelectedDateStr] = useState<string>(dates[0].dateStr);
  const [selectedBrandCode, setSelectedBrandCode] = useState<string>('ALL');
  const [nearMeActive, setNearMeActive] = useState<boolean>(false);
  const [theaterSearchTerm, setTheaterSearchTerm] = useState<string>('');

  // Filter theaters based on current city, brand, and search query
  const filteredTheaters = useMemo(() => {
    return theaters.filter((t) => {
      const matchCity = t.cityId === currentCity.id;
      const matchBrand =
        selectedBrandCode === 'ALL' || t.brandCode === selectedBrandCode;
      const matchSearch =
        theaterSearchTerm.trim() === '' ||
        t.name.toLowerCase().includes(theaterSearchTerm.toLowerCase()) ||
        t.address.toLowerCase().includes(theaterSearchTerm.toLowerCase());

      return matchCity && matchBrand && matchSearch;
    });
  }, [theaters, currentCity, selectedBrandCode, theaterSearchTerm]);

  // Selected theater
  const [selectedTheaterId, setSelectedTheaterId] = useState<number | null>(null);

  // Keep a valid selected theater whenever the list updates
  const activeTheater = useMemo(() => {
    if (filteredTheaters.length === 0) return null;
    const found = filteredTheaters.find((t) => t.id === selectedTheaterId);
    return found || filteredTheaters[0];
  }, [filteredTheaters, selectedTheaterId]);

  // Generate showtimes for all movies at the selected theater on selected date
  const moviesWithShowtimes = useMemo(() => {
    if (!activeTheater) return [];

    return movies.map((movie) => {
      const slots = generateShowtimesForMovieAndTheater(
        movie.id,
        activeTheater.id,
        selectedDateStr
      );
      return {
        movie,
        slots
      };
    });
  }, [movies, activeTheater, selectedDateStr]);

  return (
    <section className="schedule-section" id="phimdangchieu">
      <div className="container-custom">
        <div className="section-header">
          <h2 className="section-title">Lịch chiếu phim</h2>
        </div>

        <div className="schedule-hub-card">
          {/* Controls Bar (Location & Distance) */}
          <div className="hub-controls-bar">
            <div className="hub-controls-left">
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--gray-700)' }}>
                Vị trí:
              </span>
              <button
                className="location-dropdown-trigger"
                onClick={onOpenLocationModal}
              >
                <MapPin size={16} />
                <span>{currentCity.name}</span>
                <ChevronDown size={14} />
              </button>

              <button
                className={`near-me-btn ${nearMeActive ? 'active' : ''}`}
                onClick={() => setNearMeActive(!nearMeActive)}
              >
                <Compass size={15} />
                <span>{nearMeActive ? 'Đang lọc: Gần bạn' : 'Gần bạn'}</span>
              </button>
            </div>

            <div style={{ fontSize: '13px', color: 'var(--gray-500)' }}>
              {filteredTheaters.length} cụm rạp tại {currentCity.name}
            </div>
          </div>

          {/* Cineplex Brand Carousel / Tabs */}
          <div className="cineplex-brands-track">
            {CINEPLEX_BRANDS.map((brand) => {
              const isActive = selectedBrandCode === brand.code;
              return (
                <div
                  key={brand.id}
                  className={`brand-tab-item ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedBrandCode(brand.code);
                    setSelectedTheaterId(null);
                  }}
                >
                  <div className="brand-icon-box">
                    {brand.tag && <span className="brand-tag-badge">{brand.tag}</span>}
                    <img
                      src={brand.logo}
                      alt={brand.name}
                      className="brand-logo-img"
                    />
                  </div>
                  <span className="brand-name-label">{brand.name}</span>
                </div>
              );
            })}
          </div>

          {/* Two-Column Booking Grid */}
          <div className="booking-two-columns">
            {/* Left Column: Theaters list */}
            <div className="theaters-column">
              <div className="theaters-search-box">
                <div className="theaters-search-input-wrap">
                  <Search
                    size={16}
                    className="text-gray-400"
                    style={{ position: 'absolute', left: '12px' }}
                  />
                  <input
                    type="text"
                    placeholder="Tìm theo tên rạp..."
                    value={theaterSearchTerm}
                    onChange={(e) => setTheaterSearchTerm(e.target.value)}
                    className="theaters-search-input"
                  />
                </div>
              </div>

              <div className="theaters-list-scroll">
                {filteredTheaters.length === 0 ? (
                  <div style={{ padding: '30px', textAlign: 'center', color: 'var(--gray-500)' }}>
                    Không tìm thấy cụm rạp nào phù hợp. Vui lòng chọn thương hiệu khác hoặc đổi khu vực.
                  </div>
                ) : (
                  filteredTheaters.map((theater) => {
                    const isSelected = activeTheater?.id === theater.id;
                    return (
                      <div
                        key={theater.id}
                        className={`theater-card-item ${isSelected ? 'active' : ''}`}
                        onClick={() => setSelectedTheaterId(theater.id)}
                      >
                        <div className="theater-card-header">
                          <h4 className="theater-card-title">{theater.name}</h4>
                          {theater.distance && (
                            <span className="theater-distance-badge">
                              {theater.distance}
                            </span>
                          )}
                        </div>

                        <p className="theater-card-address">{theater.address}</p>

                        <div className="theater-card-footer">
                          <span className="theater-rating-text">
                            <Star size={13} fill="#d97706" color="#d97706" />
                            {theater.rating} ({theater.reviewCount.toLocaleString()})
                          </span>

                          <a
                            href={`https://maps.google.com/?q=${encodeURIComponent(
                              theater.name + ' ' + theater.address
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="theater-map-link flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span>Bản đồ</span>
                            <ExternalLink size={11} />
                          </a>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Column: Date Selector & Movies Showtimes */}
            <div className="showtimes-column">
              {/* Date Selector Strip */}
              <div className="date-selector-strip">
                {dates.map((d) => {
                  const isCurrent = selectedDateStr === d.dateStr;
                  return (
                    <button
                      key={d.dateStr}
                      className={`date-pill-btn ${isCurrent ? 'active' : ''}`}
                      onClick={() => setSelectedDateStr(d.dateStr)}
                    >
                      <div className="date-pill-day">{d.dayName}</div>
                      <div className="date-pill-num">
                        {d.dayNumber}/{d.month}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Active Theater Info Banner */}
              {activeTheater && (
                <div className="selected-theater-banner">
                  <div>
                    <h3 className="selected-theater-name">{activeTheater.name}</h3>
                    <p className="selected-theater-addr">{activeTheater.address}</p>
                  </div>
                  <div className="theater-rating-text" style={{ fontSize: '13px' }}>
                    <Star size={16} fill="#d97706" color="#d97706" />
                    <span>{activeTheater.rating} / 5</span>
                  </div>
                </div>
              )}

              {/* Movies with Showtimes */}
              <div className="movie-showtimes-container">
                {moviesWithShowtimes.map(({ movie, slots }) => {
                  return (
                    <div key={movie.id} className="movie-schedule-card">
                      {/* Movie Poster */}
                      <div
                        className="movie-card-poster-wrap cursor-pointer"
                        onClick={() => onOpenMovieDetail(movie)}
                      >
                        <img
                          src={movie.posterUrl}
                          alt={movie.title}
                          className="movie-card-poster"
                        />
                      </div>

                      {/* Movie Details & Slots */}
                      <div className="movie-card-details">
                        <div className="movie-title-row">
                          <span
                            className={`badge-rate badge-${movie.ageRating.toLowerCase()}`}
                          >
                            {movie.ageRating}
                          </span>
                          <h4
                            className="movie-main-title"
                            onClick={() => onOpenMovieDetail(movie)}
                          >
                            {movie.title}
                          </h4>

                          {movie.trailerUrl && (
                            <button
                              className="trailer-link-btn"
                              onClick={() => onOpenMovieDetail(movie)}
                            >
                              <PlayCircle size={14} />
                              <span>Trailer</span>
                            </button>
                          )}
                        </div>

                        <div className="movie-meta-row">
                          <span>{movie.genre}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {movie.duration} phút
                          </span>
                          <span>•</span>
                          <span className="movie-rating-badge">
                            <Star size={12} fill="#eab308" color="#eab308" />
                            {movie.ratingPoint}
                          </span>
                        </div>

                        {/* Format & Showtimes */}
                        <div>
                          <div className="showtimes-group-title">
                            <span>Suất chiếu 2D / IMAX</span>
                          </div>

                          <div className="showtime-chips-grid">
                            {slots.map((slot) => {
                              return (
                                <button
                                  key={slot.id}
                                  className="showtime-slot-pill"
                                  onClick={() => {
                                    if (activeTheater) {
                                      onSelectShowtime(
                                        movie,
                                        activeTheater,
                                        selectedDateStr,
                                        slot
                                      );
                                    }
                                  }}
                                  title={`Chọn suất ${slot.time} - ${slot.room}`}
                                >
                                  <span className="showtime-main-time">{slot.time}</span>
                                  <span className="showtime-sub-info">
                                    {slot.room} • {slot.price.toLocaleString()}đ
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
