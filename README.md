# 🎰 Solana Casino Game - Decentralized Jackpot Smart Contract

[![Anchor](https://img.shields.io/badge/Anchor-0.31.0-blue)](https://www.anchor-lang.com/)
[![Solana](https://img.shields.io/badge/Solana-1.18-purple)](https://solana.com/)
[![Rust](https://img.shields.io/badge/Rust-1.70-orange)](https://www.rust-lang.org/)
[![License](https://img.shields.io/badge/License-ISC-green)](LICENSE)

A **decentralized casino game** built on **Solana blockchain** featuring a transparent, provably fair jackpot system. This smart contract enables users to participate in time-based jackpot rounds where winners are selected through weighted random distribution based on deposit amounts.

### Stay Connected
| Platform | Link | Purpose |
|----------|------|---------|
| Telegram | [t.me/solzen33](https://t.me/solzen33) | Announcements & Support |
| X | [x.com/solzen33](https://x.com/solzen33) | News & Updates |

## 🎯 Overview

This project implements a **Solana-based casino game** with a **jackpot mechanism** that ensures fairness and transparency through blockchain technology. Players can join rounds by depositing SOL, and winners are selected using a weighted random algorithm that gives higher chances to players with larger deposits.

### Key Features

- 🎲 **Provably Fair Gaming**: All game logic is on-chain, ensuring transparency
- ⏱️ **Time-Based Rounds**: Configurable round duration for each jackpot game
- 💰 **Weighted Winner Selection**: Fair random selection based on deposit amounts
- 🔒 **Secure Smart Contract**: Built with Anchor framework and Rust
- 💸 **Platform Fee System**: Configurable platform fees for sustainability
- 🏆 **Multiple Deposits**: Players can make multiple deposits per round
- 📊 **On-Chain Tracking**: All deposits and winners are recorded on-chain

## 🚀 Quick Start

### Prerequisites

- [Rust](https://www.rust-lang.org/tools/install) (latest stable version)
- [Solana CLI](https://docs.solana.com/cli/install-solana-cli-tools) (v1.18 or later)
- [Anchor Framework](https://www.anchor-lang.com/docs/installation) (v0.31.0)
- [Node.js](https://nodejs.org/) (v16 or later) and [Yarn](https://yarnpkg.com/)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/solana-jackpot-smart-contract.git
   cd solana-jackpot-smart-contract
   ```

2. **Install dependencies**
   ```bash
   yarn install
   ```

3. **Build the smart contract**
   ```bash
   anchor build
   ```

4. **Run tests**
   ```bash
   anchor test
   ```

## 📖 How It Works

### Game Flow

1. **Initialize**: Admin initializes the contract with configuration parameters
2. **Create Round**: Admin creates a new jackpot round
3. **Join Game**: Players deposit SOL to join the round
4. **Set Winner**: After round duration expires, admin selects a winner using random selection
5. **Claim Reward**: Winner claims their reward (total pot minus platform fee)
6. **Transfer Fees**: Admin transfers platform fees to team wallet

### Architecture

```
┌─────────────────┐
│   Admin/Users   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│   Solana Jackpot Smart Contract     │
│                                     │
│  ┌──────────────┐  ┌─────────────┐ │
│  │   Config     │  │ Game Rounds │ │
│  │   Account    │  │   Account   │ │
│  └──────────────┘  └─────────────┘ │
│                                     │
│  ┌───────────────────────────────┐ │
│  │      Vault Account (PDA)      │ │
│  │    Stores all deposits        │ │
│  └───────────────────────────────┘ │
└─────────────────────────────────────┘
```

## 🔧 Smart Contract Instructions

### `initialize`

Initializes the jackpot contract with configuration parameters.

**Parameters:**
- `team_wallet`: PublicKey of the team wallet for fee collection
- `platform_fee`: Fee percentage (in basis points, e.g., 500 = 5%)
- `round_duration`: Duration of each round in seconds

### `create_game`

Creates a new jackpot round. Only admin can call this function.

**Parameters:**
- `roundIndex`: Index of the round (must be sequential)

### `join_game`

Allows players to join the current round by depositing SOL.

**Parameters:**
- `roundIndex`: Index of the current round
- `amount`: Amount of SOL (in lamports) to deposit

**Requirements:**
- Round must be active
- Round duration must not have expired
- Amount must be greater than minimum deposit

### `set_winner`

Selects a winner for the round using weighted random selection. Only admin can call this.

**Parameters:**
- `roundIndex`: Index of the round

**Selection Algorithm:**
- Uses on-chain random number generation
- Winner probability is proportional to deposit amount
- Larger deposits = higher chance of winning

### `claim_reward`

Allows the winner to claim their reward from the jackpot.

**Parameters:**
- `roundIndex`: Index of the round

**Reward Calculation:**
```
Reward = Total Pot - (Total Pot × Platform Fee / 10000)
```

### `transfer_fees`

Transfers platform fees from vault to team wallet. Only admin can call this.

**Parameters:**
- `roundIndex`: Index of the round

## 📝 Usage Examples

### TypeScript/JavaScript Integration

```typescript
import { Program } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { SolbetJackpotSmartContract } from "./target/types/solbet_jackpot_smart_contract";

// Initialize the program
const program = anchor.workspace.SolbetJackpotSmartContract;

// Create a new game round
const roundIndex = new anchor.BN(1);
await program.methods
  .createGame(roundIndex)
  .accounts({
    admin: adminKeypair.publicKey,
    config: configPda,
    roundAcc: roundPda,
    systemProgram: SystemProgram.programId,
  })
  .rpc();

// Join the game
const depositAmount = new anchor.BN(1_000_000_000); // 1 SOL
await program.methods
  .joinGame(roundIndex, depositAmount)
  .accounts({
    user: userKeypair.publicKey,
    config: configPda,
    roundAcc: roundPda,
    vault: vaultPda,
    systemProgram: SystemProgram.programId,
  })
  .rpc();

// Set winner (admin only)
await program.methods
  .setWinner(roundIndex)
  .accounts({
    admin: adminKeypair.publicKey,
    config: configPda,
    roundAcc: roundPda,
  })
  .rpc();

// Claim reward (winner only)
await program.methods
  .claimReward(roundIndex)
  .accounts({
    admin: adminKeypair.publicKey,
    winner: winnerPubkey,
    config: configPda,
    roundAcc: roundPda,
    vault: vaultPda,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```

## 🔐 Security Considerations

- ✅ **Access Control**: Admin-only functions are protected
- ✅ **Input Validation**: All inputs are validated before processing
- ✅ **Overflow Protection**: Uses checked arithmetic operations
- ✅ **PDA Security**: Uses Program Derived Addresses (PDAs) for secure account management
- ✅ **Time Validation**: Round expiration is checked before operations
- ✅ **Amount Validation**: Minimum deposit amounts are enforced

## 🧪 Testing

Run the test suite:

```bash
anchor test
```

The test suite includes:
- Contract initialization
- Game round creation
- Multiple user deposits
- Winner selection
- Reward claiming
- Fee transfers

## 📁 Project Structure

```
solana-jackpot-smart-contract/
├── programs/
│   └── solbet-jackpot-smart-contract/
│       ├── src/
│       │   ├── instructions/      # Instruction handlers
│       │   │   ├── initialize.rs
│       │   │   ├── create_game.rs
│       │   │   ├── join_game.rs
│       │   │   ├── set_winner.rs
│       │   │   ├── claim_reward.rs
│       │   │   └── transfer_fees.rs
│       │   ├── state/              # Account state structures
│       │   │   ├── config.rs
│       │   │   └── game_round.rs
│       │   ├── errors.rs           # Custom error types
│       │   ├── constants.rs        # Program constants
│       │   ├── utils.rs            # Utility functions
│       │   └── lib.rs              # Program entry point
│       └── Cargo.toml
├── tests/
│   └── solbet-jackpot-test.ts      # Test suite
├── Anchor.toml                      # Anchor configuration
└── README.md
```

## 🌐 Deployment

### Deploy to Devnet

```bash
anchor build
anchor deploy --provider.cluster devnet
```

### Deploy to Mainnet

```bash
anchor build
anchor deploy --provider.cluster mainnet
```

**⚠️ Warning**: Always test thoroughly on devnet before deploying to mainnet.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License - see the LICENSE file for details.

## 🔗 Related Projects

- [Anchor Framework](https://www.anchor-lang.com/)
- [Solana Documentation](https://docs.solana.com/)
- [Solana Web3.js](https://solana-labs.github.io/solana-web3.js/)

## 📧 Contact & Support

For questions, issues, or contributions, please open an issue on GitHub.

## ⭐ Keywords

**Solana casino game**, **casino game**, **casino**, **Solana jackpot**, **blockchain casino**, **decentralized casino**, **Solana smart contract**, **provably fair casino**, **on-chain casino**, **crypto casino**, **Web3 casino**, **Solana gambling**, **DeFi casino**, **NFT casino**, **Solana game**, **blockchain gaming**, **crypto gaming**

---

**Built with ❤️ on Solana**

*This project is for educational and development purposes. Please ensure compliance with local gambling regulations before deploying to production.*
