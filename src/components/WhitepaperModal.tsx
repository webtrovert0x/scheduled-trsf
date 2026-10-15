import { type FC } from 'react'
import {
  X,
  BookOpen,
  Shield,
  Layers,
  Zap,
  CheckCircle2,
  Lock,
  ExternalLink,
  Cpu,
} from 'lucide-react'

interface WhitepaperModalProps {
  isOpen: boolean
  onClose: () => void
  contractAddress: `0x${string}`
}

export const WhitepaperModal: FC<WhitepaperModalProps> = ({
  isOpen,
  onClose,
  contractAddress,
}) => {
  if (!isOpen) return null

  return (
    <div className="modal-backdrop">
      <div className="card modal-card whitepaper-modal animate-fade-in">
        {/* Header */}
        <div className="modal-header">
          <div className="flex items-center gap-3">
            <div className="wp-icon-wrapper">
              <BookOpen size={20} className="text-gold" />
            </div>
            <div>
              <h2 className="modal-title">BOT Scheduled Transfer Whitepaper</h2>
              <span className="text-xs text-muted font-mono">
                Protocol Architecture & Security Specification • v1.0
              </span>
            </div>
          </div>
          <button onClick={onClose} className="modal-close-btn" title="Close">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Document Content */}
        <div className="whitepaper-body">
          {/* Section 1: Abstract */}
          <section className="wp-section">
            <h3 className="wp-heading flex items-center gap-2">
              <Shield size={18} className="text-gold" />
              1. Executive Summary & Abstract
            </h3>
            <p className="wp-p">
              The <strong>BOT Scheduled Transfer Protocol</strong> is a decentralized, non-custodial smart contract infrastructure deployed on <strong>BotChain</strong>. It empowers businesses, payroll operators, and individuals to schedule time-locked value disbursements that settle automatically on future dates.
            </p>
            <p className="wp-p">
              Smart contracts on the Ethereum Virtual Machine (EVM) are passive state machines that lack native alarm clocks or cron jobs. This protocol bridges that architectural gap by fusing <strong>upfront smart contract escrow</strong> with <strong>permissionless, incentivized keeper execution</strong>.
            </p>
          </section>

          {/* Section 2: Problem & Solution */}
          <section className="wp-section">
            <h3 className="wp-heading flex items-center gap-2">
              <Lock size={18} className="text-gold" />
              2. Problem Statement & Architecture
            </h3>
            <div className="wp-grid-2">
              <div className="wp-callout-box">
                <h4 className="wp-subheading text-status-cancelled">The Traditional Problem</h4>
                <ul className="wp-list">
                  <li><strong>Insolvency at Execution</strong>: Off-chain schedulers only log intent. If the sender's balance drops before the release date, transfers fail.</li>
                  <li><strong>Custodial Exposure</strong>: Centralized payroll escrows hold private keys, creating single points of failure.</li>
                  <li><strong>No Native Automation</strong>: Contracts cannot self-trigger when time expires.</li>
                </ul>
              </div>
              <div className="wp-callout-box wp-callout-gold">
                <h4 className="wp-subheading text-gold">The BOT Protocol Solution</h4>
                <ul className="wp-list">
                  <li><strong>Upfront Capital Escrow</strong>: 100% of transfer funds are locked in the contract at schedule time. Solvency is mathematically guaranteed.</li>
                  <li><strong>Permissionless Keepers</strong>: Schedulers attach an optional native BOT bounty for anyone who triggers execution.</li>
                  <li><strong>Creator Cancellation</strong>: The sender retains full refund authority prior to execution.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 3: Dual Asset Mechanism */}
          <section className="wp-section">
            <h3 className="wp-heading flex items-center gap-2">
              <Layers size={18} className="text-gold" />
              3. Dual-Asset Engine
            </h3>
            <div className="wp-table-wrapper">
              <table className="wp-table">
                <thead>
                  <tr>
                    <th>Asset Type</th>
                    <th>Identifier</th>
                    <th>Escrow Mechanism</th>
                    <th>Settlement Method</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="font-bold text-white">Native BOT Coin</td>
                    <td className="font-mono text-gold">address(0)</td>
                    <td>Deposited via <code>msg.value</code> (amount + keeper tip)</td>
                    <td>Native <code>recipient.call&#123;value&#125;</code></td>
                  </tr>
                  <tr>
                    <td className="font-bold text-white">ERC-20 Tokens</td>
                    <td className="font-mono text-muted">Token Contract Address</td>
                    <td><code>SafeERC20.safeTransferFrom</code> (tokens) + <code>msg.value</code> (BOT tip)</td>
                    <td><code>SafeERC20.safeTransfer</code></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 4: Lifecycle & Execution */}
          <section className="wp-section">
            <h3 className="wp-heading flex items-center gap-2">
              <Zap size={18} className="text-gold" />
              4. Transfer Lifecycle & Keeper Bounties
            </h3>
            <div className="lifecycle-steps">
              <div className="lifecycle-card">
                <span className="step-num font-mono">01</span>
                <div>
                  <h4 className="step-title">Schedule & Lock</h4>
                  <p className="step-desc">
                    Sender specifies recipient, amount, release date, and optional keeper bounty. Funds are held in escrow.
                  </p>
                </div>
              </div>
              <div className="lifecycle-card">
                <span className="step-num font-mono">02</span>
                <div>
                  <h4 className="step-title">Maturity</h4>
                  <p className="step-desc">
                    When <code>block.timestamp &gt;= releaseTime</code>, the transfer unlocks.
                  </p>
                </div>
              </div>
              <div className="lifecycle-card">
                <span className="step-num font-mono">03</span>
                <div>
                  <h4 className="step-title">Execute or Batch</h4>
                  <p className="step-desc">
                    Anyone (recipient, sender, or automated bots) calls <code>executeTransfer</code> or <code>executeBatch</code>. Recipient gets funds, caller receives the BOT gas bounty!
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 5: Security */}
          <section className="wp-section">
            <h3 className="wp-heading flex items-center gap-2">
              <CheckCircle2 size={18} className="text-status-executed" />
              5. Security Model & Trust Guarantees
            </h3>
            <ul className="wp-checklist">
              <li>
                <strong>Reentrancy Resistance</strong>: Protected by OpenZeppelin's battle-tested <code>ReentrancyGuard</code> on all state-altering endpoints.
              </li>
              <li>
                <strong>Checks-Effects-Interactions</strong>: State variables (status set to <code>Executed</code> or <code>Cancelled</code>) update before any asset transfer occurs.
              </li>
              <li>
                <strong>Revocability Without Lockup Risk</strong>: Schedulers can cancel pending transfers at any time prior to execution and immediately reclaim 100% of escrowed principal and tips.
              </li>
            </ul>
          </section>

          {/* Section 6: On-Chain Deployment Parameters */}
          <section className="wp-section">
            <h3 className="wp-heading flex items-center gap-2">
              <Cpu size={18} className="text-gold" />
              6. On-Chain Deployment Parameters
            </h3>
            <div className="chain-details-box font-mono">
              <div className="chain-detail-row">
                <span className="text-dim">Network:</span>
                <span className="text-white font-bold">BotChain Testnet</span>
              </div>
              <div className="chain-detail-row">
                <span className="text-dim">Chain ID:</span>
                <span className="text-gold font-bold">968</span>
              </div>
              <div className="chain-detail-row">
                <span className="text-dim">RPC Endpoint:</span>
                <span className="text-muted text-xs">https://rpc.bohr.life</span>
              </div>
              <div className="chain-detail-row">
                <span className="text-dim">Native Token:</span>
                <span className="text-gold">BOT (18 decimals)</span>
              </div>
              <div className="chain-detail-row">
                <span className="text-dim">Contract Address:</span>
                <a
                  href={`https://scan.bohr.life/address/${contractAddress}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-gold flex items-center gap-1 hover:underline text-xs"
                >
                  {contractAddress} <ExternalLink size={12} />
                </a>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="modal-footer flex items-center justify-between">
          <span className="text-xs text-dim font-mono">
            BotChain Testnet • Open-Source Protocol
          </span>
          <button type="button" className="btn-gold" onClick={onClose}>
            Close Whitepaper
          </button>
        </div>
      </div>

      <style>{`
        .whitepaper-modal {
          max-width: 840px;
          max-height: 85vh;
          display: flex;
          flex-direction: column;
        }
        .wp-icon-wrapper {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: rgba(245, 179, 0, 0.1);
          border: 1px solid var(--border-gold);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .whitepaper-body {
          overflow-y: auto;
          padding: 8px 6px 20px 0;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .wp-section {
          background: rgba(255, 255, 255, 0.015);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 20px;
        }
        .wp-heading {
          font-size: 1.05rem;
          font-weight: 800;
          color: #ffffff;
          margin-bottom: 12px;
        }
        .wp-p {
          font-size: 0.88rem;
          line-height: 1.65;
          color: var(--text-muted);
          margin-bottom: 10px;
        }
        .wp-p:last-child {
          margin-bottom: 0;
        }
        .wp-grid-2 {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 14px;
          margin-top: 10px;
        }
        .wp-callout-box {
          background: var(--bg-primary);
          border: 1px solid var(--border-medium);
          border-radius: var(--radius-md);
          padding: 16px;
        }
        .wp-callout-gold {
          border-color: var(--border-gold);
          background: rgba(245, 179, 0, 0.03);
        }
        .wp-subheading {
          font-size: 0.88rem;
          font-weight: 700;
          margin-bottom: 8px;
        }
        .wp-list {
          padding-left: 18px;
          font-size: 0.82rem;
          color: var(--text-muted);
          line-height: 1.6;
        }
        .wp-table-wrapper {
          overflow-x: auto;
          margin-top: 8px;
        }
        .wp-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.82rem;
        }
        .wp-table th, .wp-table td {
          padding: 10px 14px;
          text-align: left;
          border-bottom: 1px solid var(--border-subtle);
        }
        .wp-table th {
          background: var(--bg-primary);
          color: var(--text-dim);
          text-transform: uppercase;
          font-size: 0.72rem;
          letter-spacing: 0.05em;
        }
        .lifecycle-steps {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 8px;
        }
        .lifecycle-card {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          background: var(--bg-primary);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          padding: 12px 16px;
        }
        .step-num {
          font-size: 1.1rem;
          font-weight: 800;
          color: var(--gold-primary);
          line-height: 1;
          margin-top: 2px;
        }
        .step-title {
          font-size: 0.88rem;
          font-weight: 700;
          color: #ffffff;
          margin-bottom: 2px;
        }
        .step-desc {
          font-size: 0.8rem;
          color: var(--text-muted);
          line-height: 1.5;
        }
        .wp-checklist {
          list-style: none;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
          font-size: 0.84rem;
          color: var(--text-muted);
          line-height: 1.6;
        }
        .chain-details-box {
          display: flex;
          flex-direction: column;
          gap: 8px;
          background: var(--bg-primary);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 14px 16px;
          font-size: 0.82rem;
        }
        .chain-detail-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
      `}</style>
    </div>
  )
}
