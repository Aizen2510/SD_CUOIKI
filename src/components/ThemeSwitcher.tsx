import React, { useState, useRef, useEffect } from 'react';
import { Palette, Check } from 'lucide-react';

export type ThemeType = 'violet' | 'midnight' | 'ocean' | 'sunset';

interface ThemeOption {
  id: ThemeType;
  name: string;
  gradient: string;
  dotColor: string;
  isDark?: boolean;
}

const THEMES: ThemeOption[] = [
  {
    id: 'violet',
    name: 'Tím Neon (Violet)',
    gradient: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
    dotColor: '#7c3aed'
  },
  {
    id: 'midnight',
    name: 'Bóng Đêm (Midnight)',
    gradient: 'linear-gradient(135deg, #090d16 0%, #8b5cf6 100%)',
    dotColor: '#8b5cf6',
    isDark: true
  },
  {
    id: 'ocean',
    name: 'Xanh Biển (Ocean)',
    gradient: 'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)',
    dotColor: '#0284c7'
  },
  {
    id: 'sunset',
    name: 'Hoàng Hôn (Sunset)',
    gradient: 'linear-gradient(135deg, #ea580c 0%, #f43f5e 100%)',
    dotColor: '#ea580c'
  }
];

interface ThemeSwitcherProps {
  currentTheme: ThemeType;
  onSelectTheme: (theme: ThemeType) => void;
}

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({
  currentTheme,
  onSelectTheme
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeOption = THEMES.find((t) => t.id === currentTheme) || THEMES[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          borderRadius: '20px',
          fontSize: '13px',
          fontWeight: 600,
          backgroundColor: 'var(--brand-light)',
          color: 'var(--brand-primary)',
          border: '1px solid var(--brand-border)',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
        title="Đổi màu sắc giao diện"
      >
        <span
          style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: activeOption.gradient
          }}
        />
        <Palette size={14} />
        <span className="hidden sm:inline">Màu sắc</span>
      </button>

      {isOpen && (
        <div
          className="animate-fade-in"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '210px',
            background: 'var(--bg-card, #ffffff)',
            borderRadius: '12px',
            boxShadow: 'var(--shadow-lg)',
            border: '1px solid var(--border-color, #e2e8f0)',
            padding: '8px',
            zIndex: 150,
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}
        >
          <div
            style={{
              padding: '6px 10px',
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              color: 'var(--text-muted, #64748b)',
              letterSpacing: '0.5px'
            }}
          >
            Chọn bảng màu
          </div>

          {THEMES.map((theme) => {
            const isSelected = currentTheme === theme.id;
            return (
              <button
                key={theme.id}
                onClick={() => {
                  onSelectTheme(theme.id);
                  setIsOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: isSelected ? 700 : 500,
                  color: isSelected ? 'var(--brand-primary)' : 'var(--text-main)',
                  backgroundColor: isSelected ? 'var(--brand-light)' : 'transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background-color 0.15s ease'
                }}
                className="hover:opacity-80"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      background: theme.gradient,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                  />
                  <span>{theme.name}</span>
                </div>
                {isSelected && <Check size={14} color="var(--brand-primary)" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
