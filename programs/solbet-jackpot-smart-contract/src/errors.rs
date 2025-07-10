use anchor_lang::prelude::*;

#[error_code]
pub enum JackpotError {
    #[msg("Invalid authority")]
    InvalidAuthority,

    #[msg("Round Duration is over")]
    RoundDurationIsOver,

    #[msg("Round Already Completed")]
    RoundAlreadyCompleted,

    #[msg("Invalid Round Counter")]
    InvalidRoundCounter,

    #[msg("Invalid Amount")]
    InvalidAmount,

    #[msg("Invalid Name")]
    InvalidName,

    #[msg("Overflow")]
    Overflow,

    #[msg("Winner Already Set")]
    WinnerAlreadySet,

    #[msg("The Round is completed")]
    RoundIsCompleted,

    #[msg("Not Winner")]
    NotWinner,

    #[msg("Winner not set")]
    WinnerNotSet,
}
