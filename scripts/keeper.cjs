const { createWalletClient, createPublicClient, http } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const fs = require('fs');
const path = require('path');

// Helper to load env files
function loadEnv() {
  const envFiles = ['.env.local', '.env'];
  for (const file of envFiles) {
    const fullPath = path.resolve(__dirname, '..', file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const idx = trimmed.indexOf('=');
          const key = trimmed.slice(0, idx).trim();
          let val = trimmed.slice(idx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  }
}

loadEnv();

// Catch unexpected exceptions to keep daemon alive 24/7
process.on('uncaughtException', (err) => {
  console.error('[Auto-Executor] Uncaught error caught, continuing:', err.message || err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[Auto-Executor] Unhandled rejection caught, continuing:', reason?.message || reason);
});

const artifactPath = path.resolve(__dirname, '../src/config/compiledContract.json');
const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

// Extract contract address from src/config/contract.ts
const contractConfigFile = path.resolve(__dirname, '../src/config/contract.ts');
const configContent = fs.readFileSync(contractConfigFile, 'utf8');
const match = configContent.match(/'(0x[a-fA-F0-9]{40})'/);
const contractAddress = match ? match[1] : null;

if (!contractAddress) {
  console.error('Could not find contract address in src/config/contract.ts');
  process.exit(1);
}

const privateKey =
  process.env.PRIVATE_KEY ||
  process.env.NEXT_PRIVATE_KEY ||
  process.env.VITE_PRIVATE_KEY;

if (!privateKey) {
  console.error('No private key found for automated keeper execution.');
  process.exit(1);
}

const formattedKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
const account = privateKeyToAccount(formattedKey);

const isTestnet = process.argv.includes('--testnet');

const botchainMainnet = {
  id: 677,
  name: 'BotChain Mainnet',
  nativeCurrency: { name: 'BOT', symbol: 'BOT', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.botchain.ai'] } },
};

const botchainTestnet = {
  id: 968,
  name: 'BotChain Testnet',
  nativeCurrency: { name: 'BOT', symbol: 'BOT', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.bohr.life'] } },
};

const targetNetwork = isTestnet ? botchainTestnet : botchainMainnet;
const rpcUrl = isTestnet ? 'https://rpc.bohr.life' : 'https://rpc.botchain.ai';
const explorerUrl = isTestnet ? 'https://scan.bohr.life' : 'https://scan.botchain.ai';

const transportConfig = http(rpcUrl, {
  retryCount: 3,
  retryDelay: 1000,
  timeout: 12000,
});

const publicClient = createPublicClient({
  chain: targetNetwork,
  transport: transportConfig,
});

const walletClient = createWalletClient({
  account,
  chain: targetNetwork,
  transport: transportConfig,
});

console.log('==================================================');
console.log(`🤖 BotChain Autonomous Execution Keeper (${targetNetwork.name})`);
console.log(`Relayer Address: ${account.address}`);
console.log(`Target Contract: ${contractAddress}`);
console.log(`Monitoring for mature transfers every 4 seconds...`);
console.log('==================================================');

const executingIds = new Set();
let isRunningCycle = false;

async function checkAndExecuteTransfers() {
  if (isRunningCycle) return;
  isRunningCycle = true;

  try {
    const totalCount = await publicClient.readContract({
      address: contractAddress,
      abi: artifact.abi,
      functionName: 'totalTransfers',
    });

    if (totalCount === 0n) {
      isRunningCycle = false;
      return;
    }

    const allIds = await publicClient.readContract({
      address: contractAddress,
      abi: artifact.abi,
      functionName: 'getAllTransferIds',
    });

    if (!allIds || allIds.length === 0) {
      isRunningCycle = false;
      return;
    }

    const transfers = await publicClient.readContract({
      address: contractAddress,
      abi: artifact.abi,
      functionName: 'getTransfersByIds',
      args: [allIds],
    });

    const now = Math.floor(Date.now() / 1000);
    const readyToExecute = [];

    for (const t of transfers) {
      // status 0 = Pending, and releaseTime <= now
      if (t.status === 0 && Number(t.releaseTime) <= now && !executingIds.has(t.id.toString())) {
        readyToExecute.push(t);
      }
    }

    if (readyToExecute.length === 0) {
      isRunningCycle = false;
      return;
    }

    console.log(`[Auto-Executor] Found ${readyToExecute.length} mature transfer(s) ready for execution.`);

    for (const t of readyToExecute) {
      const idStr = t.id.toString();
      executingIds.add(idStr);

      try {
        console.log(`[Auto-Executor] Triggering auto-execution for Transfer #${idStr}...`);
        const hash = await walletClient.writeContract({
          address: contractAddress,
          abi: artifact.abi,
          functionName: 'executeTransfer',
          args: [t.id],
        });

        console.log(`[Auto-Executor] TX Broadcasted! Hash: ${hash}`);
        console.log(`[Auto-Executor] Explorer: ${explorerUrl}/tx/${hash}`);

        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        console.log(`[Auto-Executor] Transfer #${idStr} executed successfully! Status: ${receipt.status}`);
      } catch (err) {
        console.error(`[Auto-Executor] Failed to execute transfer #${idStr}:`, err.shortMessage || err.message || err);
      } finally {
        setTimeout(() => executingIds.delete(idStr), 15000);
      }
    }
  } catch (err) {
    const msg = err.shortMessage || err.message || String(err);
    console.warn(`[Auto-Executor] RPC connection note: ${msg.slice(0, 120)} (will retry in 4s)`);
  } finally {
    isRunningCycle = false;
  }
}

// Run check every 4 seconds
setInterval(checkAndExecuteTransfers, 4000);
checkAndExecuteTransfers();
