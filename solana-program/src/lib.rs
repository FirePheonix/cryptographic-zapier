use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program::invoke_signed,
    program_error::ProgramError,
    pubkey::Pubkey,
    rent::Rent,
    system_instruction,
    sysvar::Sysvar,
    clock::Clock,
};

// Declare program modules
pub mod instruction;
pub mod state;
pub mod processor;
pub mod error;

// Re-export for convenience
pub use instruction::VeriflowInstruction;
pub use state::*;
pub use error::VeriflowError;

// Program entrypoint
entrypoint!(process_instruction);

fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    msg!("Veriflow Solana Program: Processing instruction");
    processor::process_instruction(program_id, accounts, instruction_data)
}
