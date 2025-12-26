import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import { VERIFLOW_PROGRAM_ID, VeriflowInstruction } from "./config";
import { createHash } from "crypto";

/**
 * Hash a string to fit within Solana's 32-byte seed limit
 */
function hashSeed(input: string): Buffer {
  return createHash("sha256").update(input).digest().slice(0, 32);
}

/**
 * Derive Program Derived Address (PDA) for an account
 */
export function derivePDA(
  seeds: (Buffer | Uint8Array)[],
  programId: PublicKey = VERIFLOW_PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(seeds, programId);
}

/**
 * Get Organization PDA
 */
export function getOrganizationPDA(orgId: string): [PublicKey, number] {
  return derivePDA([Buffer.from("org"), hashSeed(orgId)]);
}

/**
 * Get Workspace PDA
 */
export function getWorkspacePDA(
  orgId: string,
  workspaceId: string
): [PublicKey, number] {
  return derivePDA([
    Buffer.from("ws"),
    hashSeed(orgId + workspaceId),
  ]);
}

/**
 * Get Version Commit PDA
 */
export function getVersionCommitPDA(
  workspaceId: string,
  versionHash: string
): [PublicKey, number] {
  return derivePDA([
    Buffer.from("ver"),
    hashSeed(workspaceId + versionHash),
  ]);
}

/**
 * Get Pull Request PDA
 */
export function getPullRequestPDA(
  sourceWorkspaceId: string,
  targetWorkspaceId: string,
  prId: string
): [PublicKey, number] {
  return derivePDA([
    Buffer.from("pr"),
    hashSeed(sourceWorkspaceId + targetWorkspaceId + prId),
  ]);
}

/**
 * Get Execution Log PDA
 */
export function getExecutionLogPDA(
  workspaceId: string,
  executionId: string
): [PublicKey, number] {
  return derivePDA([
    Buffer.from("exec"),
    hashSeed(workspaceId + executionId),
  ]);
}

/**
 * Create Initialize Organization instruction
 */
export function createInitializeOrganizationInstruction(
  owner: PublicKey,
  orgId: string
): TransactionInstruction {
  const [organizationPDA] = getOrganizationPDA(orgId);

  const data = Buffer.from([VeriflowInstruction.InitializeOrganization]);

  return new TransactionInstruction({
    keys: [
      { pubkey: organizationPDA, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: VERIFLOW_PROGRAM_ID,
    data,
  });
}

/**
 * Create Workspace instruction
 */
export function createWorkspaceInstruction(
  owner: PublicKey,
  orgId: string,
  workspaceId: string,
  parentWorkspaceId?: string
): TransactionInstruction {
  const [organizationPDA] = getOrganizationPDA(orgId);
  const [workspacePDA] = getWorkspacePDA(orgId, workspaceId);

  const keys = [
    { pubkey: workspacePDA, isSigner: false, isWritable: true },
    { pubkey: organizationPDA, isSigner: false, isWritable: true },
    { pubkey: owner, isSigner: true, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];

  // Add parent workspace if forking
  if (parentWorkspaceId) {
    const [parentWorkspacePDA] = getWorkspacePDA(orgId, parentWorkspaceId);
    keys.push({ pubkey: parentWorkspacePDA, isSigner: false, isWritable: false });
  }

  const data = Buffer.from([VeriflowInstruction.CreateWorkspace]);

  return new TransactionInstruction({
    keys,
    programId: VERIFLOW_PROGRAM_ID,
    data,
  });
}

/**
 * Create Commit Version instruction
 */
export function createCommitVersionInstruction(
  signer: PublicKey,
  orgId: string,
  workspaceId: string,
  versionHash: string,
  contentHash: string,
  parentHash: string,
  message: string
): TransactionInstruction {
  const [workspacePDA] = getWorkspacePDA(orgId, workspaceId);
  const [versionCommitPDA] = getVersionCommitPDA(workspaceId, versionHash);

  // Encode instruction data
  const instructionData = Buffer.concat([
    Buffer.from([VeriflowInstruction.CommitVersion]),
    Buffer.from(versionHash.padEnd(32, "\0")),
    Buffer.from(contentHash.padEnd(32, "\0")),
    Buffer.from(parentHash.padEnd(32, "\0")),
    Buffer.from(message.padEnd(64, "\0")),
  ]);

  return new TransactionInstruction({
    keys: [
      { pubkey: versionCommitPDA, isSigner: false, isWritable: true },
      { pubkey: workspacePDA, isSigner: false, isWritable: true },
      { pubkey: signer, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: VERIFLOW_PROGRAM_ID,
    data: instructionData,
  });
}

/**
 * Create Fork instruction
 */
export function createForkInstruction(
  owner: PublicKey,
  orgId: string,
  sourceWorkspaceId: string,
  newWorkspaceId: string
): TransactionInstruction {
  const [sourceWorkspacePDA] = getWorkspacePDA(orgId, sourceWorkspaceId);
  const [newWorkspacePDA] = getWorkspacePDA(orgId, newWorkspaceId);
  const [organizationPDA] = getOrganizationPDA(orgId);

  const data = Buffer.from([VeriflowInstruction.CreateFork]);

  return new TransactionInstruction({
    keys: [
      { pubkey: newWorkspacePDA, isSigner: false, isWritable: true },
      { pubkey: sourceWorkspacePDA, isSigner: false, isWritable: false },
      { pubkey: organizationPDA, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: VERIFLOW_PROGRAM_ID,
    data,
  });
}

/**
 * Create Pull Request instruction
 */
export function createPullRequestInstruction(
  creator: PublicKey,
  orgId: string,
  sourceWorkspaceId: string,
  targetWorkspaceId: string,
  prId: string,
  sourceHash: string,
  targetHash: string,
  title: string
): TransactionInstruction {
  const [prPDA] = getPullRequestPDA(sourceWorkspaceId, targetWorkspaceId, prId);
  const [sourceWorkspacePDA] = getWorkspacePDA(orgId, sourceWorkspaceId);
  const [targetWorkspacePDA] = getWorkspacePDA(orgId, targetWorkspaceId);

  const instructionData = Buffer.concat([
    Buffer.from([VeriflowInstruction.CreatePullRequest]),
    Buffer.from(sourceHash.padEnd(32, "\0")),
    Buffer.from(targetHash.padEnd(32, "\0")),
    Buffer.from(title.padEnd(64, "\0")),
  ]);

  return new TransactionInstruction({
    keys: [
      { pubkey: prPDA, isSigner: false, isWritable: true },
      { pubkey: sourceWorkspacePDA, isSigner: false, isWritable: false },
      { pubkey: targetWorkspacePDA, isSigner: false, isWritable: false },
      { pubkey: creator, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: VERIFLOW_PROGRAM_ID,
    data: instructionData,
  });
}

/**
 * Create Merge Pull Request instruction
 */
export function createMergePullRequestInstruction(
  merger: PublicKey,
  orgId: string,
  sourceWorkspaceId: string,
  targetWorkspaceId: string,
  prId: string
): TransactionInstruction {
  const [prPDA] = getPullRequestPDA(sourceWorkspaceId, targetWorkspaceId, prId);
  const [targetWorkspacePDA] = getWorkspacePDA(orgId, targetWorkspaceId);

  const data = Buffer.from([VeriflowInstruction.MergePullRequest]);

  return new TransactionInstruction({
    keys: [
      { pubkey: prPDA, isSigner: false, isWritable: true },
      { pubkey: targetWorkspacePDA, isSigner: false, isWritable: true },
      { pubkey: merger, isSigner: true, isWritable: false },
    ],
    programId: VERIFLOW_PROGRAM_ID,
    data,
  });
}

/**
 * Create Record Execution instruction
 */
export function createRecordExecutionInstruction(
  executor: PublicKey,
  orgId: string,
  workspaceId: string,
  executionId: string,
  versionHash: string,
  resultHash: string
): TransactionInstruction {
  const [executionLogPDA] = getExecutionLogPDA(workspaceId, executionId);
  const [workspacePDA] = getWorkspacePDA(orgId, workspaceId);

  const instructionData = Buffer.concat([
    Buffer.from([VeriflowInstruction.RecordExecution]),
    Buffer.from(versionHash.padEnd(32, "\0")),
    Buffer.from(resultHash.padEnd(32, "\0")),
  ]);

  return new TransactionInstruction({
    keys: [
      { pubkey: executionLogPDA, isSigner: false, isWritable: true },
      { pubkey: workspacePDA, isSigner: false, isWritable: false },
      { pubkey: executor, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: VERIFLOW_PROGRAM_ID,
    data: instructionData,
  });
}
