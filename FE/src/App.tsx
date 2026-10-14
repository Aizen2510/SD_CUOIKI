import React, { useState, useEffect } from 'react';
import './App.css';
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { ScheduleHub } from './components/ScheduleHub';
import { SeatBookingModal } from './components/SeatBookingModal';
import { MovieDetailModal } from './components/MovieDetailModal';
import { UpcomingSection } from './components/UpcomingSection';
import { PromotionSection } from './components/PromotionSection';
import { FaqSection } from './components/FaqSection';
import { Footer } from './components/Footer';
import { LocationModal } from './components/LocationModal';
import { SearchModal } from './components/SearchModal';
import { MyTicketsModal } from './components/MyTicketsModal';
import { ThemeType } from './components/ThemeSwitcher';
import { api } from './services/api';

import {
  Movie,
  CinemaTheater,
  ShowtimeSlot,
  City
} from './types/cinema';
import {
  CITIES,
  CINEMA_THEATERS,
  MOVIES_NOW,
  MOVIES_SOON
} from './data/cinemaData';

function App() {
  // Theme state (Default: 'violet' - Tím Ánh Sao cực đẹp)
  const [currentTheme, setCurrentTheme] = useState<ThemeType>(() => {
    return (localStorage.getItem('meo_cinema_theme') as ThemeType) || 'violet';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme);
    localStorage.setItem('meo_cinema_theme', currentTheme);
  }, [currentTheme]);

  // Cities, Theaters, and Movies state (enhanced with backend API)
  const [citiesList, setCitiesList] = useState<City[]>(CITIES);
  const [currentCity, setCurrentCity] = useState<City>(CITIES[0]);
  const [theatersList, setTheatersList] = useState<CinemaTheater[]>(CINEMA_THEATERS);
  const [moviesNow, setMoviesNow] = useState<Movie[]>(MOVIES_NOW);
  const [moviesSoon, setMoviesSoon] = useState<Movie[]>(MOVIES_SOON);

  // Load backend data if available
  useEffect(() => {
    let isMounted = true;
    api.getCities().then((data) => {
      if (isMounted && data.length > 0) {
        setCitiesList(data);
        setCurrentCity(data[0]);
      }
    });

    api.getMovies('now').then((data) => {
      if (isMounted && data.length > 0) setMoviesNow(data);
    });

    api.getMovies('soon').then((data) => {
      if (isMounted && data.length > 0) setMoviesSoon(data);
    });

    api.getTheaters().then((data) => {
      if (isMounted && data.length > 0) setTheatersList(data);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Active navigation tab
  const [activeNavTab, setActiveNavTab] = useState<string>('lich-chieu');

  // Modals state
  const [isLocationModalOpen, setIsLocationModalOpen] = useState<boolean>(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState<boolean>(false);
  const [isMyTicketsModalOpen, setIsMyTicketsModalOpen] = useState<boolean>(false);

  // Selected movie for detail modal
  const [selectedMovieDetail, setSelectedMovieDetail] = useState<Movie | null>(null);

  // Selected showtime for seat booking
  const [selectedBooking, setSelectedBooking] = useState<{
    movie: Movie;
    theater: CinemaTheater;
    date: string;
    showtime: ShowtimeSlot;
  } | null>(null);

  const handleSelectShowtime = (
    movie: Movie,
    theater: CinemaTheater,
    date: string,
    slot: ShowtimeSlot
  ) => {
    setSelectedBooking({
      movie,
      theater,
      date,
      showtime: slot
    });
  };

  const handleSelectSearchTheater = (theater: CinemaTheater) => {
    const city = citiesList.find((c) => c.id === theater.cityId);
    if (city) {
      setCurrentCity(city);
    }
    const scheduleEl = document.getElementById('phimdangchieu');
    if (scheduleEl) {
      scheduleEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen" id="home">
      {/* 1. Header Navigation */}
      <Header
        currentCity={currentCity}
        onOpenLocationModal={() => setIsLocationModalOpen(true)}
        onOpenSearchModal={() => setIsSearchModalOpen(true)}
        onOpenMyTickets={() => setIsMyTicketsModalOpen(true)}
        activeNavTab={activeNavTab}
        onSelectNavTab={setActiveNavTab}
        currentTheme={currentTheme}
        onSelectTheme={setCurrentTheme}
      />

      {/* 2. Hero Intro Section with Breadcrumbs */}
      <HeroSection />

      {/* 3. Central Interactive Schedule Hub (MeoCinema Lich Chieu) */}
      <ScheduleHub
        currentCity={currentCity}
        onOpenLocationModal={() => setIsLocationModalOpen(true)}
        theaters={theatersList}
        movies={moviesNow}
        onSelectShowtime={handleSelectShowtime}
        onOpenMovieDetail={(movie) => setSelectedMovieDetail(movie)}
      />

      {/* 4. Upcoming Movies (Phim sắp chiếu) */}
      <UpcomingSection
        movies={moviesSoon}
        onSelectMovie={(movie) => setSelectedMovieDetail(movie)}
      />

      {/* 5. Promotions Section (Khuyến mãi) */}
      <PromotionSection />

      {/* 6. FAQ Section ("Bạn hỏi, MeoCinema trả lời") */}
      <FaqSection />

      {/* 7. Footer with Cinema Partners */}
      <Footer />

      {/* MODAL 1: Seat Booking & Checkout */}
      {selectedBooking && (
        <SeatBookingModal
          movie={selectedBooking.movie}
          theater={selectedBooking.theater}
          date={selectedBooking.date}
          showtime={selectedBooking.showtime}
          onClose={() => setSelectedBooking(null)}
        />
      )}

      {/* MODAL 2: Movie Detail & Trailer */}
      {selectedMovieDetail && (
        <MovieDetailModal
          movie={selectedMovieDetail}
          onClose={() => setSelectedMovieDetail(null)}
          onBookNow={() => {
            const el = document.getElementById('phimdangchieu');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
        />
      )}

      {/* MODAL 3: Location Switcher */}
      {isLocationModalOpen && (
        <LocationModal
          currentCity={currentCity}
          onSelectCity={setCurrentCity}
          onClose={() => setIsLocationModalOpen(false)}
        />
      )}

      {/* MODAL 4: Instant Search */}
      {isSearchModalOpen && (
        <SearchModal
          movies={moviesNow}
          theaters={theatersList}
          onSelectMovie={(movie) => setSelectedMovieDetail(movie)}
          onSelectTheater={handleSelectSearchTheater}
          onClose={() => setIsSearchModalOpen(false)}
        />
      )}

      {/* MODAL 5: My Tickets / Tra cứu vé điện tử */}
      <MyTicketsModal
        isOpen={isMyTicketsModalOpen}
        onClose={() => setIsMyTicketsModalOpen(false)}
      />
    </div>
  );
}

export default App;
