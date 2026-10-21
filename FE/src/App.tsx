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
import { DistributedLabModal } from './components/DistributedLabModal';
import { AuthModal } from './components/AuthModal';
import { api } from './services/api';

import {
  Movie,
  CinemaTheater,
  ShowtimeSlot,
  City,
  UserProfile
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

  // User Authentication state
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const savedUser = localStorage.getItem('meo_auth_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  const handleLoginSuccess = (user: UserProfile, token: string) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('meo_auth_token');
    localStorage.removeItem('meo_auth_user');
    setCurrentUser(null);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme);
    localStorage.setItem('meo_cinema_theme', currentTheme);
  }, [currentTheme]);

  // Hidden developer shortcut to toggle distributed lab modal: Ctrl + Shift + L
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'L' || e.key === 'l' || e.key === 'D' || e.key === 'd')) {
        e.preventDefault();
        setIsDistributedLabOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
  const [isDistributedLabOpen, setIsDistributedLabOpen] = useState<boolean>(false);

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
        currentUser={currentUser}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
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
      <Footer onOpenDistributedLab={() => setIsDistributedLabOpen(true)} />

      {/* MODAL 1: Seat Booking & Checkout */}
      {selectedBooking && (
        <SeatBookingModal
          movie={selectedBooking.movie}
          theater={selectedBooking.theater}
          date={selectedBooking.date}
          showtime={selectedBooking.showtime}
          currentUser={currentUser}
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
        currentUser={currentUser}
        onClose={() => setIsMyTicketsModalOpen(false)}
      />

      {/* MODAL 6: Distributed Systems Lab (Chapter 7) */}
      <DistributedLabModal
        isOpen={isDistributedLabOpen}
        onClose={() => setIsDistributedLabOpen(false)}
      />

      {/* MODAL 7: Authentication (Login / Register) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
}

export default App;
