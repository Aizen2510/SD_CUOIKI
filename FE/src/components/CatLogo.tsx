import React from 'react';

interface CatLogoProps {
  size?: number;
  className?: string;
}

export const CatLogo: React.FC<CatLogoProps> = ({ size = 40, className = '' }) => {
  const id = `catlogo-grad-${size}`;
  const eyeGradId = `eye-grad-${size}`;
  const glowId = `glow-${size}`;

  return (
    <div
      className={className}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: `${size * 0.28}px`,
        background: 'var(--brand-gradient)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: 'var(--brand-shadow)',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.3s ease',
        flexShrink: 0,
      }}
    >
      <svg
        width={size * 0.78}
        height={size * 0.78}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Gradient for cat body/head */}
          <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="100%" stopColor="#f0e8ff" stopOpacity="1" />
          </linearGradient>
          {/* Gradient for eyes */}
          <radialGradient id={eyeGradId} cx="40%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#7c3aed" />
          </radialGradient>
          {/* Glow filter */}
          <filter id={glowId} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ===== Left Ear ===== */}
        <polygon points="7,22 10,8 18,16" fill={`url(#${id})`} />
        {/* Inner left ear */}
        <polygon points="9,20 11,11 16,16" fill="#f9a8d4" opacity="0.9" />

        {/* ===== Right Ear ===== */}
        <polygon points="41,22 38,8 30,16" fill={`url(#${id})`} />
        {/* Inner right ear */}
        <polygon points="39,20 37,11 32,16" fill="#f9a8d4" opacity="0.9" />

        {/* ===== Cat Head / Face ===== */}
        <ellipse cx="24" cy="28" rx="17" ry="14" fill={`url(#${id})`} />

        {/* ===== Film strip accent (top of head) — cinema theme ===== */}
        {/* Small film strip marks on the forehead */}
        <rect x="17" y="16" width="3" height="2" rx="0.5" fill="rgba(124,58,237,0.25)" />
        <rect x="21.5" y="16" width="3" height="2" rx="0.5" fill="rgba(124,58,237,0.25)" />
        <rect x="26" y="16" width="3" height="2" rx="0.5" fill="rgba(124,58,237,0.25)" />

        {/* ===== Left Eye ===== */}
        <ellipse cx="17.5" cy="26" rx="4.5" ry="4" fill={`url(#${eyeGradId})`} filter={`url(#${glowId})`} />
        {/* Eye shine */}
        <circle cx="19" cy="24.5" r="1.2" fill="white" opacity="0.85" />
        {/* Pupil */}
        <ellipse cx="17.5" cy="26.5" rx="1.8" ry="2.3" fill="#1e0a4c" />

        {/* ===== Right Eye ===== */}
        <ellipse cx="30.5" cy="26" rx="4.5" ry="4" fill={`url(#${eyeGradId})`} filter={`url(#${glowId})`} />
        {/* Eye shine */}
        <circle cx="32" cy="24.5" r="1.2" fill="white" opacity="0.85" />
        {/* Pupil */}
        <ellipse cx="30.5" cy="26.5" rx="1.8" ry="2.3" fill="#1e0a4c" />

        {/* ===== Nose ===== */}
        <ellipse cx="24" cy="32" rx="1.5" ry="1.1" fill="#f472b6" />

        {/* ===== Mouth ===== */}
        <path
          d="M21.5 33.5 Q24 36.5 26.5 33.5"
          stroke="#be185d"
          strokeWidth="1.1"
          fill="none"
          strokeLinecap="round"
        />

        {/* ===== Whiskers (Left) ===== */}
        <line x1="5" y1="30" x2="14" y2="32" stroke="white" strokeWidth="1" strokeLinecap="round" opacity="0.8" />
        <line x1="5" y1="33" x2="14" y2="34" stroke="white" strokeWidth="1" strokeLinecap="round" opacity="0.8" />

        {/* ===== Whiskers (Right) ===== */}
        <line x1="43" y1="30" x2="34" y2="32" stroke="white" strokeWidth="1" strokeLinecap="round" opacity="0.8" />
        <line x1="43" y1="33" x2="34" y2="34" stroke="white" strokeWidth="1" strokeLinecap="round" opacity="0.8" />

        {/* ===== Blush Cheeks ===== */}
        <ellipse cx="10" cy="33" rx="3.5" ry="2" fill="#fb7185" opacity="0.45" />
        <ellipse cx="38" cy="33" rx="3.5" ry="2" fill="#fb7185" opacity="0.45" />
      </svg>
    </div>
  );
};
