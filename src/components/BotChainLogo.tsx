import { type FC } from 'react'

interface BotChainLogoProps {
  size?: number
  className?: string
}

export const BotChainLogo: FC<BotChainLogoProps> = ({ size = 20, className = '' }) => {
  return (
    <img
      src="/botchain_logo.jpeg"
      alt="BOT Chain Logo"
      width={size}
      height={size}
      className={`botchain-logo ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        display: 'inline-block',
        verticalAlign: 'middle',
        objectFit: 'cover',
        boxShadow: '0 0 6px rgba(245, 179, 0, 0.25)',
      }}
    />
  )
}
