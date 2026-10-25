const { createWalletClient, createPublicClient, http, formatEther } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const fs = require('fs');
const path = require('path');

// Helper to load env files manually if not in process.env
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

const artifactPath = path.resolve(__dirname, '../src/config/compiledContract.json');
if (!fs.existsSync(artifactPath)) {
  console.error('Please run "node scripts/compile.cjs" first');
  process.exit(1);
}

const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

const privateKey =
  process.env.PRIVATE_KEY ||
  process.env.NEXT_PRIVATE_KEY ||
  process.env.VITE_PRIVATE_KEY ||
  process.argv[2];

if (!privateKey) {
  console.error('Error: No private key found in .env.local, .env, or command line arguments.');
  process.exit(1);
}

const formattedKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
const account = privateKeyToAccount(formattedKey);

// Target network selection: Default is Mainnet (677) unless --testnet is provided
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

async function main() {
  console.log('====================================================');
  console.log(`🚀 Deploying to ${targetNetwork.name} (Chain ID ${targetNetwork.id})`);
  console.log(`RPC URL:          ${rpcUrl}`);
  console.log(`Explorer:         ${explorerUrl}`);
  console.log(`Deployer Address: ${account.address}`);
  console.log('====================================================');

  const publicClient = createPublicClient({
    chain: targetNetwork,
    transport: http(rpcUrl),
  });

  const walletClient = createWalletClient({
    account,
    chain: targetNetwork,
    transport: http(rpcUrl),
  });

  // Query balance
  const balance = await publicClient.getBalance({ address: account.address });
  const balanceFormatted = formatEther(balance);
  console.log(`Deployer Balance: ${balanceFormatted} BOT`);

  // Query gas price directly from node to ensure lowest optimal fee
  const gasPrice = await publicClient.getGasPrice();
  const gasPriceGwei = Number(gasPrice) / 1e9;
  console.log(`Current Gas Price: ${gasPriceGwei} gwei (${gasPrice} wei)`);

  // Estimate gas
  let estimatedGas;
  try {
    estimatedGas = await publicClient.estimateGas({
      account: account.address,
      data: artifact.bytecode,
    });
  } catch (e) {
    // Standard conservative estimate for ScheduledTransfer if simulation dry-run errors
    estimatedGas = 1900000n;
  }

  const estimatedFeeWei = estimatedGas * gasPrice;
  const estimatedFeeBOT = formatEther(estimatedFeeWei);

  console.log(`Estimated Gas:    ${estimatedGas.toString()} units`);
  console.log(`Estimated Fee:    ${estimatedFeeBOT} BOT (Gas optimized: no extra multipliers)`);
  console.log('----------------------------------------------------');

  if (balance < estimatedFeeWei) {
    console.error(`\n❌ INSUFFICIENT GAS BALANCE ON ${targetNetwork.name.toUpperCase()}:`);
    console.error(`Current Balance:   ${balanceFormatted} BOT`);
    console.error(`Required Minimum:  ~${estimatedFeeBOT} BOT`);
    console.error(`Please send at least ~0.05 BOT to deployer address:`);
    console.error(`👉 ${account.address}\n`);
    process.exit(1);
  }

  console.log('Deploying ScheduledTransfer contract with minimal gas...');
  
  // Deploy with exact gasPrice to prevent overpaying
  const hash = await walletClient.deployContract({
    abi: artifact.abi,
    bytecode: artifact.bytecode,
    gasPrice: gasPrice,
  });

  console.log(`Deployment TX Hash: ${hash}`);
  console.log(`Explorer Link: ${explorerUrl}/tx/${hash}`);

  console.log(`Waiting for confirmation on ${targetNetwork.name}...`);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  if (receipt.status === 'success' && receipt.contractAddress) {
    const actualFeeWei = receipt.gasUsed * receipt.effectiveGasPrice;
    console.log('\n🎉 CONTRACT DEPLOYED SUCCESSFULLY!');
    console.log(`Contract Address:   ${receipt.contractAddress}`);
    console.log(`Gas Used:           ${receipt.gasUsed.toString()} units`);
    console.log(`Actual Fee Paid:    ${formatEther(actualFeeWei)} BOT`);
    console.log(`Contract Explorer:  ${explorerUrl}/address/${receipt.contractAddress}#code`);

    // Update DEFAULT_CONTRACT_ADDRESS in src/config/contract.ts
    const contractConfigFile = path.resolve(__dirname, '../src/config/contract.ts');
    if (fs.existsSync(contractConfigFile)) {
      let content = fs.readFileSync(contractConfigFile, 'utf8');
      content = content.replace(
        /export const DEFAULT_CONTRACT_ADDRESS =[\s\S]*?as `0x\$\{string\}`/,
        `export const DEFAULT_CONTRACT_ADDRESS = (import.meta.env.VITE_CONTRACT_ADDRESS ||\n  '${receipt.contractAddress}') as \`0x\${string}\``
      );
      fs.writeFileSync(contractConfigFile, content);
      console.log(`Updated DEFAULT_CONTRACT_ADDRESS in src/config/contract.ts to ${receipt.contractAddress}`);
    }
  } else {
    console.error('Deployment transaction failed on-chain.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Deployment error:', err.shortMessage || err.message || err);
  process.exit(1);
});
