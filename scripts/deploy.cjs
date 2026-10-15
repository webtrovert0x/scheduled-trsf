const { createWalletClient, createPublicClient, http } = require('viem');
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

const botchainTestnet = {
  id: 968,
  name: 'BotChain Testnet',
  nativeCurrency: { name: 'BOT', symbol: 'BOT', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.bohr.life'] } },
};

async function main() {
  console.log(`Deployer Address: ${account.address}`);

  const publicClient = createPublicClient({
    chain: botchainTestnet,
    transport: http('https://rpc.bohr.life'),
  });

  const walletClient = createWalletClient({
    account,
    chain: botchainTestnet,
    transport: http('https://rpc.bohr.life'),
  });

  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`Deployer Balance: ${(Number(balance) / 1e18).toFixed(4)} BOT`);

  if (balance === 0n) {
    console.error('Error: Deployer address has 0 BOT balance. Please fund the address with testnet BOT gas token.');
    process.exit(1);
  }

  console.log('Deploying ScheduledTransfer contract to BotChain Testnet (Chain ID 968)...');
  const hash = await walletClient.deployContract({
    abi: artifact.abi,
    bytecode: artifact.bytecode,
  });

  console.log(`Deployment TX Hash: ${hash}`);
  console.log(`Explorer Link: https://scan.bohr.life/tx/${hash}`);

  console.log('Waiting for transaction confirmation on BotChain...');
  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  if (receipt.status === 'success' && receipt.contractAddress) {
    console.log(`Contract deployed successfully!`);
    console.log(`Contract Address: ${receipt.contractAddress}`);
    console.log(`Contract Explorer: https://scan.bohr.life/address/${receipt.contractAddress}`);

    // Update DEFAULT_CONTRACT_ADDRESS in src/config/contract.ts
    const contractConfigFile = path.resolve(__dirname, '../src/config/contract.ts');
    if (fs.existsSync(contractConfigFile)) {
      let content = fs.readFileSync(contractConfigFile, 'utf8');
      content = content.replace(
        /export const DEFAULT_CONTRACT_ADDRESS =[\s\S]*?as `0x\$\{string\}`/,
        `export const DEFAULT_CONTRACT_ADDRESS = (import.meta.env.VITE_CONTRACT_ADDRESS ||\n  '${receipt.contractAddress}') as \`0x\${string}\``
      );
      fs.writeFileSync(contractConfigFile, content);
      console.log(`Updated DEFAULT_CONTRACT_ADDRESS in src/config/contract.ts`);
    }
  } else {
    console.error('Deployment transaction failed on-chain.');
  }
}

main().catch((err) => {
  console.error('Deployment error:', err.shortMessage || err.message || err);
  process.exit(1);
});
