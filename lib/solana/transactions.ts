import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  Transaction,
  Connection,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { createHash } from "crypto";

// Program ID from environment (required)
const programIdStr = process.env.NEXT_PUBLIC_SOLANA_PROGRAM_ID;
if (!programIdStr) {
  throw new Error("NEXT_PUBLIC_SOLANA_PROGRAM_ID environment variable is required");
}
export const VERIFLOW_PROGRAM_ID = new PublicKey(programIdStr);

// RPC URL from environment (required)
export const SOLANA_RPC = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com";

// Network cluster for explorer URLs
const SOLANA_NETWORK = process.env.NEXT_PUBLIC_SOLANA_NETWORK || "devnet";

/**
 * Convert string to bytes, truncating or padding to fit PDA seed limits
 * PDA seeds must be <= 32 bytes each
 */
function toSeedBytes(input: string): Buffer {
  const bytes = Buffer.from(input, "utf-8");
  if (bytes.length <= 32) {
    return bytes; // Use directly if short enough
  }
  // If too long, hash it (this should match what Rust does if it hashes)
  return createHash("sha256").update(input).digest().slice(0, 32);
}

/**
 * Simple Borsh-like serialization for strings
 */
function serializeString(str: string): Buffer {
  const strBytes = Buffer.from(str, "utf-8");
  const lenBuffer = Buffer.alloc(4);
  lenBuffer.writeUInt32LE(strBytes.length, 0);
  return Buffer.concat([lenBuffer, strBytes]);
}

/**
 * Get Organization PDA - matches Rust: [b"org", org_slug.as_bytes()]
 */
export function getOrganizationPDA(orgSlug: string): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("org"), toSeedBytes(orgSlug)],
    VERIFLOW_PROGRAM_ID
  );
}

/**
 * Get Workspace PDA - matches Rust: [b"workspace", org_pubkey, workspace_id.as_bytes()]
 */
export function getWorkspacePDA(orgPubkey: PublicKey, workspaceId: string): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("workspace"), orgPubkey.toBuffer(), toSeedBytes(workspaceId)],
    VERIFLOW_PROGRAM_ID
  );
}

/**
 * Get Pull Request PDA
 */
export function getPullRequestPDA(
  sourceWorkspacePubkey: PublicKey,
  targetWorkspacePubkey: PublicKey,
  prId: string
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("pr"), sourceWorkspacePubkey.toBuffer(), targetWorkspacePubkey.toBuffer(), toSeedBytes(prId)],
    VERIFLOW_PROGRAM_ID
  );
}

/**
 * Get Version Commit PDA
 */
export function getVersionCommitPDA(workspacePubkey: PublicKey, versionNumber: number): [PublicKey, number] {
  const versionBuffer = Buffer.alloc(8);
  versionBuffer.writeBigUInt64LE(BigInt(versionNumber), 0);
  return PublicKey.findProgramAddressSync(
    [Buffer.from("version"), workspacePubkey.toBuffer(), versionBuffer],
    VERIFLOW_PROGRAM_ID
  );
}

// Instruction discriminators (enum index)
enum InstructionType {
  InitializeOrganization = 0,
  InitializeWorkspace = 1,
  CommitVersion = 2,
  CreateFork = 3,
  CreatePullRequest = 4,
  ApprovePullRequest = 5,
  MergePullRequest = 6,
  RecordExecution = 7,
}

/**
 * Build InitializeOrganization instruction
 */
export function buildInitializeOrgInstruction(
  payer: PublicKey,
  orgSlug: string
): TransactionInstruction {
  const [orgPDA] = getOrganizationPDA(orgSlug);

  // Serialize: discriminator (1 byte) + org_slug (4 bytes len + string)
  const data = Buffer.concat([
    Buffer.from([InstructionType.InitializeOrganization]),
    serializeString(orgSlug),
  ]);

  return new TransactionInstruction({
    programId: VERIFLOW_PROGRAM_ID,
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: orgPDA, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

/**
 * Build InitializeWorkspace instruction
 */
export function buildInitializeWorkspaceInstruction(
  creator: PublicKey,
  orgSlug: string,
  workspaceId: string,
  workspaceName: string
): TransactionInstruction {
  const [orgPDA] = getOrganizationPDA(orgSlug);
  const [workspacePDA] = getWorkspacePDA(orgPDA, workspaceId);

  // Serialize: discriminator + workspace_id + name
  const data = Buffer.concat([
    Buffer.from([InstructionType.InitializeWorkspace]),
    serializeString(workspaceId),
    serializeString(workspaceName),
  ]);

  return new TransactionInstruction({
    programId: VERIFLOW_PROGRAM_ID,
    keys: [
      { pubkey: creator, isSigner: true, isWritable: true },
      { pubkey: workspacePDA, isSigner: false, isWritable: true },
      { pubkey: orgPDA, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

/**
 * Build CreatePullRequest instruction
 */
export function buildCreatePullRequestInstruction(
  proposer: PublicKey,
  orgSlug: string,
  sourceWorkspaceId: string,
  targetWorkspaceId: string,
  prId: string,
  title: string,
  sourceContentHash: Uint8Array,
  targetContentHash: Uint8Array
): TransactionInstruction {
  const [orgPDA] = getOrganizationPDA(orgSlug);
  const [sourceWorkspacePDA] = getWorkspacePDA(orgPDA, sourceWorkspaceId);
  const [targetWorkspacePDA] = getWorkspacePDA(orgPDA, targetWorkspaceId);
  const [prPDA] = getPullRequestPDA(sourceWorkspacePDA, targetWorkspacePDA, prId);

  // Serialize: discriminator + title + source_hash (32) + target_hash (32)
  const data = Buffer.concat([
    Buffer.from([InstructionType.CreatePullRequest]),
    serializeString(title),
    Buffer.from(sourceContentHash),
    Buffer.from(targetContentHash),
  ]);

  return new TransactionInstruction({
    programId: VERIFLOW_PROGRAM_ID,
    keys: [
      { pubkey: proposer, isSigner: true, isWritable: true },
      { pubkey: sourceWorkspacePDA, isSigner: false, isWritable: false },
      { pubkey: targetWorkspacePDA, isSigner: false, isWritable: false },
      { pubkey: prPDA, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

/**
 * Build ApprovePullRequest instruction
 */
export function buildApprovePullRequestInstruction(
  reviewer: PublicKey,
  orgSlug: string,
  sourceWorkspaceId: string,
  targetWorkspaceId: string,
  prId: string
): TransactionInstruction {
  const [orgPDA] = getOrganizationPDA(orgSlug);
  const [sourceWorkspacePDA] = getWorkspacePDA(orgPDA, sourceWorkspaceId);
  const [targetWorkspacePDA] = getWorkspacePDA(orgPDA, targetWorkspaceId);
  const [prPDA] = getPullRequestPDA(sourceWorkspacePDA, targetWorkspacePDA, prId);

  const data = Buffer.from([InstructionType.ApprovePullRequest]);

  return new TransactionInstruction({
    programId: VERIFLOW_PROGRAM_ID,
    keys: [
      { pubkey: reviewer, isSigner: true, isWritable: false },
      { pubkey: prPDA, isSigner: false, isWritable: true },
      { pubkey: orgPDA, isSigner: false, isWritable: false },
    ],
    data,
  });
}

/**
 * Build MergePullRequest instruction
 */
export function buildMergePullRequestInstruction(
  merger: PublicKey,
  orgSlug: string,
  sourceWorkspaceId: string,
  targetWorkspaceId: string,
  prId: string,
  mergeCommitHash: Uint8Array,
  message: string,
  newVersionNumber: number
): TransactionInstruction {
  const [orgPDA] = getOrganizationPDA(orgSlug);
  const [sourceWorkspacePDA] = getWorkspacePDA(orgPDA, sourceWorkspaceId);
  const [targetWorkspacePDA] = getWorkspacePDA(orgPDA, targetWorkspaceId);
  const [prPDA] = getPullRequestPDA(sourceWorkspacePDA, targetWorkspacePDA, prId);
  const [versionCommitPDA] = getVersionCommitPDA(targetWorkspacePDA, newVersionNumber);

  // Serialize: discriminator + merge_commit_hash (32) + message
  const data = Buffer.concat([
    Buffer.from([InstructionType.MergePullRequest]),
    Buffer.from(mergeCommitHash),
    serializeString(message.slice(0, 64)), // Max 64 chars
  ]);

  return new TransactionInstruction({
    programId: VERIFLOW_PROGRAM_ID,
    keys: [
      { pubkey: merger, isSigner: true, isWritable: true },
      { pubkey: prPDA, isSigner: false, isWritable: true },
      { pubkey: targetWorkspacePDA, isSigner: false, isWritable: true },
      { pubkey: versionCommitPDA, isSigner: false, isWritable: true },
      { pubkey: orgPDA, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

/**
 * Helper to hash content to 32 bytes
 */
export function hashContent(content: string): Uint8Array {
  return createHash("sha256").update(content).digest();
}

/**
 * Execute a transaction with Phantom on TESTNET
 * 
 * NOTE: Phantom UI may show "Solana" (mainnet) but the transaction
 * actually goes to testnet because we send it to testnet RPC ourselves.
 */
export async function executeWithPhantom(
  instruction: TransactionInstruction,
  description: string
): Promise<{ signature: string; explorerUrl: string }> {
  const phantom = (window as any).phantom?.solana;
  
  if (!phantom) {
    throw new Error("Phantom wallet not found");
  }

  // Connect to Phantom
  const { publicKey } = await phantom.connect();
  
  // Create connection to Solana network
  const connection = new Connection(SOLANA_RPC, "confirmed");
  
  // Get blockhash
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
  
  // Build transaction
  const transaction = new Transaction().add(instruction);
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = publicKey;
  
  // Sign with Phantom (just signing, not sending)
  const signedTx = await phantom.signTransaction(transaction);
  
  // Send to network ourselves (not through Phantom)
  const rawTx = signedTx.serialize();
  const signature = await connection.sendRawTransaction(rawTx, {
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });
  
  // Wait for confirmation
  await connection.confirmTransaction({
    signature,
    blockhash,
    lastValidBlockHeight,
  }, "confirmed");
  
  console.log(`Transaction confirmed on ${SOLANA_NETWORK}: ${signature}`);
  
  return {
    signature,
    explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=${SOLANA_NETWORK}`,
  };
}
