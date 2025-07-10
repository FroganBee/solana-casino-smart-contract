use anchor_lang::prelude::*;

#[account]
pub struct Config {
    pub admin: Pubkey,
    pub team_wallet: Pubkey,
    pub round_counter: u64,
    pub platform_fee: u64,
    pub round_duration: i64,
    pub min_deposit_amount: u64,
    pub is_completed: bool
}
