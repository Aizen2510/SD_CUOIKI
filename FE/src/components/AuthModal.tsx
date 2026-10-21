import React, { useState } from 'react';
import { X, Mail, Lock, User, Phone, Eye, EyeOff, Sparkles, CheckCircle2, AlertCircle, LogIn, UserPlus } from 'lucide-react';
import { api } from '../services/api';
import { UserProfile } from '../types/cinema';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserProfile, token: string) => void;
  initialTab?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  initialTab = 'login'
}) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(initialTab);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form states
  const [loginAccount, setLoginAccount] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [registerFullName, setRegisterFullName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    if (!loginAccount.trim() || !loginPassword) {
      setErrorMessage('Vui lòng nhập đầy đủ Email/SĐT và Mật khẩu.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.login(loginAccount.trim(), loginPassword);
      if (res && res.accessToken) {
        localStorage.setItem('meo_auth_token', res.accessToken);
        localStorage.setItem('meo_auth_user', JSON.stringify(res.user));
        setSuccessMessage(`Chào mừng bạn trở lại, ${res.user.fullName}!`);
        setTimeout(() => {
          onLoginSuccess(res.user, res.accessToken);
          onClose();
        }, 600);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Đăng nhập không thành công. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!registerFullName.trim()) {
      setErrorMessage('Vui lòng nhập họ và tên của bạn.');
      return;
    }
    if (!registerEmail.trim() || !registerEmail.includes('@')) {
      setErrorMessage('Vui lòng nhập địa chỉ email hợp lệ.');
      return;
    }
    if (!registerPhone.trim() || registerPhone.length < 9) {
      setErrorMessage('Vui lòng nhập số điện thoại hợp lệ (từ 10 số).');
      return;
    }
    if (registerPassword.length < 6) {
      setErrorMessage('Mật khẩu bảo mật phải có ít nhất 6 ký tự.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.register(
        registerFullName.trim(),
        registerEmail.trim(),
        registerPhone.trim(),
        registerPassword
      );
      if (res && res.accessToken) {
        localStorage.setItem('meo_auth_token', res.accessToken);
        localStorage.setItem('meo_auth_user', JSON.stringify(res.user));
        setSuccessMessage('Đăng ký tài khoản thành công! Đang tự động đăng nhập...');
        setTimeout(() => {
          onLoginSuccess(res.user, res.accessToken);
          onClose();
        }, 800);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Đăng ký không thành công. Email hoặc SĐT có thể đã tồn tại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(10, 10, 18, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.25s ease-out'
      }}
      onClick={onClose}
    >
      <div
        className="auth-modal-card"
        style={{
          width: '100%',
          maxWidth: '460px',
          backgroundColor: 'var(--card-bg, #1a1a24)',
          borderRadius: '24px',
          border: '1px solid var(--border-color, rgba(255, 255, 255, 0.12))',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.6), 0 0 40px rgba(168, 85, 247, 0.15)',
          overflow: 'hidden',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow Header Accent */}
        <div
          style={{
            height: '6px',
            background: 'linear-gradient(90deg, #ec4899, #a855f7, #6366f1, #06b6d4)',
            width: '100%'
          }}
        />

        {/* Modal Top Bar */}
        <div style={{ padding: '24px 28px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.2), rgba(168, 85, 247, 0.2))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(236, 72, 153, 0.3)'
              }}
            >
              <Sparkles size={18} color="var(--brand-primary, #ec4899)" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--text-primary, #fff)' }}>
                {activeTab === 'login' ? 'Đăng nhập MeoCinema' : 'Đăng ký tài khoản'}
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary, #9ca3af)' }}>
                {activeTab === 'login' ? 'Tích điểm thành viên & đồng bộ vé xem phim' : 'Trải nghiệm đặt vé bom tấn siêu tốc'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary, #9ca3af)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div style={{ padding: '20px 28px 0' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '6px',
              padding: '4px',
              borderRadius: '14px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.06)'
            }}
          >
            <button
              type="button"
              onClick={() => {
                setActiveTab('login');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              style={{
                padding: '9px 12px',
                borderRadius: '10px',
                border: 'none',
                background: activeTab === 'login' ? 'linear-gradient(135deg, #a855f7, #ec4899)' : 'transparent',
                color: activeTab === 'login' ? '#ffffff' : 'var(--text-secondary, #9ca3af)',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.2s ease'
              }}
            >
              <LogIn size={15} />
              <span>Đăng nhập</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('register');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              style={{
                padding: '9px 12px',
                borderRadius: '10px',
                border: 'none',
                background: activeTab === 'register' ? 'linear-gradient(135deg, #a855f7, #ec4899)' : 'transparent',
                color: activeTab === 'register' ? '#ffffff' : 'var(--text-secondary, #9ca3af)',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.2s ease'
              }}
            >
              <UserPlus size={15} />
              <span>Đăng ký mới</span>
            </button>
          </div>
        </div>

        {/* Alerts */}
        <div style={{ padding: '16px 28px 0' }}>
          {errorMessage && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '10px',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                fontSize: '12.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <AlertCircle size={16} />
              <span>{errorMessage}</span>
            </div>
          )}
          {successMessage && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '10px',
                backgroundColor: 'rgba(34, 197, 94, 0.15)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                color: '#4ade80',
                fontSize: '12.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <CheckCircle2 size={16} />
              <span>{successMessage}</span>
            </div>
          )}
        </div>

        {/* Tab 1: LOGIN */}
        {activeTab === 'login' && (
          <form onSubmit={handleLoginSubmit} style={{ padding: '18px 28px 28px' }}>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary, #cbd5e1)', marginBottom: '6px' }}>
                Email hoặc Số điện thoại
              </label>
              <div style={{ position: 'relative' }}>
                <Mail
                  size={16}
                  style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary, #9ca3af)' }}
                />
                <input
                  type="text"
                  placeholder="Email hoặc số điện thoại"
                  value={loginAccount}
                  onChange={(e) => setLoginAccount(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 14px 11px 38px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: 'var(--text-primary, #fff)',
                    fontSize: '13.5px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary, #cbd5e1)' }}>
                  Mật khẩu
                </label>
                <span style={{ fontSize: '11.5px', color: 'var(--brand-primary, #ec4899)', cursor: 'pointer' }}>
                  Quên mật khẩu?
                </span>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={16}
                  style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary, #9ca3af)' }}
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Nhập mật khẩu..."
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 40px 11px 38px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: 'var(--text-primary, #fff)',
                    fontSize: '13.5px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary, #9ca3af)',
                    cursor: 'pointer'
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 14px rgba(236, 72, 153, 0.4)',
                opacity: loading ? 0.7 : 1,
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {loading ? (
                <span>Đang xử lý xác thực...</span>
              ) : (
                <>
                  <LogIn size={16} />
                  <span>Đăng nhập ngay</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Tab 2: REGISTER */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegisterSubmit} style={{ padding: '18px 28px 28px' }}>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary, #cbd5e1)', marginBottom: '5px' }}>
                Họ và tên
              </label>
              <div style={{ position: 'relative' }}>
                <User
                  size={15}
                  style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary, #9ca3af)' }}
                />
                <input
                  type="text"
                  placeholder="Ví dụ: Nguyễn Văn An"
                  value={registerFullName}
                  onChange={(e) => setRegisterFullName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px 10px 36px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: 'var(--text-primary, #fff)',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary, #cbd5e1)', marginBottom: '5px' }}>
                Email
              </label>
              <div style={{ position: 'relative' }}>
                <Mail
                  size={15}
                  style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary, #9ca3af)' }}
                />
                <input
                  type="email"
                  placeholder="email@example.com"
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px 10px 36px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: 'var(--text-primary, #fff)',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary, #cbd5e1)', marginBottom: '5px' }}>
                Số điện thoại (để nhận vé SMS / Zalo)
              </label>
              <div style={{ position: 'relative' }}>
                <Phone
                  size={15}
                  style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary, #9ca3af)' }}
                />
                <input
                  type="tel"
                  placeholder="0912345678"
                  value={registerPhone}
                  onChange={(e) => setRegisterPhone(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px 10px 36px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: 'var(--text-primary, #fff)',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary, #cbd5e1)', marginBottom: '5px' }}>
                Mật khẩu (tối thiểu 6 ký tự)
              </label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={15}
                  style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary, #9ca3af)' }}
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Tạo mật khẩu an toàn..."
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 38px 10px 36px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: 'var(--text-primary, #fff)',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary, #9ca3af)',
                    cursor: 'pointer'
                  }}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 14px rgba(236, 72, 153, 0.4)',
                opacity: loading ? 0.7 : 1,
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {loading ? (
                <span>Đang khởi tạo tài khoản...</span>
              ) : (
                <>
                  <UserPlus size={16} />
                  <span>Hoàn tất đăng ký & Đăng nhập</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
