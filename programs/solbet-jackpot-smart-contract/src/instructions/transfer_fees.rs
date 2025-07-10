use anchor_lang::prelude::*;
use anchor_lang::system_program::{ transfer, Transfer };
use crate::utils::sol_transfer_with_signer;
use crate::{ constants::*, errors::* };
use crate::state::{ config::*, game_round::* };

#[derive(Accounts)]
#[instruction(round: u64)]
pub struct TransferFees<'info> {
    #[account(mut, seeds = [CONFIG_SEED], bump)]
    pub config: Account<'info, Config>,

    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut, seeds = [VAULT_SEED], bump)]
    pub vault: AccountInfo<'info>,

    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut, address = config.team_wallet)]
    pub team_wallet: AccountInfo<'info>,

    #[account(mut, seeds = [ROUND_SEED, &round.to_le_bytes()], bump)]
    pub round_acc: Account<'info, GameRound>,

    #[account(mut)]
    pub admin: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<TransferFees>, roundIndex: u64) -> Result<()> {
    let config = &mut ctx.accounts.config;
    let round = &mut ctx.accounts.round_acc;

    require!(ctx.accounts.admin.key() == config.admin, JackpotError::InvalidAuthority);
    require!(config.round_counter == roundIndex, JackpotError::InvalidRoundCounter);

    let vault_bump = ctx.bumps.vault;
    let vault_lamports = ctx.accounts.vault.to_account_info().lamports();
    let payout = vault_lamports; // You can choose to subtract reserve

    sol_transfer_with_signer(
        ctx.accounts.vault.to_account_info(),
        ctx.accounts.team_wallet.to_account_info(),
        ctx.accounts.system_program.to_account_info(),
        &[&[VAULT_SEED, &[vault_bump]]],
        payout
    )?;

    config.is_completed = true;

    Ok(())
}
