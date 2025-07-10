use anchor_lang::prelude::*;
use anchor_lang::solana_program::hash::hash;
use anchor_lang::solana_program::{ program::invoke, system_instruction::transfer };
use solana_program::program::invoke_signed;

pub fn random_mod(totalAmount: u64) -> Result<u64> {
    let clock = Clock::get()?;

    let mut seed = clock.unix_timestamp.to_le_bytes().to_vec();
    seed.extend_from_slice(&clock.slot.to_le_bytes());

    let hashed = hash(&seed);

    let hash_bytes: [u8; 8] = hashed.to_bytes()[..8].try_into().unwrap();
    let number = u64::from_le_bytes(hash_bytes);

    Ok(number % totalAmount)
}

pub fn sol_transfer_with_signer<'a>(
    source: AccountInfo<'a>,
    destination: AccountInfo<'a>,
    system_program: AccountInfo<'a>,
    signers: &[&[&[u8]]; 1],
    amount: u64
) -> Result<()> {
    let ix = solana_program::system_instruction::transfer(source.key, destination.key, amount);
    invoke_signed(&ix, &[source, destination, system_program], signers)?;
    Ok(())
}
