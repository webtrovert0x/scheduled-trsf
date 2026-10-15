import { useState, useEffect, type FC } from 'react'
import { useAccount, useWalletClient, usePublicClient } from 'wagmi'
import { isAddress } from 'viem'
import compiledArtifact from '../config/compiledContract.json'
import {
  X,
  Shield,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  Copy,
} from 'lucide-react'

interface ContractModalProps {
  isOpen: boolean
  onClose: () => void
  currentAddress: `0x${string}`
  onSaveAddress: (newAddress: `0x${string}`) => void
}

export const ContractModal: FC<ContractModalProps> = ({
  isOpen,
  onClose,
  currentAddress,
  onSaveAddress,
}) => {
  const { isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()

  const [inputAddress, setInputAddress] = useState<string>(currentAddress)
  const [isVerifying, setIsVerifying] = useState<boolean>(false)
  const [contractExists, setContractExists] = useState<boolean | null>(null)

  // In-app deployment state
  const [isDeploying, setIsDeploying] = useState<boolean>(false)
  const [deployTxHash, setDeployTxHash] = useState<string | null>(null)
  const [deployError, setDeployError] = useState<string | null>(null)
  const [copied, setCopied] = useState<boolean>(false)

  // Verify contract on BotChain testnet
  useEffect(() => {
    async function checkCode() {
      if (!isAddress(inputAddress) || !publicClient) {
        setContractExists(null)
        return
      }
      try {
        setIsVerifying(true)
        const code = await publicClient.getBytecode({
          address: inputAddress as `0x${string}`,
        })
        setContractExists(!!code && code !== '0x')
      } catch (err) {
        console.error('Error checking contract bytecode:', err)
        setContractExists(false)
      } finally {
        setIsVerifying(false)
      }
    }

    if (isOpen && isAddress(inputAddress)) {
      checkCode()
    }
  }, [inputAddress, isOpen, publicClient])

  if (!isOpen) return null

  const handleSave = () => {
    if (isAddress(inputAddress)) {
      onSaveAddress(inputAddress as `0x${string}`)
      onClose()
    }
  }

  // 1-Click Deploy to BotChain
  const handleDeployNew = async () => {
    if (!walletClient || !publicClient) {
      setDeployError('Please connect your wallet first.')
      return
    }

    try {
      setIsDeploying(true)
      setDeployError(null)
      setDeployTxHash(null)

      const hash = await walletClient.deployContract({
        abi: compiledArtifact.abi as any,
        bytecode: compiledArtifact.bytecode as `0x${string}`,
      })

      setDeployTxHash(hash)

      const receipt = await publicClient.waitForTransactionReceipt({ hash })
      if (receipt.contractAddress) {
        setInputAddress(receipt.contractAddress)
        onSaveAddress(receipt.contractAddress as `0x${string}`)
        setContractExists(true)
      }
    } catch (err: any) {
      console.error('Deployment error:', err)
      setDeployError(err?.shortMessage || err?.message || 'Deployment failed')
    } finally {
      setIsDeploying(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(inputAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="modal-backdrop">
      <div className="card modal-card animate-fade-in">
        {/* Header */}
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <Shield className="text-gold" size={20} />
            <h3 className="modal-title">Contract Configuration</h3>
          </div>
          <button onClick={onClose} className="modal-close-btn">
            <X size={18} />
          </button>
        </div>

        {/* Contract Address Input */}
        <div className="modal-body">
          <div className="input-group">
            <div className="input-label">
              <span>ScheduledTransfer Contract Address</span>
              {isVerifying ? (
                <span className="text-xs text-muted flex items-center gap-1 font-mono">
                  <Loader2 size={12} className="animate-spin text-gold" />
                  Checking chain...
                </span>
              ) : contractExists === true ? (
                <span className="text-xs text-status-executed flex items-center gap-1 font-mono">
                  <CheckCircle2 size={12} />
                  Contract Verified on BotChain
                </span>
              ) : contractExists === false ? (
                <span className="text-xs text-status-cancelled flex items-center gap-1 font-mono">
                  <AlertCircle size={12} />
                  No Contract Code Found
                </span>
              ) : null}
            </div>

            <div className="input-with-copy">
              <input
                type="text"
                className="input-field font-mono text-sm"
                value={inputAddress}
                onChange={(e) => setInputAddress(e.target.value.trim())}
                placeholder="0x..."
              />
              <button
                type="button"
                onClick={handleCopy}
                className="copy-btn"
                title="Copy Address"
              >
                {copied ? <CheckCircle2 size={16} className="text-gold" /> : <Copy size={16} />}
              </button>
            </div>
          </div>

          {/* Quick links & info */}
          <div className="chain-info-box">
            <div className="chain-info-row">
              <span className="text-dim">Network:</span>
              <span className="font-mono text-white">BotChain Testnet</span>
            </div>
            <div className="chain-info-row">
              <span className="text-dim">Chain ID:</span>
              <span className="font-mono text-gold font-bold">968</span>
            </div>
            <div className="chain-info-row">
              <span className="text-dim">RPC:</span>
              <span className="font-mono text-muted text-xs">https://rpc.bohr.life</span>
            </div>
            {isAddress(inputAddress) && (
              <div className="chain-info-row">
                <span className="text-dim">Explorer:</span>
                <a
                  href={`https://scan.bohr.life/address/${inputAddress}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-xs text-gold flex items-center gap-1 hover:underline"
                >
                  View on Bohr Scan <ExternalLink size={12} />
                </a>
              </div>
            )}
          </div>

          {/* Deploy from browser section */}
          <div className="deploy-section">
            <div className="deploy-header">
              <div className="deploy-title">Deploy New Instance</div>
              <div className="deploy-desc">
                Deploy <code>ScheduledTransfer.sol</code> directly to BotChain Testnet from your connected wallet.
              </div>
            </div>

            {deployError && (
              <div className="deploy-error-msg">
                <AlertCircle size={15} />
                <span>{deployError}</span>
              </div>
            )}

            {deployTxHash && (
              <div className="deploy-success-msg font-mono">
                <div className="flex items-center gap-2">
                  {isDeploying ? (
                    <Loader2 size={14} className="animate-spin text-gold" />
                  ) : (
                    <CheckCircle2 size={14} className="text-status-executed" />
                  )}
                  <span>{isDeploying ? 'Deploying on-chain...' : 'Deployed!'}</span>
                </div>
                <a
                  href={`https://scan.bohr.life/tx/${deployTxHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-gold hover:underline flex items-center gap-1"
                >
                  Tx: {deployTxHash.slice(0, 8)}... <ExternalLink size={11} />
                </a>
              </div>
            )}

            <button
              type="button"
              className="btn-secondary deploy-btn font-mono"
              disabled={isDeploying || !isConnected}
              onClick={handleDeployNew}
            >
              {isDeploying ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Broadcasting Deployment...
                </>
              ) : (
                <>
                  <Upload size={16} />
                  Deploy ScheduledTransfer.sol
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-gold"
            onClick={handleSave}
            disabled={!isAddress(inputAddress)}
          >
            Save & Connect
          </button>
        </div>
      </div>

      <style>{`
        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          padding: 16px;
        }
        .modal-card {
          width: 100%;
          max-width: 540px;
          border-color: var(--border-gold);
          padding: 24px;
        }
        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
          padding-bottom: 14px;
          border-bottom: 1px solid var(--border-subtle);
        }
        .modal-title {
          font-size: 1.15rem;
          font-weight: 700;
          color: #ffffff;
        }
        .modal-close-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px;
          border-radius: 6px;
        }
        .modal-close-btn:hover {
          color: #ffffff;
          background: var(--bg-tertiary);
        }
        .input-with-copy {
          position: relative;
          display: flex;
          align-items: center;
        }
        .copy-btn {
          position: absolute;
          right: 12px;
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          display: flex;
          align-items: center;
        }
        .copy-btn:hover {
          color: var(--gold-primary);
        }
        .chain-info-box {
          background: var(--bg-primary);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 14px;
          margin-bottom: 20px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .chain-info-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.82rem;
        }
        .deploy-section {
          background: rgba(245, 179, 0, 0.04);
          border: 1px dashed var(--border-gold);
          border-radius: var(--radius-md);
          padding: 16px;
          margin-bottom: 20px;
        }
        .deploy-header {
          margin-bottom: 12px;
        }
        .deploy-title {
          font-size: 0.92rem;
          font-weight: 700;
          color: var(--gold-light);
          margin-bottom: 4px;
        }
        .deploy-desc {
          font-size: 0.78rem;
          color: var(--text-muted);
        }
        .deploy-desc code {
          background: var(--bg-card);
          padding: 2px 6px;
          border-radius: 4px;
          color: var(--gold-primary);
        }
        .deploy-btn {
          width: 100%;
          padding: 10px;
          font-size: 0.85rem;
        }
        .deploy-error-msg {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #f87171;
          font-size: 0.8rem;
          margin-bottom: 10px;
        }
        .deploy-success-msg {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-subtle);
          padding: 8px 12px;
          border-radius: var(--radius-sm);
          font-size: 0.8rem;
          margin-bottom: 10px;
        }
        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          border-top: 1px solid var(--border-subtle);
          padding-top: 16px;
        }
      `}</style>
    </div>
  )
}
