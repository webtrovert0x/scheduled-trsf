import { type FC } from 'react'

interface LogoProps {
  size?: number
  className?: string
}

export const Logo: FC<LogoProps> = ({ size = 42, className = '' }) => {
  return (
    <div
      className={`logo-container ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src="/logo.svg"
        alt="BOT Scheduled Transfer Logo"
        width={size}
        height={size}
        className="logo-img"
      />
      <style>{`
        .logo-container {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), filter 0.25s ease;
        }
        .logo-container:hover {
          transform: scale(1.05) rotate(2deg);
          filter: drop-shadow(0 0 12px rgba(245, 179, 0, 0.5));
        }
        .logo-img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          display: block;
        }
      `}</style>
    </div>
  )
}
