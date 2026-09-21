import React, { useState, useMemo } from 'react';
import { X, MapPin, Search, Check } from 'lucide-react';
import { City } from '../types/cinema';
import { CITIES } from '../data/cinemaData';

interface LocationModalProps {
  currentCity: City;
  onSelectCity: (city: City) => void;
  onClose: () => void;
}

export const LocationModal: React.FC<LocationModalProps> = ({
  currentCity,
  onSelectCity,
  onClose
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCities = useMemo(() => {
    if (!searchTerm.trim()) return CITIES;
    return CITIES.filter((c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  const popularCities = useMemo(() => {
    return CITIES.filter((c) => c.isPopular);
  }, []);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="animate-modal-pop"
        style={{
          background: '#ffffff',
          width: '100%',
          maxWidth: '520px',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-lg)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--gray-200)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div className="flex items-center gap-2">
            <MapPin size={18} color="var(--pink-primary)" />
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--gray-900)' }}>
              Chọn Tỉnh / Thành phố
            </h3>
          </div>

          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '16px 20px' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search
              size={16}
              style={{ position: 'absolute', left: '12px', color: 'var(--gray-400)' }}
            />
            <input
              type="text"
              placeholder="Tìm kiếm tỉnh thành..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 38px',
                borderRadius: '8px',
                border: '1px solid var(--gray-300)',
                fontSize: '14px'
              }}
              autoFocus
            />
          </div>
        </div>

        {/* Popular Cities Pills */}
        {!searchTerm && (
          <div style={{ padding: '0 20px 16px' }}>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--gray-500)',
                textTransform: 'uppercase',
                marginBottom: '8px'
              }}
            >
              Thành phố phổ biến
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {popularCities.map((c) => {
                const isSelected = currentCity.id === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      onSelectCity(c);
                      onClose();
                    }}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '20px',
                      fontSize: '13px',
                      fontWeight: 600,
                      backgroundColor: isSelected ? 'var(--pink-primary)' : 'var(--gray-100)',
                      color: isSelected ? '#ffffff' : 'var(--gray-700)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* All Cities List */}
        <div
          style={{
            maxHeight: '320px',
            overflowY: 'auto',
            borderTop: '1px solid var(--gray-200)',
            padding: '8px 0'
          }}
        >
          {filteredCities.map((city) => {
            const isSelected = currentCity.id === city.id;
            return (
              <div
                key={city.id}
                onClick={() => {
                  onSelectCity(city);
                  onClose();
                }}
                style={{
                  padding: '12px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  backgroundColor: isSelected ? 'var(--pink-light)' : 'transparent',
                  color: isSelected ? 'var(--pink-primary)' : 'var(--gray-800)',
                  fontWeight: isSelected ? 700 : 500,
                  fontSize: '14px',
                  transition: 'background 0.15s ease'
                }}
              >
                <span>{city.name}</span>
                {isSelected && <Check size={16} color="var(--pink-primary)" />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
