use crate::{ constants::*, errors::*, state::{ config::*, game_round::* }, utils::* };
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(round: u64)]
pub struct SetWinner<'info> {
    #[account(mut, seeds = [CONFIG_SEED], bump)]
    pub config: Account<'info, Config>,

    #[account(mut, seeds = [ROUND_SEED, &round.to_le_bytes()], bump)]
    pub round_acc: Account<'info, GameRound>,

    #[account(mut)]
    pub admin: Signer<'info>,
}

pub fn handler(ctx: Context<SetWinner>, roundIndex: u64) -> Result<()> {
    let round = &mut ctx.accounts.round_acc;
    let config = &mut ctx.accounts.config;

    require!(ctx.accounts.admin.key() == config.admin, JackpotError::InvalidAuthority);
    require!(config.round_counter == roundIndex, JackpotError::InvalidRoundCounter);
    require!(!config.is_completed, JackpotError::RoundAlreadyCompleted);
    require!(round.total_amount > 0, JackpotError::InvalidAmount);

    let rand = random_mod(round.total_amount)?;

    round.select_winner(rand)?;

    Ok(())
}
