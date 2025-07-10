use anchor_lang::prelude::*;
use crate::state::{ config::Config, game_round::GameRound };
use crate::constants::*;
use crate::errors::*;

#[derive(Accounts)]
#[instruction(round: u64)]
pub struct CreateGame<'info> {
    #[account(mut, seeds = [CONFIG_SEED], bump)]
    pub config: Account<'info, Config>,

    #[account(
        init,
        payer = admin,
        space = 8 + GameRound::MAX_SIZE, // adjust size as needed
        seeds = [ROUND_SEED, &round.to_le_bytes()],
        bump
    )]
    pub round_acc: Account<'info, GameRound>,

    #[account(mut)]
    pub admin: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CreateGame>, roundIndex: u64) -> Result<()> {
    let config = &mut ctx.accounts.config;
    let round = &mut ctx.accounts.round_acc;
    let clock = Clock::get()?;

    require!(ctx.accounts.admin.key() == config.admin, JackpotError::InvalidAuthority);
    if roundIndex <= config.round_counter {
        return err!(JackpotError::RoundAlreadyCompleted);
    }
    if roundIndex > config.round_counter + 1 {
        return err!(JackpotError::RoundAlreadyCompleted);
    }
    require!(roundIndex == config.round_counter + 1, JackpotError::InvalidRoundCounter);
    require!(config.is_completed == true, JackpotError::InvalidRoundCounter);

    config.round_counter = roundIndex;
    config.is_completed = false;

    round.total_amount = 0;
    round.winner = None;
    round.started_at = 0;
    round.ends_at = 0;
    round.is_expired = false;
    round.rand = 0;
    round.deposits = vec![];

    Ok(())
}
