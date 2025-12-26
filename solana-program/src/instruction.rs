use borsh::{BorshDeserialize, BorshSerialize};

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub enum VeriflowInstruction {
    /// Initialize a new organization
    /// Accounts:
    /// 0. [writable, signer] Payer
    /// 1. [writable] Organization PDA
    /// 2. [] System program
    InitializeOrganization {
        org_slug: String,
    },

    /// Initialize a new workspace
    /// Accounts:
    /// 0. [writable, signer] Creator (must be org owner/reviewer)
    /// 1. [writable] Workspace PDA
    /// 2. [] Organization PDA
    /// 3. [] System program
    InitializeWorkspace {
        workspace_id: String,
        name: String,
    },

    /// Commit a new version
    /// Accounts:
    /// 0. [signer] Author
    /// 1. [writable] Workspace PDA
    /// 2. [writable] Version Commit PDA
    /// 3. [] System program
    CommitVersion {
        content_hash: [u8; 32],
        message: String,
    },

    /// Create a fork
    /// Accounts:
    /// 0. [signer] Creator
    /// 1. [] Parent Workspace PDA
    /// 2. [writable] Fork Workspace PDA
    /// 3. [] Organization PDA
    /// 4. [] System program
    CreateFork {
        fork_workspace_id: String,
        fork_at_version: u64,
        name: String,
    },

    /// Create a pull request
    /// Accounts:
    /// 0. [signer] Proposer
    /// 1. [] Source Workspace PDA
    /// 2. [] Target Workspace PDA
    /// 3. [writable] Pull Request PDA
    /// 4. [] System program
    CreatePullRequest {
        title: String,
        source_version_hash: [u8; 32],
        target_version_hash: [u8; 32],
    },

    /// Approve a pull request
    /// Accounts:
    /// 0. [signer] Reviewer
    /// 1. [writable] Pull Request PDA
    /// 2. [] Organization PDA
    ApprovePullRequest,

    /// Merge a pull request
    /// Accounts:
    /// 0. [signer] Merger (owner/reviewer)
    /// 1. [writable] Pull Request PDA
    /// 2. [writable] Target Workspace PDA
    /// 3. [writable] New Version Commit PDA
    /// 4. [] Organization PDA
    /// 5. [] System program
    MergePullRequest {
        merge_commit_hash: [u8; 32],
        message: String,
    },

    /// Record a workflow execution
    /// Accounts:
    /// 0. [signer] Executor
    /// 1. [] Workspace PDA
    /// 2. [writable] Execution Log PDA
    /// 3. [] System program
    RecordExecution {
        version_hash: [u8; 32],
        result_hash: [u8; 32],
    },
}
