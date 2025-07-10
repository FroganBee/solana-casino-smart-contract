use crate::constants::*;
use crate::errors::*;
use crate::state::{ config::*, game_round::* };
use anchor_lang::prelude::*;
use anchor_lang::system_program::{ transfer, Transfer };

#[derive(Accounts)]
#[instruction(round: u64)]
pub struct JoinGame<'info> {
    #[account(mut, seeds = [CONFIG_SEED], bump)]
    pub config: Account<'info, Config>,

    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut, seeds = [VAULT_SEED], bump)]
    pub vault: AccountInfo<'info>,

    #[account(mut, seeds = [ROUND_SEED, &round.to_le_bytes()], bump)]
    pub round_acc: Account<'info, GameRound>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<JoinGame>, roundIndex: u64, amount: u64) -> Result<()> {
    require!(amount > 0, JackpotError::InvalidAmount);

    let config = &mut ctx.accounts.config;
    let round = &mut ctx.accounts.round_acc;
    let vault = &ctx.accounts.vault;
    let clock = Clock::get()?;
    let deposits = &round.deposits;
    let deposits_len = deposits.len();

    require!(config.round_counter == roundIndex, JackpotError::InvalidRoundCounter);
    require!(!config.is_completed, JackpotError::RoundAlreadyCompleted);

    if round.deposits.is_empty() {
        round.started_at = clock.unix_timestamp;
        round.ends_at = clock.unix_timestamp
            .checked_add(config.round_duration)
            .ok_or(JackpotError::Overflow)?;
    }

    require!(clock.unix_timestamp <= round.ends_at, JackpotError::RoundDurationIsOver);

    if clock.unix_timestamp > round.ends_at {
        round.is_expired = true;
        msg!("Round expired at: {}", round.ends_at);
    }
    msg!("Clock: {}", clock.unix_timestamp);
    msg!("Start at: {}", round.started_at);
    msg!("Round expired at: {}", round.ends_at);

    transfer(
        CpiContext::new(ctx.accounts.system_program.to_account_info(), Transfer {
            from: ctx.accounts.user.to_account_info(),
            to: vault.to_account_info(),
        }),
        amount
    )?;

    round.add_deposit(ctx.accounts.user.key(), amount);

    Ok(())
}
