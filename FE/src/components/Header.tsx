import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Search, Menu, X, ChevronDown, Sparkles, Ticket, LogIn, LogOut, ShieldCheck } from 'lucide-react';
import { City, UserProfile } from '../types/cinema';
import { CatLogo } from './CatLogo';
import { ThemeSwitcher, ThemeType } from './ThemeSwitcher';

interface HeaderProps {
  currentCity: City;
  onOpenLocationModal: () => void;
  onOpenSearchModal: () => void;
  onOpenMyTickets: () => void;
  currentUser: UserProfile | null;
  onOpenAuthModal: () => void;
  onLogout: () => void;
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
  currentUser,
  onOpenAuthModal,
  onLogout,
  activeNavTab,
  onSelectNavTab,
  currentTheme,
  onSelectTheme
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

        {/* Actions (Theme Switcher, Location, Search, Auth, Mobile menu) */}
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

          {/* User Auth Section */}
          {currentUser ? (
            <div style={{ position: 'relative' }} ref={userMenuRef}>
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '5px 12px 5px 6px',
                  borderRadius: '9999px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.16)',
                  color: 'var(--text-primary, #fff)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {currentUser.avatarUrl ? (
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.fullName}
                    style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : (
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #ec4899, #a855f7)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#fff'
                    }}
                  >
                    {currentUser.fullName.charAt(0).toUpperCase()}
                  </div>
                )}
                <span style={{ fontSize: '13px', fontWeight: 600, maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {currentUser.fullName}
                </span>
                <ChevronDown size={14} className="opacity-70" />
              </button>

              {userDropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    width: '220px',
                    backgroundColor: 'var(--card-bg, #1e1e2d)',
                    borderRadius: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    boxShadow: '0 12px 30px rgba(0,0,0,0.4)',
                    padding: '8px',
                    zIndex: 1000,
                    animation: 'fadeIn 0.15s ease-out'
                  }}
                >
                  <div style={{ padding: '8px 12px 10px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary, #fff)' }}>
                      {currentUser.fullName}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary, #9ca3af)', marginTop: '2px' }}>
                      {currentUser.email}
                    </div>
                    {currentUser.role === 'admin' && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', marginTop: '4px', fontSize: '10.5px', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(236, 72, 153, 0.2)', color: '#f472b6', fontWeight: 700 }}>
                        <ShieldCheck size={11} /> Admin
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      onOpenMyTickets();
                    }}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: '8px',
                      color: 'var(--text-primary, #fff)',
                      fontSize: '13px',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <Ticket size={15} color="var(--brand-primary)" />
                    <span>Vé đã đặt của tôi</span>
                  </button>
                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      onLogout();
                    }}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#f87171',
                      fontSize: '13px',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <LogOut size={15} />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onOpenAuthModal}
              title="Đăng nhập tài khoản"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 15px',
                borderRadius: '9999px',
                background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                border: 'none',
                boxShadow: '0 2px 8px rgba(236, 72, 153, 0.3)',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap'
              }}
            >
              <LogIn size={15} />
              <span>Đăng nhập</span>
            </button>
          )}

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
            {currentUser ? (
              <div style={{ marginBottom: '16px', padding: '12px', borderRadius: '12px', backgroundColor: 'rgba(255, 255, 255, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #ec4899, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff' }}>
                    {currentUser.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>{currentUser.fullName}</div>
                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>{currentUser.email}</div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onLogout();
                  }}
                  style={{ background: 'none', border: 'none', color: '#f87171', padding: '6px', cursor: 'pointer' }}
                  title="Đăng xuất"
                >
                  <LogOut size={18} />
                </button>
              </div>
            ) : (
              <button
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  padding: '12px 14px',
                  marginBottom: '10px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                  color: '#fff',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  border: 'none',
                  cursor: 'pointer'
                }}
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAuthModal();
                }}
              >
                <LogIn size={18} />
                <span>Đăng nhập / Đăng ký</span>
              </button>
            )}

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
