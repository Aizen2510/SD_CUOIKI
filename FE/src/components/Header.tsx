import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Search, Menu, X, ChevronDown, Sparkles, Ticket, LogIn, LogOut, ShieldCheck, Bell } from 'lucide-react';
import { City, UserProfile } from '../types/cinema';
import { CatLogo } from './CatLogo';
import { ThemeSwitcher, ThemeType } from './ThemeSwitcher';
import {
  AppNotification,
  getNotifications,
  markNotificationsRead,
  notificationUserKey,
  notificationsEventName
} from '../services/notifications';

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
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const notificationKey = notificationUserKey(currentUser?.email);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const refreshNotifications = () => setNotifications(getNotifications(notificationKey));
    const handleNotificationEvent = (event: Event) => {
      const detail = (event as CustomEvent<{ userKey?: string }>).detail;
      if (!detail?.userKey || detail.userKey === notificationKey) refreshNotifications();
    };
    refreshNotifications();
    window.addEventListener(notificationsEventName, handleNotificationEvent);
    window.addEventListener('storage', refreshNotifications);
    return () => {
      window.removeEventListener(notificationsEventName, handleNotificationEvent);
      window.removeEventListener('storage', refreshNotifications);
    };
  }, [notificationKey]);

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

          {/* Notification Center */}
          <div style={{ position: 'relative' }} ref={notificationsRef}>
            <button
              type="button"
              aria-label="Thông báo"
              aria-expanded={notificationsOpen}
              title="Thông báo"
              onClick={() => setNotificationsOpen((open) => !open)}
              style={{
                position: 'relative',
                width: '40px',
                height: '40px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                border: '1px solid #f9a8d4',
                color: '#be185d',
                background: '#fff',
                boxShadow: '0 2px 8px rgba(190, 24, 93, 0.2)',
                cursor: 'pointer',
                flex: '0 0 40px'
              }}
            >
              <Bell size={19} />
              {notifications.some((item) => !item.read) && (
                <span style={{
                  position: 'absolute', top: '-3px', right: '-3px', minWidth: '18px', height: '18px',
                  padding: '0 4px', borderRadius: '999px', background: '#ef4444', color: '#fff',
                  fontSize: '10px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {notifications.filter((item) => !item.read).length}
                </span>
              )}
            </button>

            {notificationsOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 10px)', right: 0, width: 'min(360px, calc(100vw - 24px))',
                maxHeight: 'min(480px, calc(100vh - 100px))', overflow: 'hidden', display: 'flex', flexDirection: 'column',
                background: '#fff', border: '1px solid #e5e7eb',
                borderRadius: '14px', boxShadow: '0 16px 40px rgba(0,0,0,0.4)', zIndex: 1200
              }}>
                <div style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb' }}>
                  <strong style={{ color: '#111827', fontSize: '14px' }}>Thông báo</strong>
                  {notifications.some((item) => !item.read) && (
                    <button
                      type="button"
                      onClick={() => setNotifications(markNotificationsRead(notificationKey))}
                      style={{ border: 0, background: 'transparent', color: '#be185d', cursor: 'pointer', fontSize: '11px', fontWeight: 700 }}
                    >
                      Đánh dấu đã đọc
                    </button>
                  )}
                </div>
                <div style={{ overflowY: 'auto' }}>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '28px 18px', textAlign: 'center', color: '#6b7280', fontSize: '13px' }}>
                      Chưa có thông báo
                    </div>
                  ) : notifications.map((item) => {
                    const color = item.kind === 'success' ? '#22c55e' : item.kind === 'error' ? '#ef4444' : '#3b82f6';
                    return (
                      <div key={item.id} style={{ padding: '12px 16px', display: 'flex', gap: '10px', background: item.read ? '#fff' : '#fdf2f8', borderBottom: '1px solid #f3f4f6' }}>
                        <span style={{ width: '8px', height: '8px', marginTop: '5px', flex: '0 0 8px', borderRadius: '50%', background: color }} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ color: '#111827', fontSize: '12px', fontWeight: 800 }}>{item.title}</div>
                          <div style={{ color: '#374151', fontSize: '12px', lineHeight: 1.45, marginTop: '3px', overflowWrap: 'anywhere' }}>{item.message}</div>
                          <div style={{ color: '#6b7280', fontSize: '10px', marginTop: '5px' }}>{new Date(item.createdAt).toLocaleString('vi-VN')}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

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
