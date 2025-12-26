# 🔗 Blockchain Integration Guide

## Overview

Your Veriflow project now has **cryptographic proof of work** on the Solana blockchain! Every workflow commit is recorded on-chain with immutable cryptographic hashes.

## 🎯 What's Integrated

### Smart Contract (Deployed on Solana Testnet)
- **Program ID**: `DK8HgataLhZCqcY1hq6GaCXxzeNHESwSFcQazTYs8USG`
- **Network**: Testnet (free to use)
- **Location**: [Solana Playground](https://beta.solpg.io/)

### Frontend Features
1. **Wallet Connection** - Connect Phantom wallet
2. **Blockchain Commits** - Commit workflows with SHA-256 proof
3. **Transaction Verification** - View on Solana Explorer
4. **Commit History** - Query blockchain for version history

## 🚀 How to Use

### 1. Setup Phantom Wallet

1. Install [Phantom Wallet](https://phantom.app/) extension
2. Create/import a wallet
3. Switch to **Testnet**:
   - Click Settings ⚙️
   - Go to "Developer Settings"
   - Select "Testnet" network

### 2. Get Free Test SOL

Visit any faucet to get free testnet SOL:
- https://faucet.solana.com/
- https://solfaucet.com/

Paste your Phantom wallet address and request ~1-2 SOL (free, no real value).

### 3. Commit Workflow to Blockchain

1. **Open any workflow** in the editor
2. **Click "Connect Wallet"** in the top-right blockchain toolbar
3. **Approve connection** in Phantom popup
4. **Make changes** to your workflow
5. **Click "Commit"** button
6. **Sign transaction** in Phantom (costs ~$0.00001)
7. **View transaction** on Solana Explorer

## 🔍 What Gets Recorded

Each blockchain commit includes:

```typescript
{
  versionHash: string,      // Unique identifier for this version
  contentHash: string,      // SHA-256 of workflow content
  parentHash: string,       // Previous commit hash (Git-style)
  author: string,           // Wallet address of committer
  timestamp: number,        // Unix timestamp
  message: string           // Commit message
}
```

## 📁 File Structure

```
lib/solana/
  ├── config.ts              # Program ID and network config
  ├── instructions.ts        # Transaction builders
  └── queries.ts             # Query blockchain data

hooks/
  └── use-blockchain-commit.ts  # React hook for committing

components/
  ├── blockchain-toolbar.tsx     # Toolbar with wallet + commit
  ├── blockchain-commit-button.tsx
  └── wallet-button.tsx

providers/
  └── solana-wallet.tsx      # Wallet adapter provider

solana-program/             # Smart contract (Rust)
  ├── src/
  │   ├── lib.rs
  │   ├── instruction.rs
  │   ├── processor.rs
  │   ├── state.rs
  │   └── error.rs
  └── Cargo.toml
```

## 🛠️ Developer Usage

### Commit Workflow Programmatically

```typescript
import { useBlockchainCommit } from "@/hooks/use-blockchain-commit";

const { commitToBlockchain, isCommitting } = useBlockchainCommit();

const result = await commitToBlockchain({
  orgId: "my-org",
  workspaceId: "workspace-123",
  workflowContent: JSON.stringify(workflow),
  parentHash: previousVersionHash,
  message: "Added new email node"
});

console.log("Transaction:", result.explorerUrl);
console.log("Version Hash:", result.versionHash);
```

### Query Commit History

```typescript
import { fetchVersionCommit, getCommitChain } from "@/lib/solana/queries";

// Get single commit
const commit = await fetchVersionCommit("workspace-123", "version-hash");

// Get entire history (up to 10 commits)
const history = await getCommitChain("workspace-123", "latest-hash");

for (const commit of history) {
  console.log(commit.message, commit.timestamp);
}
```

### Verify Commit Exists

```typescript
import { verifyCommitExists } from "@/lib/solana/queries";

const exists = await verifyCommitExists("workspace-123", "version-hash");
// Returns true if commit is on blockchain
```

## 🎨 UI Components

### Add Wallet Button Anywhere

```tsx
import { WalletButton } from "@/components/wallet-button";

<WalletButton />
```

### Add Commit Button

```tsx
import { BlockchainCommitButton } from "@/components/blockchain-commit-button";

<BlockchainCommitButton
  workspaceId="workspace-123"
  orgId="my-org"
  workflowContent={workflowData}
  message="Initial commit"
  onSuccess={(result) => {
    console.log("Committed!", result.versionHash);
  }}
/>
```

## 🔒 Security Features

- **Immutable History**: Once committed, cannot be altered
- **Cryptographic Proof**: SHA-256 hashes ensure data integrity
- **Transparent**: All transactions visible on Solana Explorer
- **Decentralized**: No single point of failure
- **Git-like Chain**: Each commit references parent

## 💰 Cost Breakdown

### Testnet (Current)
- **All transactions**: FREE ✅
- **Test SOL**: Free from faucets
- **Unlimited commits**: FREE

### Mainnet (Future Production)
- **Per commit**: ~$0.0001 - $0.001
- **1 SOL** (~$100-200): Thousands of commits
- **Annual cost** (100 commits/day): ~$1-5

## 🔗 Useful Links

- [Solana Explorer (Testnet)](https://explorer.solana.com/?cluster=testnet)
- [Phantom Wallet](https://phantom.app/)
- [Solana Playground](https://beta.solpg.io/)
- [Testnet Faucet](https://faucet.solana.com/)

## 📝 Environment Variables

Add to your `.env`:

```bash
NEXT_PUBLIC_SOLANA_PROGRAM_ID=DK8HgataLhZCqcY1hq6GaCXxzeNHESwSFcQazTYs8USG
NEXT_PUBLIC_SOLANA_NETWORK=testnet
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.testnet.solana.com
```

## 🎯 Next Steps

1. ✅ **Test it out**: Commit a workflow to testnet
2. 🔍 **View transaction**: Check Solana Explorer
3. 📊 **Query history**: Use `getCommitChain()` to see your commits
4. 🚀 **Production**: Deploy to mainnet when ready

## ❓ FAQ

**Q: Is testnet data permanent?**  
A: No, testnet can be reset. Use mainnet for production.

**Q: Can I use other wallets?**  
A: Yes! Solflare and Torus are also supported.

**Q: What if wallet isn't connected?**  
A: The commit button will be disabled until wallet connects.

**Q: Can I query old commits?**  
A: Yes, use `getCommitChain()` to traverse the entire history.

---

**Built with:** Solana, Rust, React, Next.js, TypeScript
