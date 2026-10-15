const fs = require('fs');
const path = require('path');

async function verify() {
  const contractPath = path.resolve(__dirname, '../contracts/ScheduledTransfer.sol');
  const sourceCode = fs.readFileSync(contractPath, 'utf8');

  // Parse contract address from contract config or CLI args
  let contractAddress = process.argv[2] || process.env.VITE_CONTRACT_ADDRESS;
  if (!contractAddress) {
    const configPath = path.resolve(__dirname, '../src/config/contract.ts');
    if (fs.existsSync(configPath)) {
      const configContent = fs.readFileSync(configPath, 'utf8');
      const match = configContent.match(/(?:DEFAULT_CONTRACT_ADDRESS|SCHEDULED_TRANSFER_ADDRESS)[^'"]*['"](0x[a-fA-F0-9]{40})['"]/);
      if (match) {
        contractAddress = match[1];
      }
    }
  }
  if (!contractAddress) {
    contractAddress = '0x1ef64cc8e0e5c251bf8f77034a091957d1105f2d';
  }

  if (!contractAddress) {
    console.error('Error: Contract address not found. Specify via: node scripts/verify.cjs <0xAddress>');
    process.exit(1);
  }

  console.log('----------------------------------------------------');
  console.log('🤖 BotChain Contract Verification');
  console.log('----------------------------------------------------');
  console.log(`Contract:         ScheduledTransfer`);
  console.log(`Address:          ${contractAddress}`);
  console.log(`Compiler:         v0.8.20+commit.a1b79de6`);
  console.log(`Optimization:     Enabled (200 runs)`);
  console.log(`Explorer:         https://scan.bohr.life`);
  console.log('----------------------------------------------------');

  const payload = {
    compiler_version: 'v0.8.20+commit.a1b79de6',
    contract_name: 'ScheduledTransfer',
    source_code: sourceCode,
    is_optimization_enabled: true,
    optimization_runs: 200,
    evm_version: 'default',
    autodetect_constructor_args: true,
    license_type: 'mit'
  };

  const verifyUrl = `https://scan.bohr.life/api/v2/smart-contracts/${contractAddress}/verification/via/flattened-code`;
  console.log(`Submitting verification request to:\n${verifyUrl}\n`);

  try {
    const res = await fetch(verifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const bodyText = await res.text();
    console.log(`Submission Response [HTTP ${res.status}]:`, bodyText);

    if (res.status !== 200 && res.status !== 201) {
      console.error('Submission failed or already processed.');
    }

    console.log('\nPolling verification status on Bohr Scan...');
    const statusUrl = `https://scan.bohr.life/api/v2/smart-contracts/${contractAddress}`;

    for (let i = 1; i <= 10; i++) {
      await new Promise(r => setTimeout(r, 2000));
      const statusRes = await fetch(statusUrl);
      if (statusRes.ok) {
        const data = await statusRes.json();
        if (data.is_verified) {
          console.log('\n🎉 CONTRACT VERIFIED SUCCESSFULLY!');
          console.log(`Name:             ${data.name}`);
          console.log(`Verified At:      ${data.verified_at}`);
          console.log(`Compiler Version: ${data.compiler_version}`);
          console.log(`\nView on Explorer:`);
          console.log(`👉 https://scan.bohr.life/address/${contractAddress}#code\n`);
          return;
        }
      }
      process.stdout.write(`Attempt ${i}/10: Verification in progress...\r`);
    }

    console.log('\nContract submitted. Please check the explorer:');
    console.log(`👉 https://scan.bohr.life/address/${contractAddress}#code\n`);
  } catch (error) {
    console.error('Verification error:', error.message);
    process.exit(1);
  }
}

verify();
