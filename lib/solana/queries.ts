import { connection } from "@/lib/solana/config";
import { getVersionCommitPDA, getExecutionLogPDA } from "@/lib/solana/instructions";
import { PublicKey } from "@solana/web3.js";

/**
 * Version Commit structure matching Rust state.rs
 */
interface VersionCommit {
  contentHash: string;
  parentHash: string;
  author: string;
  timestamp: number;
  message: string;
}

/**
 * Execution Log structure matching Rust state.rs
 */
interface ExecutionLog {
  executor: string;
  versionHash: string;
  resultHash: string;
  timestamp: number;
  success: boolean;
}

/**
 * Fetch version commit from blockchain
 */
export async function fetchVersionCommit(
  workspaceId: string,
  versionHash: string
): Promise<VersionCommit | null> {
  try {
    const [versionCommitPDA] = getVersionCommitPDA(workspaceId, versionHash);
    const accountInfo = await connection.getAccountInfo(versionCommitPDA);

    if (!accountInfo) {
      return null;
    }

    // Parse account data (skip 8-byte discriminator)
    const data = accountInfo.data.slice(8);

    return {
      contentHash: Buffer.from(data.slice(0, 32)).toString("utf8").trim(),
      parentHash: Buffer.from(data.slice(32, 64)).toString("utf8").trim(),
      author: new PublicKey(data.slice(64, 96)).toBase58(),
      timestamp: Number(data.readBigInt64LE(96)),
      message: Buffer.from(data.slice(104, 168)).toString("utf8").trim(),
    };
  } catch (error) {
    console.error("Failed to fetch version commit:", error);
    return null;
  }
}

/**
 * Fetch execution log from blockchain
 */
export async function fetchExecutionLog(
  workspaceId: string,
  executionId: string
): Promise<ExecutionLog | null> {
  try {
    const [executionLogPDA] = getExecutionLogPDA(workspaceId, executionId);
    const accountInfo = await connection.getAccountInfo(executionLogPDA);

    if (!accountInfo) {
      return null;
    }

    // Parse account data (skip 8-byte discriminator)
    const data = accountInfo.data.slice(8);

    return {
      executor: new PublicKey(data.slice(0, 32)).toBase58(),
      versionHash: Buffer.from(data.slice(32, 64)).toString("utf8").trim(),
      resultHash: Buffer.from(data.slice(64, 96)).toString("utf8").trim(),
      timestamp: Number(data.readBigInt64LE(96)),
      success: data[104] === 1,
    };
  } catch (error) {
    console.error("Failed to fetch execution log:", error);
    return null;
  }
}

/**
 * Verify if a version commit exists on-chain
 */
export async function verifyCommitExists(
  workspaceId: string,
  versionHash: string
): Promise<boolean> {
  const commit = await fetchVersionCommit(workspaceId, versionHash);
  return commit !== null;
}

/**
 * Get commit chain (traverse parent commits)
 */
export async function getCommitChain(
  workspaceId: string,
  versionHash: string,
  maxDepth = 10
): Promise<VersionCommit[]> {
  const chain: VersionCommit[] = [];
  let currentHash = versionHash;
  let depth = 0;

  while (depth < maxDepth && currentHash && currentHash !== "0".repeat(32)) {
    const commit = await fetchVersionCommit(workspaceId, currentHash);
    if (!commit) break;

    chain.push(commit);
    currentHash = commit.parentHash;
    depth++;
  }

  return chain;
}
