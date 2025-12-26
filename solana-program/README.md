# Veriflow Solana Program - Deployment Guide

This is a Solana smart contract (program) that provides cryptographic proof of workflow executions and Git-like version control on the blockchain for Veriflow.

## Prerequisites

**⚠️ Important: Use WSL (Windows Subsystem for Linux) for building Solana programs**

### 1. Enable WSL (if not already enabled)
```powershell
# In PowerShell as Administrator
wsl --install
# Or install Ubuntu specifically:
wsl --install -d Ubuntu
```

Restart your computer, then open Ubuntu from Start menu.

### 2. Inside WSL Ubuntu - Install Rust
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install build essentials
sudo apt install -y build-essential pkg-config libssl-dev

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

### 3. Inside WSL - Install Solana CLI
```bash
sh -c "$(curl -sSfL https://release.solana.com/v1.18.4/install)"

# Add to PATH
echo 'export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

### 4. Verify Installation
```bash
rustc --version
cargo --version
solana --version
```

---

## Step-by-Step Deployment to Testnet

### Step 1: Access Your Project in WSL

```bash
# In WSL, navigate to your Windows drive
cd /mnt/e/git-zapier/tersa-main/solana-program
```

### Step 2: Build the Program

```bash
# Build the Solana program (SBF)
cargo bui3: Configure Solana CLI for Testnet

```bash
# Set to testnet
solana config set --url https://api.testnet.solana.com

# Verify
solana config get
```

### Step 4: Create a Keypair (Wallet)

```bash
# Generate new keypair
solana-keygen new --outfile ~/.config/solana/veriflow-deployer.json

# Or recover existing one
solana-keygen recover --outfile ~/.config/solana/veriflow-deployer.json

# Set as default
solana config set --keypair ~/.config/solana/veriflow-deployer.json

# Check your wallet address
solana address
```

### Step 5: Get Testnet SOL (Free)

```bash set --keypair ~/.config/solana/tersa-deployer.json

# Check your wallet address
solana address
```

### Step 4: Get Testnet SOL (Free)

```powershell
# Request airdrop (2 SOL)
solana airdrop 2

# Check balance
solana balance
```

If airdrop fails, use testnet faucet:
- https://faucet.solana.com/
- https://solfaucet.com/

### Step 6: Deploy the Program

```bash
# Deploy to testnet
solana program deploy target/deploy/veriflow_solana_program.so

# Output will show:
# Program Id: 7xKXt...abc123 (YOUR PROGRAM ADDRESS)
```

**SAVE THIS PROGRAM ID!** You'll need it for frontend integration.

### Step 7: Verify Deployment

```bash
# Check program info
solana program show <YOUR_PROGRAM_ID>

# Example:
solana program show 7xKXtMDL5d8zP9vN8YqTGCz3uJ2mW1hR4pQsX6vK9abc
```

---

## Frontend Integration

### Step 1: Install Dependencies (Back in Windows/PowerShell)

```powershell
# Exit WSL, go back to your main project
cd E:\git-zapier\tersa-main

pnpm add @solana/web3.js @solana/wallet-adapter-base @solana/wallet-adapter-react @solana/wallet-adapter-react-ui @solana/wallet-adapter-wallets
```

### Step 2: Create Solana Client Utility

Create file: `lib/solana/client.ts`

```typescript
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';

// Use the Program ID from deployment
export const VERIFLOW_PROGRAM_ID = new PublicKey('YOUR_PROGRAM_ID_HERE');

// Connect to testnet
export const connection = new Connection(
  clusterApiUrl('testnet'),
  'confirmed'
);

// PDA Seeds (must match Rust program)
export const ORG_SEED = 'org';
export const WORKSPACE_SEED = 'workspace';
export const VERSION_SEED = 'version';
export const EXECUTION_SEED = 'execution';
export const PR_SEED = 'pr';
```

### Step 3: Create Instruction Helpers

Create file: `lib/solana/instructions.ts`

```typescript
import {
  TransactionInstruction,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from '@solana/web3.js';
import { serialize } from 'borsh';
import { VERIFLOW_PROGRAM_ID, ORG_SEED, WORKSPACE_SEED, VERSION_SEED } from './client';

// Instruction enum matching Rust
class CommitVersionInstruction {
  instruction = 2; // CommitVersion variant
  contentHash: Uint8Array;
  message: string;

  constructor(contentHash: Uint8Array, message: string) {
    this.contentHash = contentHash;
    this.message = message;
  }
}

// Schema for borsh serialization
const commitVersionSchema = new Map([
  [CommitVersionInstruction, {
    kind: 'struct',
    fields: [
      ['instruction', 'u8'],
      ['contentHash', [32]],
      ['message', 'string'],
    ]
  }]
]);

export async function createCommitInstruction(
  workspaceId: string,
  orgPubkey: PublicKey,
  authorPubkey: PublicKey,
  contentHash: Uint8Array,
  message: string
): Promise<TransactionInstruction> {
  // Derive workspace PDA
  const [workspacePDA] = await PublicKey.findProgramAddress(
    [
      Buffer.from(WORKSPACE_SEED),
      orgPubkey.toBuffer(),
      Buffer.from(workspaceId),
    ],
    VERIFLOW_PROGRAM_ID
  );

  // Get current version (would query on-chain in real impl)
  const currentVersion = 1; // Simplified
  const newVersion = currentVersion + 1;

  // Derive version PDA
  const [versionPDA] = await PublicKey.findProgramAddress(
    [
      Buffer.from(VERSION_SEED),
      workspacePDA.toBuffer(),
      Buffer.from(new Uint8Array(new BigUint64Array([BigInt(newVersion)]).buffer)),
    ],
    VERIFLOW_PROGRAM_ID
  );

  // Serialize instruction
  const instruction = new CommitVersionInstruction(contentHash, message);
  const data = serialize(commitVersionSchema, instruction);

  return new TransactionInstruction({
    keys: [
      { pubkey: authorPubkey, isSigner: true, isWritable: true },
      { pubkey: workspacePDA, isSigner: false, isWritable: true },
      { pubkey: versionPDA, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: VERIFLOW_PROGRAM_ID,
    data: Buffer.from(data),
  });
}
```

### Step 4: Usage Example in Your App

```typescript
import { useWallet } from '@solana/wallet-adapter-react';
import { Transaction } from '@solana/web3.js';
import { connection } from '@/lib/solana/client';
import { createCommitInstruction } from '@/lib/solana/instructions';
import { sha256 } from 'crypto';

async function commitWorkflowVersion(workflowContent: any, message: string) {
  const wallet = useWallet();
  
  if (!wallet.publicKey) {
    throw new Error('Wallet not connected');
  }

  // 1. Hash the workflow content
  const contentStr = JSON.stringify(workflowContent);
  const contentHash = sha256(contentStr).digest();

  // 2. Create commit instruction
  const instruction = await createCommitInstruction(
    'workspace-123',
    orgPublicKey, // From your org setup
    wallet.publicKey,
    contentHash,
    message
  );

  // 3. Build and send transaction
  const transaction = new Transaction().add(instruction);
  const signature = await wallet.sendTransaction(transaction, connection);

  // 4. Wait for confirmation
  await connection.confirmTransaction(signature, 'confirmed');

  // 5. Save actual content to PostgreSQL
  await saveToDatabase(contentHash.toString('hex'), workflowContent);

  return signature;
}
```

---
 (in WSL)

### Check Program Balance
```bash
solana balance <PROGRAM_ID>
```

### View Program Account
```bash
solana account <PROGRAM_ID>
```

### Check Transaction
```bashnsaction
```powershell
solana confirm <TRANSACTION_SIGNATURE>
```

### View on Explorer
```
https://explorer.solana.com/address/<PROGRAM_ID>?cluster=testnet
```

---

## Troubleshooting

```bash
solana airdrop 2
```

### "Program data account not found"
Re-deploy the program:
```bash
cargo build-sbf
solana program deploy target/deploy/veriflow_solana_program.so
```

### "cargo build-sbf not found"
```bash
# Install the build tool
cargo install --git https://github.com/solana-labs/cargo-build-sbf
solana program deploy target/deploy/tersa_solana_program.so
```

### "Invalid account data for instruction"
Check that:
1. PDA derivation matches Rust code
2. Instruction serialization is correct
3. bash
# In WSL - Start local validator
solana-test-validator

# In another WSLocally (Optional)

```powershell
# Start local validator
solana-test-validator

# In another terminal, deploy to local
solana config set --url localhost
solana program deploy target/deploy/veriflow_solana_program.so
```

---

## Next Steps

1. **Deploy to testnet** following steps above
2. **Save Program ID** in your `.env.local`:
   ```
   NEXT_PUBLIC_SOLANA_PROGRAM_ID=<YOUR_PROGRAM_ID>
   NEXT_PUBLIC_SOLANA_NETWORK=testnet
   ```
3. **Integrate wallet adapter** in your Next.js app
4. **Test commit operation** from your UI
5. **Query execution logs** from blockchain

---

## Cost Estimates (Testnet is FREE!)

On mainnet (when ready):
- Deploy program: ~2-3 SOL (~$250 one-time)
- Create account: ~0.001 SOL (~$0.10)
- Transaction: ~0.000005 SOL (~$0.0005)

**Your usage:** ~$1-5/month for typical operations.
