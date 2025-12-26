use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    msg,
    program::invoke_signed,
    program_error::ProgramError,
    pubkey::Pubkey,
    rent::Rent,
    system_instruction,
    sysvar::{clock::Clock, Sysvar},
};

use crate::{
    error::VeriflowError,
    instruction::VeriflowInstruction,
    state::*,
};

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let instruction = VeriflowInstruction::try_from_slice(instruction_data)
        .map_err(|_| VeriflowError::InvalidInstruction)?;

    match instruction {
        VeriflowInstruction::InitializeOrganization { org_slug } => {
            process_initialize_organization(program_id, accounts, org_slug)
        }
        VeriflowInstruction::InitializeWorkspace { workspace_id, name } => {
            process_initialize_workspace(program_id, accounts, workspace_id, name)
        }
        VeriflowInstruction::CommitVersion { content_hash, message } => {
            process_commit_version(program_id, accounts, content_hash, message)
        }
        VeriflowInstruction::CreateFork { fork_workspace_id, fork_at_version, name } => {
            process_create_fork(program_id, accounts, fork_workspace_id, fork_at_version, name)
        }
        VeriflowInstruction::CreatePullRequest { title, source_version_hash, target_version_hash } => {
            process_create_pull_request(program_id, accounts, title, source_version_hash, target_version_hash)
        }
        VeriflowInstruction::ApprovePullRequest => {
            process_approve_pull_request(program_id, accounts)
        }
        VeriflowInstruction::MergePullRequest { merge_commit_hash, message } => {
            process_merge_pull_request(program_id, accounts, merge_commit_hash, message)
        }
        VeriflowInstruction::RecordExecution { version_hash, result_hash } => {
            process_record_execution(program_id, accounts, version_hash, result_hash)
        }
    }
}

fn process_initialize_organization(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    org_slug: String,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let payer = next_account_info(account_info_iter)?;
    let org_account = next_account_info(account_info_iter)?;
    let system_program = next_account_info(account_info_iter)?;

    if !payer.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    // Derive PDA
    let (org_pda, bump) = Pubkey::find_program_address(
        &[ORG_SEED, org_slug.as_bytes()],
        program_id,
    );

    if org_pda != *org_account.key {
        return Err(ProgramError::InvalidSeeds);
    }

    // Create account
    let rent = Rent::get()?;
    let space = Organization::LEN;
    let lamports = rent.minimum_balance(space);

    invoke_signed(
        &system_instruction::create_account(
            payer.key,
            org_account.key,
            lamports,
            space as u64,
            program_id,
        ),
        &[payer.clone(), org_account.clone(), system_program.clone()],
        &[&[ORG_SEED, org_slug.as_bytes(), &[bump]]],
    )?;

    // Initialize data
    let clock = Clock::get()?;
    let org = Organization {
        is_initialized: true,
        owner: *payer.key,
        created_at: clock.unix_timestamp,
        workspace_count: 0,
    };

    org.serialize(&mut *org_account.data.borrow_mut())?;

    msg!("Organization initialized: {}", org_slug);
    Ok(())
}

fn process_initialize_workspace(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    workspace_id: String,
    _name: String,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let creator = next_account_info(account_info_iter)?;
    let workspace_account = next_account_info(account_info_iter)?;
    let org_account = next_account_info(account_info_iter)?;
    let system_program = next_account_info(account_info_iter)?;

    if !creator.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    // Verify organization exists
    let org = Organization::try_from_slice(&org_account.data.borrow())?;
    if !org.is_initialized {
        return Err(VeriflowError::InvalidWorkspaceState.into());
    }

    // Verify creator is org owner (simplified - would check roles in production)
    if org.owner != *creator.key {
        return Err(VeriflowError::NotAuthorized.into());
    }

    // Derive PDA
    let (workspace_pda, bump) = Pubkey::find_program_address(
        &[WORKSPACE_SEED, org_account.key.as_ref(), workspace_id.as_bytes()],
        program_id,
    );

    if workspace_pda != *workspace_account.key {
        return Err(ProgramError::InvalidSeeds);
    }

    // Create account
    let rent = Rent::get()?;
    let space = Workspace::LEN;
    let lamports = rent.minimum_balance(space);

    invoke_signed(
        &system_instruction::create_account(
            creator.key,
            workspace_account.key,
            lamports,
            space as u64,
            program_id,
        ),
        &[creator.clone(), workspace_account.clone(), system_program.clone()],
        &[&[WORKSPACE_SEED, org_account.key.as_ref(), workspace_id.as_bytes(), &[bump]]],
    )?;

    // Initialize data
    let clock = Clock::get()?;
    let workspace = Workspace {
        is_initialized: true,
        organization: *org_account.key,
        creator: *creator.key,
        current_version: 0,
        current_state_root: [0; 32],
        parent_workspace: None,
        fork_at_version: None,
        created_at: clock.unix_timestamp,
    };

    workspace.serialize(&mut *workspace_account.data.borrow_mut())?;

    msg!("Workspace initialized: {}", workspace_id);
    Ok(())
}

fn process_commit_version(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    content_hash: [u8; 32],
    message: String,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let author = next_account_info(account_info_iter)?;
    let workspace_account = next_account_info(account_info_iter)?;
    let version_account = next_account_info(account_info_iter)?;
    let system_program = next_account_info(account_info_iter)?;

    if !author.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    // Load workspace
    let mut workspace = Workspace::try_from_slice(&workspace_account.data.borrow())?;
    if !workspace.is_initialized {
        return Err(VeriflowError::InvalidWorkspaceState.into());
    }

    // Increment version
    workspace.current_version += 1;
    let new_version = workspace.current_version;

    // Derive version PDA
    let (version_pda, bump) = Pubkey::find_program_address(
        &[VERSION_SEED, workspace_account.key.as_ref(), &new_version.to_le_bytes()],
        program_id,
    );

    if version_pda != *version_account.key {
        return Err(ProgramError::InvalidSeeds);
    }

    // Create version account
    let rent = Rent::get()?;
    let space = VersionCommit::LEN;
    let lamports = rent.minimum_balance(space);

    invoke_signed(
        &system_instruction::create_account(
            author.key,
            version_account.key,
            lamports,
            space as u64,
            program_id,
        ),
        &[author.clone(), version_account.clone(), system_program.clone()],
        &[&[VERSION_SEED, workspace_account.key.as_ref(), &new_version.to_le_bytes(), &[bump]]],
    )?;

    // Create version commit
    let clock = Clock::get()?;
    let version_commit = VersionCommit {
        is_initialized: true,
        workspace: *workspace_account.key,
        version_number: new_version,
        content_hash,
        parent_hash: workspace.current_state_root,
        author: *author.key,
        timestamp: clock.unix_timestamp,
        message: message.chars().take(VersionCommit::MAX_MESSAGE_LEN).collect(),
    };

    version_commit.serialize(&mut *version_account.data.borrow_mut())?;

    // Update workspace state root (chain versions together)
    workspace.current_state_root = content_hash;
    workspace.serialize(&mut *workspace_account.data.borrow_mut())?;

    msg!("Version committed: {} - Hash: {:?}", new_version, content_hash);
    Ok(())
}

fn process_create_fork(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    fork_workspace_id: String,
    fork_at_version: u64,
    _name: String,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let creator = next_account_info(account_info_iter)?;
    let parent_workspace_account = next_account_info(account_info_iter)?;
    let fork_workspace_account = next_account_info(account_info_iter)?;
    let org_account = next_account_info(account_info_iter)?;
    let system_program = next_account_info(account_info_iter)?;

    if !creator.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    // Load parent workspace
    let parent_workspace = Workspace::try_from_slice(&parent_workspace_account.data.borrow())?;
    if !parent_workspace.is_initialized {
        return Err(VeriflowError::InvalidWorkspaceState.into());
    }

    // Verify fork version exists
    if fork_at_version > parent_workspace.current_version {
        return Err(VeriflowError::InvalidVersion.into());
    }

    // Derive fork PDA
    let (fork_pda, bump) = Pubkey::find_program_address(
        &[WORKSPACE_SEED, org_account.key.as_ref(), fork_workspace_id.as_bytes()],
        program_id,
    );

    if fork_pda != *fork_workspace_account.key {
        return Err(ProgramError::InvalidSeeds);
    }

    // Create fork account
    let rent = Rent::get()?;
    let space = Workspace::LEN;
    let lamports = rent.minimum_balance(space);

    invoke_signed(
        &system_instruction::create_account(
            creator.key,
            fork_workspace_account.key,
            lamports,
            space as u64,
            program_id,
        ),
        &[creator.clone(), fork_workspace_account.clone(), system_program.clone()],
        &[&[WORKSPACE_SEED, org_account.key.as_ref(), fork_workspace_id.as_bytes(), &[bump]]],
    )?;

    // Initialize fork
    let clock = Clock::get()?;
    let fork_workspace = Workspace {
        is_initialized: true,
        organization: parent_workspace.organization,
        creator: *creator.key,
        current_version: fork_at_version,
        current_state_root: parent_workspace.current_state_root,
        parent_workspace: Some(*parent_workspace_account.key),
        fork_at_version: Some(fork_at_version),
        created_at: clock.unix_timestamp,
    };

    fork_workspace.serialize(&mut *fork_workspace_account.data.borrow_mut())?;

    msg!("Fork created from version {}", fork_at_version);
    Ok(())
}

fn process_create_pull_request(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    _title: String,
    source_version_hash: [u8; 32],
    target_version_hash: [u8; 32],
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let proposer = next_account_info(account_info_iter)?;
    let source_workspace_account = next_account_info(account_info_iter)?;
    let target_workspace_account = next_account_info(account_info_iter)?;
    let pr_account = next_account_info(account_info_iter)?;
    let system_program = next_account_info(account_info_iter)?;

    if !proposer.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    // Verify workspaces
    let source_workspace = Workspace::try_from_slice(&source_workspace_account.data.borrow())?;
    let target_workspace = Workspace::try_from_slice(&target_workspace_account.data.borrow())?;

    if !source_workspace.is_initialized || !target_workspace.is_initialized {
        return Err(VeriflowError::InvalidWorkspaceState.into());
    }

    // Derive PR PDA (using both workspace keys as seed)
    let (pr_pda, bump) = Pubkey::find_program_address(
        &[PR_SEED, source_workspace_account.key.as_ref(), target_workspace_account.key.as_ref()],
        program_id,
    );

    if pr_pda != *pr_account.key {
        return Err(ProgramError::InvalidSeeds);
    }

    // Create PR account
    let rent = Rent::get()?;
    let space = PullRequest::LEN;
    let lamports = rent.minimum_balance(space);

    invoke_signed(
        &system_instruction::create_account(
            proposer.key,
            pr_account.key,
            lamports,
            space as u64,
            program_id,
        ),
        &[proposer.clone(), pr_account.clone(), system_program.clone()],
        &[&[PR_SEED, source_workspace_account.key.as_ref(), target_workspace_account.key.as_ref(), &[bump]]],
    )?;

    // Initialize PR
    let clock = Clock::get()?;
    let pr = PullRequest {
        is_initialized: true,
        source_workspace: *source_workspace_account.key,
        target_workspace: *target_workspace_account.key,
        source_version_hash,
        target_version_hash,
        proposer: *proposer.key,
        reviewer: None,
        status: PRStatus::Open,
        created_at: clock.unix_timestamp,
        reviewed_at: None,
    };

    pr.serialize(&mut *pr_account.data.borrow_mut())?;

    msg!("Pull request created");
    Ok(())
}

fn process_approve_pull_request(
    _program_id: &Pubkey,
    accounts: &[AccountInfo],
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let reviewer = next_account_info(account_info_iter)?;
    let pr_account = next_account_info(account_info_iter)?;
    let _org_account = next_account_info(account_info_iter)?;

    if !reviewer.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    // Load PR
    let mut pr = PullRequest::try_from_slice(&pr_account.data.borrow())?;
    if !pr.is_initialized {
        return Err(VeriflowError::InvalidPRState.into());
    }

    if pr.status != PRStatus::Open {
        return Err(VeriflowError::InvalidPRState.into());
    }

    // Update PR
    let clock = Clock::get()?;
    pr.status = PRStatus::Approved;
    pr.reviewer = Some(*reviewer.key);
    pr.reviewed_at = Some(clock.unix_timestamp);

    pr.serialize(&mut *pr_account.data.borrow_mut())?;

    msg!("Pull request approved");
    Ok(())
}

fn process_merge_pull_request(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    merge_commit_hash: [u8; 32],
    message: String,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let merger = next_account_info(account_info_iter)?;
    let pr_account = next_account_info(account_info_iter)?;
    let target_workspace_account = next_account_info(account_info_iter)?;
    let version_account = next_account_info(account_info_iter)?;
    let _org_account = next_account_info(account_info_iter)?;
    let system_program = next_account_info(account_info_iter)?;

    if !merger.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    // Load PR
    let mut pr = PullRequest::try_from_slice(&pr_account.data.borrow())?;
    if !pr.is_initialized {
        return Err(VeriflowError::InvalidPRState.into());
    }

    if pr.status != PRStatus::Approved {
        return Err(VeriflowError::PRNotApproved.into());
    }

    // Load target workspace
    let mut workspace = Workspace::try_from_slice(&target_workspace_account.data.borrow())?;
    if !workspace.is_initialized {
        return Err(VeriflowError::InvalidWorkspaceState.into());
    }

    // Create merge commit (similar to commit_version)
    workspace.current_version += 1;
    let new_version = workspace.current_version;

    let (version_pda, bump) = Pubkey::find_program_address(
        &[VERSION_SEED, target_workspace_account.key.as_ref(), &new_version.to_le_bytes()],
        program_id,
    );

    if version_pda != *version_account.key {
        return Err(ProgramError::InvalidSeeds);
    }

    let rent = Rent::get()?;
    let space = VersionCommit::LEN;
    let lamports = rent.minimum_balance(space);

    invoke_signed(
        &system_instruction::create_account(
            merger.key,
            version_account.key,
            lamports,
            space as u64,
            program_id,
        ),
        &[merger.clone(), version_account.clone(), system_program.clone()],
        &[&[VERSION_SEED, target_workspace_account.key.as_ref(), &new_version.to_le_bytes(), &[bump]]],
    )?;

    let clock = Clock::get()?;
    let version_commit = VersionCommit {
        is_initialized: true,
        workspace: *target_workspace_account.key,
        version_number: new_version,
        content_hash: merge_commit_hash,
        parent_hash: workspace.current_state_root,
        author: *merger.key,
        timestamp: clock.unix_timestamp,
        message: message.chars().take(VersionCommit::MAX_MESSAGE_LEN).collect(),
    };

    version_commit.serialize(&mut *version_account.data.borrow_mut())?;

    // Update workspace
    workspace.current_state_root = merge_commit_hash;
    workspace.serialize(&mut *target_workspace_account.data.borrow_mut())?;

    // Update PR status
    pr.status = PRStatus::Merged;
    pr.serialize(&mut *pr_account.data.borrow_mut())?;

    msg!("Pull request merged");
    Ok(())
}

fn process_record_execution(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    version_hash: [u8; 32],
    result_hash: [u8; 32],
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let executor = next_account_info(account_info_iter)?;
    let workspace_account = next_account_info(account_info_iter)?;
    let execution_account = next_account_info(account_info_iter)?;
    let system_program = next_account_info(account_info_iter)?;

    if !executor.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    // Verify workspace
    let workspace = Workspace::try_from_slice(&workspace_account.data.borrow())?;
    if !workspace.is_initialized {
        return Err(VeriflowError::InvalidWorkspaceState.into());
    }

    // Use timestamp as unique execution ID
    let clock = Clock::get()?;
    let execution_id = clock.unix_timestamp as u64;

    // Derive execution PDA
    let (execution_pda, bump) = Pubkey::find_program_address(
        &[EXECUTION_SEED, workspace_account.key.as_ref(), &execution_id.to_le_bytes()],
        program_id,
    );

    if execution_pda != *execution_account.key {
        return Err(ProgramError::InvalidSeeds);
    }

    // Create execution log account
    let rent = Rent::get()?;
    let space = ExecutionLog::LEN;
    let lamports = rent.minimum_balance(space);

    invoke_signed(
        &system_instruction::create_account(
            executor.key,
            execution_account.key,
            lamports,
            space as u64,
            program_id,
        ),
        &[executor.clone(), execution_account.clone(), system_program.clone()],
        &[&[EXECUTION_SEED, workspace_account.key.as_ref(), &execution_id.to_le_bytes(), &[bump]]],
    )?;

    // Record execution
    let execution_log = ExecutionLog {
        is_initialized: true,
        workspace: *workspace_account.key,
        executor: *executor.key,
        version_hash,
        result_hash,
        timestamp: clock.unix_timestamp,
    };

    execution_log.serialize(&mut *execution_account.data.borrow_mut())?;

    msg!("Execution recorded - Version: {:?}", version_hash);
    Ok(())
}
