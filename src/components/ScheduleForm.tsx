import { useState, useEffect, type FC, type FormEvent } from 'react'
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
  useBalance,
} from 'wagmi'
import {
  parseEther,
  parseUnits,
  formatUnits,
  formatEther,
  isAddress,
  zeroAddress,
} from 'viem'
import { SCHEDULED_TRANSFER_ABI, ERC20_ABI } from '../config/contract'
import { botchainMainnet } from '../config/chain'
import {
  Send,
  Coins,
  Calendar,
  Gift,
  FileText,
  User,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ExternalLink,
} from 'lucide-react'

interface ScheduleFormProps {
  contractAddress: `0x${string}`
  onScheduledSuccess: () => void
}

export const ScheduleForm: FC<ScheduleFormProps> = ({
  contractAddress,
  onScheduledSuccess,
}) => {
  const { address, isConnected } = useAccount()

  // Form states
  const [assetType, setAssetType] = useState<'NATIVE' | 'ERC20'>('NATIVE')
  const [tokenAddress, setTokenAddress] = useState<string>('')
  const [recipient, setRecipient] = useState<string>('')
  const [amount, setAmount] = useState<string>('')
  const [keeperReward, setKeeperReward] = useState<string>('0')
  const [note, setNote] = useState<string>('')

  // Date / Time selection
  const [timingMode, setTimingMode] = useState<'DELAY' | 'EXACT'>('DELAY')
  const [delayAmount, setDelayAmount] = useState<number>(1)
  const [delayUnit, setDelayUnit] = useState<'minutes' | 'hours' | 'days' | 'weeks'>('hours')
  const [releaseDateTime, setReleaseDateTime] = useState<string>('')
  const [targetTimestamp, setTargetTimestamp] = useState<number>(() => Math.floor(Date.now() / 1000) + 3600)
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  // Contract Write hooks
  const {
    data: writeHash,
    writeContract,
    isPending: isWritePending,
    error: writeError,
  } = useWriteContract()

  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
  } = useWaitForTransactionReceipt({
    hash: writeHash,
  })

  // Approval Write hook for ERC-20
  const {
    data: approveHash,
    writeContract: writeApprove,
    isPending: isApprovePending,
    error: approveError,
  } = useWriteContract()

  const {
    isLoading: isApproveConfirming,
    isSuccess: isApproveConfirmed,
  } = useWaitForTransactionReceipt({
    hash: approveHash,
  })

  // Read native balance
  const { data: nativeBalanceData, refetch: refetchNativeBalance } = useBalance({
    address,
    chainId: botchainMainnet.id,
  })

  // Read ERC-20 Details
  const isValidTokenAddress = isAddress(tokenAddress) && tokenAddress !== zeroAddress

  const { data: tokenSymbol } = useReadContract({
    address: isValidTokenAddress ? (tokenAddress as `0x${string}`) : undefined,
    abi: ERC20_ABI,
    functionName: 'symbol',
    chainId: botchainMainnet.id,
    query: { enabled: isValidTokenAddress },
  })

  const { data: tokenDecimals } = useReadContract({
    address: isValidTokenAddress ? (tokenAddress as `0x${string}`) : undefined,
    abi: ERC20_ABI,
    functionName: 'decimals',
    chainId: botchainMainnet.id,
    query: { enabled: isValidTokenAddress },
  })

  const { data: tokenBalance, refetch: refetchTokenBalance } = useReadContract({
    address: isValidTokenAddress ? (tokenAddress as `0x${string}`) : undefined,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: botchainMainnet.id,
    query: { enabled: isValidTokenAddress && !!address },
  })

  const { data: tokenAllowance, refetch: refetchTokenAllowance } = useReadContract({
    address: isValidTokenAddress ? (tokenAddress as `0x${string}`) : undefined,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address && contractAddress ? [address, contractAddress] : undefined,
    chainId: botchainMainnet.id,
    query: { enabled: isValidTokenAddress && !!address && !!contractAddress },
  })

  // Update target timestamp whenever delay parameters or exact datetime change
  const applyDelay = (amount: number, unit: 'minutes' | 'hours' | 'days' | 'weeks') => {
    setDelayAmount(amount)
    setDelayUnit(unit)
    const multiplier =
      unit === 'minutes' ? 60 : unit === 'hours' ? 3600 : unit === 'days' ? 86400 : 604800
    const now = Math.floor(Date.now() / 1000)
    const newTarget = now + amount * multiplier
    setTargetTimestamp(newTarget)

    const targetDate = new Date(newTarget * 1000)
    const pad = (n: number) => (n < 10 ? '0' + n : n)
    const localIso = `${targetDate.getFullYear()}-${pad(targetDate.getMonth() + 1)}-${pad(
      targetDate.getDate()
    )}T${pad(targetDate.getHours())}:${pad(targetDate.getMinutes())}`
    setReleaseDateTime(localIso)
  }

  // Handle direct change of exact datetime
  const handleExactDateTimeChange = (val: string) => {
    setReleaseDateTime(val)
    if (val) {
      const parsed = Math.floor(new Date(val).getTime() / 1000)
      if (!isNaN(parsed)) {
        setTargetTimestamp(parsed)
      }
    }
  }

  // Set default release date to +1 hour on first render
  useEffect(() => {
    applyDelay(1, 'hours')
  }, [])

  // When transaction confirms
  useEffect(() => {
    if (isConfirmed) {
      setFeedbackMsg({
        type: 'success',
        text: 'Transfer successfully scheduled on BotChain! Funds are locked in escrow.',
      })
      refetchNativeBalance()
      if (isValidTokenAddress) {
        refetchTokenBalance()
      }
      onScheduledSuccess()
    }
  }, [isConfirmed])

  // When approval confirms
  useEffect(() => {
    if (isApproveConfirmed) {
      refetchTokenAllowance()
      setFeedbackMsg({
        type: 'success',
        text: 'Token approval confirmed! You can now schedule the transfer.',
      })
    }
  }, [isApproveConfirmed])

  // Calculate parsed amounts
  const decimals = assetType === 'NATIVE' ? 18 : (tokenDecimals ?? 18)
  let parsedAmount = BigInt(0)
  try {
    if (amount && parseFloat(amount) > 0) {
      parsedAmount = parseUnits(amount, decimals)
    }
  } catch {
    parsedAmount = BigInt(0)
  }

  let parsedKeeperReward = BigInt(0)
  try {
    if (keeperReward && parseFloat(keeperReward) > 0) {
      parsedKeeperReward = parseEther(keeperReward)
    }
  } catch {
    parsedKeeperReward = BigInt(0)
  }

  // Check if ERC-20 approval is needed
  const needsApproval =
    assetType === 'ERC20' &&
    isValidTokenAddress &&
    tokenAllowance !== undefined &&
    parsedAmount > BigInt(0) &&
    tokenAllowance < parsedAmount

  // Handle Approve
  const handleApprove = () => {
    if (!isValidTokenAddress || !contractAddress) return
    setFeedbackMsg(null)
    writeApprove({
      address: tokenAddress as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [contractAddress, parsedAmount],
      chainId: botchainMainnet.id,
    })
  }

  // Handle Schedule Submit
  const handleSchedule = (e: FormEvent) => {
    e.preventDefault()
    setFeedbackMsg(null)

    if (!isConnected) {
      setFeedbackMsg({ type: 'error', text: 'Please connect your wallet first.' })
      return
    }

    if (!isAddress(recipient) || recipient === zeroAddress) {
      setFeedbackMsg({ type: 'error', text: 'Please provide a valid recipient address.' })
      return
    }

    if (parsedAmount <= BigInt(0)) {
      setFeedbackMsg({ type: 'error', text: 'Please enter an amount greater than 0.' })
      return
    }

    const releaseTimestamp = targetTimestamp
    const currentTimestamp = Math.floor(Date.now() / 1000)
    if (releaseTimestamp <= currentTimestamp) {
      setFeedbackMsg({ type: 'error', text: 'Release time must be in the future.' })
      return
    }

    if (assetType === 'NATIVE') {
      const totalValue = parsedAmount + parsedKeeperReward
      writeContract({
        address: contractAddress,
        abi: SCHEDULED_TRANSFER_ABI,
        functionName: 'scheduleNativeTransfer',
        args: [
          recipient as `0x${string}`,
          parsedAmount,
          BigInt(releaseTimestamp),
          parsedKeeperReward,
          note || '',
        ],
        value: totalValue,
        chainId: botchainMainnet.id,
      })
    } else {
      if (!isValidTokenAddress) {
        setFeedbackMsg({ type: 'error', text: 'Invalid ERC-20 token address.' })
        return
      }
      writeContract({
        address: contractAddress,
        abi: SCHEDULED_TRANSFER_ABI,
        functionName: 'scheduleTokenTransfer',
        args: [
          tokenAddress as `0x${string}`,
          recipient as `0x${string}`,
          parsedAmount,
          BigInt(releaseTimestamp),
          parsedKeeperReward,
          note || '',
        ],
        value: parsedKeeperReward, // Keeper bounty in native BOT
        chainId: botchainMainnet.id,
      })
    }
  }

  const isPending = isWritePending || isConfirming || isApprovePending || isApproveConfirming

  return (
    <div className="card card-gold schedule-form-card">
      <div className="form-header">
        <div className="form-title-group">
          <div className="form-icon-circle">
            <Coins className="text-gold" size={22} />
          </div>
          <div>
            <h2 className="form-title">Schedule Future Transfer</h2>
            <p className="form-desc">
              Funds are safely locked in escrow and guaranteed for execution when the release time arrives.
            </p>
          </div>
        </div>

        {/* Asset Type Toggle */}
        <div className="asset-toggle">
          <button
            type="button"
            className={`asset-tab-btn ${assetType === 'NATIVE' ? 'active' : ''}`}
            onClick={() => setAssetType('NATIVE')}
          >
            Native BOT
          </button>
          <button
            type="button"
            className={`asset-tab-btn ${assetType === 'ERC20' ? 'active' : ''}`}
            onClick={() => setAssetType('ERC20')}
          >
            ERC-20 Token
          </button>
        </div>
      </div>

      <form onSubmit={handleSchedule}>
        {/* ERC20 Token Address if ERC20 mode */}
        {assetType === 'ERC20' && (
          <div className="input-group">
            <div className="input-label">
              <span>ERC-20 Token Contract Address</span>
              {tokenSymbol && (
                <span className="font-mono text-gold text-xs">
                  Symbol: <strong>{tokenSymbol}</strong> | Decimals: {tokenDecimals}
                </span>
              )}
            </div>
            <input
              type="text"
              placeholder="0x..."
              className="input-field font-mono"
              value={tokenAddress}
              onChange={(e) => setTokenAddress(e.target.value.trim())}
              required
            />
            {isValidTokenAddress && tokenBalance !== undefined && (
              <div className="balance-hint">
                <span>Your Token Balance:</span>
                <span className="font-mono text-gold">
                  {formatUnits(tokenBalance, tokenDecimals ?? 18)} {tokenSymbol}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Recipient Address */}
        <div className="input-group">
          <div className="input-label">
            <span>Recipient Address</span>
            <span className="text-dim text-xs">BotChain Wallet or Contract</span>
          </div>
          <div className="input-with-icon">
            <User size={18} className="field-icon" />
            <input
              type="text"
              placeholder="0x..."
              className="input-field input-field-icon font-mono"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value.trim())}
              required
            />
          </div>
        </div>

        {/* Amount & Available Balance */}
        <div className="input-group">
          <div className="input-label">
            <span>Transfer Amount</span>
            {assetType === 'NATIVE' && nativeBalanceData && (
              <span className="font-mono text-xs text-muted">
                Available: {parseFloat(formatEther(nativeBalanceData.value)).toFixed(4)} BOT
              </span>
            )}
          </div>
          <div className="amount-input-row">
            <input
              type="number"
              step="any"
              min="0"
              placeholder="0.0"
              className="input-field font-mono text-lg"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <div className="amount-unit-pill">
              {assetType === 'NATIVE' ? 'BOT' : tokenSymbol || 'TOKEN'}
            </div>
          </div>
        </div>

        {/* Release Date & Time - Clear Dual Mode */}
        <div className="input-group">
          <div className="input-label">
            <span>When should funds unlock?</span>
            <div className="timing-mode-toggle">
              <button
                type="button"
                className={`timing-mode-btn ${timingMode === 'DELAY' ? 'active' : ''}`}
                onClick={() => setTimingMode('DELAY')}
              >
                Delay From Now
              </button>
              <button
                type="button"
                className={`timing-mode-btn ${timingMode === 'EXACT' ? 'active' : ''}`}
                onClick={() => setTimingMode('EXACT')}
              >
                Specific Calendar Date
              </button>
            </div>
          </div>

          {timingMode === 'DELAY' ? (
            <div className="timing-delay-container">
              <div className="preset-buttons-row">
                <button
                  type="button"
                  className={`preset-btn ${delayAmount === 15 && delayUnit === 'minutes' ? 'active-preset' : ''}`}
                  onClick={() => applyDelay(15, 'minutes')}
                >
                  15 Minutes
                </button>
                <button
                  type="button"
                  className={`preset-btn ${delayAmount === 1 && delayUnit === 'hours' ? 'active-preset' : ''}`}
                  onClick={() => applyDelay(1, 'hours')}
                >
                  1 Hour
                </button>
                <button
                  type="button"
                  className={`preset-btn ${delayAmount === 6 && delayUnit === 'hours' ? 'active-preset' : ''}`}
                  onClick={() => applyDelay(6, 'hours')}
                >
                  6 Hours
                </button>
                <button
                  type="button"
                  className={`preset-btn ${delayAmount === 1 && delayUnit === 'days' ? 'active-preset' : ''}`}
                  onClick={() => applyDelay(1, 'days')}
                >
                  24 Hours (1 Day)
                </button>
                <button
                  type="button"
                  className={`preset-btn ${delayAmount === 3 && delayUnit === 'days' ? 'active-preset' : ''}`}
                  onClick={() => applyDelay(3, 'days')}
                >
                  3 Days
                </button>
                <button
                  type="button"
                  className={`preset-btn ${delayAmount === 1 && delayUnit === 'weeks' ? 'active-preset' : ''}`}
                  onClick={() => applyDelay(1, 'weeks')}
                >
                  1 Week
                </button>
                <button
                  type="button"
                  className={`preset-btn ${delayAmount === 4 && delayUnit === 'weeks' ? 'active-preset' : ''}`}
                  onClick={() => applyDelay(4, 'weeks')}
                >
                  1 Month
                </button>
              </div>

              {/* Custom Delay Input */}
              <div className="custom-delay-row mt-2">
                <span className="text-xs text-muted">Or custom duration:</span>
                <div className="custom-delay-inputs">
                  <input
                    type="number"
                    min="1"
                    className="input-field font-mono custom-delay-num"
                    value={delayAmount}
                    onChange={(e) => {
                      const val = Math.max(1, parseInt(e.target.value) || 1)
                      applyDelay(val, delayUnit)
                    }}
                  />
                  <select
                    className="input-field custom-delay-select font-mono"
                    value={delayUnit}
                    onChange={(e) => applyDelay(delayAmount, e.target.value as any)}
                  >
                    <option value="minutes">Minutes</option>
                    <option value="hours">Hours</option>
                    <option value="days">Days</option>
                    <option value="weeks">Weeks</option>
                  </select>
                </div>
              </div>
            </div>
          ) : (
            <div className="exact-datetime-container">
              <div className="input-with-icon mt-2">
                <Calendar size={18} className="field-icon" />
                <input
                  type="datetime-local"
                  className="input-field input-field-icon font-mono"
                  value={releaseDateTime}
                  onChange={(e) => handleExactDateTimeChange(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          {/* Ultra-Clear Timing Breakdown Card */}
          <div className="unlock-breakdown-card font-mono">
            <div className="unlock-breakdown-header">
              <span className="text-gold font-bold text-sm">
                ⏱️ Unlocks In: {Math.max(0, targetTimestamp - Math.floor(Date.now() / 1000)) > 86400
                  ? `${Math.floor((targetTimestamp - Math.floor(Date.now() / 1000)) / 86400)} days, ${Math.floor(((targetTimestamp - Math.floor(Date.now() / 1000)) % 86400) / 3600)} hours`
                  : Math.max(0, targetTimestamp - Math.floor(Date.now() / 1000)) > 3600
                  ? `${Math.floor((targetTimestamp - Math.floor(Date.now() / 1000)) / 3600)} hours, ${Math.floor(((targetTimestamp - Math.floor(Date.now() / 1000)) % 3600) / 60)} minutes`
                  : `${Math.floor((targetTimestamp - Math.floor(Date.now() / 1000)) / 60)} minutes`} from now
              </span>
            </div>
            <div className="breakdown-grid">
              <div className="breakdown-col">
                <span className="breakdown-label">Your Local Time</span>
                <span className="breakdown-val text-white">
                  {new Date(targetTimestamp * 1000).toLocaleString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
              </div>
              <div className="breakdown-col">
                <span className="breakdown-label">On-Chain Universal Time (UTC)</span>
                <span className="breakdown-val text-gold">
                  {new Date(targetTimestamp * 1000).toUTCString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Optional Keeper Execution Reward (BOT) */}
        <div className="input-group">
          <div className="input-label">
            <span className="flex items-center gap-1">
              <Gift size={15} className="text-gold" />
              Optional Keeper Bounty (Gas Tip in BOT)
            </span>
            <span className="text-dim text-xs">Paid to the caller who executes the transfer</span>
          </div>
          <div className="amount-input-row">
            <input
              type="number"
              step="any"
              min="0"
              placeholder="0.0"
              className="input-field font-mono"
              value={keeperReward}
              onChange={(e) => setKeeperReward(e.target.value)}
            />
            <div className="amount-unit-pill">BOT</div>
          </div>
          <span className="text-dim text-xs mt-1">
            Setting an incentive (e.g. 0.05 BOT) encourages decentralized automation bots to trigger your release immediately.
          </span>
        </div>

        {/* Note / Memo */}
        <div className="input-group">
          <div className="input-label">
            <span>Reference Note / Memo (Optional)</span>
            <span className="text-dim text-xs">e.g. "October Payroll", "Invoice #104"</span>
          </div>
          <div className="input-with-icon">
            <FileText size={18} className="field-icon" />
            <input
              type="text"
              placeholder="Description or payment reason"
              className="input-field input-field-icon"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={120}
            />
          </div>
        </div>

        {/* Summary Card */}
        {amount && parseFloat(amount) > 0 && (
          <div className="summary-box">
            <div className="summary-title">Transfer Summary</div>
            <div className="summary-row">
              <span className="text-muted">Total Escrowed:</span>
              <span className="font-mono text-gold font-bold">
                {amount} {assetType === 'NATIVE' ? 'BOT' : tokenSymbol || 'ERC20'}
                {parseFloat(keeperReward) > 0 && ` + ${keeperReward} BOT keeper tip`}
              </span>
            </div>
            <div className="summary-row">
              <span className="text-muted">Unlocks On:</span>
              <span className="font-mono text-white">
                {targetTimestamp
                  ? `${new Date(targetTimestamp * 1000).toLocaleString()} • ${new Date(targetTimestamp * 1000).toUTCString()}`
                  : 'Not set'}
              </span>
            </div>
            <div className="summary-row">
              <span className="text-muted">Recipient:</span>
              <span className="font-mono text-muted text-xs">
                {recipient ? `${recipient.slice(0, 10)}...${recipient.slice(-8)}` : 'Not entered'}
              </span>
            </div>
          </div>
        )}

        {/* Error / Feedback Message */}
        {(feedbackMsg || writeError || approveError) && (
          <div
            className={`feedback-banner ${
              feedbackMsg?.type === 'success' ? 'feedback-success' : 'feedback-error'
            }`}
          >
            {feedbackMsg?.type === 'success' ? (
              <CheckCircle2 size={18} />
            ) : (
              <AlertCircle size={18} />
            )}
            <span>
              {feedbackMsg?.text ||
                (writeError as any)?.shortMessage ||
                (writeError as any)?.message ||
                (approveError as any)?.shortMessage ||
                (approveError as any)?.message}
            </span>
          </div>
        )}

        {/* Transaction in progress notification */}
        {writeHash && (
          <div className="tx-status-banner">
            <div className="flex items-center gap-2">
              {isConfirming ? (
                <Loader2 className="animate-spin text-gold" size={18} />
              ) : (
                <CheckCircle2 className="text-status-executed" size={18} />
              )}
              <span className="text-sm">
                {isConfirming ? 'Confirming on BotChain...' : 'Transaction Confirmed!'}
              </span>
            </div>
            <a
              href={`https://scan.botchain.ai/tx/${writeHash}`}
              target="_blank"
              rel="noreferrer"
              className="tx-explorer-link font-mono"
            >
              View on Scan <ExternalLink size={13} />
            </a>
          </div>
        )}

        {/* Action Buttons */}
        <div className="form-actions-row">
          {needsApproval ? (
            <button
              type="button"
              className="btn-gold flex-1"
              onClick={handleApprove}
              disabled={isPending}
            >
              {isApprovePending || isApproveConfirming ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Approving {tokenSymbol || 'Token'}...
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  Approve {tokenSymbol || 'Token'} for Escrow
                </>
              )}
            </button>
          ) : (
            <button
              type="submit"
              className="btn-gold flex-1"
              disabled={isPending || !isConnected}
            >
              {isWritePending || isConfirming ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Scheduling on BotChain...
                </>
              ) : (
                <>
                  <Send size={18} />
                  Schedule & Lock in Escrow
                </>
              )}
            </button>
          )}
        </div>
      </form>

      <style>{`
        .schedule-form-card {
          margin-bottom: 32px;
        }
        .form-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
          margin-bottom: 24px;
          padding-bottom: 20px;
          border-bottom: 1px solid var(--border-subtle);
        }
        .form-title-group {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .form-icon-circle {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: rgba(245, 179, 0, 0.1);
          border: 1px solid var(--border-gold);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .form-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #ffffff;
        }
        .form-desc {
          font-size: 0.82rem;
          color: var(--text-muted);
        }
        .asset-toggle {
          display: flex;
          background: var(--bg-primary);
          padding: 4px;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-medium);
        }
        .asset-tab-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          font-weight: 700;
          font-size: 0.82rem;
          padding: 8px 16px;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .asset-tab-btn.active {
          background: linear-gradient(135deg, var(--gold-primary), var(--gold-light));
          color: #0d0f12;
          box-shadow: 0 2px 10px rgba(245, 179, 0, 0.3);
        }
        .input-with-icon {
          position: relative;
          display: flex;
          align-items: center;
        }
        .field-icon {
          position: absolute;
          left: 14px;
          color: var(--text-dim);
          pointer-events: none;
        }
        .input-field-icon {
          padding-left: 42px;
        }
        .amount-input-row {
          position: relative;
          display: flex;
          align-items: center;
        }
        .amount-unit-pill {
          position: absolute;
          right: 12px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-medium);
          padding: 6px 12px;
          border-radius: var(--radius-sm);
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--gold-primary);
        }
        .balance-hint {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.8rem;
          color: var(--text-muted);
          margin-top: 6px;
        }
        .utc-time-hint {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(245, 179, 0, 0.05);
          border: 1px solid rgba(245, 179, 0, 0.2);
          border-radius: var(--radius-sm);
          padding: 6px 12px;
          flex-wrap: wrap;
          gap: 6px;
        }
        .timing-mode-toggle {
          display: flex;
          background: var(--bg-primary);
          border: 1px solid var(--border-medium);
          border-radius: var(--radius-sm);
          padding: 2px;
          gap: 2px;
        }
        .timing-mode-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          font-size: 0.72rem;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .timing-mode-btn.active {
          background: var(--bg-tertiary);
          color: var(--gold-primary);
          border: 1px solid var(--border-gold);
        }
        .timing-delay-container {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .preset-buttons-row {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .preset-btn {
          background: var(--bg-tertiary);
          border: 1px solid var(--border-medium);
          color: var(--text-muted);
          font-size: 0.78rem;
          font-weight: 600;
          padding: 7px 14px;
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: all 0.15s;
        }
        .preset-btn:hover {
          background: var(--bg-card-hover);
          color: var(--gold-primary);
          border-color: var(--gold-primary);
        }
        .preset-btn.active-preset {
          background: rgba(245, 179, 0, 0.15);
          color: var(--gold-light);
          border-color: var(--gold-primary);
          box-shadow: 0 0 8px rgba(245, 179, 0, 0.25);
        }
        .custom-delay-row {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .custom-delay-inputs {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .custom-delay-num {
          width: 80px;
          padding: 8px 12px;
        }
        .custom-delay-select {
          width: 120px;
          padding: 8px 12px;
        }
        .unlock-breakdown-card {
          margin-top: 14px;
          background: linear-gradient(180deg, rgba(245, 179, 0, 0.08) 0%, rgba(245, 179, 0, 0.02) 100%);
          border: 1px solid var(--border-gold);
          border-radius: var(--radius-md);
          padding: 14px 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .unlock-breakdown-header {
          border-bottom: 1px solid rgba(245, 179, 0, 0.15);
          padding-bottom: 8px;
        }
        .breakdown-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 12px;
        }
        .breakdown-col {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .breakdown-label {
          font-size: 0.68rem;
          text-transform: uppercase;
          color: var(--text-dim);
          letter-spacing: 0.05em;
        }
        .breakdown-val {
          font-size: 0.8rem;
          line-height: 1.4;
        }
        .summary-box {
          background: rgba(245, 179, 0, 0.04);
          border: 1px solid var(--border-gold);
          border-radius: var(--radius-md);
          padding: 16px;
          margin-bottom: 20px;
        }
        .summary-title {
          font-size: 0.82rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--gold-primary);
          margin-bottom: 10px;
        }
        .summary-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.85rem;
          margin-bottom: 6px;
        }
        .summary-row:last-child {
          margin-bottom: 0;
        }
        .feedback-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          border-radius: var(--radius-md);
          font-size: 0.88rem;
          margin-bottom: 18px;
        }
        .feedback-error {
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #fca5a5;
        }
        .feedback-success {
          background: rgba(16, 185, 129, 0.12);
          border: 1px solid rgba(16, 185, 129, 0.3);
          color: #6ee7b7;
        }
        .tx-status-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-medium);
          padding: 12px 16px;
          border-radius: var(--radius-md);
          margin-bottom: 18px;
        }
        .tx-explorer-link {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          color: var(--gold-primary);
          font-size: 0.8rem;
          text-decoration: none;
          font-weight: 600;
        }
        .tx-explorer-link:hover {
          text-decoration: underline;
        }
        .form-actions-row {
          display: flex;
          gap: 12px;
        }
        .flex-1 {
          flex: 1;
        }
        .mt-2 {
          margin-top: 8px;
        }
      `}</style>
    </div>
  )
}
