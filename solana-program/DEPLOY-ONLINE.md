# Deploy Veriflow Solana Program Online (No Local Setup!)

## Option 1: Solana Playground (Recommended - Easiest)

### Step 1: Go to Solana Playground
Open: **https://beta.solpg.io/**

### Step 2: Create New Project
1. Click "Create Project"
2. Choose "Native (Rust)"
3. Name it: `veriflow-program`

### Step 3: Copy Your Code

**Delete the default code** and copy each file:

#### File: `lib.rs`
Copy from: `solana-program/src/lib.rs`

#### File: `error.rs` (Create new file with + button)
Copy from: `solana-program/src/error.rs`

#### File: `instruction.rs`
Copy from: `solana-program/src/instruction.rs`

#### File: `state.rs`
Copy from: `solana-program/src/state.rs`

#### File: `processor.rs`
Copy from: `solana-program/src/processor.rs`

### Step 4: Update Cargo.toml
Replace the default `Cargo.toml` with:

```toml
[package]
name = "veriflow-solana-program"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib", "lib"]

[dependencies]
solana-program = "1.18"
borsh = "1.3"
borsh-derive = "1.3"
thiserror = "1.0"
```

### Step 5: Build
Click the **"Build"** button (hammer icon)

Wait for compilation (~1-2 minutes)

### Step 6: Connect Wallet
1. Click "Not connected" at bottom left
2. Choose **Phantom** or **Solflare** wallet
3. Approve connection
4. Switch network to **Testnet** in your wallet

### Step 7: Get Testnet SOL
If you don't have testnet SOL:
- Click "Airdrop" button in Solana Playground
- Or visit: https://faucet.solana.com/

### Step 8: Deploy
1. Click **"Deploy"** button (rocket icon)
2. Approve transaction in your wallet
3. Wait for deployment (~30 seconds)
4. **Copy the Program ID** that appears!

### Step 9: Save Your Program ID

**IMPORTANT:** Save this somewhere safe:
```
Program ID: 7xKXt...abc123
```

You'll use this in your frontend:

```typescript
// lib/solana/client.ts
export const VERIFLOW_PROGRAM_ID = new PublicKey('YOUR_PROGRAM_ID_HERE');
```

---

## Option 2: Use Pre-Built Contract (If Available)

If someone has already deployed this contract, you can just use their Program ID. However, for security and control, you should deploy your own.

---

## Option 3: GitHub Actions (CI/CD Deploy)

You can set up GitHub Actions to build and deploy automatically, but Solana Playground is simpler for getting started.

---

## What's Your Program ID?

Once deployed, the Program ID will look like:
```
7xKXtMDL5d8zP9vN8YqTGCz3uJ2mW1hR4pQsX6vK9abc
```

This is the blockchain address of your smart contract. It's permanent and immutable on Solana testnet.

---

## View Your Program

After deployment, view it at:
```
https://explorer.solana.com/address/YOUR_PROGRAM_ID?cluster=testnet
```

---

## Advantages of Solana Playground

✅ No local installation needed  
✅ No WSL/Linux required  
✅ Browser-based - works anywhere  
✅ Automatic wallet integration  
✅ Built-in testnet faucet  
✅ One-click deploy  
✅ See deployment status instantly  

---

## Next: Integrate with Your Frontend

Once you have the Program ID, add it to your Next.js app:

### 1. Install dependencies
```bash
pnpm add @solana/web3.js @solana/wallet-adapter-react @solana/wallet-adapter-react-ui @solana/wallet-adapter-wallets
```

### 2. Create config file: `lib/solana/config.ts`
```typescript
import { PublicKey, clusterApiUrl, Connection } from '@solana/web3.js';

export const VERIFLOW_PROGRAM_ID = new PublicKey('YOUR_PROGRAM_ID_HERE');

export const connection = new Connection(
  clusterApiUrl('testnet'),
  'confirmed'
);
```

### 3. That's it!

Now you can interact with your deployed smart contract from your Veriflow app.

---

## Cost

**Testnet:** FREE (unlimited)  
**Mainnet (when ready):** ~0.001 SOL per deployment (~$0.10)

---

## Troubleshooting

**"Build failed"**
- Check all 5 files are created (lib.rs, error.rs, instruction.rs, state.rs, processor.rs)
- Make sure Cargo.toml is correct

**"Wallet not connected"**
- Install Phantom wallet extension
- Switch to Testnet in wallet settings

**"Insufficient funds"**
- Click Airdrop button
- Or visit https://faucet.solana.com/

**"Transaction failed"**
- Wait a minute and try again
- Testnet can be slow sometimes

---

## You're Done!

No building, no WSL, no setup. Just copy, paste, build, deploy! 🚀
