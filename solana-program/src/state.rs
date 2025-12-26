use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::pubkey::Pubkey;

// PDA Seeds
pub const ORG_SEED: &[u8] = b"org";
pub const WORKSPACE_SEED: &[u8] = b"workspace";
pub const VERSION_SEED: &[u8] = b"version";
pub const PR_SEED: &[u8] = b"pr";
pub const EXECUTION_SEED: &[u8] = b"execution";

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct Organization {
    pub is_initialized: bool,
    pub owner: Pubkey,
    pub created_at: i64,
    pub workspace_count: u64,
}

impl Organization {
    pub const LEN: usize = 1 + 32 + 8 + 8; // bool + pubkey + i64 + u64
}

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct Workspace {
    pub is_initialized: bool,
    pub organization: Pubkey,
    pub creator: Pubkey,
    pub current_version: u64,
    pub current_state_root: [u8; 32], // Merkle root of version history
    pub parent_workspace: Option<Pubkey>, // None for main, Some for forks
    pub fork_at_version: Option<u64>,
    pub created_at: i64,
}

impl Workspace {
    pub const LEN: usize = 1 + 32 + 32 + 8 + 32 + (1 + 32) + (1 + 8) + 8;
}

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct VersionCommit {
    pub is_initialized: bool,
    pub workspace: Pubkey,
    pub version_number: u64,
    pub content_hash: [u8; 32],
    pub parent_hash: [u8; 32], // Hash of previous version (forms chain)
    pub author: Pubkey,
    pub timestamp: i64,
    pub message: String, // Max 64 chars to keep size reasonable
}

impl VersionCommit {
    pub const MAX_MESSAGE_LEN: usize = 64;
    pub const LEN: usize = 1 + 32 + 8 + 32 + 32 + 32 + 8 + 4 + Self::MAX_MESSAGE_LEN;
}

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone, PartialEq)]
pub enum PRStatus {
    Open,
    Approved,
    Merged,
    Rejected,
}

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct PullRequest {
    pub is_initialized: bool,
    pub source_workspace: Pubkey,
    pub target_workspace: Pubkey,
    pub source_version_hash: [u8; 32],
    pub target_version_hash: [u8; 32],
    pub proposer: Pubkey,
    pub reviewer: Option<Pubkey>,
    pub status: PRStatus,
    pub created_at: i64,
    pub reviewed_at: Option<i64>,
}

impl PullRequest {
    pub const LEN: usize = 1 + 32 + 32 + 32 + 32 + 32 + (1 + 32) + 1 + 8 + (1 + 8);
}

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct ExecutionLog {
    pub is_initialized: bool,
    pub workspace: Pubkey,
    pub executor: Pubkey,
    pub version_hash: [u8; 32],
    pub result_hash: [u8; 32],
    pub timestamp: i64,
}

impl ExecutionLog {
    pub const LEN: usize = 1 + 32 + 32 + 32 + 32 + 8;
}
