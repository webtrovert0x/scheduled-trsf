import { defineChain } from 'viem'

export const botchainMainnet = defineChain({
  id: 677,
  name: 'BotChain Mainnet',
  nativeCurrency: {
    decimals: 18,
    name: 'BOT',
    symbol: 'BOT',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.botchain.ai'],
    },
    public: {
      http: ['https://rpc.botchain.ai'],
    },
  },
  blockExplorers: {
    default: {
      name: 'BotChain Explorer',
      url: 'https://scan.botchain.ai',
    },
  },
  testnet: false,
})

export const botchainTestnet = defineChain({
  id: 968,
  name: 'BotChain Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'BOT',
    symbol: 'BOT',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.bohr.life'],
    },
    public: {
      http: ['https://rpc.bohr.life'],
    },
  },
  blockExplorers: {
    default: {
      name: 'BotChain Testnet Explorer',
      url: 'https://scan.bohr.life',
    },
  },
  testnet: true,
})
