use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct DepositInfo {
    pub user: Pubkey,
    pub amount: u64,
}

#[account]
#[derive(Debug)]
pub struct GameRound {
    pub deposits: Vec<DepositInfo>,
    pub total_amount: u64,
    pub winner: Option<Pubkey>,
    pub winner_index: u64,
    pub winner_deposit_amount: u64,
    pub started_at: i64,
    pub ends_at: i64,
    pub is_expired: bool,
    pub rand: u64,
}

impl GameRound {
    pub const MAX_SIZE: usize = 8 + 8 + 8 + 8 + 8 + 1 + 1 + 33 + 4 + 100 * (32 + 8);

    pub fn add_deposit(&mut self, user: Pubkey, amount: u64) {
        self.deposits.push(DepositInfo { user, amount });
        self.total_amount += amount;
    }

    pub fn select_winner(&mut self, rand: u64) -> Result<()> {
        self.rand = rand;
        let mut pick = rand % self.total_amount;

        for (index, d) in self.deposits.iter().enumerate() {
            if pick < d.amount {
                self.winner = Some(d.user); // use value
                self.winner_deposit_amount = d.amount;
                self.winner_index = index as u64; // use index
                break;
            } else {
                pick -= d.amount;
            }
        }
        Ok(())
    }
}
