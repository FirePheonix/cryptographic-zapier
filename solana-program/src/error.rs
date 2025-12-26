use solana_program::program_error::ProgramError;
use thiserror::Error;

#[derive(Error, Debug, Copy, Clone)]
pub enum VeriflowError {
    #[error("Invalid instruction")]
    InvalidInstruction,

    #[error("Not authorized")]
    NotAuthorized,

    #[error("Already initialized")]
    AlreadyInitialized,

    #[error("Invalid workspace state")]
    InvalidWorkspaceState,

    #[error("Invalid version")]
    InvalidVersion,

    #[error("Invalid hash")]
    InvalidHash,

    #[error("PR not approved")]
    PRNotApproved,

    #[error("Invalid PR state")]
    InvalidPRState,
}

impl From<VeriflowError> for ProgramError {
    fn from(e: VeriflowError) -> Self {
        ProgramError::Custom(e as u32)
    }
}
