import React, { useState } from 'react';
import { MapPin, Search, Menu, X, ChevronDown, Sparkles, Ticket } from 'lucide-react';
import { City } from '../types/cinema';
import { CatLogo } from './CatLogo';
import { ThemeSwitcher, ThemeType } from './ThemeSwitcher';

interface HeaderProps {
  currentCity: City;
  onOpenLocationModal: () => void;
  onOpenSearchModal: () => void;
  onOpenMyTickets: () => void;
  activeNavTab: string;
  onSelectNavTab: (tab: string) => void;
  currentTheme: ThemeType;
  onSelectTheme: (theme: ThemeType) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentCity,
  onOpenLocationModal,
  onOpenSearchModal,
  onOpenMyTickets,
  activeNavTab,
  onSelectNavTab,
  currentTheme,
  onSelectTheme
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'lich-chieu', label: 'Lịch chiếu', hasDropdown: true },
    { id: 'rap-chieu', label: 'Rạp chiếu', hasDropdown: true },
    { id: 'phim-chieu', label: 'Phim chiếu', hasDropdown: false },
    { id: 'review', label: 'Review phim', hasDropdown: false },
    { id: 'top-phim', label: 'Top phim', hasDropdown: false },
    { id: 'khuyen-mai', label: 'Khuyến mãi', hasDropdown: false }
  ];

  const handleNavClick = (id: string) => {
    onSelectNavTab(id);
    setMobileMenuOpen(false);

    if (id === 'lich-chieu') {
      const el = document.getElementById('phimdangchieu');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    } else if (id === 'phim-chieu' || id === 'top-phim') {
      const el = document.getElementById('phimsapchieu');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    } else if (id === 'khuyen-mai') {
      const el = document.getElementById('khuyenmai');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="momo-header">
      <div className="container-custom header-container">
        {/* Cat Brand Logo & Cinema Title */}
        <div className="header-brand-group">
          <a href="#home" className="flex items-center gap-2" title="MeoCinema - Đặt vé xem phim">
            <CatLogo size={38} />
          </a>

          <div className="cinema-badge-divider">
            <div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--brand-primary)', letterSpacing: '-0.3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>MeoCinema</span>
                <Sparkles size={12} color="var(--brand-accent)" />
              </div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--gray-500)', lineHeight: 1 }}>
                Đặt vé xem phim
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="header-nav-links" aria-label="Main navigation">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`nav-link-btn ${activeNavTab === item.id ? 'active' : ''}`}
              onClick={() => handleNavClick(item.id)}
            >
              <span>{item.label}</span>
              {item.hasDropdown && <ChevronDown size={14} className="opacity-70" />}
            </button>
          ))}
        </nav>

        {/* Actions (Theme Switcher, Location, Search, Mobile menu) */}
        <div className="header-actions">
          {/* Theme Palette Switcher */}
          <ThemeSwitcher
            currentTheme={currentTheme}
            onSelectTheme={onSelectTheme}
          />

          {/* My Tickets Button */}
          <button
            className="my-tickets-btn"
            onClick={onOpenMyTickets}
            title="Tra cứu vé xem phim của tôi"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '9999px',
              background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.12), rgba(168, 85, 247, 0.12))',
              border: '1px solid rgba(236, 72, 153, 0.3)',
              color: 'var(--brand-primary)',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap'
            }}
          >
            <Ticket size={16} color="var(--brand-primary)" />
            <span>Vé của tôi</span>
          </button>

          <button
            className="location-quick-btn"
            onClick={onOpenLocationModal}
            title="Đổi tỉnh thành"
          >
            <MapPin size={15} />
            <span>{currentCity.name}</span>
            <ChevronDown size={13} />
          </button>

          <button
            className="search-icon-btn"
            onClick={onOpenSearchModal}
            title="Tìm kiếm phim và rạp"
          >
            <Search size={18} />
          </button>

          <button
            className="mobile-menu-btn lg:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Mở menu điều hướng"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="mobile-drawer" onClick={() => setMobileMenuOpen(false)}>
          <div className="mobile-drawer-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="my-tickets-btn"
              style={{
                width: '100%',
                justifyContent: 'center',
                padding: '12px 14px',
                marginBottom: '12px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                color: '#fff',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenMyTickets();
              }}
            >
              <Ticket size={18} />
              <span>Tra cứu vé của tôi</span>
            </button>
            {navItems.map((item) => (
              <button
                key={item.id}
                className={`nav-link-btn ${activeNavTab === item.id ? 'active' : ''}`}
                style={{ justifyContent: 'flex-start', padding: '12px 14px' }}
                onClick={() => handleNavClick(item.id)}
              >
                <span>{item.label}</span>
              </button>
            ))}

            <div style={{ paddingTop: '10px', borderTop: '1px solid #e5e5e5', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                className="location-quick-btn"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenLocationModal();
                }}
              >
                <MapPin size={15} />
                <span>Vị trí: {currentCity.name}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
