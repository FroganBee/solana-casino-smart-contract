use anchor_lang::prelude::*;
use crate::state::{ config::*, game_round::* };
use crate::constants::{ CONFIG_SEED };

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct ConfigInput {
    pub team_wallet: Pubkey,
    pub platform_fee: u64,
    pub round_duration: i64,
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        init,
        payer = admin,
        space = 8 + std::mem::size_of::<Config>(),
        seeds = [CONFIG_SEED],
        bump
    )]
    pub config: Account<'info, Config>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<Initialize>, input: ConfigInput) -> Result<()> {
    let cfg = &mut ctx.accounts.config;

    cfg.admin = ctx.accounts.admin.key();
    cfg.team_wallet = input.team_wallet;
    cfg.round_counter = 0;
    cfg.platform_fee = input.platform_fee;
    cfg.round_duration = input.round_duration;
    cfg.min_deposit_amount = 1_000_000;
    cfg.is_completed = true;

    Ok(())
}
