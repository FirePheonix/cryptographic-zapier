import { clusterApiUrl, Connection, PublicKey } from "@solana/web3.js";

/**
 * Veriflow Solana Program Configuration
 * 
 * Program deployed on Solana Testnet
 * Deploy Platform: Solana Playground
 */

// Veriflow Program ID (deployed on Solana Testnet)
export const VERIFLOW_PROGRAM_ID = new PublicKey(
  "DK8HgataLhZCqcY1hq6GaCXxzeNHESwSFcQazTYs8USG"
);

// Network configuration - FORCE TESTNET
export const NETWORK = "testnet";

// RPC endpoint - FORCE TESTNET
export const RPC_ENDPOINT = "https://api.testnet.solana.com";

// Connection instance
export const connection = new Connection(RPC_ENDPOINT, "confirmed");

// Account sizes (in bytes) - must match Rust state.rs
export const ACCOUNT_SIZES = {
  ORGANIZATION: 49,
  WORKSPACE: 154,
  VERSION_COMMIT: 209,
  PULL_REQUEST: 242,
  EXECUTION_LOG: 137,
} as const;

// Instruction discriminators (0-7 matching processor.rs)
export enum VeriflowInstruction {
  InitializeOrganization = 0,
  CreateWorkspace = 1,
  CommitVersion = 2,
  CreateFork = 3,
  CreatePullRequest = 4,
  MergePullRequest = 5,
  RecordExecution = 6,
  UpdateWorkspaceState = 7,
}
