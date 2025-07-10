use anchor_lang::prelude::*;
use crate::instructions::initialize;
use crate::instructions::create_game;
use crate::instructions::join_game;
use crate::instructions::set_winner;
use crate::instructions::claim_reward;
use crate::instructions::transfer_fees;

pub mod instructions;
pub mod constants;
pub mod errors;
pub mod state;
pub mod utils;

use instructions::{
    initialize::*,
    create_game::*,
    join_game::*,
    set_winner::*,
    claim_reward::*,
    transfer_fees::*,
};

declare_id!("DuVatc9DfaRuFTf1DsfBXfJZp1Mn5ov5Wsdsm8qsngVu");

#[program]
pub mod solbet_jackpot_smart_contract {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, input: ConfigInput) -> Result<()> {
        initialize::handler(ctx, input)
    }

    pub fn create_game(ctx: Context<CreateGame>, roundIndex: u64) -> Result<()> {
        create_game::handler(ctx, roundIndex)
    }

    pub fn join_game(ctx: Context<JoinGame>, roundIndex: u64, amount: u64) -> Result<()> {
        join_game::handler(ctx, roundIndex, amount)
    }

    pub fn set_winner(ctx: Context<SetWinner>, roundIndex: u64) -> Result<()> {
        set_winner::handler(ctx, roundIndex)
    }

    pub fn claim_reward(ctx: Context<ClaimReward>, roundIndex: u64) -> Result<()> {
        claim_reward::handler(ctx, roundIndex)
    }

    pub fn transfer_fees(ctx: Context<TransferFees>, roundIndex: u64) -> Result<()> {
        transfer_fees::handler(ctx, roundIndex)
    }
}
