// Zynthex Simple Payment Program
// Just handles SOL payment to treasury
// NFT minting is done client-side using Metaplex

use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program::invoke,
    program_error::ProgramError,
    pubkey::Pubkey,
    system_instruction,
};

// Replace with your new Program ID from Solana Playground
solana_program::declare_id!("5nSGjeWo3H85QAime5VZUMJkg3n7vx2qMHnAgdQ3SrGX");

entrypoint!(process_instruction);

// Price: 0.2 SOL (~$20)
const PRICE_LAMPORTS: u64 = 200_000_000;

pub fn process_instruction(
    _program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let account_iter = &mut accounts.iter();
    
    let payer = next_account_info(account_iter)?;
    let treasury = next_account_info(account_iter)?;
    let _system_program = next_account_info(account_iter)?;

    // Verify payer signed
    if !payer.is_signer {
        msg!("Error: Payer must sign");
        return Err(ProgramError::MissingRequiredSignature);
    }

    // Get price from instruction data or use default
    let price = if instruction_data.len() >= 8 {
        u64::from_le_bytes(instruction_data[0..8].try_into().unwrap())
    } else {
        PRICE_LAMPORTS
    };

    msg!("💰 Zynthex Template Access Payment");
    msg!("   Amount: {} lamports ({} SOL)", price, price as f64 / 1_000_000_000.0);
    msg!("   From: {}", payer.key);
    msg!("   To: {}", treasury.key);

    // Transfer SOL to treasury
    invoke(
        &system_instruction::transfer(payer.key, treasury.key, price),
        &[payer.clone(), treasury.clone()],
    )?;

    msg!("✅ Payment successful!");
    msg!("🎉 Template access granted!");
    
    Ok(())
}
