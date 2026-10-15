const fs = require('fs');
const path = require('path');
const solc = require('solc');

const contractPath = path.resolve(__dirname, '../contracts/ScheduledTransfer.sol');
const source = fs.readFileSync(contractPath, 'utf8');

const input = {
  language: 'Solidity',
  sources: {
    'ScheduledTransfer.sol': {
      content: source,
    },
  },
  settings: {
    optimizer: {
      enabled: true,
      runs: 200,
    },
    outputSelection: {
      '*': {
        '*': ['abi', 'evm.bytecode'],
      },
    },
  },
};

console.log('Compiling ScheduledTransfer.sol...');
const output = JSON.parse(solc.compile(JSON.stringify(input)));

if (output.errors) {
  let hasError = false;
  output.errors.forEach((err) => {
    console.error(err.formattedMessage);
    if (err.severity === 'error') hasError = true;
  });
  if (hasError) process.exit(1);
}

const contract = output.contracts['ScheduledTransfer.sol']['ScheduledTransfer'];
const artifact = {
  contractName: 'ScheduledTransfer',
  abi: contract.abi,
  bytecode: '0x' + contract.evm.bytecode.object,
};

const outDir = path.resolve(__dirname, '../src/config');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

fs.writeFileSync(
  path.join(outDir, 'compiledContract.json'),
  JSON.stringify(artifact, null, 2)
);

console.log('Compilation successful! Bytecode and ABI saved to src/config/compiledContract.json');
