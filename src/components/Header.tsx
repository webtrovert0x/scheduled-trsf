import { type FC } from 'react'
import { useAccount, useBalance, useDisconnect } from 'wagmi'
import { useAppKit } from '@reown/appkit/react'
import { botchainTestnet } from '../config/chain'
import { Shield, Wallet, Settings, LogOut, BookOpen } from 'lucide-react'
import { formatEther } from 'viem'

import { Logo } from './Logo'

interface HeaderProps {
  contractAddress: `0x${string}`
  onOpenSettings: () => void
  onOpenWhitepaper: () => void
}

export const Header: FC<HeaderProps> = ({
  contractAddress,
  onOpenSettings,
  onOpenWhitepaper,
}) => {
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const { open } = useAppKit()

  const { data: balanceData } = useBalance({
    address,
    chainId: botchainTestnet.id,
  })

  return (
    <header className="header-container">
      <div className="header-inner">
        {/* Brand / Logo */}
        <div className="brand-group">
          <Logo size={42} />
          <div>
            <div className="brand-title-row">
              <h1 className="brand-title">BOT Scheduled Transfer</h1>
              <span className="network-pill">
                <span className="network-dot"></span>
                BotChain 968
              </span>
            </div>
            <p className="brand-subtitle">
              Automated Future Escrow & Execution Protocol
            </p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="header-actions">
          {/* Autonomous Relayer Badge */}
          <div className="auto-relayer-indicator font-mono" title="Background relayer is actively monitoring and executing mature transfers on BotChain">
            <span className="pulse-dot-green"></span>
            <span>Auto-Execution Active</span>
          </div>

          {/* Whitepaper Button */}
          <button
            onClick={onOpenWhitepaper}
            className="whitepaper-pill-btn font-mono"
            title="Read Protocol Whitepaper"
          >
            <BookOpen size={14} className="text-gold" />
            <span>Whitepaper</span>
          </button>

          {/* Contract Address Pill */}
          <button
            onClick={onOpenSettings}
            className="contract-pill-btn"
            title="Configure or Deploy Contract"
          >
            <Shield size={14} className="text-gold" />
            <span className="font-mono text-xs">
              Contract: {contractAddress ? `${contractAddress.slice(0, 6)}...${contractAddress.slice(-4)}` : 'Set Address'}
            </span>
            <Settings size={13} className="text-muted" />
          </button>

          {/* User Balance if connected */}
          {isConnected && balanceData && (
            <div className="balance-badge">
              <span className="balance-label">Balance</span>
              <span className="balance-val font-mono">
                {parseFloat(formatEther(balanceData.value)).toFixed(3)} BOT
              </span>
            </div>
          )}

          {/* Connect / Wallet Button */}
          {isConnected && address ? (
            <div className="wallet-connected-group">
              <button
                onClick={() => open()}
                className="btn-gold wallet-btn font-mono"
              >
                <Wallet size={16} />
                {address.slice(0, 6)}...{address.slice(-4)}
              </button>
              <button
                onClick={() => disconnect()}
                className="disconnect-btn"
                title="Disconnect Wallet"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button onClick={() => open()} className="btn-gold">
              <Wallet size={16} />
              Connect Wallet
            </button>
          )}
        </div>
      </div>

      <style>{`
        .header-container {
          border-bottom: 1px solid var(--border-subtle);
          background: rgba(13, 15, 18, 0.85);
          backdrop-filter: blur(14px);
          position: sticky;
          top: 0;
          z-index: 40;
          padding: 16px 24px;
        }
        .header-inner {
          max-width: 1280px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }
        .brand-group {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .brand-icon-wrapper {
          position: relative;
          width: 46px;
          height: 46px;
          border-radius: 12px;
          background: linear-gradient(135deg, rgba(245, 179, 0, 0.2), rgba(245, 179, 0, 0.05));
          border: 1px solid var(--border-gold);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--gold-primary);
          box-shadow: 0 0 15px rgba(245, 179, 0, 0.15);
        .brand-title-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .brand-title {
          font-size: 1.25rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: #ffffff;
        }
        .network-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(245, 179, 0, 0.1);
          color: var(--gold-primary);
          border: 1px solid rgba(245, 179, 0, 0.3);
          font-size: 0.72rem;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 20px;
          text-transform: uppercase;
        }
        .network-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--gold-primary);
          box-shadow: 0 0 6px var(--gold-primary);
        }
        .brand-subtitle {
          font-size: 0.8rem;
          color: var(--text-muted);
        }
        .header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .auto-relayer-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(16, 185, 129, 0.08);
          border: 1px solid rgba(16, 185, 129, 0.25);
          color: #34d399;
          font-size: 0.72rem;
          font-weight: 700;
          padding: 6px 12px;
          border-radius: var(--radius-full);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .pulse-dot-green {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #10b981;
          box-shadow: 0 0 8px #10b981;
        }
        .whitepaper-pill-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(245, 179, 0, 0.08);
          border: 1px solid var(--border-gold);
          padding: 8px 14px;
          border-radius: var(--radius-md);
          color: var(--gold-light);
          cursor: pointer;
          font-size: 0.82rem;
          font-weight: 700;
          transition: all 0.2s ease;
        }
        .whitepaper-pill-btn:hover {
          background: rgba(245, 179, 0, 0.18);
          box-shadow: 0 0 12px rgba(245, 179, 0, 0.2);
        }
        .contract-pill-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-medium);
          padding: 8px 14px;
          border-radius: var(--radius-md);
          color: var(--text-main);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .contract-pill-btn:hover {
          border-color: var(--gold-primary);
          background: var(--bg-card-hover);
        }
        .balance-badge {
          display: flex;
          flex-direction: column;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-subtle);
          padding: 6px 14px;
          border-radius: var(--radius-md);
          text-align: right;
        }
        .balance-label {
          font-size: 0.65rem;
          text-transform: uppercase;
          color: var(--text-dim);
          font-weight: 700;
        }
        .balance-val {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--gold-light);
        }
        .wallet-connected-group {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .wallet-btn {
          padding: 10px 16px;
          font-size: 0.88rem;
        }
        .disconnect-btn {
          background: var(--bg-tertiary);
          border: 1px solid var(--border-medium);
          color: var(--text-muted);
          width: 40px;
          height: 40px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .disconnect-btn:hover {
          color: #f87171;
          border-color: rgba(239, 68, 68, 0.3);
          background: rgba(239, 68, 68, 0.08);
        }
      `}</style>
    </header>
  )
}
