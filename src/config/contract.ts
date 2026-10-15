import { parseAbi } from 'viem'

// Default address can be set here or entered/swapped dynamically in the UI
export const DEFAULT_CONTRACT_ADDRESS = (import.meta.env.VITE_CONTRACT_ADDRESS ||
  '0x1ef64cc8e0e5c251bf8f77034a091957d1105f2d') as `0x${string}`

export const SCHEDULED_TRANSFER_ABI = [
  {
    type: 'function',
    name: 'scheduleNativeTransfer',
    stateMutability: 'payable',
    inputs: [
      { name: 'recipient', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'releaseTime', type: 'uint256' },
      { name: 'keeperReward', type: 'uint256' },
      { name: 'note', type: 'string' },
    ],
    outputs: [{ name: 'transferId', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'scheduleTokenTransfer',
    stateMutability: 'payable',
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'recipient', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'releaseTime', type: 'uint256' },
      { name: 'keeperReward', type: 'uint256' },
      { name: 'note', type: 'string' },
    ],
    outputs: [{ name: 'transferId', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'executeTransfer',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'transferId', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'executeBatch',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'transferIds', type: 'uint256[]' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'cancelTransfer',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'transferId', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'getTransfer',
    stateMutability: 'view',
    inputs: [{ name: 'transferId', type: 'uint256' }],
    outputs: [
      {
        type: 'tuple',
        name: 'transfer',
        components: [
          { name: 'id', type: 'uint256' },
          { name: 'sender', type: 'address' },
          { name: 'recipient', type: 'address' },
          { name: 'token', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'releaseTime', type: 'uint256' },
          { name: 'keeperReward', type: 'uint256' },
          { name: 'status', type: 'uint8' },
          { name: 'note', type: 'string' },
          { name: 'createdAt', type: 'uint256' },
          { name: 'executedAt', type: 'uint256' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'totalTransfers',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'getSenderTransferIds',
    stateMutability: 'view',
    inputs: [{ name: 'sender', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[]' }],
  },
  {
    type: 'function',
    name: 'getRecipientTransferIds',
    stateMutability: 'view',
    inputs: [{ name: 'recipient', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[]' }],
  },
  {
    type: 'function',
    name: 'getAllTransferIds',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256[]' }],
  },
  {
    type: 'function',
    name: 'getTransfersByIds',
    stateMutability: 'view',
    inputs: [{ name: 'ids', type: 'uint256[]' }],
    outputs: [
      {
        type: 'tuple[]',
        name: 'result',
        components: [
          { name: 'id', type: 'uint256' },
          { name: 'sender', type: 'address' },
          { name: 'recipient', type: 'address' },
          { name: 'token', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'releaseTime', type: 'uint256' },
          { name: 'keeperReward', type: 'uint256' },
          { name: 'status', type: 'uint8' },
          { name: 'note', type: 'string' },
          { name: 'createdAt', type: 'uint256' },
          { name: 'executedAt', type: 'uint256' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'getTransfersPaginated',
    stateMutability: 'view',
    inputs: [
      { name: 'offset', type: 'uint256' },
      { name: 'limit', type: 'uint256' },
    ],
    outputs: [
      {
        type: 'tuple[]',
        name: 'items',
        components: [
          { name: 'id', type: 'uint256' },
          { name: 'sender', type: 'address' },
          { name: 'recipient', type: 'address' },
          { name: 'token', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'releaseTime', type: 'uint256' },
          { name: 'keeperReward', type: 'uint256' },
          { name: 'status', type: 'uint8' },
          { name: 'note', type: 'string' },
          { name: 'createdAt', type: 'uint256' },
          { name: 'executedAt', type: 'uint256' },
        ],
      },
      { name: 'total', type: 'uint256' },
    ],
  },
  {
    type: 'event',
    name: 'TransferScheduled',
    inputs: [
      { name: 'id', type: 'uint256', indexed: true },
      { name: 'sender', type: 'address', indexed: true },
      { name: 'recipient', type: 'address', indexed: true },
      { name: 'token', type: 'address', indexed: false },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'releaseTime', type: 'uint256', indexed: false },
      { name: 'keeperReward', type: 'uint256', indexed: false },
      { name: 'note', type: 'string', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'TransferExecuted',
    inputs: [
      { name: 'id', type: 'uint256', indexed: true },
      { name: 'recipient', type: 'address', indexed: true },
      { name: 'caller', type: 'address', indexed: true },
      { name: 'token', type: 'address', indexed: false },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'keeperReward', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'TransferCancelled',
    inputs: [
      { name: 'id', type: 'uint256', indexed: true },
      { name: 'sender', type: 'address', indexed: true },
      { name: 'token', type: 'address', indexed: false },
      { name: 'refundAmount', type: 'uint256', indexed: false },
      { name: 'refundReward', type: 'uint256', indexed: false },
    ],
  },
] as const

export const ERC20_ABI = parseAbi([
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) returns (bool)',
])

export interface ScheduledTransferItem {
  id: bigint
  sender: `0x${string}`
  recipient: `0x${string}`
  token: `0x${string}`
  amount: bigint
  releaseTime: bigint
  keeperReward: bigint
  status: number // 0 = Pending, 1 = Executed, 2 = Cancelled
  note: string
  createdAt: bigint
  executedAt: bigint
}
