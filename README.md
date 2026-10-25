# ⏱️ BOT Scheduled Transfer Protocol

[![Network: BotChain Mainnet](https://img.shields.io/badge/Network-BotChain%20Mainnet%20(677)-F5B300?style=for-the-badge&logo=ethereum&logoColor=black)](https://scan.botchain.ai)
[![Native Token: BOT](https://img.shields.io/badge/Gas%20Coin-BOT%20(150M%20Supply)-black?style=for-the-badge&color=F5B300)](https://scan.botchain.ai)
[![Solidity: 0.8.20](https://img.shields.io/badge/Solidity-0.8.20-363636?style=for-the-badge&logo=solidity)](https://soliditylang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)

An open-source, non-custodial smart contract and decentralized application for **time-locked scheduled payments and automated settlement** on **BotChain Mainnet**.

Prepare transfers that lock funds in contract escrow and execute themselves automatically upon maturity—supporting both native **BOT** coins and any **ERC-20** token on BotChain.

---

## 📌 Deployed Contract Details

| Parameter | Network Details |
| :--- | :--- |
| **Network Name** | **BotChain Mainnet** |
| **Chain ID** | `677` |
| **RPC Endpoint** | `https://rpc.botchain.ai` |
| **Native Gas Coin** | `BOT` (18 Decimals • Total Supply: 150 Million) |
| **Contract Address** | [`0x4e82db1e7fe4a3104677a8ca7f27eb4f982e74ac`](https://scan.botchain.ai/address/0x4e82db1e7fe4a3104677a8ca7f27eb4f982e74ac) |
| **Verification** | [✅ **Verified on BotChain Explorer**](https://scan.botchain.ai/address/0x4e82db1e7fe4a3104677a8ca7f27eb4f982e74ac#code) |
| **Deployment TX** | [`0x614d7fb177f14ecf678940a50ad581f576d339d7c0663e7896988618e9bd3854`](https://scan.botchain.ai/tx/0x614d7fb177f14ecf678940a50ad581f576d339d7c0663e7896988618e9bd3854) |
| **Explorer** | [https://scan.botchain.ai/](https://scan.botchain.ai/) |

---

## 🚀 Key Features

- **🔒 Non-Custodial Capital Escrow**: When a transfer is scheduled, funds are immediately locked inside [`ScheduledTransfer.sol`](contracts/ScheduledTransfer.sol). Counterparties have mathematical proof that funds exist.
- **🤖 Autonomous Self-Execution (Zero Manual Clicks)**: Schedulers and recipients never have to click an "Execute" button. An integrated autonomous relayer daemon (`scripts/keeper.cjs`) monitors BotChain every 4 seconds and executes transfers automatically the instant `block.timestamp >= releaseTime`.
- **🪙 Multi-Asset Support**:
  - **Native BOT (Gas Coin)**: Sent via `msg.value`.
  - **ERC-20 Tokens**: Deposited via OpenZeppelin's `SafeERC20.safeTransferFrom`.
- **⏱️ Dual Timing System (No Timezone Confusion)**:
  - **Delay From Now**: 1-click presets (`15 Mins`, `1 Hour`, `6 Hours`, `1 Day`, `3 Days`, `1 Week`, `1 Month`) or custom durations.
  - **Specific Calendar Date**: Traditional datetime picker.
  - **Live Breakdown**: Displays exact time remaining, device local time, and universal blockchain UTC side-by-side.
- **🔄 Creator Cancellation & Refund Rights**: Pending transfers remain revocable by the creator prior to maturity, granting immediate 100% refund of escrowed principal and gas tips.
- **⚡ Zero Mock Data**: 100% of transfers, balances, countdowns, and statistics are queried live from BotChain Testnet via Viem / Wagmi.
- **🎨 Premium Dark UI**: Tailored grayish-black background with rich golden-yellow accents, responsive layout, and interactive in-app Whitepaper modal.

---

## 🏗️ Protocol Architecture

```
User / Business                 ScheduledTransfer.sol                Autonomous Relayer
     │                                   │                                    │
     │── 1. scheduleNativeTransfer() ───▶│                                    │
     │      (Locks BOT in Escrow)        │                                    │
     │                                   │                                    │
     │                                   │◀── 2. Polls every 4s ──────────────│
     │                                   │       (Checks block.timestamp)    │
     │                                   │                                    │
     │                                   │◀── 3. executeTransfer() ───────────│
     │                                   │       (Triggered when mature)      │
     │                                   │                                    │
     │                                   │─── 4. Settle Funds to Recipient ──▶ Recipient
     │                                   │─── 5. Payout Relayer Gas Bounty ──▶ Relayer
```

### Transfer State Lifecycle

- **`Pending` (`0`)**: Funds locked safely in escrow. Creator can cancel for a full refund.
- **`Executed` (`1`)**: Release timestamp arrived; funds transferred to recipient. State immutable.
- **`Cancelled` (`2`)**: Cancelled by scheduler prior to maturity; funds and tips refunded. State immutable.

---

## 🛠️ Smart Contract Specification

Located in [`contracts/ScheduledTransfer.sol`](contracts/ScheduledTransfer.sol):

```solidity
// Core Scheduling Methods
function scheduleNativeTransfer(
    address recipient,
    uint256 amount,
    uint256 releaseTime,
    uint256 keeperReward,
    string calldata note
) external payable returns (uint256 transferId);

function scheduleTokenTransfer(
    address token,
    address recipient,
    uint256 amount,
    uint256 releaseTime,
    uint256 keeperReward,
    string calldata note
) external payable returns (uint256 transferId);

// Execution & Cancellation
function executeTransfer(uint256 transferId) external nonReentrant;
function executeBatch(uint256[] calldata transferIds) external nonReentrant;
function cancelTransfer(uint256 transferId) external nonReentrant;

// Public Query Views
function getTransfer(uint256 transferId) external view returns (Transfer memory);
function totalTransfers() external view returns (uint256);
function getAllTransferIds() external view returns (uint256[] memory);
function getTransfersByIds(uint256[] calldata ids) external view returns (Transfer[] memory);
```

---

## 💻 Quick Start & Local Setup

### 1. Prerequisites
- **Node.js**: v18+ or v20+
- **npm** or **pnpm** / **yarn**

### 2. Clone & Install Dependencies
```bash
git clone https://github.com/webtrovert0x/scheduled-trsf.git
cd scheduled-trsf
npm install
```

### 3. Environment Variables
Create a `.env.local` file in the project root:
```env
NEXT_PRIVATE_KEY=your_private_key_here
VITE_CONTRACT_ADDRESS=0x4e82db1e7fe4a3104677a8ca7f27eb4f982e74ac
VITE_REOWN_PROJECT_ID=your_reown_project_id
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🤖 Running the Autonomous Keeper Daemon

To enable 24/7 autonomous self-execution of transfers upon maturity:
```bash
npm run keeper
```
The keeper script will connect to BotChain Mainnet (`https://rpc.botchain.ai`), watch for mature transfers, and broadcast execution transactions automatically.

---

## 📜 NPM Scripts

| Command | Purpose |
| :--- | :--- |
| `npm run dev` | Launch local Vite development server with HMR |
| `npm run build` | Compile TypeScript and produce production bundle |
| `npm run compile` | Compile `ScheduledTransfer.sol` with Solidity 0.8.20 |
| `npm run deploy` | Deploy contract to BotChain Testnet via CLI |
| `npm run verify` | Verify smart contract source code on Bohr Scan explorer via API |
| `npm run keeper` | Run autonomous 24/7 execution relayer daemon |

---

## 📄 Protocol Whitepaper

Read the complete whitepaper in [`WHITEPAPER.md`](WHITEPAPER.md) or click the **"Whitepaper"** button directly inside the dApp.

---

## 🛡️ License

This project is licensed under the **MIT License**.
