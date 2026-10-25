import { useState, useEffect } from 'react'
import {
  useAccount,
  useReadContract,
  useSwitchChain,
} from 'wagmi'
import {
  SCHEDULED_TRANSFER_ABI,
  DEFAULT_CONTRACT_ADDRESS,
  type ScheduledTransferItem,
} from './config/contract'
import { botchainMainnet } from './config/chain'
import { Header } from './components/Header'
import { ScheduleForm } from './components/ScheduleForm'
import { TransferList } from './components/TransferList'
import { ContractModal } from './components/ContractModal'
import { WhitepaperModal } from './components/WhitepaperModal'
import { Logo } from './components/Logo'
import { BotChainLogo } from './components/BotChainLogo'
import {
  Send,
  ListFilter,
  AlertTriangle,
  Shield,
  ExternalLink,
  FileCode,
} from 'lucide-react'

export function App() {
  const { chainId, isConnected } = useAccount()
  const { switchChain } = useSwitchChain()

  // Contract address stored in localStorage or default strictly to verified Mainnet address
  const [contractAddress, setContractAddress] = useState<`0x${string}`>(() => {
    try {
      localStorage.removeItem('botchain_scheduled_contract')
      localStorage.removeItem('botchain_mainnet_contract')
      localStorage.removeItem('botchain_mainnet_contract_v2')
    } catch (_) {}

    const saved = localStorage.getItem('botchain_mainnet_contract_v3')
    if (
      saved &&
      saved.startsWith('0x') &&
      saved.length === 42 &&
      saved.toLowerCase() !== '0x1ef64cc8e0e5c251bf8f77034a091957d1105f2d' &&
      saved.toLowerCase() !== '0x4296b07971ddfa9e5b63236e7886477ba34b2275'
    ) {
      return saved as `0x${string}`
    }
    localStorage.setItem('botchain_mainnet_contract_v3', DEFAULT_CONTRACT_ADDRESS)
    return DEFAULT_CONTRACT_ADDRESS
  })

  // Purge any legacy address from browser state on load
  useEffect(() => {
    try {
      localStorage.removeItem('botchain_scheduled_contract')
      localStorage.removeItem('botchain_mainnet_contract')
      localStorage.removeItem('botchain_mainnet_contract_v2')
    } catch (_) {}
    if (
      contractAddress.toLowerCase() === '0x1ef64cc8e0e5c251bf8f77034a091957d1105f2d' ||
      contractAddress.toLowerCase() === '0x4296b07971ddfa9e5b63236e7886477ba34b2275'
    ) {
      localStorage.setItem('botchain_mainnet_contract_v3', DEFAULT_CONTRACT_ADDRESS)
      setContractAddress(DEFAULT_CONTRACT_ADDRESS)
    }
  }, [contractAddress])

  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isWhitepaperOpen, setIsWhitepaperOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'SCHEDULE' | 'QUEUE'>('SCHEDULE')

  const handleSaveContractAddress = (newAddr: `0x${string}`) => {
    setContractAddress(newAddr)
    localStorage.setItem('botchain_mainnet_contract_v3', newAddr)
  }

  // Read total transfers count from contract
  const {
    data: totalCount,
    refetch: refetchCount,
  } = useReadContract({
    address: contractAddress,
    abi: SCHEDULED_TRANSFER_ABI,
    functionName: 'totalTransfers',
    chainId: botchainMainnet.id,
  })

  // Read all transfer IDs
  const {
    data: allIds,
    refetch: refetchIds,
    isLoading: isLoadingIds,
  } = useReadContract({
    address: contractAddress,
    abi: SCHEDULED_TRANSFER_ABI,
    functionName: 'getAllTransferIds',
    chainId: botchainMainnet.id,
  })

  // Read transfer items by IDs
  const idsArray = (allIds as bigint[]) || []

  const {
    data: rawTransfers,
    refetch: refetchItems,
    isLoading: isLoadingItems,
  } = useReadContract({
    address: contractAddress,
    abi: SCHEDULED_TRANSFER_ABI,
    functionName: 'getTransfersByIds',
    args: idsArray.length > 0 ? [idsArray] : undefined,
    chainId: botchainMainnet.id,
    query: {
      enabled: idsArray.length > 0,
    },
  })

  const transfersList: ScheduledTransferItem[] = (rawTransfers as any) || []

  const refetchAll = () => {
    refetchCount()
    refetchIds()
    refetchItems()
  }

  // Periodic poll to refresh on-chain status every 8 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      refetchAll()
    }, 8000)
    return () => clearInterval(timer)
  }, [contractAddress])

  // Calculate live statistics from on-chain data
  const nowSec = Math.floor(Date.now() / 1000)
  const pendingCount = transfersList.filter((t) => t.status === 0).length
  const readyCount = transfersList.filter(
    (t) => t.status === 0 && Number(t.releaseTime) <= nowSec
  ).length
  const executedCount = transfersList.filter((t) => t.status === 1).length

  const isWrongNetwork = isConnected && chainId !== botchainMainnet.id

  return (
    <div className="app-layout">
      {/* Network Warning Banner */}
      {isWrongNetwork && (
        <div className="network-warning-banner">
          <AlertTriangle size={18} />
          <span>
            You are connected to an unsupported network. Please switch to{' '}
            <strong>BotChain Mainnet (Chain ID 677)</strong>.
          </span>
          <button
            onClick={() => switchChain?.({ chainId: botchainMainnet.id })}
            className="btn-gold network-switch-btn font-mono"
          >
            Switch to BotChain Mainnet
          </button>
        </div>
      )}

      {/* Main Navigation Header */}
      <Header
        contractAddress={contractAddress}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenWhitepaper={() => setIsWhitepaperOpen(true)}
      />

      <main className="main-content">
        {/* Hero Section */}
        <div className="hero-section">
          <div className="hero-content">
            <div className="hero-tag">
              <Shield size={13} className="text-gold" />
              <span>Non-Custodial Time-Locked Protocol</span>
            </div>
            <h1 className="hero-heading">
              Schedule & Automate Transfers on{' '}
              <span className="gold-text-glow">BotChain</span>
            </h1>
            <p className="hero-description">
              Prepare payments that automatically release at a future timestamp.
              Lock native BOT or any ERC-20 token in smart contract escrow with optional
              keeper incentives for automated execution.
            </p>
          </div>

          {/* Quick Metrics from Real Blockchain Reads */}
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-label">Total Scheduled</div>
              <div className="metric-val font-mono">
                {totalCount ? totalCount.toString() : '0'}
              </div>
              <div className="metric-sub">Lifetime On-Chain</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Pending In Escrow</div>
              <div className="metric-val font-mono text-gold">{pendingCount}</div>
              <div className="metric-sub">Time-locked</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Auto-Settling Now</div>
              <div className="metric-val font-mono ready-metric-val">{readyCount}</div>
              <div className="metric-sub">Releasing on-chain</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Completed Payouts</div>
              <div className="metric-val font-mono text-status-executed">
                {executedCount}
              </div>
              <div className="metric-sub">Funds settled</div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="main-tabs-bar">
          <button
            className={`main-tab-btn ${activeTab === 'SCHEDULE' ? 'active' : ''}`}
            onClick={() => setActiveTab('SCHEDULE')}
          >
            <Send size={16} />
            <span>Schedule New Transfer</span>
          </button>
          <button
            className={`main-tab-btn ${activeTab === 'QUEUE' ? 'active' : ''}`}
            onClick={() => setActiveTab('QUEUE')}
          >
            <ListFilter size={16} />
            <span>Transfers Queue & History</span>
            {readyCount > 0 && (
              <span className="tab-pill font-mono">{readyCount}</span>
            )}
          </button>
        </div>

        {/* Tab Views */}
        {activeTab === 'SCHEDULE' && (
          <div className="tab-pane animate-fade-in">
            <ScheduleForm
              contractAddress={contractAddress}
              onScheduledSuccess={() => {
                refetchAll()
                setActiveTab('QUEUE')
              }}
            />
          </div>
        )}

        {activeTab === 'QUEUE' && (
          <div className="tab-pane animate-fade-in">
            <TransferList
              contractAddress={contractAddress}
              transfers={transfersList}
              isLoading={isLoadingIds || (idsArray.length > 0 && isLoadingItems)}
              refetchTransfers={refetchAll}
            />
          </div>
        )}
      </main>

      {/* Footer / Ecosystem Section */}
      <footer className="footer-container">
        <div className="footer-inner">
          {/* Col 1: Protocol Info */}
          <div className="footer-col footer-protocol">
            <div className="footer-brand font-mono font-bold text-white flex items-center gap-2">
              <Logo size={24} /> BOT Scheduled Transfer
            </div>
            <p className="footer-desc">
              Non-custodial time-locked escrow and autonomous settlement protocol built natively for the BOT Chain ecosystem.
            </p>
            <div className="footer-contract-pill font-mono text-xs">
              <span className="text-dim">Verified Contract:</span>
              <a
                href={`https://scan.botchain.ai/address/${contractAddress}#code`}
                target="_blank"
                rel="noreferrer"
                className="text-gold hover:underline flex items-center gap-1"
              >
                {contractAddress.slice(0, 6)}...{contractAddress.slice(-4)} <ExternalLink size={11} />
              </a>
            </div>
          </div>

          {/* Col 2: BOT Chain Ecosystem Section */}
          <div className="footer-col footer-ecosystem">
            <div className="ecosystem-badge font-mono">
              <span className="text-gold font-bold">BOT Chain Ecosystem</span>
            </div>
            <div className="ecosystem-links font-mono text-xs">
              <a
                href="https://botchain.ai"
                target="_blank"
                rel="noreferrer"
                className="ecosystem-link"
                id="footer-botchain-website"
              >
                <BotChainLogo size={16} />
                <span>BOT Chain website: https://botchain.ai</span>
                <ExternalLink size={11} className="text-dim" />
              </a>
              <a
                href="https://scan.botchain.ai"
                target="_blank"
                rel="noreferrer"
                className="ecosystem-link"
                id="footer-botchain-explorer"
              >
                <BotChainLogo size={16} />
                <span>BOT Chain explorer: https://scan.botchain.ai</span>
                <ExternalLink size={11} className="text-dim" />
              </a>
              <div className="ecosystem-spec-row">
                <span className="text-dim">Mainnet Chain ID:</span>
                <span className="text-white font-bold">677</span>
                <span className="text-dim">• Supply:</span>
                <span className="text-gold">150M BOT</span>
              </div>
            </div>
          </div>

          {/* Col 3: Protocol Resources */}
          <div className="footer-col footer-links font-mono text-xs">
            <span className="footer-heading text-dim uppercase">Protocol Resources</span>
            <button
              onClick={() => setIsWhitepaperOpen(true)}
              className="footer-link-btn text-gold flex items-center gap-1"
            >
              <FileCode size={13} /> Protocol Whitepaper
            </button>
            <a
              href="https://rpc.botchain.ai"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1"
            >
              Mainnet RPC Endpoint <ExternalLink size={11} />
            </a>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="footer-link-btn flex items-center gap-1"
            >
              Contract Config & Tools
            </button>
          </div>
        </div>

        {/* Footer Bottom Bar */}
        <div className="footer-bottom-bar font-mono text-xs">
          <span>© 2026 BOT Scheduled Transfer Protocol</span>
          <span className="footer-network-label">
            Powered by <strong>BOT Chain</strong> • Native Token: <strong>BOT</strong>
          </span>
        </div>
      </footer>

      {/* Contract Settings & Deployment Modal */}
      <ContractModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentAddress={contractAddress}
        onSaveAddress={handleSaveContractAddress}
      />

      {/* Whitepaper Modal */}
      <WhitepaperModal
        isOpen={isWhitepaperOpen}
        onClose={() => setIsWhitepaperOpen(false)}
        contractAddress={contractAddress}
      />

      <style>{`
        .app-layout {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }
        .network-warning-banner {
          background: rgba(245, 179, 0, 0.15);
          border-bottom: 1px solid var(--gold-primary);
          color: #ffffff;
          padding: 12px 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 14px;
          font-size: 0.88rem;
        }
        .network-switch-btn {
          padding: 6px 14px;
          font-size: 0.8rem;
        }
        .main-content {
          flex: 1;
          max-width: 1280px;
          width: 100%;
          margin: 0 auto;
          padding: 32px 24px;
        }
        .hero-section {
          margin-bottom: 36px;
          display: flex;
          flex-direction: column;
          gap: 28px;
        }
        .hero-tag {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(245, 179, 0, 0.08);
          border: 1px solid rgba(245, 179, 0, 0.25);
          color: var(--gold-light);
          padding: 4px 12px;
          border-radius: var(--radius-full);
          font-size: 0.78rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 12px;
        }
        .hero-heading {
          font-size: 2.4rem;
          font-weight: 800;
          letter-spacing: -0.03em;
          line-height: 1.15;
          max-width: 780px;
          color: #ffffff;
          margin-bottom: 12px;
        }
        .gold-text-glow {
          color: var(--gold-primary);
          text-shadow: 0 0 25px rgba(245, 179, 0, 0.35);
        }
        .hero-description {
          font-size: 1.05rem;
          color: var(--text-muted);
          max-width: 680px;
          line-height: 1.6;
        }
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }
        .metric-card {
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 18px 20px;
          box-shadow: var(--shadow-card);
        }
        .metric-label {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-dim);
          font-weight: 700;
          margin-bottom: 6px;
        }
        .metric-val {
          font-size: 1.8rem;
          font-weight: 800;
          color: #ffffff;
          line-height: 1.1;
        }
        .ready-metric-val {
          color: var(--gold-light);
          text-shadow: 0 0 10px rgba(245, 179, 0, 0.4);
        }
        .metric-sub {
          font-size: 0.75rem;
          color: var(--text-dim);
          margin-top: 4px;
        }
        .main-tabs-bar {
          display: flex;
          background: var(--bg-secondary);
          border: 1px solid var(--border-medium);
          padding: 6px;
          border-radius: var(--radius-lg);
          gap: 8px;
          margin-bottom: 28px;
          width: fit-content;
        }
        .main-tab-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          font-weight: 700;
          font-size: 0.92rem;
          padding: 10px 22px;
          border-radius: var(--radius-md);
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 10px;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .main-tab-btn:hover {
          color: #ffffff;
          background: var(--bg-tertiary);
        }
        .main-tab-btn.active {
          background: linear-gradient(135deg, var(--gold-primary), var(--gold-light));
          color: #0c0d10;
          box-shadow: var(--shadow-gold);
        }
        .tab-pill {
          background: #0c0d10;
          color: var(--gold-primary);
          padding: 2px 7px;
          border-radius: 10px;
          font-size: 0.72rem;
          font-weight: 800;
        }
        .footer-container {
          border-top: 1px solid var(--border-subtle);
          background: rgba(14, 16, 20, 0.95);
          padding: 36px 24px 20px 24px;
          margin-top: auto;
        }
        .footer-inner {
          max-width: 1280px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1.3fr 1.6fr 1.1fr;
          gap: 32px;
          align-items: start;
        }
        @media (max-width: 900px) {
          .footer-inner {
            grid-template-columns: 1fr;
            gap: 28px;
          }
        }
        .footer-col {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .footer-desc {
          font-size: 0.82rem;
          color: var(--text-dim);
          line-height: 1.5;
          max-width: 360px;
        }
        .footer-contract-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-subtle);
          padding: 5px 10px;
          border-radius: var(--radius-sm);
          width: fit-content;
        }
        .ecosystem-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(245, 179, 0, 0.08);
          border: 1px solid rgba(245, 179, 0, 0.3);
          padding: 6px 12px;
          border-radius: var(--radius-sm);
          width: fit-content;
          font-size: 0.82rem;
          margin-bottom: 2px;
        }
        .ecosystem-links {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .ecosystem-link {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: var(--text-muted);
          text-decoration: none;
          padding: 4px 8px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: var(--radius-sm);
          transition: all 0.2s ease;
        }
        .ecosystem-link:hover {
          color: var(--gold-light);
          border-color: rgba(245, 179, 0, 0.35);
          background: rgba(245, 179, 0, 0.05);
          transform: translateX(2px);
        }
        .ecosystem-spec-row {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 2px 8px;
          font-size: 0.72rem;
        }
        .footer-heading {
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          margin-bottom: 2px;
        }
        .footer-links {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 10px;
        }
        .footer-links a {
          color: var(--text-muted);
          text-decoration: none;
          transition: color 0.15s;
        }
        .footer-links a:hover {
          color: var(--gold-primary);
        }
        .footer-link-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          font-family: inherit;
          font-size: inherit;
          padding: 0;
        }
        .footer-link-btn:hover {
          color: var(--gold-primary);
        }
        .footer-bottom-bar {
          max-width: 1280px;
          margin: 32px auto 0 auto;
          padding-top: 18px;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          color: var(--text-dim);
        }
        .footer-network-label strong {
          color: var(--gold-primary);
        }
      `}</style>
    </div>
  )
}

export default App
