import { useState, useEffect, type FC } from 'react'
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi'
import {
  formatEther,
  formatUnits,
  zeroAddress,
} from 'viem'
import {
  SCHEDULED_TRANSFER_ABI,
  type ScheduledTransferItem,
} from '../config/contract'
import { botchainMainnet } from '../config/chain'
import { Countdown } from './Countdown'
import {
  CheckCircle2,
  XCircle,
  ExternalLink,
  Zap,
  RotateCcw,
  ArrowRight,
  Gift,
  FileText,
  Loader2,
  Inbox,
  AlertCircle,
  Shield,
  Bot,
} from 'lucide-react'

interface TransferListProps {
  contractAddress: `0x${string}`
  transfers: ScheduledTransferItem[]
  isLoading: boolean
  refetchTransfers: () => void
}

export const TransferList: FC<TransferListProps> = ({
  contractAddress,
  transfers,
  isLoading,
  refetchTransfers,
}) => {
  const { address } = useAccount()
  const [activeFilter, setActiveFilter] = useState<
    'ALL' | 'PENDING' | 'AUTO_EXECUTING' | 'MY_SENT' | 'MY_RECEIVED' | 'HISTORY'
  >('PENDING')

  // Cancel write hook
  const {
    data: cancelTxHash,
    writeContract: writeCancel,
    isPending: isCancelPending,
    error: cancelError,
  } = useWriteContract()

  const { isLoading: isCancelConfirming } = useWaitForTransactionReceipt({
    hash: cancelTxHash,
  })

  useEffect(() => {
    if (cancelTxHash && !isCancelConfirming) {
      refetchTransfers()
    }
  }, [cancelTxHash, isCancelConfirming])

  const nowSeconds = Math.floor(Date.now() / 1000)

  // Filter transfers
  const filteredTransfers = transfers.filter((t) => {
    const isAutoExecuting = t.status === 0 && Number(t.releaseTime) <= nowSeconds
    const isPending = t.status === 0
    const isHistory = t.status === 1 || t.status === 2
    const isMySent = address && t.sender.toLowerCase() === address.toLowerCase()
    const isMyReceived = address && t.recipient.toLowerCase() === address.toLowerCase()

    if (activeFilter === 'PENDING') return isPending
    if (activeFilter === 'AUTO_EXECUTING') return isAutoExecuting
    if (activeFilter === 'MY_SENT') return isMySent
    if (activeFilter === 'MY_RECEIVED') return isMyReceived
    if (activeFilter === 'HISTORY') return isHistory
    return true // ALL
  })

  const autoExecutingTransfers = transfers.filter(
    (t) => t.status === 0 && Number(t.releaseTime) <= nowSeconds
  )

  // Cancel transfer
  const handleCancel = (id: bigint) => {
    if (!confirm(`Are you sure you want to cancel Transfer #${id.toString()}? Escrowed funds and keeper rewards will be refunded directly to your wallet.`)) {
      return
    }
    writeCancel({
      address: contractAddress,
      abi: SCHEDULED_TRANSFER_ABI,
      functionName: 'cancelTransfer',
      args: [id],
      chainId: botchainMainnet.id,
    })
  }

  const formatAmount = (token: string, amount: bigint) => {
    if (token === zeroAddress) {
      return `${parseFloat(formatEther(amount)).toLocaleString(undefined, { maximumFractionDigits: 4 })} BOT`
    }
    return `${formatUnits(amount, 18)} ERC20`
  }

  return (
    <div className="transfers-container">
      {/* Header & Filter Bar */}
      <div className="transfers-header-row">
        <div>
          <h2 className="transfers-title">Scheduled Transfers Queue</h2>
          <p className="transfers-subtitle">
            Transfers are held in escrow on BotChain and execute themselves automatically upon maturity.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="filter-pills-group">
          <button
            className={`filter-btn ${activeFilter === 'PENDING' ? 'active' : ''}`}
            onClick={() => setActiveFilter('PENDING')}
          >
            Pending
          </button>
          <button
            className={`filter-btn ${activeFilter === 'AUTO_EXECUTING' ? 'active' : ''}`}
            onClick={() => setActiveFilter('AUTO_EXECUTING')}
          >
            <Zap size={13} className="text-gold" />
            Auto-Settling ({autoExecutingTransfers.length})
          </button>
          <button
            className={`filter-btn ${activeFilter === 'MY_SENT' ? 'active' : ''}`}
            onClick={() => setActiveFilter('MY_SENT')}
          >
            Sent by Me
          </button>
          <button
            className={`filter-btn ${activeFilter === 'MY_RECEIVED' ? 'active' : ''}`}
            onClick={() => setActiveFilter('MY_RECEIVED')}
          >
            To Me
          </button>
          <button
            className={`filter-btn ${activeFilter === 'HISTORY' ? 'active' : ''}`}
            onClick={() => setActiveFilter('HISTORY')}
          >
            Settled History
          </button>
          <button
            className={`filter-btn ${activeFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => setActiveFilter('ALL')}
          >
            All ({transfers.length})
          </button>
        </div>
      </div>

      {/* Autonomous Relayer Live Indicator Banner */}
      <div className="autonomous-status-banner animate-fade-in font-mono">
        <div className="flex items-center gap-3">
          <div className="bot-icon-circle">
            <Bot size={18} className="text-gold" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="auto-pulse-dot"></span>
              <span className="text-sm font-bold text-white">
                BotChain Autonomous Execution Engine: Active
              </span>
            </div>
            <p className="text-xs text-muted mt-0.5">
              Zero manual execution required. The protocol autonomously settles payments on-chain the moment the countdown arrives at zero.
            </p>
          </div>
        </div>
      </div>

      {/* Cancellation transaction status toast */}
      {cancelTxHash && (
        <div className="action-tx-toast animate-fade-in">
          <div className="flex items-center gap-2">
            {isCancelConfirming ? (
              <Loader2 className="animate-spin text-gold" size={16} />
            ) : (
              <CheckCircle2 className="text-status-executed" size={16} />
            )}
            <span className="text-sm font-semibold">
              {isCancelConfirming ? 'Processing cancellation on BotChain...' : 'Transfer Cancelled & Escrow Refunded!'}
            </span>
          </div>
          <a
            href={`https://scan.botchain.ai/tx/${cancelTxHash}`}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-xs text-gold flex items-center gap-1 hover:underline"
          >
            {cancelTxHash.slice(0, 10)}...{cancelTxHash.slice(-8)}
            <ExternalLink size={12} />
          </a>
        </div>
      )}

      {cancelError && (
        <div className="action-error-toast animate-fade-in">
          <AlertCircle size={16} />
          <span className="text-xs">
            {(cancelError as any)?.shortMessage || cancelError.message}
          </span>
        </div>
      )}

      {/* List / Empty State */}
      {isLoading ? (
        <div className="card loading-card">
          <Loader2 className="animate-spin text-gold" size={32} />
          <span className="text-muted text-sm font-mono mt-3">
            Reading live transfers from BotChain...
          </span>
        </div>
      ) : filteredTransfers.length === 0 ? (
        <div className="card empty-card">
          <div className="empty-icon-wrapper">
            <Inbox size={32} className="text-muted" />
          </div>
          <h3 className="empty-title">No Transfers Found</h3>
          <p className="empty-desc">
            {activeFilter === 'PENDING'
              ? 'There are currently no pending transfers in the contract.'
              : activeFilter === 'AUTO_EXECUTING'
              ? 'No scheduled transfers are currently waiting for autonomous settlement.'
              : activeFilter === 'MY_SENT'
              ? 'You have not scheduled any transfers yet.'
              : activeFilter === 'MY_RECEIVED'
              ? 'No incoming scheduled transfers for your wallet address.'
              : activeFilter === 'HISTORY'
              ? 'No executed or cancelled transfers found.'
              : 'The contract has no recorded transfers yet. Use the form above to schedule your first transfer!'}
          </p>
        </div>
      ) : (
        <div className="transfers-grid">
          {filteredTransfers.map((item) => {
            const isAutoExecuting = item.status === 0 && Number(item.releaseTime) <= nowSeconds
            const isPending = item.status === 0
            const isExecuted = item.status === 1
            const isCancelled = item.status === 2
            const isCreator =
              address && item.sender.toLowerCase() === address.toLowerCase()

            return (
              <div
                key={item.id.toString()}
                className={`card transfer-card ${isAutoExecuting ? 'auto-executing-card' : ''}`}
              >
                {/* Card Top: ID and Status */}
                <div className="card-top-row">
                  <span className="card-id font-mono">Transfer #{item.id.toString()}</span>

                  <div className="card-status-wrapper">
                    {isExecuted && (
                      <span className="badge badge-executed">
                        <CheckCircle2 size={13} />
                        Settled & Executed
                      </span>
                    )}
                    {isCancelled && (
                      <span className="badge badge-cancelled">
                        <XCircle size={13} />
                        Cancelled
                      </span>
                    )}
                    {isPending && (
                      <Countdown
                        targetTimestamp={item.releaseTime}
                        onReady={refetchTransfers}
                      />
                    )}
                  </div>
                </div>

                {/* Amount Display */}
                <div className="card-amount-box">
                  <div className="card-amount-label">Escrowed Funds</div>
                  <div className="card-amount-value font-mono">
                    {formatAmount(item.token, item.amount)}
                  </div>
                  {item.keeperReward > BigInt(0) && (
                    <div className="card-reward-tag font-mono">
                      <Gift size={12} className="text-gold" />
                      +{formatEther(item.keeperReward)} BOT Relayer Bounty
                    </div>
                  )}
                </div>

                {/* Sender -> Recipient */}
                <div className="parties-row">
                  <div className="party-box">
                    <span className="party-role">From</span>
                    <a
                      href={`https://scan.botchain.ai/address/${item.sender}`}
                      target="_blank"
                      rel="noreferrer"
                      className="party-address font-mono"
                      title={item.sender}
                    >
                      {item.sender.slice(0, 6)}...{item.sender.slice(-4)}
                      {isCreator && <span className="you-pill">You</span>}
                    </a>
                  </div>

                  <div className="party-arrow">
                    <ArrowRight size={16} />
                  </div>

                  <div className="party-box">
                    <span className="party-role">To</span>
                    <a
                      href={`https://scan.botchain.ai/address/${item.recipient}`}
                      target="_blank"
                      rel="noreferrer"
                      className="party-address font-mono"
                      title={item.recipient}
                    >
                      {item.recipient.slice(0, 6)}...{item.recipient.slice(-4)}
                      {address &&
                        item.recipient.toLowerCase() === address.toLowerCase() && (
                          <span className="you-pill">You</span>
                        )}
                    </a>
                  </div>
                </div>

                {/* Token contract indicator if ERC-20 */}
                {item.token !== zeroAddress && (
                  <div className="token-contract-row font-mono">
                    <span className="text-dim text-xs">Token Contract:</span>
                    <a
                      href={`https://scan.botchain.ai/address/${item.token}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-gold flex items-center gap-1 hover:underline"
                    >
                      {item.token.slice(0, 8)}...{item.token.slice(-6)}
                      <ExternalLink size={10} />
                    </a>
                  </div>
                )}

                {/* Note / Memo */}
                {item.note && (
                  <div className="card-note-box">
                    <FileText size={13} className="text-muted" />
                    <span className="card-note-text">"{item.note}"</span>
                  </div>
                )}

                {/* Timestamps */}
                <div className="timestamps-row font-mono">
                  <div className="time-item">
                    <span className="time-label">Releases (Local):</span>
                    <span className="time-val text-white">
                      {new Date(Number(item.releaseTime) * 1000).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className="time-item text-xs mt-1">
                    <span className="time-label">On-Chain UTC:</span>
                    <span className="text-gold">
                      {new Date(Number(item.releaseTime) * 1000).toUTCString()}
                    </span>
                  </div>
                </div>

                {/* Auto-Execution Status & Actions */}
                <div className="card-actions-row">
                  {/* If mature and pending: Auto-Executing indicator (NO manual execute button) */}
                  {isPending && isAutoExecuting && (
                    <div className="auto-executing-card-bar font-mono">
                      <div className="flex items-center gap-2">
                        <Loader2 size={15} className="animate-spin text-gold" />
                        <span className="font-bold text-xs text-gold">
                          Autonomous Relayer Settling On-Chain...
                        </span>
                      </div>
                      <span className="text-dim text-xs">Funds transfer automatically</span>
                    </div>
                  )}

                  {/* If pending and locked: Locked in Escrow notice */}
                  {isPending && !isAutoExecuting && (
                    <div className="escrow-locked-notice font-mono">
                      <Shield size={13} className="text-gold" />
                      <span>Locked in Escrow • Executes automatically when countdown ends</span>
                    </div>
                  )}

                  {/* Cancel Button (only for creator if pending) */}
                  {isPending && isCreator && !isAutoExecuting && (
                    <button
                      className="btn-danger card-cancel-btn font-mono"
                      disabled={isCancelPending || isCancelConfirming}
                      onClick={() => handleCancel(item.id)}
                      title="Cancel transfer and refund all escrowed assets"
                    >
                      <RotateCcw size={13} />
                      Cancel & Refund
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <style>{`
        .transfers-container {
          margin-top: 12px;
        }
        .transfers-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
          margin-bottom: 20px;
        }
        .transfers-title {
          font-size: 1.35rem;
          font-weight: 800;
          color: #ffffff;
        }
        .transfers-subtitle {
          font-size: 0.82rem;
          color: var(--text-muted);
        }
        .filter-pills-group {
          display: flex;
          background: var(--bg-card);
          border: 1px solid var(--border-medium);
          padding: 4px;
          border-radius: var(--radius-md);
          gap: 4px;
          flex-wrap: wrap;
        }
        .filter-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          font-size: 0.8rem;
          font-weight: 700;
          padding: 7px 14px;
          border-radius: 8px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s;
        }
        .filter-btn:hover {
          color: var(--text-main);
          background: var(--bg-tertiary);
        }
        .filter-btn.active {
          background: linear-gradient(135deg, var(--gold-primary), var(--gold-light));
          color: #0c0d10;
          box-shadow: 0 2px 8px rgba(245, 179, 0, 0.25);
        }
        .autonomous-status-banner {
          background: rgba(245, 179, 0, 0.05);
          border: 1px solid var(--border-gold);
          border-radius: var(--radius-md);
          padding: 14px 18px;
          margin-bottom: 24px;
        }
        .bot-icon-circle {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: rgba(245, 179, 0, 0.12);
          border: 1px solid var(--border-gold);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .auto-pulse-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #10b981;
          box-shadow: 0 0 8px #10b981;
          animation: pulse-glow-green 2s infinite ease-in-out;
        }
        @keyframes pulse-glow-green {
          0%, 100% { box-shadow: 0 0 6px #10b981; }
          50% { box-shadow: 0 0 14px #10b981; }
        }
        .action-tx-toast {
          background: var(--bg-tertiary);
          border: 1px solid var(--border-gold);
          border-radius: var(--radius-md);
          padding: 10px 16px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 8px;
        }
        .action-error-toast {
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #fca5a5;
          padding: 10px 16px;
          border-radius: var(--radius-md);
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .loading-card, .empty-card {
          text-align: center;
          padding: 56px 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .empty-icon-wrapper {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: var(--bg-tertiary);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
        }
        .empty-title {
          font-size: 1.15rem;
          font-weight: 700;
          color: #ffffff;
          margin-bottom: 6px;
        }
        .empty-desc {
          font-size: 0.88rem;
          color: var(--text-muted);
          max-width: 480px;
          line-height: 1.6;
        }
        .transfers-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
          gap: 20px;
        }
        .transfer-card {
          display: flex;
          flex-direction: column;
          gap: 16px;
          transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .transfer-card:hover {
          transform: translateY(-2px);
          border-color: var(--border-gold);
        }
        .auto-executing-card {
          border-color: rgba(245, 179, 0, 0.6);
          background: linear-gradient(180deg, rgba(245, 179, 0, 0.06) 0%, var(--bg-card) 100%);
          box-shadow: 0 4px 20px rgba(245, 179, 0, 0.15);
        }
        .card-top-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .card-id {
          font-weight: 700;
          font-size: 0.95rem;
          color: var(--gold-light);
        }
        .card-amount-box {
          background: var(--bg-primary);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 14px 16px;
        }
        .card-amount-label {
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-dim);
          font-weight: 700;
          margin-bottom: 4px;
        }
        .card-amount-value {
          font-size: 1.35rem;
          font-weight: 800;
          color: #ffffff;
        }
        .card-reward-tag {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          margin-top: 6px;
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--gold-primary);
          background: rgba(245, 179, 0, 0.1);
          padding: 2px 8px;
          border-radius: 6px;
        }
        .parties-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: var(--bg-tertiary);
          border-radius: var(--radius-md);
          padding: 10px 14px;
        }
        .party-box {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .party-role {
          font-size: 0.68rem;
          text-transform: uppercase;
          color: var(--text-dim);
          font-weight: 700;
        }
        .party-address {
          font-size: 0.82rem;
          color: var(--text-main);
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .party-address:hover {
          color: var(--gold-primary);
          text-decoration: underline;
        }
        .you-pill {
          background: rgba(245, 179, 0, 0.2);
          color: var(--gold-primary);
          font-size: 0.65rem;
          font-weight: 700;
          padding: 1px 5px;
          border-radius: 4px;
        }
        .party-arrow {
          color: var(--text-dim);
        }
        .token-contract-row {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .card-note-box {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          background: rgba(255, 255, 255, 0.02);
          border-radius: var(--radius-sm);
          padding: 8px 12px;
        }
        .card-note-text {
          font-size: 0.82rem;
          color: var(--text-muted);
          font-style: italic;
        }
        .timestamps-row {
          font-size: 0.78rem;
          color: var(--text-muted);
          border-top: 1px solid var(--border-subtle);
          padding-top: 10px;
        }
        .time-label {
          color: var(--text-dim);
          margin-right: 6px;
        }
        .card-actions-row {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: auto;
        }
        .auto-executing-card-bar {
          background: rgba(245, 179, 0, 0.1);
          border: 1px solid var(--border-gold);
          border-radius: var(--radius-md);
          padding: 10px 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .escrow-locked-notice {
          display: flex;
          align-items: center;
          gap: 6px;
          background: var(--bg-primary);
          border: 1px solid var(--border-subtle);
          padding: 8px 12px;
          border-radius: var(--radius-sm);
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .card-cancel-btn {
          align-self: flex-start;
          padding: 6px 12px;
        }
      `}</style>
    </div>
  )
}
