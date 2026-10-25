import { createAppKit } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { botchainMainnet, botchainTestnet } from './chain'
import { http } from 'viem'

// Reown Project ID (can be configured via .env or uses default development id)
export const projectId =
  (import.meta.env.VITE_REOWN_PROJECT_ID as string) || 'b56e18d47c72ab683b10814fe9495694'

export const networks = [botchainMainnet, botchainTestnet] as const

export const wagmiAdapter = new WagmiAdapter({
  networks: [botchainMainnet, botchainTestnet],
  projectId,
  transports: {
    [botchainMainnet.id]: http('https://rpc.botchain.ai'),
    [botchainTestnet.id]: http('https://rpc.bohr.life'),
  },
})

export const config = wagmiAdapter.wagmiConfig

export const metadata = {
  name: 'BOT Scheduled Transfer',
  description: 'Prepare, Escrow, and Automate Future Transfers on BotChain',
  url: 'https://scan.botchain.ai',
  icons: ['https://scan.botchain.ai/favicon.ico'],
}

// Initialize Reown AppKit with custom dark & golden yellow theme
createAppKit({
  adapters: [wagmiAdapter],
  networks: [botchainMainnet, botchainTestnet],
  defaultNetwork: botchainMainnet,
  projectId,
  metadata,
  features: {
    analytics: false,
  },
  themeMode: 'dark',
  themeVariables: {
    '--w3m-accent': '#f5b300',
    '--w3m-color-mix': '#111317',
    '--w3m-color-mix-strength': 40,
    '--w3m-border-radius-master': '10px',
  },
})
