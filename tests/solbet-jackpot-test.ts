import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  PublicKey,
  SystemProgram,
  Keypair,
  Connection,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
  Transaction,
  ComputeBudgetProgram,
  SIGNATURE_LENGTH_IN_BYTES,
} from "@solana/web3.js";
import { assert } from "chai";
import { SolbetJackpotSmartContract } from "../target/types/solbet_jackpot_smart_contract";
import {
  CONFIG_SEED,
  ROUND_SEED,
  VAULT_SEED,
  TEAM_WALLET,
  PLATFORM_FEE,
  ROUND_DURATION,
} from "./constants";
import { BN } from "bn.js";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";

let cluster = "devnet";

const connection =
  cluster == "localnet"
    ? new Connection("http://localhost:8899", "confirmed")
    : new Connection("https://api.devnet.solana.com", "confirmed");

const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);
const program = anchor.workspace
  .SolbetJackpotSmartContract as Program<SolbetJackpotSmartContract>;

const admin = anchor.web3.Keypair.fromSecretKey(
  bs58.decode(
    "hQBpBxJr6iooEEweiCHEADPhHSQNRuKpQWxGenUXJD59Gv5J17BqPHk7rYncYRW7gftxKujBC9CEkpKkpBFot4k"
  )
);

console.log("ADMIN wallet:", admin.publicKey.toBase58());

describe("solbet-jackpot-smart-contract: initialize", () => {
  // Configure the client to use the local cluster.

  let configPda: anchor.web3.PublicKey;
  let configBump: number;

  // seconds

  it("Initializes the config account", async () => {
    // Derive PDA for config
    [configPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [CONFIG_SEED],
      program.programId
    );

    try {
      const ix = await program.methods
        .initialize({
          teamWallet: new PublicKey(TEAM_WALLET),
          platformFee: new anchor.BN(PLATFORM_FEE),
          roundDuration: new anchor.BN(ROUND_DURATION),
        })
        .accounts({
          admin: admin.publicKey,
        })
        .instruction();

      const tx = new Transaction().add(ix);
      tx.feePayer = admin.publicKey;
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      tx.sign(admin);

      const sig = await sendAndConfirmTransaction(connection, tx, [admin]);

      console.log("✅ Initialize transaction signature:", sig);
    } catch (err) {
      // If already initialized, just fetch and verify
      console.log("Config already initialized, verifying: ", err.message);
    }

    console.log("🚀 ~ it ~ teamWallet:", TEAM_WALLET);
    console.log("🚀 ~ it ~ platformFee:", PLATFORM_FEE);
    console.log("🚀 ~ it ~ roundDuration:", ROUND_DURATION);
    // Fetch the config account to validate
    const config = await program.account.config.fetch(configPda);
    console.log("🚀 ~ it ~ config:", config);
    console.log(
      "🚀 ~ it ~ config.roundDuration.toNumber():",
      config.roundDuration.toNumber()
    );

    console.log("Current Config:", {
      admin: config.admin.toString(),
      expectedAdmin: provider.wallet.publicKey.toString(),
      teamWallet: new PublicKey(TEAM_WALLET),
      roundCounter: config.roundCounter.toNumber(),
      platformFee: config.platformFee.toNumber(),
      roundDuration: config.roundDuration.toNumber(),
      minDepositAmount: config.minDepositAmount.toNumber(),
    });

    // assert.ok(config.admin.equals(provider.wallet.publicKey));
    // assert.ok(config.teamWallet.equals(new PublicKey(TEAM_WALLET)));
    // assert.strictEqual(config.roundCounter.toNumber(), 0);
    // assert.strictEqual(config.platformFee.toNumber(), PLATFORM_FEE);
    // assert.strictEqual(config.roundDuration.toNumber(), ROUND_DURATION);
    // assert.strictEqual(config.minDepositAmount.toNumber(), 1_000_000);

    assert.ok(config !== null, "Config account should exist");
  });
});

describe("solbet-jackpot-smart-contract: create_game", () => {
  let configPda;
  let configBump: number;
  let roundPda;

  it("Creates a new game round", async () => {
    // Fetch config to get round counter

    [configPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [CONFIG_SEED],
      program.programId
    );

    // Derive round PDA
    [roundPda] = PublicKey.findProgramAddressSync(
      [ROUND_SEED, new BN(1).toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    console.log("🚀 ~ it ~ roundPda:", roundPda.toBase58());
    const config = await program.account.config.fetch(configPda);
    // const roundIndex = config.roundCounter.toNumber();

    console.log("🚀 ~ it ~ config:", config);
    try {
      const tx = new Transaction();

      const ix = await program.methods
        .createGame(new BN(1))
        .accountsStrict({
          admin: admin.publicKey,
          config: configPda,
          roundAcc: roundPda,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      tx.add(ix);
      tx.feePayer = admin.publicKey;
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      tx.sign(admin);

      console.log(await connection.simulateTransaction(tx));

      const sig = await sendAndConfirmTransaction(connection, tx, [admin]);

      console.log("✅ Create Game transaction:", sig);
    } catch (err) {
      console.log("create game error: ", err.message);
    }

    const round = await program.account.gameRound.fetch(roundPda);

    console.log("Round State:", {
      totalAmount: round.totalAmount.toNumber(),
      winner: round.winner ? round.winner.toString() : null,
      rand: round.rand.toNumber(),
      deposits: round.deposits.length,
      isCompleted: config.isCompleted,
      startedAt: new Date(round.startedAt.toNumber() * 1000).toISOString(),
      endsAt: new Date(round.endsAt.toNumber() * 1000).toISOString(),
      durationSeconds: round.endsAt.sub(round.startedAt).toNumber(),
    });

    // assert.ok(round.totalAmount.toNumber() === 0);
    // assert.ok(round.winner === null);
    // assert.ok(round.rand.toNumber() === 0);
    // assert.ok(round.deposits.length === 0);
    // assert.ok(!round.isCompleted);
    // assert.ok(round.endsAt > round.startedAt);
  });
});

describe("solbet-jackpot-smart-contract: user1_join_game", () => {
  let configPda;
  let roundPda;
  let vaultPda;
  let roundIndex: number;

  const user = anchor.web3.Keypair.fromSecretKey(
    new Uint8Array([
      77, 98, 110, 254, 172, 122, 195, 178, 69, 20, 253, 21, 27, 121, 111, 44,
      33, 180, 116, 153, 99, 208, 8, 203, 57, 147, 18, 217, 22, 112, 18, 9, 12,
      236, 235, 92, 123, 243, 106, 15, 32, 172, 247, 166, 40, 234, 116, 158,
      152, 195, 98, 73, 87, 115, 94, 107, 242, 36, 19, 12, 66, 248, 230, 251,
    ])
  );
  const amountLamports = anchor.web3.LAMPORTS_PER_SOL / 10; // 0.1 SOL

  before(async () => {
    console.log("🚀 ~ describe ~ user Pubkey:", user.publicKey);
    // Derive config PDA
    [configPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [CONFIG_SEED],
      program.programId
    );

    const config = await program.account.config.fetch(configPda);
    roundIndex = config.roundCounter.toNumber();
    console.log("🚀 ~ before ~ roundIndex:", roundIndex);

    // Derive round PDA
    [roundPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [ROUND_SEED, new anchor.BN(roundIndex).toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    // Derive vault PDA
    [vaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [VAULT_SEED],
      program.programId
    );
  });

  it("Joins the jackpot round", async () => {
    const ix = await program.methods
      .joinGame(new anchor.BN(roundIndex), new anchor.BN(amountLamports))
      .accountsStrict({
        user: user.publicKey,
        config: configPda,
        roundAcc: roundPda,
        vault: vaultPda,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    const tx = new Transaction().add(ix);

    tx.feePayer = user.publicKey;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    tx.sign(user);

    console.log(await connection.simulateTransaction(tx));

    const sig = await sendAndConfirmTransaction(connection, tx, [user]);

    console.log("✅ Join Game transaction:", sig);

    const round = await program.account.gameRound.fetch(roundPda);
    console.log("🚀 ~ it ~ round:", round);

    // assert.ok(round.totalAmount.toNumber() > 0);
    // assert.ok(round.deposits.length === 1);
    // assert.strictEqual(
    //   round.deposits[0].user.toBase58(),
    //   user.publicKey.toBase58()
    // );
    // assert.ok(round.deposits[0].amount.toNumber() > 0);

    console.log("Rounds started at: ", round.startedAt);
    console.log("Round expired at: ", round.endsAt);
    console.log("✅ Round Total Amount:", round.totalAmount.toNumber());
    console.log("✅ Deposits Length:", round.deposits.length);
    console.log("✅ Depositor Address:", round.deposits[0].user.toBase58());
    console.log("✅ Expected Address:", user.publicKey.toBase58());
    console.log("✅ Deposit Amount:", round.deposits[0].amount.toNumber());
  });
});

describe("solbet-jackpot-smart-contract: user2_join_game", () => {
  let configPda;
  let roundPda;
  let vaultPda;
  let roundIndex: number;

  const user2 = anchor.web3.Keypair.fromSecretKey(
    new Uint8Array([
      182, 220, 84, 131, 54, 38, 202, 150, 131, 0, 149, 17, 76, 92, 177, 131,
      229, 47, 15, 140, 240, 99, 206, 62, 230, 219, 135, 233, 238, 171, 175,
      174, 137, 54, 41, 81, 157, 122, 166, 18, 30, 121, 153, 243, 220, 57, 244,
      167, 130, 240, 110, 152, 248, 224, 250, 75, 159, 219, 189, 169, 76, 172,
      96, 173,
    ])
  );
  const amountLamports = anchor.web3.LAMPORTS_PER_SOL / 5; // 0.2 SOL

  before(async () => {
    console.log("🚀 ~ describe ~ user Pubkey:", user2.publicKey);
    // Derive config PDA
    [configPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [CONFIG_SEED],
      program.programId
    );

    const config = await program.account.config.fetch(configPda);
    roundIndex = config.roundCounter.toNumber();

    // Derive round PDA
    [roundPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [ROUND_SEED, new anchor.BN(roundIndex).toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    // Derive vault PDA
    [vaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [VAULT_SEED],
      program.programId
    );
  });

  it("Joins the jackpot round", async () => {
    const ix = await program.methods
      .joinGame(new anchor.BN(roundIndex), new anchor.BN(amountLamports))
      .accountsStrict({
        user: user2.publicKey,
        config: configPda,
        roundAcc: roundPda,
        systemProgram: SystemProgram.programId,
        vault: vaultPda,
      })
      .instruction();

    const tx = new Transaction().add(ix);

    tx.feePayer = user2.publicKey;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    tx.sign(user2);

    const sig = await sendAndConfirmTransaction(connection, tx, [user2]);

    console.log("✅ Join Game transaction:", sig);

    const round = await program.account.gameRound.fetch(roundPda);
    console.log("🚀 ~ it ~ round:", round);

    // assert.ok(round.totalAmount.toNumber() > 0);
    // assert.ok(round.deposits.length === 1);
    // assert.strictEqual(
    //   round.deposits[0].user.toBase58(),
    //   user.publicKey.toBase58()
    // );
    // assert.ok(round.deposits[0].amount.toNumber() > 0);

    console.log("Rounds started at: ", round.startedAt);
    console.log("Round expired at: ", round.endsAt);
    console.log("✅ Round Total Amount:", round.totalAmount.toNumber());
    console.log("✅ Deposits Length:", round.deposits.length);
    console.log("✅ Depositor Address:", round.deposits[1].user.toBase58());
    console.log("✅ Expected Address:", user2.publicKey.toBase58());
    console.log("✅ Deposit Amount:", round.deposits[1].amount.toNumber());
  });
});

describe("solbet-jackpot-smart-contract: set_winner", () => {
  let configPda: anchor.web3.PublicKey;
  let roundPda: anchor.web3.PublicKey;
  let roundIndex: number;

  before(async () => {
    // Derive config PDA
    [configPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [CONFIG_SEED],
      program.programId
    );

    const config = await program.account.config.fetch(configPda);
    roundIndex = config.roundCounter.toNumber();

    // Derive round PDA
    [roundPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [ROUND_SEED, new anchor.BN(roundIndex).toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    // Wait for round to expire (if needed)
    const round = await program.account.gameRound.fetch(roundPda);
    const currentTime = Math.floor(Date.now() / 1000);
    if (currentTime < round.endsAt.toNumber()) {
      console.log(
        `⏳ Waiting for round to expire... (${
          round.endsAt.toNumber() - currentTime
        }s)`
      );
      await new Promise((r) =>
        setTimeout(r, (round.endsAt.toNumber() - currentTime) * 10)
      );
    }
  });

  it("Sets a winner for the round", async () => {
    const ix = await program.methods
      .setWinner(new anchor.BN(roundIndex))
      .accountsStrict({
        admin: admin.publicKey,
        config: configPda,
        roundAcc: roundPda,
      })
      .instruction();

    const tx = new Transaction().add(ix);
    tx.feePayer = admin.publicKey;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    tx.sign(admin);

    const sig = await sendAndConfirmTransaction(connection, tx, [admin]);

    console.log("🏆 Set Winner TX:", sig);

    const round = await program.account.gameRound.fetch(roundPda);
    const config = await program.account.config.fetch(configPda);

    // assert.ok(round.isCompleted);
    // assert.ok(round.winner !== null, "Winner should be selected");
    // assert.ok(round.rand.toNumber() > 0, "Random value should be generated");

    console.log("isCompleted:", config.isCompleted);
    console.log("isExpiredTime:", round.isExpired);
    console.log("🥳 winner:", round.winner ? round.winner.toString() : "null");
    console.log("Winner Index: ", round.winnerIndex.toNumber());
    console.log(
      "Winner Deposit amount: ",
      round.winnerDepositAmount.toNumber()
    );
    console.log("🎲 random value:", round.rand.toNumber());
  });
});

describe("solbet-jackpot-smart-contract: claim_reward", () => {
  let configPda;
  let vaultPda;
  let roundPda;
  let roundIndex: number;
  let winnerPubkey: PublicKey;

  before(async () => {
    // Derive PDAs
    [configPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [CONFIG_SEED],
      program.programId
    );

    [vaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [VAULT_SEED],
      program.programId
    );

    const config = await program.account.config.fetch(configPda);
    roundIndex = config.roundCounter.toNumber();

    [roundPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [ROUND_SEED, new anchor.BN(roundIndex).toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    const round = await program.account.gameRound.fetch(roundPda);
    // if (!round.isCompleted) {
    //   throw new Error(
    //     "Round is not completed yet. Please run set_winner first."
    //   );
    // }

    if (!round.winner) {
      throw new Error("Winner not set in round");
    }

    winnerPubkey = round.winner;
    console.log("🏆 Winner from previous test:", winnerPubkey.toBase58());
    // const txFundWinner = await provider.connection.requestAirdrop(
    //   winner.publicKey,
    //   1_000_000_000
    // );
    // await provider.connection.confirmTransaction(txFundWinner);
  });

  it("Claims the reward successfully", async () => {
    const round = await program.account.gameRound.fetch(roundPda);
    const config = await program.account.config.fetch(configPda);
    // const winnerPubkey = round.winner!;
    const platformFee = new anchor.BN(round.totalAmount)
      .mul(new anchor.BN(config.platformFee))
      .div(new anchor.BN(10_000));

    const expectedReward = new anchor.BN(round.totalAmount).sub(platformFee);

    // Fund the vault manually (mock)
    const vaultBalanceBefore = await provider.connection.getBalance(vaultPda);
    // if (vaultBalanceBefore < expectedReward) {
    //   const tx = await provider.connection.requestAirdrop(
    //     vaultPda,
    //     expectedReward + 1_000_000
    //   );
    //   await provider.connection.confirmTransaction(tx);
    // }

    const winnerBalanceBefore = await provider.connection.getBalance(
      winnerPubkey
    );

    const feePercent = config.platformFee.div(new anchor.BN(100));

    console.log("\n📊 Reward Breakdown");
    console.log("Total Pot:", round.totalAmount.toString(), "lamports");
    console.log("Fee Percentage:", feePercent + "%");
    console.log("Fee Amount:", platformFee.toString(), "lamports");
    console.log("Winner Gets:", expectedReward.toString(), "lamports");

    // const admin = provider.wallet;

    // try {
    const ix = await program.methods
      .claimReward(new anchor.BN(roundIndex))
      .accountsStrict({
        admin: admin.publicKey,
        winner: winnerPubkey,
        config: configPda,
        roundAcc: roundPda,
        systemProgram: SystemProgram.programId,
        vault: vaultPda,
      })
      .instruction();

    const tx = new Transaction().add(ix);
    tx.feePayer = admin.publicKey;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    tx.sign(admin);

    const sig = await sendAndConfirmTransaction(connection, tx, [admin]);

    console.log("🎉 Claim Reward TX:", sig);
    // assert.fail("Should have failed");
    // } catch (err) {
    //   console.log("NotWinner: ", err.message); // Matches your error
    // }

    const winnerBalanceAfter = await provider.connection.getBalance(
      winnerPubkey
    );
    const roundAfter = await program.account.gameRound.fetch(roundPda);

    console.log("💰 Balances after claim:");
    console.log("- Winner:", winnerBalanceAfter / LAMPORTS_PER_SOL, "SOL");
    console.log("Round state after:");
    console.log("- Total amount:", roundAfter.totalAmount.toNumber());
    console.log(
      "- Winner:",
      roundAfter.winner ? roundAfter.winner.toBase58() : "null"
    );

    // assert.ok(
    //   winnerBalanceAfter > winnerBalanceBefore,
    //   "Winner did not receive reward"
    // );
    // assert.equal(
    //   roundAfter.totalAmount.toNumber(),
    //   0,
    //   "Round total amount not reset"
    // );
    // assert.equal(roundAfter.winner, null, "Round winner not cleared");
  });
});

describe("solbet-jackpot-smart-contract: transfer_fees", () => {
  let configPda: anchor.web3.PublicKey;
  let vaultPda: anchor.web3.PublicKey;
  let roundPda: anchor.web3.PublicKey;
  let teamWallet;
  let roundIndex: number;

  before(async () => {
    // Derive PDAs
    [configPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [CONFIG_SEED],
      program.programId
    );

    [vaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [VAULT_SEED],
      program.programId
    );

    const config = await program.account.config.fetch(configPda);
    roundIndex = config.roundCounter.toNumber();

    [roundPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [ROUND_SEED, new anchor.BN(roundIndex).toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    // Fetch config to get current team_wallet/admin
    teamWallet = config.teamWallet;

    // Airdrop to the vault if it doesn't have enough lamports
    const vaultBalance = await provider.connection.getBalance(vaultPda);
    // if (vaultBalance < 1_000_000) {
    //   const airdropSig = await provider.connection.requestAirdrop(
    //     vaultPda,
    //     2_000_000
    //   );
    //   await provider.connection.confirmTransaction(airdropSig);
    // }

    // // Airdrop to team wallet so it exists on-chain
    // const sig = await provider.connection.requestAirdrop(
    //   teamWallet.publicKey,
    //   1_000_000
    // );
    // await provider.connection.confirmTransaction(sig);
  });

  it("transfers all SOL from vault to team wallet", async () => {
    const preTeamBalance = await provider.connection.getBalance(teamWallet);
    console.log("🚀 ~ it ~ teamWallet:", teamWallet);
    console.log("🚀 ~ it ~ preTeamBalance:", preTeamBalance);

    const preVaultBalance = await provider.connection.getBalance(vaultPda);
    console.log("🚀 ~ it ~ vaultPda:", vaultPda);
    console.log("🚀 ~ it ~ preVaultBalance:", preVaultBalance);

    const config = await program.account.config.fetch(configPda);
    roundIndex = config.roundCounter.toNumber();

    // assert.ok(preVaultBalance > 0, "Vault has no funds");

    const ix = await program.methods
      .transferFees(new anchor.BN(roundIndex))
      .accountsStrict({
        config: configPda,
        teamWallet: teamWallet,
        admin: admin.publicKey,
        vault: vaultPda,
        roundAcc: roundPda,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    const tx = new Transaction().add(ix);
    tx.feePayer = admin.publicKey;
    tx.recentBlockhash = (
      await provider.connection.getLatestBlockhash()
    ).blockhash;
    tx.sign(admin);

    const sig = await sendAndConfirmTransaction(connection, tx, [admin]);

    console.log("🚀 ~ it ~ admin:", admin);

    console.log("✅ transfer_fees tx:", sig);

    const postTeamBalance = await provider.connection.getBalance(teamWallet);
    console.log("🚀 ~ it ~ postTeamBalance:", postTeamBalance);
    const postVaultBalance = await provider.connection.getBalance(vaultPda);
    console.log("🚀 ~ it ~ postVaultBalance:", postVaultBalance);

    // assert.equal(postVaultBalance, 0, "Vault should be empty");
    // assert.ok(
    //   postTeamBalance > preTeamBalance,
    //   "Team wallet did not receive funds"
    // );
  });
});

