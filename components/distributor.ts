
import {
    Connection,
    PublicKey,
    Transaction,
    sendAndConfirmTransaction
} from '@solana/web3.js';
import {
    createTransferInstruction,
    getAssociatedTokenAddress,
    createAssociatedTokenAccountIdempotentInstruction,
    getAccount,
    TokenAccountNotFoundError,
    TokenInvalidAccountOwnerError
} from '@solana/spl-token';
import { RPC_URL, WALLET_KEYPAIR, SKR_MINT, ISG_MINT } from '../config'; // Added ISG_MINT Import
import { Tracker } from './tracker';

const connection = new Connection(RPC_URL, "confirmed");

/**
 * Distributor Component
 * Distributes SKR to holders based on Tracker points.
 */
export class Distributor {

    /**
     * Calculate Rewards per User
     */
    static calculateRewards(totalSkrToDistribute: number) {
        // 1. Get Holders & Total Points
        let holders = Tracker.getEligibleHolders();

        // 2. FILTER EXCLUSIONS
        // Remove explicitly excluded addresses (Curve, LP, Creator)
        // AND remove the Source Wallet (Self) to be safe.
        const sourceAddress = WALLET_KEYPAIR.publicKey.toBase58();
        const exclusions = new Set([...EXCLUDED_ADDRESSES, sourceAddress]);

        holders = holders.filter(h => !exclusions.has(h.address));

        // 3. Recalculate Total Points after exclusion
        // If we remove the LP (which might have huge points), the "TotalPoints" drops,
        // increasing the share for everyone else. This is CORRECT.
        const totalPoints = holders.reduce((sum, h) => sum + h.points, 0);

        if (totalPoints === 0) return [];

        return holders.map(h => ({
            address: h.address,
            // Simple Pro-Rata: (UserPoints / TotalPoints) * TotalPot
            amount: totalSkrToDistribute * (h.points / totalPoints)
        }));
    }

    /**
     * Distribute Tokens
     * Batches transfers into transactions (Max 12 per TX).
     */
    static async distribute(totalSkrToDistribute: number) {
        console.log(`[Distributor] Starting Distribution of ${totalSkrToDistribute} SKR...`);

        let rewards = this.calculateRewards(totalSkrToDistribute);

        // 4. FILTER DUST (Cost Protection)
        // If reward < MIN_REWARD_TOKENS, skip.
        const initialCount = rewards.length;
        rewards = rewards.filter(r => r.amount >= MIN_REWARD_TOKENS);
        const dustedCount = initialCount - rewards.length;

        if (rewards.length === 0) {
            console.log(`[Distributor] No eligible holders (All ${dustedCount} were dust).`);
            return;
        }

        console.log(`[Distributor] Distributing to ${rewards.length} users (Filtered ${dustedCount} dust accounts).`);

        // Placeholder Check
        if (SKR_MINT.includes("REPLACE")) {
            console.warn("[Distributor] SKR_MINT is placeholder. Skipping actual sends.");
            return;
        }

        const skrMint = new PublicKey(SKR_MINT);
        const sourceWallet = WALLET_KEYPAIR.publicKey;

        // Ensure Source has ATAs
        const sourceATA = await getAssociatedTokenAddress(skrMint, sourceWallet);

        // BATCHING
        const BATCH_SIZE = 12;

        for (let i = 0; i < rewards.length; i += BATCH_SIZE) {
            const batch = rewards.slice(i, i + BATCH_SIZE);
            const tx = new Transaction();
            let instructionCount = 0;

            console.log(`[Distributor] Preparing Batch ${Math.floor(i / BATCH_SIZE) + 1}...`);

            for (const reward of batch) {
                if (reward.amount <= 0) continue;

                /* 
                   Amount Handling:
                   Assuming SKR has 6 decimals (standard for Pump/Memes on Solana often).
                   If different, we need to fetch mint info.
                   For now, defaulting to 6 decimals: 1 SKR = 1,000,000 units.
                */
                const DECIMALS = 6;
                const rawAmount = Math.floor(reward.amount * Math.pow(10, DECIMALS));

                if (rawAmount === 0) continue;

                try {
                    const destWallet = new PublicKey(reward.address);
                    const destATA = await getAssociatedTokenAddress(skrMint, destWallet);

                    // 1. Create ATA if needed (Idempotent = only if not exists)
                    // This costs rent (~0.002 SOL) for the sender if account doesn't exist.
                    // This is 'Fair' for a flywheel - the fees pay for this.
                    tx.add(
                        createAssociatedTokenAccountIdempotentInstruction(
                            sourceWallet, // Payer
                            destATA,      // Associated Token Account
                            destWallet,   // Owner
                            skrMint       // Mint
                        )
                    );

                    // 2. Transfer
                    tx.add(
                        createTransferInstruction(
                            sourceATA,
                            destATA,
                            sourceWallet,
                            rawAmount
                        )
                    );

                    instructionCount += 2;

                } catch (e) {
                    console.error(`[Distributor] Error preparing reward for ${reward.address}:`, e);
                }
            }

            if (instructionCount > 0) {
                try {
                    const sig = await sendAndConfirmTransaction(connection, tx, [WALLET_KEYPAIR]);
                    console.log(`[Distributor] Batch Sent: https://solscan.io/tx/${sig}`);
                } catch (e) {
                    console.error(`[Distributor] Batch Failed (May need to retry manually):`, e);
                }
            } else {
                console.log(`[Distributor] Empty batch, skipping.`);
            }
        }

        // After successful distribution... Reset Points?
        // YES, per plan "Daily Epoch + Reset".
        Tracker.resetPoints();
    }
}
